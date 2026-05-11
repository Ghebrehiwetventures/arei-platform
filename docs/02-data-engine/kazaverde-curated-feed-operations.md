# KazaVerde Curated Feed Operations

Last updated: 2026-05-08

## Purpose

This document explains the temporary operating model now live in production and
the safest way to add or change curated KazaVerde listings without accidentally
breaking the public site.

## Current live state

As of 2026-05-08:

- the canonical public frontend contract is still `public.v1_feed_cv`
- `public.v1_feed_cv` now reads from `public.v1_feed_cv_curated_preview`
- `public.v1_feed_cv_curated_preview` reads `published` rows from `kv_curated.listings`
- the legacy CV ingest pipeline still writes the old `public.listings` path
- the ingest pipeline and the public feed are therefore temporarily decoupled

This is a temporary operating state, not the final architecture.

## What is production-sensitive

The following actions can affect the live KazaVerde site immediately:

- changing `publish_status` to `published` for a curated row that meets feed filters
- editing a curated `published` row's title, description, images, island, source id, or source URL
- changing `public.v1_feed_cv` or `public.v1_feed_cv_curated_preview`

Treat any of those actions as production changes.

## Hard rules

- Do not use Supabase REST or Supabase JS for `kv_curated` reads or writes.
- Use `createPostgresClient()` and the pooler-backed `DATABASE_URL`.
- Do not modify `public.v1_feed_cv` for day-to-day listing changes.
- Do not change curated rows directly to `published` before verification.
- Do not regenerate AI descriptions unless that work is explicitly intended and approved.
- Do not rely on docs alone; verify live counts, view definitions, and sample rows.

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
