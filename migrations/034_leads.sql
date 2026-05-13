-- Migration: leads
--
-- Adds the leads table for the Listo by AREI broker workspace (arei-broker).
--
-- Design intent:
--   Leads are buyer enquiries linked to a listing and an agency. They belong
--   entirely to the agency — lead contact details (name, phone, email) are
--   broker-owned data and must never be indexed, aggregated, or exposed in
--   AREI's public data layer.
--
--   The 'source' field tracks how the lead arrived:
--     'form'      — submitted through a Listo listing or agency page form
--     'whatsapp'  — WhatsApp CTA click recorded (webhook/manual)
--     'manual'    — broker manually entered the lead
--     'email'     — email enquiry imported manually
--
--   Status lifecycle:
--     new → contacted → viewing_booked → negotiating → lost | closed
--
--   RLS note (V1):
--     When broker auth is added, SELECT/INSERT/UPDATE must be restricted to
--     leads where agency_id matches the authenticated broker's linked agency.
--     AREI admin must not be able to SELECT buyer_name, buyer_phone,
--     buyer_email, or buyer_whatsapp — those columns are broker-only.
--     In V0 this is protected by the admin auth gate only.
--
-- See docs/03-product/listo-by-arei-product-brief.md

-- ============================================================
-- LEADS TABLE
-- ============================================================

create table if not exists leads (
  id                uuid        primary key default gen_random_uuid(),
  agency_id         uuid        not null references agencies(id) on delete cascade,

  -- The listing this enquiry is about (optional — some leads are general)
  listing_id        uuid        references broker_pilot_listings(id) on delete set null,

  -- Buyer contact — broker-owned, never indexed
  buyer_name        text,
  buyer_phone       text,
  buyer_email       text,
  buyer_whatsapp    text,

  -- What the buyer wrote
  message           text,

  -- How the lead arrived
  source            text        not null default 'manual'
                    check (source in ('form', 'whatsapp', 'manual', 'email')),

  -- Lead status
  status            text        not null default 'new'
                    check (status in (
                      'new',
                      'contacted',
                      'viewing_booked',
                      'negotiating',
                      'lost',
                      'closed'
                    )),

  -- Broker follow-up
  follow_up_date    date,
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────

create index if not exists leads_agency_id_idx       on leads (agency_id);
create index if not exists leads_listing_id_idx      on leads (listing_id);
create index if not exists leads_status_idx          on leads (status);
create index if not exists leads_follow_up_date_idx  on leads (follow_up_date asc nulls last);
create index if not exists leads_created_at_idx      on leads (created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- V0: anon client used by the admin SPA (same as all other tables in V0).
-- V1: restrict to broker role scoped to agency_id; revoke anon SELECT.

alter table leads enable row level security;

-- Allow anon SELECT, INSERT, UPDATE for V0 admin-operated demo.
-- Replace with scoped broker policies in V1.
create policy "anon_select_leads" on leads
  for select using (true);

create policy "anon_insert_leads" on leads
  for insert with check (true);

create policy "anon_update_leads" on leads
  for update using (true);

-- No anon DELETE — use status = 'lost' or 'closed' to retire leads.

comment on table leads is
  'Buyer lead inbox for the Listo broker workspace. '
  'Contact fields (buyer_name, buyer_phone, buyer_email, buyer_whatsapp) '
  'are broker-owned data — must not be indexed, aggregated, or exposed in '
  'AREI public surfaces or shared with any third party.';
