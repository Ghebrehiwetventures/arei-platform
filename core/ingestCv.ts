import { fetchHeadless } from "./fetchHeadless";
import { initSourceStats, normalizeOrDrop } from './dropReport'


import * as fs from "fs";
import * as path from "path";
import { SourceStatus, SourceState, createInitialState } from "./status";
import { loadSourcesConfig, loadRulesConfig, SourceConfig } from "./configLoader";
import { RuleViolation } from "./goldenRules";
import { ListingVisibility } from "./classifyListing";
import { runPreflightCv } from "./preflightCv";
import { LifecycleState } from "./preflightTypes";
import {
  batchEvaluateMarket,
  MarketListingInput,
  SourceStatusMap,
} from "./batchEvaluateMarket";
import { fetchHtml } from "./fetchHtml";
import { runDetailEnrichment } from "./detail/enrich";
import { getStrategyFactory } from "./detail/strategyFactory";
import { terraCaboVerdePlugin } from "./detail/plugins/terraCaboVerde";
import { simplyCapeVerdePlugin } from "./detail/plugins/simplyCapeVerde";
import { homesCasaVerdePlugin } from "./detail/plugins/homesCasaVerde";
import { createGenericDetailPlugin } from "./detail/plugins/genericDetail";
import { DetailEnrichmentInput } from "./detail/types";
import { upsertListings, SupabaseListing } from "./supabaseWriter";
import { parseLocation } from "./locationMapper";
import { resolveCvIslandRecovery } from "./cvIslandRecovery";
import { deriveProjectMetadata } from "./projectMetadata";

// Generic config-driven fetcher — replaces all per-source parsers
import {
  genericPaginatedFetcher,
  GenericParsedListing,
  GenericFetchResult,
} from "./genericFetcher";
import { sourceConfigToFetchConfig } from "./configLoader";

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
  priceText?: string;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  description?: string;
  imageUrls?: string[];
  location?: string;
  detailUrl?: string;
  externalUrl?: string;
  createdAt: Date;
  // Structured property data
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
  // Detail enrichment tracking
  detail_enriched?: boolean;
  detail_error?: string | null;
  detail_skipped_reason?: string | null;
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
      detailUrl: "https://imobiliariapraia.cv/listings/lst_001",
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
      detailUrl: "https://imobiliariapraia.cv/listings/lst_002",
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
      description: "Spacious house with large garden area. 4 bedrooms, 2 bathrooms. Needs some renovation but great potential.",
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
      description: "Prime commercial space suitable for shop or office. High foot traffic area with good visibility.",
      imageUrls: [
        "https://images.cv/comm1-1.jpg",
        "https://images.cv/comm1-2.jpg",
        "https://images.cv/comm1-3.jpg",
      ],
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
      description: "Nice property available for sale. Contact for more details and viewing arrangements.",
      imageUrls: [
        "https://images.cv/prop1-1.jpg",
        "https://images.cv/prop1-2.jpg",
        "https://images.cv/prop1-3.jpg",
      ],
      location: "Mindelo",
      detailUrl: "https://mindeloproperties.cv/listings/lst_006",
      createdAt: now,
    });
  }

  return listings;
}

// ============================================
// REAL SOURCE FETCHER (config-driven via genericPaginatedFetcher)
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Config-driven detail enrichment for any source with detail.enabled: true
 * Replaces the old hardcoded enrichTerraDescriptions().
 * Uses fetchHeadless or fetchHtml based on source config, and the registered
 * detail plugin (source-specific or generic) to extract data.
 */
async function enrichDetailPages(
  listings: IngestListing[],
  sources: SourceConfig[]
): Promise<void> {
  const factory = getStrategyFactory();

  for (const source of sources) {
    if (!source.detail?.enabled) continue;
    if (!factory.hasPlugin(source.id)) continue;

    const sourceListings = listings.filter(
      (l) => l.sourceId === source.id && l.detailUrl
    );
    if (sourceListings.length === 0) continue;

    const delayMs = source.detail.delay_ms || 2500;
    const policy = source.detail.policy || "always";
    const useHeadless = source.fetch_method === "headless";

    console.log(`[${source.id} Detail] Enriching ${sourceListings.length} listings (policy: ${policy}, method: ${useHeadless ? "headless" : "http"})...`);

    let enrichedCount = 0;
    let failedCount = 0;

    for (const listing of sourceListings) {
      if (!listing.detailUrl) continue;

      // Policy check: "on_violation" only enriches if listing is missing critical fields
      if (policy === "on_violation") {
        const hasEnoughImages = (listing.imageUrls?.length || 0) >= 3;
        const hasDescription = (listing.description?.length || 0) >= 50;
        const hasPrice = listing.price != null && listing.price > 0;
        const hasSpecs = (listing.bedrooms != null && listing.bedrooms > 0) ||
          (listing.area_sqm != null && listing.area_sqm > 0);
        const hasLocation = !!(listing.location?.trim());
        if (hasEnoughImages && hasDescription && hasPrice && hasSpecs && hasLocation) {
          listing.detail_skipped_reason = "all_critical_fields_ok";
          continue;
        }
      }

      // Rate limit
      await sleep(delayMs + Math.floor(Math.random() * 1000));

      try {
        const DETAIL_FETCH_TIMEOUT_MS = 45_000;
        const fetchResult = useHeadless
          ? await Promise.race([
              fetchHeadless(listing.detailUrl),
              new Promise<{ success: false; error: string }>((_, reject) =>
                setTimeout(() => reject(new Error(`detail fetch timeout after ${DETAIL_FETCH_TIMEOUT_MS / 1000}s`)), DETAIL_FETCH_TIMEOUT_MS)
              ),
            ])
          : await fetchHtml(listing.detailUrl);

        if (!fetchResult.success || !fetchResult.html) {
          failedCount++;
          listing.detail_error = fetchResult.error || "fetch failed";
          console.log(`[${source.id} Detail] ✗ ${listing.id} fetch failed`);
          continue;
        }

        const plugin = factory.getPlugin(source.id);
        if (!plugin) continue;

        const extractResult = plugin.extract(fetchResult.html, listing.detailUrl);

        if (!extractResult.success) {
          failedCount++;
          listing.detail_error = "extraction failed";
          console.log(`[${source.id} Detail] ✗ ${listing.id} extraction failed`);
          continue;
        }

        const projectMetadata = deriveProjectMetadata({
          title: extractResult.title || listing.title,
          description: extractResult.description || listing.description,
          price: extractResult.price || listing.price,
          priceText: extractResult.priceText || listing.priceText,
          html: fetchResult.html,
          existing: {
            source_ref: listing.source_ref,
            project_flag: listing.project_flag,
            project_start_price: listing.project_start_price,
          },
        });

        let wasEnriched = false;

        // Update description if better
        if (extractResult.description && extractResult.description.length >= 50) {
          if (!listing.description || extractResult.description.length > listing.description.length) {
            listing.description = extractResult.description;
            wasEnriched = true;
          }
        }

        // Merge images
        if (extractResult.imageUrls && extractResult.imageUrls.length > 0) {
          const currentImages = listing.imageUrls || [];
          for (const img of extractResult.imageUrls) {
            if (!currentImages.includes(img)) {
              currentImages.push(img);
              wasEnriched = true;
            }
          }
          listing.imageUrls = currentImages;
        }

        // Update price if listing has no price but detail page does
        // Min threshold €500 to reject placeholder prices like "1 €"
        if (extractResult.price && extractResult.price >= 500 && !listing.price) {
          listing.price = extractResult.price;
          wasEnriched = true;
          console.log(`[${source.id} Detail]   price recovered: ${extractResult.price}`);
        }
        if (extractResult.priceText && extractResult.priceText !== listing.priceText) {
          listing.priceText = extractResult.priceText;
        }

        // Update structured data
        if (extractResult.bedrooms !== undefined) listing.bedrooms = extractResult.bedrooms;
        if (extractResult.bathrooms !== undefined) listing.bathrooms = extractResult.bathrooms;
        if (extractResult.parkingSpaces !== undefined) listing.parkingSpaces = extractResult.parkingSpaces;
        if (extractResult.terraceArea !== undefined) listing.terraceArea = extractResult.terraceArea;
        if (extractResult.amenities && extractResult.amenities.length > 0) {
          listing.amenities = extractResult.amenities;
        }
        if (projectMetadata.source_ref) listing.source_ref = projectMetadata.source_ref;
        if (projectMetadata.project_flag != null) listing.project_flag = projectMetadata.project_flag;
        if (projectMetadata.project_start_price != null) {
          listing.project_start_price = projectMetadata.project_start_price;
        }
        // Update title if we got a better one
        if (extractResult.title && extractResult.title.length > (listing.title?.length || 0)) {
          listing.title = extractResult.title;
        }
        // Update location from detail page if listing has none
        if (extractResult.location && !listing.location) {
          listing.location = extractResult.location;
          wasEnriched = true;
          console.log(`[${source.id} Detail]   location recovered: ${extractResult.location}`);
        }

        listing.detail_enriched = wasEnriched;
        if (wasEnriched) {
          enrichedCount++;
          console.log(`[${source.id} Detail] ✓ ${listing.id} enriched (desc: ${listing.description?.length || 0} chars, imgs: ${listing.imageUrls?.length || 0})`);
        } else {
          console.log(`[${source.id} Detail] ~ ${listing.id} no new data`);
        }
      } catch (err) {
        failedCount++;
        listing.detail_error = err instanceof Error ? err.message : String(err);
        console.log(`[${source.id} Detail] ✗ ${listing.id} error: ${listing.detail_error}`);
      }
    }

    console.log(`[${source.id} Detail] Complete: ${enrichedCount} enriched, ${failedCount} failed`);
  }
}

/**
 * Fetch and parse listings from a real HTML source using the generic
 * config-driven paginated fetcher. No per-source if/else needed.
 *
 * This replaces the old hardcoded fetchRealSource() that only worked
 * for Terra and Simply via dedicated parsers.
 */
async function fetchRealSource(
  source: SourceConfig,
  sourceState: SourceState
): Promise<{ listings: IngestListing[]; state: SourceState }> {
  const state = { ...sourceState };
  state.scrapeAttempts = 1;

  console.log(`[${source.id}] Fetching via genericPaginatedFetcher (method: ${source.fetch_method || "http"}, pagination: ${source.pagination?.type || "none"})...`);

  try {
    // Convert YAML config to SourceFetchConfig
    const fetchConfig = sourceConfigToFetchConfig(source);

    // Use the generic paginated fetcher — handles HTTP/headless, pagination, selectors
    const result: GenericFetchResult = await genericPaginatedFetcher(fetchConfig);

    if (result.listings.length === 0) {
      state.status = SourceStatus.PARTIAL_OK;
      state.lastError = `No listings found (pages: ${result.debug.pagesSuccessful}, stop: ${result.debug.stopReason})`;
      console.log(`[${source.id}] No listings found. Debug: ${JSON.stringify(result.debug)}`);
    } else {
      state.status = SourceStatus.OK;
      console.log(`[${source.id}] Parsed ${result.listings.length} listings across ${result.debug.pagesSuccessful} pages (stop: ${result.debug.stopReason})`);
    }

    if (result.debug.errors.length > 0) {
      console.log(`[${source.id}] Warnings: ${result.debug.errors.join("; ")}`);
    }

    // Map GenericParsedListing to IngestListing
    const listings: IngestListing[] = result.listings.map((p) => ({
      id: p.id,
      sourceId: p.sourceId,
      sourceName: p.sourceName,
      source_ref: p.source_ref ?? null,
      title: p.title,
      price: p.price,
      priceText: p.priceText,
      project_flag: p.project_flag ?? null,
      project_start_price: p.project_start_price ?? null,
      description: p.description,
      imageUrls: p.imageUrls,
      location: p.location,
      detailUrl: p.detailUrl,
      createdAt: p.createdAt,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area_sqm: p.area_sqm,
    }));

    return { listings, state };
  } catch (err) {
    state.status = SourceStatus.BROKEN_SOURCE;
    state.lastError = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
    console.log(`[${source.id}] genericPaginatedFetcher error: ${state.lastError}`);
    return { listings: [], state };
  }
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
  sourceUrl?: string;
  source_ref?: string | null;
  title?: string;
  description?: string;
  price?: number;
  priceText?: string;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  location?: string;
  images: string[];
  // Structured property data
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
  // Detail enrichment tracking
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
// MAIN INGEST FUNCTION
// ============================================

export async function runCvIngest(): Promise<IngestReport> {
  const marketId = "cv";
  const marketName = "Cape Verde";

  console.log(`\n=== Starting ingest for market: ${marketId} ===\n`);

  // Run preflight FIRST
  console.log(`[Preflight] Running preflight check...`);
  const preflightReport = await runPreflightCv();

  // Build lifecycle state map from preflight results
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
    const lifecycle = lifecycleMap.get(source.id);

    // DROP: skip entirely
    if (lifecycle === LifecycleState.DROP) {
      console.log(`[${source.id}] Skipped (DROP)`);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.BROKEN_SOURCE;
      state.lastError = "Dropped by preflight";
      sourceStates.set(source.id, state);
      continue;
    }

    // OBSERVE: skip normal ingest (Trial Enrichment already done in preflight)
    // DEBUG_TERRA override: allow Terra through for debug testing
    if (lifecycle === LifecycleState.OBSERVE) {
      if (process.env.DEBUG_TERRA === "1" && source.id === "cv_terracaboverde") {
        console.log(`[${source.id}] DEBUG_TERRA override (OBSERVE -> fetch)`);
        // Fall through to normal ingest
      } else {
        console.log(`[${source.id}] Skipped (OBSERVE)`);
        const state = sourceStates.get(source.id)!;
        state.status = SourceStatus.PARTIAL_OK;
        state.lastError = "Under observation";
        sourceStates.set(source.id, state);
        continue;
      }
    }

    // IN: proceed with normal ingest
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
  const dropReport = {
    market: marketId,
    generated_at: new Date().toISOString(),
    sources: [] as any[],
  };
  

  // ============================================
  // REGISTER DETAIL PLUGINS (source-specific + generic)
  // ============================================
  const factory = getStrategyFactory();
  // Register source-specific plugins (Terra + Simply have custom extraction logic)
  factory.register(terraCaboVerdePlugin);
  factory.register(simplyCapeVerdePlugin);
  factory.register(homesCasaVerdePlugin);

  // Register generic detail plugins for all other sources with detail.enabled
  // Pass price_format from source config for accurate price parsing
  for (const source of sources) {
    if (!source.detail?.enabled) continue;
    if (factory.hasPlugin(source.id)) continue; // Skip if already registered (Terra/Simply)
    factory.register(createGenericDetailPlugin(source.id, source.detail, source.price_format));
    console.log(`[Detail] Registered generic detail plugin for ${source.id}`);
  }

  // Config-driven detail enrichment for ALL sources with detail.enabled
  await enrichDetailPages(allListings, sources);
  // ============================================
// DROP REPORT – MEASURE NORMALIZED ELIGIBILITY
// ============================================

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
    // IMPORTANT:
    // We DO NOT mutate or save the result.
    // We only measure eligibility.
    normalizeOrDrop(raw, stats);
  }

  dropReport.sources.push(stats);
}


  // Convert to MarketListingInput format
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

  // Run batch evaluation
  const evalResult = batchEvaluateMarket(marketId, marketListings, sourceStatusMap);

  // Detail enrichment (if enabled via env)
  const detailEnrichEnabled = process.env.DETAIL_ENRICH === "1";
  const detailEnrichLimit = parseInt(process.env.DETAIL_ENRICH_LIMIT || "2", 10);

  if (detailEnrichEnabled) {
    // Register plugins
    const factory = getStrategyFactory();
    factory.register(terraCaboVerdePlugin);
    factory.register(simplyCapeVerdePlugin);
    factory.register(homesCasaVerdePlugin);

    // Build enrichment inputs from hidden listings only
    const enrichmentInputs: DetailEnrichmentInput[] = evalResult.classifications
      .filter((c) => c.visibility !== ListingVisibility.VISIBLE)
      .map((c) => {
        const listing = allListings.find((l) => l.id === c.listingId);
        return {
          listingId: c.listingId,
          sourceId: listing?.sourceId || "",
          detailUrl: listing?.externalUrl || listing?.detailUrl || "",
          currentTitle: listing?.title,
          currentPrice: listing?.price,
          currentDescription: listing?.description,
          currentImageUrls: listing?.imageUrls || [],
          currentLocation: listing?.location,
          currentBedrooms: listing?.bedrooms,
          currentArea: listing?.area_sqm,
          violations: c.violations,
        };
      })
      .filter((input) => input.detailUrl);

    console.log(`\n[Enrichment] Starting with ${enrichmentInputs.length} candidates, limit ${detailEnrichLimit}`);

    const enrichResult = await runDetailEnrichment(enrichmentInputs, detailEnrichLimit);

    // Update listings with enriched data and track enrichment status
    for (const result of enrichResult.results) {
      const listing = allListings.find((l) => l.id === result.listingId);
      if (!listing) continue;

      // Track enrichment status for all results
      if (result.skipped) {
        listing.detail_enriched = false;
        listing.detail_error = null;
        listing.detail_skipped_reason = result.skippedReason || "unknown";
      } else if (!result.success) {
        listing.detail_enriched = false;
        listing.detail_error = result.error || "extraction failed";
        listing.detail_skipped_reason = null;
      } else {
        listing.detail_enriched = result.enriched;
        listing.detail_error = null;
        listing.detail_skipped_reason = null;

        // Apply extracted data even when enrichment was "lightweight" and only
        // recovered metadata or price text.
        listing.imageUrls = result.imageUrls;
        if (result.description) listing.description = result.description;
        if (result.title) listing.title = result.title;
        if (result.price !== undefined && result.price >= 500) listing.price = result.price;
        if (result.priceText) listing.priceText = result.priceText;
        if (result.source_ref) listing.source_ref = result.source_ref;
        if (result.project_flag != null) listing.project_flag = result.project_flag;
        if (result.project_start_price != null) {
          listing.project_start_price = result.project_start_price;
        }
        // Map structured property data from enrichment
        if (result.bedrooms !== undefined) listing.bedrooms = result.bedrooms;
        if (result.bathrooms !== undefined) listing.bathrooms = result.bathrooms;
        if (result.parkingSpaces !== undefined) listing.parkingSpaces = result.parkingSpaces;
        if (result.terraceArea !== undefined) listing.terraceArea = result.terraceArea;
        if (result.amenities !== undefined) listing.amenities = result.amenities;
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

    console.log(`[Enrichment] Summary: ${enrichResult.summary.enrichedCount} enriched, ${enrichResult.summary.failedCount} failed, ${enrichResult.summary.skippedCount} skipped`);
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
    sourceUrl: l.detailUrl || l.externalUrl || null,
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
      sourceUrl: listing.detailUrl || listing.externalUrl || "",
      source_ref: listing.source_ref ?? null,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      priceText: listing.priceText || (listing.price ? `${listing.price} EUR` : undefined),
      project_flag: listing.project_flag ?? null,
      project_start_price: listing.project_start_price ?? null,
      location: listing.location,
      images: listing.imageUrls || [],
      // Structured property data
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      area_sqm: listing.area_sqm,
      parkingSpaces: listing.parkingSpaces,
      terraceArea: listing.terraceArea,
      amenities: listing.amenities,
      // Detail enrichment tracking
      detail_enriched: listing.detail_enriched,
      detail_error: listing.detail_error,
      detail_skipped_reason: listing.detail_skipped_reason,
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

  // Write all listings to Supabase (both visible and hidden)
  const allReportListings = [...visibleListings, ...hiddenListings];
  console.log(`\n[Supabase] Writing ${allReportListings.length} listings...`);
  const supabaseListings: SupabaseListing[] = allReportListings.map((listing) => {
    const fullListing = allListings.find((l) => l.id === listing.id);
    const classification = finalEvalResult.classifications.find((c) => c.listingId === listing.id);
    const violations = classification?.violations || [];

    // Parse location into island and city using config-driven locationMapper.
    // Try multiple text sources: location field → title → description (first 500 chars)
    let island: string | undefined;
    let city: string | undefined;
    const locResult = parseLocation(listing.location, "cv");
    if (locResult.island) {
      island = locResult.island;
      city = locResult.city;
    }
    if (!island && listing.title) {
      const titleResult = parseLocation(listing.title, "cv");
      if (titleResult.island) {
        island = titleResult.island;
        city = titleResult.city;
      }
    }
    if (!island && fullListing?.description) {
      const descResult = parseLocation(fullListing.description.substring(0, 500), "cv");
      if (descResult.island) {
        island = descResult.island;
        city = descResult.city;
      }
    }
    if (!island) {
      const recovery = resolveCvIslandRecovery({
        id: listing.id,
        sourceId: listing.sourceId,
        title: listing.title,
        description: fullListing?.description,
        sourceUrl: fullListing?.detailUrl || fullListing?.externalUrl || null,
        rawIsland: listing.location,
        rawCity: undefined,
      });
      if (recovery.kind === "resolved") {
        island = recovery.island;
        city = recovery.city ?? undefined;
      }
    }

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
      currency: "EUR",
      country: "Cape Verde",
      island,
      city,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      property_size_sqm: listing.area_sqm ?? null,
      land_area_sqm: null,
      image_urls: fullListing?.imageUrls || [],
      status: "observe",
      violations: violations,
      // INVALID_PRICE is non-blocking: "price on request" listings are valid
      // Other violations (MISSING_TITLE, INSUFFICIENT_IMAGES, etc.) still block
      approved: violations.filter(v => v !== "INVALID_PRICE").length === 0,
      property_type: undefined,
      amenities: fullListing?.amenities || [],
      price_period: "sale",
    };
  });

  await upsertListings(supabaseListings);

  // Verification: Compare 3 listing IDs between upsert payload and report
  console.log(`\n[Verification] Comparing description lengths between Supabase payload and report...`);
  const verifyCount = Math.min(3, supabaseListings.length);
  for (let i = 0; i < verifyCount; i++) {
    const supabaseItem = supabaseListings[i];
    const reportItem = visibleListings.find((r) => r.id === supabaseItem.id);
    const supabaseDescLen = supabaseItem.description?.length ?? 0;
    const reportDescLen = reportItem?.description?.length ?? 0;
    const match = supabaseDescLen === reportDescLen ? "✓ MATCH" : "✗ MISMATCH";
    console.log(`  [${supabaseItem.id}] Supabase: ${supabaseDescLen} chars | Report: ${reportDescLen} chars | ${match}`);
  }



console.log("ABOUT TO WRITE DROP REPORT");
const dropPath = path.join(artifactsDir, "cv_drop_report.json");
fs.writeFileSync(dropPath, JSON.stringify(dropReport, null, 2));
console.log(`Drop report written to: ${dropPath}`);


  return report;
}

// Run if called directly
if (require.main === module) {
  runCvIngest().catch(console.error);
}
