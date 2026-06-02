# KV Curation Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Labs-only `CuratedReviewView` with a full Curation workspace — dashboard strip, unified inventory table over every `kv_curated.listings` row (any status), bulk actions, slide-in detail drawer with review history persisted to a new `review_log` table.

**Architecture:** Add one private table (`kv_curated.review_log`), one new stats endpoint, one new history endpoint, evolve the existing list endpoint into a filtered list with a LATERAL join, extend the review endpoint to persist verdicts. On the client, replace the single-file `CuratedReviewView` with a `curation/` directory of focused components and one orchestrator view. All `kv_curated` reads/writes still go through `createPostgresClient` per the curated-feed-operations doc.

**Tech Stack:** Postgres (`kv_curated` private schema), Node 20 ESM serverless functions under `arei-admin/api/`, pure CommonJS helpers tested with `node --test` (`tests/*.test.cjs`), React 18 + Tailwind 4 SPA, `pg` and `@anthropic-ai/sdk` already wired.

**Design spec:** `docs/superpowers/specs/2026-06-01-kv-curation-workspace-design.md`

---

## File map

**New server files**

- `migrations/038_kv_curated_review_log.sql` — `kv_curated.review_log` table + index.
- `arei-admin/api/_curationLib.cjs` — pure helpers shared by the new endpoints:
  `buildListingsQuery(filters)`, `buildStatsQuery()`, `buildHistoryQuery(listingId)`. CJS so tests can `require` it (same reason as `_reviewerLib.cjs`).
- `arei-admin/api/kv-curation-stats.js` — `GET /api/kv-curation-stats`.
- `arei-admin/api/kv-curated-listing-history.js` — `GET /api/kv-curated-listing-history?id=<id>`.

**Modified server files**

- `arei-admin/api/kv-curated-listing.js` — extend list mode with query params and a LATERAL join for `last_review`; response becomes `{ items, totalCount }`.
- `arei-admin/api/review-listing.js` — write each verdict to `review_log`; return `review_log_id`.

**New client files**

- `arei-admin/curation/types.ts` — workspace-local types (`CurationFilters`, `CuratedListingWithLastReview`, status pill enum). Imports the canonical types from `../types`.
- `arei-admin/curation/CurationWorkspaceView.tsx` — orchestrator. Owns filter state, selection set, drawer-open id.
- `arei-admin/curation/DashboardStrip.tsx`
- `arei-admin/curation/FilterBar.tsx`
- `arei-admin/curation/InventoryTable.tsx`
- `arei-admin/curation/BulkActionBar.tsx`
- `arei-admin/curation/ListingDrawer.tsx`

**Modified client files**

- `arei-admin/types.ts` — add `last_review` to `CuratedListing`, plus `ReviewLogRow` and `CurationStats`.
- `arei-admin/data.ts` — add `getCuratedListings(filters)`, `getCurationStats()`, `getListingReviewHistory(id)`. Keep existing `getCuratedNeedsReviewList` as a thin wrapper.
- `arei-admin/app.tsx` — drop `"curated"` from `Tab` union and `LABS_NAV_ITEMS`; add `"curation"` to `Tab` union and `NAV_ITEMS`; render `<CurationWorkspaceView />`.

**Removed client files**

- `arei-admin/CuratedReviewView.tsx` — replaced by the new workspace.

**Unit test files**

- `tests/curationLib.test.cjs` — unit tests for the three pure helpers in `_curationLib.cjs`.

**Read-only reference (don't modify)**

- `docs/02-data-engine/kazaverde-curated-feed-operations.md` — hard rules for kv_curated access.
- `arei-admin/api/_endpointAuth.js` — auth/db helpers already in place.
- `arei-admin/api/_reviewerLib.cjs` — prior reviewer helpers; the new lib mirrors its style.
- `docs/FEED_CONTRACT.md` — canonical CV island list.

---

## Pre-flight

- [ ] **Step 0.1: Confirm the branch**

Run:
```bash
git rev-parse --abbrev-ref HEAD
```
Expected output: `feat/kv-listing-reviewer-agent` (this plan builds on the v1 reviewer agent that already shipped on this branch).

- [ ] **Step 0.2: Confirm prior tests still pass**

```bash
NODE_OPTIONS='' node --test tests/kvListingReviewer.test.cjs
```
Expected: `17 pass / 0 fail`. If anything fails, stop and fix before continuing.

- [ ] **Step 0.3: Confirm DATABASE_URL is reachable**

```bash
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
  npx ts-node --transpile-only -e "
    const pg = require('pg'); require('dotenv').config();
    (async () => {
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query('SELECT count(*) FROM kv_curated.listings');
      console.log('listings:', r.rows[0].count);
      await c.end();
    })();
  "
```
Expected: `listings: 469` (or whatever the live count is; non-zero is what matters).

---

## Task 1: Migration — `kv_curated.review_log`

**Files:**
- Create: `migrations/038_kv_curated_review_log.sql`

- [ ] **Step 1.1: Write the migration**

Create `migrations/038_kv_curated_review_log.sql`:
```sql
-- Migration: kv_curated.review_log
-- Date: 2026-06-01
--
-- Scope:
-- - create kv_curated.review_log to persist reviewer verdicts (one row per run)
--
-- Rollback note:
--   DROP TABLE IF EXISTS kv_curated.review_log;

begin;

create table if not exists kv_curated.review_log (
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

create index if not exists review_log_listing_id_idx
  on kv_curated.review_log (listing_id, created_at desc);

revoke all on kv_curated.review_log from anon;
revoke all on kv_curated.review_log from authenticated;

commit;
```

- [ ] **Step 1.2: Apply the migration**

```bash
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
  npx ts-node --transpile-only -e "
    const fs = require('fs'); const pg = require('pg'); require('dotenv').config();
    (async () => {
      const sql = fs.readFileSync('migrations/038_kv_curated_review_log.sql','utf8');
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      await c.query(sql);
      const r = await c.query(\"SELECT to_regclass('kv_curated.review_log') AS rel\");
      console.log('review_log present:', r.rows[0].rel);
      await c.end();
    })();
  "
```
Expected: `review_log present: kv_curated.review_log`.

- [ ] **Step 1.3: Commit**

```bash
git add migrations/038_kv_curated_review_log.sql
git commit -m "feat(db): kv_curated.review_log table"
```

---

## Task 2: Pure helper — `buildListingsQuery(filters)`

**Files:**
- Create: `arei-admin/api/_curationLib.cjs`
- Test: `tests/curationLib.test.cjs`

The lib is the new sibling to `_reviewerLib.cjs`. Same `.cjs` reason: arei-admin is `"type": "module"` so a `.js` here would be ESM and the CommonJS test cannot `require` it.

`buildListingsQuery` returns `{ text, values, countText, countValues }`. The same WHERE clause is reused for the total-count query so paging stays in sync. Filters that are unset must not appear in the SQL at all (no `WHERE foo IS NULL OR foo = $1` patterns).

- [ ] **Step 2.1: Write the failing tests**

Create `tests/curationLib.test.cjs`:
```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildListingsQuery } = require("../arei-admin/api/_curationLib.cjs");

test("buildListingsQuery with no filters returns all rows ordered by first_seen_at desc", () => {
  const { text, values } = buildListingsQuery({});
  assert.match(text, /FROM kv_curated\.listings l/);
  assert.match(text, /LEFT JOIN LATERAL/);
  assert.match(text, /ORDER BY l\.first_seen_at DESC NULLS LAST/);
  assert.match(text, /LIMIT \$\d+ OFFSET \$\d+/);
  // limit + offset are always present (default 200 / 0)
  assert.deepEqual(values, [200, 0]);
});

test("buildListingsQuery applies status filter when not 'all'", () => {
  const { text, values } = buildListingsQuery({ status: "needs_review" });
  assert.match(text, /l\.publish_status = \$1/);
  assert.equal(values[0], "needs_review");
});

test("buildListingsQuery skips status filter when 'all'", () => {
  const { text } = buildListingsQuery({ status: "all" });
  assert.doesNotMatch(text, /publish_status\s*=/);
});

test("buildListingsQuery rejects unknown status", () => {
  assert.throws(() => buildListingsQuery({ status: "weird" }), /status/);
});

test("buildListingsQuery applies source_id and island", () => {
  const { text, values } = buildListingsQuery({ source_id: "cv_remax", island: "Sal" });
  assert.match(text, /l\.source_id_primary = \$1/);
  assert.match(text, /l\.island = \$2/);
  assert.deepEqual(values.slice(0, 2), ["cv_remax", "Sal"]);
});

test("buildListingsQuery applies q against title and id (case-insensitive)", () => {
  const { text, values } = buildListingsQuery({ q: "vila verde" });
  assert.match(text, /\(l\.title ILIKE \$1 OR l\.id ILIKE \$1\)/);
  assert.equal(values[0], "%vila verde%");
});

test("buildListingsQuery applies price bounds", () => {
  const { text, values } = buildListingsQuery({ price_min: 50000, price_max: 100000 });
  assert.match(text, /l\.price >= \$1/);
  assert.match(text, /l\.price <= \$2/);
  assert.deepEqual(values.slice(0, 2), [50000, 100000]);
});

test("buildListingsQuery applies flagged_hide via LATERAL join", () => {
  const { text } = buildListingsQuery({ flagged_hide: true });
  // last_review.verdict = 'hide' AND publish_status != 'hidden'
  assert.match(text, /last_review\.verdict = 'hide'/);
  assert.match(text, /l\.publish_status <> 'hidden'/);
});

test("buildListingsQuery applies first_seen_after", () => {
  const { text, values } = buildListingsQuery({ first_seen_after: "2026-05-25" });
  assert.match(text, /l\.first_seen_at >= \$1/);
  assert.equal(values[0], "2026-05-25");
});

test("buildListingsQuery caps limit at 500", () => {
  const { values } = buildListingsQuery({ limit: 9999 });
  assert.equal(values[values.length - 2], 500);
});

test("buildListingsQuery countText reuses the same WHERE clause", () => {
  const q = buildListingsQuery({ status: "needs_review", source_id: "cv_remax" });
  assert.match(q.countText, /SELECT COUNT\(\*\) FROM kv_curated\.listings l/);
  assert.match(q.countText, /l\.publish_status = \$1/);
  assert.match(q.countText, /l\.source_id_primary = \$2/);
  // count query does NOT include the limit/offset values
  assert.deepEqual(q.countValues, ["needs_review", "cv_remax"]);
});
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: all tests fail with `Cannot find module '../arei-admin/api/_curationLib.cjs'`.

- [ ] **Step 2.3: Implement `buildListingsQuery`**

Create `arei-admin/api/_curationLib.cjs`:
```js
// Pure helpers for the curation workspace endpoints. No DB, no network,
// no env — so this file is unit-testable in isolation. CJS so the
// CommonJS tests in tests/*.test.cjs can require it directly.

const VALID_STATUS = new Set(["all", "published", "needs_review", "hidden"]);

const LIST_COLS = [
  "l.id",
  "l.publish_status",
  "l.title",
  "l.source_id_primary",
  "l.source_url_primary",
  "l.island",
  "l.city",
  "l.property_type",
  "l.bedrooms",
  "l.bathrooms",
  "l.price",
  "l.currency",
  "l.property_size_sqm",
  "l.land_area_sqm",
  "l.image_urls",
  "l.first_seen_at",
  "l.last_verified_at",
  // last_review fields (may be null when the listing has never been reviewed)
  "last_review.verdict     AS last_review_verdict",
  "last_review.confidence  AS last_review_confidence",
  "last_review.hide_reason AS last_review_hide_reason",
  "last_review.created_at  AS last_review_created_at",
].join(", ");

const FROM_AND_JOIN = `
  FROM kv_curated.listings l
  LEFT JOIN LATERAL (
    SELECT verdict, confidence, hide_reason, created_at
      FROM kv_curated.review_log r
     WHERE r.listing_id = l.id
     ORDER BY r.created_at DESC
     LIMIT 1
  ) last_review ON true
`;

function buildListingsQuery(filters) {
  filters = filters || {};
  const where = [];
  const values = [];
  let i = 1;

  if (filters.status && filters.status !== "all") {
    if (!VALID_STATUS.has(filters.status)) throw new Error("status must be one of " + [...VALID_STATUS].join("|"));
    where.push(`l.publish_status = $${i++}`); values.push(filters.status);
  }
  if (filters.source_id) {
    where.push(`l.source_id_primary = $${i++}`); values.push(filters.source_id);
  }
  if (filters.island) {
    where.push(`l.island = $${i++}`); values.push(filters.island);
  }
  if (filters.q) {
    where.push(`(l.title ILIKE $${i} OR l.id ILIKE $${i})`); values.push("%" + filters.q + "%"); i++;
  }
  if (filters.price_min != null) {
    where.push(`l.price >= $${i++}`); values.push(Number(filters.price_min));
  }
  if (filters.price_max != null) {
    where.push(`l.price <= $${i++}`); values.push(Number(filters.price_max));
  }
  if (filters.first_seen_after) {
    where.push(`l.first_seen_at >= $${i++}`); values.push(filters.first_seen_after);
  }
  if (filters.flagged_hide) {
    where.push(`last_review.verdict = 'hide' AND l.publish_status <> 'hidden'`);
  }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  // Cap limit at 500 even if a caller asks for more — the page is not paginated.
  const limit = Math.min(Number(filters.limit) || 200, 500);
  const offset = Number(filters.offset) || 0;
  const limitIdx = i++;
  const offsetIdx = i++;

  const text = `
    SELECT ${LIST_COLS}
    ${FROM_AND_JOIN}
    ${whereClause}
    ORDER BY l.first_seen_at DESC NULLS LAST
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countText = `
    SELECT COUNT(*)::int AS count
    ${FROM_AND_JOIN}
    ${whereClause}
  `;

  return {
    text,
    values: [...values, limit, offset],
    countText,
    countValues: values,
  };
}

module.exports = { buildListingsQuery };
```

- [ ] **Step 2.4: Run to confirm pass**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: all 10 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add arei-admin/api/_curationLib.cjs tests/curationLib.test.cjs
git commit -m "feat(admin): buildListingsQuery for curation workspace list endpoint"
```

---

## Task 3: Pure helper — `buildStatsQuery`

**Files:**
- Modify: `arei-admin/api/_curationLib.cjs`
- Modify: `tests/curationLib.test.cjs`

A single query returns the four dashboard tile values plus the
`needs_review_older_than_14d` sub-line. One round trip.

- [ ] **Step 3.1: Add failing tests**

Append to `tests/curationLib.test.cjs`:
```js
const { buildStatsQuery } = require("../arei-admin/api/_curationLib.cjs");

test("buildStatsQuery returns a single SELECT with the five aggregates", () => {
  const { text, values } = buildStatsQuery();
  assert.match(text, /count\(\*\) filter \(where l\.publish_status = 'published'\)\s+AS live/);
  assert.match(text, /count\(\*\) filter \(where l\.publish_status = 'needs_review'\)\s+AS needs_review/);
  assert.match(text, /AS needs_review_older_than_14d/);
  assert.match(text, /AS new_this_week/);
  assert.match(text, /AS agent_flagged/);
  // No bound parameters — the time windows use SQL interval literals
  assert.deepEqual(values, []);
});

test("buildStatsQuery uses LATERAL join for agent_flagged so it stays per-listing", () => {
  const { text } = buildStatsQuery();
  assert.match(text, /LATERAL/);
  assert.match(text, /last_review\.verdict = 'hide'/);
});
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: 2 new tests fail with `buildStatsQuery is not a function`.

- [ ] **Step 3.3: Implement `buildStatsQuery`**

Append to `arei-admin/api/_curationLib.cjs` (before the `module.exports`):
```js
function buildStatsQuery() {
  const text = `
    SELECT
      count(*) filter (where l.publish_status = 'published')   AS live,
      count(*) filter (where l.publish_status = 'needs_review') AS needs_review,
      count(*) filter (
        where l.publish_status = 'needs_review'
          and l.first_seen_at < now() - interval '14 days'
      ) AS needs_review_older_than_14d,
      count(*) filter (where l.first_seen_at >= now() - interval '7 days') AS new_this_week,
      count(*) filter (
        where last_review.verdict = 'hide'
          and l.publish_status <> 'hidden'
      ) AS agent_flagged
    FROM kv_curated.listings l
    LEFT JOIN LATERAL (
      SELECT verdict
        FROM kv_curated.review_log r
       WHERE r.listing_id = l.id
       ORDER BY r.created_at DESC
       LIMIT 1
    ) last_review ON true
  `;
  return { text, values: [] };
}
```

Update the export line at the bottom of `_curationLib.cjs`:
```js
module.exports = { buildListingsQuery, buildStatsQuery };
```

- [ ] **Step 3.4: Run to confirm pass**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: 12 pass, 0 fail.

- [ ] **Step 3.5: Commit**

```bash
git add arei-admin/api/_curationLib.cjs tests/curationLib.test.cjs
git commit -m "feat(admin): buildStatsQuery for curation dashboard tiles"
```

---

## Task 4: Pure helper — `buildHistoryQuery`

**Files:**
- Modify: `arei-admin/api/_curationLib.cjs`
- Modify: `tests/curationLib.test.cjs`

Returns the last 20 `review_log` rows for a single listing.

- [ ] **Step 4.1: Add failing tests**

Append to `tests/curationLib.test.cjs`:
```js
const { buildHistoryQuery } = require("../arei-admin/api/_curationLib.cjs");

test("buildHistoryQuery returns ordered, capped log rows for a single listing", () => {
  const { text, values } = buildHistoryQuery("hcv_xyz");
  assert.match(text, /FROM kv_curated\.review_log/);
  assert.match(text, /WHERE listing_id = \$1/);
  assert.match(text, /ORDER BY created_at DESC/);
  assert.match(text, /LIMIT 20/);
  assert.deepEqual(values, ["hcv_xyz"]);
});

test("buildHistoryQuery rejects missing listing id", () => {
  assert.throws(() => buildHistoryQuery(""), /listing_id/);
  assert.throws(() => buildHistoryQuery(null), /listing_id/);
});
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: 2 new tests fail with `buildHistoryQuery is not a function`.

- [ ] **Step 4.3: Implement `buildHistoryQuery`**

Append to `arei-admin/api/_curationLib.cjs` (before the `module.exports`):
```js
function buildHistoryQuery(listingId) {
  if (!listingId || typeof listingId !== "string") throw new Error("listing_id is required");
  return {
    text: `
      SELECT id, listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason, created_at
        FROM kv_curated.review_log
       WHERE listing_id = $1
       ORDER BY created_at DESC
       LIMIT 20
    `,
    values: [listingId],
  };
}
```

Update the export at the bottom of `_curationLib.cjs`:
```js
module.exports = { buildListingsQuery, buildStatsQuery, buildHistoryQuery };
```

- [ ] **Step 4.4: Run to confirm pass**

```bash
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: 14 pass, 0 fail.

- [ ] **Step 4.5: Commit**

```bash
git add arei-admin/api/_curationLib.cjs tests/curationLib.test.cjs
git commit -m "feat(admin): buildHistoryQuery for per-listing review history"
```

---

## Task 5: Evolve `GET /api/kv-curated-listing` to a filtered list

**Files:**
- Modify: `arei-admin/api/kv-curated-listing.js`

Keep the existing `?id=...` detail mode unchanged. Replace the no-param list mode with a filtered query driven by `buildListingsQuery`. The response becomes `{ items, totalCount }` on the list path; the detail path keeps returning the row directly.

- [ ] **Step 5.1: Rewrite the handler**

Replace `arei-admin/api/kv-curated-listing.js` with:
```js
// GET /api/kv-curated-listing            → filtered list of curated rows
// GET /api/kv-curated-listing?id=<id>    → single row with description
//
// Filter query params (list mode only):
//   status, source_id, island, q, price_min, price_max, first_seen_after,
//   flagged_hide (1), limit, offset

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildListingsQuery } = curationLib;

const DETAIL_COLS =
  "id, publish_status, title, source_id_primary, source_url_primary, island, city, " +
  "property_type, bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm, " +
  "image_urls, first_seen_at, last_verified_at, description";

function parseFilters(url) {
  const sp = url.searchParams;
  const getInt = (k) => {
    const v = sp.get(k);
    return v == null ? undefined : Number(v);
  };
  return {
    status: sp.get("status") || undefined,
    source_id: sp.get("source_id") || undefined,
    island: sp.get("island") || undefined,
    q: sp.get("q") || undefined,
    price_min: sp.get("price_min") != null ? getInt("price_min") : undefined,
    price_max: sp.get("price_max") != null ? getInt("price_max") : undefined,
    first_seen_after: sp.get("first_seen_after") || undefined,
    flagged_hide: sp.get("flagged_hide") === "1",
    limit: sp.get("limit") != null ? getInt("limit") : undefined,
    offset: sp.get("offset") != null ? getInt("offset") : undefined,
  };
}

function shapeListRow(r) {
  const last_review = r.last_review_created_at
    ? {
        verdict: r.last_review_verdict,
        confidence: r.last_review_confidence,
        hide_reason: r.last_review_hide_reason,
        created_at: r.last_review_created_at,
      }
    : null;
  // Drop the flattened last_review_* columns from the row.
  const {
    last_review_verdict, last_review_confidence, last_review_hide_reason, last_review_created_at,
    ...rest
  } = r;
  return { ...rest, last_review };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  const client = createPg();
  await client.connect();
  try {
    if (id) {
      const { rows } = await client.query(
        `SELECT ${DETAIL_COLS} FROM kv_curated.listings WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return send(res, 404, { error: "not found" });
      return send(res, 200, rows[0]);
    }

    let q;
    try { q = buildListingsQuery(parseFilters(url)); }
    catch (err) { return send(res, 400, { error: err.message }); }

    const [listRes, countRes] = await Promise.all([
      client.query(q.text, q.values),
      client.query(q.countText, q.countValues),
    ]);
    return send(res, 200, {
      items: listRes.rows.map(shapeListRow),
      totalCount: countRes.rows[0]?.count ?? 0,
    });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 5.2: Smoke-test against the real DB**

Create `arei-admin/_smoke-list.mjs`:
```js
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
process.env.ADMIN_SESSION_SECRET = "local-test";

const { default: handler } = await import("./api/kv-curated-listing.js");

function mockRes() {
  let _body;
  return { statusCode: 200, setHeader() {}, end(b) { _body = b; }, get body() { return _body; } };
}
async function run(name, url) {
  const res = mockRes();
  await handler({ method: "GET", url, headers: { cookie: "admin_session=local-test" } }, res);
  console.log(`\n=== ${name} ===\nstatus=${res.statusCode}\nbody=${(res.body || "").slice(0, 220)}`);
}
await run("all (no params)",       "/api/kv-curated-listing");
await run("status=needs_review",   "/api/kv-curated-listing?status=needs_review");
await run("status=published",      "/api/kv-curated-listing?status=published&limit=2");
await run("q=Vila",                "/api/kv-curated-listing?q=Vila");
await run("source_id=cv_remax",    "/api/kv-curated-listing?source_id=cv_remax");
await run("detail",                "/api/kv-curated-listing?id=hcv_0931b1abadab");
```

Run it from the repo root:
```bash
NODE_OPTIONS='' node arei-admin/_smoke-list.mjs
```

Expected: each `status` line is `200`. The `body=` previews each contain `"items":[…]` for list calls and a single object for the detail call. The `status=published&limit=2` body contains exactly two items. The `q=Vila` body contains rows whose title or id contains "Vila". Delete the script:
```bash
rm arei-admin/_smoke-list.mjs
```

- [ ] **Step 5.3: Commit**

```bash
git add arei-admin/api/kv-curated-listing.js
git commit -m "feat(admin): kv-curated-listing list mode accepts filters + last_review join"
```

---

## Task 6: New endpoint — `GET /api/kv-curation-stats`

**Files:**
- Create: `arei-admin/api/kv-curation-stats.js`

- [ ] **Step 6.1: Write the handler**

Create `arei-admin/api/kv-curation-stats.js`:
```js
// GET /api/kv-curation-stats
// Returns the four dashboard tile values plus the needs_review backlog age.

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildStatsQuery } = curationLib;

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const client = createPg();
  await client.connect();
  try {
    const { text, values } = buildStatsQuery();
    const { rows } = await client.query(text, values);
    const r = rows[0] || {};
    return send(res, 200, {
      live: Number(r.live) || 0,
      needs_review: Number(r.needs_review) || 0,
      needs_review_older_than_14d: Number(r.needs_review_older_than_14d) || 0,
      new_this_week: Number(r.new_this_week) || 0,
      agent_flagged: Number(r.agent_flagged) || 0,
    });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 6.2: Smoke-test**

Create `arei-admin/_smoke-stats.mjs`:
```js
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
process.env.ADMIN_SESSION_SECRET = "local-test";

const { default: handler } = await import("./api/kv-curation-stats.js");
function mockRes() { let b; return { statusCode: 200, setHeader() {}, end(x) { b = x; }, get body() { return b; } }; }
const res = mockRes();
await handler({ method: "GET", url: "/api/kv-curation-stats", headers: { cookie: "admin_session=local-test" } }, res);
console.log("status=", res.statusCode, "body=", res.body);
```

Run:
```bash
NODE_OPTIONS='' node arei-admin/_smoke-stats.mjs
```

Expected: `status= 200 body= {"live":425,"needs_review":44,"needs_review_older_than_14d":<N>,"new_this_week":<N>,"agent_flagged":0}` (the exact numbers will vary; the keys and types are what matters). Delete the script:
```bash
rm arei-admin/_smoke-stats.mjs
```

- [ ] **Step 6.3: Commit**

```bash
git add arei-admin/api/kv-curation-stats.js
git commit -m "feat(admin): kv-curation-stats endpoint for dashboard tiles"
```

---

## Task 7: Persist verdicts in `POST /api/review-listing`

**Files:**
- Modify: `arei-admin/api/review-listing.js`

After a successful `parseAndValidateVerdict`, insert one row into `kv_curated.review_log`. Return `review_log_id` alongside the verdict. If the insert fails, log it but still return the verdict — the operator already has the result and we shouldn't throw it away.

- [ ] **Step 7.1: Modify the handler**

In `arei-admin/api/review-listing.js`, replace the trailing block starting at `let verdict; try { verdict = parseAndValidateVerdict(raw); }` through the final `return send(...)` with:

```js
  let verdict;
  try { verdict = parseAndValidateVerdict(raw); }
  catch (err) { return send(res, 502, { error: err.message, raw }); }

  // Persist the verdict. Failures here are logged but not surfaced — the
  // operator already has the verdict in the response and re-running review
  // would just spend another model call to recover the same data.
  let review_log_id = null;
  try {
    const logClient = createPg();
    await logClient.connect();
    try {
      const { rows: logRows } = await logClient.query(
        `INSERT INTO kv_curated.review_log
           (listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
         RETURNING id`,
        [
          row.id,
          MODEL,
          verdict.verdict,
          verdict.confidence,
          JSON.stringify(verdict.reasons),
          JSON.stringify(verdict.suggested_patch),
          verdict.hide_reason ?? null,
        ],
      );
      review_log_id = logRows[0]?.id ?? null;
    } finally {
      await logClient.end();
    }
  } catch (err) {
    console.error("[review-listing] failed to insert review_log:", err.message);
  }

  return send(res, 200, { id: row.id, verdict, review_log_id });
```

- [ ] **Step 7.2: Smoke-test**

Create `arei-admin/_smoke-review.mjs`:
```js
import dotenv from "dotenv";
import path from "path";
import pg from "pg";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
process.env.ADMIN_SESSION_SECRET = "local-test";

const { default: handler } = await import("./api/review-listing.js");

function mockRes() { let b; return { statusCode: 200, setHeader() {}, end(x) { b = x; }, get body() { return b; } }; }
function mockReq(body) {
  const s = JSON.stringify(body); let d, e;
  const req = { method: "POST", url: "/api/review-listing", headers: { cookie: "admin_session=local-test" },
    on(ev, cb) { if (ev==="data") d=cb; if (ev==="end") e=cb; } };
  setImmediate(() => { d?.(s); e?.(); });
  return req;
}

const ID = "hcv_0931b1abadab";
const res = mockRes();
await handler(mockReq({ id: ID }), res);
const body = JSON.parse(res.body);
console.log("status:", res.statusCode, "review_log_id:", body.review_log_id, "verdict:", body.verdict.verdict);

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const { rows } = await c.query("SELECT id, listing_id, verdict, confidence FROM kv_curated.review_log WHERE id = $1", [body.review_log_id]);
console.log("DB row:", rows[0]);
await c.end();
```

Run:
```bash
NODE_OPTIONS='' node arei-admin/_smoke-review.mjs
```

Expected: `status: 200`, a non-null `review_log_id`, and the `DB row:` line shows that exact row with matching `listing_id` and `verdict`. Delete:
```bash
rm arei-admin/_smoke-review.mjs
```

- [ ] **Step 7.3: Commit**

```bash
git add arei-admin/api/review-listing.js
git commit -m "feat(admin): persist reviewer verdicts to kv_curated.review_log"
```

---

## Task 8: New endpoint — `GET /api/kv-curated-listing-history`

**Files:**
- Create: `arei-admin/api/kv-curated-listing-history.js`

- [ ] **Step 8.1: Write the handler**

Create `arei-admin/api/kv-curated-listing-history.js`:
```js
// GET /api/kv-curated-listing-history?id=<listing_id>
// Returns up to 20 review_log rows for the listing, most recent first.

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildHistoryQuery } = curationLib;

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "id is required" });

  let q;
  try { q = buildHistoryQuery(id); }
  catch (err) { return send(res, 400, { error: err.message }); }

  const client = createPg();
  await client.connect();
  try {
    const { rows } = await client.query(q.text, q.values);
    return send(res, 200, { items: rows });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 8.2: Smoke-test**

```bash
cat > arei-admin/_smoke-history.mjs <<'EOF'
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env") });
process.env.ADMIN_SESSION_SECRET = "local-test";
const { default: handler } = await import("./api/kv-curated-listing-history.js");
function mockRes() { let b; return { statusCode: 200, setHeader() {}, end(x) { b = x; }, get body() { return b; } }; }
async function run(name, url) {
  const res = mockRes();
  await handler({ method: "GET", url, headers: { cookie: "admin_session=local-test" } }, res);
  console.log(`\n=== ${name} ===\nstatus=${res.statusCode}\nbody=${(res.body || "").slice(0, 240)}`);
}
await run("missing id", "/api/kv-curated-listing-history");
await run("has id",     "/api/kv-curated-listing-history?id=hcv_0931b1abadab");
EOF
NODE_OPTIONS='' node arei-admin/_smoke-history.mjs
rm arei-admin/_smoke-history.mjs
```

Expected: missing-id call returns 400. The has-id call returns 200 with `{"items":[…]}` containing at least the row Task 7 just inserted.

- [ ] **Step 8.3: Commit**

```bash
git add arei-admin/api/kv-curated-listing-history.js
git commit -m "feat(admin): kv-curated-listing-history endpoint"
```

---

## Task 9: Extend client types

**Files:**
- Modify: `arei-admin/types.ts`

- [ ] **Step 9.1: Find the existing `CuratedListing` declaration**

Run:
```bash
grep -n "export interface CuratedListing" arei-admin/types.ts
```
Note the line number; you will edit this interface in the next step.

- [ ] **Step 9.2: Add `last_review`, `ReviewLogRow`, `CurationStats`, and the filter type**

In `arei-admin/types.ts`, locate the `CuratedListing` interface (added in the v1 reviewer plan, lives in the `// --- KV Curated reviewer ---` section). Replace it with the extended version below, and append the three new types immediately after the existing `ReviewVerdictResult` interface in the same section:

```ts
export interface CuratedListing {
  id: string;
  publish_status: "needs_review" | "published" | "hidden";
  title: string;
  description?: string | null;
  source_id_primary: string;
  source_url_primary: string | null;
  island: string;
  city: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number | null;
  currency: string | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  image_urls: string[];
  first_seen_at: string | null;
  last_verified_at: string | null;
  /** Most recent kv_curated.review_log row; null if never reviewed. */
  last_review?: {
    verdict: "publish" | "hold" | "hide";
    confidence: number;
    hide_reason: string | null;
    created_at: string;
  } | null;
}
```

Append (after `ReviewVerdictResult`):
```ts
export interface ReviewLogRow {
  id: number;
  listing_id: string;
  model: string;
  verdict: "publish" | "hold" | "hide";
  confidence: number;
  reasons: string[];
  suggested_patch: SuggestedPatch;
  hide_reason: string | null;
  created_at: string;
}

export interface CurationStats {
  live: number;
  needs_review: number;
  needs_review_older_than_14d: number;
  new_this_week: number;
  agent_flagged: number;
}

export interface CurationFilters {
  status?: "all" | "published" | "needs_review" | "hidden";
  source_id?: string;
  island?: string;
  q?: string;
  price_min?: number;
  price_max?: number;
  first_seen_after?: string;
  flagged_hide?: boolean;
  limit?: number;
  offset?: number;
}
```

- [ ] **Step 9.3: Commit**

```bash
git add arei-admin/types.ts
git commit -m "feat(admin): extend types for curation workspace (last_review, stats, filters, log row)"
```

---

## Task 10: Client data fetchers

**Files:**
- Modify: `arei-admin/data.ts`

- [ ] **Step 10.1: Update the import block to include the new types**

In `arei-admin/data.ts`, locate the existing import:
```ts
} from "./types";
```
and add `CurationFilters`, `CurationStats`, `ReviewLogRow` to the import list (keep the existing imports such as `CuratedListing`, `SuggestedPatch`, `ReviewVerdictResult`).

- [ ] **Step 10.2: Append the new client functions**

Append at the end of `arei-admin/data.ts`:
```ts
// --- KV curation workspace ---

function filtersToQueryString(filters: CurationFilters): string {
  const sp = new URLSearchParams();
  if (filters.status && filters.status !== "all") sp.set("status", filters.status);
  if (filters.source_id) sp.set("source_id", filters.source_id);
  if (filters.island) sp.set("island", filters.island);
  if (filters.q) sp.set("q", filters.q);
  if (filters.price_min != null) sp.set("price_min", String(filters.price_min));
  if (filters.price_max != null) sp.set("price_max", String(filters.price_max));
  if (filters.first_seen_after) sp.set("first_seen_after", filters.first_seen_after);
  if (filters.flagged_hide) sp.set("flagged_hide", "1");
  if (filters.limit != null) sp.set("limit", String(filters.limit));
  if (filters.offset != null) sp.set("offset", String(filters.offset));
  const s = sp.toString();
  return s ? "?" + s : "";
}

export async function getCuratedListings(filters: CurationFilters = {}): Promise<{ items: CuratedListing[]; totalCount: number }> {
  const res = await fetch("/api/kv-curated-listing" + filtersToQueryString(filters), {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error(`getCuratedListings: ${res.status} ${await res.text()}`);
  return (await res.json()) as { items: CuratedListing[]; totalCount: number };
}

export async function getCurationStats(): Promise<CurationStats> {
  const res = await fetch("/api/kv-curation-stats", { headers: { ...(await authHeader()) } });
  if (!res.ok) throw new Error(`getCurationStats: ${res.status} ${await res.text()}`);
  return (await res.json()) as CurationStats;
}

export async function getListingReviewHistory(id: string): Promise<ReviewLogRow[]> {
  const res = await fetch(`/api/kv-curated-listing-history?id=${encodeURIComponent(id)}`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error(`getListingReviewHistory: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.items as ReviewLogRow[];
}
```

- [ ] **Step 10.3: Rewrite the existing `getCuratedNeedsReviewList`**

Locate the existing `getCuratedNeedsReviewList` function (added in the v1 reviewer plan, returns `Promise<CuratedListing[]>`). Replace its body so it delegates to the new endpoint and so existing callers keep working:
```ts
export async function getCuratedNeedsReviewList(): Promise<CuratedListing[]> {
  const { items } = await getCuratedListings({ status: "needs_review" });
  return items;
}
```

- [ ] **Step 10.4: Commit**

```bash
git add arei-admin/data.ts
git commit -m "feat(admin): client fetchers for curation workspace (list, stats, history)"
```

---

## Task 11: Workspace types and orchestrator skeleton

**Files:**
- Create: `arei-admin/curation/types.ts`
- Create: `arei-admin/curation/CurationWorkspaceView.tsx`

The orchestrator owns state and renders the four sub-components (Dashboard, FilterBar, InventoryTable, BulkActionBar) plus the drawer when an id is open. Sub-components are added in Tasks 12–16; for this task we stub them as placeholders so the page renders.

- [ ] **Step 11.1: Create the workspace-local types**

Create `arei-admin/curation/types.ts`:
```ts
import type { CuratedListing, CurationStats, CurationFilters, ReviewVerdict } from "../types";

export type SelectionSet = Set<string>;

/** State stored in the workspace orchestrator. */
export interface WorkspaceState {
  filters: CurationFilters;
  listings: CuratedListing[];
  totalCount: number;
  stats: CurationStats | null;
  selectedIds: SelectionSet;
  openId: string | null;
  /** Verdicts produced this session, keyed by listing id. Drives the "Reviewed
   *  just now" pill without re-fetching the row. */
  ephemeralVerdicts: Record<string, ReviewVerdict>;
  loadingList: boolean;
  loadingStats: boolean;
  error: string | null;
}
```

- [ ] **Step 11.2: Create the orchestrator with placeholder children**

Create `arei-admin/curation/CurationWorkspaceView.tsx`:
```tsx
import { useCallback, useEffect, useState } from "react";
import { getCurationStats, getCuratedListings } from "../data";
import type { CuratedListing, CurationFilters, CurationStats, ReviewVerdict } from "../types";

export function CurationWorkspaceView() {
  const [filters, setFilters] = useState<CurationFilters>({ status: "needs_review" });
  const [listings, setListings] = useState<CuratedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [ephemeralVerdicts, setEphemeralVerdicts] = useState<Record<string, ReviewVerdict>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStats = useCallback(async () => {
    setLoadingStats(true);
    try { setStats(await getCurationStats()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingStats(false); }
  }, []);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const { items, totalCount } = await getCuratedListings(filters);
      setListings(items);
      setTotalCount(totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, [filters]);

  useEffect(() => { void reloadStats(); }, [reloadStats]);
  useEffect(() => { void reloadList(); }, [reloadList]);

  const onRowSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4">
      {error && <div className="text-xs text-red">{error}</div>}

      {/* placeholders — replaced by sub-components in later tasks */}
      <section className="border border-border-strong rounded p-3 text-xs text-foreground-muted">
        Dashboard placeholder · stats: {stats ? JSON.stringify(stats) : "loading…"}
      </section>

      <section className="border border-border-strong rounded p-3 text-xs text-foreground-muted">
        FilterBar placeholder · current filters: {JSON.stringify(filters)}
        <div className="mt-2 flex gap-2">
          <button className="underline" onClick={() => setFilters({ status: "all" })}>all</button>
          <button className="underline" onClick={() => setFilters({ status: "needs_review" })}>needs_review</button>
          <button className="underline" onClick={() => setFilters({ status: "published" })}>published</button>
        </div>
      </section>

      <section className="border border-border-strong rounded p-3 text-xs">
        Table placeholder · {loadingList ? "loading…" : `${listings.length} of ${totalCount} rows`}
        <ul className="mt-2 space-y-1">
          {listings.slice(0, 10).map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => onRowSelectToggle(l.id)} />
              <button className="underline" onClick={() => setOpenId(l.id)}>{l.id}</button>
              <span className="text-foreground-muted">· {l.publish_status} · {l.title.slice(0, 60)}</span>
            </li>
          ))}
        </ul>
      </section>

      {openId && (
        <aside className="fixed right-0 top-0 h-full w-[420px] bg-surface-2 border-l border-border-strong p-4 overflow-y-auto">
          <button className="text-xs underline" onClick={() => setOpenId(null)}>close</button>
          <div className="text-xs mt-2">Drawer placeholder for {openId}</div>
        </aside>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface-3 border-t border-border-strong text-xs">
          BulkActionBar placeholder · {selectedIds.size} selected
          <button className="ml-2 underline" onClick={() => setSelectedIds(new Set())}>clear</button>
        </div>
      )}

      {/* ephemeralVerdicts is wired through for sub-components; surface it for now */}
      {Object.keys(ephemeralVerdicts).length > 0 && (
        <div className="text-xs text-foreground-muted">{Object.keys(ephemeralVerdicts).length} ephemeral verdicts</div>
      )}
    </div>
  );
}
```

- [ ] **Step 11.3: Commit**

```bash
git add arei-admin/curation/types.ts arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): workspace orchestrator skeleton with placeholders"
```

---

## Task 12: Wire workspace into nav (replace the old Labs entry)

**Files:**
- Modify: `arei-admin/app.tsx`

- [ ] **Step 12.1: Replace the import**

In `arei-admin/app.tsx`, find this line:
```ts
import { CuratedReviewView } from "./CuratedReviewView";
```
and replace it with:
```ts
import { CurationWorkspaceView } from "./curation/CurationWorkspaceView";
```

- [ ] **Step 12.2: Update the `Tab` union**

Find:
```ts
type Tab = "dashboard" | "listings" | "sources" | "chatlab" | "agencies" | "agency-data" | "broker-pilot" | "market-news" | "marketing" | "notifications" | "featured" | "curated";
```
Replace with:
```ts
type Tab = "dashboard" | "listings" | "sources" | "chatlab" | "agencies" | "agency-data" | "broker-pilot" | "market-news" | "marketing" | "notifications" | "featured" | "curation";
```

- [ ] **Step 12.3: Move the entry from Labs to top-level nav**

Find:
```ts
const LABS_NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: "broker-pilot", label: "Legacy Broker Preview" },
  { key: "chatlab",      label: "Chat Lab"              },
  { key: "curated",      label: "Curated Review"        },
];
```
Replace with:
```ts
const LABS_NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: "broker-pilot", label: "Legacy Broker Preview" },
  { key: "chatlab",      label: "Chat Lab"              },
];
```

And in `NAV_ITEMS`, insert `Curation` between `sources` (Listings) and `market-news`:
```ts
const NAV_ITEMS: { key: Tab; label: string }[] = [
  { key: "dashboard",     label: "Dashboard"     },
  { key: "sources",       label: "Listings"      },
  { key: "curation",      label: "Curation"      },
  { key: "market-news",   label: "Market News"   },
  { key: "featured",      label: "Featured"      },
  { key: "marketing",     label: "Marketing"     },
  { key: "notifications", label: "Notifications" },
];
```

- [ ] **Step 12.4: Update the render conditional**

Find:
```tsx
{tab === "chatlab" && <PropertyChatLabView />}
{tab === "curated" && <CuratedReviewView />}
```
Replace with:
```tsx
{tab === "chatlab" && <PropertyChatLabView />}
{tab === "curation" && <CurationWorkspaceView />}
```

- [ ] **Step 12.5: Delete the obsolete v1 view**

```bash
git rm arei-admin/CuratedReviewView.tsx
```

- [ ] **Step 12.6: Dev-server smoke**

```bash
kill $(cat /Users/violetapalomerasilva/.claude/jobs/dd837e16/vite.pid 2>/dev/null) 2>/dev/null || true
cd arei-admin
DEV_AUTH_BYPASS=1 NODE_OPTIONS='' nohup npx vite > "$CLAUDE_JOB_DIR/vite.log" 2>&1 &
echo $! > "$CLAUDE_JOB_DIR/vite.pid"
sleep 6
curl -sS -o /dev/null -w "spa=%{http_code}\n" http://localhost:3099/
curl -sS http://localhost:3099/api/kv-curation-stats | head -c 200; echo
curl -sS "http://localhost:3099/api/kv-curated-listing?status=needs_review&limit=3" | head -c 200; echo
```
Expected: `spa=200`, stats body returns a JSON object with `live`/`needs_review` keys, list body returns `{"items":[…],"totalCount":<N>}`.

Open `http://localhost:3099` in a browser, click the new **Curation** tab in the top nav (should not be under Labs anymore). The placeholder page renders with current filters, a small list of listings, and the dashboard preview line.

- [ ] **Step 12.7: Commit**

```bash
git add arei-admin/app.tsx
git commit -m "feat(admin): replace Labs 'Curated Review' with top-level Curation tab"
```

---

## Task 13: `DashboardStrip` sub-component

**Files:**
- Create: `arei-admin/curation/DashboardStrip.tsx`
- Modify: `arei-admin/curation/CurationWorkspaceView.tsx`

- [ ] **Step 13.1: Create the strip**

Create `arei-admin/curation/DashboardStrip.tsx`:
```tsx
import type { CurationFilters, CurationStats } from "../types";

interface Props {
  stats: CurationStats | null;
  loading: boolean;
  onApplyFilter: (filters: CurationFilters) => void;
  currentFilters: CurationFilters;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardStrip({ stats, loading, onApplyFilter, currentFilters }: Props) {
  const active = (predicate: boolean) => predicate ? "ring-1 ring-sage" : "";
  const liveActive    = currentFilters.status === "published" ? active(true) : "";
  const needsActive   = currentFilters.status === "needs_review" ? active(true) : "";
  const newActive     = currentFilters.first_seen_after ? active(true) : "";
  const flaggedActive = currentFilters.flagged_hide ? active(true) : "";

  const tile = (border: string, label: string, value: string | number, detail: string, onClick: () => void, activeCls: string) => (
    <button
      onClick={onClick}
      className={`text-left bg-surface-2 border ${border} rounded p-3 hover:bg-surface-3 transition-colors ${activeCls}`}
    >
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{loading && stats == null ? "…" : value}</div>
      <div className="text-[10px] text-foreground-muted mt-1">{detail}</div>
    </button>
  );

  return (
    <section className="grid grid-cols-4 gap-2">
      {tile(
        "border-border-strong",
        "Live feed",
        stats?.live ?? "—",
        "public.v1_feed_cv (published)",
        () => onApplyFilter({ status: "published" }),
        liveActive,
      )}
      {tile(
        "border-amber",
        "Needs review",
        stats?.needs_review ?? "—",
        stats ? `${stats.needs_review_older_than_14d} aged >14d` : "",
        () => onApplyFilter({ status: "needs_review" }),
        needsActive,
      )}
      {tile(
        "border-border-strong",
        "New this week",
        stats?.new_this_week ?? "—",
        "first_seen_at ≥ 7d ago",
        () => onApplyFilter({ status: "all", first_seen_after: isoDaysAgo(7) }),
        newActive,
      )}
      {tile(
        "border-red",
        "Agent flagged",
        stats?.agent_flagged ?? "—",
        "last verdict = hide, still queued",
        () => onApplyFilter({ status: "all", flagged_hide: true }),
        flaggedActive,
      )}
    </section>
  );
}
```

- [ ] **Step 13.2: Wire into the workspace**

In `arei-admin/curation/CurationWorkspaceView.tsx`, add the import:
```tsx
import { DashboardStrip } from "./DashboardStrip";
```
Replace the Dashboard placeholder section:
```tsx
<section className="border border-border-strong rounded p-3 text-xs text-foreground-muted">
  Dashboard placeholder · stats: {stats ? JSON.stringify(stats) : "loading…"}
</section>
```
with:
```tsx
<DashboardStrip
  stats={stats}
  loading={loadingStats}
  currentFilters={filters}
  onApplyFilter={(f) => setFilters(f)}
/>
```

- [ ] **Step 13.3: Visual check**

Refresh `http://localhost:3099` and click into Curation. Expected: four tiles render, each shows a number, clicking a tile changes the filter (the existing list-of-10 placeholder below updates).

- [ ] **Step 13.4: Commit**

```bash
git add arei-admin/curation/DashboardStrip.tsx arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): DashboardStrip with click-to-filter tiles"
```

---

## Task 14: `FilterBar` sub-component

**Files:**
- Create: `arei-admin/curation/FilterBar.tsx`
- Modify: `arei-admin/curation/CurationWorkspaceView.tsx`

The bar exposes status, source, island, price range, and a text search. Source options are derived from the listings list (so it's always in sync with what's actually in the data). Island options are the canonical 9 CV islands.

- [ ] **Step 14.1: Create the bar**

Create `arei-admin/curation/FilterBar.tsx`:
```tsx
import { useMemo, useState } from "react";
import type { CurationFilters, CuratedListing } from "../types";

const CV_ISLANDS = [
  "Boa Vista", "Brava", "Fogo", "Maio", "Sal",
  "Santiago", "Santo Antão", "São Nicolau", "São Vicente",
];

interface Props {
  filters: CurationFilters;
  totalCount: number;
  listings: CuratedListing[];           // used to derive source-id options
  onChange: (next: CurationFilters) => void;
}

export function FilterBar({ filters, totalCount, listings, onChange }: Props) {
  const [q, setQ] = useState(filters.q ?? "");
  const sourceIds = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) set.add(l.source_id_primary);
    return Array.from(set).sort();
  }, [listings]);

  function update(delta: Partial<CurationFilters>) {
    onChange({ ...filters, ...delta });
  }

  function clearAll() {
    setQ("");
    onChange({ status: "all" });
  }

  function statusChip(value: NonNullable<CurationFilters["status"]>, label: string) {
    const active = filters.status === value || (value === "all" && !filters.status);
    return (
      <button
        onClick={() => update({ status: value })}
        className={
          "px-3 py-1 rounded-full text-xs border " +
          (active ? "bg-sage-deep text-white border-sage-deep" : "border-border-strong hover:bg-surface-3")
        }
      >
        {label}
      </button>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {statusChip("all", "All")}
        {statusChip("needs_review", "Needs review")}
        {statusChip("published", "Live")}
        {statusChip("hidden", "Hidden")}

        <select
          value={filters.source_id ?? ""}
          onChange={(e) => update({ source_id: e.target.value || undefined })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent"
        >
          <option value="">source: any</option>
          {sourceIds.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.island ?? ""}
          onChange={(e) => update({ island: e.target.value || undefined })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent"
        >
          <option value="">island: any</option>
          {CV_ISLANDS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        <input
          type="number"
          placeholder="min €"
          value={filters.price_min ?? ""}
          onChange={(e) => update({ price_min: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-24"
        />
        <input
          type="number"
          placeholder="max €"
          value={filters.price_max ?? ""}
          onChange={(e) => update({ price_max: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-24"
        />

        <form
          onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
          className="flex items-center gap-1"
        >
          <input
            type="search"
            placeholder="search title or id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-48"
          />
        </form>

        <button onClick={clearAll} className="text-xs underline ml-1">clear</button>
        <span className="ml-auto text-xs text-foreground-muted">{totalCount} results</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 14.2: Wire into the workspace**

In `arei-admin/curation/CurationWorkspaceView.tsx`, add the import:
```tsx
import { FilterBar } from "./FilterBar";
```
Replace the FilterBar placeholder section:
```tsx
<section className="border border-border-strong rounded p-3 text-xs text-foreground-muted">
  FilterBar placeholder · current filters: {JSON.stringify(filters)}
  <div className="mt-2 flex gap-2">
    <button className="underline" onClick={() => setFilters({ status: "all" })}>all</button>
    <button className="underline" onClick={() => setFilters({ status: "needs_review" })}>needs_review</button>
    <button className="underline" onClick={() => setFilters({ status: "published" })}>published</button>
  </div>
</section>
```
with:
```tsx
<FilterBar
  filters={filters}
  totalCount={totalCount}
  listings={listings}
  onChange={setFilters}
/>
```

- [ ] **Step 14.3: Visual check**

Refresh. Expected: chips Active state highlights, switching status changes the placeholder list count, source/island/price/search inputs all drive `setFilters` (and thus the placeholder list).

- [ ] **Step 14.4: Commit**

```bash
git add arei-admin/curation/FilterBar.tsx arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): FilterBar with status chips + source/island/price/search"
```

---

## Task 15: `InventoryTable` sub-component

**Files:**
- Create: `arei-admin/curation/InventoryTable.tsx`
- Modify: `arei-admin/curation/CurationWorkspaceView.tsx`

- [ ] **Step 15.1: Create the table**

Create `arei-admin/curation/InventoryTable.tsx`:
```tsx
import type { CuratedListing } from "../types";

interface Props {
  rows: CuratedListing[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenRow: (id: string) => void;
}

function fmtPrice(p: number | null, ccy: string | null): string {
  if (p == null) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(p) + (ccy ? " " + ccy : "");
}

function statusPill(status: CuratedListing["publish_status"]) {
  const cls =
    status === "published"   ? "bg-green-muted text-green"
    : status === "needs_review" ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-2 py-0.5 text-[10px] rounded ${cls}`}>{status}</span>;
}

function lastReviewPill(r: CuratedListing["last_review"]) {
  if (!r) return null;
  const cls =
    r.verdict === "publish" ? "bg-green-muted text-green"
    : r.verdict === "hold"  ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-1.5 py-0.5 text-[9px] rounded ${cls}`} title={`reviewed ${new Date(r.created_at).toLocaleString()}`}>{r.verdict}</span>;
}

function NullableNum({ value }: { value: number | null }) {
  if (value == null) return <span className="text-red">—</span>;
  return <span>{value}</span>;
}

export function InventoryTable({ rows, loading, selectedIds, onToggleSelect, onToggleSelectAll, onOpenRow }: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <section className="border border-border-strong rounded overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-surface-2 text-foreground-muted">
          <tr>
            <th className="px-2 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} /></th>
            <th className="px-2 py-2 w-12 text-left">img</th>
            <th className="px-2 py-2 w-24 text-left">status</th>
            <th className="px-2 py-2 text-left">title</th>
            <th className="px-2 py-2 text-left w-40">source</th>
            <th className="px-2 py-2 text-left w-40">island · city</th>
            <th className="px-2 py-2 text-left w-28">type</th>
            <th className="px-2 py-2 text-right w-24">price</th>
            <th className="px-2 py-2 text-right w-24">b/b/m²</th>
            <th className="px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && (
            <tr><td colSpan={10} className="px-2 py-6 text-center text-foreground-muted">loading…</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={10} className="px-2 py-6 text-center text-foreground-muted">no rows match the current filters</td></tr>
          )}
          {rows.map((l) => {
            const sel = selectedIds.has(l.id);
            return (
              <tr key={l.id} className={"border-t border-border-strong " + (sel ? "bg-surface-2" : "hover:bg-surface-2")}>
                <td className="px-2 py-2 align-top">
                  <input type="checkbox" checked={sel} onChange={() => onToggleSelect(l.id)} onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-2 py-2 align-top">
                  {l.image_urls[0]
                    ? <img src={l.image_urls[0]} alt="" className="w-10 h-7 object-cover rounded" loading="lazy" />
                    : <div className="w-10 h-7 bg-surface-3 rounded" />}
                </td>
                <td className="px-2 py-2 align-top">
                  <div>{statusPill(l.publish_status)}</div>
                  <div className="mt-0.5">{lastReviewPill(l.last_review)}</div>
                </td>
                <td className="px-2 py-2 align-top cursor-pointer" onClick={() => onOpenRow(l.id)}>
                  <div className="font-medium truncate max-w-[36ch]" title={l.title}>{l.title}</div>
                  <div className="text-[10px] text-foreground-muted font-mono">{l.id}</div>
                </td>
                <td className="px-2 py-2 align-top text-foreground-muted">{l.source_id_primary}</td>
                <td className="px-2 py-2 align-top">{l.island}{l.city ? ` · ${l.city}` : ""}</td>
                <td className="px-2 py-2 align-top">{l.property_type ?? <span className="text-red">—</span>}</td>
                <td className="px-2 py-2 align-top text-right tabular-nums">{fmtPrice(l.price, l.currency)}</td>
                <td className="px-2 py-2 align-top text-right tabular-nums">
                  <NullableNum value={l.bedrooms} />/
                  <NullableNum value={l.bathrooms} />/
                  <NullableNum value={l.property_size_sqm} />
                </td>
                <td className="px-2 py-2 align-top">
                  <button onClick={() => onOpenRow(l.id)} className="text-xs underline">↗</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 15.2: Wire into the workspace**

In `arei-admin/curation/CurationWorkspaceView.tsx`, add the import:
```tsx
import { InventoryTable } from "./InventoryTable";
```
Add a `toggleSelectAll` callback after the existing `onRowSelectToggle`:
```tsx
const onToggleSelectAll = () => {
  setSelectedIds((prev) => {
    const allCurrentlySelected = listings.every((l) => prev.has(l.id));
    if (allCurrentlySelected) return new Set();
    const next = new Set(prev);
    for (const l of listings) next.add(l.id);
    return next;
  });
};
```

Replace the table placeholder section:
```tsx
<section className="border border-border-strong rounded p-3 text-xs">
  Table placeholder · {loadingList ? "loading…" : `${listings.length} of ${totalCount} rows`}
  <ul className="mt-2 space-y-1">
    {listings.slice(0, 10).map((l) => (
      <li key={l.id} className="flex items-center gap-2">
        <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => onRowSelectToggle(l.id)} />
        <button className="underline" onClick={() => setOpenId(l.id)}>{l.id}</button>
        <span className="text-foreground-muted">· {l.publish_status} · {l.title.slice(0, 60)}</span>
      </li>
    ))}
  </ul>
</section>
```
with:
```tsx
<InventoryTable
  rows={listings}
  loading={loadingList}
  selectedIds={selectedIds}
  onToggleSelect={onRowSelectToggle}
  onToggleSelectAll={onToggleSelectAll}
  onOpenRow={setOpenId}
/>
```

- [ ] **Step 15.3: Visual check**

Refresh. Expected: a table with thumbnails, status pills, last-review pills (only for rows reviewed in Task 7's smoke test), red "—" placeholders on null bedrooms/sqm. Switching filters refilters the table; clicking a row opens the placeholder drawer; selecting checkboxes drives the placeholder bulk bar.

- [ ] **Step 15.4: Commit**

```bash
git add arei-admin/curation/InventoryTable.tsx arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): InventoryTable with thumbnails, status pills, last_review pill"
```

---

## Task 16: `ListingDrawer` sub-component

**Files:**
- Create: `arei-admin/curation/ListingDrawer.tsx`
- Modify: `arei-admin/curation/CurationWorkspaceView.tsx`

The drawer re-implements the v1 `CuratedDetail` flow against the new endpoints, plus the review-history section.

- [ ] **Step 16.1: Create the drawer**

Create `arei-admin/curation/ListingDrawer.tsx`:
```tsx
import { useEffect, useState } from "react";
import {
  applyListingPatch,
  getCuratedListing,
  getListingReviewHistory,
  reviewListing,
} from "../data";
import type { CuratedListing, ReviewLogRow, ReviewVerdict, SuggestedPatch } from "../types";

interface Props {
  id: string;
  onClose: () => void;
  onApplied: () => void;             // ask the parent to reload list + stats
  ephemeralVerdict?: ReviewVerdict;  // if a bulk-review already produced one
  onVerdictProduced: (id: string, v: ReviewVerdict) => void;
}

export function ListingDrawer({ id, onClose, onApplied, ephemeralVerdict, onVerdictProduced }: Props) {
  const [listing, setListing] = useState<CuratedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(ephemeralVerdict ?? null);
  const [reviewing, setReviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(
    new Set(ephemeralVerdict ? Object.keys(ephemeralVerdict.suggested_patch) : [])
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ReviewLogRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setListing(null); setLoading(true); setError(null); setVerdict(ephemeralVerdict ?? null);
    setAcceptedKeys(new Set(ephemeralVerdict ? Object.keys(ephemeralVerdict.suggested_patch) : []));
    setHistory(null); setHistoryOpen(false);
    (async () => {
      try {
        const l = await getCuratedListing(id);
        if (!cancelled) setListing(l);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, ephemeralVerdict]);

  async function runReview() {
    setReviewing(true); setError(null);
    try {
      const r = await reviewListing(id);
      setVerdict(r.verdict);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
      onVerdictProduced(id, r.verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  }

  function toggleKey(k: string) {
    setAcceptedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  async function apply(publishStatus?: "published" | "hidden") {
    if (!verdict || !listing) return;
    const subset: SuggestedPatch = {};
    for (const k of acceptedKeys) {
      (subset as Record<string, unknown>)[k] = (verdict.suggested_patch as Record<string, unknown>)[k];
    }
    setApplying(true); setError(null);
    try {
      await applyListingPatch(listing.id, subset, publishStatus);
      onApplied();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    if (history == null) {
      try { setHistory(await getListingReviewHistory(id)); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    }
  }

  const patchEntries = verdict ? Object.entries(verdict.suggested_patch) : [];

  return (
    <aside className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-border-strong p-4 overflow-y-auto z-30">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs underline">close</button>
        {listing?.source_url_primary && (
          <a href={listing.source_url_primary} target="_blank" rel="noopener noreferrer" className="text-xs underline">view source ↗</a>
        )}
      </div>

      {loading && <div className="mt-3 text-xs text-foreground-muted">loading…</div>}
      {error && <div className="mt-3 text-xs text-red">{error}</div>}

      {listing && (
        <>
          <div className="mt-3 text-[10px] font-mono text-foreground-muted">{listing.id}</div>
          <h2 className="text-base font-semibold">{listing.title}</h2>

          {listing.image_urls.length > 0 && (
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {listing.image_urls.slice(0, 8).map((u, i) => (
                <img key={i} src={u} alt="" className="w-20 h-14 object-cover rounded" loading="lazy" />
              ))}
              {listing.image_urls.length > 8 && (
                <div className="self-center text-xs text-foreground-muted">+{listing.image_urls.length - 8}</div>
              )}
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Row label="island" value={listing.island} />
            <Row label="city" value={listing.city} />
            <Row label="type" value={listing.property_type} />
            <Row label="status" value={listing.publish_status} />
            <Row label="price" value={listing.price} />
            <Row label="bedrooms" value={listing.bedrooms} highlightNull />
            <Row label="bathrooms" value={listing.bathrooms} highlightNull />
            <Row label="sqm" value={listing.property_size_sqm} highlightNull />
            <Row label="land sqm" value={listing.land_area_sqm} />
            <Row label="images" value={listing.image_urls.length} />
          </dl>

          {listing.description && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-foreground-muted">description</summary>
              <pre className="whitespace-pre-wrap mt-2 text-[11px]">
                {listing.description.slice(0, 1500)}{listing.description.length > 1500 ? "…" : ""}
              </pre>
            </details>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={runReview}
              disabled={reviewing}
              className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
            >
              {reviewing ? "Reviewing…" : verdict ? "Re-review" : "Run review"}
            </button>
          </div>

          {verdict && (
            <div className="mt-3 border-t border-border-strong pt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Verdict v={verdict.verdict} />
                <span className="text-foreground-muted">confidence {(verdict.confidence * 100).toFixed(0)}%</span>
                {verdict.hide_reason && <span className="text-foreground-muted italic">{verdict.hide_reason}</span>}
              </div>
              <ul className="list-disc pl-5 text-xs space-y-1">
                {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>

              {patchEntries.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">Suggested patch</div>
                  <table className="text-xs w-full">
                    <thead className="text-foreground-muted">
                      <tr><th /><th className="text-left">field</th><th className="text-left">current</th><th className="text-left">suggested</th></tr>
                    </thead>
                    <tbody>
                      {patchEntries.map(([k, v]) => (
                        <tr key={k} className="border-t border-border-strong">
                          <td className="py-1"><input type="checkbox" checked={acceptedKeys.has(k)} onChange={() => toggleKey(k)} /></td>
                          <td className="font-mono">{k}</td>
                          <td>{String((listing as Record<string, unknown>)[k] ?? "—")}</td>
                          <td>{String(v ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => apply()}
                  disabled={applying || acceptedKeys.size === 0}
                  className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
                >Apply selected</button>
                <button
                  onClick={() => apply("published")}
                  disabled={applying}
                  className="px-3 py-1.5 text-sm rounded bg-green-muted text-green border border-border-strong hover:opacity-80 disabled:opacity-50"
                >Apply + Publish</button>
                <button
                  onClick={() => apply("hidden")}
                  disabled={applying}
                  className="px-3 py-1.5 text-sm rounded bg-red-muted text-red border border-border-strong hover:opacity-80 disabled:opacity-50"
                >Hide</button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-border-strong pt-3">
            {!historyOpen ? (
              <button onClick={openHistory} className="text-xs underline">show review history</button>
            ) : (
              <>
                <div className="text-xs font-medium mb-2">Review history</div>
                {history == null && <div className="text-xs text-foreground-muted">loading…</div>}
                {history && history.length === 0 && <div className="text-xs text-foreground-muted">no past reviews</div>}
                {history && history.map((h) => (
                  <div key={h.id} className="border-t border-border-strong py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Verdict v={h.verdict} />
                      <span className="text-foreground-muted">{(h.confidence * 100).toFixed(0)}%</span>
                      <span className="text-foreground-muted ml-auto">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    {h.reasons.length > 0 && (
                      <ul className="list-disc pl-5 mt-1 text-foreground-muted">
                        {h.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function Row({ label, value, highlightNull }: { label: string; value: unknown; highlightNull?: boolean }) {
  const isNull = value == null || value === "";
  return (
    <>
      <dt className="text-foreground-muted">{label}</dt>
      <dd className={"font-mono " + (isNull && highlightNull ? "text-red" : "")}>{isNull ? "—" : String(value)}</dd>
    </>
  );
}

function Verdict({ v }: { v: "publish" | "hold" | "hide" }) {
  const cls =
    v === "publish" ? "bg-green-muted text-green"
    : v === "hold"  ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-2 py-0.5 text-[10px] rounded border border-border-strong ${cls}`}>{v}</span>;
}
```

- [ ] **Step 16.2: Wire into the workspace**

In `arei-admin/curation/CurationWorkspaceView.tsx`, add the import:
```tsx
import { ListingDrawer } from "./ListingDrawer";
```

Replace the drawer placeholder block:
```tsx
{openId && (
  <aside className="fixed right-0 top-0 h-full w-[420px] bg-surface-2 border-l border-border-strong p-4 overflow-y-auto">
    <button className="text-xs underline" onClick={() => setOpenId(null)}>close</button>
    <div className="text-xs mt-2">Drawer placeholder for {openId}</div>
  </aside>
)}
```
with:
```tsx
{openId && (
  <ListingDrawer
    id={openId}
    onClose={() => setOpenId(null)}
    onApplied={async () => { await Promise.all([reloadList(), reloadStats()]); }}
    ephemeralVerdict={ephemeralVerdicts[openId]}
    onVerdictProduced={(id, v) => setEphemeralVerdicts((prev) => ({ ...prev, [id]: v }))}
  />
)}
```

- [ ] **Step 16.3: Visual check**

Refresh. Open a `needs_review` row, click **Run review** (~3s), accept the suggested fields, click **Apply selected**. Expected: drawer closes, list refreshes with the updated row, dashboard stats refresh. Re-open the same row; click **show review history**; expected: the verdict you just ran appears in the history list.

- [ ] **Step 16.4: Commit**

```bash
git add arei-admin/curation/ListingDrawer.tsx arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): ListingDrawer with review history"
```

---

## Task 17: `BulkActionBar` sub-component

**Files:**
- Create: `arei-admin/curation/BulkActionBar.tsx`
- Modify: `arei-admin/curation/CurationWorkspaceView.tsx`

Bulk review runs `reviewListing(id)` sequentially over the selected ids, with a progress counter. Bulk publish/hide call `applyListingPatch(id, {}, status)` with a confirm step. The confirm modal is rendered inline (no portal) to keep dependencies trivial.

- [ ] **Step 17.1: Create the bar**

Create `arei-admin/curation/BulkActionBar.tsx`:
```tsx
import { useState } from "react";
import { applyListingPatch, reviewListing } from "../data";
import type { CuratedListing, ReviewVerdict } from "../types";

interface Props {
  selectedIds: Set<string>;
  rows: CuratedListing[];
  onClear: () => void;
  onAfterMutation: () => Promise<void>;
  onVerdictProduced: (id: string, v: ReviewVerdict) => void;
}

type Mode = "idle" | "reviewing" | "confirm-publish" | "confirm-hide";

export function BulkActionBar({ selectedIds, rows, onClear, onAfterMutation, onVerdictProduced }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const livePublishedCount = selectedRows.filter((r) => r.publish_status === "published").length;

  async function runReviewAll() {
    setMode("reviewing");
    setCancelRequested(false);
    setProgress({ done: 0, total: selectedRows.length });
    setError(null);
    for (let i = 0; i < selectedRows.length; i++) {
      if (cancelRequested) break;
      const r = selectedRows[i];
      try {
        const result = await reviewListing(r.id);
        onVerdictProduced(r.id, result.verdict);
      } catch (e) {
        setError((e instanceof Error ? e.message : String(e)) + ` (on ${r.id})`);
      }
      setProgress({ done: i + 1, total: selectedRows.length });
    }
    await onAfterMutation();
    setMode("idle");
    setProgress(null);
  }

  async function applyAll(publishStatus: "published" | "hidden") {
    setMode("reviewing"); // re-use spinner state
    setProgress({ done: 0, total: selectedRows.length });
    setError(null);
    for (let i = 0; i < selectedRows.length; i++) {
      const r = selectedRows[i];
      if (publishStatus === "published" && r.publish_status === "published") {
        setProgress({ done: i + 1, total: selectedRows.length });
        continue;
      }
      try {
        await applyListingPatch(r.id, {}, publishStatus);
      } catch (e) {
        setError((e instanceof Error ? e.message : String(e)) + ` (on ${r.id})`);
      }
      setProgress({ done: i + 1, total: selectedRows.length });
    }
    await onAfterMutation();
    onClear();
    setMode("idle");
    setProgress(null);
  }

  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-strong bg-surface-3 p-3 flex items-center gap-3 text-xs">
      <span className="font-medium">{selectedIds.size} selected</span>

      {mode === "idle" && (
        <>
          <button onClick={runReviewAll} className="px-3 py-1.5 rounded border border-border-strong hover:bg-surface-2">
            Review all
          </button>
          <button onClick={() => setMode("confirm-publish")} className="px-3 py-1.5 rounded bg-green-muted text-green border border-border-strong hover:opacity-80">
            Publish
          </button>
          <button onClick={() => setMode("confirm-hide")} className="px-3 py-1.5 rounded bg-red-muted text-red border border-border-strong hover:opacity-80">
            Hide
          </button>
          <button onClick={onClear} className="underline ml-auto">clear</button>
        </>
      )}

      {mode === "reviewing" && progress && (
        <>
          <span className="text-foreground-muted">{progress.done} / {progress.total}</span>
          <div className="flex-1 h-1 bg-surface-2 rounded overflow-hidden">
            <div className="h-full bg-sage-deep" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <button onClick={() => setCancelRequested(true)} className="underline">cancel</button>
        </>
      )}

      {mode === "confirm-publish" && (
        <div className="flex items-center gap-3">
          <span>Publish {selectedIds.size} rows? Already-published rows are skipped.</span>
          <button onClick={() => applyAll("published")} className="px-3 py-1.5 rounded bg-green-muted text-green border border-border-strong">confirm</button>
          <button onClick={() => setMode("idle")} className="underline">cancel</button>
        </div>
      )}

      {mode === "confirm-hide" && (
        <div className="flex items-center gap-3">
          {livePublishedCount > 0 ? (
            <span className="text-red">⚠ {livePublishedCount} of these are LIVE — hiding them is a production change.</span>
          ) : (
            <span>Hide {selectedIds.size} rows?</span>
          )}
          <button onClick={() => applyAll("hidden")} className="px-3 py-1.5 rounded bg-red-muted text-red border border-border-strong">confirm</button>
          <button onClick={() => setMode("idle")} className="underline">cancel</button>
        </div>
      )}

      {error && <span className="text-red ml-2">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 17.2: Wire into the workspace**

In `arei-admin/curation/CurationWorkspaceView.tsx`, add the import:
```tsx
import { BulkActionBar } from "./BulkActionBar";
```

Replace the bulk placeholder block:
```tsx
{selectedIds.size > 0 && (
  <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface-3 border-t border-border-strong text-xs">
    BulkActionBar placeholder · {selectedIds.size} selected
    <button className="ml-2 underline" onClick={() => setSelectedIds(new Set())}>clear</button>
  </div>
)}
```
with:
```tsx
<BulkActionBar
  selectedIds={selectedIds}
  rows={listings}
  onClear={() => setSelectedIds(new Set())}
  onAfterMutation={async () => { await Promise.all([reloadList(), reloadStats()]); }}
  onVerdictProduced={(id, v) => setEphemeralVerdicts((prev) => ({ ...prev, [id]: v }))}
/>
```

Also remove the now-redundant `ephemeralVerdicts` debug line and the inline check that surfaced its count. Keep the state itself — `ListingDrawer` and `BulkActionBar` both depend on it.

- [ ] **Step 17.3: Visual check**

Refresh. Select 3 rows from `needs_review`. Click **Review all**. Expected: progress bar fills from 0/3 to 3/3 (~9s), the table updates each row's last-review pill as verdicts arrive, the dashboard stats refresh at the end. Open one of the reviewed rows — the verdict and patch are already there (no re-run needed). Then test **Hide** with a `needs_review` row selected (no warning), and select a `published` row (the warning banner appears). Use **clear** to dismiss.

- [ ] **Step 17.4: Commit**

```bash
git add arei-admin/curation/BulkActionBar.tsx arei-admin/curation/CurationWorkspaceView.tsx
git commit -m "feat(admin): BulkActionBar with sequential review/publish/hide and confirms"
```

---

## Task 18: Post-implementation

- [ ] **Step 18.1: Run the full unit-test suite**

```bash
NODE_OPTIONS='' node --test tests/kvListingReviewer.test.cjs
NODE_OPTIONS='' node --test tests/curationLib.test.cjs
```
Expected: 17/17 and 14/14 pass.

- [ ] **Step 18.2: Update both specs' status lines**

In `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md`, change `Status:` to `Implemented (PR #<number>)` once the PR is open. Do the same in `docs/superpowers/specs/2026-06-01-kv-curation-workspace-design.md`.

- [ ] **Step 18.3: Open the PR**

```bash
gh pr create --title "feat(admin): kv curation workspace (reviewer agent v2)" --body "$(cat <<'EOF'
## Summary
- Replaces Labs "Curated Review" with a top-level **Curation** workspace
- Dashboard strip (Live / Needs review / New this week / Agent flagged) with click-to-filter
- Unified inventory table over every kv_curated row with thumbnails, last-review pills, sortable columns
- Filter bar (status chips, source, island, price, search)
- Slide-in detail drawer with full review/patch flow + review history
- Bulk actions: Review all (sequential Haiku calls with progress + cancel), Publish, Hide (with live-row warning)
- Persists every reviewer verdict to a new kv_curated.review_log table
- Backwards-compatible list endpoint; new stats and history endpoints

Specs:
- docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md
- docs/superpowers/specs/2026-06-01-kv-curation-workspace-design.md

Plan: docs/superpowers/plans/2026-06-01-kv-curation-workspace.md

## Test plan
- [ ] `NODE_OPTIONS='' node --test tests/kvListingReviewer.test.cjs` (17/17)
- [ ] `NODE_OPTIONS='' node --test tests/curationLib.test.cjs` (14/14)
- [ ] Open Curation tab, click each dashboard tile, confirm filters change accordingly
- [ ] Bulk Review all over 3 needs_review rows; verify progress bar, in-place pill updates, history persistence
- [ ] Bulk Hide with a mix of needs_review and published rows; confirm the production-change warning appears
- [ ] Single review + Apply selected; confirm row updates in place and stats refresh
- [ ] Search by title substring, by id substring, by island; results filter correctly
EOF
)"
```

---

## Self-review notes

Spec coverage:
- §Architecture (workspace + drawer + persistent log) ↔ Tasks 11, 13–17 (UI) + Tasks 1, 7 (DB + verdict persistence). ✓
- §Data shape changes (table, list endpoint, stats endpoint, review-listing log write) ↔ Tasks 1, 2–4 (pure helpers), 5, 6, 7, 8. ✓
- §UI components (six pieces) ↔ one task per piece (11 orchestrator, 13 dashboard, 14 filter, 15 table, 16 drawer, 17 bulk). ✓
- §Navigation (replace Labs entry with top-level Curation) ↔ Task 12. ✓
- §Out-of-scope items not present in any task. ✓
- Hard rules (no Supabase REST for kv_curated, server-side Anthropic key) ↔ all endpoints use `createPg` from `_endpointAuth.js`; the Anthropic call lives only in `review-listing.js` server-side. ✓

Type consistency check:
- `CurationFilters` shape in the spec, in `arei-admin/curation/types.ts` reference, and in `data.ts` `filtersToQueryString` is identical. ✓
- `CuratedListing.last_review` shape matches what `_curationLib.cjs` produces via the LATERAL join shape transformer in Task 5. ✓
- `ReviewLogRow` keys (`id, listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason, created_at`) match the migration columns. ✓
- `CurationStats` keys match `buildStatsQuery`'s `AS` aliases. ✓
- Tab union `"curation"` is the same in Task 11's import and Task 12's `Tab` type, `NAV_ITEMS`, and conditional render. ✓
