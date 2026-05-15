-- ============================================================
-- Migration 038: Broker Auth Tenant Foundation
-- ============================================================
-- Purpose:
--   Add the production tenant/auth foundation for arei-broker without
--   changing current runtime behavior or removing demo anon policies.
--
-- Scope:
--   - agency_users
--   - agency_memberships
--   - agency_invitations
--   - agency-level lead visibility flag
--   - nullable assignment/ownership fields on current V0 broker tables
--
-- Notes:
--   broker_pilot_listings remains a V0/prototype table. It is retained for
--   the current demo and should become agency_listings or equivalent before
--   external production onboarding.
--
--   The new user/assignment columns are tenant/role foundation fields. They
--   are nullable so existing demo data remains valid.
--
-- Safe to re-run: IF NOT EXISTS guards and drop/create trigger guards.
-- ============================================================

begin;

-- Reuse/create the shared updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Agency-level capability flags ─────────────────────────────────────────

alter table public.agencies
  add column if not exists agents_can_see_all_leads boolean not null default false;

comment on column public.agencies.agents_can_see_all_leads is
  'Agency-level V0 capability flag. When true, active agents may read all leads for their agency; otherwise agents are limited to assigned leads. Owner/Manager always see all agency leads.';

-- ── Agency users ──────────────────────────────────────────────────────────

create table if not exists public.agency_users (
  id            uuid        primary key default gen_random_uuid(),
  auth_user_id  uuid        not null references auth.users(id) on delete cascade,
  email         text        not null,
  full_name     text,
  phone         text,
  whatsapp      text,
  status        text        not null default 'active'
                            check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (auth_user_id),
  unique (email)
);

create index if not exists agency_users_auth_user_id_idx on public.agency_users (auth_user_id);
create index if not exists agency_users_email_idx        on public.agency_users (lower(email));
create index if not exists agency_users_status_idx       on public.agency_users (status);

comment on table public.agency_users is
  'Broker product user identity linked to Supabase Auth. A user may belong to agencies through agency_memberships.';

drop trigger if exists trg_agency_users_updated_at on public.agency_users;
create trigger trg_agency_users_updated_at
  before update on public.agency_users
  for each row
  execute function public.set_updated_at();

alter table public.agency_users enable row level security;

-- ── Agency memberships ────────────────────────────────────────────────────

create table if not exists public.agency_memberships (
  id                   uuid        primary key default gen_random_uuid(),
  agency_id            uuid        not null references public.agencies(id) on delete cascade,
  agency_user_id        uuid        not null references public.agency_users(id) on delete cascade,
  role                 text        not null
                                      check (role in ('owner', 'manager', 'agent', 'viewer')),
  status               text        not null default 'active'
                                      check (status in ('active', 'invited', 'suspended', 'removed')),
  can_publish_directly boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (agency_id, agency_user_id)
);

create unique index if not exists agency_memberships_one_active_owner_idx
  on public.agency_memberships (agency_id)
  where role = 'owner' and status = 'active';
-- Note: this index enforces at most one active owner per agency. It does NOT
-- prevent zero active owners. If the sole owner is suspended or removed, the
-- agency has no owner until reassigned. Phase 2 should add a controlled
-- ownership-transfer RPC to guard against this.

create index if not exists agency_memberships_agency_idx
  on public.agency_memberships (agency_id);

create index if not exists agency_memberships_user_idx
  on public.agency_memberships (agency_user_id);

create index if not exists agency_memberships_role_status_idx
  on public.agency_memberships (role, status);

comment on table public.agency_memberships is
  'Tenant authorization join for arei-broker. Role is owner, manager, agent, or viewer.';

comment on column public.agency_memberships.can_publish_directly is
  'Prepared V0 capability flag. Brokers still cannot publish into the public market index until AREI Admin policy allows it.';

drop trigger if exists trg_agency_memberships_updated_at on public.agency_memberships;
create trigger trg_agency_memberships_updated_at
  before update on public.agency_memberships
  for each row
  execute function public.set_updated_at();

alter table public.agency_memberships enable row level security;

-- ── Agency invitations ────────────────────────────────────────────────────

create table if not exists public.agency_invitations (
  id                         uuid        primary key default gen_random_uuid(),
  agency_id                  uuid        not null references public.agencies(id) on delete cascade,
  email                      text        not null,
  role                       text        not null
                                               check (role in ('owner', 'manager', 'agent', 'viewer')),
  status                     text        not null default 'pending'
                                               check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token_hash                 text,
  invited_by_agency_user_id  uuid        references public.agency_users(id) on delete set null,
  invited_by_admin_user_id   uuid        references public.admin_users(id) on delete set null,
  accepted_by_agency_user_id uuid        references public.agency_users(id) on delete set null,
  expires_at                 timestamptz not null default (now() + interval '14 days'),
  accepted_at                timestamptz,
  revoked_at                 timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create unique index if not exists agency_invitations_one_pending_email_idx
  on public.agency_invitations (agency_id, lower(email))
  where status = 'pending';

create index if not exists agency_invitations_agency_idx
  on public.agency_invitations (agency_id);

create index if not exists agency_invitations_email_idx
  on public.agency_invitations (lower(email));

create index if not exists agency_invitations_status_idx
  on public.agency_invitations (status);

create index if not exists agency_invitations_expires_idx
  on public.agency_invitations (expires_at);

comment on table public.agency_invitations is
  'Pending broker team invitations. Acceptance should resolve to agency_users + agency_memberships through a controlled app/RPC flow.';

drop trigger if exists trg_agency_invitations_updated_at on public.agency_invitations;
create trigger trg_agency_invitations_updated_at
  before update on public.agency_invitations
  for each row
  execute function public.set_updated_at();

alter table public.agency_invitations enable row level security;

-- ── Current V0 broker table foundation columns ────────────────────────────

alter table public.broker_pilot_listings
  add column if not exists created_by_agency_user_id uuid references public.agency_users(id) on delete set null,
  add column if not exists assigned_agent_id uuid references public.agency_users(id) on delete set null;

create index if not exists broker_pilot_listings_created_by_user_idx
  on public.broker_pilot_listings (created_by_agency_user_id);

create index if not exists broker_pilot_listings_assigned_agent_idx
  on public.broker_pilot_listings (assigned_agent_id);

comment on column public.broker_pilot_listings.created_by_agency_user_id is
  'Nullable Phase 1 tenant foundation field. broker_pilot_listings is still a V0/prototype table and should become agency_listings or equivalent before production.';

comment on column public.broker_pilot_listings.assigned_agent_id is
  'Nullable Phase 1 role foundation field for future agent ownership/assignment policies.';

alter table public.leads
  add column if not exists assigned_agent_id uuid references public.agency_users(id) on delete set null;

create index if not exists leads_assigned_agent_idx
  on public.leads (assigned_agent_id);

comment on column public.leads.assigned_agent_id is
  'Nullable Phase 1 role foundation field. Owner/Manager can see all agency leads; Agents can later be limited to assigned leads unless agents_can_see_all_leads is true.';

commit;
