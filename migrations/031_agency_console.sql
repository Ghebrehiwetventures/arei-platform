-- Migration: agency_console
--
-- Establishes the two-layer data model for the Agency Console product:
--
--   public.agencies            — broker-facing profile data. Safe to eventually
--                                expose to agency users via a future auth layer.
--
--   public.agency_relationships — internal AREI relationship management.
--                                 MUST NEVER be exposed to broker-facing APIs or
--                                 views. Internal notes, lead quality, and outreach
--                                 status live here.
--
-- Design notes:
--   - RLS follows the existing admin-client pattern (anon key, no session).
--     Anon SELECT/INSERT/UPDATE is enabled so the admin SPA can do full CRUD
--     via the standard data client. No DELETE policies — soft deletions are
--     preferred.
--   - When a broker-facing layer is built, create a view or separate RLS
--     policy that exposes ONLY public.agencies columns (never joining
--     agency_relationships). See docs/03-product/agency-console-v0.md.
--   - updated_at is managed by the application layer (same pattern as
--     content_drafts) — set explicitly on every INSERT/UPDATE call.
--   - Enums use CHECK constraints for portability (no native ENUM types).

-- ============================================================
-- TABLE: agencies
-- ============================================================

create table if not exists agencies (
  id                    uuid         not null default gen_random_uuid() primary key,
  market_code           text         not null default 'cv',
  agency_name           text         not null,
  public_display_name   text,
  website               text,
  email                 text,
  phone                 text,
  whatsapp              text,
  logo_url              text,
  description           text,
  -- source_ids: array of source IDs from the pipeline that belong to this agency
  source_ids            text[]       not null default '{}',
  claimed_status        text         not null default 'unclaimed'
                          check (claimed_status in ('unclaimed','invited','claimed','verified')),
  data_partner_status   text         not null default 'none'
                          check (data_partner_status in ('none','interested','active','paused')),
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

-- Indexes for common filter/search patterns in the Agency Console
create index if not exists agencies_market_code_idx         on agencies (market_code);
create index if not exists agencies_claimed_status_idx      on agencies (claimed_status);
create index if not exists agencies_data_partner_status_idx on agencies (data_partner_status);

-- RLS: anon SELECT/INSERT/UPDATE (admin SPA uses anon client — same pattern
-- as content_drafts). No DELETE policy — use claimed_status/data_partner_status
-- to retire records.
alter table agencies enable row level security;

drop policy if exists "anon read agencies" on agencies;
create policy "anon read agencies"
  on agencies for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert agencies" on agencies;
create policy "anon insert agencies"
  on agencies for insert
  to anon
  with check (true);

drop policy if exists "anon update agencies" on agencies;
create policy "anon update agencies"
  on agencies for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- TABLE: agency_relationships
-- ============================================================
-- INTERNAL-ONLY. Contains outreach tracking, lead scoring, and
-- internal_notes. Never expose to broker-facing APIs or views.

create table if not exists agency_relationships (
  id                    uuid         not null default gen_random_uuid() primary key,
  agency_id             uuid         not null references agencies(id) on delete cascade,
  relationship_status   text         not null default 'not_contacted'
                          check (relationship_status in (
                            'not_contacted','contacted','replied',
                            'meeting_booked','onboarded','rejected','dormant'
                          )),
  priority              text         not null default 'medium'
                          check (priority in ('high','medium','low')),
  lead_quality          text         not null default 'unknown'
                          check (lead_quality in ('unknown','strong','average','weak')),
  relationship_owner    text,
  last_contacted_at     timestamptz,
  next_follow_up_at     timestamptz,
  -- internal_notes: NEVER expose to broker-facing surfaces
  internal_notes        text,
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now(),
  -- One relationship record per agency (can be upserted on agency_id)
  unique (agency_id)
);

-- Indexes for CRM filter/sort patterns
create index if not exists agency_relationships_status_idx      on agency_relationships (relationship_status);
create index if not exists agency_relationships_priority_idx    on agency_relationships (priority);
create index if not exists agency_relationships_followup_idx    on agency_relationships (next_follow_up_at asc nulls last);

-- RLS: anon SELECT/INSERT/UPDATE (admin SPA pattern — admin auth gate
-- protects the app layer). No DELETE policy.
-- IMPORTANT: if a broker-facing auth surface is added, ensure NO policy
-- ever grants broker roles access to this table or any view derived from it.
alter table agency_relationships enable row level security;

drop policy if exists "anon read agency_relationships" on agency_relationships;
create policy "anon read agency_relationships"
  on agency_relationships for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert agency_relationships" on agency_relationships;
create policy "anon insert agency_relationships"
  on agency_relationships for insert
  to anon
  with check (true);

drop policy if exists "anon update agency_relationships" on agency_relationships;
create policy "anon update agency_relationships"
  on agency_relationships for update
  to anon
  using (true)
  with check (true);
