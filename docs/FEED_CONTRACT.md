# Public Feed Contract (Cape Verde)

Date: 2026-03-07  
Canonical object: `public.v1_feed_cv`  
Canonical migration: `migrations/009_canonical_v1_feed_cv.sql`
Current upstream source: `public.v1_feed_cv_curated_preview`
Cutover migrations: `migrations/029_switch_v1_feed_cv_to_curated.sql`, `migrations/030_v1_feed_cv_curated_preview_contract_compat.sql`

## Launch decision

- **Option A**: `price` is optional at feed level.
- Price-based filtering is done at query/stat layers, not feed eligibility.

## Inclusion rules

A row is included in `v1_feed_cv` only if:

1. `source_id ILIKE 'cv_%'`
2. the row survives the curated compatibility wrapper with the equivalent public-feed guarantees
3. `COALESCE(is_superseded, false) = false` in the contract surface
4. `source_url IS NOT NULL`
5. `image_urls` is non-null and non-empty
6. `island` is one of:
   - `Boa Vista`
   - `Brava`
   - `Fogo`
   - `Maio`
   - `Sal`
   - `Santiago`
   - `Santo Antão`
   - `São Nicolau`
   - `São Vicente`
7. `source_id` is not a stub/test source:
   - `cv_source_1`
   - `cv_source_2`

## Temporary operating state

As of 2026-05-08:

- `public.v1_feed_cv` remains the canonical frontend object
- `public.v1_feed_cv` now reads from `public.v1_feed_cv_curated_preview`
- `public.v1_feed_cv_curated_preview` reads `published` rows from `kv_curated.listings`
- the legacy CV ingest pipeline still writes to the old `public.listings` path
- the live public feed and the active ingest pipeline are therefore temporarily decoupled

This is an intentional temporary operating model, not the final architecture.

## Curated compatibility wrapper

`migrations/030_v1_feed_cv_curated_preview_contract_compat.sql` exists because the live
`public.v1_feed_cv` contract could not be switched to curated rows until the preview view
matched the historical column types expected by the public feed contract.

The compatibility shim keeps these legacy types intact:

- `violations` exposed as `jsonb`
- `latitude` exposed as `numeric`
- `longitude` exposed as `numeric`

This is a contract-preservation layer. It should not be treated as evidence that the
curated schema itself is the same shape as legacy `public.listings`.

## Curated update safety

Because the live public feed now serves `published` rows from `kv_curated.listings`,
changing curated publish state can change production immediately.

Before adding or promoting curated rows, follow:

- `docs/02-data-engine/kazaverde-curated-feed-operations.md`

## Reporting language

- **Raw visible CV rows**: `listings` rows with `cv_%`, `approved = true`, `is_superseded != true`.
- **Public feed CV rows**: rows in `v1_feed_cv`.
- KPI output must report:
  - raw visible
  - public feed
  - excluded no-image
  - excluded invalid-island
  - excluded stub/test
  - price coverage over public feed
