/**
 * GENERIC MARKET INGEST - Truly Market-Agnostic
 *
 * Usage:
 *   MARKET_ID=ke ts-node core/ingestMarket.ts
 *   MARKET_ID=cv ts-node core/ingestMarket.ts
 *
 * This script:
 * - Reads MARKET_ID from env
 * - Loads config from markets/{marketId}/
 * - Runs the same generic pipeline for ANY market
 * - NO market-specific code
 */

import { fetchHeadless } from "./fetchHeadless";
import { fetchHtml, FetchResult } from "./fetchHtml";
import { initSourceStats, normalizeOrDrop } from "./dropReport";

import * as fs from "fs";
import * as path from "path";
import { SourceStatus, SourceState, createInitialState } from "./status";
import { loadSourcesConfig, loadRulesConfig, SourceConfig, sourceConfigToFetchConfig } from "./configLoader";
import { RuleViolation } from "./goldenRules";
import { ListingVisibility } from "./classifyListing";
import { LifecycleState } from "./preflightTypes";
import {
  batchEvaluateMarket,
  MarketListingInput,
  SourceStatusMap,
} from "./batchEvaluateMarket";
import { genericDetailExtract, DetailExtractionConfig } from "./genericDetailExtractor";
import { upsertListings, SupabaseListing } from "./supabaseWriter";
import { parseLocation, getCurrency, getCountry } from "./locationMapper";
import {
  genericPaginatedFetcher,
  GenericParsedListing,
  SourceFetchConfig,
  dedupeImageUrls,
} from "./genericFetcher";
import {
  getSourceHealthEntry,
  hasParserDiagnostics,
  loadSourceHealth,
  persistSourceHealth,
  shouldAutoPauseSource,
} from "./sourceHealth";

// ============================================
// LISTING TYPES
// ============================================

interface IngestListing {
  id: string;
  sourceId: string;
  sourceName: string;
  source_ref?: string | null;
  title?: string;
  price?: number;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  description?: string;
  description_html?: string;
  imageUrls?: string[];
  location?: string;
  detailUrl?: string;
  externalUrl?: string;
  createdAt: Date;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
  property_type?: string;
}

// ============================================
// PROPERTY TYPE EXTRACTION
// ============================================

/** Canonical land/plot property types — shared across pipeline and UI */
const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;

function extractPropertyType(title?: string, url?: string): string {
  const text = `${title || ""} ${url || ""}`.toLowerCase();

  // Check for specific property types
  if (/\b(villa|villas)\b/.test(text)) return "villa";
  if (/\b(apartment|apartments|flat|flats|apt)\b/.test(text)) return "apartment";
  if (/\b(house|houses|home|homes)\b/.test(text)) return "house";
  if (/\b(townhouse|townhouses|town house)\b/.test(text)) return "townhouse";
  if (/\b(penthouse|penthouses)\b/.test(text)) return "penthouse";
  if (/\b(studio|studios|bedsitter)\b/.test(text)) return "studio";
  if (/\b(bungalow|bungalows)\b/.test(text)) return "bungalow";
  if (/\b(maisonette|maisonettes)\b/.test(text)) return "maisonette";
  if (/\b(duplex|duplexes)\b/.test(text)) return "duplex";
  if (/\b(land|plot|plots|acre|acres)\b/.test(text)) return "land";
  if (/\b(commercial|office|shop|warehouse)\b/.test(text)) return "commercial";

  // Default to "house" if "for-sale" or "bedroom" mentioned
  if (/\b(for.?sale|bedroom|bed)\b/.test(text)) return "house";

  return "property"; // Generic fallback
}

// ============================================
// STUB DATA PROVIDER (for testing)
// ============================================

function generateStubListings(sources: SourceConfig[], marketId: string): IngestListing[] {
  const listings: IngestListing[] = [];
  const now = new Date();

  const stubSources = sources.filter((s) => s.type === "stub");

  for (const stub of stubSources) {
    listings.push({
      id: `${stub.id}_stub_001`,
      sourceId: stub.id,
      sourceName: stub.name,
      title: `Test Property in ${marketId.toUpperCase()}`,
      price: 100000,
      description: "This is a test listing for the generic pipeline.",
      imageUrls: ["https://example.com/img1.jpg", "https://example.com/img2.jpg", "https://example.com/img3.jpg"],
      location: marketId === "ke" ? "Nairobi, Westlands" : "Santa Maria, Sal",
      detailUrl: `https://example-${marketId}.com/properties/test`,
      createdAt: now,
      property_type: "house",
    });
  }

  return listings;
}

// ============================================
// UTILITIES
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// GENERIC SOURCE FETCHER
// ============================================

async function genericFetchSource(
  source: SourceConfig,
  sourceState: SourceState
): Promise<{ listings: IngestListing[]; state: SourceState; debugErrors?: string[] }> {
  const state = { ...sourceState };
  state.scrapeAttempts = 1;

  console.log(`[${source.id}] Fetching via ${source.fetch_method || "http"}...`);

  const fetchConfig = sourceConfigToFetchConfig(source);

  const fetchFn = async (url: string): Promise<FetchResult> => {
    if (fetchConfig.fetch_method === "headless") {
      return fetchHeadless(url);
    }
    return fetchHtml(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });
  };

  const result = await genericPaginatedFetcher(fetchConfig, fetchFn);

  if (result.listings.length === 0) {
    state.status = hasParserDiagnostics(result.debug.errors)
      ? SourceStatus.BROKEN_SOURCE
      : SourceStatus.PARTIAL_OK;
    state.lastError = `No listings found (${result.debug.stopReason})`;
    console.log(`[${source.id}] No listings found. Stop reason: ${result.debug.stopReason}`);

    if (result.debug.errors.length > 0) {
      console.log(`[${source.id}] Errors: ${result.debug.errors.join(", ")}`);
    }
  } else {
    state.status = SourceStatus.OK;
    console.log(`[${source.id}] Parsed ${result.listings.length} listings from ${result.debug.pagesSuccessful} pages`);
  }

  const listings: IngestListing[] = result.listings.map((l: GenericParsedListing) => ({
    id: l.id,
    sourceId: l.sourceId,
    sourceName: l.sourceName,
    source_ref: l.source_ref ?? null,
    title: l.title,
    price: l.price,
    project_flag: l.project_flag ?? null,
    project_start_price: l.project_start_price ?? null,
    description: l.description,
    imageUrls: l.imageUrls,
    location: l.location,
    detailUrl: l.detailUrl,
    createdAt: l.createdAt,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    area_sqm: l.area_sqm,
    property_type: extractPropertyType(l.title, l.detailUrl),
  }));

  return { listings, state, debugErrors: result.debug.errors };
}

// ============================================
// GENERIC DETAIL ENRICHMENT
// ============================================

async function genericDetailEnrichment(
  listings: IngestListing[],
  sources: SourceConfig[]
): Promise<void> {
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  const enrichableListings = listings.filter((l) => {
    const source = sourceMap.get(l.sourceId);
    if (!source?.detail?.enabled) return false;
    if (!l.detailUrl) return false;

    const policy = source.detail.policy || "on_violation";

    if (policy === "always") return true;

    if (policy === "on_violation") {
      const needsDescription = !l.description || l.description.length < 50;
      const needsImages = !l.imageUrls || l.imageUrls.length < 3;
      return needsDescription || needsImages;
    }

    return false;
  });

  if (enrichableListings.length === 0) {
    console.log(`[GenericEnrich] No listings need enrichment`);
    return;
  }

  console.log(`[GenericEnrich] Enriching ${enrichableListings.length} listings...`);

  let enrichedCount = 0;
  let failedCount = 0;

  for (const listing of enrichableListings) {
    if (!listing.detailUrl) continue;

    const source = sourceMap.get(listing.sourceId);
    if (!source) continue;

    const delayMs = source.detail?.delay_ms ?? 2500;
    await sleep(delayMs + Math.floor(Math.random() * 500));

    try {
      const fetchFn = source.fetch_method === "headless" ? fetchHeadless : fetchHtml;
      const fetchResult = await fetchFn(listing.detailUrl);

      if (!fetchResult.success || !fetchResult.html) {
        failedCount++;
        console.log(`[GenericEnrich] ✗ ${listing.id} fetch failed`);
        continue;
      }

      const detailConfig: DetailExtractionConfig = {
        enabled: source.detail?.enabled ?? false,
        policy: source.detail?.policy || "on_violation",
        cms_type: source.cms_type as any,
        selectors: {
          description: source.detail?.selectors?.description,
          images: source.detail?.selectors?.images,
        },
        spec_patterns: source.detail?.spec_patterns,
        amenity_keywords: source.detail?.amenity_keywords,
        delay_ms: source.detail?.delay_ms ?? 2500,
      };

      const extractResult = genericDetailExtract(fetchResult.html, listing.detailUrl, detailConfig);

      if (!extractResult.success) {
        failedCount++;
        continue;
      }

      let wasEnriched = false;

      if (extractResult.description && extractResult.description.length >= 50) {
        listing.description = extractResult.description;
        if (extractResult.description_html) {
          listing.description_html = extractResult.description_html;
        }
        wasEnriched = true;
      }

      if (extractResult.bedrooms !== undefined) listing.bedrooms = extractResult.bedrooms;
      if (extractResult.bathrooms !== undefined) listing.bathrooms = extractResult.bathrooms;
      if (extractResult.parkingSpaces !== undefined) listing.parkingSpaces = extractResult.parkingSpaces;
      if (extractResult.area !== undefined) listing.area_sqm = extractResult.area;
      if (extractResult.amenities?.length) listing.amenities = extractResult.amenities;

      if (extractResult.imageUrls?.length) {
        const merged = [...(listing.imageUrls || []), ...extractResult.imageUrls];
        const deduped = dedupeImageUrls(merged);
        if (deduped.length !== (listing.imageUrls || []).length) {
          wasEnriched = true;
        }
        listing.imageUrls = deduped;
      }

      if (wasEnriched) {
        enrichedCount++;
        console.log(`[GenericEnrich] ✓ ${listing.id} enriched`);
      }
    } catch (err) {
      failedCount++;
    }
  }

  console.log(`[GenericEnrich] Complete: ${enrichedCount} enriched, ${failedCount} failed`);
}

// ============================================
// REPORT TYPES
// ============================================

interface SourceReport {
  id: string;
  name: string;
  status: SourceStatus;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
}

interface ListingReport {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  title?: string;
  description?: string;
  price?: number;
  priceText?: string;
  location?: string;
  images: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
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
// MAIN GENERIC INGEST
// ============================================

export async function runMarketIngest(marketId: string): Promise<IngestReport> {
  const marketName = marketId.toUpperCase();

  console.log(`\n=== Starting GENERIC ingest for market: ${marketId} ===\n`);

  // Load config
  const sourcesResult = loadSourcesConfig(marketId);

  if (!sourcesResult.success || !sourcesResult.data) {
    console.error("Failed to load sources config:", sourcesResult.error);
    return {
      marketId,
      marketName,
      generatedAt: new Date().toISOString(),
      summary: { totalListings: 0, visibleCount: 0, hiddenCount: 0, duplicatesRemoved: 0, sourceCount: 0 },
      sources: [{ id: "config", name: "Configuration", status: SourceStatus.BROKEN_SOURCE, scrapeAttempts: 1, repairAttempts: 0, lastError: sourcesResult.error }],
      visibleListings: [],
      hiddenListings: [],
    };
  }

  const sources = sourcesResult.data.sources;
  console.log(`Found ${sources.length} sources in config\n`);

  const sourceStates: Map<string, SourceState> = new Map();
  const sourceReports: SourceReport[] = [];
  const sourceDebugErrors: Map<string, string[] | undefined> = new Map();
  const sourceHealth = loadSourceHealth();

  for (const source of sources) {
    sourceStates.set(source.id, createInitialState());
  }

  const allListings: IngestListing[] = [];

  // Process each source
  for (const source of sources) {
    // Check lifecycle override
    if (source.lifecycleOverride === "DROP") {
      console.log(`[${source.id}] Skipped (DROP)`);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.BROKEN_SOURCE;
      state.lastError = "Dropped by config";
      sourceStates.set(source.id, state);
      continue;
    }

    if (source.lifecycleOverride === "OBSERVE" && process.env.DEBUG_GENERIC !== "1") {
      console.log(`[${source.id}] Skipped (OBSERVE)`);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.PARTIAL_OK;
      state.lastError = "Under observation";
      sourceStates.set(source.id, state);
      continue;
    }

    const persistedHealth = getSourceHealthEntry(sourceHealth, marketId, source.id);
    if (source.type === "html" && shouldAutoPauseSource(persistedHealth)) {
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.PAUSED_BY_SYSTEM;
      state.lastError = `Auto-paused after ${persistedHealth!.consecutiveFailureCount} consecutive parser-failure runs`;
      sourceStates.set(source.id, state);
      console.log(`[${source.id}] Auto-paused due to repeated parser failures`);
      continue;
    }

    try {
      if (source.type === "html") {
        const result = await genericFetchSource(source, sourceStates.get(source.id)!);
        sourceStates.set(source.id, result.state);
        sourceDebugErrors.set(source.id, result.debugErrors);
        allListings.push(...result.listings);
      } else {
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

  // Add stub listings
  const stubListings = generateStubListings(sources, marketId);
  allListings.push(...stubListings);

  console.log(`\nTotal listings collected: ${allListings.length}\n`);

  // Drop report
  const dropReport = { market: marketId, generated_at: new Date().toISOString(), sources: [] as any[] };
  const listingsBySource = new Map<string, IngestListing[]>();
  for (const l of allListings) {
    if (!listingsBySource.has(l.sourceId)) {
      listingsBySource.set(l.sourceId, []);
    }
    listingsBySource.get(l.sourceId)!.push(l);
  }
  for (const [sourceId, listings] of listingsBySource.entries()) {
    const stats = initSourceStats(sourceId);
    for (const raw of listings) {
      normalizeOrDrop(raw, stats);
    }
    dropReport.sources.push(stats);
  }

  // Generic detail enrichment
  await genericDetailEnrichment(allListings, sources);

  // Convert to MarketListingInput
  const marketListings: MarketListingInput[] = allListings.map((l) => ({
    id: l.id,
    sourceId: l.sourceId,
    title: l.title,
    price: l.price,
    description: l.description,
    imageUrls: l.imageUrls,
    location: l.location,
    sourceUrl: l.detailUrl || l.externalUrl || null,
    sourceStatus: sourceStates.get(l.sourceId)?.status || SourceStatus.OK,
    createdAt: l.createdAt,
  }));

  // Build source status map
  const sourceStatusMap: SourceStatusMap = {};
  for (const source of sources) {
    sourceStatusMap[source.id] = sourceStates.get(source.id)?.status || SourceStatus.OK;
  }

  // Batch evaluation
  const evalResult = batchEvaluateMarket(marketId, marketListings, sourceStatusMap);

  // Build reports
  for (const source of sources) {
    const state = sourceStates.get(source.id) || createInitialState();
    const persistedHealth = getSourceHealthEntry(sourceHealth, marketId, source.id);
    sourceReports.push({
      id: source.id,
      name: source.name,
      status: state.status,
      scrapeAttempts: state.scrapeAttempts,
      repairAttempts: state.repairAttempts,
      lastError: state.lastError,
      debugErrors: sourceDebugErrors.get(source.id),
      consecutiveFailureCount: persistedHealth?.consecutiveFailureCount || 0,
      lastErrorClass: persistedHealth?.lastErrorClass,
    });
  }

  const visibleListings: ListingReport[] = [];
  const hiddenListings: HiddenListingReport[] = [];
  let duplicatesRemoved = 0;

  for (const classification of evalResult.classifications) {
    const listing = allListings.find((l) => l.id === classification.listingId);
    if (!listing) continue;

    const baseReport: ListingReport = {
      id: listing.id,
      sourceId: listing.sourceId,
      sourceName: listing.sourceName,
      sourceUrl: listing.detailUrl || listing.externalUrl || "",
      title: listing.title,
      description: listing.description,
      price: listing.price,
      priceText: listing.price ? `${listing.price} ${getCurrency(marketId)}` : undefined,
      location: listing.location,
      images: listing.imageUrls || [],
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area_sqm: listing.area_sqm,
    };

    if (classification.visibility === ListingVisibility.VISIBLE) {
      visibleListings.push(baseReport);
    } else {
      hiddenListings.push({ ...baseReport, violations: classification.violations });
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
      totalListings: evalResult.totalListings,
      visibleCount: evalResult.visibleCount,
      hiddenCount: evalResult.hiddenCount,
      duplicatesRemoved,
      sourceCount: sources.length,
    },
    sources: sourceReports,
    visibleListings,
    hiddenListings,
  };

  const persistedHealthAfterRun = persistSourceHealth(
    marketId,
    sourceReports.map((source) => ({
      id: source.id,
      status: source.status,
      lastError: source.lastError,
      debugErrors: source.debugErrors,
    }))
  );
  for (const source of sourceReports) {
    const persisted = getSourceHealthEntry(persistedHealthAfterRun, marketId, source.id);
    source.consecutiveFailureCount = persisted?.consecutiveFailureCount || 0;
    source.lastErrorClass = persisted?.lastErrorClass;
  }

  // Write artifacts
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const outputPath = path.join(artifactsDir, `${marketId}_ingest_report.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n=== GENERIC Ingest Complete ===`);
  console.log(`Report written to: ${outputPath}`);
  console.log(`Summary: ${report.summary.visibleCount} visible, ${report.summary.hiddenCount} hidden\n`);

  // Write to Supabase
  const allReportListings = [...visibleListings, ...hiddenListings];
  console.log(`\n[Supabase] Writing ${allReportListings.length} listings...`);

  const supabaseListings: SupabaseListing[] = allReportListings.map((listing) => {
    const fullListing = allListings.find((l) => l.id === listing.id);
    const classification = evalResult.classifications.find((c) => c.listingId === listing.id);
    const violations = classification?.violations || [];

    // CONFIG-DRIVEN location parsing
    const locationResult = parseLocation(listing.location, marketId);
    const currency = getCurrency(marketId);
    const country = getCountry(marketId);

    const isLand = LAND_TYPES.test(fullListing?.property_type || "");

    return {
      id: listing.id,
      source_id: listing.sourceId,
      source_url: fullListing?.detailUrl || fullListing?.externalUrl || null,
      source_ref: fullListing?.source_ref ?? null,
      title: listing.title,
      description: fullListing?.description ?? null,
      description_html: fullListing?.description_html ?? null,
      price: listing.price,
      project_flag: fullListing?.project_flag ?? null,
      project_start_price: fullListing?.project_start_price ?? null,
      currency,
      country,
      island: locationResult.island,  // Works for both islands and regions
      city: locationResult.city,
      bedrooms: isLand ? null : (listing.bedrooms ?? null),
      bathrooms: isLand ? null : (listing.bathrooms ?? null),
      property_size_sqm: isLand ? null : (listing.area_sqm ?? null),
      land_area_sqm: isLand ? (listing.area_sqm ?? null) : null,
      image_urls: fullListing?.imageUrls || [],
      status: "observe",
      violations: violations,
      // INVALID_PRICE is non-blocking: "price on request" listings are valid
      approved: violations.filter(v => v !== "INVALID_PRICE").length === 0,
      property_type: fullListing?.property_type ?? null,
      amenities: fullListing?.amenities || [],
      price_period: "sale",
    };
  });

  await upsertListings(supabaseListings);

  // Write drop report
  const dropPath = path.join(artifactsDir, `${marketId}_drop_report.json`);
  fs.writeFileSync(dropPath, JSON.stringify(dropReport, null, 2));
  console.log(`Drop report written to: ${dropPath}`);

  return report;
}

// ============================================
// CLI ENTRY POINT
// ============================================

if (require.main === module) {
  const marketId = process.env.MARKET_ID;

  if (!marketId) {
    console.error("ERROR: MARKET_ID environment variable is required");
    console.error("Usage: MARKET_ID=ke ts-node core/ingestMarket.ts");
    process.exit(1);
  }

  runMarketIngest(marketId).catch((err) => {
    console.error("Ingest failed:", err);
    process.exit(1);
  });
}
