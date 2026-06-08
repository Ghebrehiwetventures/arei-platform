// Per-source orchestrator for the kv_curated ingest path.
//
// Wraps fetch → enrich → CuratedRow build → status-gate → AI generation →
// kv_curated upsert. Behavior is identical to the inlined main() that
// previously lived in scripts/ingest_to_curated.ts; this module is the
// single-source unit that the per-market orchestrator (a later commit) will
// loop over.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

import { loadSourcesConfig, sourceConfigToFetchConfig, SourceConfig } from "../configLoader";
import { genericPaginatedFetcher, GenericParsedListing } from "../fetcher";
import { fetchHtml } from "../fetchHtml";
import { fetchHeadless } from "../fetchHeadless";
import { getCurrency, getCountry } from "../locationMapper";
import { createPostgresClient } from "../postgresClient";
import { createGenericDetailPlugin } from "../detail/plugins/genericDetail";
import { getStrategyFactory, resetStrategyFactory } from "../detail/strategyFactory";
import { buildListFetchFn } from "./fetchSource";
import { loadLocationHooks } from "./locationHooks";
import {
  LAND_TYPES,
  extractPropertyType,
  normalizeBedroomsForPropertyType,
} from "./propertyType";
import { applyExtractResultToListing } from "./enrich";
import { applyCvSourceCorrections } from "./cvSourceCorrections";
import { resolveLocation as resolveIsland } from "./locationResolver";
import { SourceStatus } from "../status";
import {
  getSourceHealthEntry,
  hasParserDiagnostics,
  loadSourceHealth,
  persistSourceHealth,
  shouldAutoPauseSource,
  type SourceHealthReportInput,
} from "../sourceHealth";

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
  land_area_sqm?: number | null;
  amenities?: string[];
  property_type?: string;
}

export interface CuratedRow {
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

export interface RunMarketSourceOptions {
  marketId: string;
  sourceId: string;
  dryRun: boolean;
}

// ─── Config loader ──────────────────────────────────────────────────────────

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

const ESTATECV_SOURCE_ID = "cv_estatecv";
const ESTATECV_DETAIL_RETRY_DELAY_MS = 1500;
const DETAIL_RETRY_SOURCE_IDS = new Set([ESTATECV_SOURCE_ID, "cv_nhakaza"]);

export function getDetailFetchMethod(sourceConfig: SourceConfig): "http" | "headless" {
  return sourceConfig.detail?.fetch_method ?? sourceConfig.fetch_method ?? "http";
}

export async function fetchDetailWithRetry(
  sourceId: string,
  detailUrl: string,
  fetchFn: (url: string) => Promise<any>,
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<any & { retried: boolean }> {
  let result = await fetchFn(detailUrl);
  if (!DETAIL_RETRY_SOURCE_IDS.has(sourceId) || (result.success && result.html)) {
    return { ...result, retried: false };
  }

  console.log(`[Enrich] Retrying transient ${sourceId} detail failure: ${detailUrl}`);
  await sleepFn(ESTATECV_DETAIL_RETRY_DELAY_MS);
  result = await fetchFn(detailUrl);
  return { ...result, retried: true };
}

export function resolveSourceCurrency(
  sourceConfig: Pick<SourceConfig, "currency">,
  marketId: string,
): string {
  return sourceConfig.currency ?? getCurrency(marketId);
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
      const fetchFn = getDetailFetchMethod(sourceConfig) === "headless" ? fetchHeadless : fetchHtml;
      const fetchResult = await fetchDetailWithRetry(
        sourceConfig.id,
        listing.detailUrl,
        fetchFn,
      );

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

      applyExtractResultToListing(listing, extractResult, {
        applyTruncatedTitleUpgrade: true,
        applyLocationUpgrade: sourceConfig.id === "cv_homescasaverde",
        replaceImagesWithDetail:
          sourceConfig.id === "cv_estatecv" ||
          sourceConfig.id === "cv_homescasaverde",
      });

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
  skipped: Array<{ id: string; reason: string }>,
  refreshedPublished: number = 0
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
  if (refreshedPublished > 0) {
    console.log(`Published refreshed (status preserved): ${refreshedPublished}`);
  }
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
  last_verified_at, publish_status, seeded_from_raw_listing_id
) VALUES (
  $1,  $2,  $3,  $4,  $5,
  $6,  $7,  $8,  $9,  $10, $11,
  $12, $13, $14, $15, $16,
  $17, $18, $19, $20,
  $21, $22, $23
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
  last_verified_at           = EXCLUDED.last_verified_at,
  seeded_from_raw_listing_id = EXCLUDED.seeded_from_raw_listing_id,
  updated_at                 = now()
`;
// Conflict updates preserve publish_status, first_seen_at, first_published_at,
// and existing ai_descriptions. All other source-derived fields are refreshed
// for both needs_review and published rows.

interface ExistingRowMeta {
  status: string;
  hasAi: boolean;
}

interface ExistingUrlIdentity {
  id: string;
  status: string;
}

interface RemovedPublishedRow {
  id: string;
  title: string;
  source_url_primary: string | null;
}

export function reconcileListingIdsBySourceUrl(
  listings: Array<{ id: string; detailUrl?: string }>,
  existingByUrl: Map<string, ExistingUrlIdentity>
): Array<{ from: string; to: string; url: string }> {
  const changes: Array<{ from: string; to: string; url: string }> = [];
  for (const listing of listings) {
    if (!listing.detailUrl) continue;
    const existing = existingByUrl.get(listing.detailUrl);
    if (!existing || existing.id === listing.id) continue;
    changes.push({ from: listing.id, to: existing.id, url: listing.detailUrl });
    listing.id = existing.id;
  }
  return changes;
}

async function fetchExistingUrlIdentities(
  sourceId: string,
  sourceUrls: string[]
): Promise<Map<string, ExistingUrlIdentity>> {
  const urls = [...new Set(sourceUrls.filter(Boolean))];
  if (urls.length === 0) return new Map();

  const client = createPostgresClient();
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      publish_status: string;
      source_url_primary: string;
    }>(
      `SELECT DISTINCT ON (source_url_primary)
              id, publish_status, source_url_primary
         FROM kv_curated.listings
        WHERE source_id_primary = $1
          AND source_url_primary = ANY($2::text[])
        ORDER BY source_url_primary,
                 CASE WHEN publish_status = 'published' THEN 0 ELSE 1 END,
                 first_seen_at ASC`,
      [sourceId, urls]
    );
    return new Map(
      result.rows.map(r => [
        r.source_url_primary,
        { id: r.id, status: r.publish_status },
      ])
    );
  } finally {
    await client.end();
  }
}

async function fetchExistingRowMeta(ids: string[]): Promise<Map<string, ExistingRowMeta>> {
  if (ids.length === 0) return new Map();
  const client = createPostgresClient();
  await client.connect();
  try {
    const result = await client.query<{ id: string; publish_status: string; has_ai: boolean }>(
      `SELECT id, publish_status, (ai_descriptions IS NOT NULL) AS has_ai
         FROM kv_curated.listings
        WHERE id = ANY($1::text[])`,
      [ids]
    );
    return new Map(result.rows.map(r => [r.id, { status: r.publish_status, hasAi: r.has_ai }]));
  } finally {
    await client.end();
  }
}

export function buildFindRemovedPublishedRowsQuery(
  sourceId: string,
  activeIds: string[]
): { text: string; values: unknown[] } | null {
  if (activeIds.length === 0) return null;
  return {
    text: `
SELECT id, title, source_url_primary
  FROM kv_curated.listings
 WHERE source_id_primary = $1
   AND publish_status = 'published'
   AND NOT (id = ANY($2::text[]))
 ORDER BY id
`,
    values: [sourceId, activeIds],
  };
}

export function shouldRunRemovalDetection(
  removalDetection: boolean | undefined,
  activeIds: string[]
): boolean {
  return removalDetection !== false && activeIds.length > 0;
}

export function buildDemoteRemovedPublishedRowsQuery(
  sourceId: string,
  activeIds: string[],
  removedAt: string
): { text: string; values: unknown[] } | null {
  if (activeIds.length === 0) return null;
  return {
    text: `
UPDATE kv_curated.listings
   SET publish_status = 'removed',
       last_verified_at = $3::timestamptz,
       notes = concat_ws(E'\\n', nullif(notes, ''), '[' || ($3::timestamptz)::text || '] Auto-removed: missing from latest successful source fetch.'),
       updated_at = now()
 WHERE source_id_primary = $1
   AND publish_status = 'published'
   AND NOT (id = ANY($2::text[]))
 RETURNING id, title, source_url_primary
`,
    values: [sourceId, activeIds, removedAt],
  };
}

async function findRemovedPublishedRows(sourceId: string, activeIds: string[]): Promise<RemovedPublishedRow[]> {
  const query = buildFindRemovedPublishedRowsQuery(sourceId, activeIds);
  if (!query) return [];
  const client = createPostgresClient();
  await client.connect();
  try {
    const result = await client.query<RemovedPublishedRow>(query.text, query.values);
    return result.rows;
  } finally {
    await client.end();
  }
}

async function demoteRemovedPublishedRows(sourceId: string, activeIds: string[]): Promise<RemovedPublishedRow[]> {
  const removedAt = new Date().toISOString();
  const query = buildDemoteRemovedPublishedRowsQuery(sourceId, activeIds, removedAt);
  if (!query) return [];
  const client = createPostgresClient();
  await client.connect();
  try {
    const result = await client.query<RemovedPublishedRow>(query.text, query.values);
    return result.rows;
  } finally {
    await client.end();
  }
}

export function buildKvCuratedUpsertQuery(row: CuratedRow, verifiedAt: string): { text: string; values: unknown[] } {
  return {
    text: INSERT_SQL,
    values: [
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
      verifiedAt,                      // $21
      row.publish_status,              // $22
      row.seeded_from_raw_listing_id,  // $23
    ],
  };
}

async function writeToKvCurated(rows: CuratedRow[]): Promise<void> {
  if (rows.length === 0) { console.log("[Write] Nothing to write."); return; }

  const client = createPostgresClient();
  await client.connect();
  const verifiedAt = new Date().toISOString();

  let inserted = 0;
  let raceSkipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const query = buildKvCuratedUpsertQuery(row, verifiedAt);
      const result = await client.query(query.text, query.values);
      if (result.rowCount === 0) {
        raceSkipped++;
        console.warn(`[Write] ⊘ ${row.id}: upsert affected 0 rows`);
      } else {
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[Write] ✗ ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await client.end();
  const raceNote = raceSkipped > 0 ? `, ${raceSkipped} race-skipped` : "";
  console.log(`[Write] ${inserted} upserted${raceNote}, ${failed} failed`);
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

interface FetchOutcome {
  listings: WorkingListing[];
  debugErrors: string[];
}

async function fetchListings(sourceConfig: SourceConfig): Promise<FetchOutcome> {
  const fetchConfig = sourceConfigToFetchConfig(sourceConfig);
  const fetchFn = buildListFetchFn(fetchConfig.fetch_method);

  console.log(`[Fetch] Starting ${sourceConfig.fetch_method || "http"} fetch for ${sourceConfig.id}...`);
  const result = await genericPaginatedFetcher(fetchConfig, fetchFn);
  console.log(`[Fetch] ${result.listings.length} listings from ${result.debug.pagesSuccessful} pages (stop: ${result.debug.stopReason})`);

  if (result.debug.errors.length > 0) {
    console.warn(`[Fetch] Errors: ${result.debug.errors.join(", ")}`);
  }

  const listings = result.listings.map((l: GenericParsedListing) => ({
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

  return { listings, debugErrors: result.debug.errors };
}

/**
 * Derive a SourceHealthReportInput from a fetch outcome. Exported for unit
 * testing — the policy (when to mark BROKEN_SOURCE vs PARTIAL_OK vs OK) lives
 * here so it can be exercised without mocking the orchestrator.
 */
export function deriveSourceHealthReport(
  sourceId: string,
  outcome: { listings: unknown[]; debugErrors: string[]; threwError?: string },
): SourceHealthReportInput {
  if (outcome.threwError) {
    return {
      id: sourceId,
      status: SourceStatus.BROKEN_SOURCE,
      lastError: outcome.threwError.slice(0, 100),
      debugErrors: outcome.debugErrors,
    };
  }
  if (outcome.listings.length === 0 && hasParserDiagnostics(outcome.debugErrors)) {
    return {
      id: sourceId,
      status: SourceStatus.BROKEN_SOURCE,
      lastError: outcome.debugErrors[0],
      debugErrors: outcome.debugErrors,
    };
  }
  if (outcome.listings.length === 0) {
    return {
      id: sourceId,
      status: SourceStatus.PARTIAL_OK,
      lastError: outcome.debugErrors[0],
      debugErrors: outcome.debugErrors,
    };
  }
  return {
    id: sourceId,
    status: SourceStatus.OK,
    debugErrors: outcome.debugErrors,
  };
}

// ─── Optional rich JSON report (diagnostics only) ────────────────────────────
// Opt-in via REPORT_JSON=1. Writes the full per-listing dataset (image URLs,
// area, beds/baths, price, location, source URL) that the stdout coverage
// summary omits — for local field-gap / image-outlier analysis. Writes to
// reports/curated/ (already gitignored). Never runs unless the flag is set, so
// normal and production runs are untouched.
function coverageOf(rows: CuratedRow[]) {
  const n = rows.length || 1;
  const pct = (c: number) => `${c}/${rows.length} (${Math.round((100 * c) / n)}%)`;
  const area = (r: CuratedRow) => r.property_size_sqm ?? r.land_area_sqm;
  return {
    price: pct(rows.filter(r => r.price != null).length),
    bedrooms: pct(rows.filter(r => r.bedrooms != null).length),
    bathrooms: pct(rows.filter(r => r.bathrooms != null).length),
    area: pct(rows.filter(r => area(r) != null).length),
    images_ge1: pct(rows.filter(r => r.image_urls && r.image_urls.length > 0).length),
    images_ge3: pct(rows.filter(r => r.image_urls && r.image_urls.length >= 3).length),
  };
}

function writeReportJson(
  marketId: string,
  sourceId: string,
  dryRun: boolean,
  fetched: number,
  rows: CuratedRow[],
  skipped: Array<{ id: string; reason: string }>,
  publishedIds: Set<string>,
  removedPublishedRows: RemovedPublishedRow[]
): void {
  const dir = path.resolve(__dirname, "../../reports/curated");
  fs.mkdirSync(dir, { recursive: true });
  const report = {
    market: marketId,
    source: sourceId,
    generatedAt: new Date().toISOString(),
    dryRun,
    summary: {
      fetched,
      rowsReady: rows.length,
      skipped: skipped.length,
      alreadyPublished: publishedIds.size,
      writable: rows.length,
      removedCandidates: removedPublishedRows.length,
    },
    coverage: {
      allRows: coverageOf(rows),
      newRows: coverageOf(rows.filter(r => !publishedIds.has(r.id))),
    },
    skipped,
    removedCandidates: removedPublishedRows,
    listings: rows.map(r => ({ ...r, alreadyPublished: publishedIds.has(r.id) })),
  };
  const outPath = path.join(dir, `${marketId}_${sourceId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[Report] Wrote ${rows.length} listings → ${outPath}`);
}

// ─── Optional rich JSON report (diagnostics only) ────────────────────────────
// Opt-in via REPORT_JSON=1. Writes the full per-listing dataset (image URLs,
// area, beds/baths, price, location, source URL) that the stdout coverage
// summary omits — for local field-gap / image-outlier analysis. Writes to
// reports/curated/ (already gitignored). Never runs unless the flag is set, so
// normal and production runs are untouched.
function coverageOf(rows: CuratedRow[]) {
  const n = rows.length || 1;
  const pct = (c: number) => `${c}/${rows.length} (${Math.round((100 * c) / n)}%)`;
  const area = (r: CuratedRow) => r.property_size_sqm ?? r.land_area_sqm;
  return {
    price: pct(rows.filter(r => r.price != null).length),
    bedrooms: pct(rows.filter(r => r.bedrooms != null).length),
    bathrooms: pct(rows.filter(r => r.bathrooms != null).length),
    area: pct(rows.filter(r => area(r) != null).length),
    images_ge1: pct(rows.filter(r => r.image_urls && r.image_urls.length > 0).length),
    images_ge3: pct(rows.filter(r => r.image_urls && r.image_urls.length >= 3).length),
  };
}

function writeReportJson(
  marketId: string,
  sourceId: string,
  dryRun: boolean,
  fetched: number,
  rows: CuratedRow[],
  skipped: Array<{ id: string; reason: string }>,
  publishedIds: Set<string>,
  removedPublishedRows: RemovedPublishedRow[]
): void {
  const dir = path.resolve(__dirname, "../../reports/curated");
  fs.mkdirSync(dir, { recursive: true });
  const report = {
    market: marketId,
    source: sourceId,
    generatedAt: new Date().toISOString(),
    dryRun,
    summary: {
      fetched,
      rowsReady: rows.length,
      skipped: skipped.length,
      alreadyPublished: publishedIds.size,
      writable: rows.length,
      removedCandidates: removedPublishedRows.length,
    },
    coverage: {
      allRows: coverageOf(rows),
      newRows: coverageOf(rows.filter(r => !publishedIds.has(r.id))),
    },
    skipped,
    removedCandidates: removedPublishedRows,
    listings: rows.map(r => ({ ...r, alreadyPublished: publishedIds.has(r.id) })),
  };
  const outPath = path.join(dir, `${marketId}_${sourceId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[Report] Wrote ${rows.length} listings → ${outPath}`);
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function runMarketSource(opts: RunMarketSourceOptions): Promise<void> {
  const { marketId, sourceId, dryRun } = opts;
  const sourceConfig = loadSourceConfig(marketId, sourceId);
  const locationHooks = loadLocationHooks(marketId);

  console.log(`\n=== ingest_to_curated ===`);
  console.log(`market=${marketId}  source=${sourceId}  dry_run=${dryRun}\n`);

  const existingHealth = loadSourceHealth();
  const persistedHealth = getSourceHealthEntry(existingHealth, marketId, sourceId);
  if (shouldAutoPauseSource(persistedHealth)) {
    console.log(
      `[${sourceId}] Auto-paused after ${persistedHealth!.consecutiveFailureCount} consecutive parser-failure runs — skipping run.`,
    );
    persistSourceHealth(
      marketId,
      [
        {
          id: sourceId,
          status: SourceStatus.PAUSED_BY_SYSTEM,
          pauseReason: persistedHealth!.pauseReason || "parser_failure_threshold",
          pauseDetail:
            persistedHealth!.pauseDetail ||
            `Paused after ${persistedHealth!.consecutiveFailureCount} consecutive parser-failure runs`,
        },
      ],
      existingHealth,
    );
    return;
  }

  let fetchOutcome: { listings: WorkingListing[]; debugErrors: string[]; threwError?: string };
  try {
    const out = await fetchListings(sourceConfig);
    fetchOutcome = { listings: out.listings, debugErrors: out.debugErrors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${sourceId}] Fetch error:`, message);
    fetchOutcome = { listings: [], debugErrors: [], threwError: message };
    persistSourceHealth(
      marketId,
      [deriveSourceHealthReport(sourceId, fetchOutcome)],
      existingHealth,
    );
    throw err;
  }

  const listings = fetchOutcome.listings;
  console.log(`\nFetched: ${listings.length} listings`);

  await enrichListings(listings, sourceConfig);
  for (const listing of listings) applyCvSourceCorrections(listing);

  const existingByUrl = await fetchExistingUrlIdentities(
    sourceId,
    listings.map(l => l.detailUrl ?? "")
  );
  const identityChanges = reconcileListingIdsBySourceUrl(listings, existingByUrl);
  if (identityChanges.length > 0) {
    console.log(`\n[Identity-gate] ${identityChanges.length} generated ids reconciled to existing same-URL rows:`);
    for (const change of identityChanges) {
      console.log(`  ↻ ${change.from} → ${change.to}  ${change.url}`);
    }
  }

  const currency = resolveSourceCurrency(sourceConfig, marketId);
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
      bedrooms: isLand
        ? null
        : normalizeBedroomsForPropertyType(propertyType, listing.bedrooms),
      bathrooms: isLand ? null : (listing.bathrooms ?? null),
      property_type: propertyType,
      property_size_sqm: isLand ? null : (listing.area_sqm ?? null),
      land_area_sqm: listing.land_area_sqm ?? (isLand ? (listing.area_sqm ?? null) : null),
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

  // Existing published rows stay published, but source-derived fields are
  // refreshed on conflict. Existing ai_descriptions are preserved, so pre-fetch
  // their presence to avoid burning API credits on descriptions the upsert would
  // keep unchanged.
  const existingMeta = await fetchExistingRowMeta(rows.map(r => r.id));
  const publishedIds = new Set(
    [...existingMeta.entries()]
      .filter(([, m]) => m.status === "published")
      .map(([id]) => id)
  );
  const haveAiIds = new Set(
    [...existingMeta.entries()]
      .filter(([, m]) => m.hasAi)
      .map(([id]) => id)
  );
  if (publishedIds.size > 0) {
    console.log(`\n[Status-gate] ${publishedIds.size} listings already published — refreshing source fields, preserving publish_status and existing ai_descriptions:`);
    for (const id of publishedIds) console.log(`  ↻ ${id}`);
  }
  const writable = rows;
  console.log(`\nRows to process: ${writable.length}`);

  // Removal freshness is about source presence, not curated-row validity.
  // A fetched listing that later gets skipped for title/location validation
  // should not be treated as removed from the source.
  const activeIds = listings.map(l => l.id).filter(Boolean);
  const removalDetectionEnabled = shouldRunRemovalDetection(
    sourceConfig.removal_detection,
    activeIds
  );
  const removedPublishedRows = removalDetectionEnabled
    ? await findRemovedPublishedRows(sourceId, activeIds)
    : [];
  if (activeIds.length === 0) {
    console.log(`\n[Removed-gate] Source produced 0 valid rows — removal detection disabled for safety.`);
  } else if (!removalDetectionEnabled) {
    console.log(`\n[Removed-gate] Removal detection disabled by source config (catalogue is not authoritative for absence).`);
  } else if (removedPublishedRows.length > 0) {
    console.log(`\n[Removed-gate] ${removedPublishedRows.length} published listings absent from latest successful source fetch:`);
    for (const row of removedPublishedRows) console.log(`  - ${row.id} ${row.source_url_primary ?? ""}`);
    if (dryRun) {
      console.log(`  [DRY_RUN] These would be demoted to publish_status='removed'.`);
    }
  } else {
    console.log(`\n[Removed-gate] No published listings missing from latest source fetch.`);
  }

  if (process.env.REPORT_JSON === "1") {
    writeReportJson(marketId, sourceId, dryRun, listings.length, rows, skipped, publishedIds, removedPublishedRows);
  }

  if (!dryRun) {
    const needsAi = writable.filter(r => !haveAiIds.has(r.id) && !publishedIds.has(r.id));
    const aiSkippedExisting = writable.length - needsAi.length;
    if (aiSkippedExisting > 0) {
      console.log(`\n[AI-gate] ${aiSkippedExisting}/${writable.length} rows skipped for AI generation (already have ai_descriptions or are published; upsert preserves existing AI text).`);
    }

    let aiOk = 0;
    let aiSkippedShort = 0;
    let aiFailed = 0;

    if (needsAi.length > 0) {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      console.log(`\n[AI] Generating descriptions for ${needsAi.length} rows...`);
      for (const row of needsAi) {
        const ai = await generateAiDescription(row, anthropic, openai);
        if (ai) {
          row.ai_descriptions = ai;
          aiOk++;
          console.log(`[AI] ✓ ${row.id}`);
        } else if (!row.description || row.description.length < MIN_DESC_LENGTH) {
          aiSkippedShort++;
        } else {
          aiFailed++;
        }
      }
    }

    console.log(`[AI] Complete: ${aiOk} generated, ${aiSkippedExisting} skipped (already in DB), ${aiSkippedShort} skipped (short desc), ${aiFailed} failed`);
  }

  if (dryRun) {
    printSummary(listings.length, writable, skipped, publishedIds.size);
    console.log(`\n[DRY_RUN] No rows written.`);
    persistSourceHealth(
      marketId,
      [deriveSourceHealthReport(sourceId, fetchOutcome)],
      existingHealth,
    );
    return;
  }

  if (removedPublishedRows.length > 0) {
    const demoted = await demoteRemovedPublishedRows(sourceId, activeIds);
    console.log(`[Removed-gate] Demoted ${demoted.length} published listings to publish_status='removed'.`);
  }

  await writeToKvCurated(writable);
  printSummary(listings.length, writable, skipped, publishedIds.size);
  console.log(`\nNext step: verify rows then run promotion SQL (see spec).`);
  persistSourceHealth(
    marketId,
    [deriveSourceHealthReport(sourceId, fetchOutcome)],
    existingHealth,
  );
}
