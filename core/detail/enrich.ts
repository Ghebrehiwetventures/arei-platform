import {
  DetailEnrichmentInput,
  DetailEnrichmentResult,
  EnrichmentSummary,
} from "./types";
import { DetailQueue } from "./queue";
import { getStrategyFactory } from "./strategyFactory";
import { generateCanonicalId } from "./canonicalId";
import { fetchHtml, FetchResult, FetchOptions } from "../fetchHtml";
import { RuleViolation } from "../goldenRules";
import { SourceStatus } from "../status";
import { deriveProjectMetadata } from "../projectMetadata";

// Browser-like headers for SimplyCapeVerde to reduce CAPTCHA triggers
const SIMPLY_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9,sv-SE;q=0.8,sv;q=0.7",
  "Referer": "https://simplycapeverde.com/",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a listing needs secondary enrichment.
 * Triggers on golden rule violations (images, description, price)
 * AND on missing critical fields (bedrooms, area) that aren't tracked
 * as violations but still need enrichment to fill.
 */
function needsEnrichment(input: DetailEnrichmentInput): boolean {
  const hasViolation = input.violations.some(
    (v) =>
      v === RuleViolation.INSUFFICIENT_IMAGES ||
      v === RuleViolation.DESCRIPTION_TOO_SHORT ||
      v === RuleViolation.INVALID_PRICE
  );
  if (hasViolation) return true;

  // Also trigger enrichment if critical data fields are missing
  const missingPrice = !input.currentPrice || input.currentPrice <= 0;
  const missingSpecs = (input.currentBedrooms == null || input.currentBedrooms <= 0) &&
    (input.currentArea == null || input.currentArea <= 0);
  const missingLocation = !input.currentLocation?.trim();

  return missingPrice || missingSpecs || missingLocation;
}

/**
 * Check if URL looks like a Terra list page (not a detail page)
 * List pages have patterns like ?e-page- or pathname /properties or /properties/
 */
function isTerraListPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Check query string for pagination
    if (parsed.search.includes("e-page-")) {
      return true;
    }
    // Check pathname for /properties (list pages)
    const pathname = parsed.pathname;
    if (pathname === "/properties" || pathname === "/properties/") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function runDetailEnrichment(
  inputs: DetailEnrichmentInput[],
  maxPages: number = 2
): Promise<{
  results: DetailEnrichmentResult[];
  summary: EnrichmentSummary;
  pausedSource?: { sourceId: string; status: SourceStatus; pauseReason?: string; pauseDetail?: string };
}> {
  const factory = getStrategyFactory();

  const enrichable = inputs.filter((input) => {
    if (!input.detailUrl) return false;
    // DEBUG_TERRA override: bypass needsEnrichment check for Terra
    const debugTerraOverride = process.env.DEBUG_TERRA === "1" && input.sourceId === "cv_terracaboverde";
    // Simply Cape Verde always requires detail enrichment for Golden quality
    const forceDetailForSimply = input.sourceId === "cv_simplycapeverde";
    if (!debugTerraOverride && !forceDetailForSimply && !needsEnrichment(input)) return false;
    if (!factory.hasPlugin(input.sourceId)) return false;
    return true;
  });

  console.log(`[Enrichment] ${enrichable.length} eligible (of ${inputs.length})`);

  if (enrichable.length === 0) {
    return {
      results: [],
      summary: { totalProcessed: 0, successCount: 0, failedCount: 0, skippedCount: 0, enrichedCount: 0 },
    };
  }

  // Per-source cap: enrichments per source to prevent one source eating the budget
  // BURN-DOWN: temporarily raised from 10 → 50 to clear backlog. Revert after KPIs green.
  const PER_SOURCE_CAP = parseInt(process.env.PER_SOURCE_CAP || "10", 10);
  const sourceCount = new Map<string, number>();
  const capped = enrichable.filter((input) => {
    const count = sourceCount.get(input.sourceId) || 0;
    if (count >= PER_SOURCE_CAP) return false;
    sourceCount.set(input.sourceId, count + 1);
    return true;
  });

  // Log per-source allocation
  for (const [sourceId, count] of sourceCount.entries()) {
    console.log(`[Enrichment]   ${sourceId}: ${count} queued`);
  }

  const toProcess = capped.slice(0, maxPages);
  console.log(`[Enrichment] Processing ${toProcess.length} (limit: ${maxPages}, per-source cap: ${PER_SOURCE_CAP})`);

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

    const listingId = input.listingId;
    const detailUrl = input.detailUrl;

    const plugin = factory.getPlugin(input.sourceId);
    if (!plugin) continue;

    // Check for Terra list page guard before fetching
    if (isTerraListPage(detailUrl)) {
      console.log(`[Enrichment] ↷ ${listingId} url=${detailUrl} reason=list page guard`);
      results.push({
        listingId,
        detailUrl,
        success: false,
        enriched: false,
        skipped: true,
        skippedReason: "list page guard",
        imageUrls: input.currentImageUrls,
      });
      continue;
    }

    console.log(`[Enrichment] Fetching ${listingId}...`);

    // SimplyCapeVerde: extra delay + browser headers to reduce CAPTCHA
    const isSimply = input.sourceId === "cv_simplycapeverde";
    if (isSimply) {
      const extraDelay = 8000 + Math.floor(Math.random() * 4000); // 8-12s jitter
      console.log(`[Enrichment] Simply rate-limit: waiting ${extraDelay}ms`);
      await sleep(extraDelay);
    }

    const fetchOpts: FetchOptions | undefined = isSimply
      ? { headers: SIMPLY_BROWSER_HEADERS }
      : undefined;
    const fetchResult: FetchResult = await fetchHtml(detailUrl, fetchOpts);

    // CAPTCHA/403/429 handling
    // Simply: skip listing and continue (don't stop the whole run)
    // Other sources: pause and stop
    if (fetchResult.statusCode === 403) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=403`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "403", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "HTTP_403";
      pausedSource = {
        sourceId: input.sourceId,
        status: SourceStatus.PAUSED_BY_SYSTEM,
        pauseReason: "detail_http_403",
        pauseDetail: `Detail enrichment paused after HTTP 403 for ${detailUrl}`,
      };
      console.log(`[Enrichment] 403 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.statusCode === 429) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=429`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "429", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "HTTP_429";
      pausedSource = {
        sourceId: input.sourceId,
        status: SourceStatus.PAUSED_BY_SYSTEM,
        pauseReason: "detail_http_429",
        pauseDetail: `Detail enrichment paused after HTTP 429 for ${detailUrl}`,
      };
      console.log(`[Enrichment] 429 - PAUSED_BY_SYSTEM`);
      break;
    }

    if (fetchResult.html && fetchResult.html.toLowerCase().includes("captcha")) {
      if (input.sourceId === "cv_simplycapeverde") {
        console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=captcha`);
        results.push({ listingId, detailUrl, success: false, enriched: false, skipped: true, skippedReason: "captcha", imageUrls: input.currentImageUrls });
        continue;
      }
      stoppedReason = "CAPTCHA";
      pausedSource = {
        sourceId: input.sourceId,
        status: SourceStatus.PAUSED_BY_SYSTEM,
        pauseReason: "detail_captcha",
        pauseDetail: `Detail enrichment paused after CAPTCHA detection for ${detailUrl}`,
      };
      console.log(`[Enrichment] CAPTCHA - PAUSED_BY_SYSTEM`);
      break;
    }

    if (!fetchResult.success || !fetchResult.html) {
      console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=fetch failed: ${fetchResult.error || "no html"}`);
      results.push({
        listingId,
        detailUrl,
        success: false,
        enriched: false,
        imageUrls: input.currentImageUrls,
        error: fetchResult.error,
      });
      continue;
    }

    const extractResult = plugin.extract(fetchResult.html, detailUrl);

    if (!extractResult.success) {
      console.log(`[Enrichment] ✗ ${listingId} url=${detailUrl} reason=plugin returned success:false`);
      results.push({
        listingId,
        detailUrl,
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
    const projectMetadata = deriveProjectMetadata({
      title: extractResult.title || input.currentTitle,
      description: extractResult.description || input.currentDescription,
      price: extractResult.price || input.currentPrice,
      priceText: extractResult.priceText,
      html: fetchResult.html,
    });

    results.push({
      listingId,
      detailUrl,
      success: true,
      enriched: wasEnriched,
      canonicalId,
      source_ref: projectMetadata.source_ref,
      title: extractResult.title || input.currentTitle,
      price: extractResult.price || input.currentPrice,
      priceText: extractResult.priceText,
      project_flag: projectMetadata.project_flag,
      project_start_price: projectMetadata.project_start_price,
      description: extractResult.description || input.currentDescription,
      imageUrls: allImages,
      location: extractResult.location || input.currentLocation,
      // Structured property data from extraction
      bedrooms: extractResult.bedrooms,
      bathrooms: extractResult.bathrooms,
      parkingSpaces: extractResult.parkingSpaces,
      terraceArea: extractResult.terraceArea,
      amenities: extractResult.amenities,
    });

    console.log(`[Enrichment] ✓ ${listingId} (enriched: ${wasEnriched})`);
  }

  return {
    results,
    summary: {
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success && !r.skipped).length,
      skippedCount: results.filter((r) => r.skipped).length,
      enrichedCount: results.filter((r) => r.enriched).length,
      stoppedReason,
    },
    pausedSource,
  };
}
