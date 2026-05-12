-- Migration: Supabase Security Advisor cleanup before AREI Pulse production
-- Date: 2026-05-02
--
-- Scope:
-- - Make public feed views run with invoker privileges so RLS/grants on
--   underlying objects are not bypassed.
-- - Keep public SELECT grants on feed views so KazaVerde can continue reading
--   the intended public listing feed.
-- - Pin get_source_quality_stats() search_path.
-- - Remove stale broader content_drafts grants/policies from migration 022
--   while preserving the current anon admin draft flow introduced in 023.
--
-- Preflight before applying in production:
--   select count(*) as before_count from public.v1_feed_cv;
--   select * from public.v1_feed_cv limit 5;
--   select n.nspname, c.relname, c.relrowsecurity
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public'
--     and c.relname in ('listings', 'ingest_runs');
--
-- Postflight after applying in production:
--   select count(*) as after_count from public.v1_feed_cv;
--   select * from public.v1_feed_cv limit 5;
--   select * from public.get_source_quality_stats() limit 5;
--   select relname, reloptions
--   from pg_class
--   where relname in (
--     'v1_feed_cv',
--     'v1_feed_cv_pre_terra_cohort_rollback_20260401',
--     'v1_feed_cv_indexable'
--   );

-- Security Definer View warnings.
--
-- These are ALTER VIEW statements instead of CREATE OR REPLACE VIEW so the
-- live feed contract and column order remain untouched.
ALTER VIEW IF EXISTS public.v1_feed_cv_pre_terra_cohort_rollback_20260401
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v1_feed_cv
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v1_feed_cv_indexable
  SET (security_invoker = true);

-- Preserve intended public read access to the feed surfaces.
DO $$
BEGIN
  IF to_regclass('public.v1_feed_cv') IS NOT NULL THEN
    GRANT SELECT ON public.v1_feed_cv TO anon;
    GRANT SELECT ON public.v1_feed_cv TO authenticated;
  END IF;

  IF to_regclass('public.v1_feed_cv_indexable') IS NOT NULL THEN
    GRANT SELECT ON public.v1_feed_cv_indexable TO anon;
    GRANT SELECT ON public.v1_feed_cv_indexable TO authenticated;
  END IF;
END $$;

-- Function Search Path Mutable warning.
--
-- Use ALTER FUNCTION to avoid changing the function body or return contract.
ALTER FUNCTION IF EXISTS public.get_source_quality_stats()
  SET search_path = public, pg_temp;

-- content_drafts RLS cleanup.
--
-- AREI Admin currently persists content drafts through the anon Supabase
-- client in arei-admin/supabase.ts and arei-admin/data.ts. Removing anon
-- SELECT/INSERT/UPDATE here would break the existing admin draft workflow.
-- Keep the anon policies from migration 023, but make sure the broader
-- authenticated policies/grants from migration 022 cannot remain active.
ALTER TABLE IF EXISTS public.content_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_drafts_select_all ON public.content_drafts;
DROP POLICY IF EXISTS content_drafts_insert_all ON public.content_drafts;
DROP POLICY IF EXISTS content_drafts_update_all ON public.content_drafts;

REVOKE SELECT, INSERT, UPDATE ON public.content_drafts FROM authenticated;
