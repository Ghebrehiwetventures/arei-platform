# Cape Verde Data Architecture

Last updated: 2026-05-11

This document describes the current AREI/KazaVerde Cape Verde data system as it exists in the repo today. It is intentionally descriptive, not aspirational.

The key operating fact is that live website truth and pipeline/source-health truth are currently different layers.

## 1. Data Layers

### Raw ingest

Raw scraper output is written to `public.listings`.

Current writer path:
- `.github/workflows/cv-autopilot.yml` runs `core/preflightCv.ts`, `core/ingestCv.ts`, and `core/reportCv.ts`.
- `core/ingestCv.ts` calls `upsertListings()`.
- `core/supabaseWriter.ts` writes with `supabase.from("listings").upsert(...)`.

This layer is useful for pipeline debugging, parser quality, raw source coverage, freshness, missing fields, and ingestion health.

It is not currently the direct live website source for KazaVerde.

### Staging / curated / middle layer

Curated publish data lives in `kv_curated.listings`.

Current curated layer path:
- `migrations/028_kv_curated_preview_schema.sql` creates `kv_curated.listings`.
- `migrations/028_kv_curated_preview_schema.sql` also creates `public.v1_feed_cv_curated_preview`.
- `migrations/030_v1_feed_cv_curated_preview_contract_compat.sql` recreates `public.v1_feed_cv_curated_preview` with public-feed-compatible column types.

This layer exists because the old ingest/public-feed path contained stale or unsafe inventory. Curated rows with `publish_status = 'published'` can affect the live website through the public feed wrapper.

### Published public feed

The canonical live website feed is `public.v1_feed_cv`.

Current live path:
- `public.v1_feed_cv` reads from `public.v1_feed_cv_curated_preview`.
- `public.v1_feed_cv_curated_preview` reads published rows from `kv_curated.listings`.

This is the current source of truth for what KazaVerde users can see publicly.

### Admin / source health

AREI Admin currently measures source and pipeline health mostly through `get_source_quality_stats()`.

`get_source_quality_stats()`:
- groups raw rows from `public.listings`
- joins feed counts from `public.v1_feed_cv`
- returns counts used by Admin dashboard/source health

Therefore Admin Source Health is pipeline/source health unless a metric explicitly reads from `public.v1_feed_cv`.

Live Feed Health should mean `public.v1_feed_cv` / curated published inventory.

### Snapshots / history

Daily source health snapshots are written to `source_health_snapshots`.

Current snapshot path:
- `.github/workflows/source-health-snapshot.yml`
- `scripts/snapshot_source_health.ts`
- RPC: `get_source_quality_stats()`
- table: `source_health_snapshots`

Snapshots are useful for tracking pipeline/source-health trends over time. They are not a pure history of live public feed inventory.

## 2. Supabase Objects

| Object | Purpose | Writer | Reader | Live-facing? | Layer | Admin uses it? | Website uses it? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `public.listings` | Raw normalized ingest table for scraper output and pipeline analysis. | `core/supabaseWriter.ts` via `upsertListings()`; backfill/maintenance scripts also touch it. | Admin listing browser; `get_source_quality_stats()`; many ops scripts. | No, not directly for current KazaVerde public site. | raw ingest | Yes. `arei-admin/data.ts` reads it directly for listings and indirectly through RPC. | No direct website use in current SDK path. |
| `kv_curated.listings` | Curated publish table for the temporary live KazaVerde feed model. | Manual/ops SQL and curated tooling, not Supabase REST/JS day-to-day. | `public.v1_feed_cv_curated_preview`. | Yes, upstream of live feed. | staging/middle layer | Not currently by Admin UI. | Indirectly through `v1_feed_cv`. |
| `public.v1_feed_cv_curated_preview` | Public-compatible preview/wrapper over published curated rows. | Defined by migrations `028` and `030`. | `public.v1_feed_cv`. | Yes, indirectly. | staging/middle layer | Not generally, except if queried manually. | Indirectly through `v1_feed_cv`. |
| `public.v1_feed_cv` | Canonical public Cape Verde feed contract. | Defined historically by `009`/`026`; currently repointed by `029` to curated preview. | `packages/arei-sdk/src/client.ts`; prerender/sitemap; landing stats; feed counts in RPC. | Yes. | published/live | Partly: `get_source_quality_stats()` uses it for `public_feed_count`; content candidates can fall back to it. | Yes. This is the website feed. |
| `get_source_quality_stats()` | Source quality RPC used for Admin dashboard/source health and snapshots. | SQL in `docs/supabase_rpc.sql`; security hardening in `migrations/028_supabase_security_advisor_cleanup.sql`. | `arei-admin/data.ts`; `scripts/snapshot_source_health.ts`; verification/setup scripts. | Partly. It includes `public_feed_count`, but base metrics are raw `listings`. | raw ingest / mixed | Yes. Primary source-health path. | No. |
| `source_health_snapshots` | Daily stored output from `get_source_quality_stats()`. | `scripts/snapshot_source_health.ts` via service role. | Future/admin trend views and ops analysis. | No. | snapshots/history | Intended for Admin/source-health trend use. | No. |
| `public.v1_feed_cv_indexable` | Older/indexable feed view referenced by Admin content candidate generation and security docs. | Existing DB object if present; not defined as the current canonical live feed in the latest cutover docs. | `arei-admin/data.ts` tries it before `v1_feed_cv` for content candidates. | Unclear/currently secondary. | unclear/legacy | Yes, only content draft candidates. | No current SDK use. |
| `public.v1_feed_cv_pre_terra_cohort_rollback_20260401` | Historical wrapper view from migration `026`, used before the curated cutover. | Migration `026`. | Historical/legacy view chain. | No longer the live upstream after migration `029`. | legacy | No direct current Admin dependency found. | No current website dependency found. |
| `v1_public_feed` | Not found as a current repo object or consumer path during audit. | None found. | None found. | No. | not used | No. | No. |

## 3. What The Live Website Uses

The consumer website uses `kazaverde-web/src/lib/arei.ts`, which creates an `AREIClient` from `packages/arei-sdk`.

The SDK is hardcoded to:

```ts
const VIEW = "v1_feed_cv";
```

Relevant files and paths:

- Listing index: `kazaverde-web/src/pages/Listings.tsx` calls `arei.getListings(...)`, which maps to `AREIClient.getListings()` and queries `public.v1_feed_cv`.
- Listing detail: `kazaverde-web/src/pages/Detail.tsx` calls `arei.getListing(id)`, which maps to `AREIClient.getListing()` and queries `public.v1_feed_cv`.
- Island pages: `kazaverde-web/src/pages/IslandLanding.tsx` calls `arei.getListings({ island })`, which queries `public.v1_feed_cv`.
- Market stats: `kazaverde-web/src/pages/Market.tsx` calls `arei.getMarketStats()`, `arei.getIslandOptions()`, and `arei.getListings()`, all through `public.v1_feed_cv`.
- Prerender/sitemap: `kazaverde-web/scripts/prerender-phase1.mjs` creates `AREIClient` and calls `getListings()` / `getListing()`, which use `public.v1_feed_cv`.
- AREI landing stats: `arei-landing/index.html` uses `LIVE_STATS_CONFIG.view = 'v1_feed_cv'`.

Because `public.v1_feed_cv` now reads from `public.v1_feed_cv_curated_preview`, and that preview reads from `kv_curated.listings`, the live website currently uses curated published inventory through a compatibility wrapper.

## 4. What Admin Actually Measures

### Dashboard

`arei-admin/app.tsx` loads dashboard stats through `getDashboardStats()`.

`arei-admin/data.ts` implements `getDashboardStats()` by calling:

```ts
supabase.rpc("get_source_quality_stats")
```

The RPC is defined in `docs/supabase_rpc.sql`.

The RPC:
- counts raw rows from `public.listings`
- counts approved rows from `public.listings`
- counts missing image/price/sqm/beds/baths quality fields from `public.listings`
- counts trust/indexable fields from `public.listings`
- joins `public_feed_count` from `public.v1_feed_cv`

So Dashboard metrics are mixed, but mostly pipeline/raw-source health.

### Source Health

Source Health is pipeline/source health unless explicitly reading from `public.v1_feed_cv`.

The grade logic in `arei-admin/sourceHealthGrade.ts` uses fields returned by `get_source_quality_stats()`, including raw listing counts and `public_feed_count`.

This is useful, but it should not be interpreted as the same thing as live website health.

### Admin listing browser

The Admin listing browser reads directly from `public.listings`.

Relevant code:
- `arei-admin/data.ts` `getListings()` uses `supabase.from("listings")`.
- `arei-admin/data.ts` `getListingById()` uses `supabase.from("listings")`.

This means the Admin listing browser is showing raw/pipeline inventory, not the curated live website inventory.

### Snapshots

The snapshot workflow uses the same source-health model as Admin:

- `.github/workflows/source-health-snapshot.yml`
- `scripts/snapshot_source_health.ts`
- `supabase.rpc("get_source_quality_stats")`
- writes to `source_health_snapshots`

Snapshots are pipeline/source-health history. They are not pure live-feed history.

## 5. Correct Source Of Truth By Question

| Question | Correct source | Wrong source to avoid |
| --- | --- | --- |
| What does the user see live? | `public.v1_feed_cv` | `public.listings`, `get_source_quality_stats()` totals |
| How many published listings are live? | `select count(*) from public.v1_feed_cv` | Raw approved count from `public.listings` |
| Which listings power listing index/detail/island pages? | `public.v1_feed_cv` through `packages/arei-sdk/src/client.ts` | Admin listing browser results |
| What curated table controls live KazaVerde inventory? | `kv_curated.listings` where rows flow through `public.v1_feed_cv_curated_preview` into `public.v1_feed_cv` | Raw `public.listings` |
| How many raw listings did we ingest? | `public.listings` | `public.v1_feed_cv` |
| Which source has bad parser quality? | `public.listings` plus `get_source_quality_stats()` and ingest reports | `public.v1_feed_cv` alone |
| Which source has low image coverage in the pipeline? | `get_source_quality_stats()` / `public.listings` | Live feed count alone |
| Which listings should be indexed by Google today? | `public.v1_feed_cv` and sitemap/prerender output | Raw `public.listings` |
| Which listings are safe to show publicly? | Currently `public.v1_feed_cv`; upstream curated rows in `kv_curated.listings` with `publish_status = 'published'` | Raw `approved = true` rows from `public.listings` |
| Which listings need review? | Curated unpublished rows in `kv_curated.listings` plus any future review workflow; raw pipeline issues from `public.listings` are separate | Assuming all `approved = false` raw rows equal curated review queue |
| What should Pulse read in the future? | Separate `live_public_feed_snapshot` from `public.v1_feed_cv` and `pipeline_source_health_snapshot` from `get_source_quality_stats()` | A single mixed summary that treats raw pipeline data as live product truth |
| What should trend graphs use for live inventory history? | A future live-feed snapshot based on `public.v1_feed_cv` | `source_health_snapshots` if the chart claims to show live published inventory |
| What should trend graphs use for pipeline/source quality history? | `source_health_snapshots` | `public.v1_feed_cv` alone |

## 6. Current Risk

Admin Source Health is useful, but it does not equal live website health.

Snapshots are useful, but they track pipeline/source health, not pure live feed history.

Any AI briefing, trend report, dashboard metric, or operating memo must label live public feed separately from pipeline health.

If these layers are not labeled correctly, AREI can make product decisions from the wrong data. For example:

- treating raw `public.listings` problems as visible website problems
- assuming live curated inventory is stale because raw scraper rows are stale
- assuming public feed coverage is healthy because raw approved count is high
- asking Pulse or any AI layer to summarize source health without distinguishing live feed truth from pipeline truth

The current split is intentional and temporary, but it must be visible in product and ops language.

## 7. Recommended Next Product / Ops Step

Do not continue Pulse, trend graphs, or Admin feature work until the data layers are labeled clearly.

Recommended smallest next step:

1. Add a Live Feed Health section/card in Admin based only on `public.v1_feed_cv`.
2. Keep Source Health, but label it as Pipeline Health or Source Pipeline Health.
3. Keep snapshots, but label them as pipeline/source-health snapshots.
4. Add short comments in relevant data access files:
   - `packages/arei-sdk/src/client.ts`: live website reads `public.v1_feed_cv`.
   - `arei-admin/data.ts`: Admin listing browser reads raw `public.listings`.
   - `docs/supabase_rpc.sql`: `get_source_quality_stats()` is mixed and mostly raw pipeline health.
5. For any future Pulse implementation, build separate context sections:
   - `live_public_feed_snapshot` from `public.v1_feed_cv`
   - `pipeline_source_health_snapshot` from `get_source_quality_stats()`

Do not collapse those into one generic "admin data" summary.

