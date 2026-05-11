# CCore Investments → kv_curated Direct Ingest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the generic fetch+enrich pipeline for `cv_ccoreinvestments` and write rows directly into `kv_curated.listings` as `needs_review`, with inline AI descriptions, ready for manual promotion to `published`.

**Architecture:** A new standalone script (`scripts/ingest_to_curated.ts`) reuses `genericPaginatedFetcher`, `createGenericDetailPlugin`, and `parseLocation` from the existing infrastructure. A new `core/postgresClient.ts` provides the `createPostgresClient()` utility required for all `kv_curated` writes. The existing `ingestMarket.ts` is not modified.

**Tech Stack:** TypeScript, `ts-node`, `pg` (already in dependencies), `@anthropic-ai/sdk`, `openai`, existing pipeline modules in `core/`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `core/postgresClient.ts` | `createPostgresClient()` using `pg.Client` + `DATABASE_URL` |
| Create | `scripts/ingest_to_curated.ts` | Full ingest-to-curated script |
| Modify | `package.json` | Add `ingest:curated` npm script |

**Reference only (no changes):**
- `core/genericFetcher.ts` — `genericPaginatedFetcher`, `GenericParsedListing`, `dedupeImageUrls`
- `core/configLoader.ts` — `loadSourcesConfig`, `sourceConfigToFetchConfig`, `SourceConfig`
- `core/detail/plugins/genericDetail.ts` — `createGenericDetailPlugin`
- `core/detail/strategyFactory.ts` — `getStrategyFactory`, `resetStrategyFactory`
- `core/locationMapper.ts` — `parseLocation`, `getCurrency`, `getCountry`
- `core/fetchHtml.ts` — `fetchHtml`, `FetchResult`
- `core/fetchHeadless.ts` — `fetchHeadless`
- `markets/cv/locationHooks.ts` — `resolveLocation` (CV island recovery hook)
- `scripts/backfill_ai_descriptions.ts` — source of `AREI_VOICE_PROMPT` text (copy, do not import)

---

## Task 1: `core/postgresClient.ts`

**Files:**
- Create: `core/postgresClient.ts`

- [ ] **Step 1: Create the file**

```typescript
// core/postgresClient.ts
import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

export function createPostgresClient(): Client {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in .env");
  return new Client({ connectionString: url });
}
```

- [ ] **Step 2: Verify it throws on missing DATABASE_URL**

```bash
NODE_OPTIONS="" node -e "
  delete process.env.DATABASE_URL;
  const { createPostgresClient } = require('./core/postgresClient');
  try { createPostgresClient(); console.error('FAIL: should have thrown'); process.exit(1); }
  catch (e) { console.log('OK: threw as expected:', e.message); }
"
```

Expected: `OK: threw as expected: DATABASE_URL is not set in .env`

- [ ] **Step 3: Verify a real connection succeeds**

```bash
NODE_OPTIONS="" npx ts-node --transpile-only -e "
import { createPostgresClient } from './core/postgresClient';
async function test() {
  const client = createPostgresClient();
  await client.connect();
  const { rows } = await client.query('SELECT 1 AS ok');
  console.log('Connected:', rows[0].ok === 1 ? 'OK' : 'FAIL');
  await client.end();
}
test().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: `Connected: OK`

- [ ] **Step 4: Commit**

```bash
git add core/postgresClient.ts
git commit -m "feat: add createPostgresClient() utility for kv_curated writes"
```

---

## Task 2: Script skeleton — imports, types, env validation, config loading

**Files:**
- Create: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Create the file with imports, types, env validation, and config loading**

```typescript
// scripts/ingest_to_curated.ts
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Client } from "pg";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { loadSourcesConfig, sourceConfigToFetchConfig, SourceConfig } from "../core/configLoader";
import { genericPaginatedFetcher, GenericParsedListing, dedupeImageUrls } from "../core/genericFetcher";
import { fetchHtml, FetchResult } from "../core/fetchHtml";
import { fetchHeadless } from "../core/fetchHeadless";
import { parseLocation, getCurrency, getCountry } from "../core/locationMapper";
import { createPostgresClient } from "../core/postgresClient";
import { createGenericDetailPlugin } from "../core/detail/plugins/genericDetail";
import { getStrategyFactory, resetStrategyFactory } from "../core/detail/strategyFactory";
import { deriveProjectMetadata } from "../core/projectMetadata";

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
  description_html: null; // generic pipeline does not produce description_html
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

// ─── Property type extraction (mirrors ingestMarket.ts) ────────────────────

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
```

- [ ] **Step 2: Verify error paths**

```bash
# Missing MARKET_ID
NODE_OPTIONS="" npx ts-node --transpile-only scripts/ingest_to_curated.ts
```
Expected: `ERROR: MARKET_ID is required`

```bash
# Unknown SOURCE_ID
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_does_not_exist \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```
Expected: `Source 'cv_does_not_exist' not found in markets/cv/sources.yml`

```bash
# Valid source
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```
Expected: `Source config loaded: CCore Investments`

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): scaffold with env validation and config loading"
```

---

## Task 3: Fetch phase

**Files:**
- Modify: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Add fetch function and wire it into `main`**

Add this function before `main`:

```typescript
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
```

Replace `main` with:

```typescript
async function main(): Promise<void> {
  const { marketId, sourceId, dryRun } = loadEnv();
  const sourceConfig = loadSourceConfig(marketId, sourceId);

  console.log(`\n=== ingest_to_curated ===`);
  console.log(`market=${marketId}  source=${sourceId}  dry_run=${dryRun}\n`);

  const listings = await fetchListings(sourceConfig);
  console.log(`\nFetched: ${listings.length} listings`);

  if (dryRun) {
    console.log(`\n[DRY_RUN] First 3 listing ids:`);
    listings.slice(0, 3).forEach(l => console.log(`  ${l.id}  title="${l.title}"  price=${l.price}`));
    return;
  }

  console.log(`(enrich/write not yet wired)`);
}
```

- [ ] **Step 2: Verify fetch works with DRY_RUN=1**

```bash
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Expected output (approximate):
```
=== ingest_to_curated ===
market=cv  source=cv_ccoreinvestments  dry_run=true

[Fetch] Starting http fetch for cv_ccoreinvestments...
[Fetch] N listings from M pages (stop: empty_listings)

Fetched: N listings

[DRY_RUN] First 3 listing ids:
  ccore_... title="..." price=...
```

If N is 0, check the ccore-investments site is reachable and the selectors still match.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): add fetch phase via genericPaginatedFetcher"
```

---

## Task 4: Detail enrichment

**Files:**
- Modify: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Add `sleep` utility and `enrichListings` function before `fetchListings`**

```typescript
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

      // Merge description
      if (extractResult.description && extractResult.description.length >= 50) {
        if (!listing.description || extractResult.description.length > listing.description.length) {
          listing.description = extractResult.description;
        }
      }

      // Merge structured fields
      if (extractResult.bedrooms  !== undefined) listing.bedrooms  = extractResult.bedrooms;
      if (extractResult.bathrooms !== undefined) listing.bathrooms = extractResult.bathrooms;
      if (extractResult.areaSqm   !== undefined) listing.area_sqm  = extractResult.areaSqm;
      if (extractResult.amenities?.length)       listing.amenities = extractResult.amenities;

      // Merge images
      if (extractResult.imageUrls?.length) {
        listing.imageUrls = dedupeImageUrls([...listing.imageUrls, ...extractResult.imageUrls]);
      }

      // Merge location
      if (extractResult.location && !listing.location) {
        listing.location = extractResult.location;
      }

      // Update price if listing has none
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
```

- [ ] **Step 2: Wire enrichment into `main` (replace the stub return)**

Replace the `main` body to call `enrichListings` before printing DRY_RUN results:

```typescript
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
```

- [ ] **Step 3: Verify enrichment runs with DRY_RUN=1**

```bash
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Expected: each listing shows a non-zero `desc_len` and at least 1 image after enrichment.

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): add detail enrichment phase"
```

---

## Task 5: Location resolution + skip logic

**Files:**
- Modify: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Add location resolution function and market hooks loader before `main`**

```typescript
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
  // 1. location field
  const fromLoc = parseLocation(listing.location, marketId);
  if (fromLoc.island) return { island: fromLoc.island, city: fromLoc.city };

  // 2. title
  if (listing.title) {
    const fromTitle = parseLocation(listing.title, marketId);
    if (fromTitle.island) return { island: fromTitle.island, city: fromTitle.city };
  }

  // 3. description (first 500 chars)
  if (listing.description) {
    const fromDesc = parseLocation(listing.description.substring(0, 500), marketId);
    if (fromDesc.island) return { island: fromDesc.island, city: fromDesc.city };
  }

  // 4. market-specific hooks (CV island recovery)
  if (hooks) {
    const hookResult = hooks.resolveLocation({
      id: listing.id,
      sourceId: listing.sourceId,
      title: listing.title,
      description: listing.description,
      sourceUrl: listing.detailUrl ?? null,
      rawIsland: listing.location ?? null,
      rawCity: null,
    });
    if (hookResult?.island) return hookResult;
  }

  return {};
}
```

- [ ] **Step 2: Wire location resolution into `main` — add skip tracking and candidate row building**

Replace the `main` body:

```typescript
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
      ai_descriptions: null, // filled in Task 6
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

  if (dryRun) {
    console.log(`\n[DRY_RUN] First 3 rows:`);
    rows.slice(0, 3).forEach(r =>
      console.log(`  ${r.id}  island=${r.island}  price=${r.price}  images=${r.image_urls.length}`)
    );
    return;
  }

  console.log(`(AI descriptions + write not yet wired)`);
}
```

- [ ] **Step 3: Verify with DRY_RUN=1**

```bash
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Expected: each row shows `island=Sal` or `island=Boa Vista` etc. Zero or few skipped.

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): add location resolution and row skip logic"
```

---

## Task 6: Inline AI description generation

**Files:**
- Modify: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Add the AREI voice prompt constant and AI generation function before `main`**

The `AREI_VOICE_PROMPT` text is copied from `scripts/backfill_ai_descriptions.ts`. Do not import from that file.

```typescript
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

  // Primary: Claude Sonnet 4.6 with retries
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

  // Fallback: GPT-4o
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
```

- [ ] **Step 2: Wire AI generation into `main` — after rows are built, before the write**

In `main`, after the `rows` array is built and before the `dryRun` early return, add:

```typescript
  // AI descriptions (skip in DRY_RUN)
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
```

Keep the existing `if (dryRun) { ... return; }` block unchanged. The DRY_RUN path already returns before this new block.

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): add inline AI description generation"
```

---

## Task 7: kv_curated INSERT + ON CONFLICT upsert

**Files:**
- Modify: `scripts/ingest_to_curated.ts`

- [ ] **Step 1: Add the write function before `main`**

```typescript
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
        row.ai_descriptions              // $5  jsonb — pg serialises object automatically
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
        row.image_urls,                  // $17  text[] — pg serialises array automatically
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
```

- [ ] **Step 2: Wire write into `main` after AI generation block**

After the AI generation block, replace `console.log('(AI descriptions + write not yet wired)')` with:

```typescript
  await writeToKvCurated(rows);
```

The full `main` body is now:
1. `loadEnv` + `loadSourceConfig` + `loadLocationHooks`
2. `fetchListings`
3. `enrichListings`
4. Build `rows` array (location resolve + skip)
5. AI generation (skipped in DRY_RUN)
6. `if (dryRun) return`
7. `writeToKvCurated(rows)`

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest_to_curated.ts
git commit -m "feat(ingest_to_curated): add kv_curated INSERT with ON CONFLICT upsert"
```

---

## Task 8: Verification summary + npm script

**Files:**
- Modify: `scripts/ingest_to_curated.ts`
- Modify: `package.json`

- [ ] **Step 1: Add verification summary function before `main`**

```typescript
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
```

- [ ] **Step 2: Call `printSummary` at end of `main`**

After `writeToKvCurated(rows)`:

```typescript
  printSummary(listings.length, rows, skipped);
  console.log(`\nNext step: verify rows then run promotion SQL (see spec).`);
```

Also call it in the `dryRun` path so you see coverage without writing:

```typescript
  if (dryRun) {
    printSummary(listings.length, rows, skipped);
    console.log(`\n[DRY_RUN] No rows written.`);
    return;
  }
```

- [ ] **Step 3: Add npm script to `package.json`**

In `package.json`, add to the `"scripts"` object:

```json
"ingest:curated": "MARKET_ID=${MARKET_ID:?MARKET_ID required} SOURCE_ID=${SOURCE_ID:?SOURCE_ID required} NODE_OPTIONS='' npx ts-node --transpile-only scripts/ingest_to_curated.ts"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/ingest_to_curated.ts package.json
git commit -m "feat(ingest_to_curated): add verification summary and npm script"
```

---

## Task 9: End-to-end DRY_RUN test

**Files:** none (verification only)

- [ ] **Step 1: Run full DRY_RUN and review the summary**

```bash
NODE_OPTIONS="" DRY_RUN=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Expected output shape:
```
=== ingest_to_curated ===
market=cv  source=cv_ccoreinvestments  dry_run=true

[Fetch] Starting http fetch for cv_ccoreinvestments...
[Fetch] N listings from M pages (stop: empty_listings)

Fetched: N listings
[Enrich] Enriching N/N listings (policy: always)...
[Enrich] Complete: X enriched, 0 failed

Rows ready: N  Skipped: 0

=== kv_curated insert summary ===
Total fetched:     N
Inserted/updated:  N

By island:
  Boa Vista            X
  Sal                  Y
  ...

Field coverage:
  price          N/N (100%)
  bedrooms       X/N (...)
  bathrooms      X/N (...)
  images ≥1      N/N (100%)
  ai_description 0/N (0%)   ← expected 0 in DRY_RUN

[DRY_RUN] No rows written.
```

Check: `images ≥1` should be 100%. If `bedrooms` coverage is very low, the detail selectors may need tuning (out of scope here — that is a separate improvement).

- [ ] **Step 2: If total fetched is 0, diagnose**

```bash
# Check the ccore-investments site is reachable
curl -sI "https://www.ccoreinvestments.com/lista-propriedades?page=1" | head -5
```

Expected: `HTTP/2 200`. If not, the site may be down or the URL changed.

---

## Task 10: Live run + SQL verification

**Files:** none (execution + SQL)

- [ ] **Step 1: Run the live ingest**

```bash
NODE_OPTIONS="" MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Watch the `[AI]` lines — each should show `✓` or a clear fallback note. The summary prints at the end.

- [ ] **Step 2: Verify rows landed in kv_curated**

Connect to the database (Supabase Dashboard → SQL Editor, or psql with DATABASE_URL) and run:

```sql
-- Count by island
SELECT island, count(*)
FROM kv_curated.listings
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review'
GROUP BY island
ORDER BY island;
```

Expected: matches the summary printed by the script.

```sql
-- Spot-check sample rows
SELECT id, title, price, island, source_url_primary,
       image_urls[1] AS cover,
       (ai_descriptions->'en'->>'text') IS NOT NULL AS has_ai_desc
FROM kv_curated.listings
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review'
ORDER BY id
LIMIT 10;
```

Verify: `title` non-null, `price` present on most rows, `cover` is a real CDN URL, `has_ai_desc` true for listings with long descriptions.

- [ ] **Step 3: Promote to published when satisfied**

```sql
UPDATE kv_curated.listings
SET publish_status     = 'published',
    first_published_at = now()
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review';
```

- [ ] **Step 4: Verify live feed impact**

```sql
SELECT source_id, count(*)
FROM public.v1_feed_cv
GROUP BY source_id
ORDER BY source_id;
```

`cv_ccoreinvestments` should now appear in the results. Also check `https://kazaverde.com/listings`.

---

## Self-Review

**Spec coverage:**
- ✓ `core/postgresClient.ts` with `createPostgresClient()` — Task 1
- ✓ `scripts/ingest_to_curated.ts` generic (`MARKET_ID` + `SOURCE_ID`) — all tasks
- ✓ `genericPaginatedFetcher` fetch — Task 3
- ✓ `createGenericDetailPlugin` detail enrichment — Task 4
- ✓ `parseLocation` + CV hooks location resolution — Task 5
- ✓ Skip on null island / null title — Task 5
- ✓ AI descriptions inline (Claude Sonnet 4.6 + GPT-4o fallback, v1.2 prompt) — Task 6
- ✓ AI generation non-blocking (rows inserted without it if desc too short or generation fails) — Task 6
- ✓ `ON CONFLICT (id) DO UPDATE` — publish_status and first_seen_at never overwritten — Task 7
- ✓ ai_descriptions preserved on re-run (CASE WHEN NOT NULL) — Task 7
- ✓ Verification summary — Task 8
- ✓ npm script `ingest:curated` — Task 8
- ✓ Post-script promotion SQL — Task 10
- ✓ `DRY_RUN=1` end-to-end verification — Task 9
- ✓ Hard rules from `kazaverde-curated-feed-operations.md` honoured throughout
