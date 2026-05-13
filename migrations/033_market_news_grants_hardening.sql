-- 033_market_news_grants_hardening.sql
--
-- Tighten table-level privileges on public.market_news.
--
-- Migration 032 added authenticated SELECT and UPDATE grants, but left
-- INSERT, DELETE, TRUNCATE, REFERENCES, and TRIGGER on both anon and
-- authenticated, which is broader than needed. TRUNCATE in particular
-- bypasses row-level security; it must not be held by public roles.
--
-- After this migration the effective privilege matrix is:
--
--   anon            SELECT (published rows only, via RLS)
--   authenticated   SELECT (all rows, via RLS policy from 032)
--                   UPDATE on: title, snippet, why_it_matters, category,
--                              affected_regions, signal_tags, status
--                   updated_at is managed by the BEFORE UPDATE trigger;
--                   the admin client does not need column-level access.
--   service_role    bypasses RLS — full access for ingestion script
--
-- RLS policies from 032 remain unchanged.

begin;

-- ── Revoke all unnecessary table-level privileges ─────────────────────────────

revoke insert, update, delete, truncate, references, trigger
  on table public.market_news
  from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.market_news
  from authenticated;

-- ── Re-grant only what is required ───────────────────────────────────────────

-- Public read: anon + authenticated (RLS filters to published rows for anon).
grant select
  on table public.market_news
  to anon, authenticated;

-- Admin writes: authenticated only, column-restricted.
-- updated_at is excluded — the BEFORE UPDATE trigger sets it automatically.
grant update (
  title,
  snippet,
  why_it_matters,
  category,
  affected_regions,
  signal_tags,
  status
)
  on table public.market_news
  to authenticated;

commit;
