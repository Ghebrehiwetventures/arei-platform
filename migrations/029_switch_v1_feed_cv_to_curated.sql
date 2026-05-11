-- Migration: switch public.v1_feed_cv to the curated KazaVerde publish layer
-- Date: 2026-05-06
--
-- Scope:
-- - redefine public.v1_feed_cv to read from public.v1_feed_cv_curated_preview
-- - keep the public grants on the canonical feed view
--
-- Note:
-- This is the gated production cutover migration. Creating this file does not
-- apply it to any live database.

begin;

create or replace view public.v1_feed_cv as
select *
from public.v1_feed_cv_curated_preview
where source_id ilike 'cv_%'
  and source_url is not null
  and image_urls is not null
  and coalesce(array_length(image_urls, 1), 0) > 0
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
  and source_id <> all (array['cv_source_1'::text, 'cv_source_2'::text]);

grant select on public.v1_feed_cv to anon;
grant select on public.v1_feed_cv to authenticated;

commit;
