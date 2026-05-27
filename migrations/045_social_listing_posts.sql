-- Migration: 045_social_listing_posts.sql
-- Date: 2026-05-21
--
-- Purpose:
--   Track Instagram carousel posts published from the Listing Social view
--   (arei-admin → Listing Social). One row per successful publish.
--
-- Used by:
--   arei-admin/api/social-listing.js  (writes after successful publish)
--   arei-admin/ListingSocialView.tsx  (reads to show published history and
--                                      filter out already-published listings)
--
-- HOW TO RUN:
--   Open Supabase SQL Editor and paste this file, or:
--     psql "$DATABASE_URL" -f migrations/045_social_listing_posts.sql

create table if not exists public.social_listing_posts (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  platform text not null default 'instagram',
  external_post_id text not null,
  permalink text,
  caption text not null,
  image_urls text[] not null default '{}',
  published_at timestamptz not null default now(),
  published_by text
);

create index if not exists social_listing_posts_listing_id_idx
  on public.social_listing_posts (listing_id);

create index if not exists social_listing_posts_published_at_idx
  on public.social_listing_posts (published_at desc);

-- RLS: service-role only (Edge Function / Vercel admin API writes; nothing else reads)
alter table public.social_listing_posts enable row level security;
-- No policies = no access for anon/authenticated. Service role bypasses RLS.
