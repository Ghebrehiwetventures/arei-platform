-- 040_market_news_relevance.sql
--
-- Adds an editorial relevance tier to public.market_news.
--
-- Two values only — deliberately binary, no middle tier:
--   high      → curator-flagged as priority for property investors / buyers /
--               brokers; eligible for the newsletter digest
--   standard  → everything else (default)
--
-- The single question this column answers: does this item go in the digest?
--
-- Newsletter digest query (future consumer — digest job not yet built):
--
--   select * from public.market_news
--   where status = 'published' and relevance = 'high'
--   order by published_at desc
--   limit N;
--
-- The (relevance, published_at desc) index below covers that query.
--
-- Backfill: the three items that were `featured = true` in the Phase-1
-- static data (kazaverde-web/src/lib/market-news-data.ts) become 'high';
-- everything else stays 'standard'. The join key is canonical_url — it is
-- immutable from the admin side (not in the column-level UPDATE grant from
-- migration 033) and the DB id is a random uuid that does not map to the
-- static data. A WARNING is raised if the backfill does not match exactly
-- the expected three rows, so seed/URL drift surfaces loudly instead of
-- silently leaving priority items as 'standard'.

begin;

-- ── Column ────────────────────────────────────────────────────────────────────

alter table public.market_news
  add column if not exists relevance text not null default 'standard'
  constraint market_news_relevance_check
  check (relevance in ('high', 'standard'));

-- ── Index — covers the newsletter digest query ───────────────────────────────

create index if not exists market_news_relevance_idx
  on public.market_news (relevance, published_at desc);

-- ── Backfill: Phase-1 `featured = true` items → 'high' ───────────────────────

do $$
declare
  matched integer;
begin
  update public.market_news
  set relevance = 'high'
  where canonical_url in (
    'https://www.governo.cv/cabo-verde-airlines-expande-rota-internacional-com-novos-voos-praia-providence-e-praia-recife/',
    'https://www.imf.org/en/news/articles/2026/02/07/pr26036-cabo-verde-imf-concl-2025-aiv-consultation-7th-rev-under-ecf-and-3rd-rev-under-rsf',
    'https://www.pwc.pt/pt/pwcinforfisco/flash/cabo-verde/reforma-tributacao-patrimonio-novos-codigos-fiscais.html'
  );

  get diagnostics matched = row_count;

  if matched <> 3 then
    raise warning
      'market_news relevance backfill matched % rows, expected 3 — '
      'canonical_url drift since migration 031; verify priority items '
      'were not left as ''standard''.', matched;
  end if;
end $$;

-- ── Grant — extend the column-level UPDATE grant from 033 ────────────────────
-- Admin (authenticated) must be able to set the relevance tier. The 032
-- UPDATE policy (using(true) with check on status) is column-agnostic and
-- needs no change.

grant update (relevance)
  on table public.market_news
  to authenticated;

commit;
