-- 008_dedup_wp_image_sizes.sql
-- Collapse WordPress size-variant images into one per base filename.
--
-- WordPress generates multiple sizes for each upload:
--   photo-1025x650.jpg, photo-1440x914.jpg, photo.jpg
-- These are the same image at different resolutions.
-- This migration keeps only the largest variant (or the original with no suffix).
--
-- HOW TO RUN (pick one):
--
--   Option A  — Supabase SQL Editor (recommended):
--     1. Open https://supabase.com/dashboard → project → SQL Editor
--     2. Paste this entire file into a new query
--     3. Click "Run"
--
--   Option B  — psql CLI:
--     psql "$DATABASE_URL" -f migrations/008_dedup_wp_image_sizes.sql

-- ══════════════════════════════════════════════════════════════════
-- BEFORE — count rows with WP size variants
-- ══════════════════════════════════════════════════════════════════
--
--   SELECT count(*) AS rows_with_wp_dupes
--   FROM   listings
--   WHERE  cardinality(image_urls) > 0
--     AND  EXISTS (
--            SELECT 1
--            FROM   unnest(image_urls) u
--            WHERE  u ~ '-\d{2,5}x\d{2,5}\.\w+$'
--          );
--

BEGIN;

-- For each listing, strip the -WxH suffix to find the base filename,
-- group variants by that base, keep the one with the highest pixel area
-- (or the original if it has no suffix). Preserve first-occurrence order.
WITH expanded AS (
  SELECT id, url, ord,
         -- base key: strip -WxH before extension
         regexp_replace(url, '-\d{2,5}x\d{2,5}(\.\w+)$', '\1') AS base_key,
         -- pixel area: W*H from suffix, or very large number if no suffix (= original)
         CASE
           WHEN url ~ '-(\d{2,5})x(\d{2,5})\.\w+$'
           THEN (regexp_replace(url, '.*-(\d+)x\d+\.\w+$', '\1'))::bigint
              * (regexp_replace(url, '.*-\d+x(\d+)\.\w+$', '\1'))::bigint
           ELSE 9999999999  -- no suffix = original upload = prefer this
         END AS pixel_area
  FROM   listings,
         LATERAL unnest(image_urls) WITH ORDINALITY AS t(url, ord)
  WHERE  cardinality(image_urls) > 0
),
best_per_group AS (
  SELECT DISTINCT ON (id, base_key)
         id, base_key, url, ord
  FROM   expanded
  ORDER  BY id, base_key, pixel_area DESC, ord
),
reassembled AS (
  SELECT id,
         array_agg(url ORDER BY ord) AS clean_urls
  FROM   best_per_group
  GROUP  BY id
)
UPDATE listings
SET    image_urls = reassembled.clean_urls
FROM   reassembled
WHERE  listings.id = reassembled.id
  AND  listings.image_urls IS DISTINCT FROM reassembled.clean_urls;

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- AFTER — verify no listing has multiple sizes of the same image
-- ══════════════════════════════════════════════════════════════════
--
-- Should show significant reduction vs before:
--
--   SELECT count(*) AS rows_still_with_wp_dupes
--   FROM   listings
--   WHERE  cardinality(image_urls) > 1
--     AND  (
--            SELECT count(DISTINCT regexp_replace(u, '-\d{2,5}x\d{2,5}(\.\w+)$', '\1'))
--            FROM   unnest(image_urls) u
--          ) < cardinality(image_urls);
--
-- Quick spot-check a specific listing:
--
--   SELECT id, cardinality(image_urls) AS img_count, image_urls
--   FROM   listings
--   WHERE  id = 'ecv_06c7d5c8d3a3';
--
