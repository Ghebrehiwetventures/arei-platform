-- 032_market_news_admin_rls.sql
--
-- Grant authenticated admin users full read access and restricted write access
-- to public.market_news.
--
-- Public anon access is unchanged: anon sees only status = 'published' rows.
-- The existing "market_news public read" policy (anon + authenticated, published
-- only) already exists. Adding a second SELECT policy for authenticated ORs the
-- two policies — authenticated sees all statuses, anon still sees only published.
--
-- Write access is authenticated-only and column-restricted. Service role
-- continues to bypass RLS for ingestion script writes.

-- ── SELECT: authenticated sees all rows (any status) ─────────────────────────

drop policy if exists "market_news admin read" on public.market_news;
create policy "market_news admin read"
  on public.market_news
  for select
  to authenticated
  using (true);

-- ── UPDATE: authenticated may edit editorial fields + status ──────────────────
-- Column-level grant (below) further restricts which columns can be SET.

drop policy if exists "market_news admin update" on public.market_news;
create policy "market_news admin update"
  on public.market_news
  for update
  to authenticated
  using (true)
  with check (status in ('candidate', 'published', 'hidden', 'archived'));

-- ── Grants ────────────────────────────────────────────────────────────────────
-- SELECT all columns for admin reads.
-- UPDATE restricted to editorial + status columns only; id, canonical_url,
-- source_url, ingestion_source, created_at are immutable from the admin side.

grant select on public.market_news to authenticated;

grant update (
  title,
  snippet,
  why_it_matters,
  category,
  affected_regions,
  signal_tags,
  status,
  updated_at
) on public.market_news to authenticated;
