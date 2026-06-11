# KazaVerde Curated Feed Operations

Last updated: 2026-06-11

## Purpose

This document explains the operating model now live in production and
the safest way to add or change curated KazaVerde listings without accidentally
breaking the public site.

## Current live state

As of 2026-06-11:

- the canonical public frontend contract is still `public.v1_feed_cv`
- `public.v1_feed_cv` reads from `public.v1_feed_cv_curated_preview`
- `public.v1_feed_cv_curated_preview` reads `published` rows from `kv_curated.listings`
- **the curated ingest is the only scheduled ingest**:
  `.github/workflows/curated-ingest.yml` runs at 03:00 and 15:00 UTC, one job
  per `lifecycleOverride: IN` source (cv only by default), writing live to
  `kv_curated.listings`. New rows enter as `needs_review`; existing `published`
  rows are refreshed in place; removal detection can demote `published` →
  `removed` (guarded, see below)
- the legacy CV ingest pipeline (`cv-autopilot.yml`) was **disabled on
  2026-06-11** and `public.listings` is frozen; the legacy code awaits deletion
  (see the cutover spec's "Soak revision",
  `docs/superpowers/specs/2026-06-11-legacy-to-curated-pipeline-cutover-design.md`)

Unattended kill-switch if a scheduled run misbehaves:
`gh workflow disable "Curated Ingest"`.

## What is production-sensitive

The following actions can affect the live KazaVerde site immediately:

- changing `publish_status` to `published` for a curated row that meets feed filters
- changing `publish_status` from `published` to `removed` for a curated row that is no longer in the source feed
- editing a curated `published` row's title, description, images, island, source id, or source URL
- changing `public.v1_feed_cv` or `public.v1_feed_cv_curated_preview`

Treat any of those actions as production changes.

## Hard rules

- Do not use Supabase REST or Supabase JS for `kv_curated` reads or writes.
- Use `createPostgresClient()` and the pooler-backed `DATABASE_URL`.
- Do not modify `public.v1_feed_cv` for day-to-day listing changes.
- Do not change curated rows directly to `published` before verification.
- Do not regenerate AI descriptions unless that work is explicitly intended and approved.
- Do not demote listings to `removed` from a failed or zero-row source fetch.
- Do not rely on docs alone; verify live counts, view definitions, and sample rows.

## Publish status lifecycle

`kv_curated.listings.publish_status` has four listing states:

| status | public feed? | meaning |
|---|---:|---|
| `needs_review` | no | Newly fetched or updated inventory awaiting manual review. |
| `published` | yes | Human-approved inventory visible through `public.v1_feed_cv`. |
| `hidden` | no | Manually suppressed inventory that should remain out of the public feed. |
| `removed` | no | Previously published inventory that disappeared from the latest successful source fetch. |

`removed` is not a review queue. It is an inventory lifecycle state. A removed
listing stays in `kv_curated.listings` for audit/history, but leaves the live
feed because `public.v1_feed_cv_curated_preview` only selects
`publish_status = 'published'`.

## Safe workflow for adding or updating curated rows

### 1. Prepare rows off the live path first

When adding or updating curated inventory:

- insert new rows as `needs_review` or `hidden`
- keep incomplete or uncertain rows off the `published` path
- use direct SQL or the curated import/reconciliation tooling to inspect the row shape

Important limitation:
- the live preview/public wrapper only shows `published` curated rows
- there is no separate production-safe frontend preview for unpublished curated rows today

That means promotion to `published` is itself a live change.

### 2. Verify row completeness before publish

Before promoting a row to `published`, verify at minimum:

- `source_id_primary` is the intended public source id
- `source_url_primary` is non-null
- `island` is valid for the public feed
- `image_urls` is non-empty
- the AI description is present if that listing should ship with curated prose
- any field used by the detail page is either populated or intentionally left null

### 3. Promote deliberately

Promote rows to `published` in an explicit SQL step using `createPostgresClient()`.

Prefer small, reviewable batches.

After promotion, immediately verify:

- row count impact on `public.v1_feed_cv`
- per-source counts
- one or more affected listing detail pages on KazaVerde

### 4. Use the public feed contract for post-change verification

After any curated publish change, check:

- `select count(*) from public.v1_feed_cv;`
- `select source_id, count(*) from public.v1_feed_cv group by source_id order by source_id;`
- a sample of affected rows from `public.v1_feed_cv`
- the live site at `https://kazaverde.com/listings`

## Safe workflow for removed source inventory

The curated ingest compares each successful source run against the source's
currently `published` curated rows. If a published row for that same source id
is absent from the current successful fetch, the ingest demotes it to
`publish_status = 'removed'`.

Safety rules:

- Dry runs never mutate rows; they only report removal candidates — and since
  2026-06-11 the dry-run output states whether the fraction guard would skip
  the demotion on a live run.
- A zero-row source fetch disables removal detection for that run.
- **Fraction guard** (since 2026-06-11): if a single run would demote more than
  `removal_max_fraction` (default 0.5, per-source in `sources.yml`) of a
  source's published rows, demotion is skipped for that source and a
  `[Removed-gate][GUARD]` alert is written to stderr for manual review. This
  protects the live feed from partial-fetch breakage on unattended runs.
- Existing `needs_review`, `hidden`, and `removed` rows are not auto-promoted or
  auto-demoted by the removal gate.
- A removed row must not be returned to `published` automatically. If the source
  later reappears, review the row deliberately before promotion.

Verification after a removal-producing run:

- compare the dry-run `removedCandidates` list with the source pages
- confirm `public.v1_feed_cv` count decreases by the same number after a live run
- inspect several demoted rows in `kv_curated.listings` and confirm
  `publish_status = 'removed'`

## Safe workflow for feed-layer changes

If you ever need to repoint the public feed again:

1. capture the current `public.v1_feed_cv` definition with `pg_get_viewdef`
2. save rollback SQL before applying anything
3. run a pre-flight diff between current feed ids and the candidate source
4. validate locally against the candidate view if a frontend preview is available
5. apply the view change via `createPostgresClient()` as a single SQL payload
6. verify the new view definition and live counts immediately
7. be ready to roll back in one statement if the smoke test fails

## Files to trust

- `docs/current-system-truth.md`
- `docs/FEED_CONTRACT.md`
- `migrations/028_kv_curated_preview_schema.sql`
- `migrations/029_switch_v1_feed_cv_to_curated.sql`
- `migrations/030_v1_feed_cv_curated_preview_contract_compat.sql`
- `migrations/052_kv_curated_removed_status.sql`
