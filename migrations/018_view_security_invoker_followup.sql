-- Migration: follow-up caller-permission hardening for public-facing views
-- Date: 2026-03-23
--
-- Why:
-- - public.public_listings was called out for follow-up audit separately from
--   frontend_listings_v1/v2.
-- - public.v1_feed_cv is the public consumer feed read by anon/authenticated
--   clients through arei-sdk.
-- - security_invoker ensures underlying table/view permissions and RLS are
--   evaluated using the caller, not the view owner.

ALTER VIEW IF EXISTS public.public_listings
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v1_feed_cv
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.v1_feed_cv_indexable
  SET (security_invoker = true);
