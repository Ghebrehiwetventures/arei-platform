import {
  DetailEnrichmentInput,
  DetailEnrichmentResult,
  EnrichmentSummary,
} from "./types";
import { DetailQueue } from "./queue";
import { getStrategyFactory } from "./strategyFactory";
import { generateCanonicalId } from "./canonicalId";
import { fetchHtml, FetchResult } from "../fetchHtml";
import { RuleViolation } from "../goldenRules";
import { SourceStatus } from "../status";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsEnrichment(violations: RuleViolation[]): boolean {
  return violations.some(
    (v) =>
      v === RuleViolation.INSUFFICIENT_IMAGES ||
      v === RuleViolation.DESCRIPTION_TOO_SHORT
  );
}

export async function runDetailEnrichment(
  inputs: DetailEnrichmentInput[],
  maxPages: number = 2
): Promise<{
  results: DetailEnrichmentResult[];
  summary: EnrichmentSummary;
  pausedSource?: { sourceId: string; status: SourceStatus };
}> {
  const factory = getStrategyFactory();

  const enrichable = inputs.filter((input) => {
    if (!input.detailUrl) return false;
    if (!needsEnrichment(input.violations)) return false;
    if (!factory.hasPlugin(input.sourceId)) return false;
    return true;
  });

  console.log(`[Enrichment] ${enrichable.length} eligible (of ${inputs.length})`);

  if (enrichable.length === 0) {
    return {
      results: [],
      summary: { totalProcessed: 0, successCount: 0, failedCount: 0, enrichedCount: 0 },
    };
  }

  const toProcess = enrichable.slice(0, maxPages);
  console.log(`[Enrichment] Processing ${toProcess.length} (limit: ${maxPages})`);

  const queue = new DetailQueue(3000, 5000);
  queue.enqueueAll(toProcess);

  const results: DetailEnrichmentResult[] = [];
  let stoppedReason: "CAPTCHA" | "HTTP_403" | "HTTP_429" | undefined;
  let pausedSource: { sourceId: string; status: SourceStatus } | undefined;

  while (!queue.isEmpty()) {
    const delayMs = queue.getDelayForNext();
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const input = queue.dequeue();
    if (!input) break;

    const plugin = factory.getPlugin(input.sourceId);
    if (!plugin) continue;

    console.log(`[Enrichment] Fetching ${input.listingId}...`);

    const fetchResult: FetchResult = await fetchHtml(input.detailUrl);

    // CAPTCHA/403/429 => PAUSED_BY_SYSTEM and stop
    if (fetchResult.statusCode === 403) {
      stoppedReason = "HTTP_403";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] 403 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.statusCode === 429) {
      stoppedReason = "HTTP_429";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] 429 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.html && fetchResult.html.toLowerCase().includes("captcha")) {
      stoppedReason = "CAPTCHA";
      pausedSource = { sourceId: input.sourceId, status: SourceStatus.PAUSED_BY_SYSTEM };
      console.log(`[Enrichment] CAPTCHA - PAUSED_BY_SYSTEM`);
      break;
    }

    if (!fetchResult.success || !fetchResult.html) {
      results.push({
        listingId: input.listingId,
        success: false,
        enriched: false,
        imageUrls: input.currentImageUrls,
        error: fetchResult.error,
      });
      continue;
    }

    const extractResult = plugin.extract(fetchResult.html, input.detailUrl);

    if (!extractResult.success) {
      results.push({
        listingId: input.listingId,
        success: false,
        enriched: false,
        imageUrls: input.currentImageUrls,
        error: extractResult.error,
      });
      continue;
    }

    const allImages = [...input.currentImageUrls];
    for (const img of extractResult.imageUrls) {
      if (!allImages.includes(img)) allImages.push(img);
    }

    const wasEnriched =
      allImages.length > input.currentImageUrls.length ||
      (extractResult.description?.length || 0) > (input.currentDescription?.length || 0);

    const canonicalId = generateCanonicalId(
      input.sourceId,
      extractResult.title || input.currentTitle,
      extractResult.price || input.currentPrice,
      extractResult.location || input.currentLocation
    );

    results.push({
      listingId: input.listingId,
      success: true,
      enriched: wasEnriched,
      canonicalId,
      title: extractResult.title || input.currentTitle,
      price: extractResult.price || input.currentPrice,
      description: extractResult.description || input.currentDescription,
      imageUrls: allImages,
      location: extractResult.location || input.currentLocation,
    });

    console.log(`[Enrichment] ✓ ${input.listingId} (enriched: ${wasEnriched})`);
  }

  return {
    results,
    summary: {
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      enrichedCount: results.filter((r) => r.enriched).length,
      stoppedReason,
    },
    pausedSource,
  };
}
