# KazaVerde Curated Reviewer — How It Works Today

Last updated: 2026-06-02
Branch: `feat/kv-listing-reviewer-agent` (not yet merged to main)

## What this is

An on-demand LLM that reviews rows in `kv_curated.listings`, returns a
`publish` / `hold` / `hide` verdict + reasons + a structured patch the
operator can one-click apply. The operator-facing surface is the
**Curation** tab in `arei-admin`.

## The one-paragraph flow

Operator opens a listing in the Curation tab → drawer fetches the row →
operator clicks "Run review" → admin POSTs to `/api/review-listing` → the
endpoint loads the row, builds a prompt from
`arei-admin/api/_reviewerLib.cjs::buildReviewPrompt`, calls Anthropic Haiku
4.5, parses the JSON with `parseAndValidateVerdict`, writes the verdict to
`kv_curated.review_log`, returns the verdict to the drawer. Operator picks
which fields of `suggested_patch` to accept and clicks Apply / Apply +
Publish / Hide, which POSTs to `/api/apply-listing-patch`.

## Files you'll touch

**To tune the prompt or the JSON contract** — only file you need:
- `arei-admin/api/_reviewerLib.cjs` — system prompt, user prompt, output
  schema validation, island/property-type allow-lists. Pure CJS, no DB or
  network. Unit-tested in `tests/kvListingReviewer.test.cjs`.

**To change the model, retries, or how the call is wired**:
- `arei-admin/api/review-listing.js` — Anthropic SDK call, persistence to
  `review_log`. Model constant lives at the top: `claude-haiku-4-5-20251001`.

**To change what gets shown in the UI**:
- `arei-admin/curation/ListingDrawer.tsx` — the review panel + patch table
  + apply buttons + history.
- `arei-admin/curation/BulkActionBar.tsx` — bulk "Review all" that loops
  `reviewListing(id)` sequentially with progress + cancel.

**To change what the verdict log captures or query it**:
- `migrations/038_kv_curated_review_log.sql` — table schema.
- `arei-admin/api/kv-curated-listing-history.js` — per-listing history GET.
- `arei-admin/api/_curationLib.cjs::buildHistoryQuery`, `buildStatsQuery`,
  `buildListingsQuery` — the SQL builders for list/stats/history. Pure CJS,
  tested in `tests/curationLib.test.cjs`.

**Server plumbing (shared)**:
- `arei-admin/api/_endpointAuth.js` — `authorize`, `createPg`, `readJsonBody`,
  `send`. Every endpoint uses these. The `DEV_AUTH_BYPASS=1` escape hatch
  lives here, gated on `NODE_ENV !== "production"`.

## The contract

Prompt is JSON-only, no tools. Output schema (enforced by
`parseAndValidateVerdict`):

```ts
{
  verdict: "publish" | "hold" | "hide",
  confidence: number,           // 0..1
  reasons: string[],            // 1..N short bullets, non-empty
  suggested_patch: {            // subset of these keys; unknown keys rejected
    bedrooms?, bathrooms?, property_type?, island?, city?,
    price?, property_size_sqm?, land_area_sqm?
  },
  hide_reason?: string          // only when verdict === "hide"
}
```

The system prompt anchors three rules: (1) JSON only, (2) only suggest a
field if the source text directly supports it — no guessing, (3) `hide` is
for reserved/sold/withdrawn listings.

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

## Costs

Haiku 4.5: ~1k input + ~300 output tokens per call ≈ **$0.0025 per review**.
Bulk "Review all" over the current 44-row needs_review queue ≈ **$0.11**.
No retries beyond the SDK default.

## Known accuracy issues (worth tuning)

1. **CV-specific place names.** Haiku reads "Vila Verde" in the description
   and tries to override island=Sal → Santiago, because Vila Verde is also
   a town in northern Portugal. Vila Verde is a development complex in
   Santa Maria, Sal. Tightening: add a short "Cape Verde anchors" block to
   the system prompt listing the well-known development names.

2. **"property" as a stale generic.** `cv_ccoreinvestments` rows commonly
   have `property_type = "property"` (pipeline catch-all). The allow-list
   includes `"property"` so the model isn't forced to replace it, but it
   often still suggests a more specific type even when the source text only
   weakly supports it.

## What we explicitly did NOT build (yet)

- Editing `ai_descriptions` / regenerating prose.
- Image-level review (broken images, wrong subject).
- Cross-source duplicate detection.
- Pagination beyond a hard `LIMIT 500` (we have ~469 rows total).

If you go to extend the agent (tools, re-fetch, multi-step reasoning), the
clean place to do it is `review-listing.js` — replace the single
`anthropic.messages.create` call with a loop and add the tools. The
`parseAndValidateVerdict` contract is what the rest of the UI depends on,
so it should remain the terminal output regardless of internal mechanics.

## Deeper context (only if you need it)

- `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md` —
  v1 reviewer spec.
- `docs/superpowers/specs/2026-06-01-kv-curation-workspace-design.md` —
  workspace spec (the UI around the agent).
- `docs/02-data-engine/kazaverde-curated-feed-operations.md` — hard rules
  for `kv_curated` access (no Supabase REST; pooler `DATABASE_URL` only).
- `docs/FEED_CONTRACT.md` — the public feed contract that determines what
  a row needs to be publish-ready.
