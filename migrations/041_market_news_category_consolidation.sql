-- 041_market_news_category_consolidation.sql
--
-- Consolidates public.market_news.category from 11 values to 5.
--
--   Economy            ← Economy, Currency / macro risk, Foreign investment,
--                          Property, Other, and any unknown value (safety net)
--   Tourism            ← Tourism, Hospitality
--   Infrastructure     ← Infrastructure, Aviation, Construction
--   Policy & Tax       ← Policy / regulation, Tax / residency
--   Banking & Credit   ← Banking / credit
--
-- "Foreign investment" is intentionally collapsed into Economy — it is a
-- theme (now carried in signal_tags), not a category. The curator re-tags
-- the few that are really Infrastructure (e.g. the Swissport handling item)
-- by hand in admin after this runs.
--
-- A pre-flight query confirmed prod has zero rows with category 'Property',
-- 'Other', or any value outside the known 11, so the ELSE → Economy branch
-- is a pure safety net and is expected to map nothing.
--
-- Sequencing: runs AFTER migration 040 (relevance) is merged, deployed and
-- verified in prod — not in parallel.
--
-- The CHECK constraint that closes the taxonomy to exactly these 5 is
-- DELIBERATELY NOT added here. It ships in a separate later migration once
-- this data is normalised and all writers (app, ingest, AI enrich) are
-- deployed, so an in-flight write with a legacy value cannot fail mid
-- rollout.

begin;

do $$
declare
  remaining integer;
begin
  update public.market_news
  set category = case category
    when 'Currency / macro risk' then 'Economy'
    when 'Foreign investment'    then 'Economy'
    when 'Hospitality'           then 'Tourism'
    when 'Aviation'              then 'Infrastructure'
    when 'Construction'          then 'Infrastructure'
    when 'Policy / regulation'   then 'Policy & Tax'
    when 'Tax / residency'       then 'Policy & Tax'
    when 'Banking / credit'      then 'Banking & Credit'
    when 'Economy'               then 'Economy'
    when 'Tourism'               then 'Tourism'
    when 'Infrastructure'        then 'Infrastructure'
    -- safety net: Property / Other / anything unexpected
    else 'Economy'
  end
  where category not in (
    'Economy', 'Tourism', 'Infrastructure', 'Policy & Tax', 'Banking & Credit'
  );

  select count(*) into remaining
  from public.market_news
  where category not in (
    'Economy', 'Tourism', 'Infrastructure', 'Policy & Tax', 'Banking & Credit'
  );

  if remaining <> 0 then
    raise warning
      'market_news category consolidation left % rows outside the 5 '
      'categories — investigate before adding the CHECK constraint.',
      remaining;
  else
    raise notice 'market_news category consolidation complete — all rows in the 5 categories.';
  end if;
end $$;

commit;
