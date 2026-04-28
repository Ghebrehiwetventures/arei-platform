-- 026_v1_feed_cv_expose_ai_descriptions.sql
--
-- Exposes the ai_descriptions JSONB column (added by migration 025)
-- through the v1_feed_cv view chain so the frontend SDK can read it.
--
-- The chain is two views deep:
--   v1_feed_cv  →  v1_feed_cv_pre_terra_cohort_rollback_20260401  →  listings
--
-- Both views project columns explicitly. ai_descriptions is appended
-- to the END of each column list because CREATE OR REPLACE VIEW
-- forbids renaming or reordering existing columns; it only allows
-- adding new ones at the tail. (PG error 42P16 if violated.)
--
-- Both view definitions below are reproduced verbatim from
-- pg_get_viewdef on live Supabase (2026-04-27); only ai_descriptions
-- is appended.

-- ===========================================================================
-- 1. Base view — selects from listings with trust + freshness filters
-- ===========================================================================

CREATE OR REPLACE VIEW public.v1_feed_cv_pre_terra_cohort_rollback_20260401 AS
WITH latest_run AS (
  SELECT ingest_runs.started_at
  FROM ingest_runs
  WHERE ingest_runs.market = 'cv'::text
    AND ingest_runs.status = 'completed'::text
  ORDER BY ingest_runs.started_at DESC
  LIMIT 1
)
SELECT l.id,
  l.source_id,
  l.source_url,
  l.title,
  l.rendered_title_en,
  l.description,
  l.rendered_description_en,
  l.description_html,
  l.rendered_description_html_en,
  l.rendered_translation_source,
  l.rendered_translation_source_language,
  l.rendered_translation_target_language,
  l.rendered_translation_is_source_truth,
  l.rendered_translation_updated_at,
  l.price,
  l.currency,
  l.country,
  l.region,
  l.island,
  l.city,
  l.bedrooms,
  l.bathrooms,
  l.property_size_sqm,
  l.land_area_sqm,
  l.image_urls,
  l.status,
  l.created_at,
  l.updated_at,
  l.approved,
  l.violations,
  l.area_sqm,
  l.latitude,
  l.longitude,
  l.has_valid_images,
  l.property_type,
  l.amenities,
  l.price_period,
  l.dedup_key,
  l.canonical_id,
  l.source_url_normalized,
  l.first_seen_at,
  l.last_seen_at,
  l.is_superseded,
  l.price_status,
  l.location_confidence,
  l.has_valid_image,
  l.cover_image_url,
  l.cover_image_hash,
  l.duplicate_risk,
  l.identity_fingerprint,
  l.cross_source_match_key,
  l.canonical_listing_id,
  l.trust_tier,
  l.trust_gate_passed,
  l.indexable,
  l.review_reasons,
  l.multi_domain_gallery,
  l.is_stale,
  l.stale_at,
  l.stale_reason,
  l.ai_descriptions
FROM listings l
CROSS JOIN latest_run r
WHERE l.source_id ~~* 'cv_%'::text
  AND COALESCE(l.trust_gate_passed, false) = true
  AND (l.trust_tier = ANY (ARRAY['A'::text, 'B'::text]))
  AND l.source_url IS NOT NULL
  AND COALESCE(l.has_valid_image, false) = true
  AND COALESCE(l.is_stale, false) = false
  AND COALESCE(l.last_seen_at, l.first_seen_at) >= r.started_at
  AND (l.island = ANY (ARRAY[
    'Boa Vista'::text,
    'Brava'::text,
    'Fogo'::text,
    'Maio'::text,
    'Sal'::text,
    'Santiago'::text,
    'Santo Antão'::text,
    'São Nicolau'::text,
    'São Vicente'::text
  ]))
  AND (l.source_id <> ALL (ARRAY['cv_source_1'::text, 'cv_source_2'::text]));

-- ===========================================================================
-- 2. Wrapper view — excludes the pre-2026-04-01 terracaboverde cohort
-- ===========================================================================

CREATE OR REPLACE VIEW public.v1_feed_cv AS
SELECT id,
  source_id,
  source_url,
  title,
  rendered_title_en,
  description,
  rendered_description_en,
  description_html,
  rendered_description_html_en,
  rendered_translation_source,
  rendered_translation_source_language,
  rendered_translation_target_language,
  rendered_translation_is_source_truth,
  rendered_translation_updated_at,
  price,
  currency,
  country,
  region,
  island,
  city,
  bedrooms,
  bathrooms,
  property_size_sqm,
  land_area_sqm,
  image_urls,
  status,
  created_at,
  updated_at,
  approved,
  violations,
  area_sqm,
  latitude,
  longitude,
  has_valid_images,
  property_type,
  amenities,
  price_period,
  dedup_key,
  canonical_id,
  source_url_normalized,
  first_seen_at,
  last_seen_at,
  is_superseded,
  price_status,
  location_confidence,
  has_valid_image,
  cover_image_url,
  cover_image_hash,
  duplicate_risk,
  identity_fingerprint,
  cross_source_match_key,
  canonical_listing_id,
  trust_tier,
  trust_gate_passed,
  indexable,
  review_reasons,
  multi_domain_gallery,
  is_stale,
  stale_at,
  stale_reason,
  ai_descriptions
FROM v1_feed_cv_pre_terra_cohort_rollback_20260401
WHERE source_id <> 'cv_terracaboverde'::text
   OR updated_at >= '2026-04-01 19:15:00+00'::timestamp with time zone;

GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;
