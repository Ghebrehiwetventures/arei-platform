-- Migration 037: broker.market_listings_view
-- Date: 2026-05-14
--
-- Purpose:
--   Expose live/public listing data to the broker app (arei-broker) for the
--   Market Access tab, through a stable broker-specific read view.
--
--   Market Access = the same listings buyers already see on the public website
--   (kazaverde.com), surfaced inside the broker workspace.
--
-- Source:
--   public.v1_feed_cv — the canonical public listing feed, which itself reads
--   from public.v1_feed_cv_curated_preview (kv_curated.listings, published rows).
--   This view does NOT touch raw pipeline tables, scraper snapshots,
--   public.listings directly, broker_pilot_listings, or admin diagnostic views.
--
-- Column policy:
--   Selects only broker-safe, consumer-visible columns.
--   All rows in v1_feed_cv are already approved, published, non-superseded, and
--   have valid images — no additional filtering is needed here.
--   Internal diagnostics, scraper metadata, pipeline fields, and quality signals
--   are excluded at the column level in this view definition.
--
-- Access:
--   Grants SELECT to anon and authenticated, matching v1_feed_cv's existing
--   public access model. Market Access reads this view unauthenticated in V0
--   (same as the public website), and as the authenticated broker role in V1.

begin;

create schema if not exists broker;

create or replace view broker.market_listings_view as
select
  -- Identity
  id,

  -- Listing content
  title,
  description,

  -- Pricing
  price,
  currency,
  price_period,
  price_status,

  -- Location
  country,
  island,
  city,
  latitude,
  longitude,

  -- Property attributes
  property_type,
  bedrooms,
  bathrooms,
  property_size_sqm,
  land_area_sqm,
  amenities,

  -- Media
  image_urls,
  cover_image_url,

  -- Public source link (original listing URL, exposed on kazaverde.com detail pages)
  source_url,

  -- Timestamps
  first_seen_at,
  updated_at

from public.v1_feed_cv;

-- Excluded columns and reasons:
--   source_id             — internal scraper source identifier
--   source_url_normalized — internal normalisation artefact
--   dedup_key             — internal deduplication key
--   canonical_id          — internal
--   canonical_listing_id  — internal
--   identity_fingerprint  — internal
--   cross_source_match_key — internal
--   trust_tier            — internal diagnostic
--   trust_gate_passed     — internal diagnostic
--   indexable             — internal diagnostic
--   review_reasons        — internal diagnostic
--   duplicate_risk        — internal diagnostic
--   multi_domain_gallery  — internal diagnostic
--   is_stale / stale_at / stale_reason — internal diagnostics
--   violations            — internal quality metric
--   approved              — all rows are approved by definition in v1_feed_cv
--   is_superseded         — always false in v1_feed_cv by definition
--   cover_image_hash      — internal
--   location_confidence   — internal diagnostic
--   has_valid_images / has_valid_image — internal diagnostic flags
--   status                — always 'published' in v1_feed_cv; not meaningful to broker
--   area_sqm              — alias for property_size_sqm; prefer the canonical name
--   region                — null in curated feed; omit until populated
--   created_at            — first_seen_at is more semantically correct for market context
--   rendered_* columns    — null in curated feed; part of legacy translation pipeline
--   description_html      — scraped HTML, detail-view only; not needed for V0 browse/search;
--                           rendered via dangerouslySetInnerHTML on the consumer site, which
--                           is a footgun if used carelessly in the broker app. Add in V1
--                           only when a broker listing detail view is explicitly built.
--   ai_descriptions       — JSONB, detail-view only (DETAIL_COLUMNS_OPTIONAL in arei-sdk);
--                           not needed for list/card/compare views in Market V0. Add in V1.

grant usage on schema broker to anon;
grant usage on schema broker to authenticated;

grant select on broker.market_listings_view to anon;
grant select on broker.market_listings_view to authenticated;

commit;
