-- 049_market_briefings.sql
--
-- Editorial market briefing editions for Cape Verde.
--
-- Design principles (mirrors 044_market_report_snapshots):
--   - One row per edition. Editorial layer ONLY — it does not duplicate any
--     numbers. The canonical briefing page joins this row to the
--     market_report_snapshots rows sharing its snapshot_date.
--   - snapshot_date pins the edition permanently to the exact snapshot it was
--     published from. Numbers come from 044; this table never copies them.
--   - draft → published → archived lifecycle. Nothing auto-publishes. Public
--     reads (anon) require status='published' AND published_at IS NOT NULL,
--     enforced at RLS AND repeated in the SDK query (belt-and-suspenders).
--     'archived' retires an edition from public view without deleting it —
--     RLS stays published-only, so archived rows are invisible to anon.
--   - All writes go through the service role. No anon insert/update/delete.
--   - PR A uses placeholder editorial fields written directly into the row.
--     No AI generation / drafting logic in this PR.
--
-- Sequence check: 048 is the highest migration in the repo at time of
-- writing. This is 049.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.market_briefings (
  id                  uuid         primary key default gen_random_uuid(),

  -- URL key. One edition per slug. e.g. '2026-05'
  slug                text         not null,
  -- Human display label for the period. e.g. 'May 2026'
  period              text         not null,

  -- Pointer into market_report_snapshots (island rows + the 'ALL' aggregate
  -- for this date). Not a single-row FK — the snapshot is keyed
  -- (snapshot_date, island).
  snapshot_date       date         not null,

  -- Editorial fields (placeholder text in PR A) -----------------------------
  -- Headline, e.g. "Cape Verde Listing Index — May 2026"
  title               text         not null,
  -- Executive summary: 2-3 sentence key takeaway
  executive_summary   text,
  -- Editorial context: 2-3 paragraphs (plain text / light markdown)
  commentary          text,
  -- Optional methodology override. When null, the page renders the standard,
  -- always-present methodology disclosure constant.
  methodology_note    text,

  -- Publication control -----------------------------------------------------
  status              text         not null default 'draft'
                        check (status in ('draft', 'published', 'archived')),
  published_at        timestamptz,
  published_by        text,

  -- Provenance
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now(),

  unique (slug)
);

-- Fast "latest published edition" + archive listing.
create index if not exists market_briefings_published_idx
  on public.market_briefings (snapshot_date desc)
  where status = 'published' and published_at is not null;

-- ---------------------------------------------------------------------------
-- 2. RLS — both conditions required for public reads (mirrors 044)
-- ---------------------------------------------------------------------------

alter table public.market_briefings enable row level security;

drop policy if exists "anon read published briefings" on public.market_briefings;
create policy "anon read published briefings"
  on public.market_briefings
  for select
  to anon, authenticated
  using (status = 'published' and published_at is not null);

-- No insert / update / delete policies for anon or authenticated.
-- All writes go through the service role (briefing draft/publish — PR B).
