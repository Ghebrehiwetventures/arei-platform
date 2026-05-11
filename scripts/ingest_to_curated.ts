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

// ─── Entry point (stub for now) ────────────────────────────────────────────

async function main(): Promise<void> {
  const { marketId, sourceId, dryRun } = loadEnv();
  const sourceConfig = loadSourceConfig(marketId, sourceId);

  console.log(`\n=== ingest_to_curated ===`);
  console.log(`market=${marketId}  source=${sourceId}  dry_run=${dryRun}\n`);
  console.log(`Source config loaded: ${sourceConfig.name}`);
  console.log(`(stub — fetch/enrich not yet wired)`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
