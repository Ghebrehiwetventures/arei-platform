-- Queue for scheduled Instagram carousel posts
create table if not exists public.social_listing_queue (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      text        not null,
  listing_title   text,
  caption         text        not null,
  image_urls      text[]      not null,
  scheduled_at    timestamptz not null,
  status          text        not null default 'pending'
                              check (status in ('pending', 'published', 'failed')),
  error_message   text,
  post_id         text,
  permalink       text,
  story_published boolean     not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists social_listing_queue_pending_scheduled
  on public.social_listing_queue (scheduled_at)
  where status = 'pending';
