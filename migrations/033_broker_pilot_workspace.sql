-- Migration: broker_pilot_workspace
--
-- Adds the minimal data layer for the Broker Pilot Workspace: a demo-ready
-- surface for broker meetings that demonstrates the full listing intake and
-- quality loop without requiring broker auth.
--
-- Design intent:
--   The agencies table (031) already holds the broker-safe agency profile.
--   We add `contact_person` to it since the pilot demo needs a named contact.
--
--   broker_pilot_listings is a first-class listing table, NOT a correction
--   submission (those live in agency_listing_submissions). It represents a
--   net-new listing submitted by an agency for publication on AREI.
--
--   Key distinctions:
--   - agency_listing_submissions: corrections to existing pipeline listings
--   - broker_pilot_listings: entirely new listings from an agency, with their
--     own lifecycle (draft → ready_for_review → published → rejected)
--
--   reviewer_notes is admin-only and must never appear in any broker-facing
--   render of this table.
--
-- See docs/03-product/broker-pilot-workspace-v0.md

-- ============================================================
-- ADD contact_person to agencies
-- (safe to run on an existing table with IF NOT EXISTS guard)
-- ============================================================

alter table agencies
  add column if not exists contact_person text;

-- ============================================================
-- TABLE: broker_pilot_listings
-- ============================================================

create table if not exists broker_pilot_listings (
  id               uuid         not null default gen_random_uuid() primary key,
  agency_id        uuid         not null references agencies(id) on delete cascade,
  market_code      text         not null default 'cv',

  -- Core listing fields
  title            text         not null,
  price            numeric,
  currency         text         not null default 'EUR',
  property_type    text,
  island           text,
  city             text,
  bedrooms         integer,
  bathrooms        integer,
  property_size_sqm numeric,
  description      text,
  image_urls       text[]       not null default '{}',
  source_url       text,

  -- Per-listing contact override (falls back to agency contact if null)
  contact_name     text,
  contact_email    text,
  contact_phone    text,

  -- Publish lifecycle
  -- draft            — created, not yet ready for AREI to review
  -- ready_for_review — broker considers it complete; awaiting AREI review
  -- published        — AREI approved and it can appear on public surface
  -- rejected         — AREI rejected; reviewer_notes explains why
  publish_status   text         not null default 'draft'
                     check (publish_status in (
                       'draft', 'ready_for_review', 'published', 'rejected'
                     )),

  -- Admin-only fields. NEVER render in broker-facing view.
  reviewer_notes   text,
  reviewed_by      text,
  reviewed_at      timestamptz,

  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

create index if not exists broker_pilot_listings_agency_idx  on broker_pilot_listings (agency_id);
create index if not exists broker_pilot_listings_status_idx  on broker_pilot_listings (publish_status);
create index if not exists broker_pilot_listings_market_idx  on broker_pilot_listings (market_code);
create index if not exists broker_pilot_listings_created_idx on broker_pilot_listings (created_at desc);

-- RLS: anon SELECT/INSERT/UPDATE (admin SPA anon-client pattern).
-- When broker auth is added:
--   - Grant broker role SELECT only where agency_id = their agency
--   - Grant broker role INSERT/UPDATE only for their own agency
--   - NEVER grant broker role access to reviewer_notes, reviewed_by, reviewed_at
--     (use a dedicated view or column-level grants)
--   - Only AREI admins can set publish_status = 'published'

alter table broker_pilot_listings enable row level security;

drop policy if exists "anon read broker_pilot_listings" on broker_pilot_listings;
create policy "anon read broker_pilot_listings"
  on broker_pilot_listings for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert broker_pilot_listings" on broker_pilot_listings;
create policy "anon insert broker_pilot_listings"
  on broker_pilot_listings for insert
  to anon
  with check (true);

drop policy if exists "anon update broker_pilot_listings" on broker_pilot_listings;
create policy "anon update broker_pilot_listings"
  on broker_pilot_listings for update
  to anon
  using (true)
  with check (true);
