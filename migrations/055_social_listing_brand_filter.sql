alter table public.social_listing_queue
  add column if not exists brand_filter boolean not null default false;
