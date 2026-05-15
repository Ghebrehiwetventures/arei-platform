-- ============================================================
-- Migration 039: Broker Private Data RLS Prepare
-- ============================================================
-- Purpose:
--   Add authenticated, membership-scoped RLS helpers and policies for
--   arei-broker private data while keeping current anon demo policies in
--   place for Phase 1 compatibility.
--
-- Important:
--   This migration DOES NOT remove existing anon demo policies on agencies,
--   broker_pilot_listings, leads, or admin-console tables. Those policies are
--   intentionally left in place until Phase 2 moves the broker app to
--   authenticated membership context.
--
--   Public market data remains unchanged. broker.market_listings_view stays
--   public/read-only.
-- ============================================================

begin;

-- ── Helper functions ──────────────────────────────────────────────────────
-- SECURITY DEFINER functions avoid recursive RLS checks when policies need to
-- inspect agency_users/agency_memberships. Keep search_path fixed.

create or replace function public.current_agency_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select au.id
  from public.agency_users au
  where au.auth_user_id = auth.uid()
    and au.status = 'active'
  limit 1
$$;

create or replace function public.current_user_agency_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select am.agency_id
  from public.agency_memberships am
  join public.agency_users au on au.id = am.agency_user_id
  where au.auth_user_id = auth.uid()
    and au.status = 'active'
    and am.status = 'active'
$$;

create or replace function public.is_agency_member(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships am
    join public.agency_users au on au.id = am.agency_user_id
    where au.auth_user_id = auth.uid()
      and au.status = 'active'
      and am.status = 'active'
      and am.agency_id = target_agency_id
  )
$$;

create or replace function public.has_agency_role(target_agency_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships am
    join public.agency_users au on au.id = am.agency_user_id
    where au.auth_user_id = auth.uid()
      and au.status = 'active'
      and am.status = 'active'
      and am.agency_id = target_agency_id
      and am.role = any(allowed_roles)
  )
$$;

create or replace function public.is_agency_owner_or_manager(target_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_agency_role(target_agency_id, array['owner', 'manager'])
$$;

create or replace function public.can_access_lead(target_agency_id uuid, assigned_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_memberships am
    join public.agency_users au on au.id = am.agency_user_id
    left join public.agencies a on a.id = am.agency_id
    where au.auth_user_id = auth.uid()
      and au.status = 'active'
      and am.status = 'active'
      and am.agency_id = target_agency_id
      and (
        am.role in ('owner', 'manager', 'viewer')
        or (
          am.role = 'agent'
          and (
            a.agents_can_see_all_leads = true
            or assigned_user_id = au.id
          )
        )
      )
  )
$$;

comment on function public.current_agency_user_id() is
  'Returns the active agency_users.id for auth.uid(), used by broker RLS policies.';

comment on function public.current_user_agency_ids() is
  'Returns active agency IDs for auth.uid(), used by broker RLS policies.';

comment on function public.is_agency_member(uuid) is
  'True when auth.uid() maps to an active membership for the target agency.';

comment on function public.has_agency_role(uuid, text[]) is
  'True when auth.uid() has one of the allowed active roles in the target agency.';

comment on function public.is_agency_owner_or_manager(uuid) is
  'Convenience wrapper for owner/manager broker permissions.';

comment on function public.can_access_lead(uuid, uuid) is
  'Broker lead read helper: Owner/Manager/Viewer can read agency leads; Agents read assigned leads, or all agency leads only if the agency flag allows it. Viewer role is intentionally included in the full-read group — viewers have read-only access to all agency leads without assignment restrictions.';

-- ── agency_users policies ─────────────────────────────────────────────────

drop policy if exists "broker users read self and agency peers" on public.agency_users;
create policy "broker users read self and agency peers"
  on public.agency_users for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.agency_memberships target_membership
      where target_membership.agency_user_id = agency_users.id
        and target_membership.status = 'active'
        and public.is_agency_member(target_membership.agency_id)
    )
  );

drop policy if exists "broker users update self profile" on public.agency_users;
-- INSERT/UPDATE are intentionally deferred to controlled RPC/admin flows.
-- RLS is row-level, not column-level; raw self-update would allow browser
-- clients to mutate status, email, phone, or other identity fields directly.

-- ── agency_memberships policies ───────────────────────────────────────────

drop policy if exists "broker members read own agency memberships" on public.agency_memberships;
create policy "broker members read own agency memberships"
  on public.agency_memberships for select
  to authenticated
  using (public.is_agency_member(agency_id));

drop policy if exists "broker owners manage agency memberships" on public.agency_memberships;
drop policy if exists "broker managers manage agent viewer memberships" on public.agency_memberships;
-- INSERT/UPDATE/DELETE are intentionally deferred to controlled RPC/admin
-- flows. RLS is row-level, not column-level; raw browser UPDATE policies would
-- allow unsafe changes to role, status, agency_user_id, or capability flags.

-- ── agency_invitations policies ───────────────────────────────────────────

drop policy if exists "broker owner manager read agency invitations" on public.agency_invitations;

drop policy if exists "broker owners create agency invitations" on public.agency_invitations;
drop policy if exists "broker managers create agent viewer invitations" on public.agency_invitations;
drop policy if exists "broker owners update agency invitations" on public.agency_invitations;
drop policy if exists "broker managers update agent viewer invitations" on public.agency_invitations;
-- Raw broker-facing SELECT is intentionally not granted on agency_invitations
-- because the table stores token_hash. Phase 2 should expose invitations
-- through a broker-safe view/RPC that excludes token_hash.
--
-- INSERT/UPDATE/DELETE are intentionally deferred to controlled RPC/admin
-- flows for invite creation, accept/revoke/resend behavior, and token_hash
-- generation so browser clients cannot mutate token fields directly.

-- ── agencies prepared authenticated policies ──────────────────────────────
-- Existing "anon read/insert/update agencies" policies remain in place for
-- the Phase 1 demo. Phase 2 should remove broad anon access for private
-- broker workflows and route public agency reads through broker-safe views.

drop policy if exists "broker members read own agency" on public.agencies;
create policy "broker members read own agency"
  on public.agencies for select
  to authenticated
  using (public.is_agency_member(id));

drop policy if exists "broker owner manager update own agency" on public.agencies;
-- Raw broker-facing UPDATE is intentionally not granted on agencies because
-- the current table also contains fields such as source_ids, claimed_status,
-- and data_partner_status. Phase 2 should add a broker-safe RPC or view limited
-- to public profile/contact fields.

comment on policy "anon read agencies" on public.agencies is
  'TEMPORARY Phase 1 demo policy. Remove or replace with broker-safe public views during Phase 2 RLS cutover.';

comment on policy "anon insert agencies" on public.agencies is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 once authenticated onboarding/admin flows exist.';

comment on policy "anon update agencies" on public.agencies is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 once authenticated membership/admin flows exist.';

-- ── broker_pilot_listings prepared authenticated policies ─────────────────
-- Existing anon demo policies remain until Phase 2. broker_pilot_listings is
-- still a V0/prototype table and should become agency_listings or equivalent
-- before production.

drop policy if exists "broker members read own broker pilot listings" on public.broker_pilot_listings;
create policy "broker members read own broker pilot listings"
  on public.broker_pilot_listings for select
  to authenticated
  using (public.is_agency_member(agency_id));

drop policy if exists "broker owner manager insert broker pilot listings" on public.broker_pilot_listings;
drop policy if exists "broker agent insert own broker pilot listings" on public.broker_pilot_listings;
drop policy if exists "broker owner manager update broker pilot listings" on public.broker_pilot_listings;
drop policy if exists "broker agent update assigned broker pilot listings" on public.broker_pilot_listings;
-- INSERT/UPDATE are intentionally deferred for Phase 1. The current
-- broker_pilot_listings table is still a V0/prototype table, and same-agency
-- assignment plus publish-status transitions should be enforced through the
-- Phase 2 authenticated app/RPC cutover or the future agency_listings table.

comment on policy "anon read broker_pilot_listings" on public.broker_pilot_listings is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

comment on policy "anon insert broker_pilot_listings" on public.broker_pilot_listings is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

comment on policy "anon update broker_pilot_listings" on public.broker_pilot_listings is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

-- ── leads prepared authenticated policies ─────────────────────────────────
-- Existing anon demo policies remain until Phase 2.

drop policy if exists "broker members read own leads" on public.leads;
create policy "broker members read own leads"
  on public.leads for select
  to authenticated
  using (public.can_access_lead(agency_id, assigned_agent_id));

drop policy if exists "broker owner manager insert leads" on public.leads;
drop policy if exists "broker agent insert assigned leads" on public.leads;
drop policy if exists "broker owner manager update leads" on public.leads;
drop policy if exists "broker agent update assigned leads" on public.leads;
-- INSERT/UPDATE are intentionally deferred for Phase 1. Phase 2 should add
-- controlled lead creation/update paths that enforce same-agency assignment
-- and avoid raw browser mutation of broker-owned lead contact data.

comment on policy "anon_select_leads" on public.leads is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

comment on policy "anon_insert_leads" on public.leads is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

comment on policy "anon_update_leads" on public.leads is
  'TEMPORARY Phase 1 demo policy. Remove during Phase 2 RLS cutover.';

commit;
