-- 047_market_news_enrich_fields.sql
--
-- Adds three columns to public.market_news to persist auto-enrichment
-- metadata written by the ingest script's --enrich flag.
--
-- enriched_at           — timestamp of the last auto-enrich run for this row
--                         NULL means not yet enriched via the script
-- relevance_score       — AI-assigned 0–100 relevance score
-- enrich_recommendation — AI recommendation: publish / keep_candidate / archive
--
-- The editorial fields updated during enrichment (title, snippet,
-- why_it_matters, category, signal_tags, affected_regions, title_pt,
-- snippet_pt, why_it_matters_pt) already exist on the table from earlier
-- migrations and are simply overwritten in-place.
--
-- Sequence check: 046 is the highest applied migration. This is 047.

ALTER TABLE public.market_news
  ADD COLUMN IF NOT EXISTS enriched_at          TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS relevance_score      INTEGER      DEFAULT NULL
    CONSTRAINT market_news_relevance_score_range CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 100)),
  ADD COLUMN IF NOT EXISTS enrich_recommendation TEXT         DEFAULT NULL
    CONSTRAINT market_news_enrich_recommendation_values CHECK (enrich_recommendation IS NULL OR enrich_recommendation IN ('publish', 'keep_candidate', 'archive'));

COMMENT ON COLUMN public.market_news.enriched_at          IS 'Timestamp of last auto-enrich run via ingest --enrich flag. NULL = not yet enriched.';
COMMENT ON COLUMN public.market_news.relevance_score      IS 'AI-assigned relevance score 0–100. NULL until enriched.';
COMMENT ON COLUMN public.market_news.enrich_recommendation IS 'AI recommendation: publish / keep_candidate / archive. NULL until enriched.';
