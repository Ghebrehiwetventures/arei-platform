-- Migration: 047_marketing_multi_market.sql
-- Date: 2026-05-23
--
-- Purpose:
--   Generalize the marketing content tables so the same engine can serve
--   every AREI index market (Cape Verde now; Nigeria, Ghana, ... later) and
--   every channel (Instagram now; TikTok, X, LinkedIn, ... later).
--
--   - social_listing_queue: add market_id + platform (channel)
--   - social_listing_posts:  add market_id (platform already exists)
--
--   Existing rows backfill to ('cv', 'instagram') — the only market/channel
--   live today.
--
-- HOW TO RUN:
--   Open Supabase SQL Editor and paste this file, or:
--     psql "$DATABASE_URL" -f migrations/047_marketing_multi_market.sql

alter table public.social_listing_queue
  add column if not exists market_id text not null default 'cv',
  add column if not exists platform  text not null default 'instagram';

alter table public.social_listing_posts
  add column if not exists market_id text not null default 'cv';

create index if not exists social_listing_queue_market_platform_idx
  on public.social_listing_queue (market_id, platform);

create index if not exists social_listing_posts_market_idx
  on public.social_listing_posts (market_id);
