-- 046_market_news_pt_fields.sql
--
-- Adds European Portuguese translation columns to public.market_news.
-- All three columns are nullable: existing rows have no PT translation
-- and will fall back to the EN fields on the render side.
-- Translations are populated by the admin enrich panel via Claude API.

ALTER TABLE public.market_news
  ADD COLUMN IF NOT EXISTS title_pt          text,
  ADD COLUMN IF NOT EXISTS snippet_pt        text,
  ADD COLUMN IF NOT EXISTS why_it_matters_pt text;
