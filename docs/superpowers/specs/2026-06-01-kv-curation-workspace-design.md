# KV Curation Workspace — Design

Date: 2026-06-01
Status: Approved for planning
Builds on: `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md`

## Problem

The first cut of the reviewer agent shipped as a minimal Labs-only view
(`arei-admin/CuratedReviewView.tsx`): a left-side list of the `needs_review`
queue and a right-side detail panel that runs the Haiku reviewer and applies
patches. It works, but the operator has no way to:

- see the 425 currently-live (`published`) rows the public feed is serving,
- audit those live rows and demote bad ones,
- browse the rows they have hidden and undo a hide,
- get a quick read on the state of the inventory (counts, backlog age, agent
  recommendations) without dropping into the queue.

The result is that the only thing the operator can do today is push fresh
`needs_review` rows forward; they can't do quality control on the rest of the
feed, and they get no feedback loop from previous reviews because verdicts are
not persisted.

## Goal

A primary, top-level admin tab — **Curation** — that replaces the Labs entry
and serves as the operator's one workspace for every row in
`kv_curated.listings`. The page is a dashboard strip plus a unified inventory
table with status as one filter among many, plus a slide-in detail drawer
that owns the review/patch UI from v1. Verdicts persist so the dashboard can
surface agent recommendations and an audit trail is available per listing.

Explicit non-goals are listed at the end.

## Architecture

```
[Admin SPA]
  Curation tab
    ├── Dashboard strip   (4 metric tiles, click-to-filter)
    ├── Filter bar         (status + source + island + price + text search)
    ├── Inventory table    (one row per kv_curated.listings row, all statuses)
    │   └── Bulk action bar  (visible when N ≥ 1 rows are checked)
    └── Detail drawer      (slides in from right when a row is opened)
         ├── Source link, image strip, structured field grid
         ├── Run review button
         ├── Verdict + reasons + patch table with checkboxes
         ├── Apply / Apply + Publish / Hide
         └── Review history (collapsed)

[Serverless functions, arei-admin/api/]
  GET  /api/kv-curated-listing   ← evolves into a filtered list endpoint
  POST /api/review-listing       ← now persists each verdict to review_log
  POST /api/apply-listing-patch  ← unchanged

[Postgres, kv_curated schema]
  listings        ← unchanged
  review_log      ← NEW; one row per review run
```

Hard rules from `docs/02-data-engine/kazaverde-curated-feed-operations.md`
are still in force: all `kv_curated` reads and writes go through
`createPostgresClient()` and the pooler-backed `DATABASE_URL`; no Supabase
REST for `kv_curated`; the Anthropic API key stays server-side.

## Data shape changes

### 1. New table `kv_curated.review_log`

One row per review run. No deletes from the app; the row is the audit
record of what the model said at a given point in time.

```sql
create table kv_curated.review_log (
  id              bigserial primary key,
  listing_id      text not null references kv_curated.listings(id) on delete cascade,
  model           text not null,
  verdict         text not null check (verdict in ('publish','hold','hide')),
  confidence      numeric not null,
  reasons         jsonb not null,
  suggested_patch jsonb not null,
  hide_reason     text,
  created_at      timestamptz not null default now()
);

create index review_log_listing_id_idx
  on kv_curated.review_log (listing_id, created_at desc);
```

Schema lives behind the same `kv_curated` private-schema RLS as `listings`
(no anon/authenticated grants).

### 2. `POST /api/review-listing` writes the log

The handler is extended to insert into `review_log` immediately after a
successful parse-and-validate. The response shape gains a `review_log_id`:

```ts
{ id: string, verdict: ReviewVerdict, review_log_id: number }
```

Failures to insert the log are logged but do not fail the response — the
operator already has the verdict in hand; we should not throw it away because
of a write hiccup.

### 3. `GET /api/kv-curated-listing` becomes a filtered list endpoint

The current "no params → needs_review list, `?id=X` → single row" shape stays
backwards-compatible. New query params on the list mode:

- `status` — `published`, `needs_review`, `hidden`, or `all` (default: `all`)
- `source_id` — exact match against `source_id_primary`
- `island` — exact match
- `q` — case-insensitive substring search on `title` and `id`
- `price_min`, `price_max` — numeric bounds on `price`
- `flagged_hide` — when `1`, restrict to listings whose most-recent
  `review_log.verdict = 'hide'` AND `listings.publish_status != 'hidden'`
- `first_seen_after` — ISO date; `first_seen_at >= $1`
- `limit` — default 200, hard max 500
- `offset` — default 0

Result shape: `{ items: CuratedListingWithLastReview[], totalCount: number }`
where each row carries the original columns plus a `last_review` field:

```ts
{ verdict, confidence, hide_reason, created_at } | null
```

The join is a LATERAL subquery against `review_log` so empty-history rows
return `last_review: null` without becoming N+1.

### 4. Dashboard counts endpoint

New `GET /api/kv-curation-stats` returns the four tile values in one round
trip:

```ts
{
  live: number,                  // count where publish_status='published'
  needs_review: number,
  needs_review_older_than_14d: number,
  new_this_week: number,         // first_seen_at >= now() - interval '7 days'
  agent_flagged: number,         // last review verdict 'hide' AND publish_status != 'hidden'
}
```

Single endpoint to keep the dashboard one network call.

## UI components

The page is one new React component (`CurationWorkspaceView.tsx`) that
composes four smaller pieces under it. Total surface area is intentionally
larger than v1's single file so each sub-component holds one responsibility.

### `CurationWorkspaceView.tsx`

Owns the page state: current filter values, list of rows, selection (the
checkbox set), the open row id (which opens the drawer), and the loading /
error state. Polls `/api/kv-curation-stats` once on mount and after each
mutation (apply-patch, bulk-action). Re-fetches the list when filters change.

### `DashboardStrip.tsx`

Four tiles: Live · Needs review · New this week · Agent flagged. Each
tile is a button that pushes a filter delta into the parent — clicking
"Live" sets `status=published`, "Needs review" sets `status=needs_review`,
"New this week" adds `first_seen_after=<7 days ago>`, "Agent flagged" sets
`flagged_hide=1`. The "Needs review" tile also shows a sub-line with the
backlog-age count.

### `FilterBar.tsx`

Chip-style filter row: status, source (dropdown built from
`SOURCE_NAME_OVERRIDES` already in `data.ts`), island (9 CV islands), price
range (min/max inputs), and a text search input. Removing a chip clears
that filter. A "result count" lives on the right.

### `InventoryTable.tsx`

Columns: checkbox · thumbnail (40×30, from `image_urls[0]`, falls back to a
grey placeholder) · status pill · title (with id in a small faded line
underneath) · source · "island · city" · property_type · price · b/b/m²
(rendered as `bedrooms/bathrooms/property_size_sqm`; cells that are null
render as `—` in coral so they pop visually). Click anywhere on the row
opens the drawer. Sort by title, source, island, price, first_seen_at.
Hard limit 500 rows (we have 469 total) — pagination is out of scope.

### `BulkActionBar.tsx`

Sticky at the bottom of the page when `selectedIds.size > 0`. Shows
`{N} selected`, three action buttons (Review all · Publish · Hide), and a
Clear. Behaviour:

- **Review all** — sequentially POSTs `/api/review-listing` for each id,
  shows a progress bar (`Reviewing 7 of 12…`). Each verdict mutates the
  on-screen row in place so the table updates incrementally. A Cancel button
  aborts the loop after the current request returns.
- **Publish** — opens a confirm modal listing the affected ids grouped by
  current `publish_status`. On confirm, sequentially POSTs apply-patch with
  `publish_status='published'`. Rows already published are skipped client
  side.
- **Hide** — same shape with `publish_status='hidden'`. When ANY checked row
  currently has `publish_status='published'`, the confirm modal is stronger
  (red banner, explicit "this is a live production change" warning).

No bulk-specific endpoints; the existing single-row endpoints are the
contract. This keeps the server surface area small and the behaviour
identical to the single-row flow.

### `ListingDrawer.tsx`

Re-uses essentially today's `CuratedDetail` body, with three additions:

1. A **review history** section under the verdict, collapsed by default,
   that lists previous `review_log` rows (verdict pill + date + reasons
   summary). Fetched lazily on first expansion via a new
   `GET /api/kv-curated-listing-history?id=<id>` endpoint that returns
   `{ items: ReviewLogRow[] }` sorted DESC by `created_at`, limit 20.
2. A "last reviewed" pill at the top when the drawer opens, populated from
   the `last_review` field already returned by the list endpoint — so the
   operator sees what the model said previously without clicking Review.
3. Apply/publish/hide actions, on success, refresh both the list (so the
   row updates in place) AND the dashboard stats (so tiles update).

## Navigation

The existing **"Curated Review"** entry under Labs is removed. The new tab
is a top-level item in `NAV_ITEMS` in `arei-admin/app.tsx`, labelled
**"Curation"**, sitting between "Listings" and "Market News". The route key
changes from `"curated"` to `"curation"`.

The legacy "Listings" tab (`public.listings` reader) remains untouched.
Retiring it is a separate piece of work flagged in
`docs/02-data-engine/kazaverde-curated-feed-operations.md` and not part of
this spec.

## Files to touch

**New (server):**

- `migrations/038_kv_curated_review_log.sql` — table + index above.
- `arei-admin/api/kv-curation-stats.js` — GET, returns the 4 tile values.
- `arei-admin/api/kv-curated-listing-history.js` — GET `?id=...`, returns
  review_log rows for that listing.

**Modified (server):**

- `arei-admin/api/kv-curated-listing.js` — add list-mode query params,
  add LATERAL join for `last_review`, return `{ items, totalCount }`.
- `arei-admin/api/review-listing.js` — write to `review_log` after
  successful verdict parse; include `review_log_id` in the response.

**New (client):**

- `arei-admin/curation/CurationWorkspaceView.tsx`
- `arei-admin/curation/DashboardStrip.tsx`
- `arei-admin/curation/FilterBar.tsx`
- `arei-admin/curation/InventoryTable.tsx`
- `arei-admin/curation/BulkActionBar.tsx`
- `arei-admin/curation/ListingDrawer.tsx`
- `arei-admin/curation/types.ts` — local types for the workspace
  (`CurationFilters`, `CuratedListingWithLastReview`, etc.).

**Modified (client):**

- `arei-admin/types.ts` — extend `CuratedListing` with optional
  `last_review`; add `ReviewLogRow`, `CurationStats`.
- `arei-admin/data.ts` — add `getCuratedListings(filters)`,
  `getCurationStats()`, `getListingReviewHistory(id)`. Keep the existing
  `getCuratedNeedsReviewList` as a thin wrapper over `getCuratedListings({
  status: "needs_review" })` so any caller still works.
- `arei-admin/app.tsx` — remove `"curated"` from Labs, add `"curation"`
  to `NAV_ITEMS`, render `<CurationWorkspaceView />` for it.

**Removed (client):**

- `arei-admin/CuratedReviewView.tsx` — replaced by the new workspace.

**Unit tests:**

- `tests/curationListEndpoint.test.cjs` — covers query-param parsing and the
  list SQL builder (extracted from `kv-curated-listing.js` into a pure helper
  for testability, same pattern as `_reviewerLib.cjs`).
- `tests/curationStats.test.cjs` — covers the stats SQL builder.

## Cost and capacity

- The reviewer model and per-call cost are unchanged (Haiku 4.5, ~$0.003 per
  call). A full sweep of the 44 needs_review queue via "Review all" is
  ~$0.13 and ~2 minutes.
- `review_log` is append-only with a single index; growth is bounded by how
  often the operator reviews (small).
- The list endpoint with the LATERAL join is O(N) over `kv_curated.listings`
  + one index seek per row into `review_log`. At today's scale (469 rows)
  this is sub-100ms.

## Out of scope (v1)

- Editing AI descriptions / regenerating prose.
- Image-level review (broken images, watermarks, wrong subject).
- Cross-source duplicate detection.
- Pagination — capped at 500 rows for now; revisit when the feed crosses 1k.
- URL deep-linking to a specific row (e.g. `?selected=hcv_xyz`).
- Retiring the legacy `arei-admin` "Listings" tab.
- Editing review_log entries (it is an audit log, not a workspace).
- Sweeping all 425 already-published rows in one go from the dashboard.
  Operators can do it by filtering `status=published` and using bulk
  "Review all" on selections, which is the same flow at human pace.
