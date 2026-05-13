-- ============================================================
-- Migration 036: Admin Notification Center
-- ============================================================
-- Generic admin_notifications table for all AREI system events.
-- Not specific to any single domain. Event types use dot-notation:
--   market_news.*   ingestion runs, source errors
--   source_health.* grade drops, new sources added
--   ingestion.*     cross-market pipeline failures
--   listing.*       quality warnings, bulk status changes
--   broker.*        new leads, agency registrations
--   system.*        general platform / script errors
-- See scripts/lib/notifications.ts for the insertion helper and
-- the authoritative list of known event types.
--
-- Security model:
--   INSERT  — service role only (scripts). Never from the browser.
--   SELECT  — authenticated (admin users) only. No anon access.
--   UPDATE  — authenticated only (marking read_at). App layer
--             enforces that only read_at is updated.
--   DELETE  — not permitted. Soft state via read_at.
--
-- Safe to re-run: uses IF NOT EXISTS / CREATE IF NOT EXISTS guards.
-- ============================================================

create table if not exists admin_notifications (
  id           uuid        primary key default gen_random_uuid(),
  event_type   text        not null,
  severity     text        not null default 'info'
               check (severity in ('info', 'warning', 'critical')),
  title        text        not null,
  body         text,
  entity_type  text,
  entity_id    text,
  meta         jsonb       not null default '{}',
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Unread-count query: reads only unread rows
create index if not exists admin_notifications_unread_idx
  on admin_notifications (created_at desc)
  where read_at is null;

-- Full list query (most recent first)
create index if not exists admin_notifications_created_at_idx
  on admin_notifications (created_at desc);

-- Filter by event type for future digest queries
create index if not exists admin_notifications_event_type_idx
  on admin_notifications (event_type);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table admin_notifications enable row level security;

-- Authenticated admin users can read all notifications.
-- Anon role has no access (no policy = implicit deny).
create policy "authenticated_select_notifications"
  on admin_notifications
  for select
  to authenticated
  using (true);

-- Authenticated admin users can mark notifications read.
-- The application layer only updates read_at; no other fields
-- are sent in the update payload from the browser.
create policy "authenticated_update_notifications"
  on admin_notifications
  for update
  to authenticated
  using (true)
  with check (true);

-- INSERT is handled by service role (scripts) which bypasses RLS.
-- No INSERT policy is created for anon or authenticated roles.

-- DELETE is not permitted. Notifications are append-only;
-- read_at = null means unread, read_at = timestamp means read.
