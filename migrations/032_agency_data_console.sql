-- Migration: agency_data_console
--
-- Adds the broker contribution / data acquisition layer to the Agency Console.
--
-- Context:
--   031_agency_console.sql established agency profiles (broker-safe) and
--   internal relationship CRM (admin-only). That is a relationship tracker.
--   This migration adds the *data acquisition product*: the mechanism through
--   which agencies connect to listings, submit corrections, and improve data
--   quality over time.
--
-- Three new tables:
--
--   agency_listing_links         — connects agencies to their listings/sources
--   agency_listing_submissions   — broker-submitted corrections or new listings
--                                  (never directly updates canonical listings)
--   listing_data_issues          — per-listing detected quality problems
--   agency_data_quality_snapshots — agency-level quality metrics over time
--
-- Security model:
--   V0: anon SELECT/INSERT/UPDATE (admin SPA uses anon client — same pattern
--   as content_drafts/agencies). No DELETE policies.
--
--   Future broker layer: when broker auth is added:
--     - Agency users should SELECT only rows where agency_id = their agency
--     - Agency users may INSERT submissions for their own agency
--     - Agency users CANNOT directly update agency_listing_links (AREI controls links)
--     - Only AREI admins (authenticated + admin_users check) can approve/reject submissions
--     - Canonical listings table is NEVER writable by broker role
--
-- See docs/03-product/agency-data-console-v0.md for full product context.

-- ============================================================
-- TABLE: agency_listing_links
-- Connects an agency to a listing or source.
-- ============================================================

create table if not exists agency_listing_links (
  id                    uuid         not null default gen_random_uuid() primary key,
  agency_id             uuid         not null references agencies(id) on delete cascade,
  -- listing_id is nullable: a link may be to a known source before a specific
  -- listing is identified (e.g. "cv_solprop owns cv_solprop source")
  listing_id            text,        -- FK to public.listings.id (text PK)
  source_id             text,        -- matches source_id in public.listings
  external_listing_id   text,        -- agency's own reference ID, if known
  relationship_type     text         not null default 'source_owner'
                          check (relationship_type in (
                            'source_owner', -- agency owns/operates this source
                            'claimed',       -- agency claims this listing is theirs
                            'submitted',     -- agency submitted this listing to AREI
                            'verified'       -- agency has verified this listing's data
                          )),
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

-- One link per (agency, source) combination for source-level links
create unique index if not exists agency_listing_links_agency_source_idx
  on agency_listing_links (agency_id, source_id)
  where source_id is not null and listing_id is null;

-- One link per (agency, listing) combination for listing-level links
create unique index if not exists agency_listing_links_agency_listing_idx
  on agency_listing_links (agency_id, listing_id)
  where listing_id is not null;

create index if not exists agency_listing_links_agency_idx  on agency_listing_links (agency_id);
create index if not exists agency_listing_links_source_idx  on agency_listing_links (source_id);
create index if not exists agency_listing_links_listing_idx on agency_listing_links (listing_id);

alter table agency_listing_links enable row level security;

drop policy if exists "anon read agency_listing_links" on agency_listing_links;
create policy "anon read agency_listing_links"
  on agency_listing_links for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert agency_listing_links" on agency_listing_links;
create policy "anon insert agency_listing_links"
  on agency_listing_links for insert
  to anon
  with check (true);

drop policy if exists "anon update agency_listing_links" on agency_listing_links;
create policy "anon update agency_listing_links"
  on agency_listing_links for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- TABLE: agency_listing_submissions
-- Broker-submitted proposed changes or new listings.
-- NEVER directly overwrites public.listings.
-- All submissions are reviewed by AREI before affecting canonical data.
-- ============================================================

create table if not exists agency_listing_submissions (
  id                    uuid         not null default gen_random_uuid() primary key,
  agency_id             uuid         not null references agencies(id) on delete cascade,
  -- listing_id: the listing being updated. Null for new_listing submissions.
  listing_id            text,
  submission_type       text         not null
                          check (submission_type in (
                            'new_listing',        -- agency submits an entirely new listing
                            'update_existing',    -- agency proposes corrections to existing fields
                            'availability_update', -- change availability status (sold, rented, etc.)
                            'duplicate_report',   -- agency flags this as a duplicate
                            'removal_request'     -- agency requests the listing be removed
                          )),
  status                text         not null default 'draft'
                          check (status in (
                            'draft',             -- created but not submitted yet
                            'submitted',         -- awaiting AREI review
                            'under_review',      -- AREI admin is actively reviewing
                            'approved',          -- AREI approved — changes may be applied
                            'rejected',          -- AREI rejected the submission
                            'needs_more_info'    -- AREI needs clarification before deciding
                          )),
  -- payload: the proposed changes or new listing fields as JSON.
  -- For update_existing: only include the fields being changed.
  -- For new_listing: full listing shape.
  -- For availability_update: { availability_status: "sold" | "available" | ... }
  -- See docs/03-product/agency-data-console-v0.md for payload schema conventions.
  payload               jsonb        not null default '{}',
  -- reviewer_notes: AREI admin notes on this submission. Never shown to agencies.
  reviewer_notes        text,
  submitted_at          timestamptz,
  reviewed_at           timestamptz,
  reviewed_by           text,        -- AREI admin email/name
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

create index if not exists agency_submissions_agency_idx    on agency_listing_submissions (agency_id);
create index if not exists agency_submissions_listing_idx   on agency_listing_submissions (listing_id);
create index if not exists agency_submissions_status_idx    on agency_listing_submissions (status);
create index if not exists agency_submissions_type_idx      on agency_listing_submissions (submission_type);
create index if not exists agency_submissions_submitted_idx on agency_listing_submissions (submitted_at desc nulls last);

alter table agency_listing_submissions enable row level security;

drop policy if exists "anon read agency_listing_submissions" on agency_listing_submissions;
create policy "anon read agency_listing_submissions"
  on agency_listing_submissions for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert agency_listing_submissions" on agency_listing_submissions;
create policy "anon insert agency_listing_submissions"
  on agency_listing_submissions for insert
  to anon
  with check (true);

drop policy if exists "anon update agency_listing_submissions" on agency_listing_submissions;
create policy "anon update agency_listing_submissions"
  on agency_listing_submissions for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- TABLE: listing_data_issues
-- Detected quality problems for a specific listing.
-- Can be populated by scheduled scan jobs or detected client-side.
-- ============================================================

create table if not exists listing_data_issues (
  id                    uuid         not null default gen_random_uuid() primary key,
  listing_id            text         not null,
  agency_id             uuid         references agencies(id) on delete set null,
  source_id             text,
  issue_type            text         not null
                          check (issue_type in (
                            'missing_price',
                            'missing_sqm',
                            'missing_bedrooms',
                            'missing_bathrooms',
                            'missing_location',
                            'missing_photos',
                            'weak_description',
                            'stale_listing',
                            'possible_duplicate',
                            'broken_image',
                            'suspicious_price'
                          )),
  severity              text         not null default 'medium'
                          check (severity in ('low', 'medium', 'high')),
  status                text         not null default 'open'
                          check (status in (
                            'open',
                            'fixed',
                            'ignored',
                            'submitted_for_review'
                          )),
  detected_at           timestamptz  not null default now(),
  resolved_at           timestamptz,
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now(),
  -- One open issue per (listing, issue_type)
  unique (listing_id, issue_type, status)
);

create index if not exists listing_data_issues_listing_idx  on listing_data_issues (listing_id);
create index if not exists listing_data_issues_agency_idx   on listing_data_issues (agency_id);
create index if not exists listing_data_issues_source_idx   on listing_data_issues (source_id);
create index if not exists listing_data_issues_status_idx   on listing_data_issues (status);
create index if not exists listing_data_issues_severity_idx on listing_data_issues (severity);

alter table listing_data_issues enable row level security;

drop policy if exists "anon read listing_data_issues" on listing_data_issues;
create policy "anon read listing_data_issues"
  on listing_data_issues for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert listing_data_issues" on listing_data_issues;
create policy "anon insert listing_data_issues"
  on listing_data_issues for insert
  to anon
  with check (true);

drop policy if exists "anon update listing_data_issues" on listing_data_issues;
create policy "anon update listing_data_issues"
  on listing_data_issues for update
  to anon
  using (true)
  with check (true);

-- ============================================================
-- TABLE: agency_data_quality_snapshots
-- Agency-level quality aggregates, one row per agency per day.
-- V0: computed client-side on page load and written here.
-- Future: move to a scheduled GitHub Action (like source_health_snapshots).
-- ============================================================

create table if not exists agency_data_quality_snapshots (
  id                    uuid         not null default gen_random_uuid() primary key,
  agency_id             uuid         not null references agencies(id) on delete cascade,
  market_code           text         not null default 'cv',
  snapshot_date         date         not null default current_date,
  listing_count         integer      not null default 0,
  missing_price_count   integer      not null default 0,
  missing_sqm_count     integer      not null default 0,
  missing_photo_count   integer      not null default 0,
  missing_beds_count    integer      not null default 0,
  missing_baths_count   integer      not null default 0,
  stale_listing_count   integer      not null default 0,
  open_issues_count     integer      not null default 0,
  open_submissions_count integer     not null default 0,
  average_quality_score numeric(5,1) not null default 0,
  created_at            timestamptz  not null default now(),
  -- One snapshot per agency per day (upsertable)
  unique (agency_id, snapshot_date)
);

create index if not exists agency_quality_snapshots_agency_date_idx
  on agency_data_quality_snapshots (agency_id, snapshot_date desc);

alter table agency_data_quality_snapshots enable row level security;

drop policy if exists "anon read agency_data_quality_snapshots" on agency_data_quality_snapshots;
create policy "anon read agency_data_quality_snapshots"
  on agency_data_quality_snapshots for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert agency_data_quality_snapshots" on agency_data_quality_snapshots;
create policy "anon insert agency_data_quality_snapshots"
  on agency_data_quality_snapshots for insert
  to anon
  with check (true);

drop policy if exists "anon update agency_data_quality_snapshots" on agency_data_quality_snapshots;
create policy "anon update agency_data_quality_snapshots"
  on agency_data_quality_snapshots for update
  to anon
  using (true)
  with check (true);
