# KV Listing Reviewer Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an on-demand LLM reviewer for `kv_curated.listings` so the operator can review a row, see a verdict + reasons + a structured patch, and one-click apply the patch or change `publish_status` — all from the AREI admin.

**Architecture:** Three thin Vercel serverless functions under `arei-admin/api/` (list/get kv_curated rows, run review, apply patch) backed by pg via `DATABASE_URL`. One Anthropic Haiku 4.5 call per review, no tool use, JSON-only output. A new admin view (`CuratedReviewView`) lists the `needs_review` queue and opens a review modal.

**Tech Stack:** Node 20 ESM serverless functions (`.js` to match the existing `arei-admin/api/` pattern), `pg` via `createPostgresClient` from `core/postgresClient.ts`, `@anthropic-ai/sdk`, React 18 + Tailwind 4 for the admin UI, `node --test` with `node:test` for unit tests.

**Design spec:** `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md`

---

## File map

**New files**

- `arei-admin/api/_reviewerLib.js` — pure helpers shared by the review/apply endpoints: `buildReviewPrompt(row)`, `parseAndValidateVerdict(text)`, `buildPatchSql(id, patch, publishStatus)`. Pure functions = easy to unit-test, no DB or network.
- `arei-admin/api/kv-curated-listing.js` — GET endpoint. Two modes: `?id=...` returns one row; no `id` returns the `needs_review` list.
- `arei-admin/api/review-listing.js` — POST endpoint. Body `{ id }`. Returns the parsed verdict JSON.
- `arei-admin/api/apply-listing-patch.js` — POST endpoint. Body `{ id, patch, publish_status? }`. Returns the updated row.
- `arei-admin/CuratedReviewView.tsx` — list + detail panel + review modal.
- `tests/kvListingReviewer.test.cjs` — unit tests for the three pure helpers.

**Modified files**

- `arei-admin/types.ts` — add `CuratedListing`, `ReviewVerdict`, `SuggestedPatch`, `ReviewVerdictResult` types.
- `arei-admin/data.ts` — add four client functions calling the new endpoints.
- `arei-admin/app.tsx` — register a new `"curated"` tab in the nav and render `CuratedReviewView` for it.

**No code change but read-only reference**

- `arei-admin/api/social-market-news.js` — mirror its auth pattern (`getBearerToken` / `isCookieAuthorized` / admin_users lookup).
- `docs/FEED_CONTRACT.md` — canonical CV island list.
- `core/pipeline/propertyType.ts` — canonical property_type enum used in the prompt.
- `core/postgresClient.ts` — the only sanctioned way to talk to `kv_curated`.

---

## Pre-flight (one-time, no commit)

- [ ] **Step 0.1: Confirm Anthropic SDK is resolvable from arei-admin**

Run:
```bash
cd arei-admin && node -e "import('@anthropic-ai/sdk').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"
```
Expected output: `ok`.
If it fails with `ERR_MODULE_NOT_FOUND`, add it to `arei-admin/package.json` dependencies (`"@anthropic-ai/sdk": "^0.91.1"`) and `npm install` inside `arei-admin/`.

- [ ] **Step 0.2: Confirm `pg` is resolvable from arei-admin**

Run:
```bash
cd arei-admin && node -e "import('pg').then(()=>console.log('ok')).catch(e=>{console.error(e);process.exit(1)})"
```
Expected output: `ok`. Same remediation if missing (`"pg": "^8.18.0"`).

- [ ] **Step 0.3: Confirm `DATABASE_URL` is set locally**

Run:
```bash
grep -c '^DATABASE_URL=' .env
```
Expected output: `1`. If `0`, the plan can't be verified locally — stop and ask the operator to provide it before continuing.

---

## Task 1: `buildReviewPrompt` — prompt builder

**Files:**
- Create: `arei-admin/api/_reviewerLib.js`
- Test: `tests/kvListingReviewer.test.cjs`

The prompt takes a row from `kv_curated.listings` and returns `{ system, user }` strings ready to pass to `anthropic.messages.create`. The system prompt pins the JSON contract, the allow-lists, and the "no guessing" rule. The user prompt embeds the row.

- [ ] **Step 1.1: Write the failing test**

Create `tests/kvListingReviewer.test.cjs`:
```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { buildReviewPrompt } = require("../arei-admin/api/_reviewerLib.js");

test("buildReviewPrompt embeds title, description, and structured fields", () => {
  const row = {
    id: "hcv_xyz",
    title: "Ground Floor 2 Bed KEY READY Apartment",
    description: "A two-bedroom apartment in Vila Verde, Santa Maria, Sal.",
    source_url_primary: "https://example.com/listing/xyz",
    island: "Sal",
    city: "Santa Maria",
    property_type: "apartment",
    bedrooms: null,
    bathrooms: null,
    price: 97500,
    currency: "EUR",
    property_size_sqm: null,
    land_area_sqm: null,
    image_urls: ["a", "b", "c"],
    publish_status: "needs_review",
  };

  const { system, user } = buildReviewPrompt(row);

  assert.match(system, /Output JSON only/);
  assert.match(system, /publish.*hold.*hide/);
  assert.match(system, /Boa Vista/);          // island allow-list present
  assert.match(system, /apartment/);          // property_type enum present
  assert.match(user, /Ground Floor 2 Bed KEY READY Apartment/);
  assert.match(user, /Vila Verde/);
  assert.match(user, /"bedrooms": null/);     // structured fields embedded as JSON
  assert.match(user, /"image_urls_count": 3/);
});

test("buildReviewPrompt truncates very long descriptions", () => {
  const long = "x".repeat(5000);
  const { user } = buildReviewPrompt({
    id: "id", title: "t", description: long, source_url_primary: "u",
    island: "Sal", city: null, property_type: null,
    bedrooms: null, bathrooms: null, price: null, currency: "EUR",
    property_size_sqm: null, land_area_sqm: null,
    image_urls: [], publish_status: "needs_review",
  });
  // 2000 char cap + a marker that the rest was truncated
  assert.ok(user.length < 4000, `user prompt was ${user.length} chars, expected < 4000`);
  assert.match(user, /truncated/);
});
```

- [ ] **Step 1.2: Run the test to confirm it fails**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: failure with `Cannot find module '../arei-admin/api/_reviewerLib.js'`.

- [ ] **Step 1.3: Implement `buildReviewPrompt`**

Create `arei-admin/api/_reviewerLib.js`:
```js
// Pure helpers for the kv_curated listing reviewer.
// No DB, no network, no env — so this file is unit-testable in isolation.

const CV_ISLANDS = [
  "Boa Vista", "Brava", "Fogo", "Maio", "Sal",
  "Santiago", "Santo Antão", "São Nicolau", "São Vicente",
];

// Canonical property_type values the model may emit. Mirrors
// core/pipeline/propertyType.ts. Keep in sync when that list changes.
const PROPERTY_TYPES = [
  "villa", "apartment", "house", "townhouse", "penthouse",
  "studio", "bungalow", "maisonette", "duplex", "land", "commercial",
];

const PATCH_FIELDS = [
  "bedrooms", "bathrooms", "property_type",
  "island", "city",
  "price", "property_size_sqm", "land_area_sqm",
];

const DESCRIPTION_MAX = 2000;

function buildReviewPrompt(row) {
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

  const system = [
    "You are a publish-readiness reviewer for a Cape Verde real-estate listings feed.",
    "Compare the SOURCE TEXT (title + description) against the STRUCTURED FIELDS.",
    "",
    "Output JSON only. No prose outside the JSON. The schema is:",
    "{",
    '  "verdict": "publish" | "hold" | "hide",',
    '  "confidence": number (0..1),',
    '  "reasons": string[],            // 1-5 short bullets',
    '  "suggested_patch": {            // any subset; omit keys you are not changing',
    '    "bedrooms"?: number|null, "bathrooms"?: number|null,',
    '    "property_type"?: string, "island"?: string, "city"?: string|null,',
    '    "price"?: number|null,',
    '    "property_size_sqm"?: number|null, "land_area_sqm"?: number|null',
    "  },",
    '  "hide_reason"?: string         // present only when verdict === "hide"',
    "}",
    "",
    'Rules for suggested_patch: only suggest a field if it is DIRECTLY supported by the source text. If unsure, OMIT the field. No guessing.',
    'verdict = "hide" when the source text says the listing is reserved, sold, withdrawn, or off market. Put the matched phrase in hide_reason.',
    'verdict = "hold" when there is at least one fixable mismatch the operator should review before publishing.',
    'verdict = "publish" only when the row is internally consistent AND has a non-null source URL, a valid island, and at least one image.',
    "",
    "Valid islands (use exactly these spellings): " + CV_ISLANDS.join(", "),
    "Valid property_type values: " + PROPERTY_TYPES.join(", "),
  ].join("\n");

  const user = [
    "SOURCE TEXT",
    "title: " + (row.title ?? ""),
    "source_url: " + (row.source_url_primary ?? ""),
    "description:",
    description,
    "",
    "STRUCTURED FIELDS",
    JSON.stringify(structured, null, 2),
  ].join("\n");

  return { system, user };
}

module.exports = { buildReviewPrompt, CV_ISLANDS, PROPERTY_TYPES, PATCH_FIELDS };
```

- [ ] **Step 1.4: Run the test to confirm it passes**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: both tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add arei-admin/api/_reviewerLib.js tests/kvListingReviewer.test.cjs
git commit -m "feat(admin): buildReviewPrompt for kv listing reviewer"
```

---

## Task 2: `parseAndValidateVerdict`

**Files:**
- Modify: `arei-admin/api/_reviewerLib.js`
- Modify: `tests/kvListingReviewer.test.cjs`

Take the raw text the model returned and produce either a typed verdict object or throw a clear error. Strips a leading ```​json fence if present.

- [ ] **Step 2.1: Add failing tests**

Append to `tests/kvListingReviewer.test.cjs`:
```js
const { parseAndValidateVerdict } = require("../arei-admin/api/_reviewerLib.js");

test("parseAndValidateVerdict accepts a clean verdict", () => {
  const raw = JSON.stringify({
    verdict: "hold",
    confidence: 0.8,
    reasons: ["title says 2 Bed, bedrooms is null"],
    suggested_patch: { bedrooms: 2 },
  });
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.verdict, "hold");
  assert.equal(v.suggested_patch.bedrooms, 2);
});

test("parseAndValidateVerdict strips a json code fence", () => {
  const raw = "```json\n" + JSON.stringify({
    verdict: "publish", confidence: 0.9, reasons: ["ok"], suggested_patch: {},
  }) + "\n```";
  const v = parseAndValidateVerdict(raw);
  assert.equal(v.verdict, "publish");
});

test("parseAndValidateVerdict rejects unknown patch keys", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: ["x"],
    suggested_patch: { not_a_field: 1 },
  });
  assert.throws(() => parseAndValidateVerdict(raw), /unknown patch key/i);
});

test("parseAndValidateVerdict rejects bad verdict enum", () => {
  const raw = JSON.stringify({
    verdict: "maybe", confidence: 0.5, reasons: ["x"], suggested_patch: {},
  });
  assert.throws(() => parseAndValidateVerdict(raw), /verdict/);
});

test("parseAndValidateVerdict requires reasons array", () => {
  const raw = JSON.stringify({
    verdict: "hold", confidence: 0.5, reasons: "nope", suggested_patch: {},
  });
  assert.throws(() => parseAndValidateVerdict(raw), /reasons/);
});
```

- [ ] **Step 2.2: Run to confirm failure**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: the new tests fail with `parseAndValidateVerdict is not a function`.

- [ ] **Step 2.3: Implement `parseAndValidateVerdict`**

Append to `arei-admin/api/_reviewerLib.js` (before the `module.exports` line):
```js
const VERDICTS = new Set(["publish", "hold", "hide"]);

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return trimmed;
}

function parseAndValidateVerdict(raw) {
  let json;
  try {
    json = JSON.parse(stripCodeFence(raw));
  } catch (e) {
    throw new Error("verdict was not valid JSON: " + e.message);
  }

  if (!json || typeof json !== "object") throw new Error("verdict is not an object");
  if (!VERDICTS.has(json.verdict)) throw new Error("verdict must be publish|hold|hide");
  if (typeof json.confidence !== "number" || json.confidence < 0 || json.confidence > 1) {
    throw new Error("confidence must be a number in [0,1]");
  }
  if (!Array.isArray(json.reasons) || !json.reasons.every(r => typeof r === "string")) {
    throw new Error("reasons must be a string[]");
  }
  if (json.suggested_patch == null || typeof json.suggested_patch !== "object") {
    throw new Error("suggested_patch must be an object");
  }
  for (const key of Object.keys(json.suggested_patch)) {
    if (!PATCH_FIELDS.includes(key)) {
      throw new Error("unknown patch key: " + key);
    }
  }
  if (json.verdict === "hide" && json.hide_reason != null && typeof json.hide_reason !== "string") {
    throw new Error("hide_reason must be a string");
  }
  return json;
}
```

Then update the export line at the bottom:
```js
module.exports = { buildReviewPrompt, parseAndValidateVerdict, CV_ISLANDS, PROPERTY_TYPES, PATCH_FIELDS };
```

- [ ] **Step 2.4: Run to confirm pass**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: all tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add arei-admin/api/_reviewerLib.js tests/kvListingReviewer.test.cjs
git commit -m "feat(admin): parseAndValidateVerdict for reviewer JSON output"
```

---

## Task 3: `buildPatchSql`

**Files:**
- Modify: `arei-admin/api/_reviewerLib.js`
- Modify: `tests/kvListingReviewer.test.cjs`

Build a parameterised `UPDATE` for `kv_curated.listings`. Only sets fields that appear in `patch`. If `publishStatus` is supplied, sets it too, and stamps `first_published_at` when promoting.

- [ ] **Step 3.1: Add failing tests**

Append to `tests/kvListingReviewer.test.cjs`:
```js
const { buildPatchSql } = require("../arei-admin/api/_reviewerLib.js");

test("buildPatchSql sets only the fields present", () => {
  const { text, values } = buildPatchSql("hcv_xyz", { bedrooms: 2, property_type: "apartment" }, null);
  assert.match(text, /UPDATE kv_curated\.listings SET/);
  assert.match(text, /bedrooms\s*=\s*\$1/);
  assert.match(text, /property_type\s*=\s*\$2/);
  assert.match(text, /updated_at\s*=\s*now\(\)/);
  assert.match(text, /WHERE id\s*=\s*\$3/);
  assert.deepEqual(values, [2, "apartment", "hcv_xyz"]);
  assert.doesNotMatch(text, /publish_status/);
});

test("buildPatchSql includes publish_status when supplied", () => {
  const { text, values } = buildPatchSql("hcv_xyz", {}, "hidden");
  assert.match(text, /publish_status\s*=\s*\$1/);
  assert.match(text, /WHERE id\s*=\s*\$2/);
  assert.deepEqual(values, ["hidden", "hcv_xyz"]);
});

test("buildPatchSql stamps first_published_at when promoting to published", () => {
  const { text } = buildPatchSql("hcv_xyz", {}, "published");
  assert.match(text, /first_published_at\s*=\s*coalesce\(first_published_at,\s*now\(\)\)/);
});

test("buildPatchSql rejects empty patch with no publish_status", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", {}, null), /nothing to update/i);
});

test("buildPatchSql rejects unknown patch field", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", { foo: 1 }, null), /unknown patch key/i);
});

test("buildPatchSql rejects invalid publish_status", () => {
  assert.throws(() => buildPatchSql("hcv_xyz", { bedrooms: 1 }, "weird"), /publish_status/);
});

test("buildPatchSql allows returning the row", () => {
  const { text } = buildPatchSql("hcv_xyz", { bedrooms: 1 }, null);
  assert.match(text, /RETURNING \*/);
});
```

- [ ] **Step 3.2: Run to confirm failure**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: new tests fail with `buildPatchSql is not a function`.

- [ ] **Step 3.3: Implement `buildPatchSql`**

Append to `arei-admin/api/_reviewerLib.js` (before the `module.exports`):
```js
const VALID_PUBLISH_STATUS = new Set(["needs_review", "published", "hidden"]);

function buildPatchSql(id, patch, publishStatus) {
  const assigns = [];
  const values = [];
  let i = 1;

  for (const [k, v] of Object.entries(patch || {})) {
    if (!PATCH_FIELDS.includes(k)) throw new Error("unknown patch key: " + k);
    assigns.push(k + " = $" + i);
    values.push(v);
    i++;
  }

  if (publishStatus != null) {
    if (!VALID_PUBLISH_STATUS.has(publishStatus)) {
      throw new Error("publish_status must be one of " + [...VALID_PUBLISH_STATUS].join("|"));
    }
    assigns.push("publish_status = $" + i);
    values.push(publishStatus);
    i++;
    if (publishStatus === "published") {
      assigns.push("first_published_at = coalesce(first_published_at, now())");
    }
  }

  if (assigns.length === 0) throw new Error("nothing to update");

  assigns.push("updated_at = now()");
  values.push(id);

  const text =
    "UPDATE kv_curated.listings SET " + assigns.join(", ") +
    " WHERE id = $" + i + " RETURNING *";
  return { text, values };
}
```

Update the export line at the bottom:
```js
module.exports = { buildReviewPrompt, parseAndValidateVerdict, buildPatchSql, CV_ISLANDS, PROPERTY_TYPES, PATCH_FIELDS };
```

- [ ] **Step 3.4: Run to confirm pass**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: all tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add arei-admin/api/_reviewerLib.js tests/kvListingReviewer.test.cjs
git commit -m "feat(admin): buildPatchSql for kv_curated patch endpoint"
```

---

## Task 4: GET `kv-curated-listing` endpoint

**Files:**
- Create: `arei-admin/api/kv-curated-listing.js`

Two modes:
- `GET /api/kv-curated-listing` → returns `{ items: [...] }` of needs_review rows (sorted by `first_seen_at` desc)
- `GET /api/kv-curated-listing?id=...` → returns the full row

Uses `createPostgresClient` from `../../core/postgresClient` (relative import; Vercel bundles it). Auth mirrors `social-market-news.js`.

- [ ] **Step 4.1: Create the endpoint**

```js
// arei-admin/api/kv-curated-listing.js
import { createClient } from "@supabase/supabase-js";
import { createPostgresClient } from "../../core/postgresClient.js";

const COOKIE_NAME = "admin_session";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorize(req) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const sb = getSupabase();
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (adminError) return { ok: false, status: 500, error: adminError.message };
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

const LIST_COLS =
  "id, publish_status, title, source_id_primary, source_url_primary, island, city, " +
  "property_type, bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm, " +
  "image_urls, first_seen_at, last_verified_at";

const DETAIL_COLS = LIST_COLS + ", description";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  const client = createPostgresClient();
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
    const { rows } = await client.query(
      `SELECT ${LIST_COLS} FROM kv_curated.listings
       WHERE publish_status = 'needs_review'
       ORDER BY first_seen_at DESC NULLS LAST
       LIMIT 200`,
    );
    return send(res, 200, { items: rows });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
```

> **Note on the `../../core/postgresClient.js` import:** the existing pipeline file is `core/postgresClient.ts`. When Vercel deploys the admin, the file resolves through TypeScript compilation. If the local `vercel dev` (Step 4.2) cannot resolve it, fall back to inlining a tiny helper:
> ```js
> import pg from "pg";
> function createPostgresClient() {
>   if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
>   return new pg.Client({ connectionString: process.env.DATABASE_URL });
> }
> ```
> Use the same fallback in Tasks 5 and 6 if needed.

- [ ] **Step 4.2: Smoke-test the endpoint locally**

```bash
cd arei-admin && ADMIN_SESSION_SECRET=local-dev npx vercel dev --listen 3030
```
In a second terminal:
```bash
curl -s -H 'Cookie: admin_session=local-dev' http://localhost:3030/api/kv-curated-listing | head -c 400; echo
```
Expected: a JSON object whose `items[0].publish_status` is `"needs_review"` (the queue currently has ~44 rows).

Then:
```bash
curl -s -H 'Cookie: admin_session=local-dev' \
  "http://localhost:3030/api/kv-curated-listing?id=hcv_0931b1abadab" | head -c 200; echo
```
Expected: a single row JSON with a non-null `description`.

Stop `vercel dev` after verifying.

- [ ] **Step 4.3: Commit**

```bash
git add arei-admin/api/kv-curated-listing.js
git commit -m "feat(admin): GET kv-curated-listing endpoint (list + detail)"
```

---

## Task 5: POST `review-listing` endpoint

**Files:**
- Create: `arei-admin/api/review-listing.js`

Loads the row, builds the prompt via `_reviewerLib`, calls Anthropic Haiku 4.5, parses + validates the JSON, returns it.

- [ ] **Step 5.1: Create the endpoint**

```js
// arei-admin/api/review-listing.js
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { createPostgresClient } from "../../core/postgresClient.js";
import { buildReviewPrompt, parseAndValidateVerdict } from "./_reviewerLib.js";

const COOKIE_NAME = "admin_session";
const MODEL = "claude-haiku-4-5-20251001";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const m = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(m && m[1] === secret);
}

async function authorize(req) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, status: 500, error: "Supabase env not configured" };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (adminError) return { ok: false, status: 500, error: adminError.message };
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (chunk) => { buf += chunk; });
    req.on("end", () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

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

  const client = createPostgresClient();
  let row;
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title, description, source_url_primary, island, city, property_type,
              bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm,
              image_urls, publish_status
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

  const { system, user } = buildReviewPrompt(row);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let raw;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = resp.content.find((c) => c.type === "text");
    raw = block?.text ?? "";
  } catch (err) {
    return send(res, 502, { error: "model call failed: " + (err.message || err) });
  }

  let verdict;
  try { verdict = parseAndValidateVerdict(raw); }
  catch (err) { return send(res, 502, { error: err.message, raw }); }

  return send(res, 200, { id: row.id, verdict });
}
```

- [ ] **Step 5.2: Smoke-test against a real row**

```bash
cd arei-admin && ADMIN_SESSION_SECRET=local-dev npx vercel dev --listen 3030
```
Second terminal:
```bash
curl -s -X POST \
  -H 'Cookie: admin_session=local-dev' \
  -H 'Content-Type: application/json' \
  -d '{"id":"hcv_0931b1abadab"}' \
  http://localhost:3030/api/review-listing | tee /tmp/review.json
```
Expected output shape:
```json
{ "id": "hcv_0931b1abadab", "verdict": { "verdict": "hold", "confidence": 0.x, "reasons": [...], "suggested_patch": { "bedrooms": 2 } } }
```
The exact verdict text varies; what matters is the schema parses cleanly and a sensible patch (bedrooms = 2 inferred from "2 Bed" in title) is present.

If the call fails with HTTP 502 and `raw` set, the model returned non-JSON — capture the `raw` value and tighten the system prompt's JSON-only instruction.

- [ ] **Step 5.3: Commit**

```bash
git add arei-admin/api/review-listing.js
git commit -m "feat(admin): POST review-listing (Haiku 4.5)"
```

---

## Task 6: POST `apply-listing-patch` endpoint

**Files:**
- Create: `arei-admin/api/apply-listing-patch.js`

Applies a subset of fields and optionally changes `publish_status`. Returns the updated row.

- [ ] **Step 6.1: Create the endpoint**

```js
// arei-admin/api/apply-listing-patch.js
import { createClient } from "@supabase/supabase-js";
import { createPostgresClient } from "../../core/postgresClient.js";
import { buildPatchSql } from "./_reviewerLib.js";

const COOKIE_NAME = "admin_session";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const m = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(m && m[1] === secret);
}

async function authorize(req) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, status: 500, error: "Supabase env not configured" };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (adminError) return { ok: false, status: 500, error: adminError.message };
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => { buf += c; });
    req.on("end", () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  let body;
  try { body = await readJsonBody(req); }
  catch (e) { return send(res, 400, { error: "invalid JSON body: " + e.message }); }

  const id = body?.id;
  const patch = body?.patch ?? {};
  const publishStatus = body?.publish_status ?? null;

  if (!id || typeof id !== "string") return send(res, 400, { error: "id is required" });
  if (patch && typeof patch !== "object") return send(res, 400, { error: "patch must be an object" });

  let query;
  try { query = buildPatchSql(id, patch, publishStatus); }
  catch (err) { return send(res, 400, { error: err.message }); }

  const client = createPostgresClient();
  await client.connect();
  try {
    const { rows } = await client.query(query.text, query.values);
    if (rows.length === 0) return send(res, 404, { error: "listing not found" });
    return send(res, 200, { row: rows[0] });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
```

- [ ] **Step 6.2: Smoke-test (read-only path)**

A real write would change production. Instead, verify the error paths first:
```bash
cd arei-admin && ADMIN_SESSION_SECRET=local-dev npx vercel dev --listen 3030
```
```bash
curl -s -X POST -H 'Cookie: admin_session=local-dev' -H 'Content-Type: application/json' \
  -d '{"id":"hcv_does_not_exist","patch":{"bedrooms":2}}' \
  http://localhost:3030/api/apply-listing-patch
```
Expected: `{"error":"listing not found"}` (404).

```bash
curl -s -X POST -H 'Cookie: admin_session=local-dev' -H 'Content-Type: application/json' \
  -d '{"id":"hcv_0931b1abadab","patch":{"not_a_field":1}}' \
  http://localhost:3030/api/apply-listing-patch
```
Expected: `{"error":"unknown patch key: not_a_field"}` (400).

- [ ] **Step 6.3: Smoke-test a real write on a needs_review row (still safe)**

`needs_review` rows are off the public feed; writing to them does not change production. Pick one from `kv_curated.listings WHERE publish_status='needs_review'`:
```bash
curl -s -X POST -H 'Cookie: admin_session=local-dev' -H 'Content-Type: application/json' \
  -d '{"id":"hcv_0931b1abadab","patch":{"bedrooms":2}}' \
  http://localhost:3030/api/apply-listing-patch
```
Expected: HTTP 200 with the updated row showing `bedrooms: 2`. Confirm with:
```bash
TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
  npx ts-node --transpile-only -e "
    const pg = require('pg'); require('dotenv').config();
    (async () => {
      const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query(\"SELECT id, bedrooms, publish_status, updated_at FROM kv_curated.listings WHERE id='hcv_0931b1abadab'\");
      console.log(r.rows);
      await c.end();
    })();
  "
```
Expected: `bedrooms: 2`, `publish_status: 'needs_review'`, fresh `updated_at`.

- [ ] **Step 6.4: Commit**

```bash
git add arei-admin/api/apply-listing-patch.js
git commit -m "feat(admin): POST apply-listing-patch (kv_curated UPDATE)"
```

---

## Task 7: Admin types

**Files:**
- Modify: `arei-admin/types.ts`

Add the types used by the new view + data client. Append at the end of the file.

- [ ] **Step 7.1: Append the types**

```ts
// --- KV Curated reviewer ---

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
}

export interface SuggestedPatch {
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string;
  island?: string;
  city?: string | null;
  price?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
}

export interface ReviewVerdict {
  verdict: "publish" | "hold" | "hide";
  confidence: number;
  reasons: string[];
  suggested_patch: SuggestedPatch;
  hide_reason?: string;
}

export interface ReviewVerdictResult {
  id: string;
  verdict: ReviewVerdict;
}
```

- [ ] **Step 7.2: Typecheck**

```bash
cd arei-admin && npm run typecheck
```
Expected: no errors.

- [ ] **Step 7.3: Commit**

```bash
git add arei-admin/types.ts
git commit -m "feat(admin): types for kv curated reviewer"
```

---

## Task 8: Admin data client functions

**Files:**
- Modify: `arei-admin/data.ts`

Add four thin client functions that hit the new endpoints. They use the same `supabaseAuth` session token the rest of the admin uses.

- [ ] **Step 8.1: Append the client helpers**

Append at the end of `arei-admin/data.ts`:
```ts
// ============================================
// KV CURATED REVIEWER
// ============================================

import type { CuratedListing, ReviewVerdictResult, SuggestedPatch } from "./types";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getCuratedNeedsReviewList(): Promise<CuratedListing[]> {
  const res = await fetch("/api/kv-curated-listing", { headers: { ...(await authHeader()) } });
  if (!res.ok) throw new Error(`getCuratedNeedsReviewList: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.items as CuratedListing[];
}

export async function getCuratedListing(id: string): Promise<CuratedListing> {
  const res = await fetch(`/api/kv-curated-listing?id=${encodeURIComponent(id)}`, {
    headers: { ...(await authHeader()) },
  });
  if (!res.ok) throw new Error(`getCuratedListing: ${res.status} ${await res.text()}`);
  return (await res.json()) as CuratedListing;
}

export async function reviewListing(id: string): Promise<ReviewVerdictResult> {
  const res = await fetch("/api/review-listing", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`reviewListing: ${res.status} ${await res.text()}`);
  return (await res.json()) as ReviewVerdictResult;
}

export async function applyListingPatch(
  id: string,
  patch: SuggestedPatch,
  publishStatus?: "needs_review" | "published" | "hidden",
): Promise<CuratedListing> {
  const res = await fetch("/api/apply-listing-patch", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ id, patch, publish_status: publishStatus ?? null }),
  });
  if (!res.ok) throw new Error(`applyListingPatch: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.row as CuratedListing;
}
```

- [ ] **Step 8.2: Typecheck**

```bash
cd arei-admin && npm run typecheck
```
Expected: no errors.

- [ ] **Step 8.3: Commit**

```bash
git add arei-admin/data.ts
git commit -m "feat(admin): client functions for kv curated reviewer"
```

---

## Task 9: `CuratedReviewView` component

**Files:**
- Create: `arei-admin/CuratedReviewView.tsx`

A list pane on the left (queue, ~44 items), a detail pane on the right that shows the selected row's source link, title, description excerpt, structured fields, and a `Review` button. Clicking opens an inline panel (no portal — keep it dead simple) with verdict + reasons + a field diff with checkboxes + apply/hide/cancel.

- [ ] **Step 9.1: Create the component**

```tsx
// arei-admin/CuratedReviewView.tsx
import { useEffect, useMemo, useState } from "react";
import {
  applyListingPatch,
  getCuratedNeedsReviewList,
  reviewListing,
} from "./data";
import type { CuratedListing, ReviewVerdict, SuggestedPatch } from "./types";

export function CuratedReviewView() {
  const [items, setItems] = useState<CuratedListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setItems(await getCuratedNeedsReviewList());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      <aside className="col-span-4 border border-border-strong rounded">
        <header className="px-3 py-2 border-b border-border-strong flex items-center justify-between">
          <span className="text-sm font-medium">needs_review ({items.length})</span>
          <button onClick={reload} className="text-xs underline">refresh</button>
        </header>
        {loading && <div className="p-3 text-xs text-foreground-muted">loading…</div>}
        {error && <div className="p-3 text-xs text-red-500">{error}</div>}
        <ul className="max-h-[70vh] overflow-y-auto">
          {items.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => setSelectedId(l.id)}
                className={
                  "w-full text-left px-3 py-2 border-b border-border-strong text-xs " +
                  (l.id === selectedId ? "bg-surface-3" : "hover:bg-surface-2")
                }
              >
                <div className="font-mono text-foreground-muted">{l.source_id_primary} · {l.island}</div>
                <div className="font-medium truncate">{l.title}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="col-span-8">
        {selected
          ? <CuratedDetail listing={selected} onApplied={reload} />
          : <div className="text-sm text-foreground-muted p-6">Select a listing on the left.</div>}
      </section>
    </div>
  );
}

function CuratedDetail({ listing, onApplied }: { listing: CuratedListing; onApplied: () => void }) {
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVerdict(null);
    setError(null);
    setAcceptedKeys(new Set());
  }, [listing.id]);

  async function runReview() {
    setReviewing(true);
    setError(null);
    try {
      const r = await reviewListing(listing.id);
      setVerdict(r.verdict);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
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
    if (!verdict) return;
    const subset: SuggestedPatch = {};
    for (const k of acceptedKeys) {
      (subset as Record<string, unknown>)[k] = (verdict.suggested_patch as Record<string, unknown>)[k];
    }
    try {
      await applyListingPatch(listing.id, subset, publishStatus);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const patchEntries = verdict ? Object.entries(verdict.suggested_patch) : [];

  return (
    <div className="border border-border-strong rounded p-4 space-y-4">
      <header className="space-y-1">
        <div className="text-xs font-mono text-foreground-muted">{listing.id}</div>
        <h2 className="text-lg font-semibold">{listing.title}</h2>
        {listing.source_url_primary && (
          <a href={listing.source_url_primary} target="_blank" rel="noopener noreferrer"
             className="text-xs underline">view source ↗</a>
        )}
      </header>

      <dl className="grid grid-cols-4 gap-2 text-xs">
        <Field label="island" value={listing.island} />
        <Field label="city" value={listing.city} />
        <Field label="type" value={listing.property_type} />
        <Field label="status" value={listing.publish_status} />
        <Field label="bedrooms" value={listing.bedrooms} />
        <Field label="bathrooms" value={listing.bathrooms} />
        <Field label="price" value={listing.price} />
        <Field label="images" value={listing.image_urls.length} />
        <Field label="sqm" value={listing.property_size_sqm} />
        <Field label="land sqm" value={listing.land_area_sqm} />
      </dl>

      {listing.description && (
        <details className="text-xs">
          <summary className="cursor-pointer text-foreground-muted">description</summary>
          <pre className="whitespace-pre-wrap mt-2">{listing.description.slice(0, 1200)}{listing.description.length > 1200 ? "…" : ""}</pre>
        </details>
      )}

      <div className="flex gap-2 items-center">
        <button
          onClick={runReview}
          disabled={reviewing}
          className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3"
        >
          {reviewing ? "Reviewing…" : "Review"}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      {verdict && (
        <div className="border-t border-border-strong pt-3 space-y-3">
          <div className="flex items-center gap-3">
            <VerdictPill verdict={verdict.verdict} />
            <span className="text-xs text-foreground-muted">
              confidence {(verdict.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>

          {patchEntries.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Suggested patch</div>
              <table className="text-xs w-full">
                <thead><tr className="text-foreground-muted"><th></th><th>field</th><th>current</th><th>suggested</th></tr></thead>
                <tbody>
                  {patchEntries.map(([k, v]) => (
                    <tr key={k}>
                      <td><input type="checkbox" checked={acceptedKeys.has(k)} onChange={() => toggleKey(k)} /></td>
                      <td className="font-mono">{k}</td>
                      <td>{String((listing as Record<string, unknown>)[k] ?? "—")}</td>
                      <td>{String(v ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => apply()} className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3">
              Apply selected
            </button>
            <button onClick={() => apply("published")} className="px-3 py-1.5 text-sm rounded border border-green-700 text-green-300 hover:bg-green-900/30">
              Apply + Publish
            </button>
            <button onClick={() => apply("hidden")} className="px-3 py-1.5 text-sm rounded border border-red-700 text-red-300 hover:bg-red-900/30">
              Hide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-foreground-muted">{label}</div>
      <div className="font-mono">{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: "publish" | "hold" | "hide" }) {
  const styles = {
    publish: "bg-green-900/40 text-green-300 border-green-700",
    hold:    "bg-amber-900/40 text-amber-200 border-amber-700",
    hide:    "bg-red-900/40   text-red-300   border-red-700",
  } as const;
  return <span className={`px-2 py-0.5 text-xs rounded border ${styles[verdict]}`}>{verdict}</span>;
}
```

- [ ] **Step 9.2: Typecheck**

```bash
cd arei-admin && npm run typecheck
```
Expected: no errors. If the `surface-2`/`surface-3`/`border-strong` Tailwind classes are unknown in the current admin theme, replace them with raw colors (`bg-neutral-800`, `border-neutral-700`) — the design palette per `CLAUDE.md` is ink/sage/coral, so do not introduce new accent colors beyond the verdict pills (which are intentional traffic-light status, not brand surfaces).

- [ ] **Step 9.3: Commit**

```bash
git add arei-admin/CuratedReviewView.tsx
git commit -m "feat(admin): CuratedReviewView for kv listing reviewer"
```

---

## Task 10: Wire the new view into the admin nav

**Files:**
- Modify: `arei-admin/app.tsx`

The existing app uses a `tab` string to switch top-level views (the file already shows `tab === "chatlab"` near line 3957). Add `"curated"` to the tab type/union, render `<CuratedReviewView />` for it, and add a nav button.

- [ ] **Step 10.1: Find the tab union and nav buttons**

```bash
grep -n 'tab === "chatlab"\|tab === "\|setTab(\|type Tab\|Tab =' arei-admin/app.tsx | head -40
```
Note the line numbers of (a) the tab string union, (b) the nav button group, (c) the conditional rendering that includes `tab === "chatlab"`.

- [ ] **Step 10.2: Add the `"curated"` tab**

In `arei-admin/app.tsx`:

1. Add the import near the other view imports:
   ```ts
   import { CuratedReviewView } from "./CuratedReviewView";
   ```
2. Add `"curated"` to whatever tab string union exists (e.g. `type Tab = "..." | "chatlab" | "curated"`).
3. Add a nav button next to the existing `chatlab` button, matching its className exactly:
   ```tsx
   <button onClick={() => setTab("curated")} className={navBtnClass("curated")}>Curated review</button>
   ```
   (Use the exact same helper / className expression the neighbouring buttons use — copy it verbatim.)
4. Add the conditional render next to `{tab === "chatlab" && <PropertyChatLabView />}`:
   ```tsx
   {tab === "curated" && <CuratedReviewView />}
   ```

- [ ] **Step 10.3: Typecheck and dev-run**

```bash
cd arei-admin && npm run typecheck && npm run dev
```
Open `http://localhost:5173`, log in as an admin user, click the new `Curated review` tab.

Expected sequence:
1. Left pane lists ~44 `needs_review` rows.
2. Click one (e.g. a `cv_homescasaverde` row whose title contains `2 Bed`).
3. Right pane shows it.
4. Click `Review`. Within ~2s a verdict pill appears with reasons and a `suggested_patch` row (e.g. `bedrooms: 2`).
5. Toggle the checkbox, click `Apply selected`. The list refreshes; the row's `bedrooms` is updated in the DB.

Stop the dev server.

- [ ] **Step 10.4: Commit**

```bash
git add arei-admin/app.tsx
git commit -m "feat(admin): wire CuratedReviewView into nav"
```

---

## Post-implementation

- [ ] **Step P.1: Run the full unit test suite**

```bash
node --test tests/kvListingReviewer.test.cjs
```
Expected: all tests pass.

- [ ] **Step P.2: Update the spec status**

Edit `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md` and change the header `Status:` line from `Approved for planning` to `Implemented (PR <number>)` once the PR is open.

- [ ] **Step P.3: Open the PR**

```bash
gh pr create --title "feat(admin): on-demand kv_curated listing reviewer agent" --body "$(cat <<'EOF'
## Summary
- New AREI admin tab `Curated review` that lists `kv_curated.listings` `needs_review` rows
- One-click LLM review (Haiku 4.5) returning verdict + reasons + structured patch
- One-click apply selected patch fields and/or change publish_status (hide, publish)

Spec: docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md
Plan: docs/superpowers/plans/2026-06-01-kv-listing-reviewer-agent.md

## Test plan
- [ ] `node --test tests/kvListingReviewer.test.cjs` (3 helpers covered)
- [ ] Smoke a real `needs_review` row end-to-end in admin: review → apply patch → see DB row updated
- [ ] Verify auth: requests without a bearer token / admin cookie return 401/403
- [ ] Verify cost: a single review call returns in under 3s and uses ~1k input / ~300 output tokens
EOF
)"
```

---

## Self-review notes

Spec coverage:
- Architecture diagram ↔ Tasks 4–6 (endpoints) + Task 9 (UI) + Task 10 (nav wiring). ✓
- Prompt + output contract ↔ Task 1 + Task 2 (validation enforces the schema). ✓
- Admin UX (verdict pill, reasons, field diff with checkboxes, apply / hide / close) ↔ Task 9. ✓
- Storage = none in v1 ↔ deliberately absent from tasks. ✓
- Cost (Haiku 4.5, no retries, no streaming) ↔ Task 5 hard-codes `MODEL` and uses a single `messages.create`. ✓
- Out-of-scope items (audit log table, batch sweep, source re-fetch, AI description editing, image review) ↔ explicitly not present in any task. ✓
- Hard rule "no Supabase REST for kv_curated" ↔ all four endpoints use `createPostgresClient`. ✓
- Hard rule "Anthropic key server-side" ↔ key only read in `arei-admin/api/review-listing.js`. ✓

Type consistency check:
- `CuratedListing`, `SuggestedPatch`, `ReviewVerdict`, `ReviewVerdictResult` defined in Task 7, consumed identically in Tasks 8 and 9. ✓
- `PATCH_FIELDS` in `_reviewerLib.js` matches the keys on the `SuggestedPatch` TS interface. ✓
- `VALID_PUBLISH_STATUS` (`needs_review|published|hidden`) matches the `publish_status` enum on `CuratedListing` and the `applyListingPatch` parameter type. ✓
- The model identifier `claude-haiku-4-5-20251001` is used consistently with the spec. ✓
