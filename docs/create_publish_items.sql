-- Run this in Supabase Dashboard -> SQL Editor to add the Phase 2 manual publish queue.
-- This is intentionally limited to manual publish preparation and lifecycle tracking.

create table if not exists public.publish_items (
  id text primary key,
  source_listing_id text not null references public.listings (id) on delete cascade,
  content_draft_id text not null references public.content_drafts (id) on delete cascade,
  channel text not null check (channel in ('instagram', 'facebook', 'linkedin', 'blog', 'other')),
  publish_mode text not null check (publish_mode in ('publish_now', 'schedule_later')),
  publish_status text not null check (publish_status in ('ready_to_publish', 'scheduled', 'published', 'failed', 'cancelled')),
  final_copy text not null,
  selected_image_url text not null,
  scheduled_for timestamptz null,
  published_at timestamptz null,
  post_url text null,
  operator_notes text null,
  constraint publish_items_scheduled_requires_datetime
    check (publish_status <> 'scheduled' or scheduled_for is not null),
  constraint publish_items_published_requires_fields
    check (publish_status <> 'published' or (published_at is not null and post_url is not null)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists publish_items_content_draft_channel_idx
  on public.publish_items (content_draft_id, channel);

create index if not exists publish_items_status_idx
  on public.publish_items (publish_status);
