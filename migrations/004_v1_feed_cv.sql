-- Migration: Create v1_feed_cv view + median price RPC
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Date: 2026-02-26
--
-- STATUS: View already deployed to production (2026-02-26).
-- This file documents the deployed view definition.
-- The arei-sdk reads from this view — never from public.listings directly.

-- 1. The feed view: quality-filtered CV listings (all columns)
-- Note: The view exposes the full row because the SDK selects specific
-- columns per query (CARD_COLUMNS vs DETAIL_COLUMNS).
-- Filtering is done at the view level; column selection at the SDK level.
CREATE OR REPLACE VIEW public.v1_feed_cv AS
SELECT *
FROM public.listings
WHERE approved = true
  AND source_id ILIKE 'cv_%'
  AND price IS NOT NULL
  AND price > 0
  AND image_urls != '{}'
  AND source_url IS NOT NULL;

-- 2. Grant read access to anon and authenticated roles
GRANT SELECT ON public.v1_feed_cv TO anon;
GRANT SELECT ON public.v1_feed_cv TO authenticated;

-- 3. RPC: median price (optionally filtered by island)
-- Note: arei-sdk v0.1.0 computes medians client-side in getMarketStats().
-- This RPC is available as a server-side alternative for larger feeds.
CREATE OR REPLACE FUNCTION public.v1_cv_median_price(p_island TEXT DEFAULT NULL)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price)
  FROM public.v1_feed_cv
  WHERE (p_island IS NULL OR island = p_island);
$$;

-- 4. Grant execute to anon/authenticated
GRANT EXECUTE ON FUNCTION public.v1_cv_median_price(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.v1_cv_median_price(TEXT) TO authenticated;

-- 5. Verify
SELECT count(*) AS feed_count FROM public.v1_feed_cv;
SELECT public.v1_cv_median_price() AS overall_median;
