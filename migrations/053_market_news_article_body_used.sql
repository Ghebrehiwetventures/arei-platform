-- 053_market_news_article_body_used.sql
-- Records whether enrichment had the full article body (true) or fell back to
-- the RSS snippet only (false/null) for a row. Surfaced as a "Full article" /
-- "Snippet only" badge so a thin caption is clearly attributable to a closed
-- source (paywall / bot-block / JS-render), not to our code.

ALTER TABLE public.market_news
  ADD COLUMN IF NOT EXISTS article_body_used boolean;
