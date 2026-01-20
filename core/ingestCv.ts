import * as fs from "fs";
import * as path from "path";
import { SourceStatus, SourceState, createInitialState } from "./status";
import { loadSourcesConfig, loadRulesConfig, SourceConfig } from "./configLoader";
import { RuleViolation } from "./goldenRules";
import { ListingVisibility } from "./classifyListing";
import {
  batchEvaluateMarket,
  MarketListingInput,
  SourceStatusMap,
} from "./batchEvaluateMarket";
import { fetchHtml } from "./fetchHtml";
import { parseSimplyCapeVerde, ParsedListing } from "./parseSimplyCapeVerde";
import { parseGenericHtml } from "./parseGenericHtml";
import { parseTerraCaboVerde } from "./parseTerraCaboVerde";
import { runDetailEnrichment } from "./detail/enrich";
import { getStrategyFactory } from "./detail/strategyFactory";
import { terraCaboVerdePlugin } from "./detail/plugins/terraCaboVerde";
import { DetailEnrichmentInput } from "./detail/types";

// ============================================
// LISTING TYPES
// ============================================

interface IngestListing {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls?: string[];
  location?: string;
  detailUrl?: string;
  createdAt: Date;
}

// ============================================
// STUB DATA PROVIDER
// Returns test data to validate the pipeline
// ============================================

function generateStubListings(sources: SourceConfig[]): IngestListing[] {
  const listings: IngestListing[] = [];
  const now = new Date();

  // Only generate stubs for stub-type sources
  const stubSources = sources.filter((s) => s.type === "stub");

  const src1 = stubSources[0];
  const src2 = stubSources[1];

  // Source 1: Good listings
  if (src1) {
    listings.push({
      id: "lst_001",
      sourceId: src1.id,
      sourceName: src1.name,
      title: "Modern Apartment in Praia City Center",
      price: 85000,
      description: "Beautiful 3 bedroom apartment with ocean view. Recently renovated with modern finishes. Close to shops and restaurants.",
      imageUrls: [
        "https://images.cv/apt1-1.jpg",
        "https://images.cv/apt1-2.jpg",
        "https://images.cv/apt1-3.jpg",
        "https://images.cv/apt1-4.jpg",
      ],
      location: "Praia",
      createdAt: new Date(now.getTime() - 86400000),
    });

    listings.push({
      id: "lst_002",
      sourceId: src1.id,
      sourceName: src1.name,
      title: "Beachfront Villa with Pool",
      price: 250000,
      description: "Stunning 5 bedroom villa directly on the beach. Private pool, garden, and parking. Perfect for families or rental investment.",
      imageUrls: [
        "https://images.cv/villa1-1.jpg",
        "https://images.cv/villa1-2.jpg",
        "https://images.cv/villa1-3.jpg",
      ],
      location: "Santa Maria",
      createdAt: new Date(now.getTime() - 172800000),
    });
  }

  // Source 2: Mixed quality
  if (src2) {
    listings.push({
      id: "lst_003",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Cozy Studio in Mindelo",
      price: 35000,
      description: "Compact studio apartment in the heart of Mindelo. Walking distance to the marina and cultural center. Ideal for singles.",
      imageUrls: [
        "https://images.cv/studio1-1.jpg",
        "https://images.cv/studio1-2.jpg",
        "https://images.cv/studio1-3.jpg",
      ],
      location: "Mindelo",
      createdAt: now,
    });

    // Missing images (rule violation)
    listings.push({
      id: "lst_004",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "House with Garden",
      price: 120000,
      description: "Spacious house with large garden area. 4 bedrooms, 2 bathrooms. Needs some renovation but great potential.",
      imageUrls: ["https://images.cv/house1-1.jpg"],
      location: "Mindelo",
      createdAt: now,
    });

    // Missing price (rule violation)
    listings.push({
      id: "lst_005",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Commercial Space Downtown",
      price: undefined,
      description: "Prime commercial space suitable for shop or office. High foot traffic area with good visibility.",
      imageUrls: [
        "https://images.cv/comm1-1.jpg",
        "https://images.cv/comm1-2.jpg",
        "https://images.cv/comm1-3.jpg",
      ],
      location: "Mindelo",
      createdAt: now,
    });

    // Generic title (rule violation)
    listings.push({
      id: "lst_006",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Property",
      price: 75000,
      description: "Nice property available for sale. Contact for more details and viewing arrangements.",
      imageUrls: [
        "https://images.cv/prop1-1.jpg",
        "https://images.cv/prop1-2.jpg",
        "https://images.cv/prop1-3.jpg",
      ],
      location: "Mindelo",
      createdAt: now,
    });
  }

  return listings;
}

// ============================================
// REAL SOURCE FETCHER
// ============================================

async function fetchRealSource(
  source: SourceConfig,
  sourceState: SourceState
): Promise<{ listings: IngestListing[]; state: SourceState }> {
  const state = { ...sourceState };
  state.scrapeAttempts = 1;

  console.log(`[${source.id}] Fetching ${source.url}...`);

  const fetchResult = await fetchHtml(source.url);

  if (!fetchResult.success || !fetchResult.html) {
    state.status = SourceStatus.BROKEN_SOURCE;
    state.lastError = fetchResult.error || "Failed to fetch HTML";
    console.log(`[${source.id}] Fetch failed: ${state.lastError}`);
    return { listings: [], state };
  }

  console.log(`[${source.id}] Fetched ${fetchResult.html.length} bytes, parsing...`);

  let parsedListings: ParsedListing[] = [];

  if (source.id === "cv_simplycapeverde") {
    parsedListings = parseSimplyCapeVerde(
      fetchResult.html,
      source.id,
      source.name,
      source.url
    );
  } else if (source.id === "cv_terracaboverde") {
    parsedListings = parseTerraCaboVerde(
      fetchResult.html,
      source.id,
      source.name,
      source.url
    );
  } else {
    // Use generic parser for other HTML sources
    parsedListings = parseGenericHtml(
      fetchResult.html,
      source.id,
      source.name,
      source.url
    );
  }

  if (parsedListings.length === 0) {
    state.status = SourceStatus.PARTIAL_OK;
    state.lastError = "No listings found on page";
    console.log(`[${source.id}] No listings found`);
  } else {
    state.status = SourceStatus.OK;
    console.log(`[${source.id}] Parsed ${parsedListings.length} listings`);
  }

  const listings: IngestListing[] = parsedListings.map((p) => ({
    id: p.id,
    sourceId: p.sourceId,
    sourceName: p.sourceName,
    title: p.title,
    price: p.price,
    description: p.description,
    imageUrls: p.imageUrls,
    location: p.location,
    detailUrl: p.detailUrl,
    createdAt: p.createdAt,
  }));

  return { listings, state };
}

// ============================================
// INGEST REPORT TYPES
// ============================================

interface SourceReport {
  id: string;
  name: string;
  status: SourceStatus;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
}

interface ListingReport {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  price?: number;
  location?: string;
  imageCount: number;
}

interface HiddenListingReport extends ListingReport {
  violations: RuleViolation[];
}

interface IngestReport {
  marketId: string;
  marketName: string;
  generatedAt: string;
  summary: {
    totalListings: number;
    visibleCount: number;
    hiddenCount: number;
    duplicatesRemoved: number;
    sourceCount: number;
  };
  sources: SourceReport[];
  visibleListings: ListingReport[];
  hiddenListings: HiddenListingReport[];
}

// ============================================
// MAIN INGEST FUNCTION
// ============================================

export async function runCvIngest(): Promise<IngestReport> {
  const marketId = "cv";
  const marketName = "Cape Verde";

  console.log(`\n=== Starting ingest for market: ${marketId} ===\n`);

  // Load config
  const sourcesResult = loadSourcesConfig(marketId);
  const rulesResult = loadRulesConfig(marketId);

  const sourceStates: Map<string, SourceState> = new Map();
  const sourceReports: SourceReport[] = [];

  if (!sourcesResult.success || !sourcesResult.data) {
    console.error("Failed to load sources config:", sourcesResult.error);
    return {
      marketId,
      marketName,
      generatedAt: new Date().toISOString(),
      summary: {
        totalListings: 0,
        visibleCount: 0,
        hiddenCount: 0,
        duplicatesRemoved: 0,
        sourceCount: 0,
      },
      sources: [{
        id: "config",
        name: "Configuration",
        status: SourceStatus.BROKEN_SOURCE,
        scrapeAttempts: 1,
        repairAttempts: 0,
        lastError: sourcesResult.error,
      }],
      visibleListings: [],
      hiddenListings: [],
    };
  }

  if (!rulesResult.success) {
    console.warn(`Rules config warning: ${rulesResult.error}`);
  }

  const sources = sourcesResult.data.sources;
  console.log(`Found ${sources.length} sources in config\n`);

  // Initialize source states
  for (const source of sources) {
    sourceStates.set(source.id, createInitialState());
  }

  // Collect all listings from all sources
  const allListings: IngestListing[] = [];

  // Process each source
  for (const source of sources) {
    try {
      if (source.type === "html") {
        // Real source - fetch and parse
        const result = await fetchRealSource(source, sourceStates.get(source.id)!);
        sourceStates.set(source.id, result.state);
        allListings.push(...result.listings);
      } else {
        // Stub source
        const state = sourceStates.get(source.id)!;
        state.scrapeAttempts = 1;
        state.status = SourceStatus.OK;
        sourceStates.set(source.id, state);
      }
    } catch (err) {
      console.error(`[${source.id}] Error:`, err);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.BROKEN_SOURCE;
      state.scrapeAttempts = 1;
      state.lastError = err instanceof Error ? err.message.slice(0, 100) : String(err).slice(0, 100);
      sourceStates.set(source.id, state);
    }
  }

  // Add stub listings for stub sources
  const stubListings = generateStubListings(sources);
  allListings.push(...stubListings);

  console.log(`\nTotal listings collected: ${allListings.length}\n`);

  // Convert to MarketListingInput format
  const marketListings: MarketListingInput[] = allListings.map((l) => ({
    id: l.id,
    sourceId: l.sourceId,
    title: l.title,
    price: l.price,
    description: l.description,
    imageUrls: l.imageUrls,
    location: l.location,
    sourceStatus: sourceStates.get(l.sourceId)?.status || SourceStatus.OK,
    createdAt: l.createdAt,
  }));

  // Build source status map
  const sourceStatusMap: SourceStatusMap = {};
  for (const source of sources) {
    sourceStatusMap[source.id] = sourceStates.get(source.id)?.status || SourceStatus.OK;
  }

  // Run batch evaluation
  const evalResult = batchEvaluateMarket(marketId, marketListings, sourceStatusMap);

  // Detail enrichment (if enabled via env)
  const detailEnrichEnabled = process.env.DETAIL_ENRICH === "1";
  const detailEnrichLimit = parseInt(process.env.DETAIL_ENRICH_LIMIT || "2", 10);

  if (detailEnrichEnabled) {
    // Register plugins
    const factory = getStrategyFactory();
    factory.register(terraCaboVerdePlugin);

    // Build enrichment inputs from hidden listings
    const enrichmentInputs: DetailEnrichmentInput[] = evalResult.classifications
      .filter((c) => c.visibility !== ListingVisibility.VISIBLE)
      .map((c) => {
        const listing = allListings.find((l) => l.id === c.listingId);
        return {
          listingId: c.listingId,
          sourceId: listing?.sourceId || "",
          detailUrl: listing?.detailUrl || "",
          currentTitle: listing?.title,
          currentPrice: listing?.price,
          currentDescription: listing?.description,
          currentImageUrls: listing?.imageUrls || [],
          currentLocation: listing?.location,
          violations: c.violations,
        };
      })
      .filter((input) => input.detailUrl);

    console.log(`\n[Enrichment] Starting with ${enrichmentInputs.length} candidates, limit ${detailEnrichLimit}`);

    const enrichResult = await runDetailEnrichment(enrichmentInputs, detailEnrichLimit);

    // Update listings with enriched data
    for (const result of enrichResult.results) {
      if (!result.success || !result.enriched) continue;
      const listing = allListings.find((l) => l.id === result.listingId);
      if (listing) {
        listing.imageUrls = result.imageUrls;
        if (result.description) listing.description = result.description;
        if (result.title) listing.title = result.title;
        if (result.price) listing.price = result.price;
      }
    }

    // Handle paused source
    if (enrichResult.pausedSource) {
      const state = sourceStates.get(enrichResult.pausedSource.sourceId);
      if (state) {
        state.status = enrichResult.pausedSource.status;
        sourceStates.set(enrichResult.pausedSource.sourceId, state);
      }
    }

    console.log(`[Enrichment] Summary: ${enrichResult.summary.enrichedCount} enriched, ${enrichResult.summary.failedCount} failed`);
    if (enrichResult.summary.stoppedReason) {
      console.log(`[Enrichment] Stopped: ${enrichResult.summary.stoppedReason}`);
    }
  }

  // Re-evaluate after enrichment (rebuild marketListings with updated data)
  const updatedMarketListings: MarketListingInput[] = allListings.map((l) => ({
    id: l.id,
    sourceId: l.sourceId,
    title: l.title,
    price: l.price,
    description: l.description,
    imageUrls: l.imageUrls,
    location: l.location,
    sourceStatus: sourceStates.get(l.sourceId)?.status || SourceStatus.OK,
    createdAt: l.createdAt,
  }));

  const finalEvalResult = batchEvaluateMarket(marketId, updatedMarketListings, sourceStatusMap);

  // Build reports
  for (const source of sources) {
    const state = sourceStates.get(source.id) || createInitialState();
    sourceReports.push({
      id: source.id,
      name: source.name,
      status: state.status,
      scrapeAttempts: state.scrapeAttempts,
      repairAttempts: state.repairAttempts,
      lastError: state.lastError,
    });
  }

  const visibleListings: ListingReport[] = [];
  const hiddenListings: HiddenListingReport[] = [];
  let duplicatesRemoved = 0;

  for (const classification of finalEvalResult.classifications) {
    const listing = allListings.find((l) => l.id === classification.listingId);
    if (!listing) continue;

    const baseReport: ListingReport = {
      id: listing.id,
      sourceId: listing.sourceId,
      sourceName: listing.sourceName,
      title: listing.title,
      price: listing.price,
      location: listing.location,
      imageCount: listing.imageUrls?.length || 0,
    };

    if (classification.visibility === ListingVisibility.VISIBLE) {
      visibleListings.push(baseReport);
    } else {
      hiddenListings.push({
        ...baseReport,
        violations: classification.violations,
      });
      if (classification.violations.includes(RuleViolation.DUPLICATE)) {
        duplicatesRemoved++;
      }
    }
  }

  const report: IngestReport = {
    marketId,
    marketName,
    generatedAt: new Date().toISOString(),
    summary: {
      totalListings: finalEvalResult.totalListings,
      visibleCount: finalEvalResult.visibleCount,
      hiddenCount: finalEvalResult.hiddenCount,
      duplicatesRemoved,
      sourceCount: sources.length,
    },
    sources: sourceReports,
    visibleListings,
    hiddenListings,
  };

  // Write artifact
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const outputPath = path.join(artifactsDir, "cv_ingest_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n=== Ingest Complete ===`);
  console.log(`Report written to: ${outputPath}`);
  console.log(`Summary: ${report.summary.visibleCount} visible, ${report.summary.hiddenCount} hidden, ${report.summary.duplicatesRemoved} duplicates\n`);

  return report;
}

// Run if called directly
if (require.main === module) {
  runCvIngest().catch(console.error);
}
