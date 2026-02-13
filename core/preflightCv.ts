import * as fs from "fs";
import * as path from "path";
import { fetchHtml } from "./fetchHtml";
import { parseGenericHtml, ParsedListing } from "./parseGenericHtml";
import { loadSourcesConfig, SourceConfig } from "./configLoader";
import { runDetailEnrichment } from "./detail/enrich";
import { DetailEnrichmentInput } from "./detail/types";
import { RuleViolation } from "./goldenRules";
import {
  LifecycleState,
  DropReason,
  ObserveReason,
  PreflightMetrics,
  PreflightResult,
  PreflightReport,
  PREFLIGHT_THRESHOLDS,
  ImageQualityMetrics,
  SourceImageQualityBreakdown,
} from "./preflightTypes";
import { computeImageQualityScore, ImageQualityScore } from "./imageQualityScore";

const MARKET_ID = "cv";

function calculateImageQualityMetrics(listings: ParsedListing[]): ImageQualityMetrics | undefined {
  if (listings.length === 0) return undefined;

  const scores: ImageQualityScore[] = listings.map((l) =>
    computeImageQualityScore(l.imageUrls)
  );

  const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  const tierDistribution = {
    A: scores.filter((s) => s.tier === "A").length,
    B: scores.filter((s) => s.tier === "B").length,
    C: scores.filter((s) => s.tier === "C").length,
    D: scores.filter((s) => s.tier === "D").length,
  };

  const percentAB = ((tierDistribution.A + tierDistribution.B) / scores.length) * 100;

  // Aggregate reasons
  const reasonCounts = new Map<string, number>();
  for (const score of scores) {
    for (const reason of score.reasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2);

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    tierDistribution,
    percentAB: Math.round(percentAB * 10) / 10,
    topReasons,
  };
}

function calculateMetrics(listings: ParsedListing[]): PreflightMetrics {
  const count = listings.length;
  if (count === 0) {
    return {
      listingsCount: 0,
      hasPriceRatio: 0,
      hasImageRatio: 0,
      hasDescriptionRatio: 0,
    };
  }

  const withPrice = listings.filter(
    (l) => l.price !== undefined && l.price > 0
  ).length;
  const withImage = listings.filter(
    (l) => l.imageUrls.length >= PREFLIGHT_THRESHOLDS.minImagesPerListing
  ).length;
  const withDescription = listings.filter(
    (l) =>
      l.description &&
      l.description.length >= PREFLIGHT_THRESHOLDS.minDescriptionLength
  ).length;

  const imageQuality = calculateImageQualityMetrics(listings);

  return {
    listingsCount: count,
    hasPriceRatio: withPrice / count,
    hasImageRatio: withImage / count,
    hasDescriptionRatio: withDescription / count,
    imageQuality,
  };
}

function classifySource(metrics: PreflightMetrics): {
  state: LifecycleState;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (metrics.listingsCount === 0) {
    return {
      state: LifecycleState.DROP,
      reasons: [DropReason.NO_LISTINGS],
    };
  }

  if (metrics.listingsCount < PREFLIGHT_THRESHOLDS.minListingsForNormal) {
    reasons.push(ObserveReason.LOW_COUNT);
  }

  if (metrics.hasPriceRatio < PREFLIGHT_THRESHOLDS.minPriceRatio) {
    reasons.push(ObserveReason.LOW_PRICE_RATIO);
  }

  if (metrics.hasImageRatio < PREFLIGHT_THRESHOLDS.minImageRatio) {
    reasons.push(ObserveReason.LOW_IMAGE_RATIO);
  }

  if (reasons.length > 0) {
    return { state: LifecycleState.OBSERVE, reasons };
  }

  return { state: LifecycleState.IN, reasons: [] };
}

function meetsThresholds(metrics: PreflightMetrics): boolean {
  return (
    metrics.listingsCount >= PREFLIGHT_THRESHOLDS.minListingsForNormal &&
    metrics.hasPriceRatio >= PREFLIGHT_THRESHOLDS.minPriceRatio &&
    metrics.hasImageRatio >= PREFLIGHT_THRESHOLDS.minImageRatio
  );
}

async function runTrialEnrichment(
  listings: ParsedListing[],
  sourceId: string
): Promise<ParsedListing[]> {
  const sample = listings.slice(0, PREFLIGHT_THRESHOLDS.trialEnrichmentLimit);

  const inputs: DetailEnrichmentInput[] = sample
    .filter((l) => l.detailUrl)
    .map((l) => ({
      listingId: l.id,
      sourceId,
      detailUrl: l.detailUrl!,
      currentTitle: l.title,
      currentPrice: l.price,
      currentDescription: l.description,
      currentImageUrls: l.imageUrls,
      currentLocation: l.location,
      violations: [
        RuleViolation.INSUFFICIENT_IMAGES,
        RuleViolation.DESCRIPTION_TOO_SHORT,
      ],
    }));

  if (inputs.length === 0) {
    return listings;
  }

  const { results } = await runDetailEnrichment(inputs, inputs.length);

  const enrichedMap = new Map(results.map((r) => [r.listingId, r]));
  return listings.map((l) => {
    const enriched = enrichedMap.get(l.id);
    if (enriched && enriched.success) {
      return {
        ...l,
        title: enriched.title || l.title,
        price: enriched.price || l.price,
        description: enriched.description || l.description,
        imageUrls:
          enriched.imageUrls.length > l.imageUrls.length
            ? enriched.imageUrls
            : l.imageUrls,
        location: enriched.location || l.location,
      };
    }
    return l;
  });
}

async function preflightSource(source: SourceConfig): Promise<PreflightResult> {
  const timestamp = new Date().toISOString();

  // Respect lifecycle override from config
  if (source.lifecycleOverride) {
    const overrideState = LifecycleState[source.lifecycleOverride as keyof typeof LifecycleState];
    console.log(`[${source.id}] Lifecycle override: ${overrideState}`);
    return {
      sourceId: source.id,
      sourceName: source.name,
      lifecycleState: overrideState,
      metrics: {
        listingsCount: 0,
        hasPriceRatio: 0,
        hasImageRatio: 0,
        hasDescriptionRatio: 0,
      },
      reasons: [`OVERRIDE: ${source.lifecycleOverride}`],
      timestamp,
      trialEnrichmentDone: false,
      promotedToIn: false,
    };
  }

  const fetchResult = await fetchHtml(source.url, source.userAgent ? { headers: { "User-Agent": source.userAgent } } : undefined);

  if (!fetchResult.success || !fetchResult.html) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      lifecycleState: LifecycleState.OBSERVE,
      metrics: {
        listingsCount: 0,
        hasPriceRatio: 0,
        hasImageRatio: 0,
        hasDescriptionRatio: 0,
      },
      reasons: [`FETCH_FAILED: ${fetchResult.error || "Unknown error"}`],
      timestamp,
      trialEnrichmentDone: false,
      promotedToIn: false,
    };
  }

  let listings = parseGenericHtml(
    fetchResult.html,
    source.id,
    source.name,
    source.url
  );

  let metrics = calculateMetrics(listings);
  let { state, reasons } = classifySource(metrics);

  let trialEnrichmentDone = false;
  let promotedToIn = false;

  if (state === LifecycleState.OBSERVE && listings.length > 0) {
    listings = await runTrialEnrichment(listings, source.id);
    trialEnrichmentDone = true;

    metrics = calculateMetrics(listings);

    if (meetsThresholds(metrics)) {
      state = LifecycleState.IN;
      reasons = [];
      promotedToIn = true;
    } else {
      const reclassified = classifySource(metrics);
      state = reclassified.state;
      reasons = reclassified.reasons;
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    lifecycleState: state,
    metrics,
    reasons,
    timestamp,
    trialEnrichmentDone,
    promotedToIn,
  };
}

function generateTimestampFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `cv_preflight_${yyyy}${mm}${dd}_${hh}${min}${ss}.json`;
}

function findAvailableFilename(reportsDir: string, base: string): string {
  const basePath = path.join(reportsDir, base);
  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  const ext = path.extname(base);
  const name = path.basename(base, ext);

  let suffix = 1;
  while (suffix < 100) {
    const suffixStr = String(suffix).padStart(2, "0");
    const candidate = path.join(reportsDir, `${name}_${suffixStr}${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    suffix++;
  }

  throw new Error(`Cannot find available filename for ${base}`);
}

function persistReport(report: PreflightReport): string {
  const reportsDir = path.resolve(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const baseFilename = generateTimestampFilename();
  const filepath = findAvailableFilename(reportsDir, baseFilename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), "utf-8");
  return filepath;
}

export async function runPreflightCv(): Promise<PreflightReport> {
  const configResult = loadSourcesConfig(MARKET_ID);

  if (!configResult.success || !configResult.data) {
    throw new Error(`Failed to load sources config: ${configResult.error}`);
  }

  const sources = configResult.data.sources;
  const results: PreflightResult[] = [];

  for (const source of sources) {
    const result = await preflightSource(source);
    results.push(result);
  }

  const summary = {
    total: results.length,
    inCount: results.filter((r) => r.lifecycleState === LifecycleState.IN)
      .length,
    observeCount: results.filter(
      (r) => r.lifecycleState === LifecycleState.OBSERVE
    ).length,
    dropCount: results.filter((r) => r.lifecycleState === LifecycleState.DROP)
      .length,
  };

  // Aggregate global image quality metrics
  const allImageQualityMetrics = results
    .map((r) => r.metrics.imageQuality)
    .filter((iq): iq is ImageQualityMetrics => iq !== undefined);

  let globalImageQuality: ImageQualityMetrics | undefined;
  if (allImageQualityMetrics.length > 0) {
    const totalListings = results.reduce((sum, r) => sum + r.metrics.listingsCount, 0);
    
    // Weighted average score
    const weightedScoreSum = results.reduce((sum, r) => {
      if (r.metrics.imageQuality) {
        return sum + r.metrics.imageQuality.avgScore * r.metrics.listingsCount;
      }
      return sum;
    }, 0);
    const globalAvgScore = totalListings > 0 ? weightedScoreSum / totalListings : 0;

    // Sum tier distributions
    const globalTierDist = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };
    for (const result of results) {
      if (result.metrics.imageQuality) {
        globalTierDist.A += result.metrics.imageQuality.tierDistribution.A;
        globalTierDist.B += result.metrics.imageQuality.tierDistribution.B;
        globalTierDist.C += result.metrics.imageQuality.tierDistribution.C;
        globalTierDist.D += result.metrics.imageQuality.tierDistribution.D;
      }
    }

    const globalPercentAB = totalListings > 0
      ? ((globalTierDist.A + globalTierDist.B) / totalListings) * 100
      : 0;

    // Aggregate all reasons across sources
    const globalReasonCounts = new Map<string, number>();
    for (const result of results) {
      if (result.metrics.imageQuality) {
        for (const { reason, count } of result.metrics.imageQuality.topReasons) {
          globalReasonCounts.set(reason, (globalReasonCounts.get(reason) || 0) + count);
        }
      }
    }

    const globalTopReasons = Array.from(globalReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    globalImageQuality = {
      avgScore: Math.round(globalAvgScore * 10) / 10,
      tierDistribution: globalTierDist,
      percentAB: Math.round(globalPercentAB * 10) / 10,
      topReasons: globalTopReasons,
    };
  }

  // Build source-level IQS breakdown
  const sourceImageQualityBreakdown: SourceImageQualityBreakdown[] = results
    .filter((r) => r.metrics.imageQuality !== undefined)
    .map((r) => {
      const iq = r.metrics.imageQuality!;
      const totalListings = r.metrics.listingsCount;
      const percentD = totalListings > 0 
        ? Math.round((iq.tierDistribution.D / totalListings) * 100 * 10) / 10
        : 0;

      return {
        sourceId: r.sourceId,
        sourceName: r.sourceName,
        listingCount: totalListings,
        avgScore: iq.avgScore,
        tierDistribution: iq.tierDistribution,
        percentD,
        topReasons: iq.topReasons,
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore); // Sort by avgScore ascending (worst first)

  const report: PreflightReport = {
    marketId: MARKET_ID,
    generatedAt: new Date().toISOString(),
    results,
    summary,
    globalImageQuality,
    sourceImageQualityBreakdown: sourceImageQualityBreakdown.length > 0 ? sourceImageQualityBreakdown : undefined,
  };

  persistReport(report);

  return report;
}

if (require.main === module) {
  runPreflightCv()
    .then((report) => {
      console.log(`Preflight complete: ${report.summary.total} sources`);
      console.log(`  IN: ${report.summary.inCount}`);
      console.log(`  OBSERVE: ${report.summary.observeCount}`);
      console.log(`  DROP: ${report.summary.dropCount}`);
    })
    .catch((err) => {
      console.error("Preflight failed:", err);
      process.exit(1);
    });
}
