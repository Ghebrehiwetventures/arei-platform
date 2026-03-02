-- 007_cleanup_images_and_land.sql
-- One-time data cleanup:
--   1) Deduplicate image_urls arrays (preserve order, keep first occurrence)
--   2) Set bedrooms/bathrooms to NULL for land listings
--
-- Land types list mirrors the canonical LAND_TYPES regex used in
-- core/ingestMarket.ts, kaza-verde Detail.tsx, and PropertyCard.tsx:
--   /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i
--
-- HOW TO RUN (pick one):
--
--   Option A  — Supabase SQL Editor (recommended, no local tooling needed):
--     1. Open https://supabase.com/dashboard → project → SQL Editor
--     2. Paste this entire file into a new query
--     3. Click "Run"
--
--   Option B  — psql CLI (requires DATABASE_URL with write permissions;
--               the pooler connection string in .env has them):
--     psql "$DATABASE_URL" -f migrations/007_cleanup_images_and_land.sql

-- ══════════════════════════════════════════════════════════════════
-- BEFORE sanity checks — run these first to see current state
-- ══════════════════════════════════════════════════════════════════
--
-- Count rows whose image_urls contain duplicates:
--
--   SELECT count(*) AS rows_with_dup_images
--   FROM   listings
--   WHERE  cardinality(image_urls) > 0
--     AND  cardinality(image_urls) > (
--            SELECT count(DISTINCT u)
--            FROM   unnest(image_urls) u
--          );
--
-- Count land listings that still have bedrooms or bathrooms set:
--
--   SELECT count(*) AS land_with_bed_bath
--   FROM   listings
--   WHERE  lower(property_type) IN
--          ('land','plot','lot','lote','terreno','terrenos','parcela','parcel','terrain')
--     AND  (bedrooms IS NOT NULL OR bathrooms IS NOT NULL);
--

BEGIN;

-- 1) Deduplicate image_urls, preserving first-occurrence order
WITH deduped AS (
  SELECT id,
         array_agg(url ORDER BY first_pos) AS unique_urls
  FROM (
    SELECT id, url, min(ord) AS first_pos
    FROM   listings,
           LATERAL unnest(image_urls) WITH ORDINALITY AS t(url, ord)
    WHERE  cardinality(image_urls) > 0
    GROUP  BY id, url
  ) sub
  GROUP BY id
)
UPDATE listings
SET    image_urls = deduped.unique_urls
FROM   deduped
WHERE  listings.id = deduped.id
  AND  listings.image_urls IS DISTINCT FROM deduped.unique_urls;

-- 2) Null out bedrooms/bathrooms for land listings
--    Matches canonical LAND_TYPES: land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain
UPDATE listings
SET    bedrooms  = NULL,
       bathrooms = NULL
WHERE  lower(property_type) IN
       ('land','plot','lot','lote','terreno','terrenos','parcela','parcel','terrain')
  AND  (bedrooms IS NOT NULL OR bathrooms IS NOT NULL);

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- AFTER sanity checks — run these to confirm the migration worked
-- ══════════════════════════════════════════════════════════════════
--
-- Should return 0:
--
--   SELECT count(*) AS rows_with_dup_images
--   FROM   listings
--   WHERE  cardinality(image_urls) > 0
--     AND  cardinality(image_urls) > (
--            SELECT count(DISTINCT u)
--            FROM   unnest(image_urls) u
--          );
--
-- Should return 0:
--
--   SELECT count(*) AS land_with_bed_bath
--   FROM   listings
--   WHERE  lower(property_type) IN
--          ('land','plot','lot','lote','terreno','terrenos','parcela','parcel','terrain')
--     AND  (bedrooms IS NOT NULL OR bathrooms IS NOT NULL);
--
