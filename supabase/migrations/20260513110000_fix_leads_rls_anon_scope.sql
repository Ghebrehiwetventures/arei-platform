-- ============================================================
-- Migration 035: Fix leads RLS policy role scope
-- ============================================================
-- REASON: Migration 034 created three RLS policies on the leads
-- table without an explicit role clause. Without `to anon` /
-- `to anon, authenticated`, PostgreSQL applies the policy to all
-- roles by default, including service_role. This migration drops
-- and recreates the three policies with explicit role scoping to
-- match the established convention in migrations 031–033.
--
-- Safe to re-run: DROP POLICY IF EXISTS + CREATE POLICY.
-- ============================================================

drop policy if exists "anon_select_leads" on leads;
drop policy if exists "anon_insert_leads" on leads;
drop policy if exists "anon_update_leads" on leads;

-- V0: anon + authenticated read (broker SPA uses anon key; authenticated
-- users (e.g. future logged-in brokers) should also be able to read).
-- V1: replace with scoped policies per agency_id.
create policy "anon_select_leads" on leads
  for select
  to anon, authenticated
  using (true);

-- Insert and update scoped to anon only.
-- V1: restrict to broker jwt with agency_id claim.
create policy "anon_insert_leads" on leads
  for insert
  to anon
  with check (true);

create policy "anon_update_leads" on leads
  for update
  to anon
  using (true);

-- No DELETE policy — use status = 'lost' or 'closed' to retire leads.
