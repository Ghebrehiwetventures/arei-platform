-- Migration 038: require authenticated admin context for content_drafts
-- Date: 2026-05-15
--
-- Resolves audit finding: content_drafts was publicly mutable through the anon
-- key. Earlier migrations kept anon SELECT/INSERT/UPDATE so the browser admin
-- could persist draft approvals without an authenticated write path.
--
-- Current admin now has Supabase Auth plus public.admin_users. This migration
-- removes anon access and allows only authenticated users with a matching
-- admin_users row to read, insert, or update content drafts. No DELETE grant or
-- policy is created.

begin;

alter table if exists public.content_drafts enable row level security;

drop policy if exists content_drafts_select_all on public.content_drafts;
drop policy if exists content_drafts_insert_all on public.content_drafts;
drop policy if exists content_drafts_update_all on public.content_drafts;
drop policy if exists content_drafts_select_anon on public.content_drafts;
drop policy if exists content_drafts_insert_anon on public.content_drafts;
drop policy if exists content_drafts_update_anon on public.content_drafts;
drop policy if exists content_drafts_admin_select on public.content_drafts;
drop policy if exists content_drafts_admin_insert on public.content_drafts;
drop policy if exists content_drafts_admin_update on public.content_drafts;

revoke select, insert, update, delete on public.content_drafts from anon;
revoke delete on public.content_drafts from authenticated;

grant select, insert, update on public.content_drafts to authenticated;

create policy content_drafts_admin_select
  on public.content_drafts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy content_drafts_admin_insert
  on public.content_drafts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

create policy content_drafts_admin_update
  on public.content_drafts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.user_id = auth.uid()
    )
  );

comment on table public.content_drafts is
  'Human-gated admin content draft queue. Browser access requires Supabase Auth plus public.admin_users membership; anon has no access.';

commit;
