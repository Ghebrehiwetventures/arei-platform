-- Migration: 048_social_queue_channels.sql
-- Date: 2026-05-26
--
-- Purpose:
--   Add channels text[] to social_listing_queue so one queued post can fan out
--   to multiple platforms (Instagram, TikTok, X, LinkedIn).
--
--   Existing rows default to ['instagram']. The platform column is kept for
--   backward-compat (indices, existing queries still filter by it).
--
-- HOW TO RUN:
--   Open Supabase SQL Editor and paste this file, or:
--     psql "$DATABASE_URL" -f migrations/048_social_queue_channels.sql

alter table public.social_listing_queue
  add column if not exists channels text[] not null default ARRAY['instagram']::text[];

-- Backfill: rows where platform != 'instagram' get their platform as channel.
update public.social_listing_queue
  set channels = ARRAY[platform]::text[]
  where platform is distinct from 'instagram';

create index if not exists social_listing_queue_channels_gin
  on public.social_listing_queue using gin (channels);
