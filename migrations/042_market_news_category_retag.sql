-- 042_market_news_category_retag.sql
--
-- Heuristic re-tag of the Real Estate & Construction ingest batch.
--
-- Migration 041 collapsed the old "Foreign investment" category into
-- Economy. In practice that source feed (ingestion_source = 'gnews-cv-property',
-- "Google News — Cape Verde Real Estate & Construction") is overwhelmingly
-- property / construction / infrastructure, with a few clearly-tourism or
-- regulatory items. Without this migration a fresh DB rebuild would leave
-- the whole batch in Economy and diverge from production, where this
-- re-tag was already applied by hand.
--
-- Order matters: the broad Infrastructure move runs first; the title-pattern
-- refinements then override the few exceptions. Idempotent — re-running
-- changes nothing once the batch is normalised.
--
-- Runs AFTER migration 041. The CHECK constraint that closes the taxonomy
-- ships separately, after this and all writers are deployed.

begin;

-- 1. Whole Real Estate & Construction batch (landed in Economy via 041) → Infrastructure
update public.market_news
set category = 'Infrastructure'
where ingestion_source = 'gnews-cv-property'
  and category = 'Economy';

-- 2. Clear exceptions in that same batch
update public.market_news
set category = 'Tourism'
where ingestion_source = 'gnews-cv-property'
  and (
    title ilike '%marriott%'
    or title ilike '%hotel%'
    or title ilike '%resort%'
    or title ilike '%macau legend%'
  );

update public.market_news
set category = 'Policy & Tax'
where ingestion_source = 'gnews-cv-property'
  and title ilike '%property code%';

-- 3. Manual editorial move (done by hand in prod): the Cape Verde
--    Handling / Swissport privatisation is a state-asset / regulatory
--    story, not generic economy. Keyed on canonical_url (immutable).
update public.market_news
set category = 'Policy & Tax'
where canonical_url =
  'https://www.governo.cv/governo-formaliza-privatizacao-da-cabo-verde-handling-com-a-swissport/';

do $$
declare
  remaining integer;
begin
  select count(*) into remaining
  from public.market_news
  where category not in (
    'Economy', 'Tourism', 'Infrastructure', 'Policy & Tax', 'Banking & Credit'
  );
  if remaining <> 0 then
    raise warning
      'market_news category re-tag left % rows outside the 5 categories.',
      remaining;
  else
    raise notice 'market_news category re-tag complete — all rows in the 5 categories.';
  end if;
end $$;

commit;
