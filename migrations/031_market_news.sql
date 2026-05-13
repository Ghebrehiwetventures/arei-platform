-- Migration: market_news
-- Date: 2026-05-12
--
-- Creates the public.market_news table that will power the /market-news page
-- once the useMarketNews() hook is switched to Supabase (Phase 2b).
--
-- Status lifecycle:
--   candidate  →  default for RSS/manual imports; not visible to the public
--   published  →  visible on the public /market-news page
--   hidden     →  soft-hidden without archiving; not visible publicly
--   archived   →  retired; not visible publicly
--
-- RLS:
--   anon / authenticated  →  SELECT WHERE status = 'published' only
--   INSERT / UPDATE / DELETE  →  service role only (no public write policies)
--
-- Dedup strategy:
--   canonical_url is the primary dedup key (partial unique index on non-null rows).
--   A secondary composite index on (source_url, source_name, published_at::date)
--   supports script-level dedup lookups when canonical_url is absent.
--
-- Seed:
--   The 12 existing static items from market-news-data.ts are inserted as
--   status = 'published'. Idempotent via ON CONFLICT (canonical_url) DO NOTHING.

begin;

-- ─── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.market_news (
  id               uuid        not null default gen_random_uuid() primary key,
  title            text        not null,
  original_title   text,
  source_name      text        not null,
  source_url       text        not null,
  published_at     timestamptz,
  category         text        not null,
  snippet          text        not null,
  why_it_matters   text,
  status           text        not null default 'candidate'
                   constraint market_news_status_check
                   check (status in ('candidate', 'published', 'hidden', 'archived')),
  canonical_url    text,
  language         text,
  country_code     text        not null default 'CV',
  affected_regions text[],
  signal_tags      text[],
  ingestion_source text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Public read path: always filters by status
create index if not exists market_news_status_idx
  on public.market_news (status);

-- Sort and date range queries
create index if not exists market_news_published_at_idx
  on public.market_news (published_at desc);

-- Primary dedup: canonical_url (partial — nulls are excluded from uniqueness)
create unique index if not exists market_news_canonical_url_uidx
  on public.market_news (canonical_url)
  where canonical_url is not null;

-- Secondary dedup lookup: script can SELECT EXISTS before inserting when
-- canonical_url is absent. Index on full timestamptz — date-level comparison
-- is done in the WHERE clause of the lookup query, not in the index expression.
-- (timestamptz::date is timezone-dependent and therefore not IMMUTABLE, which
-- Postgres requires for index expressions.)
create index if not exists market_news_source_dedup_idx
  on public.market_news (source_url, source_name, published_at);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

-- Reuse / create the shared trigger function (safe to redefine — same body).
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_market_news_updated_at on public.market_news;
create trigger trg_market_news_updated_at
  before insert or update on public.market_news
  for each row
  execute function public.set_updated_at();

-- ─── Row-level security ───────────────────────────────────────────────────────

alter table public.market_news enable row level security;

-- Public read: only published items are visible to anon / authenticated roles.
drop policy if exists "market_news public read" on public.market_news;
create policy "market_news public read"
  on public.market_news
  for select
  to anon, authenticated
  using (status = 'published');

-- No INSERT / UPDATE / DELETE policies → service role writes only.

-- ─── Seed: 12 curated items from Phase 1 static data ─────────────────────────
--
-- source_url doubles as canonical_url for all seed items (no separate
-- canonical URL existed in Phase 1).
-- ON CONFLICT on canonical_url partial unique index makes this idempotent.

insert into public.market_news (
  title,
  original_title,
  source_name,
  source_url,
  published_at,
  category,
  snippet,
  why_it_matters,
  status,
  canonical_url,
  country_code,
  ingestion_source
) values

(
  'Cape Verde Airlines expands international routes with new Praia–Providence and Praia–Recife services',
  'Cabo Verde Airlines expande rota internacional com novos voos Praia-Providence e Praia-Recife',
  'Governo de Cabo Verde',
  'https://www.governo.cv/cabo-verde-airlines-expande-rota-internacional-com-novos-voos-praia-providence-e-praia-recife/',
  '2026-05-06T00:00:00Z',
  'Aviation',
  'Cabo Verde Airlines added weekly Praia-Providence and Praia-Recife services, restoring direct links with the United States and Brazil from the capital.',
  'Direct airlift affects tourism flows, diaspora access, investor visits and the relative appeal of Santiago as a connected property market.',
  'published',
  'https://www.governo.cv/cabo-verde-airlines-expande-rota-internacional-com-novos-voos-praia-providence-e-praia-recife/',
  'CV',
  'seed-phase1'
),

(
  'Cape Verde records lowest-ever unemployment rate, Prime Minister cites historic result',
  'Cabo Verde atinge taxa de desemprego mais baixa de sempre: Primeiro-Ministro realça resultado histórico',
  'Governo de Cabo Verde',
  'https://www.governo.cv/cabo-verde-atinge-taxa-de-desemprego-mais-baixa-de-sempre-primeiro-ministro-realca-resultado-historico/',
  '2026-04-28T00:00:00Z',
  'Economy',
  'Government communications cite a 4.9% unemployment rate for the second half of 2025 and more than 14,000 jobs created over one year.',
  'Employment and household income shape local housing demand, mortgage capacity and the resilience of domestic rental markets.',
  'published',
  'https://www.governo.cv/cabo-verde-atinge-taxa-de-desemprego-mais-baixa-de-sempre-primeiro-ministro-realca-resultado-historico/',
  'CV',
  'seed-phase1'
),

(
  'Government formalises privatisation of Cape Verde Handling to Swissport',
  'Governo formaliza privatização da Cabo Verde Handling com a Swissport',
  'Governo de Cabo Verde',
  'https://www.governo.cv/governo-formaliza-privatizacao-da-cabo-verde-handling-com-a-swissport/',
  '2026-04-28T00:00:00Z',
  'Foreign investment',
  'The government formalized the sale of a majority stake in Cabo Verde Handling to Swissport, alongside a planned investment program for airport services.',
  'Ground-handling capacity is part of the air-connectivity stack that supports tourism growth and confidence in the airport concession model.',
  'published',
  'https://www.governo.cv/governo-formaliza-privatizacao-da-cabo-verde-handling-com-a-swissport/',
  'CV',
  'seed-phase1'
),

(
  'New Administrative Procedure Code published in the Official Gazette',
  'Publicação do Novo Código do Processo Administrativo no Boletim Oficial',
  'Governo de Cabo Verde',
  'https://www.governo.cv/publicacao-do-novo-codigo-do-processo-administrativo-no-boletim-oficial/',
  '2026-04-24T00:00:00Z',
  'Policy / regulation',
  'Cape Verde published a new Administrative Procedure Code that is scheduled to enter into force in January 2027.',
  'Clearer administrative procedures can matter for permits, disputes, public decisions and the wider confidence investors place in state processes.',
  'published',
  'https://www.governo.cv/publicacao-do-novo-codigo-do-processo-administrativo-no-boletim-oficial/',
  'CV',
  'seed-phase1'
),

(
  'Marriott International Makes its Entry into Cape Verde with the Opening of Four Points by Sheraton São Vicente Resort',
  null,
  'Marriott International',
  'https://marriott.pressarea.com/en/news/marriott-international-makes-its-entry-into-cape-verde-with-the-opening-of-four-points-by-sheraton-so-vicente-resort/30032026',
  '2026-03-30T00:00:00Z',
  'Hospitality',
  'Marriott announced its Cape Verde debut with Four Points by Sheraton Sao Vicente Resort above Laginha Beach in Mindelo.',
  'International hotel brands can change destination visibility, support conference demand and strengthen the investment case beyond Sal and Boa Vista.',
  'published',
  'https://marriott.pressarea.com/en/news/marriott-international-makes-its-entry-into-cape-verde-with-the-opening-of-four-points-by-sheraton-so-vicente-resort/30032026',
  'CV',
  'seed-phase1'
),

(
  'Água Hotels commits EUR 12 million to new tourist-apartment project on Sal',
  'Água Hotels investe 12 milhões de euros em novo projecto na Ilha do Sal',
  'Diário Imobiliário',
  'https://diarioimobiliario.pt/Agua-Hotels-investe-12-milhoes-de-euros-em-novo-projecto-na-Ilha-do-Sal',
  '2026-03-03T00:00:00Z',
  'Construction',
  'Agua Hotels presented a planned four-star tourist-apartment project in Santa Maria, Sal, with an estimated investment of EUR 12 million.',
  'Hotel-apartment supply is directly adjacent to the holiday-home market and can influence rental expectations, local jobs and construction demand.',
  'published',
  'https://diarioimobiliario.pt/Agua-Hotels-investe-12-milhoes-de-euros-em-novo-projecto-na-Ilha-do-Sal',
  'CV',
  'seed-phase1'
),

(
  'Harnessing the blue economy for growth and prosperity: The Cabo Verde experience',
  null,
  'Brookings',
  'https://www.brookings.edu/articles/harnessing-the-blue-economy-for-growth-and-prosperity-the-cabo-verde-experience/',
  '2026-02-17T00:00:00Z',
  'Tourism',
  'A policy commentary frames Cabo Verde''s ocean economy around tourism, maritime transport, renewable energy, digital links and climate resilience.',
  'The long-term property story depends on whether tourism is complemented by logistics, energy and services that broaden demand across islands.',
  'published',
  'https://www.brookings.edu/articles/harnessing-the-blue-economy-for-growth-and-prosperity-the-cabo-verde-experience/',
  'CV',
  'seed-phase1'
),

(
  'Cape Verde Treasury details subsidised housing-credit scheme for home buyers',
  'Bonificação de Crédito de Habitação',
  'Ministério das Finanças',
  'https://www.mf.gov.cv/web/dgt/bonifica%C3%A7%C3%A3o',
  '2026-02-12T00:00:00Z',
  'Banking / credit',
  'The Treasury''s housing-credit support page details subsidized mortgage-interest regimes, including young-buyer and general access tracks.',
  'Credit subsidies can affect local buyer affordability, especially for permanent housing, construction and renovation activity.',
  'published',
  'https://www.mf.gov.cv/web/dgt/bonifica%C3%A7%C3%A3o',
  'CV',
  'seed-phase1'
),

(
  'IMF Executive Board Concludes the 2025 Article IV Consultation, Seventh Review under the Extended Credit Facility Arrangement, and Third Review under the Resilience and Sustainability Facility Arrangement with Cabo Verde',
  null,
  'International Monetary Fund',
  'https://www.imf.org/en/news/articles/2026/02/07/pr26036-cabo-verde-imf-concl-2025-aiv-consultation-7th-rev-under-ecf-and-3rd-rev-under-rsf',
  '2026-02-07T00:00:00Z',
  'Currency / macro risk',
  'The IMF highlighted strong tourism-led activity, stable inflation, reserves above program targets and continuing risks from external shocks and state-owned enterprises.',
  'Macro stability, debt risk and external reserves shape confidence in the CVE peg, financing conditions and the risk premium buyers attach to the market.',
  'published',
  'https://www.imf.org/en/news/articles/2026/02/07/pr26036-cabo-verde-imf-concl-2025-aiv-consultation-7th-rev-under-ecf-and-3rd-rev-under-rsf',
  'CV',
  'seed-phase1'
),

(
  'Cape Verde property tax reform: new IPI and ITI codes enter into force',
  'Cabo Verde - Reforma da Tributação do Património: Novos Códigos Fiscais entram em vigor',
  'PwC Portugal',
  'https://www.pwc.pt/pt/pwcinforfisco/flash/cabo-verde/reforma-tributacao-patrimonio-novos-codigos-fiscais.html',
  '2026-01-07T00:00:00Z',
  'Tax / residency',
  'PwC summarizes the new IPI and ITI property-tax codes that entered into force on 1 January 2026, replacing the prior IUP framework.',
  'Transfer tax, annual property tax and valuation mechanics change buyer costs, holding costs and transaction structuring for Cape Verde property.',
  'published',
  'https://www.pwc.pt/pt/pwcinforfisco/flash/cabo-verde/reforma-tributacao-patrimonio-novos-codigos-fiscais.html',
  'CV',
  'seed-phase1'
),

(
  'Cabo Verde on the path to energy sustainability',
  null,
  'LuxDev',
  'https://luxdev.lu/en/news/cabo-verde-path-energy-sustainability',
  '2025-12-12T00:00:00Z',
  'Infrastructure',
  'LuxDev describes the Santiago pumped-storage project, including energy storage, desalination support and EUR 79 million of planned investment.',
  'Reliable electricity and water infrastructure are practical constraints on housing, hospitality and investor confidence outside pure resort zones.',
  'published',
  'https://luxdev.lu/en/news/cabo-verde-path-energy-sustainability',
  'CV',
  'seed-phase1'
),

(
  'Tourism named strategic development sector in Cape Verde''s 2026 budget',
  'Turismo é setor estratégico e catalisador do desenvolvimento de Cabo Verde - Olavo Correia',
  'Governo de Cabo Verde',
  'https://www.governo.cv/turismo-e-setor-estrategico-e-catalisador-do-desenvolvimento-de-cabo-verde-olavo-correia/',
  '2025-11-21T00:00:00Z',
  'Tourism',
  'The government presented tourism as a central development sector in the 2026 budget discussion, with funding aimed at tourism and connectivity.',
  'Tourism policy and connectivity spending are core inputs for rental demand, employment and island-level property liquidity.',
  'published',
  'https://www.governo.cv/turismo-e-setor-estrategico-e-catalisador-do-desenvolvimento-de-cabo-verde-olavo-correia/',
  'CV',
  'seed-phase1'
)

on conflict (canonical_url) where canonical_url is not null do nothing;

commit;
