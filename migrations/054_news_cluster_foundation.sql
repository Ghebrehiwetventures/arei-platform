-- ============================================================
-- Migration 054: News cluster data foundation (Stage 2)
-- ============================================================
-- Implements the data model from
-- docs/03-product/africa-real-estate-news-cluster-architecture.md (#322).
--
-- Goal: group MANY source articles that report the SAME real-world event
-- into ONE story cluster (Google-News style), so the product can dedupe
-- the feed and pick the richest/most-open source per story. This migration
-- is the INTERNAL data foundation only:
--   - no public frontend, no public nav
--   - does NOT touch the current market_news table or /market-news rendering
--   - clustering logic + admin review come in later stages (3+)
--
-- Security model (consistent with migration 051 pulse_cards):
--   SELECT  — authenticated (admin) only. No anon access.
--   INSERT/UPDATE/DELETE — service role only (ingest + clustering jobs),
--             which bypasses RLS. No browser writes yet; admin review
--             tooling lands in a later stage.
--
-- Safe to re-run: IF NOT EXISTS guards throughout.
--
-- Sequence: highest applied migration is 052 (053 is reserved by the
-- article_body_used PR). This is 054.
-- ============================================================

-- ── shared updated_at trigger ───────────────────────────────────────────────
create or replace function public.news_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── news_sources: publisher / feed metadata ─────────────────────────────────
create table if not exists public.news_sources (
  id                uuid        primary key default gen_random_uuid(),
  name              text        not null,
  homepage_url      text,
  feed_url          text,
  source_type       text,                    -- e.g. 'rss', 'api', 'manual'
  country_scope     text,
  language          text,
  enabled           boolean     not null default true,
  reliability_tier  text,                    -- e.g. 'high', 'standard', 'low'
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists news_sources_enabled_idx on public.news_sources (enabled);
create index if not exists news_sources_country_idx on public.news_sources (country_scope);

drop trigger if exists news_sources_set_updated_at on public.news_sources;
create trigger news_sources_set_updated_at
  before update on public.news_sources
  for each row execute function public.news_set_updated_at();

-- ── news_articles: one source article / feed item ───────────────────────────
create table if not exists public.news_articles (
  id                   uuid        primary key default gen_random_uuid(),
  title                text,
  original_title       text,
  source_id            uuid        references public.news_sources(id) on delete set null,
  source_name          text,
  source_url           text,                 -- link shown to the user
  canonical_url        text,                 -- normalized dedup key
  resolved_url         text,                 -- final publisher URL after redirects
  published_at         timestamptz,
  first_seen_at        timestamptz not null default now(),
  language             text,
  country_code         text,
  source_country_code  text,
  snippet              text,                 -- short; must NOT copy substantial text
  image_url            text,
  ingestion_source     text,
  raw_feed_meta        jsonb       not null default '{}',
  status               text        not null default 'candidate'
                         check (status in ('candidate', 'published', 'hidden', 'archived')),
  relevance_score      integer,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists news_articles_country_idx     on public.news_articles (country_code);
create index if not exists news_articles_status_idx      on public.news_articles (status);
create index if not exists news_articles_published_idx   on public.news_articles (published_at desc);
create index if not exists news_articles_canonical_idx   on public.news_articles (canonical_url);
create index if not exists news_articles_resolved_idx    on public.news_articles (resolved_url);
create index if not exists news_articles_source_idx      on public.news_articles (source_id);

drop trigger if exists news_articles_set_updated_at on public.news_articles;
create trigger news_articles_set_updated_at
  before update on public.news_articles
  for each row execute function public.news_set_updated_at();

-- ── news_story_clusters: one underlying real-world event ────────────────────
create table if not exists public.news_story_clusters (
  id                     uuid        primary key default gen_random_uuid(),
  cluster_title          text,
  summary                text,                 -- factual context only
  market_relevance_note  text,                 -- neutral, evidence-bounded
  country_code           text,
  primary_topic          text,
  topics                 text[]      not null default '{}',
  affected_regions       text[]      not null default '{}',
  entities               text[]      not null default '{}',
  status                 text        not null default 'candidate'
                           check (status in ('candidate', 'published', 'hidden', 'archived')),
  editorial_priority     text        not null default 'standard'
                           check (editorial_priority in ('high', 'standard')),
  cluster_confidence     numeric,              -- 0..1
  first_published_at     timestamptz,
  latest_published_at    timestamptz,
  source_count           integer     not null default 0,  -- denormalized; link table is authoritative
  reviewed_by            uuid,
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists news_clusters_country_idx  on public.news_story_clusters (country_code);
create index if not exists news_clusters_status_idx   on public.news_story_clusters (status);
create index if not exists news_clusters_topic_idx    on public.news_story_clusters (primary_topic);
create index if not exists news_clusters_latest_idx   on public.news_story_clusters (latest_published_at desc);

drop trigger if exists news_clusters_set_updated_at on public.news_story_clusters;
create trigger news_clusters_set_updated_at
  before update on public.news_story_clusters
  for each row execute function public.news_set_updated_at();

-- ── news_article_cluster_links: article ↔ cluster ───────────────────────────
create table if not exists public.news_article_cluster_links (
  cluster_id        uuid        not null references public.news_story_clusters(id) on delete cascade,
  article_id        uuid        not null references public.news_articles(id) on delete cascade,
  match_method      text        check (match_method in (
                       'canonical_url', 'resolved_url', 'title_similarity',
                       'entity_overlap', 'number_overlap', 'topic_overlap',
                       'manual', 'semantic'
                     )),
  match_score       numeric,
  is_primary_source boolean     not null default false,
  created_at        timestamptz not null default now(),
  primary key (cluster_id, article_id)
);
create index if not exists news_links_article_idx on public.news_article_cluster_links (article_id);

-- ── Row-level security ──────────────────────────────────────────────────────
-- Authenticated admin users may READ. Writes are service-role only (ingest +
-- clustering jobs) — no anon/authenticated write policy = implicit deny from
-- the browser. Admin write tooling arrives in a later stage.
alter table public.news_sources              enable row level security;
alter table public.news_articles             enable row level security;
alter table public.news_story_clusters       enable row level security;
alter table public.news_article_cluster_links enable row level security;

drop policy if exists "authenticated_select_news_sources" on public.news_sources;
create policy "authenticated_select_news_sources" on public.news_sources
  for select to authenticated using (true);

drop policy if exists "authenticated_select_news_articles" on public.news_articles;
create policy "authenticated_select_news_articles" on public.news_articles
  for select to authenticated using (true);

drop policy if exists "authenticated_select_news_clusters" on public.news_story_clusters;
create policy "authenticated_select_news_clusters" on public.news_story_clusters
  for select to authenticated using (true);

drop policy if exists "authenticated_select_news_links" on public.news_article_cluster_links;
create policy "authenticated_select_news_links" on public.news_article_cluster_links
  for select to authenticated using (true);
