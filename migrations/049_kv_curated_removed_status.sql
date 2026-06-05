-- Migration: allow kv_curated listings to be retired when source inventory drops them
-- Date: 2026-06-05
--
-- `removed` means a listing was previously published, but the latest successful
-- source fetch no longer returned its source id. Public feed views already only
-- expose `publish_status = 'published'`, so removed rows immediately leave the
-- public feed while preserving audit/history in kv_curated.listings.

begin;

alter table kv_curated.listings
  drop constraint if exists kv_curated_listings_publish_status_check;

alter table kv_curated.listings
  add constraint kv_curated_listings_publish_status_check
    check (publish_status in ('published', 'hidden', 'needs_review', 'removed'));

commit;
