// scripts/ingest_to_curated.ts
import * as path from "path";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { loadSourcesConfig, sourceConfigToFetchConfig, SourceConfig } from "../core/configLoader";
import { genericPaginatedFetcher, GenericParsedListing, dedupeImageUrls } from "../core/genericFetcher";
import { fetchHtml, FetchResult } from "../core/fetchHtml";
import { fetchHeadless } from "../core/fetchHeadless";
import { parseLocation, getCurrency, getCountry } from "../core/locationMapper";
import { createPostgresClient } from "../core/postgresClient";
import { createGenericDetailPlugin } from "../core/detail/plugins/genericDetail";
import { getStrategyFactory, resetStrategyFactory } from "../core/detail/strategyFactory";

// ─── Types ─────────────────────────────────────────────────────────────────

interface WorkingListing {
  id: string;
  sourceId: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  detailUrl?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  amenities?: string[];
  property_type?: string;
}

interface CuratedRow {
  id: string;
  title: string;
  description: string | null;
  description_html: null;
  ai_descriptions: Record<string, unknown> | null;
  price: number | null;
  currency: string;
  price_period: "sale";
  country: string;
  island: string;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: string | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  image_urls: string[];
  source_id_primary: string;
  source_url_primary: string | null;
  first_seen_at: string;
  publish_status: "needs_review";
  seeded_from_raw_listing_id: string;
}

// ─── Property type extraction ───────────────────────────────────────────────

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
  if (/\b(land|plot|plots|acre|acres)\b/.test(text)) return "land";
  return "property";
}

// ─── Env + config validation ────────────────────────────────────────────────

function loadEnv(): { marketId: string; sourceId: string; dryRun: boolean } {
  const marketId = process.env.MARKET_ID;
  const sourceId = process.env.SOURCE_ID;
  const dryRun = process.env.DRY_RUN === "1";

  if (!marketId) { console.error("ERROR: MARKET_ID is required"); process.exit(1); }
  if (!sourceId) { console.error("ERROR: SOURCE_ID is required"); process.exit(1); }
  if (!dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) { console.error("ERROR: ANTHROPIC_API_KEY is required (or set DRY_RUN=1)"); process.exit(1); }
    if (!process.env.OPENAI_API_KEY)    { console.error("ERROR: OPENAI_API_KEY is required (or set DRY_RUN=1)"); process.exit(1); }
    if (!process.env.DATABASE_URL)      { console.error("ERROR: DATABASE_URL is required"); process.exit(1); }
  }

  return { marketId, sourceId, dryRun };
}

function loadSourceConfig(marketId: string, sourceId: string): SourceConfig {
  const result = loadSourcesConfig(marketId);
  if (!result.success || !result.data) {
    console.error(`Failed to load sources config for market '${marketId}':`, result.error);
    process.exit(1);
  }
  const config = result.data.sources.find(s => s.id === sourceId);
  if (!config) {
    console.error(`Source '${sourceId}' not found in markets/${marketId}/sources.yml`);
    process.exit(1);
  }
  if (config.lifecycleOverride === "DROP") {
    console.error(`Source '${sourceId}' is marked DROP — cannot ingest`);
    process.exit(1);
  }
  return config;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Detail enrichment ───────────────────────────────────────────────────────

async function enrichListings(
  listings: WorkingListing[],
  sourceConfig: SourceConfig
): Promise<void> {
  if (!sourceConfig.detail?.enabled) {
    console.log(`[Enrich] Detail extraction disabled for ${sourceConfig.id} — skipping`);
    return;
  }

  resetStrategyFactory();
  const factory = getStrategyFactory();
  factory.register(createGenericDetailPlugin(sourceConfig.id, sourceConfig.detail, sourceConfig.price_format));

  const plugin = factory.getPlugin(sourceConfig.id);
  if (!plugin) return;

  const policy = sourceConfig.detail.policy || "on_violation";
  const toEnrich = listings.filter(l => {
    if (!l.detailUrl) return false;
    if (policy === "always") return true;
    if (policy === "on_violation") {
      return !l.description || l.description.length < 50 || !l.imageUrls || l.imageUrls.length < 3;
    }
    return false;
  });

  console.log(`[Enrich] Enriching ${toEnrich.length}/${listings.length} listings (policy: ${policy})...`);

  let enriched = 0;
  let failed = 0;

  for (const listing of toEnrich) {
    if (!listing.detailUrl) continue;

    const delayMs = sourceConfig.detail.delay_ms ?? 2500;
    await sleep(delayMs + Math.floor(Math.random() * 500));

    try {
      const fetchFn = sourceConfig.fetch_method === "headless" ? fetchHeadless : fetchHtml;
      const fetchResult = await fetchFn(listing.detailUrl);

      if (!fetchResult.success || !fetchResult.html) {
        failed++;
        console.log(`[Enrich] ✗ ${listing.id} fetch failed`);
        continue;
      }

      const extractResult = plugin.extract(fetchResult.html, listing.detailUrl);
      if (!extractResult.success) {
        failed++;
        console.log(`[Enrich] ✗ ${listing.id} extraction failed`);
        continue;
      }

      if (extractResult.description && extractResult.description.length >= 50) {
        if (!listing.description || extractResult.description.length > listing.description.length) {
          listing.description = extractResult.description;
        }
      }

      if (extractResult.bedrooms  !== undefined) listing.bedrooms  = extractResult.bedrooms;
      if (extractResult.bathrooms !== undefined) listing.bathrooms = extractResult.bathrooms;
      if (extractResult.areaSqm   !== undefined) listing.area_sqm  = extractResult.areaSqm;
      if (extractResult.amenities?.length)       listing.amenities = extractResult.amenities;

      if (extractResult.imageUrls?.length) {
        listing.imageUrls = dedupeImageUrls([...listing.imageUrls, ...extractResult.imageUrls]);
      }

      if (extractResult.location && !listing.location) {
        listing.location = extractResult.location;
      }

      if (extractResult.price && extractResult.price >= 500 && !listing.price) {
        listing.price = extractResult.price;
      }

      enriched++;
      console.log(`[Enrich] ✓ ${listing.id}`);
    } catch (err) {
      failed++;
      console.log(`[Enrich] ✗ ${listing.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[Enrich] Complete: ${enriched} enriched, ${failed} failed`);
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

async function fetchListings(sourceConfig: SourceConfig): Promise<WorkingListing[]> {
  const fetchConfig = sourceConfigToFetchConfig(sourceConfig);

  const fetchFn = async (url: string): Promise<FetchResult> => {
    if (fetchConfig.fetch_method === "headless") return fetchHeadless(url);
    return fetchHtml(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });
  };

  console.log(`[Fetch] Starting ${sourceConfig.fetch_method || "http"} fetch for ${sourceConfig.id}...`);
  const result = await genericPaginatedFetcher(fetchConfig, fetchFn);
  console.log(`[Fetch] ${result.listings.length} listings from ${result.debug.pagesSuccessful} pages (stop: ${result.debug.stopReason})`);

  if (result.debug.errors.length > 0) {
    console.warn(`[Fetch] Errors: ${result.debug.errors.join(", ")}`);
  }

  return result.listings.map((l: GenericParsedListing) => ({
    id: l.id,
    sourceId: l.sourceId,
    title: l.title,
    price: l.price,
    description: l.description,
    imageUrls: l.imageUrls,
    location: l.location,
    detailUrl: l.detailUrl,
    bedrooms: l.bedrooms ?? null,
    bathrooms: l.bathrooms ?? null,
    area_sqm: l.area_sqm ?? null,
    property_type: extractPropertyType(l.title, l.detailUrl),
  }));
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { marketId, sourceId, dryRun } = loadEnv();
  const sourceConfig = loadSourceConfig(marketId, sourceId);

  console.log(`\n=== ingest_to_curated ===`);
  console.log(`market=${marketId}  source=${sourceId}  dry_run=${dryRun}\n`);

  const listings = await fetchListings(sourceConfig);
  console.log(`\nFetched: ${listings.length} listings`);

  await enrichListings(listings, sourceConfig);

  if (dryRun) {
    console.log(`\n[DRY_RUN] First 3 listing ids:`);
    listings.slice(0, 3).forEach(l =>
      console.log(`  ${l.id}  title="${l.title}"  price=${l.price}  desc_len=${l.description?.length ?? 0}  images=${l.imageUrls.length}`)
    );
    return;
  }

  console.log(`(location/write not yet wired)`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
