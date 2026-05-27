-- Prevent duplicate social publishes for the same listing/market/channel.
-- The admin API uses SUPABASE_SERVICE_ROLE_KEY; browser clients should not
-- access these tables directly.

alter table public.social_listing_posts enable row level security;
alter table public.social_listing_queue enable row level security;

revoke all on table public.social_listing_posts from anon, authenticated;
revoke all on table public.social_listing_queue from anon, authenticated;

grant all on table public.social_listing_posts to service_role;
grant all on table public.social_listing_queue to service_role;

create table if not exists public.social_listing_posts_duplicate_archive
as
select *
from public.social_listing_posts
where false;

alter table public.social_listing_posts_duplicate_archive enable row level security;
revoke all on table public.social_listing_posts_duplicate_archive from anon, authenticated;
grant all on table public.social_listing_posts_duplicate_archive to service_role;

with ranked_posts as (
  select
    id,
    row_number() over (
      partition by coalesce(market_id, 'cv'), coalesce(platform, 'instagram'), listing_id
      order by published_at desc nulls last, id desc
    ) as rn
  from public.social_listing_posts
)
insert into public.social_listing_posts_duplicate_archive
select p.*
from public.social_listing_posts p
join ranked_posts r on r.id = p.id
where r.rn > 1;

with ranked_posts as (
  select
    id,
    row_number() over (
      partition by coalesce(market_id, 'cv'), coalesce(platform, 'instagram'), listing_id
      order by published_at desc nulls last, id desc
    ) as rn
  from public.social_listing_posts
)
delete from public.social_listing_posts p
using ranked_posts r
where r.id = p.id
  and r.rn > 1;

with already_published as (
  select distinct
    coalesce(market_id, 'cv') as market_id,
    coalesce(platform, 'instagram') as platform,
    listing_id
  from public.social_listing_posts
)
update public.social_listing_queue q
set
  status = 'failed',
  post_id = null,
  error_message = 'Pending item closed because this listing was already published on this channel.'
from already_published p
where q.status = 'pending'
  and coalesce(q.market_id, 'cv') = p.market_id
  and coalesce(q.platform, 'instagram') = p.platform
  and q.listing_id = p.listing_id;

with ranked_queue as (
  select
    id,
    row_number() over (
      partition by coalesce(market_id, 'cv'), coalesce(platform, 'instagram'), listing_id
      order by scheduled_at asc nulls last, id asc
    ) as rn
  from public.social_listing_queue
  where status = 'pending'
)
update public.social_listing_queue q
set
  status = 'failed',
  post_id = null,
  error_message = 'Duplicate pending item closed by migration 046.'
from ranked_queue r
where r.id = q.id
  and r.rn > 1;

create unique index if not exists social_listing_posts_market_platform_listing_uidx
  on public.social_listing_posts (
    coalesce(market_id, 'cv'),
    coalesce(platform, 'instagram'),
    listing_id
  );

create unique index if not exists social_listing_queue_pending_market_platform_listing_uidx
  on public.social_listing_queue (
    coalesce(market_id, 'cv'),
    coalesce(platform, 'instagram'),
    listing_id
  )
  where status = 'pending';
