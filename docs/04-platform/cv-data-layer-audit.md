# CV Data Layer Audit

**Status:** Audit only — no UI code changes.  
**Date:** 2026-05-11  
**Scope:** Cape Verde data pipeline, live feed, admin dashboard metrics, snapshots.  
**Purpose:** Establish precise understanding of what each data layer measures before any dashboard redesign.

---

## 1. Data Layer Map

### Layer 1 — Raw Ingest (`public.listings`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Stores every listing the scrapers fetch. Primary persistence layer for raw pipeline output. |
| **Writer** | Ingest pipeline (scraper jobs, GitHub Actions). Scraper approval flags (`approved`, `trust_gate_passed`, `indexable`, `is_stale`) are computed by pipeline enrichment steps. |
| **Reader** | `get_source_quality_stats()` RPC (admin dashboard). `v1_feed_cv_pre_terra_cohort_rollback_20260401` (legacy view). Listings tab in admin (paginated browse). |
| **Risk** | This is a scraper-output table. `approved` here means the ingest pipeline marked the row acceptable — it does **not** mean the listing is live on the website. The curated layer (`kv_curated`) is the live feed gate, not this table. Any admin metric derived solely from `public.listings` measures pipeline health, not live-site health. |

### Layer 2 — Curated / Middle Layer (`kv_curated.listings`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Editorial staging table. Decouples the public feed from raw scraper output. A listing must exist here with `publish_status = 'published'` to appear on the live website. |
| **Writer** | Manual editorial operations (curation ops). Rows can be seeded from `public.listings` via `seeded_from_raw_listing_id`, or created fresh. |
| **Reader** | `public.v1_feed_cv_curated_preview` (reads only `publish_status = 'published'` rows). Nothing in admin reads this schema directly — it is private (`kv_curated` schema, no anon/authenticated RLS policies). |
| **Risk** | If a listing exists in `public.listings` with `approved = true` but has not been seeded/published in `kv_curated.listings`, it will show in admin's "Approved" counts but **will not appear on the website**. This is the primary label confusion in admin today. |

### Layer 3 — Published / Live Feed (`public.v1_feed_cv`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Canonical public feed contract. The only data source the KazaVerde frontend and SDK consume. |
| **Writer** | Not a writable table — it is a view. It reads from `public.v1_feed_cv_curated_preview`, which reads from `kv_curated.listings` (`publish_status = 'published'`). Inclusion filters: valid island, non-empty image array, non-null source URL, non-superseded. |
| **Reader** | KazaVerde frontend SDK. `get_source_quality_stats()` RPC (via LEFT JOIN to compute `public_feed_count` per source). `content_drafts` candidate selection (`getLiveContentCandidateListings()`). |
| **Risk** | As of migration `029_switch_v1_feed_cv_to_curated.sql`, this view reads from the curated layer, not from `public.listings`. Code or documentation that assumes `v1_feed_cv` still reads from `public.listings` is stale and wrong. |

### Layer 4 — Admin / Source Health (`get_source_quality_stats()`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Aggregates per-source pipeline quality metrics for the admin dashboard. |
| **Writer** | N/A — it is a read-only RPC function. |
| **Reader** | `arei-admin/data.ts` `getDashboardStats()` (live admin UI). `scripts/snapshot_source_health.ts` (daily snapshot writer). |
| **Risk** | Scans `public.listings` for all counts (listing_count, approved_count, with_image_count, with_price_count, etc.). Only `public_feed_count` bridges to the live feed via `LEFT JOIN public.v1_feed_cv`. This means every metric *except* `public_feed_count` is a pipeline-layer measurement, not a live-feed measurement. The health grade, freshness, sqm coverage, trust pass count — all computed from `public.listings`. |

### Layer 5 — Snapshots / History (`source_health_snapshots`)

| Attribute | Value |
|-----------|-------|
| **Purpose** | Daily point-in-time record of `get_source_quality_stats()` output. Enables historical trending. |
| **Writer** | `scripts/snapshot_source_health.ts` (GitHub Actions daily workflow). Calls the RPC, computes grade, upserts keyed on `(snapshot_date, source_id)`. |
| **Reader** | Not currently queried by admin UI. Exists as a historical record only. |
| **Risk** | Snapshots capture the same layer as the RPC — `public.listings` pipeline metrics plus the `public_feed_count` from `v1_feed_cv`. They are not a snapshot of the live curated feed. If you trend from snapshots, you are trending pipeline health, not live-site content volume. |

### Layer 6 — Legacy Views

| Object | Status |
|--------|--------|
| `public.v1_feed_cv_pre_terra_cohort_rollback_20260401` | Legacy intermediate view. Reads from `public.listings` with trust/freshness/island filters. Predates the curated layer. No longer in the `v1_feed_cv` chain. Exists to preserve historical column contract. Not used by live frontend or admin. |
| `public.v1_public_feed` | Not found in migrations or admin data layer. Presumed removed or never deployed. Do not reference. |
| `public.v1_feed_cv_indexable` | Referenced in `arei-admin/data.ts` `getLiveContentCandidateListings()` as a preferred source for content draft candidate selection (falls back to `v1_feed_cv`). No migration defining this view was found. May have been removed or may exist only in Supabase Studio. Admin falls back to `v1_feed_cv` if this view is missing. |

---

## 2. Supabase Object Map

### `public.listings`

| Field | Value |
|-------|-------|
| **Layer** | Raw ingest |
| **Purpose** | All scraped listings, raw and enriched. Primary persistence target for the ingest pipeline. |
| **Writer** | Ingest scraper jobs |
| **Reader** | `get_source_quality_stats()`, `v1_feed_cv_pre_terra_cohort_rollback_20260401`, admin Listings tab |
| **Live-facing** | No — not exposed to frontend directly |
| **Admin uses it** | Yes — indirectly via RPC; directly via Listings tab paginated query (`arei-admin/data.ts:getListings()`) |
| **Website uses it** | No (website reads `v1_feed_cv` → `kv_curated.listings`) |
| **Should be used for reporting** | **Pipeline health only.** Not suitable for reporting live-site content volume or user-visible listing counts. |

---

### `kv_curated.listings`

| Field | Value |
|-------|-------|
| **Layer** | Curated / middle layer |
| **Purpose** | Editorial staging. Controls what appears on the live website via `publish_status`. |
| **Writer** | Manual curation ops |
| **Reader** | `public.v1_feed_cv_curated_preview` (WHERE `publish_status = 'published'`) |
| **Live-facing** | Yes — indirectly; its `published` rows power the live feed |
| **Admin uses it** | No — admin has no direct query path to `kv_curated` schema |
| **Website uses it** | Yes — via `v1_feed_cv → v1_feed_cv_curated_preview → kv_curated.listings` |
| **Should be used for reporting** | **Yes, for live-site content reporting.** Count of `publish_status = 'published'` rows is the true live listing count. Admin currently has no metric from this layer. |

---

### `public.v1_feed_cv`

| Field | Value |
|-------|-------|
| **Layer** | Published / live feed |
| **Purpose** | Canonical public feed contract for the website and SDK. |
| **Writer** | View — not writable |
| **Reader** | KazaVerde frontend SDK, `get_source_quality_stats()` (for `public_feed_count`), content draft candidate selection |
| **Live-facing** | Yes — this is the live feed |
| **Admin uses it** | Only indirectly, via the `public_feed_count` value in the RPC result |
| **Website uses it** | Yes — primary data source |
| **Should be used for reporting** | **Yes.** `COUNT(*)` from this view is the authoritative live listing count for user-facing metrics. |
| **Note** | As of migration `029`, this view reads from `v1_feed_cv_curated_preview → kv_curated.listings`, not from `public.listings`. Migration `028` also sets `security_invoker = true`. |

---

### `public.v1_feed_cv_curated_preview`

| Field | Value |
|-------|-------|
| **Layer** | Published / live feed (wrapper) |
| **Purpose** | Type-compatible shim. Projects `kv_curated.listings` (WHERE `publish_status = 'published'`) into the `v1_feed_cv` column shape for backwards compatibility. |
| **Writer** | View — not writable |
| **Reader** | `public.v1_feed_cv` |
| **Live-facing** | Yes — one step removed from live |
| **Admin uses it** | No |
| **Website uses it** | Indirectly via `v1_feed_cv` |
| **Should be used for reporting** | Same as `v1_feed_cv`. Prefer querying `v1_feed_cv` directly for simplicity. |

---

### `get_source_quality_stats()` (RPC)

| Field | Value |
|-------|-------|
| **Layer** | Admin / source health (pipeline layer, with one live-feed bridge) |
| **Purpose** | Per-source aggregate: listing count, approval, image/price/sqm/beds/baths coverage, trust pass, indexable, public feed count, freshness. |
| **Writer** | N/A (read-only function) |
| **Reader** | `arei-admin/data.ts:getDashboardStats()`, `scripts/snapshot_source_health.ts` |
| **Live-facing** | No |
| **Admin uses it** | Yes — primary data source for all Dashboard, Sources, Diagnostics metrics |
| **Website uses it** | No |
| **Should be used for reporting** | **Pipeline health yes. Live-site content no.** All columns except `public_feed_count` measure `public.listings`. `public_feed_count` is the one column that reflects the live feed. |
| **Definition** | `docs/supabase_rpc.sql` |

---

### `source_health_snapshots`

| Field | Value |
|-------|-------|
| **Layer** | Snapshots / history |
| **Purpose** | Daily record of RPC output. Enables health trending over time. |
| **Writer** | `scripts/snapshot_source_health.ts` (GitHub Actions daily) |
| **Reader** | Not currently queried by admin UI |
| **Live-facing** | No |
| **Admin uses it** | Not currently — no UI reads from this table |
| **Website uses it** | No |
| **Should be used for reporting** | **Yes, for pipeline health trends.** The `public_feed_count` column in each snapshot captures the live feed count at that point in time, making it useful for tracking live-feed growth trends. Not suitable for real-time live-site decisions. |
| **Migration** | `migrations/027_source_health_snapshots.sql` |

---

### `v1_feed_cv_indexable`

| Field | Value |
|-------|-------|
| **Layer** | Unknown / possibly removed |
| **Purpose** | Referenced in `arei-admin/data.ts` as a preferred candidate pool for content draft generation. Expected to be a view filtering `v1_feed_cv` or `kv_curated.listings` for indexable listings. |
| **Writer** | N/A (view, if it exists) |
| **Reader** | `arei-admin/data.ts:getLiveContentCandidateListings()` (with fallback to `v1_feed_cv`) |
| **Live-facing** | Unknown |
| **Admin uses it** | Attempted — code has a `try v1_feed_cv_indexable, fallback to v1_feed_cv` pattern |
| **Website uses it** | Unknown |
| **Should be used for reporting** | Not until its definition is confirmed in Supabase. |
| **Action needed** | Verify existence in Supabase Studio. If missing, remove the reference from `getLiveContentCandidateListings()` and use `v1_feed_cv` directly. |

---

### `v1_public_feed`

| Field | Value |
|-------|-------|
| **Layer** | Unknown / legacy |
| **Purpose** | Not found in migrations or admin code. Presumably an early name for `v1_feed_cv` or never deployed. |
| **Status** | **Presumed deprecated / never used.** Do not reference. |

---

## 3. Admin Metric Map

All metrics below are derived from `get_source_quality_stats()` unless noted otherwise.  
Source: `arei-admin/app.tsx`, `arei-admin/data.ts`, `arei-admin/sourceHealthGrade.ts`.

---

### Dashboard Tab — Health Pill

| Attribute | Detail |
|-----------|--------|
| **Label shown** | `Cape Verde health: Good` / `Cape Verde health: Needs attention` |
| **File/function** | `arei-admin/app.tsx:798–803` (`cvHasCriticalIssue`, `cvStatusLabel`) |
| **Data source** | `get_source_quality_stats()` → `public.listings` + `public.v1_feed_cv` |
| **Layer measured** | Mixed — `approvedNoFeedSources` bridges to live feed; `approvedNoTrustSources`, `approvedNoIndexableSources`, `staleSourcesCount` are pipeline-layer |
| **Label accurate?** | Partially. "Needs attention" fires correctly when approved listings haven't reached the feed. But "Good" does not mean the live site is healthy — it means no pipeline blockers were detected. |
| **Recommended label** | `Cape Verde pipeline health: Good / Needs attention` or keep as-is but document the scope. |

---

### Dashboard Tab — Cape Verde Source Health Card

| Metric | File/line | Data source | Layer | Label accurate? | Recommendation |
|--------|-----------|-------------|-------|-----------------|----------------|
| `Cape Verde sources` (count) | `app.tsx:900` | `get_source_quality_stats()` → `public.listings` | Pipeline | Yes — counts distinct sources in the pipeline | Keep |
| `Fresh (≤30d)` | `app.tsx:901` | `last_updated_at` from `public.listings` | Pipeline | Yes — measures when ingest last wrote to `public.listings` | Keep, but note it measures last *ingest* update, not last *curated* update |
| `Stale (>30d)` | `app.tsx:902` | `last_updated_at` from `public.listings` | Pipeline | Yes | Keep |
| `Missing sqm` | `app.tsx:903` | `with_sqm_count` from `public.listings` | Pipeline | Accurate for pipeline coverage. Does not reflect curated-layer sqm coverage. | Keep with note |
| `Approved · 0 feed` | `app.tsx:904` | `approved_count > 0 AND public_feed_count_n === 0` | Mixed (pipeline approved, live feed count) | **Misleading label.** "Approved" sounds like "approved for publication" (curatorial), but here it means `approved = true` in `public.listings` (pipeline gate). A listing can be pipeline-approved but not curated/published. | Rename to `Pipeline-approved · 0 live` or `Ingest-approved · not in feed` |
| `Low feed conv` | `app.tsx:905` | `approved_count >= 20 AND feed_conversion_pct < 25%` | Mixed | Same issue: "feed conversion" implies pipeline → live, but numerator (`approved`) is pipeline layer. | Rename to `Low pipeline→feed ratio` |

---

### Dashboard Tab — Needs Attention / Performing Well Cards

| Attribute | Detail |
|-----------|--------|
| **Label shown** | `Needs attention · Cape Verde` / `Performing well · Cape Verde` |
| **File/function** | `app.tsx:925–943` (`cvWorst`, `cvBest`) |
| **Data source** | `grade` computed from `get_source_quality_stats()` |
| **Layer measured** | Pipeline (grade includes `public_feed_count` bridge, but all other grade inputs are from `public.listings`) |
| **Label accurate?** | Acceptable. Grade D/C genuinely flags operational problems. Grade A/B means pipeline is healthy and at least some listings reach the live feed. |
| **Recommendation** | Keep. Consider adding sub-label "by pipeline health grade" to clarify scope. |

---

### Dashboard Tab — Top Issues List

| Issue label | File/line | Data source | Layer | Accurate? | Recommendation |
|-------------|-----------|-------------|-------|-----------|----------------|
| `approved → 0 public feed` | `app.tsx:808` | `approved_count`, `public_feed_count_n` | Mixed | **Misleading** — "approved" is pipeline-level | Rename to `ingest-approved → 0 live` |
| `approved → 0 trust pass` | `app.tsx:809` | `approved_count`, `trust_passed_count` | Pipeline | Label is accurate for pipeline ops | Keep |
| `stale (>30d)` | `app.tsx:810` | `last_updated_at` | Pipeline | Accurate | Keep |
| `0% sqm coverage` | `app.tsx:811` | `with_sqm_count` | Pipeline | Accurate for pipeline coverage | Keep |
| `low feed conversion (<25%)` | `app.tsx:812` | `feed_conversion_pct` | Mixed | **Misleading** — same "approved" issue | Rename to `low ingest→feed ratio (<25%)` |

---

### Dashboard Tab — Latest Sync

| Attribute | Detail |
|-----------|--------|
| **Label shown** | `Latest sync` with timestamp, market name, total/visible count |
| **File/function** | `app.tsx:946–1019`, `data.ts:getLatestSyncLog()` |
| **Data source** | `/cv_ingest_report.json` artifact (if served). Falls back to `MAX(last_updated_at)` from `get_source_quality_stats()` result. |
| **Layer measured** | Pipeline — this is the ingest run timestamp. The artifact contains data from the scraper run (`visibleListings`, `hiddenListings`), not from the curated layer. |
| **Label accurate?** | Partially. "Sync" implies database sync, but this is really "last ingest run." Fallback mode shows `last_updated_at` from `public.listings`. |
| **Recommendation** | Rename to `Latest ingest run`. Document fallback behavior. Do not use this to represent "last time the website content was updated." |

---

### Dashboard Tab — Portfolio Overview (Secondary)

| Metric | File/line | Data source | Layer | Accurate? | Recommendation |
|--------|-----------|-------------|-------|-----------|----------------|
| `Total listings` | `app.tsx:1031–1032` | `stats.totalListings` = SUM of `listing_count` across all sources | Pipeline (`public.listings`) | **Inaccurate for strategic use.** This is the raw ingest count across all markets including test pipeline markets (gh, ke, ng, zm, bw). It includes unapproved, stale, and non-Cape-Verde listings. | Relabel to `Raw pipeline inventory · all markets`. Add disclaimer. |
| `Approved` | `app.tsx:1035–1037` | `stats.approvedCount` = SUM of `approved_count` | Pipeline (`public.listings`) | **Misleading.** `approved = true` in `public.listings` is a pipeline quality flag, not editorial publication approval. | Relabel to `Pipeline-approved`. Note it does not equal live website count. |
| `Sources` | `app.tsx:1040–1041` | COUNT of distinct `source_id` from RPC | Pipeline | Accurate — pipeline source count | Keep |
| `Markets` | `app.tsx:1043–1045` | COUNT of distinct market prefixes | Pipeline | Accurate — includes test pipeline markets | Keep, add `(incl. pipeline)` note |

---

### Dashboard Tab — Source Quality Table (All Markets)

| Column | File/line | Data source | Layer | Accurate? | Recommendation |
|--------|-----------|-------------|-------|-----------|----------------|
| `Source` | `app.tsx:1056` | `sourceName` from override map | — | Yes | Keep |
| `Market` | `app.tsx:1057` | `marketId` parsed from `source_id` | — | Yes | Keep |
| `Count` | `app.tsx:1058` | `listing_count` from `public.listings` | Pipeline | Label is neutral but ambiguous | Relabel to `Ingest count` |
| `Approved %` | `app.tsx:1059` | `approved_count / listing_count` from `public.listings` | Pipeline | **Misleading** — implies curatorial approval | Relabel to `Pipeline approved %` |
| `Image %` | `app.tsx:1060` | `with_image_count / listing_count` from `public.listings` | Pipeline | Accurate for pipeline coverage | Keep |
| `Price %` | `app.tsx:1061` | `with_price_count / listing_count` from `public.listings` | Pipeline | Accurate for pipeline coverage | Keep |
| `Health` | `app.tsx:1062` | `grade` (A/B/C/D) computed in `sourceHealthGrade.ts` | Mixed | Accurate as a pipeline+feed health composite | Keep. Consider tooltip explaining grade inputs. |

---

### Sources Tab (`SourcesView`)

| Attribute | Detail |
|-----------|--------|
| **File/function** | `arei-admin/app.tsx:1838`, `SourcesView()` |
| **Data source** | `getDashboardStats()` → `get_source_quality_stats()` |
| **Layer measured** | Same as Dashboard: pipeline metrics from `public.listings`, `public_feed_count` bridges to live feed |
| **Columns in detail table** | `listing_count`, `public_feed_count`, `approved_count`, `indexable_count`, `trust_passed_count`, `sqm_pct`, `beds_pct`, `baths_pct`, `freshness_label`, `last_updated_at`, `grade` |
| **CSV export columns** | Same as above (see `app.tsx:1889–1906`) |
| **Label issues** | Same as Dashboard: `approved_count` and `approved` labels imply editorial publication |
| **Recommendation** | Same renames as Dashboard. Sources tab is otherwise well-structured and useful. |

---

### Sources Tab — Source Health Report (HTML Export)

| Attribute | Detail |
|-----------|--------|
| **File/function** | `arei-admin/sourceHealthReport.tsx`, `buildReportHtml()` |
| **Data source** | `SourceQualityRow[]` from `getDashboardStats()` |
| **Layer measured** | Pipeline + live-feed bridge (same as RPC) |
| **Content** | Per-source issue cards with grade, blockers, warnings, priority action, freshness |
| **Label issues** | The report correctly separates "pipeline" signals (sqm, trust, indexable) from "feed" signals (public_feed_count). However, `approved` terminology carries through. |
| **Recommendation** | Acceptable for operational use. Rename `approved` references before using for strategic/investor reporting. |

---

### Diagnostics Tab (`DiagnosticsView`)

| Section | File/line | Data source | Layer | Notes |
|---------|-----------|-------------|-------|-------|
| Operational issues · verbose | `app.tsx:2234–2325` | `get_source_quality_stats()` | Mixed | Correctly labeled "verbose" and "for troubleshooting." Issues include: stale sync, approved-no-feed, approved-no-trust, approved-no-indexable, listings-no-approved, stale, missing sqm, low feed conv. |
| Legacy data quality | `app.tsx:2341–2364` | `with_image_pct`, `with_price_pct`, `approved_pct` from `public.listings` | Pipeline | **Correctly labeled "Legacy data quality" in the UI.** This is already acknowledged as a less-useful metric. Keep as-is. |
| Source anomalies | `app.tsx:2367–2392` | `approved_pct`, `with_image_pct`, `with_price_pct` | Pipeline | Best approval, lowest images, lowest prices. Useful for debugging bad sources. Label accurate for pipeline context. |
| Health across all markets | `app.tsx:2331–2335` | Grade, image%, price% | Pipeline | Summary note: "X D, Y C; Z sources <10% images." Useful for quick scan. |
| Test/stub sources | `app.tsx:2394–2409` | `isStub` filtered rows | Pipeline | Correctly isolated. Keep. |

---

### Listings Tab (`ListingsTabView`)

| Attribute | Detail |
|-----------|--------|
| **File/function** | `arei-admin/app.tsx:1250`, `data.ts:getListings()` |
| **Data source** | `public.listings` (direct paginated query with filters) |
| **Layer measured** | Raw pipeline — this shows all ingest rows, not curated/published rows |
| **Filters available** | price range, island, city, source, bedrooms, bathrooms, area, title search, approval status, import date range |
| **Label issues** | The `approved` filter in this tab filters on `public.listings.approved`, not on curated publish status. A user filtering for "approved" listings here will see pipeline-approved rows, not necessarily live website listings. |
| **Recommendation** | Add a note: "Showing raw pipeline inventory. For live website listings, see `v1_feed_cv` in Supabase." Consider adding a `public_feed` filter using a JOIN to `v1_feed_cv`. |

---

## 4. Direct Answers

### Is Admin currently wrong, or just mislabeled?

**Mislabeled, not wrong.** The data Admin displays is internally consistent and operationally useful for pipeline monitoring. The numbers are accurate for what they measure. The problem is that the labels — especially "Approved", "Approved %", "Total listings", "Latest sync" — read as live-site metrics to a non-technical operator, when they actually measure the raw ingest pipeline (`public.listings`).

No metric is fabricated. The confusion is about which layer each number belongs to.

---

### Which parts measure the live published feed?

Only one metric in the current admin measures the live published feed directly:

- **`public_feed_count`** (per source, in the Sources tab detail table and CSV export) — this is derived from `LEFT JOIN public.v1_feed_cv` in the RPC, so it counts actual curated, published, publicly-visible listings.

By extension, `feed_conversion_pct` (= `public_feed_count / approved_count`) partially reflects the live feed (in the numerator), but its denominator (`approved_count`) is pipeline-layer, making the ratio a mixed metric.

---

### Which parts measure pipeline / source health?

Everything else:

- `listing_count` — raw ingest row count in `public.listings`
- `approved_count` / `approved_pct` — pipeline quality flag in `public.listings`
- `with_image_count` / `image_pct` — pipeline field presence in `public.listings`
- `with_price_count` / `price_pct` — pipeline field presence in `public.listings`
- `with_sqm_count` / `sqm_pct` — pipeline field presence in `public.listings`
- `with_beds_count` / `beds_pct` — pipeline field presence in `public.listings`
- `with_baths_count` / `baths_pct` — pipeline field presence in `public.listings`
- `trust_passed_count` — pipeline enrichment flag in `public.listings`
- `indexable_count` — pipeline enrichment flag in `public.listings`
- `last_updated_at` / freshness — `MAX(updated_at)` from `public.listings`
- Health grade (A/B/C/D) — composite of the above; grade D fires when `public_feed_count = 0`, which bridges to live feed, but all supporting signals are pipeline
- Latest sync timestamp — from ingest run artifact, not from curated layer
- Portfolio overview (Total listings, Approved, Sources, Markets) — all from `public.listings` via RPC

---

### Which parts are mixed?

- **Health grade** — inputs are 90% pipeline (`public.listings`), but grade D condition `approved_count > 0 AND public_feed_count = 0` bridges to live feed
- **`feed_conversion_pct`** — numerator (`public_feed_count`) is live feed; denominator (`approved_count`) is pipeline
- **`Approved · 0 feed`** card — same mixed logic as above
- **`Low feed conv`** card — same mixed logic
- **Health pill (`Cape Verde health: Good/Needs attention`)** — triggers on `approvedNoFeedSources`, which is a live-feed check, plus pipeline-only checks like stale/trust/indexable

---

### Which parts should not be used for strategic live-site decisions?

Do not use these for strategic reporting on what users see on the website:

- **`Total listings`** in Portfolio overview — includes test pipeline markets and non-published pipeline rows; not the live listing count
- **`Approved` count** in Portfolio overview — pipeline flag, not editorial publication status
- **`Approved %`** in Source Quality table — same issue
- **`Latest sync`** timestamp — measures ingest run, not curated content freshness
- **Snapshots** — record pipeline health, not live-feed content volume

For live-site decisions, use:
- `public_feed_count` per source (already in Sources tab CSV)
- Direct `SELECT COUNT(*) FROM public.v1_feed_cv` in Supabase for total live listings
- `SELECT COUNT(*) FROM kv_curated.listings WHERE publish_status = 'published'` for curated live count

---

### Are snapshots still useful?

**Yes, with clear scope.** Snapshots in `source_health_snapshots` are useful for:
- Tracking pipeline health trends over time (trust pass rates, sqm coverage improving or declining)
- Detecting when sources went stale or grade degraded
- Historical context before an incident investigation
- Trending `public_feed_count` over time (since that column is included in snapshots)

They are **not** suitable for:
- Reporting live website listing volume to stakeholders (use `v1_feed_cv` count directly)
- Claiming the website content improved or declined without also checking `kv_curated.listings`

The snapshot table is currently not wired to any admin UI. Before adding trend graphs, decide whether you want to trend pipeline health (what snapshots capture) or live-feed volume (which would require either snapshotting `kv_curated.listings` counts or querying `v1_feed_cv` historically).

---

### What should be renamed before adding trend graphs?

Before adding trend graphs, rename the following so that the concepts being trended are unambiguous:

| Current label | Rename to |
|---------------|-----------|
| `Approved` (count, %) | `Pipeline-approved` |
| `Total listings` | `Raw pipeline inventory` |
| `Latest sync` | `Latest ingest run` |
| `Approved · 0 feed` | `Pipeline-approved · not in live feed` |
| `Low feed conv` | `Low ingest→feed ratio` |
| `approved → 0 public feed` (issue label) | `ingest-approved → 0 live feed` |
| `approved → 0 trust pass` | `ingest-approved → 0 trust pass` |
| `low feed conversion (<25%)` | `low ingest→feed ratio (<25%)` |
| Dashboard subtitle `Data quality overview and source health` | `Pipeline health and ingest quality` |

The single most important rename before adding trend graphs: **`public_feed_count`** should be the primary metric trended, under the label **`Live feed listings`**, because it is the only existing metric that reflects the actual website.

---

## 5. Recommendation

**Do not implement yet.** This section documents what to do, not what has been done.

### What to rename (small, safe, high-value)

These are label-only changes with no data logic change. High priority before any trend graphs:

1. Dashboard subtitle: `Data quality overview and source health` → `Pipeline health and ingest quality`
2. Portfolio overview cards: `Total listings` → `Raw pipeline inventory (all markets)`, `Approved` → `Pipeline-approved`
3. Source Quality table: `Count` → `Ingest count`, `Approved %` → `Pipeline approved %`
4. Source Health card: `Approved · 0 feed` → `Ingest-approved · 0 live feed`, `Low feed conv` → `Low ingest→feed ratio`
5. Issues list: rename the three "approved" issue labels (see table above)
6. Latest sync section: `Latest sync` → `Latest ingest run`

### What to add (one new metric, deferred until after rename)

After renaming, add a single new metric to the Dashboard's source health card:

- **`Live feed listings`** — `public_feed_count` summed across all CV sources (already computed in RPC; just not surfaced as a standalone summary card)

This is the one number that represents what users actually see on the website today. It is the most important metric missing from the current dashboard summary.

### What to leave alone

- Health grade algorithm (`sourceHealthGrade.ts`) — correctly weighted, bridges to live feed where it matters
- Sources tab detail table — structurally sound; the rename pass above is sufficient
- Diagnostics tab — already labeled "for troubleshooting", already shows "Legacy data quality" section correctly
- Snapshots table — leave as-is until a trend graph UI is designed
- `get_source_quality_stats()` RPC — correct and efficient; do not alter its logic

### What to postpone

- Any new trend graph UI — wait until renames are shipped and `source_health_snapshots` read path is wired
- Snapshotting `kv_curated.listings` counts separately — only needed once live-feed trending is prioritized
- Removing `v1_feed_cv_indexable` reference — investigate existence first; low urgency
- Adding a `kv_curated` admin view — useful long-term but out of scope for the rename pass
- Any Pulse integration or market-expansion dashboard work — blocked pending this rename

---

## Appendix: Object Dependency Chain

```
KazaVerde frontend SDK
  └─ reads ─► public.v1_feed_cv (canonical live feed)
                └─ reads ─► public.v1_feed_cv_curated_preview
                              └─ reads ─► kv_curated.listings
                                          WHERE publish_status = 'published'

AREI Admin Dashboard
  └─ calls ─► get_source_quality_stats() (RPC)
               ├─ scans ─► public.listings (all sources, all metrics except feed count)
               └─ LEFT JOINs ─► public.v1_feed_cv (for public_feed_count only)
  └─ paginates ─► public.listings (Listings tab)

Snapshot writer (daily GitHub Actions)
  └─ calls ─► get_source_quality_stats()
  └─ upserts ─► source_health_snapshots

Content Draft workflow
  └─ tries ─► public.v1_feed_cv_indexable (may not exist)
  └─ falls back ─► public.v1_feed_cv
  └─ persists ─► content_drafts
```

---

*This document is audit-only. No UI code was changed. File cited: `arei-admin/app.tsx`, `arei-admin/data.ts`, `arei-admin/sourceHealthGrade.ts`, `arei-admin/sourceHealthReport.tsx`, `docs/supabase_rpc.sql`, `migrations/027_source_health_snapshots.sql`, `migrations/028_kv_curated_preview_schema.sql`, `migrations/029_switch_v1_feed_cv_to_curated.sql`.*
