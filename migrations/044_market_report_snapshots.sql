-- 044_market_report_snapshots.sql
--
-- Stable, editor-approved market report snapshots for Cape Verde.
--
-- Design principles:
--   - Snapshots are written as 'draft' by the snapshot script and
--     promoted to 'published' by a deliberate manual publish command.
--     Nothing is ever auto-published.
--   - Public reads (anon role, browser SDK) require BOTH
--     status = 'published' AND published_at IS NOT NULL.
--     This is enforced at the RLS layer AND repeated in the SDK query
--     as belt-and-suspenders.
--   - The compute function reads public.listings directly (SECURITY
--     DEFINER). It is only callable by service_role — not by anon or
--     authenticated. The browser never calls it.
--   - Stats reflect three listing tiers:
--       Tier 1 — raw: everything in public.listings
--       Tier 2 — screened/monitored: approved, cv_ source, image, url
--                → drives listing_count and source_count
--       Tier 3 — methodology-eligible: screened + sale + EUR price in
--                range + not superseded → drives median, avg_eur_per_sqm,
--                index_eligible_count
--   - median_price_eur and avg_eur_per_sqm are NULL when the eligible
--     sample is < 5 records (MIN_ELIGIBLE_MEDIAN).
--   - Same-day re-runs are idempotent via ON CONFLICT upsert. Re-running
--     after publication is blocked at the script level, not here.
--   - One row per (snapshot_date, island). 'ALL' is the aggregate row.
--
-- Sequence check: migration 043 is the highest in the repo at time of
-- writing. This is 044.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.market_report_snapshots (
  id                    serial        primary key,
  snapshot_date         date          not null,
  island                text          not null,   -- island name, or 'ALL' for aggregate

  -- Tier 2: screened / monitored listings
  listing_count         integer       not null,
  source_count          integer       not null,

  -- Tier 3: methodology-eligible index records
  index_eligible_count  integer       not null,
  median_price_eur      numeric(12,2),            -- null when eligible < 5
  avg_eur_per_sqm       numeric(10,2),            -- null when sqm sample < 5
  sqm_coverage_pct      numeric(5,1),             -- % of eligible with sqm data
  price_coverage_pct    numeric(5,1),             -- % of screened with valid sale price

  -- Publication control
  status                text          not null default 'draft'
                          check (status in ('draft', 'published')),
  published_at          timestamptz,              -- set on promotion; null = draft
  published_by          text,                     -- identity of publisher

  -- Provenance
  methodology_version   text          not null default 'v1',
  created_at            timestamptz   not null default now(),
  last_updated          timestamptz   not null default now(),

  unique (snapshot_date, island)
);

-- Fast lookup for the "latest published snapshot" query.
create index if not exists market_report_snapshots_published_date_idx
  on public.market_report_snapshots (snapshot_date desc)
  where status = 'published' and published_at is not null;

-- ---------------------------------------------------------------------------
-- 2. RLS — both conditions required for public reads
-- ---------------------------------------------------------------------------

alter table public.market_report_snapshots enable row level security;

drop policy if exists "anon read published snapshots" on public.market_report_snapshots;
create policy "anon read published snapshots"
  on public.market_report_snapshots
  for select
  to anon, authenticated
  using (status = 'published' and published_at is not null);

-- No insert / update / delete policies for anon or authenticated.
-- All writes go through the service role (snapshot and publish scripts).

-- ---------------------------------------------------------------------------
-- 3. Compute function (SECURITY DEFINER — service_role only)
--
-- Returns one row per island (plus the 'ALL' aggregate) with Tier 2 and
-- Tier 3 statistics for the given date. Does not write anything — the
-- calling script decides whether to upsert the result as a draft.
-- ---------------------------------------------------------------------------

create or replace function public.compute_market_report_snapshot(
  p_date date default current_date
)
returns table (
  snapshot_date         date,
  island                text,
  listing_count         integer,
  source_count          integer,
  index_eligible_count  integer,
  median_price_eur      numeric,
  avg_eur_per_sqm       numeric,
  sqm_coverage_pct      numeric,
  price_coverage_pct    numeric,
  methodology_version   text
)
language sql
security definer
stable
set search_path = public
as $$
  with
  -- Tier 2: screened / monitored listings.
  -- Mirrors the v1_feed_cv view filter exactly so counts match what the
  -- public feed shows.
  screened as (
    select
      id,
      island,
      price,
      currency,
      price_period,
      property_size_sqm,
      source_id,
      is_superseded
    from public.listings
    where approved = true
      and source_id ilike 'cv_%'
      and image_urls != '{}'
      and source_url is not null
  ),

  -- Tier 3: methodology-eligible index records.
  -- Built on top of screened; adds price/currency/type/superseded filters.
  -- eur_per_sqm is null when property_size_sqm is missing or zero.
  eligible as (
    select
      id,
      island,
      price,
      source_id,
      case
        when property_size_sqm > 0
        then price::numeric / property_size_sqm
        else null
      end as eur_per_sqm
    from screened
    where price > 0
      and currency = 'EUR'
      and price_period = 'sale'
      and (is_superseded is not true)
      and price between 5000 and 5000000
  ),

  -- All distinct islands that have at least one screened listing.
  island_list as (
    select distinct island
    from screened
    where island is not null
  ),

  -- Per-island aggregation.
  per_island as (
    select
      p_date                                                          as snapshot_date,
      il.island,
      count(s.id)::integer                                            as listing_count,
      count(distinct s.source_id)::integer                            as source_count,
      count(e.id)::integer                                            as index_eligible_count,
      case
        when count(e.id) >= 5
        then percentile_cont(0.5) within group (order by e.price)
      end                                                             as median_price_eur,
      case
        when count(e.eur_per_sqm) >= 5
        then avg(e.eur_per_sqm)
      end                                                             as avg_eur_per_sqm,
      case
        when count(e.id) > 0
        then round(100.0 * count(e.eur_per_sqm)::numeric
               / nullif(count(e.id), 0), 1)
      end                                                             as sqm_coverage_pct,
      case
        when count(s.id) > 0
        then round(100.0 * count(e.id)::numeric
               / nullif(count(s.id), 0), 1)
      end                                                             as price_coverage_pct,
      'v1'                                                            as methodology_version
    from island_list il
    left join screened s on s.island = il.island
    left join eligible e on e.id = s.id
    group by il.island
  ),

  -- All-islands aggregate row (island = 'ALL').
  aggregate as (
    select
      p_date                                                          as snapshot_date,
      'ALL'::text                                                     as island,
      count(s.id)::integer                                            as listing_count,
      count(distinct s.source_id)::integer                            as source_count,
      count(e.id)::integer                                            as index_eligible_count,
      case
        when count(e.id) >= 5
        then percentile_cont(0.5) within group (order by e.price)
      end                                                             as median_price_eur,
      case
        when count(e.eur_per_sqm) >= 5
        then avg(e.eur_per_sqm)
      end                                                             as avg_eur_per_sqm,
      case
        when count(e.id) > 0
        then round(100.0 * count(e.eur_per_sqm)::numeric
               / nullif(count(e.id), 0), 1)
      end                                                             as sqm_coverage_pct,
      case
        when count(s.id) > 0
        then round(100.0 * count(e.id)::numeric
               / nullif(count(s.id), 0), 1)
      end                                                             as price_coverage_pct,
      'v1'                                                            as methodology_version
    from screened s
    left join eligible e on e.id = s.id
  )

  select snapshot_date, island, listing_count, source_count,
         index_eligible_count,
         round(median_price_eur, 2) as median_price_eur,
         round(avg_eur_per_sqm, 2)  as avg_eur_per_sqm,
         sqm_coverage_pct,
         price_coverage_pct,
         methodology_version
  from per_island

  union all

  select snapshot_date, island, listing_count, source_count,
         index_eligible_count,
         round(median_price_eur, 2) as median_price_eur,
         round(avg_eur_per_sqm, 2)  as avg_eur_per_sqm,
         sqm_coverage_pct,
         price_coverage_pct,
         methodology_version
  from aggregate

  order by island;
$$;

-- Revoke public execute; only service_role may call this function.
-- The browser SDK reads the snapshot table, not this function.
revoke all on function public.compute_market_report_snapshot(date) from public;
grant execute on function public.compute_market_report_snapshot(date) to service_role;
