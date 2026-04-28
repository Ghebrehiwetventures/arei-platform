/**
 * GENERIC MARKET INGEST - Truly Market-Agnostic
 *
 * Usage:
 *   MARKET_ID=ke ts-node core/ingestMarket.ts
 *   MARKET_ID=cv ts-node core/ingestMarket.ts
 *   MARKET_ID=cv SOURCES=cv_ccoreinvestments ts-node core/ingestMarket.ts   # single source
 *   MARKET_ID=cv SOURCES=cv_ccore,cv_terra ts-node core/ingestMarket.ts     # comma list, prefix-match
 *
 * This script:
 * - Reads MARKET_ID from env
 * - Loads config from markets/{marketId}/
 * - Loads optional market-specific plugins from markets/{marketId}/plugins/
 * - Loads optional market-specific location hooks from markets/{marketId}/locationHooks.ts
 * - Runs the same generic pipeline for ANY market
 * - NO market-specific code in this file
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
import {
  batchEvaluateMarket,
  MarketListingInput,
  SourceStatusMap,
} from "./batchEvaluateMarket";
import { genericDetailExtract, DetailExtractionConfig } from "./genericDetailExtractor";
import { upsertListings, SupabaseListing } from "./supabaseWriter";
import { parseLocation, getCurrency, getCountry } from "./locationMapper";
import { deriveProjectMetadata } from "./projectMetadata";
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
import { DetailPlugin } from "./detail/types";
import { getStrategyFactory, resetStrategyFactory } from "./detail/strategyFactory";
import { createGenericDetailPlugin } from "./detail/plugins/genericDetail";

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
  detail_enriched?: boolean;
  detail_error?: string | null;
  detail_skipped_reason?: string | null;
}

// ============================================
// PROPERTY TYPE EXTRACTION
// ============================================

/** Canonical land/plot property types — shared across pipeline and UI */
const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;

function extractPropertyType(title?: string, url?: string): string {
  const text = `${title || ""} ${url || ""}`.toLowerCase();

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

  if (/\b(for.?sale|bedroom|bed)\b/.test(text)) return "house";

  return "property";
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
// DYNAMIC PLUGIN LOADING
// ============================================

interface LocationHookModule {
  resolveLocation(input: {
    id: string;
    sourceId: string;
    title?: string | null;
    description?: string | null;
    sourceUrl?: string | null;
    rawIsland?: string | null;
    rawCity?: string | null;
  }): { island?: string; city?: string } | null;
}

/**
 * Try to load market-specific detail plugins from markets/{marketId}/plugins/.
 * Returns an array of DetailPlugin instances found.
 */
function loadMarketPlugins(marketId: string): DetailPlugin[] {
  const pluginsDir = path.resolve(__dirname, `../markets/${marketId}/plugins`);

  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const plugins: DetailPlugin[] = [];
  const files = fs.readdirSync(pluginsDir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));

  for (const file of files) {
    try {
      const modulePath = path.join(pluginsDir, file);
      const mod = require(modulePath);

      // Find the exported DetailPlugin (look for an object with sourceId and extract)
      for (const key of Object.keys(mod)) {
        const value = mod[key];
        if (value && typeof value === "object" && typeof value.sourceId === "string" && typeof value.extract === "function") {
          plugins.push(value as DetailPlugin);
          console.log(`[Plugins] Loaded market plugin: ${value.sourceId} from ${file}`);
        }
      }
    } catch (err) {
      console.warn(`[Plugins] Failed to load ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return plugins;
}

/**
 * Try to load market-specific location hooks from markets/{marketId}/locationHooks.
 * Returns the module if found, null otherwise.
 */
function loadLocationHooks(marketId: string): LocationHookModule | null {
  const hookPath = path.resolve(__dirname, `../markets/${marketId}/locationHooks`);

  try {
    const mod = require(hookPath);
    if (typeof mod.resolveLocation === "function") {
      console.log(`[Hooks] Loaded location hooks for market: ${marketId}`);
      return mod as LocationHookModule;
    }
  } catch {
    // No location hooks for this market — that's fine
  }

  return null;
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

    if (process.env.DEBUG_GENERIC === "1") {
      const first = result.listings[0];
      console.log(
        `[${source.id}] Sample card: title="${(first.title || "").slice(0, 60)}", desc=${first.description?.length ?? 0} chars, imgs=${first.imageUrls?.length ?? 0}, price=${first.price ?? "null"}`
      );
      const drops = result.debug.containerDrops;
      if (drops) {
        const total = drops.no_link + drops.reject_pattern + drops.duplicate_url + drops.min_path_segments;
        if (total > 0) {
          console.log(`[${source.id}] Containers dropped before evaluation: no_link=${drops.no_link}, reject_pattern=${drops.reject_pattern}, duplicate_url=${drops.duplicate_url}, min_path_segments=${drops.min_path_segments}`);
        }
      }
    }
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
// PLUGIN-BASED DETAIL ENRICHMENT
// ============================================

async function pluginDetailEnrichment(
  listings: IngestListing[],
  sources: SourceConfig[],
  marketId: string
): Promise<void> {
  // Reset and rebuild the strategy factory for this run
  resetStrategyFactory();
  const factory = getStrategyFactory();

  // 1. Load market-specific plugins (e.g. markets/cv/plugins/)
  const marketPlugins = loadMarketPlugins(marketId);
  for (const plugin of marketPlugins) {
    factory.register(plugin);
  }

  // 2. Register generic detail plugins for sources without a custom plugin
  for (const source of sources) {
    if (!source.detail?.enabled) continue;
    if (factory.hasPlugin(source.id)) continue;
    factory.register(createGenericDetailPlugin(source.id, source.detail, source.price_format));
    console.log(`[Detail] Registered generic detail plugin for ${source.id}`);
  }

  // Build a map of source configs for quick lookup
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  // Filter listings that need enrichment based on source config
  const enrichableListings = listings.filter((l) => {
    const source = sourceMap.get(l.sourceId);
    if (!source?.detail?.enabled) return false;
    if (!l.detailUrl) return false;
    if (!factory.hasPlugin(l.sourceId)) return false;

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
    console.log(`[DetailEnrich] No listings need enrichment`);
    return;
  }

  console.log(`[DetailEnrich] Enriching ${enrichableListings.length} listings...`);

  let enrichedCount = 0;
  let failedCount = 0;

  for (const listing of enrichableListings) {
    if (!listing.detailUrl) continue;

    const source = sourceMap.get(listing.sourceId);
    if (!source) continue;

    const plugin = factory.getPlugin(listing.sourceId);
    if (!plugin) continue;

    const delayMs = source.detail?.delay_ms ?? 2500;
    await sleep(delayMs + Math.floor(Math.random() * 500));

    try {
      const fetchFn = source.fetch_method === "headless" ? fetchHeadless : fetchHtml;
      const fetchResult = await fetchFn(listing.detailUrl);

      if (!fetchResult.success || !fetchResult.html) {
        failedCount++;
        listing.detail_error = fetchResult.error || "fetch failed";
        const status = fetchResult.statusCode ? ` [HTTP ${fetchResult.statusCode}]` : "";
        console.log(`[DetailEnrich] ✗ ${listing.id} fetch failed${status}: ${listing.detail_error} (${listing.detailUrl})`);
        continue;
      }

      const extractResult = plugin.extract(fetchResult.html, listing.detailUrl);

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(
          `[DetailEnrich] ${listing.id} extract: success=${extractResult.success}, desc=${extractResult.description?.length ?? "null"} chars, imgs=${extractResult.imageUrls?.length ?? 0}, price=${extractResult.price ?? "null"}, bedrooms=${extractResult.bedrooms ?? "null"}`
        );
      }

      if (!extractResult.success) {
        failedCount++;
        listing.detail_error = "extraction failed";
        console.log(`[DetailEnrich] ✗ ${listing.id} extraction failed`);
        continue;
      }

      // Derive project metadata from detail page
      const projectMetadata = deriveProjectMetadata({
        title: extractResult.title || listing.title,
        description: extractResult.description || listing.description,
        price: extractResult.price || listing.price,
        html: fetchResult.html,
        existing: {
          source_ref: listing.source_ref,
          project_flag: listing.project_flag,
          project_start_price: listing.project_start_price,
        },
      });

      let wasEnriched = false;

      // Prefer explicit plain-text description; fall back to stripping description_html
      let plainDescription = extractResult.description;
      if ((!plainDescription || plainDescription.length < 50) && listing.description_html) {
        const stripped = listing.description_html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (stripped.length >= 50) {
          plainDescription = stripped;
        }
      }

      if (plainDescription && plainDescription.length >= 50) {
        if (!listing.description || plainDescription.length > listing.description.length) {
          listing.description = plainDescription;
          wasEnriched = true;
        }
      }

      // Merge structured data
      if (extractResult.bedrooms !== undefined) listing.bedrooms = extractResult.bedrooms;
      if (extractResult.bathrooms !== undefined) listing.bathrooms = extractResult.bathrooms;
      if (extractResult.parkingSpaces !== undefined) listing.parkingSpaces = extractResult.parkingSpaces;
      if (extractResult.areaSqm !== undefined) listing.area_sqm = extractResult.areaSqm;
      if (extractResult.amenities?.length) listing.amenities = extractResult.amenities;

      // Update price if listing has no price but detail page does (min threshold to reject placeholders)
      if (extractResult.price && extractResult.price >= 500 && !listing.price) {
        listing.price = extractResult.price;
        wasEnriched = true;
      }

      // Update title if we got a better one
      if (extractResult.title && extractResult.title.length > (listing.title?.length || 0)) {
        listing.title = extractResult.title;
      }

      // Update location from detail page if listing has none
      if (extractResult.location && !listing.location) {
        listing.location = extractResult.location;
        wasEnriched = true;
      }

      // Merge images
      if (extractResult.imageUrls?.length) {
        const merged = [...(listing.imageUrls || []), ...extractResult.imageUrls];
        const deduped = dedupeImageUrls(merged);
        if (deduped.length !== (listing.imageUrls || []).length) {
          wasEnriched = true;
        }
        listing.imageUrls = deduped;
      }

      // Apply project metadata
      if (projectMetadata.source_ref) listing.source_ref = projectMetadata.source_ref;
      if (projectMetadata.project_flag != null) listing.project_flag = projectMetadata.project_flag;
      if (projectMetadata.project_start_price != null) {
        listing.project_start_price = projectMetadata.project_start_price;
      }

      listing.detail_enriched = wasEnriched;
      if (wasEnriched) {
        enrichedCount++;
        console.log(
          `[DetailEnrich] ✓ ${listing.id} enriched (desc: ${listing.description?.length || 0} chars, imgs: ${listing.imageUrls?.length || 0})`
        );
      }
    } catch (err) {
      failedCount++;
      listing.detail_error = err instanceof Error ? err.message : String(err);
      console.log(`[DetailEnrich] ✗ ${listing.id} error: ${listing.detail_error}`);
    }
  }

  console.log(`[DetailEnrich] Complete: ${enrichedCount} enriched, ${failedCount} failed`);
}

// ============================================
// LOCATION RESOLUTION WITH FALLBACK CHAIN
// ============================================

function resolveListingLocation(
  listing: { id: string; sourceId: string; title?: string; description?: string; detailUrl?: string; externalUrl?: string; location?: string; imageUrls?: string[] },
  marketId: string,
  locationHooks: LocationHookModule | null
): { island?: string; city?: string } {
  // 1. Try location field
  const locResult = parseLocation(listing.location, marketId);
  if (locResult.island) {
    return { island: locResult.island, city: locResult.city };
  }

  // 2. Try title
  if (listing.title) {
    const titleResult = parseLocation(listing.title, marketId);
    if (titleResult.island) {
      return { island: titleResult.island, city: titleResult.city };
    }
  }

  // 3. Try description (first 500 chars)
  if (listing.description) {
    const descResult = parseLocation(listing.description.substring(0, 500), marketId);
    if (descResult.island) {
      return { island: descResult.island, city: descResult.city };
    }
  }

  // 4. Try market-specific location hooks (e.g., CV island recovery)
  if (locationHooks) {
    const hookResult = locationHooks.resolveLocation({
      id: listing.id,
      sourceId: listing.sourceId,
      title: listing.title,
      description: listing.description,
      sourceUrl: listing.detailUrl || listing.externalUrl || null,
      rawIsland: listing.location,
      rawCity: undefined,
    });
    if (hookResult) {
      return hookResult;
    }
  }

  return {};
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
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
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

  let sources = sourcesResult.data.sources;
  console.log(`Found ${sources.length} sources in config`);

  // Optional source filter for debugging: SOURCES=cv_ccoreinvestments,cv_terra
  // Matches source.id exactly OR by prefix (so SOURCES=cv_ccore matches cv_ccoreinvestments).
  const sourcesFilter = process.env.SOURCES?.trim();
  if (sourcesFilter) {
    const wanted = sourcesFilter.split(",").map(s => s.trim()).filter(Boolean);
    const before = sources.length;
    sources = sources.filter(s => wanted.some(w => s.id === w || s.id.startsWith(w)));
    console.log(`[SOURCES filter] "${sourcesFilter}" → ${sources.length}/${before} sources: ${sources.map(s => s.id).join(", ") || "(none)"}`);
    if (sources.length === 0) {
      console.error(`No sources matched filter "${sourcesFilter}". Available: ${sourcesResult.data.sources.map(s => s.id).join(", ")}`);
      return {
        marketId,
        marketName,
        generatedAt: new Date().toISOString(),
        summary: { totalListings: 0, visibleCount: 0, hiddenCount: 0, duplicatesRemoved: 0, sourceCount: 0 },
        sources: [],
        visibleListings: [],
        hiddenListings: [],
      };
    }
  }
  console.log("");

  // Load optional market-specific location hooks
  const locationHooks = loadLocationHooks(marketId);

  const sourceStates: Map<string, SourceState> = new Map();
  const sourceReports: SourceReport[] = [];
  const sourceDebugErrors: Map<string, string[] | undefined> = new Map();
  const sourceHealth = loadSourceHealth();

  for (const source of sources) {
    sourceStates.set(source.id, createInitialState());
  }

  const allListings: IngestListing[] = [];

  // Process each source. Lifecycle is determined purely from sources.yml
  // (source.lifecycleOverride). Sources without an override default to IN.
  for (const source of sources) {
    const override = source.lifecycleOverride;

    if (override === "DROP") {
      console.log(`[${source.id}] Skipped (DROP per config)`);
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.BROKEN_SOURCE;
      state.lastError = "Dropped by config";
      sourceStates.set(source.id, state);
      continue;
    }

    if (override === "OBSERVE") {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[${source.id}] DEBUG_GENERIC override (OBSERVE -> fetch)`);
      } else {
        console.log(`[${source.id}] Skipped (OBSERVE per config)`);
        const state = sourceStates.get(source.id)!;
        state.status = SourceStatus.PARTIAL_OK;
        state.lastError = "Under observation";
        sourceStates.set(source.id, state);
        continue;
      }
    }

    if (!override) {
      console.log(`[${source.id}] No lifecycleOverride set — defaulting to IN`);
    }

    const persistedHealth = getSourceHealthEntry(sourceHealth, marketId, source.id);
    if (source.type === "html" && shouldAutoPauseSource(persistedHealth)) {
      const state = sourceStates.get(source.id)!;
      state.status = SourceStatus.PAUSED_BY_SYSTEM;
      state.lastError = `Auto-paused after ${persistedHealth!.consecutiveFailureCount} consecutive parser-failure runs`;
      state.pauseReason = persistedHealth?.pauseReason || "parser_failure_threshold";
      state.pauseDetail =
        persistedHealth?.pauseDetail ||
        `Paused after ${persistedHealth!.consecutiveFailureCount} consecutive parser-failure runs`;
      sourceStates.set(source.id, state);
      console.log(`[${source.id}] Auto-paused due to repeated parser failures`);
      continue;
    }

    try {
      if (source.type !== "stub") {
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

  // Plugin-based detail enrichment
  await pluginDetailEnrichment(allListings, sources, marketId);

  // Convert to MarketListingInput for evaluation
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
      pauseReason: state.pauseReason || persistedHealth?.pauseReason,
      pauseDetail: state.pauseDetail || persistedHealth?.pauseDetail,
      lastSeenAt: persistedHealth?.lastSeenAt,
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
      pauseReason: source.pauseReason,
      pauseDetail: source.pauseDetail,
    }))
  );
  for (const source of sourceReports) {
    const persisted = getSourceHealthEntry(persistedHealthAfterRun, marketId, source.id);
    source.consecutiveFailureCount = persisted?.consecutiveFailureCount || 0;
    source.lastErrorClass = persisted?.lastErrorClass;
    source.pauseReason = persisted?.pauseReason;
    source.pauseDetail = persisted?.pauseDetail;
    source.lastSeenAt = persisted?.lastSeenAt;
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

  // Write to Supabase — with data regression guard
  const allReportListings = [...visibleListings, ...hiddenListings];

  // Data regression guard: skip upsert for listings where detail enrichment failed.
  // This prevents overwriting a previously good DB record with degraded data.
  const detailFailedIds = new Set(
    allListings.filter((l) => l.detail_error).map((l) => l.id)
  );
  const safeReportListings = allReportListings.filter((l) => !detailFailedIds.has(l.id));
  if (detailFailedIds.size > 0) {
    console.log(`[Supabase] Skipping ${detailFailedIds.size} listings with failed detail enrichment to prevent data regression`);
  }

  console.log(`\n[Supabase] Writing ${safeReportListings.length} listings...`);

  const supabaseListings: SupabaseListing[] = safeReportListings.map((listing) => {
    const fullListing = allListings.find((l) => l.id === listing.id);
    const classification = evalResult.classifications.find((c) => c.listingId === listing.id);
    const violations = classification?.violations || [];

    // CONFIG-DRIVEN location parsing with fallback chain
    const locationResult = resolveListingLocation(
      {
        id: listing.id,
        sourceId: listing.sourceId,
        title: listing.title,
        description: fullListing?.description,
        detailUrl: fullListing?.detailUrl,
        externalUrl: fullListing?.externalUrl,
        location: listing.location,
      },
      marketId,
      locationHooks
    );
    const currency = getCurrency(marketId);
    const country = getCountry(marketId);

    const propertyType = fullListing?.property_type || extractPropertyType(listing.title, fullListing?.detailUrl);
    const isLand = LAND_TYPES.test(propertyType);

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
      island: locationResult.island,
      city: locationResult.city,
      bedrooms: isLand ? null : (listing.bedrooms ?? null),
      bathrooms: isLand ? null : (listing.bathrooms ?? null),
      property_size_sqm: isLand ? null : (listing.area_sqm ?? null),
      land_area_sqm: isLand ? (listing.area_sqm ?? null) : null,
      image_urls: fullListing?.imageUrls || [],
      status: "observe",
      violations: violations,
      // INVALID_PRICE is non-blocking: "price on request" listings are valid
      // Other violations (MISSING_TITLE, INSUFFICIENT_IMAGES, etc.) still block
      approved: violations.filter(v => v !== "INVALID_PRICE").length === 0,
      property_type: propertyType,
      amenities: fullListing?.amenities || [],
      price_period: "sale",
    };
  });

  if (process.env.DRY_RUN === "1") {
    console.log(`\n[Supabase] DRY_RUN=1 — skipping upsert`);
  } else {
    await upsertListings(supabaseListings);
  }

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
