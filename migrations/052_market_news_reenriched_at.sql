-- 052_market_news_reenriched_at.sql
-- Tracks rows that have been re-enriched with the updated enrichment prompt
-- (richer 2–4 sentence snippet + no "this matters" phrasing, PR #354).
-- The /api/reenrich-market-news backfill processes rows where this is NULL,
-- then stamps it, so the one-time backfill terminates cleanly and is idempotent.

ALTER TABLE public.market_news
  ADD COLUMN IF NOT EXISTS reenriched_at timestamptz;
