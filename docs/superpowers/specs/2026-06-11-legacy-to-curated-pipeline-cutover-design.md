# Legacy → Curated pipeline cutover — design

**Status:** approved design, ready for implementation plan.
**Author:** Eloy, 2026-06-11.
**Scope:** retire the legacy CV ingest pipeline and replace it with a scheduled,
config-driven curated ingest writing `kv_curated.listings`. Swap **and** delete
legacy code (not a full admin cutover).

---

## Context: what is live today

The repo is in a documented "temporary split" (see
`docs/current-system-truth.md`, `docs/02-data-engine/kazaverde-curated-feed-operations.md`):

- **Legacy pipeline** — `core/preflightCv.ts` → `core/ingestCv.ts` →
  `core/reportCv.ts`, scheduled every 6h in `.github/workflows/cv-autopilot.yml`.
  Writes legacy `public.listings`.
- **The public feed no longer reads that.** `public.v1_feed_cv` now serves
  `published` rows from `kv_curated.listings` via
  `public.v1_feed_cv_curated_preview`. The legacy pipeline is therefore
  **running but disconnected** — it writes a table the live site stopped serving.
- **The curated ingest** — `npm run ingest:curated` →
  `scripts/ingest_to_curated.ts` → `core/pipeline/runMarketSource.ts`. Per-source
  (`MARKET_ID` + `SOURCE_ID`), writes `kv_curated.listings` with a status-gated
  upsert, removal/demotion detection (zero-row guarded), and AI descriptions
  (Anthropic + OpenAI). **It is not scheduled anywhere today** — `cv-autopilot.yml`
  only runs the legacy chain plus a `DRY_RUN` shadow of the generic
  `ingestMarket` path. The curated path is run manually today.
- **Still reading legacy `public.listings`:** at least `arei-admin`'s
  `agencyDataConsole` "Agency data" tab
  (`docs/operations/admin-kv-curated-migration.md`).

So this effort **automates the curated path for the first time** while retiring
legacy — it is not swapping one scheduled job for another.

## Curated upsert behavioral contract (verified in `runMarketSource.ts`)

- **New listings** insert as `publish_status = 'needs_review'` → require
  **manual promotion** to reach the live feed.
- **Existing `published` listings** are refreshed in place (price/photos update
  live) and keep `publish_status = 'published'`.
- **Vanished `published` listings** auto-demote to `removed` (guarded), dropping
  them from `public.v1_feed_cv`.

Consequence: **the scheduled job never auto-grows the public feed.** It refreshes
existing published inventory, queues new inventory for human promotion, and (with
guards) prunes disappeared listings.

## Resolved decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | Workflow swap **+ delete legacy code**. Admin → kv_curated migration stays separate. |
| 2 | Unattended demotion | **Auto-demote with guards** (zero-row guard + new fraction threshold). |
| 3 | Fan-out | **Capped-concurrency matrix, generated dynamically from config.** |
| 4 | Stranded `public.listings` reader | **Accept stale, flag loudly** + lightweight public-reader audit. |
| 5 | Cutover sequencing | **Parallel-run soak (~1 week), then delete.** |

---

## Design

### 1. Source discovery (scaling spine)

New script `scripts/list_ingest_sources.ts` reads `markets/*/sources.yml` and
emits a JSON array of `{ market, source }` for every source with
`lifecycleOverride: IN`. The GitHub Actions matrix is generated from this output.

- Adding a market/source becomes **config-only** — no workflow edits.
- Scales past CV's 10 active sources to the stubbed markets (zm, ug, bw, gh, ng,
  ke, za) and beyond.
- When GitHub Actions becomes the bottleneck (cron granularity, concurrency caps,
  cost), the same config-driven discovery transplants to a queue/worker model.

Active CV sources today (`lifecycleOverride: IN`): cv_terracaboverde,
cv_simplycapeverde, cv_ccoreinvestments, cv_homescasaverde, cv_capeverdeproperty24,
cv_cabohouseproperty, cv_estatecv, cv_oceanproperty24, cv_nhakaza, cv_remax.

### 2. New workflow `.github/workflows/curated-ingest.yml`

- `discover` job → runs the discovery script → exposes the matrix as a job output.
- `ingest` job → `strategy.matrix` from `discover`, `max-parallel: 3–4`,
  `fail-fast: false`. Each cell runs `npm run ingest:curated` with its
  `MARKET_ID` / `SOURCE_ID` (live, **not** `DRY_RUN`). Secrets: `DATABASE_URL`
  (pooler-backed), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
- `concurrency` group so scheduled runs never overlap themselves.
- `summary` job → aggregates per-source results (upserts, new `needs_review`,
  demotions, failures) into `GITHUB_STEP_SUMMARY`.
- **Cadence: start at 12–24h, not 6h.** New inventory needs manual promotion
  anyway, so there is no freshness urgency; the slower cadence halves AI cost and
  DB/API load. Easy knob to revisit.
- Triggers: `schedule` (cron) + `workflow_dispatch`.

### 3. Demotion guard (new code in `core/pipeline/runMarketSource.ts`)

Add a **fraction threshold** on top of the existing zero-row guard
(`shouldRunRemovalDetection`): if a source's
`removedCandidates / publishedCount` exceeds a threshold (default ~0.5,
optionally overridable per-source in `sources.yml` as `removalMaxFraction`),
**skip demotion for that source, leave the rows published, and log loudly** for
human review.

This is the front-line live-feed protection: it stops a partial-fetch breakage
(non-zero rows, so the zero-row guard does not trip) from wrongly stripping live
listings. Dry runs continue to only report candidates, never mutate.

### 4. Admin stale handling

- **Lightweight audit:** `grep` for `public.listings` / `from("listings")`
  readers across `arei-admin`, `kazaverde-web`, `supabase`, purely to confirm
  **no public-facing reader** depends on the soon-frozen table. A frozen internal
  admin tab is acceptable; a frozen public reader would be a production break and
  would change scope.
- **Stale banner/guard** on the Agency data tab (`agencyDataConsole` view):
  "data frozen as of `<date>`" so stale internal numbers are not trusted.
- Full admin → `kv_curated` migration (per
  `docs/operations/admin-kv-curated-migration.md`) remains a separate later
  effort.

### 5. Deletion (after soak passes)

Remove:

- `core/ingestCv.ts` (+ `core/ingestCv.ts.backup`, `core/ingestCv.ts.save`)
- `core/preflightCv.ts`, `core/preflightCvIngest.ts`
- `core/reportCv.ts`
- `core/ingestCvGeneric.ts`
- npm scripts `pipeline:cv`, `ingest:cv`, `report:cv`
- `.github/workflows/cv-autopilot.yml`

**Relocate, do not drop:** `cv-autopilot.yml` also runs a **translation backfill**
step (`scripts/backfill_ai_descriptions_for_language.ts`). That step must be
moved into the new workflow (or its own small workflow) so translations are not
silently lost. The `DRY_RUN` shadow steps (`preflightMarket` / `ingestMarket` /
`reportMarket`) are obsolete and get deleted. `preflightCv`'s IN-count fail-fast
is obsolete — source lifecycle is now config-driven in `sources.yml`.

Before deletion, grep the repo for any remaining importers of the deleted modules.

### 6. Verification & rollback

**Soak checks (during the parallel-run window):**

- per-source `last_verified_at` advancing in `kv_curated.listings`
- `public.v1_feed_cv` total + per-source counts stable (no unexplained drops)
- no unexpected mass demotions (the guard should have caught any)
- per-source success in the workflow summary

**Rollback honesty:** the parallel-run window protects the *ability to populate
inventory*, but legacy writes `public.listings`, which the live feed **no longer
reads**. "Legacy still running" therefore does **not** shield the live feed from a
misbehaving curated run. The real live-feed protections are:

1. the demotion fraction guard (§3),
2. manual promotion (new rows enter `needs_review`, never auto-publish),
3. the **workflow kill-switch** — disable `curated-ingest.yml` instantly,
4. `kv_curated` retaining `removed` rows for deliberate re-promotion.

The kill-switch + guard are the front-line safety; the soak is confidence-building.

## Public-reader audit (2026-06-11)

Grep across `arei-admin`, `kazaverde-web`, `packages`, `supabase`, `core`, `scripts`
for `public.listings` / `from("listings")` / `v1_feed` readers.

**STOP-gate result: GREEN — no public-facing reader of `public.listings`.** The
live public path is `kazaverde-web` → `packages/arei-sdk` → `public.v1_feed_cv`
(a view that now reads `kv_curated.listings`). `packages/arei-sdk` explicitly
forbids direct `public.listings` reads ("Never read `public.listings` directly —
always go through `v1_feed_*` views"). Freezing `public.listings` therefore does
not break the live site.

**Internal readers of `public.listings` (accept-stale; not blocking):**

- `arei-admin/agencyDataConsole.ts:136` — the Agency data tab. Gets the stale
  banner in Task 7.
- `arei-admin/data.ts:323,719,779` — the `loadFromSupabase` chain + `getListingById`;
  the chain is documented as functionally dead (see
  `docs/operations/admin-kv-curated-migration.md`).
- `core/supabaseWriter.ts:85,92` — the legacy **writer**, removed with the legacy
  chain in Task 9.
- Numerous `scripts/*` maintenance/backfill tools — manual, not scheduled; they
  operate on stale data after the freeze but are not a production path.

**Issue found — relocated translate step targets the wrong table.** The Task 5
`translate` job runs `scripts/backfill_ai_descriptions_for_language.ts`, which
reads/writes `public.listings` (`.from("listings")`) to translate the English AI
description into other languages (PT, …). But the curated ingest's
`generateAiDescription` writes **English only** (`Target language: en`) to
`kv_curated.listings`. So in the curated world this step translates the frozen
legacy table, and the live (`kv_curated`) feed never receives the non-English
translations from this workflow. The relocation was made assuming the step was
table-agnostic; it is not. **Decision required** (does not block the cutover, since
the live feed does not depend on this step): (a) rewrite the backfill to target
`kv_curated.listings`, (b) drop the translate job from the new workflow, or
(c) keep it as a known no-op-after-deletion follow-up. Tracked as an open item;
the `translate` job remains in the workflow but is flagged here.

## Out of scope

- Admin app full migration off `public.listings` (separate effort, documented in
  `docs/operations/admin-kv-curated-migration.md`).
- `kazaverde-web` / public-facing reader changes (audit only, to confirm none are
  stranded).
- Schema changes to `kv_curated.listings`.
- Generic multi-market frontend contract.

## Files to trust

- `core/pipeline/runMarketSource.ts` (curated ingest orchestrator)
- `scripts/ingest_to_curated.ts` (CLI entry)
- `markets/cv/sources.yml` (source config)
- `.github/workflows/cv-autopilot.yml` (legacy chain being retired)
- `docs/current-system-truth.md`
- `docs/02-data-engine/kazaverde-curated-feed-operations.md`
- `docs/operations/admin-kv-curated-migration.md`
