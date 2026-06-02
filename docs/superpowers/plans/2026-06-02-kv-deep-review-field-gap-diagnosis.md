# KazaVerde Deep Review — Field-Gap Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Deep review" that live-fetches a curated listing's source URL, diagnoses each null field as scraper-missed / absent-at-source / uncertain, offers recovered values as one-click fixes that also feed a scraper-gap backlog, and flags page values that have no curated column.

**Architecture:** A new `/api/deep-review-listing` endpoint calls Claude Sonnet with Anthropic's managed `web_fetch` tool; the cheap `/api/review-listing` (Haiku, DB-only) path is left untouched. All prompt-building and output-validation logic lives in the pure, unit-tested `_reviewerLib.cjs`. Recovered "scraper missed" values flow through the existing `apply-listing-patch` path, which gains an atomic insert into a new `kv_curated.scraper_gap_log` table.

**Tech Stack:** Node serverless functions (`arei-admin/api/*.js`, ESM), pure CJS lib (`_reviewerLib.cjs`), `@anthropic-ai/sdk` 0.91.1, Postgres (`pg`), React 18 + TypeScript + Tailwind drawer UI, `node:test` for tests.

**Spec:** `docs/superpowers/specs/2026-06-02-kv-deep-review-field-gap-diagnosis-design.md`

---

## File Structure

- **Modify** `arei-admin/api/_reviewerLib.cjs` — add `buildDeepReviewPrompt`, extend `parseAndValidateVerdict` (optional deep keys), add `buildScraperGapInsert`, export new constants.
- **Modify** `tests/kvListingReviewer.test.cjs` — tests for all of the above.
- **Create** `migrations/039_kv_curated_review_log_deep.sql` — new `review_log` columns + `scraper_gap_log` table.
- **Create** `arei-admin/api/deep-review-listing.js` — Sonnet + `web_fetch` endpoint, persists to `review_log`.
- **Modify** `arei-admin/api/apply-listing-patch.js` — optional atomic `recovered_gaps` insert.
- **Modify** `arei-admin/types.ts` — `MissingFieldEntry`, `UnmappedField`, `RecoveredGap`, extend `ReviewVerdict`.
- **Modify** `arei-admin/data.ts` — `deepReviewListing()`, `recovered_gaps` arg on `applyListingPatch()`.
- **Modify** `arei-admin/curation/ListingDrawer.tsx` — "Deep review" button + "Field gaps" table.
- **Modify** `docs/02-data-engine/kazaverde-curated-reviewer.md` — document the deep path.

**Test commands used throughout:**
- Lib tests: `node --test tests/kvListingReviewer.test.cjs`
- Admin typecheck: `npm --prefix arei-admin run typecheck`

---

## Task 1: Extend `parseAndValidateVerdict` with optional deep keys

**Files:**
- Modify: `arei-admin/api/_reviewerLib.cjs`
- Test: `tests/kvListingReviewer.test.cjs`

- [ ] **Step 1: Write the failing tests**

Append to `tests/kvListingReviewer.test.cjs`:

```js
test("parseAndValidateVerdict still accepts a cheap-path verdict with no deep keys", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: { bedrooms: 2 },
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.fetch_status, undefined);
  assert.equal(v.missing_field_report, undefined);
});

test("parseAndValidateVerdict accepts a well-formed deep verdict", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.7,
    reasons: ["bedrooms missing from row but present on page"],
    suggested_patch: { bedrooms: 3 },
    fetch_status: "ok",
    missing_field_report: [
      { field: "bedrooms", status: "scraper_missed", found_value: 3, evidence: "\"3 bedroom villa\"", confidence: 0.9 },
      { field: "price", status: "absent_at_source", confidence: 0.8 },
    ],
    unmapped_fields: [
      { label: "terrace area", value: "85 m²", suggested_column: "terrace_area_sqm", type: "numeric", confidence: 0.7 },
    ],
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.fetch_status, "ok");
  assert.equal(v.missing_field_report[0].found_value, 3);
  assert.equal(v.unmapped_fields[0].suggested_column, "terrace_area_sqm");
});

test("parseAndValidateVerdict rejects found_value on a non-scraper_missed entry", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "absent_at_source", found_value: 100, confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /found_value is only allowed/i);
});

test("parseAndValidateVerdict rejects a bad missing_field_report status", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "dunno", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /missing_field_report.*status/i);
});

test("parseAndValidateVerdict rejects a bad fetch_status enum", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {}, fetch_status: "weird",
  });
  assert.throws(() => parseAndValidateVerdict(raw), /fetch_status/i);
});

test("parseAndValidateVerdict rejects a non-snake_case suggested_column", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    unmapped_fields: [{ label: "x", value: "y", suggested_column: "TerraceArea", type: "numeric", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /snake_case/i);
});

test("parseAndValidateVerdict rejects a bad unmapped_fields type", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    unmapped_fields: [{ label: "x", value: "y", suggested_column: "terrace_area_sqm", type: "json", confidence: 0.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /unmapped_fields.*type/i);
});

test("parseAndValidateVerdict rejects out-of-range deep confidence", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"], suggested_patch: {},
    missing_field_report: [{ field: "price", status: "uncertain", confidence: 1.5 }],
  });
  assert.throws(() => parseAndValidateVerdict(raw), /confidence/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: FAIL — the new deep-verdict tests fail because the validator ignores/does not enforce the new keys (e.g. "found_value is only allowed" assertion throws no error).

- [ ] **Step 3: Implement the validation**

In `arei-admin/api/_reviewerLib.cjs`, add these constants/helpers near the top (after `PATCH_FIELDS`):

```js
const FETCH_STATUSES = new Set(["ok", "failed", "skipped"]);
const MISSING_FIELD_STATUSES = new Set(["scraper_missed", "absent_at_source", "uncertain"]);
const UNMAPPED_TYPES = new Set(["numeric", "integer", "text", "boolean"]);
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

function isConfidence(n) {
  return typeof n === "number" && n >= 0 && n <= 1;
}

function validateMissingFieldReport(report) {
  if (!Array.isArray(report)) throw new Error("missing_field_report must be an array");
  for (const e of report) {
    if (!e || typeof e !== "object" || Array.isArray(e)) throw new Error("missing_field_report entry must be an object");
    if (typeof e.field !== "string" || e.field.length === 0) throw new Error("missing_field_report.field must be a non-empty string");
    if (!MISSING_FIELD_STATUSES.has(e.status)) throw new Error("missing_field_report.status must be scraper_missed|absent_at_source|uncertain");
    if (e.status !== "scraper_missed" && e.found_value !== undefined) throw new Error("found_value is only allowed when status is scraper_missed");
    if (!isConfidence(e.confidence)) throw new Error("missing_field_report.confidence must be a number in [0,1]");
    if (e.evidence !== undefined && typeof e.evidence !== "string") throw new Error("missing_field_report.evidence must be a string");
  }
}

function validateUnmappedFields(fields) {
  if (!Array.isArray(fields)) throw new Error("unmapped_fields must be an array");
  for (const f of fields) {
    if (!f || typeof f !== "object" || Array.isArray(f)) throw new Error("unmapped_fields entry must be an object");
    if (typeof f.label !== "string" || f.label.length === 0) throw new Error("unmapped_fields.label must be a non-empty string");
    if (typeof f.value !== "string" || f.value.length === 0) throw new Error("unmapped_fields.value must be a non-empty string");
    if (typeof f.suggested_column !== "string" || !SNAKE_CASE.test(f.suggested_column)) throw new Error("unmapped_fields.suggested_column must be snake_case");
    if (!UNMAPPED_TYPES.has(f.type)) throw new Error("unmapped_fields.type must be numeric|integer|text|boolean");
    if (!isConfidence(f.confidence)) throw new Error("unmapped_fields.confidence must be a number in [0,1]");
  }
}
```

Then in `parseAndValidateVerdict`, immediately before `return json;`, insert:

```js
  if (json.fetch_status !== undefined && !FETCH_STATUSES.has(json.fetch_status)) {
    throw new Error("fetch_status must be ok|failed|skipped");
  }
  if (json.missing_field_report !== undefined) validateMissingFieldReport(json.missing_field_report);
  if (json.unmapped_fields !== undefined) validateUnmappedFields(json.unmapped_fields);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: PASS — all existing tests plus the seven new ones.

- [ ] **Step 5: Commit**

```bash
git add arei-admin/api/_reviewerLib.cjs tests/kvListingReviewer.test.cjs
git commit -m "feat(reviewer): validate deep-review verdict keys (field report, unmapped, fetch_status)"
```

---

## Task 2: Add `buildDeepReviewPrompt`

**Files:**
- Modify: `arei-admin/api/_reviewerLib.cjs`
- Test: `tests/kvListingReviewer.test.cjs`

- [ ] **Step 1: Write the failing tests**

Append to `tests/kvListingReviewer.test.cjs` (the symbol is exported in Step 3):

```js
const { buildDeepReviewPrompt } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildDeepReviewPrompt instructs the model to fetch the source URL", () => {
  const { system, user } = buildDeepReviewPrompt({
    id: "id", title: "2 Bed Villa", description: "Lovely villa.",
    source_url_primary: "https://example.com/listing/xyz",
    island: "Sal", city: "Santa Maria", property_type: "villa",
    bedrooms: null, bathrooms: null, price: 100000, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: ["a"], publish_status: "needs_review",
  });
  assert.match(system, /web_fetch/i);
  assert.match(system, /scraper_missed/);
  assert.match(system, /absent_at_source/);
  assert.match(system, /unmapped_fields/);
  assert.match(user, /https:\/\/example\.com\/listing\/xyz/);
});

test("buildDeepReviewPrompt lists only the currently-null fields as diagnosis targets", () => {
  const { user } = buildDeepReviewPrompt({
    id: "id", title: "t", description: "d", source_url_primary: "u",
    island: "Sal", city: "Santa Maria", property_type: "villa",
    bedrooms: null, bathrooms: null, price: 100000, currency: "EUR",
    property_size_sqm: null, land_area_sqm: 500,
    image_urls: ["a"], publish_status: "needs_review",
  });
  assert.match(user, /FIELDS TO DIAGNOSE/);
  assert.match(user, /bedrooms/);
  assert.match(user, /bathrooms/);
  assert.match(user, /property_size_sqm/);
  // non-null fields must NOT be diagnosis targets
  assert.doesNotMatch(user.split("FIELDS TO DIAGNOSE")[1], /land_area_sqm/);
  assert.doesNotMatch(user.split("FIELDS TO DIAGNOSE")[1], /\bprice\b/);
});

test("buildDeepReviewPrompt notes when there is no source URL", () => {
  const { user } = buildDeepReviewPrompt({
    id: "id", title: "t", description: "d", source_url_primary: null,
    island: "Sal", city: null, property_type: null,
    bedrooms: null, bathrooms: null, price: null, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: [], publish_status: "needs_review",
  });
  assert.match(user, /no source url/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: FAIL — `buildDeepReviewPrompt is not a function`.

- [ ] **Step 3: Implement `buildDeepReviewPrompt`**

In `arei-admin/api/_reviewerLib.cjs`, add this constant near `PATCH_FIELDS`:

```js
// Fields the deep reviewer may diagnose. Subset of the row that maps to real
// curated columns and is meaningful to recover from the source page.
const DIAGNOSABLE_FIELDS = [
  "island", "city", "property_type",
  "bedrooms", "bathrooms", "price",
  "property_size_sqm", "land_area_sqm",
];
```

Then add the function (place it after `buildReviewPrompt`):

```js
function buildDeepReviewPrompt(row) {
  const description = (row.description ?? "").length > DESCRIPTION_MAX
    ? row.description.slice(0, DESCRIPTION_MAX) + "\n…(truncated)"
    : (row.description ?? "");

  const structured = {
    island: row.island ?? null,
    city: row.city ?? null,
    property_type: row.property_type ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    price: row.price ?? null,
    currency: row.currency ?? null,
    property_size_sqm: row.property_size_sqm ?? null,
    land_area_sqm: row.land_area_sqm ?? null,
    image_urls_count: Array.isArray(row.image_urls) ? row.image_urls.length : 0,
    publish_status: row.publish_status ?? null,
  };

  const nullFields = DIAGNOSABLE_FIELDS.filter((f) => {
    const v = row[f];
    return v === null || v === undefined || v === "";
  });

  const system = [
    "You are a data-quality diagnostician for a Cape Verde real-estate listings feed.",
    "A listing row has some empty fields. Your job is to determine, for each empty field,",
    "WHY it is empty by reading the ORIGINAL source page.",
    "",
    "Use the web_fetch tool on the source_url to read the live listing page.",
    "If the page cannot be fetched, set fetch_status to \"failed\" and diagnose from the",
    "description text only. If there is no source_url, set fetch_status to \"skipped\".",
    "Otherwise set fetch_status to \"ok\".",
    "",
    "For each field in FIELDS TO DIAGNOSE, add one entry to missing_field_report:",
    "- status \"scraper_missed\": the value IS on the page/description. Return found_value and a short evidence quote.",
    "- status \"absent_at_source\": the page genuinely does not state this value.",
    "- status \"uncertain\": you cannot tell.",
    "Only include found_value when status is \"scraper_missed\". No guessing — evidence or absent_at_source/uncertain.",
    "When a recovered value maps to one of these columns, ALSO put it in suggested_patch:",
    PATCH_FIELDS.join(", ") + ".",
    "",
    "Separately, list any value present on the page that has NO column above in unmapped_fields,",
    "e.g. terrace area, year built, pool, parking. suggested_column must be snake_case.",
    "",
    "Output JSON only. No prose outside the JSON. Schema:",
    "{",
    '  "verdict": "publish" | "hold" | "hide",',
    '  "confidence": number (0..1),',
    '  "reasons": string[],',
    '  "suggested_patch": { ...mappable recovered values... },',
    '  "fetch_status": "ok" | "failed" | "skipped",',
    '  "missing_field_report": [ { "field": string, "status": "scraper_missed"|"absent_at_source"|"uncertain", "found_value"?: any, "evidence"?: string, "confidence": number } ],',
    '  "unmapped_fields": [ { "label": string, "value": string, "suggested_column": string, "type": "numeric"|"integer"|"text"|"boolean", "confidence": number } ],',
    '  "hide_reason"?: string',
    "}",
    "",
    "Valid islands (use exactly these spellings): " + CV_ISLANDS.join(", "),
    "Valid property_type values: " + PROPERTY_TYPES.join(", "),
  ].join("\n");

  const fieldsToDiagnose = nullFields.length > 0 ? nullFields.join(", ") : "(none — all diagnosable fields are populated)";

  const user = [
    "SOURCE",
    "title: " + (row.title ?? ""),
    "source_url: " + (row.source_url_primary ?? "(no source url)"),
    "description:",
    description,
    "",
    "STRUCTURED FIELDS",
    JSON.stringify(structured, null, 2),
    "",
    "FIELDS TO DIAGNOSE",
    fieldsToDiagnose,
  ].join("\n");

  return { system, user };
}
```

Then update the `module.exports` block at the bottom of the file to export the new symbols (the `buildScraperGapInsert` line is added in Task 3):

```js
module.exports = {
  buildReviewPrompt,
  buildDeepReviewPrompt,
  parseAndValidateVerdict,
  buildPatchSql,
  CV_ISLANDS,
  PROPERTY_TYPES,
  PATCH_FIELDS,
  DIAGNOSABLE_FIELDS,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add arei-admin/api/_reviewerLib.cjs tests/kvListingReviewer.test.cjs
git commit -m "feat(reviewer): add buildDeepReviewPrompt for source-page field-gap diagnosis"
```

---

## Task 3: Add `buildScraperGapInsert` SQL builder

**Files:**
- Modify: `arei-admin/api/_reviewerLib.cjs`
- Test: `tests/kvListingReviewer.test.cjs`

- [ ] **Step 1: Write the failing tests**

Append to `tests/kvListingReviewer.test.cjs`:

```js
const { buildScraperGapInsert } = require("../arei-admin/api/_reviewerLib.cjs");

test("buildScraperGapInsert returns null for empty gaps", () => {
  assert.equal(buildScraperGapInsert("hcv_x", []), null);
  assert.equal(buildScraperGapInsert("hcv_x", undefined), null);
});

test("buildScraperGapInsert builds a multi-row insert", () => {
  const { text, values } = buildScraperGapInsert("hcv_x", [
    { field: "bedrooms", source_id: "cv_foo", value: 3, evidence: "3 bed", model: "claude-sonnet-4-6" },
    { field: "bathrooms", source_id: "cv_foo", value: 2 },
  ]);
  assert.match(text, /INSERT INTO kv_curated\.scraper_gap_log/);
  assert.match(text, /\(\$1, \$2, \$3, \$4, \$5, \$6\), \(\$7, \$8, \$9, \$10, \$11, \$12\)/);
  assert.deepEqual(values, [
    "hcv_x", "cv_foo", "bedrooms", "3", "3 bed", "claude-sonnet-4-6",
    "hcv_x", "cv_foo", "bathrooms", "2", null, null,
  ]);
});

test("buildScraperGapInsert rejects an entry missing field", () => {
  assert.throws(() => buildScraperGapInsert("hcv_x", [{ source_id: "cv_foo" }]), /field/i);
});

test("buildScraperGapInsert rejects an entry missing source_id", () => {
  assert.throws(() => buildScraperGapInsert("hcv_x", [{ field: "bedrooms" }]), /source_id/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: FAIL — `buildScraperGapInsert is not a function`.

- [ ] **Step 3: Implement the builder and update exports**

In `arei-admin/api/_reviewerLib.cjs`, add the function (after `buildPatchSql`):

```js
function buildScraperGapInsert(listingId, gaps) {
  if (!Array.isArray(gaps) || gaps.length === 0) return null;
  const values = [];
  const tuples = [];
  let i = 1;
  for (const g of gaps) {
    if (!g || typeof g !== "object" || Array.isArray(g)) throw new Error("recovered_gap must be an object");
    if (typeof g.field !== "string" || g.field.length === 0) throw new Error("recovered_gap.field must be a non-empty string");
    if (typeof g.source_id !== "string" || g.source_id.length === 0) throw new Error("recovered_gap.source_id must be a non-empty string");
    tuples.push(`($${i}, $${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
    values.push(
      listingId,
      g.source_id,
      g.field,
      g.value == null ? null : String(g.value),
      g.evidence == null ? null : String(g.evidence),
      g.model == null ? null : String(g.model),
    );
    i += 6;
  }
  const text =
    "INSERT INTO kv_curated.scraper_gap_log " +
    "(listing_id, source_id, field, recovered_value, evidence, model) VALUES " +
    tuples.join(", ");
  return { text, values };
}
```

Replace the `module.exports` block at the bottom with:

```js
module.exports = {
  buildReviewPrompt,
  buildDeepReviewPrompt,
  parseAndValidateVerdict,
  buildPatchSql,
  buildScraperGapInsert,
  CV_ISLANDS,
  PROPERTY_TYPES,
  PATCH_FIELDS,
  DIAGNOSABLE_FIELDS,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: PASS — all lib tests (Tasks 1–3) green.

- [ ] **Step 5: Commit**

```bash
git add arei-admin/api/_reviewerLib.cjs tests/kvListingReviewer.test.cjs
git commit -m "feat(reviewer): add buildScraperGapInsert for atomic gap logging"
```

---

## Task 4: Migration — review_log columns + scraper_gap_log table

**Files:**
- Create: `migrations/039_kv_curated_review_log_deep.sql`

- [ ] **Step 1: Write the migration**

Create `migrations/039_kv_curated_review_log_deep.sql`:

```sql
-- Migration: deep-review persistence
-- Date: 2026-06-02
--
-- Scope:
-- - add deep-review columns to kv_curated.review_log
-- - create kv_curated.scraper_gap_log (confirmed scraper-miss backlog)
--
-- Rollback note:
--   ALTER TABLE kv_curated.review_log
--     DROP COLUMN IF EXISTS missing_field_report,
--     DROP COLUMN IF EXISTS unmapped_fields,
--     DROP COLUMN IF EXISTS fetch_status;
--   DROP TABLE IF EXISTS kv_curated.scraper_gap_log;

begin;

alter table kv_curated.review_log
  add column if not exists missing_field_report jsonb,
  add column if not exists unmapped_fields      jsonb,
  add column if not exists fetch_status          text;

create table if not exists kv_curated.scraper_gap_log (
  id              bigint generated always as identity primary key,
  listing_id      text not null references kv_curated.listings(id) on delete cascade,
  source_id       text not null,
  field           text not null,
  recovered_value text,
  evidence        text,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists scraper_gap_log_source_field_idx
  on kv_curated.scraper_gap_log (source_id, field);

revoke all on kv_curated.scraper_gap_log from anon;
revoke all on kv_curated.scraper_gap_log from authenticated;

commit;
```

- [ ] **Step 2: Verify the SQL parses**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('migrations/039_kv_curated_review_log_deep.sql','utf8');if(!/begin;[\s\S]*commit;/.test(s))throw new Error('missing begin/commit');if(!/scraper_gap_log/.test(s))throw new Error('missing table');console.log('migration shape ok')"`
Expected: prints `migration shape ok`.

> Applying the migration against the live DB follows `docs/02-data-engine/kazaverde-curated-feed-operations.md` (pooler `DATABASE_URL` only). Do not auto-apply here; the operator runs it through the normal migration path.

- [ ] **Step 3: Commit**

```bash
git add migrations/039_kv_curated_review_log_deep.sql
git commit -m "feat(db): deep-review columns + scraper_gap_log table (039)"
```

---

## Task 5: `deep-review-listing.js` endpoint

**Files:**
- Create: `arei-admin/api/deep-review-listing.js`

- [ ] **Step 1: Write the endpoint**

Create `arei-admin/api/deep-review-listing.js`:

```js
// POST /api/deep-review-listing
// Body: { id }
// Calls Claude Sonnet with Anthropic's web_fetch tool to diagnose why a
// kv_curated.listings row has empty fields by reading the live source page.
// Returns { id, verdict } where verdict adds missing_field_report,
// unmapped_fields, and fetch_status to the base contract.

import Anthropic from "@anthropic-ai/sdk";
import { authorize, createPg, readJsonBody, send } from "./_endpointAuth.js";
import reviewerLib from "./_reviewerLib.cjs";

const { buildDeepReviewPrompt, parseAndValidateVerdict } = reviewerLib;

const MODEL = "claude-sonnet-4-6";
// web_fetch is a server tool; in SDK 0.91 it is reached via the beta channel.
const WEB_FETCH_BETA = "web-fetch-2025-09-10";
const WEB_FETCH_TOOL = { type: "web_fetch_20250910", name: "web_fetch", max_uses: 3 };

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  if (!process.env.ANTHROPIC_API_KEY) return send(res, 500, { error: "ANTHROPIC_API_KEY not set" });

  let body;
  try { body = await readJsonBody(req); }
  catch (e) { return send(res, 400, { error: "invalid JSON body: " + e.message }); }
  const id = body?.id;
  if (!id || typeof id !== "string") return send(res, 400, { error: "id is required" });

  const client = createPg();
  let row;
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title, description, source_url_primary, source_id_primary, island, city,
              property_type, bedrooms, bathrooms, price, currency, property_size_sqm,
              land_area_sqm, image_urls, publish_status
         FROM kv_curated.listings WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return send(res, 404, { error: "listing not found" });
    row = rows[0];
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }

  const { system, user } = buildDeepReviewPrompt(row);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let raw;
  try {
    const resp = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: [WEB_FETCH_BETA],
      system,
      tools: [WEB_FETCH_TOOL],
      messages: [{ role: "user", content: user }],
    });
    const textBlocks = resp.content.filter((c) => c.type === "text");
    raw = textBlocks.length ? textBlocks[textBlocks.length - 1].text : "";
  } catch (err) {
    return send(res, 502, { error: "model call failed: " + (err.message || err) });
  }

  let verdict;
  try { verdict = parseAndValidateVerdict(raw); }
  catch (err) { return send(res, 502, { error: err.message, raw }); }

  // Persist. Failures here are logged but not surfaced — the operator already
  // has the verdict in the response.
  let review_log_id = null;
  try {
    const logClient = createPg();
    await logClient.connect();
    try {
      const { rows: logRows } = await logClient.query(
        `INSERT INTO kv_curated.review_log
           (listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason,
            missing_field_report, unmapped_fields, fetch_status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10)
         RETURNING id`,
        [
          row.id,
          MODEL,
          verdict.verdict,
          verdict.confidence,
          JSON.stringify(verdict.reasons),
          JSON.stringify(verdict.suggested_patch),
          verdict.hide_reason ?? null,
          JSON.stringify(verdict.missing_field_report ?? []),
          JSON.stringify(verdict.unmapped_fields ?? []),
          verdict.fetch_status ?? null,
        ],
      );
      review_log_id = logRows[0]?.id ?? null;
    } finally {
      await logClient.end();
    }
  } catch (err) {
    console.error("[deep-review-listing] failed to insert review_log:", err.message);
  }

  return send(res, 200, { id: row.id, verdict, review_log_id, source_id: row.source_id_primary });
}
```

- [ ] **Step 2: Verify the module loads and exports a handler**

Run: `node --input-type=module -e "const m = await import('./arei-admin/api/deep-review-listing.js'); if (typeof m.default !== 'function') throw new Error('no default handler'); console.log('handler ok')"`
Expected: prints `handler ok` (no import/syntax errors).

- [ ] **Step 3: Confirm the web_fetch tool wiring against the installed SDK**

Run: `node -e "const A=require('@anthropic-ai/sdk');console.log('sdk', require('@anthropic-ai/sdk/package.json').version);const a=new A({apiKey:'x'});console.log('beta.messages.create', typeof a.beta.messages.create)"`
Expected: prints the SDK version and `beta.messages.create function`. If `beta.messages.create` is not a function, fall back to `anthropic.messages.create` with the tool inline and drop `betas` — record the working form in the endpoint and in the spec's "Open implementation detail" section.

- [ ] **Step 4: Commit**

```bash
git add arei-admin/api/deep-review-listing.js
git commit -m "feat(admin): deep-review-listing endpoint (Sonnet + web_fetch)"
```

---

## Task 6: Atomic gap logging in `apply-listing-patch.js`

**Files:**
- Modify: `arei-admin/api/apply-listing-patch.js`

- [ ] **Step 1: Add `recovered_gaps` handling with a transaction**

Edit `arei-admin/api/apply-listing-patch.js`. Change the import line:

```js
const { buildPatchSql, buildScraperGapInsert } = reviewerLib;
```

After the existing `const publishStatus = ...` line, add:

```js
  const recoveredGaps = Array.isArray(body?.recovered_gaps) ? body.recovered_gaps : [];
```

After the `buildPatchSql` try/catch that produces `query`, add the gap-insert builder:

```js
  let gapQuery = null;
  try { gapQuery = buildScraperGapInsert(id, recoveredGaps); }
  catch (err) { return send(res, 400, { error: err.message }); }
```

Replace the existing client block (from `await client.connect();` through the `finally`) with a transaction:

```js
  const client = createPg();
  await client.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(query.text, query.values);
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return send(res, 404, { error: "listing not found" });
    }
    if (gapQuery) await client.query(gapQuery.text, gapQuery.values);
    await client.query("COMMIT");
    return send(res, 200, { row: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
```

- [ ] **Step 2: Verify the module loads**

Run: `node --input-type=module -e "const m = await import('./arei-admin/api/apply-listing-patch.js'); if (typeof m.default !== 'function') throw new Error('no default handler'); console.log('handler ok')"`
Expected: prints `handler ok`.

- [ ] **Step 3: Commit**

```bash
git add arei-admin/api/apply-listing-patch.js
git commit -m "feat(admin): atomic scraper-gap logging on apply-listing-patch"
```

---

## Task 7: Client types + data layer

**Files:**
- Modify: `arei-admin/types.ts`
- Modify: `arei-admin/data.ts`

- [ ] **Step 1: Extend the types**

In `arei-admin/types.ts`, after the `SuggestedPatch` interface (line ~431) add:

```ts
export interface MissingFieldEntry {
  field: string;
  status: "scraper_missed" | "absent_at_source" | "uncertain";
  found_value?: string | number | null;
  evidence?: string;
  confidence: number;
}

export interface UnmappedField {
  label: string;
  value: string;
  suggested_column: string;
  type: "numeric" | "integer" | "text" | "boolean";
  confidence: number;
}

export interface RecoveredGap {
  field: string;
  source_id: string;
  value?: string | number | null;
  evidence?: string;
  model?: string;
}
```

Extend `ReviewVerdict` (add three optional fields):

```ts
export interface ReviewVerdict {
  verdict: "publish" | "hold" | "hide";
  confidence: number;
  reasons: string[];
  suggested_patch: SuggestedPatch;
  hide_reason?: string;
  fetch_status?: "ok" | "failed" | "skipped";
  missing_field_report?: MissingFieldEntry[];
  unmapped_fields?: UnmappedField[];
}
```

Extend `ReviewVerdictResult` to carry the row's source id (returned by the deep endpoint):

```ts
export interface ReviewVerdictResult {
  id: string;
  verdict: ReviewVerdict;
  review_log_id?: number | null;
  source_id?: string | null;
}
```

- [ ] **Step 2: Add the data-layer calls**

In `arei-admin/data.ts`, add after `reviewListing` (line ~1424):

```ts
export async function deepReviewListing(id: string): Promise<ReviewVerdictResult> {
  const res = await fetch("/api/deep-review-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`deepReviewListing: ${res.status} ${await res.text()}`);
  return (await res.json()) as ReviewVerdictResult;
}
```

Replace `applyListingPatch` with a version that forwards optional `recovered_gaps`:

```ts
export async function applyListingPatch(
  id: string,
  patch: SuggestedPatch,
  publishStatus?: "needs_review" | "published" | "hidden",
  recoveredGaps?: RecoveredGap[],
): Promise<CuratedListing> {
  const res = await fetch("/api/apply-listing-patch", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({
      id,
      patch,
      publish_status: publishStatus ?? null,
      ...(recoveredGaps && recoveredGaps.length > 0 ? { recovered_gaps: recoveredGaps } : {}),
    }),
  });
  if (!res.ok) throw new Error(`applyListingPatch: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.row as CuratedListing;
}
```

Ensure `RecoveredGap` is imported in `data.ts` (add to the existing `types` import).

- [ ] **Step 3: Typecheck**

Run: `npm --prefix arei-admin run typecheck`
Expected: PASS (no type errors). `applyListingPatch`'s existing 3-arg call sites still compile because the 4th arg is optional.

- [ ] **Step 4: Commit**

```bash
git add arei-admin/types.ts arei-admin/data.ts
git commit -m "feat(admin): client types + data calls for deep review and recovered gaps"
```

---

## Task 8: Drawer UI — "Deep review" button + "Field gaps" table

**Files:**
- Modify: `arei-admin/curation/ListingDrawer.tsx`

- [ ] **Step 1: Wire the deep-review state and call**

In `arei-admin/curation/ListingDrawer.tsx`, extend the imports:

```tsx
import {
  applyListingPatch,
  deepReviewListing,
  getCuratedListing,
  getListingReviewHistory,
  reviewListing,
} from "../data";
import type {
  CuratedListing, MissingFieldEntry, RecoveredGap, ReviewLogRow, ReviewVerdict, SuggestedPatch, UnmappedField,
} from "../types";
```

Add state next to `reviewing` (line ~23):

```tsx
  const [deepReviewing, setDeepReviewing] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
```

Add the handler next to `runReview` (after line ~77):

```tsx
  async function runDeepReview() {
    setDeepReviewing(true); setError(null);
    try {
      const r = await deepReviewListing(id);
      setVerdict(r.verdict);
      setSourceId(r.source_id ?? null);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
      onVerdictProduced(id, r.verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeepReviewing(false);
    }
  }
```

- [ ] **Step 2: Build recovered_gaps when applying**

Replace the body of `apply` (lines ~87-103) with a version that forwards confirmed scraper-miss gaps for accepted keys:

```tsx
  async function apply(publishStatus?: "published" | "hidden") {
    if (!verdict || !listing) return;
    const subset: SuggestedPatch = {};
    for (const k of acceptedKeys) {
      (subset as Record<string, unknown>)[k] = (verdict.suggested_patch as Record<string, unknown>)[k];
    }
    const gaps: RecoveredGap[] = [];
    if (sourceId) {
      for (const e of verdict.missing_field_report ?? []) {
        if (e.status === "scraper_missed" && acceptedKeys.has(e.field)) {
          gaps.push({
            field: e.field,
            source_id: sourceId,
            value: e.found_value ?? null,
            evidence: e.evidence,
            model: "claude-sonnet-4-6",
          });
        }
      }
    }
    setApplying(true); setError(null);
    try {
      await applyListingPatch(listing.id, subset, publishStatus, gaps);
      onApplied();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }
```

- [ ] **Step 3: Add the Deep review button**

In the button row (around line 165-173), add a second button after the existing "Run review" button, inside the same `<div className="mt-3 flex items-center gap-2">`:

```tsx
            <button
              onClick={runDeepReview}
              disabled={deepReviewing}
              className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
            >
              {deepReviewing ? "Deep reviewing…" : "Deep review"}
            </button>
```

- [ ] **Step 4: Render fetch_status banner + Field gaps + Unmapped fields**

Inside the `{verdict && ( ... )}` block, after the `reasons` `<ul>` (line ~184) and before the `{patchEntries.length > 0 && ...}` block, insert:

```tsx
              {verdict.fetch_status && verdict.fetch_status !== "ok" && (
                <div className="text-[11px] text-amber">
                  source page {verdict.fetch_status === "failed" ? "could not be fetched" : "was not fetched"} — diagnosis is from stored data only
                </div>
              )}

              {verdict.missing_field_report && verdict.missing_field_report.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">Field gaps</div>
                  <table className="text-xs w-full">
                    <thead className="text-foreground-muted">
                      <tr><th className="text-left">field</th><th className="text-left">diagnosis</th><th className="text-left">value / evidence</th></tr>
                    </thead>
                    <tbody>
                      {verdict.missing_field_report.map((e: MissingFieldEntry) => (
                        <tr key={e.field} className="border-t border-border-strong align-top">
                          <td className="font-mono py-1">{e.field}</td>
                          <td><GapStatus status={e.status} /></td>
                          <td>
                            {e.status === "scraper_missed"
                              ? <span><span className="font-mono">{String(e.found_value ?? "—")}</span>{e.evidence ? <span className="text-foreground-muted italic"> — {e.evidence}</span> : null}</span>
                              : <span className="text-foreground-muted">{e.evidence ?? (e.status === "absent_at_source" ? "not stated at source" : "could not determine")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sourceId && verdict.missing_field_report.some((e) => e.status === "scraper_missed") && (
                    <div className="text-[11px] text-foreground-muted mt-1">
                      Accept a scraper-missed field below and Apply — it patches the row and logs the scraper gap.
                    </div>
                  )}
                </div>
              )}

              {verdict.unmapped_fields && verdict.unmapped_fields.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">No column for these</div>
                  <ul className="text-xs space-y-1">
                    {verdict.unmapped_fields.map((u: UnmappedField, i: number) => (
                      <li key={i} className="border-t border-border-strong pt-1">
                        <span className="font-mono">{u.label}</span>: {u.value}
                        <span className="text-foreground-muted"> → consider <span className="font-mono">{u.suggested_column}</span> ({u.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
```

- [ ] **Step 5: Add the `GapStatus` presentational component**

At the bottom of the file, after the `Verdict` component (line ~274), add:

```tsx
function GapStatus({ status }: { status: "scraper_missed" | "absent_at_source" | "uncertain" }) {
  const map = {
    scraper_missed: { cls: "bg-amber-muted text-amber", label: "scraper missed" },
    absent_at_source: { cls: "bg-surface-3 text-foreground-muted", label: "absent at source" },
    uncertain: { cls: "bg-surface-3 text-foreground-muted", label: "uncertain" },
  } as const;
  const { cls, label } = map[status];
  return <span className={`px-2 py-0.5 text-[10px] rounded border border-border-strong ${cls}`}>{label}</span>;
}
```

- [ ] **Step 6: Typecheck**

Run: `npm --prefix arei-admin run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add arei-admin/curation/ListingDrawer.tsx
git commit -m "feat(admin): Deep review button + Field gaps panel in ListingDrawer"
```

---

## Task 9: Document the deep path

**Files:**
- Modify: `docs/02-data-engine/kazaverde-curated-reviewer.md`

- [ ] **Step 1: Update the doc**

In `docs/02-data-engine/kazaverde-curated-reviewer.md`, under "What we explicitly did NOT build (yet)", remove the line "A self-fetching agent loop that re-reads the source URL." and add a new section after "## The contract":

```markdown
## Deep review (field-gap diagnosis)

A second, opt-in path diagnoses *why* a row's fields are empty by live-fetching
the source page. Operator clicks **Deep review** in the drawer →
`/api/deep-review-listing` calls `claude-sonnet-4-6` with Anthropic's `web_fetch`
tool, building the prompt from `_reviewerLib.cjs::buildDeepReviewPrompt`. The
verdict adds:

- `missing_field_report[]` — per empty field: `scraper_missed` (value is on the
  page → `found_value` + `evidence`), `absent_at_source`, or `uncertain`.
- `unmapped_fields[]` — page values with no curated column (e.g. terrace area).
- `fetch_status` — `ok` | `failed` | `skipped`.

Applying a `scraper_missed` field patches the row **and** inserts a confirmed-gap
row into `kv_curated.scraper_gap_log` (atomic, via `apply-listing-patch`), so
systematic scraper misses are queryable by `source_id, field`. The cheap Haiku
`/api/review-listing` path and bulk "Review all" are unchanged. See
`docs/superpowers/specs/2026-06-02-kv-deep-review-field-gap-diagnosis-design.md`.
```

- [ ] **Step 2: Verify, then commit**

Run: `grep -n "Deep review (field-gap" docs/02-data-engine/kazaverde-curated-reviewer.md`
Expected: matches the new heading line.

```bash
git add docs/02-data-engine/kazaverde-curated-reviewer.md
git commit -m "docs(data-engine): document deep-review field-gap diagnosis path"
```

---

## Final verification

- [ ] **All lib tests pass**

Run: `node --test tests/kvListingReviewer.test.cjs`
Expected: PASS, including every test added in Tasks 1–3.

- [ ] **Admin typecheck passes**

Run: `npm --prefix arei-admin run typecheck`
Expected: PASS.

- [ ] **Endpoints import cleanly**

Run: `node --input-type=module -e "await import('./arei-admin/api/deep-review-listing.js'); await import('./arei-admin/api/apply-listing-patch.js'); console.log('ok')"`
Expected: prints `ok`.
```
