-- Run this in Supabase Dashboard → SQL Editor to enable dashboard source-quality stats.
-- Requires table "listings" with columns: source_id, approved, image_urls, price.

-- Version for image_urls as text[] (matches deployed schema):
create or replace function get_source_quality_stats()
returns table (
  source_id text,
  listing_count bigint,
  approved_count bigint,
  with_image_count bigint,
  with_price_count bigint,
  last_updated_at timestamptz
) as $$
  select
    l.source_id::text,
    count(*)::bigint,
    count(*) filter (where l.approved)::bigint,
    count(*) filter (where l.image_urls is not null and coalesce(array_length(l.image_urls, 1), 0) > 0)::bigint,
    count(*) filter (where l.price is not null)::bigint,
    max(l.updated_at)
  from listings l
  where l.source_id is not null
  group by l.source_id
$$ language sql stable;

-- If image_urls is jsonb instead of text[], run this version instead:
-- create or replace function get_source_quality_stats()
-- returns table (
--   source_id text,
--   listing_count bigint,
--   approved_count bigint,
--   with_image_count bigint,
--   with_price_count bigint,
--   last_updated_at timestamptz
-- ) as $$
--   select
--     l.source_id::text,
--     count(*)::bigint,
--     count(*) filter (where l.approved)::bigint,
--     count(*) filter (where l.image_urls is not null and jsonb_array_length(l.image_urls::jsonb) > 0)::bigint,
--     count(*) filter (where l.price is not null)::bigint,
--     max(l.updated_at)
--   from listings l
--   where l.source_id is not null
--   group by l.source_id
-- $$ language sql stable;
