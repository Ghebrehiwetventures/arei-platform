-- Migration: make curated preview view type-compatible with the live public feed contract
-- Date: 2026-05-08
--
-- Scope:
-- - redefine public.v1_feed_cv_curated_preview with the same source rows
-- - cast the few incompatible columns to match the existing public.v1_feed_cv contract
--
-- Why:
-- public.v1_feed_cv is a live contract already consumed by the frontend and RPCs.
-- Postgres rejects CREATE OR REPLACE VIEW when replacement columns change type.
-- This migration preserves the old public-feed shape while still sourcing rows
-- from kv_curated.listings.
--
-- Safety:
-- public.v1_feed_cv does not depend on public.v1_feed_cv_curated_preview yet
-- at the time this migration is applied, so dropping and recreating the preview
-- view is the cleanest way to change the incompatible column types.

begin;

drop view if exists public.v1_feed_cv_curated_preview;

create view public.v1_feed_cv_curated_preview as
select
  l.id,
  l.source_id_primary as source_id,
  l.source_url_primary as source_url,
  l.title,
  null::text as rendered_title_en,
  l.description,
  null::text as rendered_description_en,
  l.description_html,
  null::text as rendered_description_html_en,
  null::text as rendered_translation_source,
  null::text as rendered_translation_source_language,
  null::text as rendered_translation_target_language,
  null::boolean as rendered_translation_is_source_truth,
  null::timestamptz as rendered_translation_updated_at,
  l.price,
  l.currency,
  l.country,
  null::text as region,
  l.island,
  l.city,
  l.bedrooms,
  l.bathrooms,
  l.property_size_sqm,
  l.land_area_sqm,
  l.image_urls,
  'published'::text as status,
  l.created_at,
  l.updated_at,
  true as approved,
  '[]'::jsonb as violations,
  l.property_size_sqm as area_sqm,
  l.latitude::numeric as latitude,
  l.longitude::numeric as longitude,
  coalesce(array_length(l.image_urls, 1), 0) > 0 as has_valid_images,
  l.property_type,
  array[]::text[] as amenities,
  l.price_period,
  null::text as dedup_key,
  null::text as canonical_id,
  null::text as source_url_normalized,
  l.first_seen_at,
  coalesce(l.last_verified_at, l.first_seen_at) as last_seen_at,
  false as is_superseded,
  case when l.price is null then 'price_on_request' else 'ok' end as price_status,
  null::text as location_confidence,
  coalesce(array_length(l.image_urls, 1), 0) > 0 as has_valid_image,
  l.image_urls[1] as cover_image_url,
  null::text as cover_image_hash,
  null::text as duplicate_risk,
  null::text as identity_fingerprint,
  null::text as cross_source_match_key,
  l.id as canonical_listing_id,
  'A'::text as trust_tier,
  true as trust_gate_passed,
  true as indexable,
  array[]::text[] as review_reasons,
  false as multi_domain_gallery,
  false as is_stale,
  null::timestamptz as stale_at,
  null::text as stale_reason,
  l.ai_descriptions
from kv_curated.listings l
where l.publish_status = 'published'
  and l.source_url_primary is not null;

grant select on public.v1_feed_cv_curated_preview to anon;
grant select on public.v1_feed_cv_curated_preview to authenticated;

commit;
