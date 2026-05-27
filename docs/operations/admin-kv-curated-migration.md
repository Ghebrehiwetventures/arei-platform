# Admin app: migration from `public.listings` to `kv_curated.listings`

**Status:** strawman for owner review. Decisions D1–D5 below must be resolved before code work on issue #284 Phase 5a begins.
**Author:** Eloy, 2026-05-27 (based on Phase D recon)
**Scope:** the `arei-admin` package only. The ingest pipeline already writes to `kv_curated.listings` (Phase C). The admin app is the last live consumer still bound to `public.listings`.

---

## TL;DR

There are **two** call sites in `arei-admin/` that read from legacy `public.listings`:

1. **`agencyDataConsole.getAgencyListingQuality`** (`arei-admin/agencyDataConsole.ts:136`) — live, mounted as the "Agency data" tab via `AgencyDataConsoleView` (`app.tsx:3959`). Reads top-500 listings per agency for quality scoring.
2. **`data.loadFromSupabase`** chain (`arei-admin/data.ts:320`) — **functionally dead but mechanically alive**. All UI consumers (`MarketOverview`, `MarketDetail`) are exported from `app.tsx` but **never rendered anywhere** (zero JSX references). The chain is still triggered as a module-init side-effect at `data.ts:493`, so every cold start of the admin app pulls every row in `public.listings` into memory to populate a cache nothing reads.

Path 2 is pure cleanup (delete code; no semantic decisions). Path 1 needs the owner to resolve the schema gaps below.

## Live schema gaps (path 1)

`agencyDataConsole` reads these columns from `public.listings`:

```
id, title, price, currency, source_id, source_url, island, city,
bedrooms, bathrooms, property_size_sqm, image_urls, description,
property_type, approved, last_seen_at, updated_at
```

vs. `kv_curated.listings`:

| legacy column     | kv_curated column         | gap |
|-------------------|---------------------------|-----|
| `source_id`       | `source_id_primary`       | rename only |
| `source_url`      | `source_url_primary`      | rename only |
| `approved`        | *(no direct equivalent)*  | closest analog: `publish_status = 'published'` |
| `last_seen_at`    | *(no direct equivalent)*  | closest analog: `last_verified_at` (set on every successful re-ingest by the status-gated upsert) |

All other columns map 1:1 by name.

## Owner decisions

### D1 — Treat `publish_status='published'` as the equivalent of `approved=true`?

The legacy `approved` flag was a manual editor-approval gate. In the kv_curated path, `publish_status` is the only status concept and is governed by the same editorial flow (rows enter as `needs_review`, get promoted to `published` by SQL).

**Strawman:** yes — map `approved → publish_status='published'`. Drop the `approved` column from the migrated `RawListing` shape; replace it everywhere in `agencyDataConsole.ts` with `publish_status`.

**Risk if no:** we need a new column in `kv_curated.listings` (and a migration), and we need to decide what "agency-approved vs editor-approved" actually means semantically — there is no existing distinction in the data we're migrating from.

### D2 — Use `last_verified_at` in place of `last_seen_at` for stale detection?

`computeListingQualityScore` and `detectListingIssues` (`agencyDataConsole.ts:42, 70`) use `last_seen_at ?? updated_at` with `STALE_DAYS` threshold to flag stale listings.

In kv_curated, `last_verified_at` is set on every successful re-ingest. Since the status-gated upsert only updates rows that the pipeline actually saw in the feed, `last_verified_at` is functionally "last time we still observed this listing at the source" — the same semantic as `last_seen_at`.

**Strawman:** yes — `last_seen_at ?? updated_at` becomes `last_verified_at ?? updated_at`. Keep `STALE_DAYS` unchanged.

**Risk if no:** the alternative is backfilling a new column from the pipeline, which is more invasive than the rename.

### D3 — Keep the `approved` boolean in `ListingQualityRow` exposed to UI, or replace with `publish_status` string?

This is downstream of D1. If D1 = yes, the UI in `AgencyDataConsoleView` currently reads `row.approved` (boolean badge). Two options:

- **D3a (recommended):** synthesize `approved: row.publish_status === 'published'` in `getAgencyListingQuality` so the UI is unchanged. Cheapest.
- **D3b:** expose `publish_status` end-to-end, update the UI to render it as a tri-state badge (needs_review / published / *future states*). More work, but future-proof.

### D4 — Path 2 cleanup: do it in the same PR as path 1, or split?

Path 2 (the dead `loadFromSupabase` chain) is independent code removal. Touching it requires deleting:
- `MarketOverview`, `MarketDetail`, `loadFromSupabase`, `getMarketsAsync`, `getMarkets`, `getMarket`, the module-init call at `data.ts:493`, the `marketsCache` / `loadPromise` state, the `SupabaseListing` interface, the `Market.listings` field, and likely `convertReportToMarket` / `loadIngestReport` / `getMockMarket` (pending a quick caller check).

**Strawman:** split — path 2 first as its own PR (pure deletion, no behavioral risk, no decisions); path 1 second once D1–D3 are settled. Path 2 cuts the cold-start full-table load immediately and shrinks the surface for path 1.

**Risk if combined:** path 1's review gets noisier and reverting becomes coarser-grained.

### D5 — Are there other consumers of `public.listings` outside `arei-admin/` we should migrate at the same time?

This recon was scoped to `arei-admin/`. The `kazaverde-web` package and any cron/edge functions reading `public.listings` were **not** audited as part of this strawman. Resolving #284 Phase 5a properly probably means cataloguing all live readers first.

**Strawman:** before merging path 1, run `grep -rn "from(\"listings\")" arei-admin kazaverde-web supabase` to confirm we're not stranding another consumer. Add findings to this doc.

## Recommended sequence

1. **Owner reviews D1–D5** and writes accept/reject inline.
2. **PR A — path 2 cleanup** (no decisions needed): remove the dead `loadFromSupabase` chain + module-init side-effect.
3. **D5 audit** — catalogue any other `public.listings` readers.
4. **PR B — path 1 migration**: rewrite `getAgencyListingQuality` to read from `kv_curated.listings`, apply the column renames and the D1/D2/D3 mappings.
5. **Verify in DRY_RUN-equivalent**: spin up `AgencyDataConsoleView` against the migrated query, set-compare the rendered quality rows for a known agency (e.g. one with cv_remax) against the current behavior.
6. **Drop the read permission for the admin app on `public.listings`** as a deliberate guard once both PRs are merged.

## Out of scope for this doc

- Schema changes to `kv_curated.listings` (no new columns proposed; the migrations use existing columns or accept a semantic substitution).
- Ingest pipeline changes — the pipeline is already correct.
- `kazaverde-web` / public-facing readers — audit deferred to D5.
