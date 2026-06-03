-- 050_market_briefings_admin.sql
--
-- Admin authoring support for market_briefings (PR B).
--
--   1. Adds the key_takeaways editorial field (3-5 short statements; the
--      3-5 rule is enforced in the app at publish time, not by a DB CHECK,
--      so half-written drafts are never blocked).
--   2. Grants authenticated admin users read (all statuses) + insert + a
--      column-restricted update. Mirrors 032_market_news_admin_rls.
--
-- Anon access is unchanged: the 049 policy still exposes published-only rows.
-- A second SELECT policy for authenticated ORs with it — authenticated sees
-- all statuses (drafts included), anon still sees only published.
--
-- Security posture: writes are open to any authenticated user, matching the
-- existing market_news precedent. The admin console gates access at the app
-- layer (admin-row check on sign-in). This can be tightened to an is_admin()
-- check later without touching the app.
--
-- Service role continues to bypass RLS for any script writes.

-- ── 1. New editorial field ───────────────────────────────────────────────────

alter table public.market_briefings
  add column if not exists key_takeaways text[];

-- ── 2. SELECT: authenticated sees all rows (any status) ──────────────────────

drop policy if exists "market_briefings admin read" on public.market_briefings;
create policy "market_briefings admin read"
  on public.market_briefings
  for select
  to authenticated
  using (true);

-- ── 3. INSERT: authenticated may create drafts / published editions ──────────

drop policy if exists "market_briefings admin insert" on public.market_briefings;
create policy "market_briefings admin insert"
  on public.market_briefings
  for insert
  to authenticated
  with check (status in ('draft', 'published'));

-- ── 4. UPDATE: authenticated may edit + change status ────────────────────────
-- Column-level grant (below) further restricts which columns can be SET.

drop policy if exists "market_briefings admin update" on public.market_briefings;
create policy "market_briefings admin update"
  on public.market_briefings
  for update
  to authenticated
  using (true)
  with check (status in ('draft', 'published', 'archived'));

-- ── 5. Grants ────────────────────────────────────────────────────────────────
-- SELECT all columns for admin reads. INSERT all columns (a new row needs
-- slug + snapshot_date). UPDATE restricted to editorial + status columns only;
-- id, slug, snapshot_date, created_at stay immutable from the admin side.

grant select on public.market_briefings to authenticated;
grant insert on public.market_briefings to authenticated;
grant update (
  title,
  period,
  executive_summary,
  key_takeaways,
  commentary,
  methodology_note,
  status,
  published_at,
  published_by,
  updated_at
) on public.market_briefings to authenticated;
