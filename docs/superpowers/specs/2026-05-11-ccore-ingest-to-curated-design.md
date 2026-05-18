# Design: CCore Investments → kv_curated Direct Ingest

Date: 2026-05-11

## Context

The live KazaVerde feed (`public.v1_feed_cv`) reads exclusively from `kv_curated.listings`.
The generic ingest pipeline (`ingestMarket.ts`) writes to `public.listings` — a legacy path
that is currently decoupled from the public feed.

`cv_ccoreinvestments` is fully configured in `markets/cv/sources.yml` (HTTP, CasafariCRM/Proppy,
`?page=N` pagination, detail extraction enabled) but has never been promoted to the curated layer.

This spec describes a new script that runs the generic fetch+enrich pipeline for a single source
and writes directly into `kv_curated.listings`, bypassing `public.listings` entirely.

## Goal

Get `cv_ccoreinvestments` listings visible on kazaverde.com by inserting them into
`kv_curated.listings` as `needs_review`, then promoting to `published` after manual verification.

## Scope

Two new files:

- `core/postgresClient.ts` — shared `createPostgresClient()` utility
- `scripts/ingest_to_curated.ts` — the ingest script

The script is generic: it accepts any `MARKET_ID` + `SOURCE_ID`, not just ccore.
`ingestMarket.ts` is not modified.

## Architecture

```
env: MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments
         │
         ▼
  load sources.yml → find source config
         │
         ▼
  genericPaginatedFetcher  (HTTP, ?page=N)
         │
         ▼
  createGenericDetailPlugin  (description, images, specs)
         │
         ▼
  resolveListingLocation  (parseLocation fallback chain)
         │
  skip if island = null OR title = null
         │
         ▼
  generate AI description  (if description length > 500)
  primary: Claude Sonnet 4.6  fallback: GPT-4o
         │
         ▼
  createPostgresClient() + DATABASE_URL
         │
  INSERT INTO kv_curated.listings  ON CONFLICT (id) DO UPDATE
  publish_status = 'needs_review'
         │
         ▼
  print verification summary
```

## Files

### `core/postgresClient.ts`

Exports `createPostgresClient()` using `pg.Client` + `DATABASE_URL` from `.env`.

Required by the curated feed ops doc — `kv_curated` writes must not go through
Supabase REST or Supabase JS.

```typescript
export function createPostgresClient(): Client {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return new Client({ connectionString: url });
}
```

### `scripts/ingest_to_curated.ts`

**Environment variables:**

| Var | Required | Description |
|-----|----------|-------------|
| `MARKET_ID` | yes | e.g. `cv` |
| `SOURCE_ID` | yes | e.g. `cv_ccoreinvestments` |
| `DRY_RUN` | no | `1` = print rows, skip DB write |
| `ANTHROPIC_API_KEY` | yes (unless DRY_RUN) | Claude Sonnet 4.6 |
| `OPENAI_API_KEY` | yes (unless DRY_RUN) | GPT-4o fallback |
| `DATABASE_URL` | yes | Pooler-backed postgres connection |

**Run:**

```bash
MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

## Schema mapping (verified against live schema 2026-05-11)

All 20 mapped fields are type-correct. Live schema confirmed via
`scripts/inspect_kv_curated_schema.ts`.

| kv_curated column | Source | NOT NULL |
|---|---|---|
| `id` | listing id | yes — skip if missing |
| `title` | listing title | yes — skip if null |
| `description` | listing description | — |
| `description_html` | listing description_html | — |
| `ai_descriptions` | generated inline (see below) | — |
| `price` | listing price | — |
| `currency` | `getCurrency(marketId)` | — |
| `price_period` | hardcoded `sale` | default |
| `country` | `getCountry(marketId)` | default |
| `island` | location resolver | yes — skip if null |
| `city` | location resolver | — |
| `bedrooms` | detail enrichment | — |
| `bathrooms` | detail enrichment | — |
| `property_size_sqm` | detail enrichment | — |
| `land_area_sqm` | detail enrichment (land only) | — |
| `property_type` | `extractPropertyType()` | — |
| `image_urls` | listing imageUrls | default `{}` |
| `source_id_primary` | `SOURCE_ID` env var | yes |
| `source_url_primary` | listing detailUrl | — |
| `first_seen_at` | `now()` on first insert | yes |
| `publish_status` | `needs_review` | default |
| `seeded_from_raw_listing_id` | listing id (traceability) | — |

`created_at` and `updated_at` are omitted — both have `now()` defaults.

## AI description generation

Runs inline, per-listing, before INSERT.

- **Condition:** description is present and `length > 500` chars (same threshold as backfill)
- **Primary:** Claude Sonnet 4.6 with AREI voice prompt (same prompt text as `backfill_ai_descriptions.ts`)
- **Fallback:** GPT-4o on rate-limit / 5xx errors (same retry logic)
- **Idempotency:** on conflict update, preserve existing `ai_descriptions` if already set (don't overwrite)
- **Shape:** `{ en: { text, generated_at, prompt_version: "v1.2", model, validated: false } }`
- **If description too short or generation fails:** insert row without `ai_descriptions` (non-blocking)

The existing `backfill_ai_descriptions.ts` reads from `public.listings` and will never
see rows inserted directly into `kv_curated`, so inline generation is required here.

## Row skip conditions

A listing is silently skipped (logged) if:
- `id` is missing
- `title` is null or empty
- `island` cannot be resolved (location resolver returns null for all fallbacks)

All skipped rows are printed at the end with the reason.

## Upsert behaviour

The upsert is **status-gated**: it only modifies rows where the existing
`publish_status='needs_review'`. Already-published rows are immutable from
the pipeline — a re-run is a no-op for them.

```sql
INSERT INTO kv_curated.listings (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  description_html = EXCLUDED.description_html,
  price = EXCLUDED.price,
  -- ... all fields except publish_status, first_seen_at, first_published_at
  -- publish_status is NOT overwritten (preserve manual promotions)
  -- first_seen_at is NOT overwritten (preserve original timestamp)
  updated_at = now()
WHERE kv_curated.listings.publish_status = 'needs_review'
```

- `publish_status`, `first_published_at` are never overwritten by a re-run.
- `first_seen_at` is set only on first insert.
- The WHERE clause makes the upsert a no-op when the existing row is already
  `published`. Production content is protected from accidental pipeline overwrites.

Before AI generation and write, the script pre-fetches `publish_status` for all
candidate ids and filters out the already-published ones. This:

- avoids wasting Anthropic / OpenAI credits on rows that won't be written
- makes the summary output reflect what the run actually did

The WHERE clause on the upsert itself is the postgres-level guarantee
(defense-in-depth against a row being promoted between pre-fetch and write).

### Re-enriching a published listing

To bring a promoted listing back into the pipeline's scope, demote it
explicitly:

```sql
UPDATE kv_curated.listings
SET publish_status = 'needs_review'
WHERE id = '...';
```

Then re-run the ingest. The row will be picked up, re-enriched, and
re-promoted manually when satisfied. The friction is intentional: editing a
`published` row is a production change and should require a conscious step.

## Verification output

After all inserts the script prints:

```
=== kv_curated insert summary ===
Total fetched:    42
Skipped (no island):  2
Skipped (no title):   0
Inserted/updated: 40

By island:
  Sal          28
  Boa Vista    10
  Santiago      2

Field coverage:
  price          38/40 (95%)
  bedrooms       35/40 (87%)
  bathrooms      30/40 (75%)
  images ≥1      40/40 (100%)
  ai_description 36/40 (90%)
```

## Post-script promotion (manual SQL)

Run these after reviewing the verification output and spot-checking rows:

```sql
-- 1. Count by island
SELECT island, count(*)
FROM kv_curated.listings
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review'
GROUP BY island;

-- 2. Spot-check sample
SELECT id, title, price, island, image_urls[1], source_url_primary
FROM kv_curated.listings
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review'
LIMIT 10;

-- 3. Promote to published
UPDATE kv_curated.listings
SET publish_status    = 'published',
    first_published_at = now()
WHERE source_id_primary = 'cv_ccoreinvestments'
  AND publish_status = 'needs_review';

-- 4. Verify live feed impact
SELECT source_id, count(*)
FROM public.v1_feed_cv
GROUP BY source_id
ORDER BY source_id;
```

## Hard rules (from kazaverde-curated-feed-operations.md)

- Use `createPostgresClient()` + `DATABASE_URL` — never Supabase REST/JS for kv_curated
- Insert as `needs_review` first, never directly as `published`
- Do not modify `public.v1_feed_cv` or `public.v1_feed_cv_curated_preview`
- Verify counts and spot-check rows before promoting
- Promotion is a production change — treat it as such
