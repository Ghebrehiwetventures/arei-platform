-- 043_market_news_category_check.sql
--
-- Closes the taxonomy: locks public.market_news.category to the 5
-- consolidated values. This is the LAST step in the sequence:
--
--   041 (collapse 11 → 5) ✔
--   042 (re-tag the RE/Construction batch + manual moves) ✔
--   all writers emit only the 5 (ingest source defaults, AI enrich,
--     admin dropdown — shipped in #217, deployed) ✔
--   043 (this) — add the CHECK once data + writers are clean
--
-- Run ONLY after 042 is applied and verified in prod. The pre-flight
-- block hard-stops with a clear message if any row is still outside the
-- 5, rather than letting ALTER fail opaquely.

begin;

-- Manual editorial move applied by hand in prod (Cape Verde Handling /
-- Swissport privatisation → Policy & Tax). It was NOT captured in the
-- merged 042 (042 merged before that line was added, and a merged
-- migration is append-only). Recorded here, before the CHECK, so a
-- fresh DB rebuild reproduces production. Keyed on immutable canonical_url.
update public.market_news
set category = 'Policy & Tax'
where canonical_url =
  'https://www.governo.cv/governo-formaliza-privatizacao-da-cabo-verde-handling-com-a-swissport/';

do $$
declare
  bad integer;
begin
  select count(*) into bad
  from public.market_news
  where category not in (
    'Economy', 'Tourism', 'Infrastructure', 'Policy & Tax', 'Banking & Credit'
  );
  if bad <> 0 then
    raise exception
      'market_news has % rows with a category outside the 5 — '
      'normalise them before adding the CHECK constraint.', bad;
  end if;
end $$;

alter table public.market_news
  add constraint market_news_category_check
  check (category in (
    'Economy', 'Tourism', 'Infrastructure', 'Policy & Tax', 'Banking & Credit'
  ));

commit;
