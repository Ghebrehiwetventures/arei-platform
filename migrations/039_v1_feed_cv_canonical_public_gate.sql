-- Migration 039: restate the canonical public gate for public.v1_feed_cv
-- Date: 2026-05-15
--
-- Resolves audit finding: migrations 009 and 010 define conflicting public
-- feed gates, and the later legacy migration loosened the source URL/image
-- requirements. The current architecture keeps public.v1_feed_cv as the stable
-- frontend object while sourcing from public.v1_feed_cv_curated_preview.
--
-- This migration is now the canonical public feed gate:
-- - keep the curated upstream source
-- - require a non-empty source_url
-- - require at least one image
-- - require published/approved, non-superseded Cape Verde rows
-- - exclude stub/demo/test sources
-- - expose an explicit 23-column public-safe column list

begin;

create schema if not exists broker;

drop view if exists broker.market_listings_view;
drop view if exists public.v1_feed_cv;

create view public.v1_feed_cv as
select
  id,
  source_id,
  source_url,
  title,
  description,
  price,
  currency,
  island,
  city,
  bedrooms,
  bathrooms,
  property_size_sqm,
  land_area_sqm,
  image_urls,
  updated_at,
  property_type,
  amenities,
  price_period,
  first_seen_at,
  last_seen_at,
  price_status,
  latitude,
  longitude
from public.v1_feed_cv_curated_preview
where source_id ilike 'cv_%'
  and nullif(btrim(source_url), '') is not null
  and image_urls is not null
  and coalesce(array_length(image_urls, 1), 0) > 0
  and coalesce(approved, false) = true
  and status = 'published'
  and coalesce(is_superseded, false) = false
  and island = any (array[
    'Boa Vista'::text,
    'Brava'::text,
    'Fogo'::text,
    'Maio'::text,
    'Sal'::text,
    'Santiago'::text,
    'Santo Antão'::text,
    'São Nicolau'::text,
    'São Vicente'::text
  ])
  and source_id <> all (array['cv_source_1'::text, 'cv_source_2'::text])
  and source_id not ilike '%stub%'
  and source_id not ilike '%demo%'
  and source_id not ilike '%test%';

alter view public.v1_feed_cv
  set (security_invoker = true);

grant select on public.v1_feed_cv to anon;
grant select on public.v1_feed_cv to authenticated;

create view broker.market_listings_view as
select
  id,
  title,
  description,
  price,
  currency,
  price_period,
  price_status,
  'Cape Verde'::text as country,
  island,
  city,
  latitude,
  longitude,
  property_type,
  bedrooms,
  bathrooms,
  property_size_sqm,
  land_area_sqm,
  amenities,
  image_urls,
  image_urls[1] as cover_image_url,
  source_url,
  first_seen_at,
  updated_at
from public.v1_feed_cv;

grant usage on schema broker to anon;
grant usage on schema broker to authenticated;
grant select on broker.market_listings_view to anon;
grant select on broker.market_listings_view to authenticated;

commit;
