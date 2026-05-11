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

// ─── AI description ───────────────────────────────────────────────────────────

const PROMPT_VERSION = "v1.2";
const PRIMARY_MODEL  = "claude-sonnet-4-6";
const FALLBACK_MODEL = "gpt-4o";
const MIN_DESC_LENGTH = 500;
const PRIMARY_MAX_RETRIES = 3;
const PRIMARY_RETRY_BASE_DELAY_MS = 2000;

const AREI_VOICE_PROMPT = `Du skriver om fastighets-descriptions för AREI, en data-infrastrukturprodukt för afrikansk fastighetsmarknad. Givet källtext (vilket språk som helst) och strukturerad data, producera 2-3 stycken välskriven engelsk prosa i AREI-röst.

AREI-röst:
- Faktabaserad och neutral
- Specifik före generell ("five minutes from the main beach" hellre än "great location")
- Komprimerad — varje mening bär information
- Ingen säljterminologi: "ideal", "perfect", "rare opportunity", "splendid", "unique", "stunning"
- Inga emojis
- Inga bedömningar om avkastning eller värdering
- Behåll egennamn på källspråket (Cá Almeida, São Paulo district, Conservatória do Registo Predial)
- När källan gör en bedömning (motivated sale, undervalued), attribuera till källan: "the source notes a motivated sale" — gör inte påståendet i AREI:s egen text

Struktur (mjuk riktlinje, inte tvång):
- Stycke 1: vad det är, var det ligger, viktigaste särdrag (~50 ord)
- Stycke 2: layout, skick, features (~40-60 ord)
- Stycke 3 (om relevant): status, services, juridiska noter (~30-50 ord)

Hitta inte på fakta. Om källan inte nämner skick — skriv inte om skick. Om källan inte nämner sea view — skriv inte om sea view.

Konflikthantering och informationsluckor hanteras tyst. Om structured data och källan är i konflikt, välj det troliga värdet utan att kommentera valet. Om en uppgift saknas i källan, utelämna fältet helt. Skriv aldrig meta-kommentarer om själva skrivprocessen — undvik fraser som "there is a conflict between...", "no information is provided in the source", "I will use the figure...". (Detta gäller inte attribuering av källans bedömningar — "the source notes a motivated sale" är fortsatt rätt. Skillnaden: attribuera källans åsikter, men kommentera aldrig din egen skrivprocess.)

Geografisk kontext: Varje description ska innehålla "Cape Verde" (eller "Cabo Verde" om källan är på portugisiska och redan använder den formen) minst en gång, även om källtexten bara nämner ö-namn eller stadsdelar. För internationella köpare är landet kärnan i värdesatsen — ö-namn ensamt räcker inte.

Output: ren text, inga JSON-strukturer, inga rubriker, inga listor. Bara 2-3 stycken prosa separerade med dubbel radbrytning.`;

function buildAiUserMessage(row: CuratedRow): string {
  const fields = [
    ["property_type", row.property_type],
    ["city",          row.city],
    ["island",        row.island],
    ["country",       row.country],
    ["bedrooms",      row.bedrooms],
    ["bathrooms",     row.bathrooms],
    ["property_size_sqm", row.property_size_sqm],
    ["price",         row.price],
  ]
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return [
    `Source language: unknown (auto-detect from text)`,
    `Target language: en`,
    ``,
    `Structured data:`,
    fields || `- (no structured fields available)`,
    ``,
    `Source description:`,
    "```",
    row.description ?? "",
    "```",
    ``,
    `Output the rewritten English description as plain prose only.`,
  ].join("\n");
}

function isRetryable(e: unknown): boolean {
  const err = e as { status?: number; message?: string };
  const status = err?.status;
  if (status === 429 || status === 529 || status === 503 || status === 500) return true;
  return /rate.?limit|overloaded|too many requests/i.test(String(err?.message ?? ""));
}

async function generateAiDescription(
  row: CuratedRow,
  anthropic: Anthropic,
  openai: OpenAI
): Promise<Record<string, unknown> | null> {
  if (!row.description || row.description.length < MIN_DESC_LENGTH) return null;

  const userMessage = buildAiUserMessage(row);
  let text = "";
  let usedFallback = false;
  let lastErr: unknown;

  for (let attempt = 0; attempt < PRIMARY_MAX_RETRIES; attempt++) {
    try {
      const resp = await anthropic.messages.create({
        model: PRIMARY_MODEL,
        max_tokens: 1024,
        system: AREI_VOICE_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      const block = resp.content.find(c => c.type === "text");
      if (block && block.type === "text" && block.text.trim()) {
        text = block.text.trim();
        break;
      }
    } catch (e) {
      lastErr = e;
      if (attempt < PRIMARY_MAX_RETRIES - 1 && isRetryable(e)) {
        await sleep(PRIMARY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  if (!text) {
    try {
      const resp = await openai.chat.completions.create({
        model: FALLBACK_MODEL,
        max_tokens: 1024,
        temperature: 0.5,
        messages: [
          { role: "system", content: AREI_VOICE_PROMPT },
          { role: "user",   content: userMessage },
        ],
      });
      const t = resp.choices[0]?.message?.content?.trim();
      if (t) { text = t; usedFallback = true; }
    } catch { /* generation failed entirely — non-blocking */ }
  }

  if (!text) {
    console.warn(`[AI] ✗ ${row.id}: generation failed (${String(lastErr ?? "unknown")})`);
    return null;
  }

  return {
    en: {
      text,
      generated_at: new Date().toISOString(),
      prompt_version: PROMPT_VERSION,
      model: usedFallback ? FALLBACK_MODEL : PRIMARY_MODEL,
      validated: false,
    },
  };
}

// ─── Verification summary ────────────────────────────────────────────────────

function printSummary(
  fetched: number,
  rows: CuratedRow[],
  skipped: Array<{ id: string; reason: string }>
): void {
  const byIsland: Record<string, number> = {};
  let withPrice = 0, withBedrooms = 0, withBathrooms = 0, withImages = 0, withAi = 0;

  for (const r of rows) {
    byIsland[r.island] = (byIsland[r.island] ?? 0) + 1;
    if (r.price)             withPrice++;
    if (r.bedrooms)          withBedrooms++;
    if (r.bathrooms)         withBathrooms++;
    if (r.image_urls.length) withImages++;
    if (r.ai_descriptions)   withAi++;
  }

  const n = rows.length;
  const pct = (x: number) => n > 0 ? `${x}/${n} (${Math.round(x/n*100)}%)` : "0/0";

  console.log(`\n=== kv_curated insert summary ===`);
  console.log(`Total fetched:     ${fetched}`);
  skipped.forEach(s => console.log(`  Skipped (${s.reason}): 1`));
  console.log(`Inserted/updated:  ${n}`);
  console.log(`\nBy island:`);
  Object.entries(byIsland).sort().forEach(([isl, cnt]) => console.log(`  ${isl.padEnd(20)} ${cnt}`));
  console.log(`\nField coverage:`);
  console.log(`  price          ${pct(withPrice)}`);
  console.log(`  bedrooms       ${pct(withBedrooms)}`);
  console.log(`  bathrooms      ${pct(withBathrooms)}`);
  console.log(`  images ≥1      ${pct(withImages)}`);
  console.log(`  ai_description ${pct(withAi)}`);
}

// ─── kv_curated write ────────────────────────────────────────────────────────

const INSERT_SQL = `
INSERT INTO kv_curated.listings (
  id, title, description, description_html, ai_descriptions,
  price, currency, price_period, country, island, city,
  bedrooms, bathrooms, property_type, property_size_sqm, land_area_sqm,
  image_urls, source_id_primary, source_url_primary, first_seen_at,
  publish_status, seeded_from_raw_listing_id
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,  $10, $11,
  $12, $13, $14, $15, $16,
  $17, $18, $19, $20,
  $21, $22
)
ON CONFLICT (id) DO UPDATE SET
  title                      = EXCLUDED.title,
  description                = EXCLUDED.description,
  description_html           = EXCLUDED.description_html,
  ai_descriptions            = CASE
                                 WHEN kv_curated.listings.ai_descriptions IS NOT NULL
                                 THEN kv_curated.listings.ai_descriptions
                                 ELSE EXCLUDED.ai_descriptions
                               END,
  price                      = EXCLUDED.price,
  currency                   = EXCLUDED.currency,
  island                     = EXCLUDED.island,
  city                       = EXCLUDED.city,
  bedrooms                   = EXCLUDED.bedrooms,
  bathrooms                  = EXCLUDED.bathrooms,
  property_type              = EXCLUDED.property_type,
  property_size_sqm          = EXCLUDED.property_size_sqm,
  land_area_sqm              = EXCLUDED.land_area_sqm,
  image_urls                 = EXCLUDED.image_urls,
  source_url_primary         = EXCLUDED.source_url_primary,
  seeded_from_raw_listing_id = EXCLUDED.seeded_from_raw_listing_id,
  updated_at                 = now()
`;
// publish_status, first_seen_at, first_published_at are NOT updated on conflict.

async function writeToKvCurated(rows: CuratedRow[]): Promise<void> {
  if (rows.length === 0) { console.log("[Write] Nothing to write."); return; }

  const client = createPostgresClient();
  await client.connect();

  let inserted = 0;
  let failed   = 0;

  for (const row of rows) {
    try {
      await client.query(INSERT_SQL, [
        row.id,                          // $1
        row.title,                       // $2
        row.description,                 // $3
        row.description_html,            // $4  null
        row.ai_descriptions              // $5  jsonb
          ? JSON.stringify(row.ai_descriptions)
          : null,
        row.price,                       // $6
        row.currency,                    // $7
        row.price_period,                // $8
        row.country,                     // $9
        row.island,                      // $10
        row.city,                        // $11
        row.bedrooms,                    // $12
        row.bathrooms,                   // $13
        row.property_type,               // $14
        row.property_size_sqm,           // $15
        row.land_area_sqm,               // $16
        row.image_urls,                  // $17  text[]
        row.source_id_primary,           // $18
        row.source_url_primary,          // $19
        row.first_seen_at,               // $20
        row.publish_status,              // $21
        row.seeded_from_raw_listing_id,  // $22
      ]);
      inserted++;
    } catch (err) {
      failed++;
      console.error(`[Write] ✗ ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await client.end();
  console.log(`[Write] ${inserted} upserted, ${failed} failed`);
}

// ─── Location hooks ───────────────────────────────────────────────────────────

interface LocationHookModule {
  resolveLocation(input: {
    id: string; sourceId: string;
    title?: string | null; description?: string | null;
    sourceUrl?: string | null; rawIsland?: string | null; rawCity?: string | null;
  }): { island?: string; city?: string } | null;
}

function loadLocationHooks(marketId: string): LocationHookModule | null {
  const hookPath = path.resolve(__dirname, `../markets/${marketId}/locationHooks`);
  try {
    const mod = require(hookPath);
    if (typeof mod.resolveLocation === "function") return mod as LocationHookModule;
  } catch { /* no hooks for this market */ }
  return null;
}

function resolveIsland(
  listing: WorkingListing,
  marketId: string,
  hooks: LocationHookModule | null
): { island?: string; city?: string } {
  const fromLoc = parseLocation(listing.location, marketId);
  if (fromLoc.island) return { island: fromLoc.island, city: fromLoc.city };

  if (listing.title) {
    const fromTitle = parseLocation(listing.title, marketId);
    if (fromTitle.island) return { island: fromTitle.island, city: fromTitle.city };
  }

  if (listing.description) {
    const fromDesc = parseLocation(listing.description.substring(0, 500), marketId);
    if (fromDesc.island) return { island: fromDesc.island, city: fromDesc.city };
  }

  if (hooks) {
    const hookResult = hooks.resolveLocation({
      id: listing.id,
      sourceId: listing.sourceId,
      title: listing.title ?? null,
      description: listing.description ?? null,
      sourceUrl: listing.detailUrl ?? null,
      rawIsland: listing.location ?? null,
      rawCity: null,
    });
    if (hookResult?.island) return hookResult;
  }

  return {};
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
  const locationHooks = loadLocationHooks(marketId);

  console.log(`\n=== ingest_to_curated ===`);
  console.log(`market=${marketId}  source=${sourceId}  dry_run=${dryRun}\n`);

  const listings = await fetchListings(sourceConfig);
  console.log(`\nFetched: ${listings.length} listings`);

  await enrichListings(listings, sourceConfig);

  const currency = getCurrency(marketId);
  const country  = getCountry(marketId);
  const now      = new Date().toISOString();

  const skipped: Array<{ id: string; reason: string }> = [];
  const rows: CuratedRow[] = [];

  for (const listing of listings) {
    if (!listing.id) {
      skipped.push({ id: "(no id)", reason: "missing id" });
      continue;
    }
    if (!listing.title) {
      skipped.push({ id: listing.id, reason: "null title" });
      continue;
    }

    const { island, city } = resolveIsland(listing, marketId, locationHooks);
    if (!island) {
      skipped.push({ id: listing.id, reason: "island unresolved" });
      continue;
    }

    const propertyType = listing.property_type ?? extractPropertyType(listing.title, listing.detailUrl);
    const isLand = LAND_TYPES.test(propertyType);

    rows.push({
      id: listing.id,
      title: listing.title,
      description: listing.description ?? null,
      description_html: null,
      ai_descriptions: null,
      price: listing.price ?? null,
      currency,
      price_period: "sale",
      country,
      island,
      city: city ?? null,
      bedrooms: isLand ? null : (listing.bedrooms ?? null),
      bathrooms: isLand ? null : (listing.bathrooms ?? null),
      property_type: propertyType,
      property_size_sqm: isLand ? null : (listing.area_sqm ?? null),
      land_area_sqm: isLand ? (listing.area_sqm ?? null) : null,
      image_urls: listing.imageUrls,
      source_id_primary: sourceId,
      source_url_primary: listing.detailUrl ?? null,
      first_seen_at: now,
      publish_status: "needs_review",
      seeded_from_raw_listing_id: listing.id,
    });
  }

  console.log(`\nRows ready: ${rows.length}  Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    console.log(`Skipped details:`);
    skipped.forEach(s => console.log(`  ${s.id}: ${s.reason}`));
  }

  if (!dryRun) {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`\n[AI] Generating descriptions for ${rows.length} rows...`);
    let aiOk = 0;
    let aiSkipped = 0;
    let aiFailed = 0;

    for (const row of rows) {
      const ai = await generateAiDescription(row, anthropic, openai);
      if (ai) {
        row.ai_descriptions = ai;
        aiOk++;
        console.log(`[AI] ✓ ${row.id}`);
      } else if (!row.description || row.description.length < MIN_DESC_LENGTH) {
        aiSkipped++;
      } else {
        aiFailed++;
      }
    }

    console.log(`[AI] Complete: ${aiOk} generated, ${aiSkipped} skipped (short desc), ${aiFailed} failed`);
  }

  if (dryRun) {
    printSummary(listings.length, rows, skipped);
    console.log(`\n[DRY_RUN] No rows written.`);
    return;
  }

  await writeToKvCurated(rows);
  printSummary(listings.length, rows, skipped);
  console.log(`\nNext step: verify rows then run promotion SQL (see spec).`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
