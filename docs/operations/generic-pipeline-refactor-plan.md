# Generic Pipeline Refactor Plan

Version 1.0 | 2026-05-25

Companion to:
- `docs/operations/adding-a-source.md` — current workflow for adding a source
- `docs/operations/engine-config-reference.md` — every `sources.yml` option
- `docs/operations/execution-protocol.md` — repo-wide execution rules
- `docs/superpowers/specs/2026-05-11-ccore-ingest-to-curated-design.md` — original kv_curated ingest design

This document captures the state of the generic ingest pipeline as of
2026-05-25, the problems found in a thorough code review, and the plan to
converge on a single, modular, scalable architecture.

The motivating constraint is in project memory: **extend the engine, don't
write source-specific plugins; scalability is paramount.** Adding a new
source (or a new market) should be a YAML change, never a TS change.

---

## 1. Current state (2026-05-25)

### 1.1 Two parallel pipelines

The pipeline today runs through **two parallel orchestrators** sitting on top
of the same engine. Both fetch, both enrich, both can produce writes — but
only one is canonical.

| Path | Entry | Writes to | Status |
|---|---|---|---|
| **A. Market ingest** | `core/ingestMarket.ts` (949 lines) | `public.listings` via Supabase JS | Legacy / report path; still has a live writer |
| **B. Curated ingest** | `scripts/ingest_to_curated.ts` (763 lines) | `kv_curated.listings` via postgres pooler | Canonical — described in `adding-a-source.md` |

Shared engine, exercised by both:

- `core/genericFetcher.ts` (2121 lines) — fetch + paginate + parse list pages
- `core/detail/plugins/genericDetail.ts` — config-driven detail extraction
- `core/configLoader.ts` — `sources.yml` → typed config
- `core/locationMapper.ts` — `locations.yml`-driven location resolution
- `core/preflightMarket.ts` — IN/OBSERVE/DROP lifecycle gate

### 1.2 Sources currently live (CV market)

Verified against `v1_feed_cv_dev` on 2026-05-25:

```
cv_terracaboverde      31 listings
cv_simplycapeverde     57
cv_ccoreinvestments    91
cv_homescasaverde      53
cv_capeverdeproperty24 36
cv_cabohouseproperty    5
cv_estatecv           150
cv_oceanproperty24      7
cv_remax               39
cv_nhakaza              0   ← marked IN, never produced rows
```

DROP sources (`cv_capeverdepropertyuk`, `cv_rightmove`, `cv_globallistings`,
`cv_properstar`, `cv_greenacres`) are correctly absent. Only
`cv_capeverdepropertyuk` has a documented reason (Cloudflare); the other four
are undocumented DROPs.

### 1.3 What works well (preserve)

1. **YAML schema is mature.** 11 different source shapes work today —
   HTML list pages, JSON APIs (Azure Search), AJAX POST loaders, click-next
   headless, CVE escudo currency. The config bet is paying off.
2. **`genericFetcher.ts` pagination support is broad.** `query_param`,
   `offset`, `path_segment`, `ajax_post`, `json_api`, `click_next`, plus
   auto-detect scaffolding.
3. **`mapJsonItem` (json_api path).** Maps any REMAX market with a YAML
   clone — same pattern works for OData / Elastic / generic REST.
4. **`genericDetail.ts` covers most extraction needs config-only** —
   3-style price parsing, chrome/logo image filtering, `spec_patterns`,
   `amenity_keywords`, `specs_selector` scoping.
5. **kv_curated path has real safety**: status-gated upsert, AI-gate,
   regression guard for failed detail enrichment.
6. **Auto-pause via `sourceHealth`** works on path A.

---

## 2. Problems (in order of severity)

### 2.1 🔴 Two write paths — only one is canonical

Path A writes to `public.listings` with `status:"observe"`,
`approved:bool`. Path B writes to `kv_curated.listings` with
`publish_status:"needs_review"`. The runbook only describes B. Both run the
engine in parallel and can drift in extraction behavior (different enrichment
loop, different mapping). Maintaining both is the single biggest source of
divergence risk.

### 2.2 🔴 Source-specific detail plugins still active

Three CV sources do **not** use `genericDetail.ts` at all. Each has its own
hand-coded extractor:

- `core/detail/plugins/simplyCapeVerde.ts` (555 lines)
- `core/detail/plugins/terraCaboVerde.ts` (522 lines)
- `core/detail/plugins/homesCasaVerde.ts` (268 lines)

Re-exported from `markets/cv/plugins/*.ts` and auto-registered via
`loadMarketPlugins(marketId)`. The factory **prefers** these over the generic
plugin, so every engine improvement to detail extraction silently skips
these three sources.

This violates the project's "generic-first" rule directly. It is the #1
scalability blocker.

### 2.3 🟡 Legacy CV-specific ingest still in tree

- `core/ingestCv.ts` (1411 lines)
- `core/ingestCv.ts.backup`, `core/ingestCv.ts.save`
- `core/ingestCvGeneric.ts` (824 lines — intermediate fork)
- `core/parseSimplyCapeVerde.ts`, `core/parseTerraCaboVerde.ts`
- `core/preflightCv.ts`, `core/reportCv.ts`

`package.json`'s `ingest:cv` script still points at the legacy file. Anyone
running `npm run pipeline:cv` is on the OLD path, not the generic one.

### 2.4 🟡 Stub sources leak into production output

`generateStubListings` runs unconditionally inside `runMarketIngest`.
`cv_source_1` / `cv_source_2` emit fake "Test Property in CV" rows that flow
into the Supabase upsert and the JSON report. Test scaffolding in the live
path.

### 2.5 🟡 Duplicate orchestration logic between A and B

Both files re-implement: `extractPropertyType`, `LAND_TYPES`,
`loadLocationHooks`, the location fallback chain, the detail-enrichment loop,
the fetch wrapper. They have **already drifted** — A calls
`deriveProjectMetadata` during enrichment; B does not. Project-flag detection
is silently broken on the kv_curated path.

### 2.6 🟡 `genericFetcher.ts` is a 2121-line monolith

`genericPaginatedFetcher` contains six pagination strategies inlined as
if-blocks (~lines 1599–2046). Each is 100–200 lines with its own
retry/stop/debug logic. Hard to test, hard to extend, hard to reuse.

### 2.7 🟡 Hardcoded English in property-type extraction

`extractPropertyType` matches `villa|apartment|house|townhouse|penthouse|
studio|land` — English only. Will mis-classify on PT/ES/FR markets (AO, MZ,
ST, BR, CV's Portuguese-language listings).

### 2.8 🟡 English-only URL skip-words in fetcher

`genericFetcher.ts` line ~974: `skipWords = ["for-sale", "for-rent", ...]`.
Used in the URL-to-location fallback. Same multilingual issue.

### 2.9 🟡 Brittle ID generation

`md5(title|price|url).slice(0,12)`. A price change creates a new row;
status-gate prevents the old row from updating, so the new row inserts as
needs_review and the old stays published — a **hidden duplicate**. The fix
(`id_url_pattern`) exists but is opt-in. Only CCore and REMAX use it.

### 2.10 🟡 `detail_url_rewrite` not applied on json_api path

`applyDetailUrlRewrite` is only called in `parseListingsFromHtml`.
`mapJsonItem` builds detail URLs without rewrite. If REMAX adds an `/en/`
variant later, the rewrite silently no-ops.

### 2.11 🟡 Source health feedback only on path A

`persistSourceHealth` is called only inside `runMarketIngest`. The
kv_curated path never updates source health, so auto-pause never triggers
for problems found there.

### 2.12 🟡 No retry on transient HTTP failures

`fetchHtml` is one-shot per page. A single 429/503 ends the page; pagination
continues with a gap. `retryPolicy.ts` exists but is not wired in.

### 2.13 🟡 CMS presets are stubs

`cmsPresets.ts` covers Elementor/WordPress/Wix/Squarespace/Shopify. The
systems actually used (Houzez, Proppy/CasafariCRM, OSProperty/Joomla,
WP Residence, MyHome, Gryphtech) have no preset, so every source duplicates
the same selectors.

### 2.14 🟢 Promotion is undocumented manual SQL

Runbook Phase 9 is "open a SQL client and UPDATE published". No audit
table, no script.

---

## 3. Target architecture

```
core/
  pipeline/                  ← single orchestrator, replaces ingestMarket + ingest_to_curated
    runMarketSource.ts       ← per-source loop (fetch → enrich → map → write)
    runMarket.ts             ← per-market loop (preflight + N×source)
    transform.ts             ← listing → CuratedRow (single place)
    locationResolver.ts      ← fallback chain (extracted from both files)
    aiDescription.ts         ← extracted from ingest_to_curated
  fetcher/
    index.ts                 ← picks strategy from config
    strategies/
      urlBased.ts            query_param + offset + path_segment + none
      clickNext.ts
      ajaxPost.ts
      jsonApi.ts
    parse/
      listings.ts            (parseListingsFromHtml today)
      price.ts               (parsePrice + parseConfiguredPrice — currently duplicated)
      images.ts              (dedupeImageUrls + filters)
      url.ts                 (makeAbsoluteUrl, extractIdFromUrl, rewrites)
  extractor/
    detail.ts                ← genericDetail.ts; the ONLY detail extractor
  config/
    loader.ts                (configLoader.ts; add zod/io-ts validation)
    propertyTypes.yml        ← shared across markets, locale-aware keyword lists
  write/
    kvCurated.ts             ← single write target
    promote.ts               ← scripts/promote_source.ts moved here
  health/
    record.ts                (sourceHealth.ts; called from both runners)

markets/
  cv/
    sources.yml              ← only source-specific knowledge
    locations.yml
    rules.yml
    locationHooks.ts         ← only when truly non-generic
    (NO plugins/ directory)
```

### 3.1 Files to delete when refactor lands

- `core/ingestCv.ts`, `.backup`, `.save`
- `core/ingestCvGeneric.ts`
- `core/preflightCv.ts`, `core/preflightCvIngest.ts`, `core/reportCv.ts`
- `core/parseSimplyCapeVerde.ts`, `core/parseTerraCaboVerde.ts`
- `core/detail/plugins/simplyCapeVerde.ts`
- `core/detail/plugins/terraCaboVerde.ts`
- `core/detail/plugins/homesCasaVerde.ts`
- `markets/cv/plugins/` (entire directory)
- Stub sources `cv_source_1`, `cv_source_2` in `markets/cv/sources.yml`
- `core/ingestMarket.ts` (folded into `core/pipeline/`)

---

## 4. Phased rollout

Recommended order: **B → A → C**. (B) unblocks scalability today,
(A) eliminates ongoing drift, (C) makes (A)+(B) maintainable long-term.

### Phase B — Plugin elimination (~3 days)

**Goal:** Every IN source uses `genericDetail.ts`. Zero source-specific TS.

For each of `cv_simplycapeverde`, `cv_terracaboverde`, `cv_homescasaverde`:

1. Read the per-source plugin file. Identify any extraction logic not
   already covered by `detail.selectors`, `spec_patterns`,
   `amenity_keywords`, `specs_selector` in `sources.yml`.
2. For each piece of source-specific logic, decide:
   - **Port to YAML** if expressible as selector + regex.
   - **Extend the engine** if the same shape will recur (e.g. a new generic
     `description_strategy: paragraph_join` option). Document in
     `engine-config-reference.md`.
3. Run `DRY_RUN=1` against the source. Compare coverage report
   (price / bedrooms / bathrooms / images / ai) to the current production
   numbers. **Coverage must not regress.**
4. Spot-check 5 listings: title, image set, bedrooms, bathrooms.
5. When coverage matches, delete the per-source plugin file and its
   `markets/cv/plugins/*.ts` re-export.

**Exit criterion:** `core/detail/plugins/` contains only `genericDetail.ts`.
`markets/cv/plugins/` does not exist. All 9 CV IN sources still in the live
feed with no regression in field coverage.

### Phase A — Pipeline convergence (~1 week)

**Goal:** One orchestrator, one write target.

1. Create `core/pipeline/` skeleton.
2. Extract shared helpers from both `ingestMarket.ts` and
   `ingest_to_curated.ts` into `core/pipeline/`:
   `transform.ts`, `locationResolver.ts`, `enrichListings.ts`, `fetchSource.ts`.
3. Rewrite `scripts/ingest_to_curated.ts` as a thin CLI over
   `core/pipeline/runMarketSource.ts`. Behavior must be identical (status
   gate, AI gate, regression guard).
4. Add `scripts/ingest_market.ts` that loops over all IN sources for a
   market by calling `runMarketSource` per source.
5. Delete `ingestMarket.ts`'s Supabase writer. Keep the report generator
   (artifacts/ingest_report.json) as a separate concern — or drop entirely
   if `kv_curated` query gives the same info.
6. Delete `package.json :: ingest:cv` (legacy CV-specific script).
   Rename `pipeline:cv` → `pipeline` with `MARKET_ID=cv`.
7. Delete legacy files listed in §3.1.

**Exit criterion:** A single command produces a full market ingest:
`MARKET_ID=cv npm run pipeline`. No source-specific scripts. No second
writer. `public.listings` is no longer written by the pipeline (only by the
manual promotion step that updates `kv_curated`).

### Phase C — Fetcher refactor (~2 days)

**Goal:** `genericFetcher.ts` no longer exists; replaced by focused
strategy modules.

1. Move pagination strategies into `core/fetcher/strategies/*.ts`. Each
   exports a `fetch(config, fetchFn) → Promise<GenericFetchResult>` matching
   the current top-level signature.
2. `core/fetcher/index.ts` selects strategy based on `pagination.type`.
3. Move utilities (`dedupeImageUrls`, `parsePrice`, `makeAbsoluteUrl`,
   `mapJsonItem`) to `core/fetcher/parse/`.
4. Keep public exports stable (`genericPaginatedFetcher`, `mapJsonItem`,
   `dedupeImageUrls`) so callers don't change. Re-export from
   `core/fetcher/index.ts`.
5. Delete `core/genericFetcher.ts`.

**Exit criterion:** No single file in `core/fetcher/` exceeds 400 lines.
All existing source ingests pass unchanged.

### Phase D — Quality of life (optional, ~1 day each)

- **D1.** `zod` validation in `configLoader.ts`. Catch bad selectors at load.
- **D2.** Locale-aware property-type extraction via
  `markets/_shared/property_types.yml`.
- **D3.** Houzez + Proppy CMS presets in `cmsPresets.ts`.
- **D4.** `scripts/promote_source.ts` (demote → ingest → promote) with audit.
- **D5.** Wire `retryPolicy.ts` into `fetchHtml` so transient 429/503s
  don't lose pages.
- **D6.** Apply `detail_url_rewrite` in `mapJsonItem` for json_api sources.
- **D7.** Wire `sourceHealth` updates into the kv_curated path so auto-pause
  works end-to-end.

---

## 5. Non-goals

- Adding new markets (KE / NG / etc.) before the refactor lands. New
  markets multiply the cost of every drift between the two paths.
- Rewriting the engine's parsing primitives. They work; the problem is
  organization.
- Replacing YAML with TS-based config. YAML is the right contract for
  this — config diffs are reviewable by non-engineers.
- Changing the promotion model. Manual SQL promotion stays as the
  production gate.

---

## 6. Acceptance criteria for "refactor done"

1. `core/detail/plugins/` contains only `genericDetail.ts`.
2. `markets/{any}/plugins/` does not exist in any market.
3. Adding a new source is a single YAML edit in `markets/{m}/sources.yml`.
4. Running `MARKET_ID=cv SOURCE_ID=cv_x npx ts-node scripts/ingest_to_curated.ts`
   is the only documented ingest command. No `ingest:cv`, no
   `ingestCv.ts`, no `ingestMarket.ts`.
5. Field coverage on all 9 currently-IN CV sources is at-or-above the
   2026-05-25 baseline:
   - price ≥ 95% (sources that disclose price)
   - bedrooms ≥ 80%
   - bathrooms ≥ 80%
   - images ≥ 1: 100%
6. No file in `core/` exceeds 700 lines.
7. `docs/operations/adding-a-source.md` works end-to-end with no
   references to source-specific TS files.

---

## 7. Open questions

- **`cv_nhakaza` (0 rows, marked IN).** Click-next headless source. Has it
  ever been run in production? Should it be DROPped, fixed, or moved to
  OBSERVE until proven? Resolve before Phase A so the convergence run
  isn't tracking a phantom source.
- **Path A's report output.** Anyone consuming `artifacts/cv_ingest_report.json`?
  If yes, the consumer needs migrating before deletion. If no, drop it.
- **Stub sources.** Anyone using `cv_source_1` / `cv_source_2` for
  end-to-end smoke tests? If not, delete; if yes, move to `tests/fixtures/`.
- **Undocumented DROPs.** `cv_rightmove`, `cv_globallistings`,
  `cv_properstar`, `cv_greenacres` have no documented reason. Either
  document the reason in `sources.yml` comments or re-investigate whether
  they're scrape-worthy.
