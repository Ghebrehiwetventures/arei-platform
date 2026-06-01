# KazaVerde Deep Review — Field-Gap Diagnosis

Date: 2026-06-02
Branch: `feat/kv-listing-reviewer-agent`
Status: design approved, not yet implemented

## Goal

The current curated reviewer (see
`docs/02-data-engine/kazaverde-curated-reviewer.md`) is "blind": it only reads
the DB row (structured fields + a truncated `description`). When a curated
listing has null/empty fields, the operator can't tell **why**:

- did the **scraper miss** a value that is actually present on the source page?
- or is the value **absent at source** — the original listing never stated it?

Deep Review answers that question per missing field by live-fetching the source
URL, reading the page, and classifying each gap. Confirmed "scraper missed"
values become one-click fixes **and** feed a root-cause backlog so the
underlying scraper gap can be fixed generically instead of patched per row.

Secondary output: values that exist on the page but have **no column** in the
curated schema (e.g. terrace area) are surfaced as "consider a new column"
suggestions — the same diagnosis pointed the other direction.

## Non-goals

- No automatic schema migrations. `unmapped_fields` are informational only.
- No changes to the cheap DB-only review path or to bulk "Review all".
- No headless browser / per-site scraper parsers. Fetching stays generic.
- No aggregate reporting UI in this phase. We persist the data that would make
  a roll-up possible later, but build no report now.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Source of truth | Live re-fetch the source URL at review time. |
| Fetch mechanism | Anthropic managed `web_fetch` server tool (no scraping infra). |
| Model | `claude-sonnet-4-6` for the deep path (Haiku stays on the cheap path). |
| Flow placement | Separate **"Deep review"** action; cheap "Run review" untouched. |
| Schema-gap output | Structured `unmapped_fields` list (not free text, not an auto-migration). |
| Recovered values | One-click apply **and** flag the scraper gap for root-cause fix. |

## Architecture

```
ListingDrawer.tsx
  ├─ "Run review"   ─→ /api/review-listing       (UNCHANGED: Haiku, DB-only, cheap)
  └─ "Deep review"  ─→ /api/deep-review-listing   (NEW: Sonnet + web_fetch)
                                │
                                ├─ _reviewerLib.cjs::buildDeepReviewPrompt(row)
                                ├─ Anthropic messages.create + web_fetch tool
                                ├─ _reviewerLib.cjs::parseAndValidateVerdict (extended)
                                └─ INSERT kv_curated.review_log (+ new columns)

  Apply 🔧 scraper-missed row ─→ /api/apply-listing-patch (EXTENDED)
                                ├─ UPDATE kv_curated.listings  (existing)
                                └─ INSERT kv_curated.scraper_gap_log (new, same txn)
```

### Component boundaries

- **`_reviewerLib.cjs`** stays pure CJS (no DB, no network, no env) so it
  remains unit-testable in isolation. It owns prompt construction and output
  validation for both the cheap and deep paths.
- **`deep-review-listing.js`** owns the network: DB read, the Anthropic call
  with the `web_fetch` tool, and persistence to `review_log`. It depends on
  `_reviewerLib.cjs` and `_endpointAuth.js`.
- **`apply-listing-patch.js`** owns the write transaction for both the row
  UPDATE and the optional gap-log INSERT.
- **`ListingDrawer.tsx`** owns presentation: the new button, the "Field gaps"
  table, and the apply interaction.

## The contract

The deep path reuses the existing terminal contract and **adds optional keys**,
so `parseAndValidateVerdict` stays backward-compatible — the cheap path keeps
calling it unchanged and simply never emits the new keys.

```ts
{
  // --- existing, unchanged ---
  verdict: "publish" | "hold" | "hide",
  confidence: number,                  // 0..1
  reasons: string[],                   // 1..5 non-empty bullets
  suggested_patch: {                   // mappable fields only (existing PATCH_FIELDS)
    bedrooms?, bathrooms?, property_type?, island?, city?,
    price?, property_size_sqm?, land_area_sqm?
  },
  hide_reason?: string,                // only when verdict === "hide"

  // --- new, deep path only (all optional) ---
  fetch_status?: "ok" | "failed" | "skipped",
  missing_field_report?: [
    {
      field: string,                   // a currently-null field on the row
      status: "scraper_missed" | "absent_at_source" | "uncertain",
      found_value?: string|number|null,// present only when status==="scraper_missed"
      evidence?: string,               // short quote from page/description backing the call
      confidence: number               // 0..1
    }
  ],
  unmapped_fields?: [
    {
      label: string,                   // human label, e.g. "terrace area"
      value: string,                   // e.g. "85 m²"
      suggested_column: string,        // snake_case, e.g. "terrace_area_sqm"
      type: "numeric" | "integer" | "text" | "boolean",
      confidence: number               // 0..1
    }
  ]
}
```

### Validation rules (added to `parseAndValidateVerdict`)

- `fetch_status`, `missing_field_report`, `unmapped_fields` are all optional.
  When absent the result is treated exactly as a cheap-path verdict.
- `fetch_status`, if present, must be one of the three enum values.
- `missing_field_report`, if present, must be an array; each entry:
  - `field` non-empty string;
  - `status` one of the three enum values;
  - `found_value` allowed **only** when `status === "scraper_missed"`;
  - `confidence` a number in `[0,1]`;
  - `evidence` a string when present.
- `unmapped_fields`, if present, must be an array; each entry:
  - `label`, `value` non-empty strings;
  - `suggested_column` matches `^[a-z][a-z0-9_]*$`;
  - `type` one of the four enum values;
  - `confidence` a number in `[0,1]`.
- `suggested_patch` keys remain restricted to `PATCH_FIELDS` (unchanged). A
  recovered mappable value MUST appear in **both** `suggested_patch` (so it is
  appliable) and the corresponding `missing_field_report` entry (so the
  evidence and scraper-gap intent travel with it).

### Prompt behaviour (`buildDeepReviewPrompt`)

System prompt instructs the model to:

1. Use `web_fetch` on the provided `source_url_primary` to read the live page.
   If no URL is present, set `fetch_status: "skipped"` and diagnose from the DB
   description only. If the fetch fails, set `fetch_status: "failed"` and still
   return a best-effort verdict from DB fields.
2. Diagnose **only fields that are currently null/empty** on the row. For each:
   classify `scraper_missed` (value found on page → return `found_value` +
   `evidence`), `absent_at_source` (page genuinely omits it), or `uncertain`.
3. Put recovered **mappable** values into `suggested_patch` as well.
4. List page values that have **no curated column** in `unmapped_fields`.
5. Keep the existing publish/hold/hide rules, the island/property-type
   allow-lists, and "no guessing — evidence or omit".

The model call uses `claude-sonnet-4-6`, `max_tokens` ~2000, and the
`web_fetch` tool with a bounded `max_uses` (3). Exact tool type identifier to
be confirmed against the installed Anthropic SDK version at implementation.

## Persistence

Migration `migrations/039_kv_curated_review_log_deep.sql`:

1. `ALTER TABLE kv_curated.review_log` add:
   - `missing_field_report jsonb`
   - `unmapped_fields jsonb`
   - `fetch_status text`
   These are written on every deep review — the full diagnostic history.

2. `CREATE TABLE kv_curated.scraper_gap_log` — the confirmed, actionable
   backlog. One row is written when the operator **applies** a
   `scraper_missed` value (so the value was verified to be on the page):

   ```sql
   create table if not exists kv_curated.scraper_gap_log (
     id            bigint generated always as identity primary key,
     listing_id    text not null references kv_curated.listings(id) on delete cascade,
     source_id     text not null,
     field         text not null,
     recovered_value text,
     evidence      text,
     model         text,
     created_at    timestamptz not null default now()
   );
   create index if not exists scraper_gap_log_source_field_idx
     on kv_curated.scraper_gap_log (source_id, field);
   ```

   This table answers "is source X systematically dropping field Y?" → fix the
   scraper generically instead of patching rows one at a time.

## Apply path

`/api/apply-listing-patch` gains an optional `recovered_gaps` field on its body:

```ts
{
  id, patch, publish_status?,           // existing
  recovered_gaps?: [
    { field: string, source_id: string, evidence?: string, value?: string }
  ]
}
```

When `recovered_gaps` is present and non-empty, the endpoint inserts those rows
into `scraper_gap_log` **in the same transaction** as the listing UPDATE, so a
confirmed fix and its gap record commit atomically. Calls without
`recovered_gaps` (the cheap-path apply) are completely unaffected. `source_id`
is taken from the row's `source_id_primary` and passed through by the drawer.

## UI — `ListingDrawer.tsx`

- A second button, **"Deep review"**, next to "Run review", with its own
  loading spinner (the fetch + Sonnet call is slower than the cheap path).
- The verdict panel gains a **"Field gaps"** section rendered from
  `missing_field_report`, e.g.:

  | Field | Verdict | Value / evidence | Action |
  | --- | --- | --- | --- |
  | bedrooms | 🔧 scraper missed | 3 — *"3 bedroom villa"* | **Apply** |
  | price | — absent at source | source never lists a price | — |
  | terrace area | ➕ no column | 85 m² → consider `terrace_area_sqm` | — |

  - 🔧 `scraper_missed` rows that are mappable get an **Apply** control wired to
    the existing patch-apply flow; applying also sends a `recovered_gaps` entry
    and the card notes "logged for scraper fix".
  - `absent_at_source` and `uncertain` rows are read-only context.
  - `unmapped_fields` render as read-only "consider a column" cards — **no
    apply** (the column does not exist).
- `fetch_status: "failed"` / `"skipped"` shows a small banner so the operator
  knows the diagnosis was DB-only.

## BulkActionBar

Unchanged. Deep review is single-listing and opt-in; bulk "Review all" stays on
the cheap Haiku path.

## Cost

- Cheap path: unchanged (~$0.0025/listing, Haiku, DB-only).
- Deep path: Sonnet 4.6 + fetched page tokens, roughly **$0.02–0.08/listing**
  depending on page size. Opt-in and single-listing, so spend is bounded.

## Testing

Extend `tests/kvListingReviewer.test.cjs` (pure CJS, no network):

- `parseAndValidateVerdict` still accepts a cheap-path verdict with none of the
  new keys (backward compatibility).
- Accepts a well-formed deep verdict with `missing_field_report`,
  `unmapped_fields`, `fetch_status`.
- Rejects: `found_value` on a non-`scraper_missed` entry; bad `status` enum; bad
  `fetch_status` enum; non-snake_case `suggested_column`; bad `type` enum;
  out-of-range `confidence`; `suggested_patch` key outside `PATCH_FIELDS`.
- `buildDeepReviewPrompt` includes the source URL and the fetch instruction, and
  lists only the row's currently-null fields as diagnosis targets.

If `buildPatchSql` / the apply endpoint gain gap-logging logic, add a unit test
that `recovered_gaps` produces the expected INSERT and that an empty/absent
`recovered_gaps` is a no-op.

## Open implementation detail

- Confirm the exact `web_fetch` tool type string and response-block handling for
  the installed `@anthropic-ai/sdk` version; the model may emit intermediate
  tool-use blocks before the final text block that `parseAndValidateVerdict`
  consumes.

## Related docs

- `docs/02-data-engine/kazaverde-curated-reviewer.md` — current reviewer.
- `docs/02-data-engine/kazaverde-curated-feed-operations.md` — `kv_curated`
  access rules (pooler `DATABASE_URL` only).
- `docs/FEED_CONTRACT.md` — publish-readiness contract.
- `docs/superpowers/specs/2026-06-01-kv-listing-reviewer-agent-design.md` — v1
  reviewer spec.
