# Current System Truth

This file says what is actually true today.

It is not a strategy doc.
It is not a target architecture doc.
It is the shortest honest map of what is real in this repo right now.

## What actually runs today

- Root admin dev starts `arei-admin/` from `package.json`.
- Root KazaVerde dev starts `kazaverde-web/` from `package.json`.
- **Scheduled curated ingest** (since 2026-06-11): `.github/workflows/curated-ingest.yml`
  runs at 03:00 and 15:00 UTC. A discover job reads `markets/*/sources.yml` via
  `scripts/list_ingest_sources.ts` and fans out one job per `lifecycleOverride: IN`
  source (cv market only by default), each running
  `scripts/ingest_to_curated.ts` → `core/pipeline/runMarketSource.ts`, writing
  **live** to `kv_curated.listings` (new rows as `needs_review`; guarded removal
  detection on published rows). **This is the only scheduled ingest.**
- The legacy CV chain (`core/preflightCv.ts` → `core/ingestCv.ts` →
  `core/reportCv.ts`, `.github/workflows/cv-autopilot.yml`) **no longer runs**:
  the workflow was disabled (`disabled_manually`) on 2026-06-11. Its code is
  still in the repo, pending deletion (cutover plan Task 9, after 2–3 clean
  scheduled curated runs — see
  `docs/superpowers/specs/2026-06-11-legacy-to-curated-pipeline-cutover-design.md`).
  Do not build on it.
- Consequence: **`public.listings` is frozen as of 2026-06-11.** Nothing writes
  it anymore. Internal readers (admin Agency data tab, various `scripts/*`)
  see historical data; the live feed never read it.
- `.github/workflows/tests.yml` runs `npm test` + typecheck on PRs and main.

Trust these files first:
- `package.json`
- `.github/workflows/curated-ingest.yml`

## What is canonical today

### Frontend truth for KazaVerde

For the live KazaVerde consumer app, the canonical read path today is:

- `migrations/009_canonical_v1_feed_cv.sql`
- `packages/arei-sdk/src/client.ts`
- `kazaverde-web/src/lib/arei.ts`

Practical truth:
- `kazaverde-web/` reads through `packages/arei-sdk/`
- `packages/arei-sdk/src/client.ts` defaults to `v1_feed_cv`
- `public.v1_feed_cv` is still the canonical frontend contract
- as of 2026-05-08, that contract now reads from the curated publish layer upstream
- this is canonical for the current public consumer app
- this is not yet a generic multi-market frontend contract

### Governance and stated constraints

The main documentation-level truth lives in:

- `docs/GOVERNANCE.md`
- `docs/04-platform/tooling-handoff.md`

Practical truth:
- these docs are the right place to understand stated rules
- implementation does not fully match them yet

## What exists but is not the main production path

### Curated publish layer

`kv_curated.listings` is now the live upstream source for the public KazaVerde feed.

Treat it as:
- real: yes
- production-serving: yes, via `public.v1_feed_cv_curated_preview` and `public.v1_feed_cv`
- private schema: yes
- writable through Supabase REST/JS: no

Check:
- `migrations/028_kv_curated_preview_schema.sql`
- `migrations/029_switch_v1_feed_cv_to_curated.sql`
- `migrations/030_v1_feed_cv_curated_preview_contract_compat.sql`
- `docs/02-data-engine/kazaverde-curated-feed-operations.md`

Important truth:
- the curated path is the ONLY scheduled production ingest
  (`.github/workflows/curated-ingest.yml`, since 2026-06-11)
- the legacy CV pipeline is disabled (2026-06-11) and `public.listings` is
  frozen; legacy code remains in the repo only until cutover Task 9 deletes it
- the live public feed never read the legacy path after 2026-05-08

### Generic ingest path

`core/ingestMarket.ts` is real code.
It is not the root or scheduled production ingest path today.

Treat it as:
- real: yes
- active development: likely yes
- canonical production path today: no

Check:
- `core/ingestMarket.ts`
- `package.json`
- `.github/workflows/cv-autopilot.yml`

### Generic fetch/config infrastructure

These are real and matter:
- `core/genericFetcher.ts`
- `core/configLoader.ts`
- `markets/`

Do not overread them.
They do not prove that production ingest is already generic.

## What is misleadingly named or positioned

### `packages/arei-sdk/`

This package is useful and active.
It is also misleading by name if read casually.

Why:
- it sounds like a generic shared AREI query layer
- today it is hardcoded to `v1_feed_cv`

### `arei-admin/`

This is an active internal app.
It is not a clean system of record.

Why:
- `arei-admin/data.ts` prefers live Supabase reads
- then falls back to report JSON
- then falls back to mock data

### `core/`

`core/` contains both active pipeline code and ambiguous lineage.

Treat these with caution:
- `core/ingestCv.ts.backup`
- `core/ingestCv.ts.save`
- `core/ingestCvGeneric.ts`

Do not assume they are current just because they live next to active files.

## What a new engineer should trust first

Read these first if you want to know what is real:

1. `package.json`
2. `.github/workflows/cv-autopilot.yml`
3. `migrations/009_canonical_v1_feed_cv.sql`
4. `kazaverde-web/src/lib/arei.ts`
5. `packages/arei-sdk/src/client.ts`
6. `core/ingestCv.ts`
7. `arei-admin/data.ts`

Why:
- they show what actually runs
- they show what the frontend actually reads
- they show where admin truth is being reconstructed

## What a new engineer should treat with caution

- `core/ingestMarket.ts`
  - real, but not the main production path today
- `packages/arei-sdk/`
  - active, but not generic in practice
- `arei-admin/data.ts`
  - active, but not a canonical source of truth
- backup and transitional ingest files in `core/`
  - present, but ambiguous

## Bottom line

Today’s repo truth is:

- the scheduled production ingest is the curated per-source path
  (`curated-ingest.yml` → `runMarketSource.ts` → `kv_curated.listings`),
  config-driven from `markets/*/sources.yml`
- the legacy CV-specific chain is disabled (2026-06-11); its code awaits
  deletion (Task 9) and `public.listings` is frozen
- the real frontend contract is still `v1_feed_cv`, serving curated
  `kv_curated` inventory upstream
- the admin is useful, but it reconstructs truth from mixed sources; its
  Agency data tab reads soon-frozen `public.listings` and carries a stale-data
  banner
- `core/ingestMarket.ts` (the other generic path) remains shadow-only, not a
  production path
