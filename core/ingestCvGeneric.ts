/**
 * GENERIC INGEST - Config-Driven Pipeline
 *
 * PoC Goal: ZERO source-specific if/else branches.
 * All behavior driven by sources.yml config.
 * Adding a new source = modify YAML only.
 *
 * This replaces ingestCv.ts with a fully generic approach.
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
import { runPreflightCv } from "./preflightCv";
import { LifecycleState } from "./preflightTypes";
import {
  batchEvaluateMarket,
  MarketListingInput,
  SourceStatusMap,
} from "./batchEvaluateMarket";
// Generic detail extractor - config-driven, replaces all plugins
import { genericDetailExtract, DetailExtractionConfig } from "./genericDetailExtractor";
import { upsertListings, SupabaseListing } from "./supabaseWriter";

// Generic location mapper - config-driven, no hardcoded logic
import { parseLocation, getCurrency } from "./locationMapper";

// Generic fetcher - the core of this refactoring
import {
  genericPaginatedFetcher,
  GenericParsedListing,
  SourceFetchConfig,
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
  detail_enriched?: boolean;
  detail_error?: string | null;
  detail_skipped_reason?: string | null;
}

// ============================================
// STUB DATA PROVIDER (unchanged, for testing)
// ============================================

function generateStubListings(sources: SourceConfig[]): IngestListing[] {
  const listings: IngestListing[] = [];
  const now = new Date();

  const stubSources = sources.filter((s) => s.type === "stub");
  const src1 = stubSources[0];
  const src2 = stubSources[1];

  if (src1) {
    listings.push({
      id: "lst_001",
      sourceId: src1.id,
      sourceName: src1.name,
      title: "Modern Apartment in Praia City Center",
      price: 85000,
      description: "Beautiful 3 bedroom apartment with ocean view. Recently renovated with modern finishes.",
      imageUrls: ["https://images.cv/apt1-1.jpg", "https://images.cv/apt1-2.jpg", "https://images.cv/apt1-3.jpg", "https://images.cv/apt1-4.jpg"],
      location: "Praia",
      detailUrl: "https://imobiliariapraia.cv/listings/lst_001",
      createdAt: new Date(now.getTime() - 86400000),
    });

    listings.push({
      id: "lst_002",
      sourceId: src1.id,
      sourceName: src1.name,
      title: "Beachfront Villa with Pool",
      price: 250000,
      description: "Stunning 5 bedroom villa directly on the beach. Private pool, garden, and parking.",
      imageUrls: ["https://images.cv/villa1-1.jpg", "https://images.cv/villa1-2.jpg", "https://images.cv/villa1-3.jpg"],
      location: "Santa Maria",
      detailUrl: "https://imobiliariapraia.cv/listings/lst_002",
      createdAt: new Date(now.getTime() - 172800000),
    });
  }

  if (src2) {
    listings.push({
      id: "lst_003",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Cozy Studio in Mindelo",
      price: 35000,
      description: "Compact studio apartment in the heart of Mindelo. Walking distance to the marina.",
      imageUrls: ["https://images.cv/studio1-1.jpg", "https://images.cv/studio1-2.jpg", "https://images.cv/studio1-3.jpg"],
      location: "Mindelo",
      detailUrl: "https://mindeloproperties.cv/listings/lst_003",
      createdAt: now,
    });

    // Missing images (rule violation)
    listings.push({
      id: "lst_004",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "House with Garden",
      price: 120000,
      description: "Spacious house with large garden area. 4 bedrooms, 2 bathrooms.",
      imageUrls: ["https://images.cv/house1-1.jpg"],
      location: "Mindelo",
      detailUrl: "https://mindeloproperties.cv/listings/lst_004",
      createdAt: now,
    });

    // Missing price (rule violation)
    listings.push({
      id: "lst_005",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Commercial Space Downtown",
      price: undefined,
      description: "Prime commercial space suitable for shop or office.",
      imageUrls: ["https://images.cv/comm1-1.jpg", "https://images.cv/comm1-2.jpg", "https://images.cv/comm1-3.jpg"],
      location: "Mindelo",
      detailUrl: "https://mindeloproperties.cv/listings/lst_005",
      createdAt: now,
    });

    // Generic title (rule violation)
    listings.push({
      id: "lst_006",
      sourceId: src2.id,
      sourceName: src2.name,
      title: "Property",
      price: 75000,
      description: "Nice property available for sale.",
      imageUrls: ["https://images.cv/prop1-1.jpg", "https://images.cv/prop1-2.jpg", "https://images.cv/prop1-3.jpg"],
      location: "Mindelo",
      detailUrl: "https://mindeloproperties.cv/listings/lst_006",
      createdAt: now,
    });
  }

  return listings;
}

// ============================================
// GENERIC SOURCE FETCHER (no if/else!)
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GENERIC fetch function - reads fetch_method from config
 * NO source-specific branching here!
 */
async function genericFetchSource(
  source: SourceConfig,
  sourceState: SourceState
): Promise<{ listings: IngestListing[]; state: SourceState; debugErrors?: string[] }> {
  const state = { ...sourceState };
  state.scrapeAttempts = 1;

  console.log(`[${source.id}] Fetching via ${source.fetch_method || "http"}...`);

  // Build fetch config from YAML
  const fetchConfig = sourceConfigToFetchConfig(source);

  // Create the appropriate fetch function based on config
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

  // Use the generic paginated fetcher
  const result = await genericPaginatedFetcher(fetchConfig, fetchFn);

  if (result.listings.length === 0) {
    state.status = hasParserDiagnostics(result.debug.errors)
      ? SourceStatus.BROKEN_SOURCE
      : SourceStatus.PARTIAL_OK;
    state.lastError = `No listings found (${result.debug.stopReason})`;
    console.log(`[${source.id}] No listings found. Stop reason: ${result.debug.stopReason}`);

    // Log debug info
    if (result.debug.errors.length > 0) {
      console.log(`[${source.id}] Errors: ${result.debug.errors.join(", ")}`);
    }
  } else {
    state.status = SourceStatus.OK;
    console.log(`[${source.id}] Parsed ${result.listings.length} listings from ${result.debug.pagesSuccessful} pages`);
  }

  // Convert GenericParsedListing to IngestListing
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
  }));

  return { listings, state, debugErrors: result.debug.errors };
}

/**
 * GENERIC detail enrichment - reads detail config from YAML
 * NO PLUGINS - uses genericDetailExtract with config from sources.yml
 */
async function genericDetailEnrichment(
  listings: IngestListing[],
  sources: SourceConfig[]
): Promise<void> {
  // Build a map of source configs for quick lookup
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  // Filter listings that need enrichment based on source config
  const enrichableListings = listings.filter((l) => {
    const source = sourceMap.get(l.sourceId);
    if (!source?.detail?.enabled) return false;
    if (!l.detailUrl) return false;

    const policy = source.detail.policy || "on_violation";

    // "always" policy = enrich all
    if (policy === "always") return true;

    // "on_violation" policy = enrich if missing description or images
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

    // Rate limit based on config
    await sleep(delayMs + Math.floor(Math.random() * 500));

    try {
      // Determine fetch method from source config
      const fetchFn = source.fetch_method === "headless" ? fetchHeadless : fetchHtml;
      const fetchResult = await fetchFn(listing.detailUrl);

      if (!fetchResult.success || !fetchResult.html) {
        failedCount++;
        console.log(`[GenericEnrich] ✗ ${listing.id} fetch failed`);
        continue;
      }

      // Build detail config from source YAML - NO PLUGINS
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

      // GENERIC extraction - config-driven, no plugins
      const extractResult = genericDetailExtract(fetchResult.html, listing.detailUrl, detailConfig);

      if (!extractResult.success) {
        failedCount++;
        console.log(`[GenericEnrich] ✗ ${listing.id} extraction failed: ${extractResult.error}`);
        continue;
      }

      // Track if anything was enriched
      let wasEnriched = false;

      // Update listing with enriched data
      if (extractResult.description && extractResult.description.length >= 50) {
        listing.description = extractResult.description;
        wasEnriched = true;
      }

      // Merge structured data
      if (extractResult.bedrooms !== undefined) {
        listing.bedrooms = extractResult.bedrooms;
        wasEnriched = true;
      }
      if (extractResult.bathrooms !== undefined) {
        listing.bathrooms = extractResult.bathrooms;
        wasEnriched = true;
      }
      if (extractResult.parkingSpaces !== undefined) {
        listing.parkingSpaces = extractResult.parkingSpaces;
        wasEnriched = true;
      }
      if (extractResult.area !== undefined) {
        listing.area_sqm = extractResult.area;
        wasEnriched = true;
      }
      if (extractResult.amenities?.length) {
        listing.amenities = extractResult.amenities;
        wasEnriched = true;
      }

      // Merge images
      if (extractResult.imageUrls?.length) {
        const currentImages = listing.imageUrls || [];
        for (const img of extractResult.imageUrls) {
          if (!currentImages.includes(img)) {
            currentImages.push(img);
            wasEnriched = true;
          }
        }
        listing.imageUrls = currentImages;
      }

      if (wasEnriched) {
        enrichedCount++;
        console.log(`[GenericEnrich] ✓ ${listing.id} enriched`);
      }
    } catch (err) {
      failedCount++;
      console.log(`[GenericEnrich] ✗ ${listing.id} error: ${err instanceof Error ? err.message : String(err)}`);
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
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
  detail_enriched?: boolean;
  detail_error?: string | null;
  detail_skipped_reason?: string | null;
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
// MAIN INGEST FUNCTION (GENERIC!)
// ============================================

export async function runCvIngestGeneric(): Promise<IngestReport> {
  const marketId = "cv";
  const marketName = "Cape Verde";

  console.log(`\n=== Starting GENERIC ingest for market: ${marketId} ===\n`);

  // Run preflight
  console.log(`[Preflight] Running preflight check...`);
  const preflightReport = await runPreflightCv();

  const lifecycleMap: Map<string, LifecycleState> = new Map();
  for (const result of preflightReport.results) {
    lifecycleMap.set(result.sourceId, result.lifecycleState);
  }

  console.log(`[Preflight] Complete: IN=${preflightReport.summary.inCount}, OBSERVE=${preflightReport.summary.observeCount}, DROP=${preflightReport.summary.dropCount}`);

  // Load config
  const sourcesResult = loadSourcesConfig(marketId);
  const rulesResult = loadRulesConfig(marketId);

  const sourceStates: Map<string, SourceState> = new Map();
  const sourceReports: SourceReport[] = [];
  const sourceDebugErrors: Map<string, string[] | undefined> = new Map();
  const sourceHealth = loadSourceHealth();

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

  if (!rulesResult.success) {
    console.warn(`Rules config warning: ${rulesResult.error}`);
  }

  const sources = sourcesResult.data.sources;
  console.log(`Found ${sources.length} sources in config\n`);

  // Initialize source states
  for (const source of sources) {
    sourceStates.set(source.id, createInitialState());
  }

  // Collect all listings
  const allListings: IngestListing[] = [];

  // Process each source - NO IF/ELSE FOR SOURCE TYPE!
  for (const source of sources) {
    const lifecycle = lifecycleMap.get(source.id);

    // DROP: skip
    if (lifecycle === LifecycleState.DROP) {
      console.log(`[${source.id}] Skipped (DROP)`);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.BROKEN_SOURCE;
      state.lastError = "Dropped by preflight";
      sourceStates.set(source.id, state);
      continue;
    }

    // OBSERVE: skip unless DEBUG override
    if (lifecycle === LifecycleState.OBSERVE) {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[${source.id}] DEBUG_GENERIC override (OBSERVE -> fetch)`);
      } else {
        console.log(`[${source.id}] Skipped (OBSERVE)`);
        const state = sourceStates.get(source.id)!;
        state.status = SourceStatus.PARTIAL_OK;
        state.lastError = "Under observation";
        sourceStates.set(source.id, state);
        continue;
      }
    }

    // IN: proceed with GENERIC fetch
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
        // GENERIC: No source-specific branching!
        const result = await genericFetchSource(source, sourceStates.get(source.id)!);
        sourceStates.set(source.id, result.state);
        sourceDebugErrors.set(source.id, result.debugErrors);
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

  // Add stub listings
  const stubListings = generateStubListings(sources);
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

  // GENERIC detail enrichment - NO PLUGINS, config-driven only
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

  // Re-evaluate after enrichment (enrichment happens before evaluation via genericDetailEnrichment)
  const updatedMarketListings: MarketListingInput[] = allListings.map((l) => ({
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

  const finalEvalResult = batchEvaluateMarket(marketId, updatedMarketListings, sourceStatusMap);

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

  for (const classification of finalEvalResult.classifications) {
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
      priceText: listing.price ? `${listing.price} EUR` : undefined,
      location: listing.location,
      images: listing.imageUrls || [],
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area_sqm: listing.area_sqm,
      parkingSpaces: listing.parkingSpaces,
      terraceArea: listing.terraceArea,
      amenities: listing.amenities,
      detail_enriched: listing.detail_enriched,
      detail_error: listing.detail_error,
      detail_skipped_reason: listing.detail_skipped_reason,
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

  const outputPath = path.join(artifactsDir, "cv_ingest_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(`\n=== GENERIC Ingest Complete ===`);
  console.log(`Report written to: ${outputPath}`);
  console.log(`Summary: ${report.summary.visibleCount} visible, ${report.summary.hiddenCount} hidden\n`);

  // Write to Supabase
  const allReportListings = [...visibleListings, ...hiddenListings];
  console.log(`\n[Supabase] Writing ${allReportListings.length} listings...`);

  const supabaseListings: SupabaseListing[] = allReportListings.map((listing) => {
    const fullListing = allListings.find((l) => l.id === listing.id);
    const classification = finalEvalResult.classifications.find((c) => c.listingId === listing.id);
    const violations = classification?.violations || [];

    // CONFIG-DRIVEN location parsing - no hardcoded logic
    const locationResult = parseLocation(listing.location, marketId);
    const currency = getCurrency(marketId);

    return {
      id: listing.id,
      source_id: listing.sourceId,
      source_url: fullListing?.detailUrl || fullListing?.externalUrl || null,
      source_ref: fullListing?.source_ref ?? null,
      title: listing.title,
      description: fullListing?.description,
      price: listing.price,
      project_flag: fullListing?.project_flag ?? null,
      project_start_price: fullListing?.project_start_price ?? null,
      currency,
      island: locationResult.island,
      city: locationResult.city,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      property_size_sqm: listing.area_sqm ?? null,
      land_area_sqm: null,
      image_urls: fullListing?.imageUrls || [],
      status: "observe",
      violations: violations,
      // INVALID_PRICE is non-blocking: "price on request" listings are valid
      approved: violations.filter(v => v !== "INVALID_PRICE").length === 0,
    };
  });

  await upsertListings(supabaseListings);

  // Write drop report
  const dropPath = path.join(artifactsDir, "cv_drop_report.json");
  fs.writeFileSync(dropPath, JSON.stringify(dropReport, null, 2));
  console.log(`Drop report written to: ${dropPath}`);

  return report;
}

// Run if called directly
if (require.main === module) {
  runCvIngestGeneric().catch(console.error);
}
