-- Migration: Include stale share in source quality stats/score
-- Date: 2026-03-23

DROP FUNCTION IF EXISTS public.get_source_quality_stats();

CREATE OR REPLACE FUNCTION public.get_source_quality_stats()
RETURNS TABLE (
  source_id TEXT,
  listing_count BIGINT,
  approved_count BIGINT,
  with_image_count BIGINT,
  with_price_count BIGINT,
  tier_a_count BIGINT,
  tier_b_count BIGINT,
  tier_c_count BIGINT,
  without_price_pct NUMERIC,
  without_location_pct NUMERIC,
  multi_domain_gallery_rate NUMERIC,
  duplicate_cover_rate NUMERIC,
  price_completeness NUMERIC,
  location_completeness NUMERIC,
  image_validity_rate NUMERIC,
  duplicate_rate NUMERIC,
  freshness NUMERIC,
  title_cleanliness NUMERIC,
  stale_share_pct NUMERIC,
  base_quality_score NUMERIC,
  quality_score NUMERIC,
  latest_run_delta_pct NUMERIC,
  latest_run_warning BOOLEAN
) AS $$
  WITH latest_runs AS (
    SELECT DISTINCT ON (market)
      id,
      market,
      run_delta_pct,
      warning_flags
    FROM public.ingest_runs
    WHERE status = 'completed'
    ORDER BY market, started_at DESC
  ),
  stale_stats AS (
    SELECT
      l.source_id::TEXT,
      CASE
        WHEN COUNT(*) = 0 THEN 0::NUMERIC
        ELSE ROUND(
          (
            COUNT(*) FILTER (WHERE COALESCE(l.is_stale, false) = true)::NUMERIC
            / COUNT(*)::NUMERIC
          ) * 100,
          2
        )
      END AS stale_share_pct
    FROM public.listings l
    GROUP BY l.source_id
  )
  SELECT
    s.source_id::TEXT,
    s.fetched_count::BIGINT,
    s.public_count::BIGINT,
    ROUND((s.image_validity_rate / 100.0) * s.fetched_count)::BIGINT,
    ROUND((s.price_completeness / 100.0) * s.fetched_count)::BIGINT,
    s.tier_a_count::BIGINT,
    s.tier_b_count::BIGINT,
    s.tier_c_count::BIGINT,
    s.without_price_pct,
    s.without_location_pct,
    s.multi_domain_gallery_rate,
    s.duplicate_cover_rate,
    s.price_completeness,
    s.location_completeness,
    s.image_validity_rate,
    s.duplicate_rate,
    s.freshness,
    s.title_cleanliness,
    COALESCE(ss.stale_share_pct, 0) AS stale_share_pct,
    s.quality_score AS base_quality_score,
    ROUND(
      GREATEST(
        0,
        s.quality_score - LEAST(40, COALESCE(ss.stale_share_pct, 0) * 0.5)
      ),
      2
    ) AS quality_score,
    lr.run_delta_pct,
    COALESCE(array_position(lr.warning_flags, 'PUBLIC_COUNT_DELTA_GT_10_PERCENT') IS NOT NULL, false)
  FROM public.source_run_metrics s
  JOIN latest_runs lr
    ON lr.id = s.ingest_run_id
   AND lr.market = s.market
  LEFT JOIN stale_stats ss
    ON ss.source_id = s.source_id
  ORDER BY s.market, s.source_id;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION public.get_source_quality_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_source_quality_stats() TO authenticated;
