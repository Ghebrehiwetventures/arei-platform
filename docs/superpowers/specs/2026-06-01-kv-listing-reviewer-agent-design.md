# KV Listing Reviewer Agent — Design

Date: 2026-06-01
Status: Approved for planning
Scope: Cape Verde (`kv_curated.listings`), admin-side, on-demand only.

## Problem

The KazaVerde curated pipeline lands rows in `kv_curated.listings` as
`publish_status = 'needs_review'`. Promotion to `'published'` is a manual SQL
step and is a live production change (the public feed `v1_feed_cv` serves only
published curated rows). Today there is no review UI; the operator promotes
rows blind.

Live state at design time:

- 425 published, 44 needs_review
- Sample inspection of the queue shows recurring issues:
  - structured fields disagreeing with the source text (e.g. title "2 Bed
    Apartment", `bedrooms` is null; title "Estúdio" or "Development Site"
    typed as generic `property`)
  - listings flagged in source text as sold/reserved still queued for publish
- Crude SQL probes (extreme prices, land-with-bedrooms, huge sqm) on the
  published set are clean, which means the valuable errors are semantic —
  comparing the unstructured text to the structured fields — exactly what an
  LLM is good at and SQL is not.

## Goal

A cheap, on-demand reviewer the operator triggers from the AREI admin per
listing. Produces:

1. a publish-readiness verdict (`publish` / `hold` / `hide`) with reasons, and
2. a structured patch the operator can one-click apply to fix the mismatches.

Explicit non-goals are listed at the end.

## Architecture

```
[Admin SPA]
   │  click "Review" on a listing
   ▼
[arei-admin/api/review-listing.ts]  (serverless function)
   │
   ├──▶ pg via DATABASE_URL ──▶ kv_curated.listings  (read row)
   │
   └──▶ Anthropic Messages API (claude-haiku-4-5-20251001)
         returns JSON verdict + reasons + suggested_patch
   ▲
   │  one-click "Apply"
   │
[arei-admin/api/apply-listing-patch.ts]  (serverless function)
   └──▶ pg via DATABASE_URL ──▶ kv_curated.listings  (UPDATE)
```

Hard rules followed:

- All `kv_curated` reads and writes go through `createPostgresClient()` and
  the pooler-backed `DATABASE_URL` (per
  `docs/02-data-engine/kazaverde-curated-feed-operations.md`). Never Supabase
  REST for kv_curated.
- The Anthropic API key stays server-side; the browser never sees it.

## Components

### 1. Review endpoint — `arei-admin/api/review-listing.ts`

Inputs: `listing_id` (POST body), authenticated admin JWT (same auth pattern
the existing `arei-admin/api/social-market-news.js` uses).

Behavior:

1. Load the row from `kv_curated.listings` by id.
2. Build the prompt (see §3).
3. Call Anthropic Messages with `max_tokens ≈ 600`, no tool use, JSON-only
   system instruction.
4. Parse the JSON, validate against the output contract.
5. Return the verdict object to the client. No DB write.

No retries beyond what the SDK does by default. No streaming. Errors return
HTTP 500 with a short message; the admin shows it inline.

### 2. Apply-patch endpoint — `arei-admin/api/apply-listing-patch.ts`

Inputs: `listing_id`, `patch` (the subset of fields the operator accepted),
optional `publish_status` change (`'published' | 'hidden' | 'needs_review'`).

Behavior:

1. Build a parameterised `UPDATE kv_curated.listings SET … WHERE id = $1`
   touching only the fields present in `patch` (plus `updated_at = now()` and
   optionally `publish_status`).
2. If `publish_status` is being set to `'published'`, also set
   `first_published_at = coalesce(first_published_at, now())`.
3. Return the new row.

Promotion to `published` is a live production change. The endpoint does not
treat it specially beyond stamping `first_published_at`; the operator is the
gate.

### 3. Admin UI

A new `Review` button on the listing detail view. Final placement is in the
listing detail surface (`app.tsx` listing view, or alongside the existing
`PropertyChatLab.tsx` per-listing surface — pick during implementation when
both files are open).

The button opens a modal with three blocks:

1. **Verdict pill** — green `publish` / amber `hold` / red `hide`, with
   confidence.
2. **Reasons** — bulleted list (the model returns 1–5 short bullets).
3. **Field diff** — a table of current vs. suggested values, one row per
   field present in `suggested_patch`. Each row has a checkbox; the operator
   accepts subsets.

Modal actions:

- `Apply selected` → calls apply-patch with the checked subset. Optionally
  also sets `publish_status` from the verdict (separate confirm).
- `Hide listing` → calls apply-patch with `publish_status = 'hidden'` and
  `notes = hide_reason` (if present).
- `Close` → no-op.

## Prompt and output contract

### Model

`claude-haiku-4-5-20251001`, `max_tokens = 600`, no tools, JSON-only output.

### Inputs in the prompt

- Source text: `title`, `description` truncated to ~2000 chars,
  `source_url_primary`
- Structured fields: `island`, `city`, `property_type`, `bedrooms`,
  `bathrooms`, `price`, `currency`, `property_size_sqm`, `land_area_sqm`,
  `image_urls.length`, `publish_status`
- Fixed allow-lists: the 9 valid CV islands (see `docs/FEED_CONTRACT.md`)
  and the canonical `property_type` enum used elsewhere in the pipeline (to
  prevent the model from inventing new types)

### System prompt rules

- Output JSON only, matching the schema below. No prose outside the JSON.
- Only suggest a field value if it is directly supported by the source text
  (title or description). If unsure, omit the field from `suggested_patch`.
  No guessing.
- Use `verdict = 'hide'` for clearly reserved/sold/withdrawn listings and
  set `hide_reason` to the matched phrase.
- Use `verdict = 'hold'` when there is a fixable mismatch and the operator
  should review the suggested patch before publishing.
- Use `verdict = 'publish'` when the row is internally consistent and
  complete enough for the public feed (per the feed-contract inclusion
  rules: non-null source_url, valid island, ≥1 image).

### Output schema

```ts
{
  verdict: "publish" | "hold" | "hide",
  confidence: number,           // 0–1
  reasons: string[],            // 1–5 short bullets
  suggested_patch: {
    bedrooms?: number | null,
    bathrooms?: number | null,
    property_type?: string,
    island?: string,
    city?: string | null,
    price?: number | null,
    land_area_sqm?: number | null,
    property_size_sqm?: number | null,
  },
  hide_reason?: string          // present only when verdict === "hide"
}
```

The endpoint validates the JSON shape and rejects unknown keys in
`suggested_patch`.

## Storage

No new tables in v1. Verdicts are returned to the client and discarded. The
operator re-clicks if they want a fresh review.

Deferred: a `kv_curated.review_log` table for audit trail (who reviewed
what, when, what patch was applied) can be added later without changing the
endpoints' shape — the apply endpoint becomes the natural write point.

## Cost

Per call (Haiku 4.5, approx):

- ~1k input tokens (row + system prompt), ~300 output tokens
- ≈ $0.0025 per click
- Full sweep of the current 44 needs_review queue ≈ $0.11

No retries, no batching, no streaming.

## Out of scope

- Sweeping the 425 already-published rows for retroactive errors.
- Auto-triggering at ingest time (calling the reviewer from
  `core/pipeline/runMarketSource.ts`). Easy to add later by invoking the same
  prompt; deliberately omitted now to keep the surface area small.
- Re-fetching source URLs to verify (agent-with-tools direction).
- Editing or regenerating `ai_descriptions`.
- Image-level review (broken images, watermarks, wrong subject).
- Cross-source duplicate detection.

## Files to touch

New:

- `arei-admin/api/review-listing.ts`
- `arei-admin/api/apply-listing-patch.ts`
- one admin component for the modal (e.g. `arei-admin/ListingReviewModal.tsx`)

Modified:

- `arei-admin/app.tsx` or the listing detail surface — add the `Review`
  button and wire it to the modal
- `arei-admin/data.ts` — add a thin client function for each endpoint
- `arei-admin/types.ts` — add the verdict / patch types

Touched (read-only reference):

- `docs/FEED_CONTRACT.md` (island list)
- `core/pipeline/propertyType.ts` (canonical property_type enum)
- `arei-admin/api/social-market-news.js` (auth pattern to mirror)
