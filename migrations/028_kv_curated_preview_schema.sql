-- Migration: add private KazaVerde curated schema + public preview view
-- Date: 2026-05-06
--
-- Scope:
-- - create the private kv_curated schema
-- - create minimal curated listings + source_links tables
-- - expose published curated rows through public.v1_feed_cv_curated_preview
--
-- Rollback note:
--   DROP VIEW IF EXISTS public.v1_feed_cv_curated_preview;
--   DROP TABLE IF EXISTS kv_curated.source_links;
--   DROP TABLE IF EXISTS kv_curated.listings;
--   DROP SCHEMA IF EXISTS kv_curated;

begin;

create schema if not exists kv_curated;

create table if not exists kv_curated.listings (
  id text primary key,
  publish_status text not null default 'needs_review',
  title text not null,
  description text,
  description_html text,
  ai_descriptions jsonb,
  price numeric,
  currency text,
  price_period text not null default 'sale',
  country text not null default 'Cape Verde',
  island text not null,
  city text,
  bedrooms integer,
  bathrooms integer,
  property_type text,
  property_size_sqm numeric,
  land_area_sqm numeric,
  latitude double precision,
  longitude double precision,
  image_urls text[] not null default '{}',
  source_id_primary text not null,
  source_url_primary text,
  first_seen_at timestamptz not null,
  first_published_at timestamptz,
  last_verified_at timestamptz,
  seeded_from_raw_listing_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kv_curated_listings_publish_status_check
    check (publish_status in ('published', 'hidden', 'needs_review'))
);

alter table kv_curated.listings
  add column if not exists ai_descriptions jsonb,
  add column if not exists price_period text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists first_seen_at timestamptz;

update kv_curated.listings
set
  price_period = coalesce(price_period, 'sale'),
  first_seen_at = coalesce(first_seen_at, first_published_at, created_at, now()),
  source_id_primary = coalesce(source_id_primary, 'kv_curated_unknown')
where price_period is null
   or first_seen_at is null
   or source_id_primary is null;

alter table kv_curated.listings
  alter column bathrooms type integer using bathrooms::integer,
  alter column price_period set default 'sale',
  alter column price_period set not null,
  alter column source_id_primary set not null,
  alter column first_seen_at set not null;

create table if not exists kv_curated.source_links (
  id bigint generated always as identity primary key,
  curated_listing_id text not null references kv_curated.listings(id) on delete cascade,
  source_id text not null,
  source_url_normalized text,
  source_ref text,
  raw_listing_id_last_seen text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  match_confidence text not null default 'exact',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kv_curated_source_links_match_confidence_check
    check (match_confidence in ('exact', 'review'))
);

alter table kv_curated.source_links
  drop constraint if exists kv_curated_source_links_match_confidence_check;

update kv_curated.source_links
set match_confidence = 'exact'
where match_confidence is null;

alter table kv_curated.source_links
  alter column match_confidence type text
    using case
      when match_confidence::text = 'review' then 'review'
      else 'exact'
    end,
  alter column match_confidence set default 'exact',
  alter column match_confidence set not null;

alter table kv_curated.source_links
  add constraint kv_curated_source_links_match_confidence_check
    check (match_confidence in ('exact', 'review'));

drop index if exists kv_curated_source_links_curated_listing_id_idx;

create unique index if not exists kv_curated_source_links_source_url_match_uidx
  on kv_curated.source_links (source_id, source_url_normalized)
  where source_url_normalized is not null;

create unique index if not exists kv_curated_source_links_source_ref_match_uidx
  on kv_curated.source_links (source_id, source_ref)
  where source_ref is not null;

create or replace view public.v1_feed_cv_curated_preview as
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
  array[]::text[] as violations,
  l.property_size_sqm as area_sqm,
  l.latitude,
  l.longitude,
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

revoke all on schema kv_curated from anon;
revoke all on schema kv_curated from authenticated;
revoke all on kv_curated.listings from anon;
revoke all on kv_curated.listings from authenticated;
revoke all on kv_curated.source_links from anon;
revoke all on kv_curated.source_links from authenticated;
revoke all on all sequences in schema kv_curated from anon;
revoke all on all sequences in schema kv_curated from authenticated;

commit;
