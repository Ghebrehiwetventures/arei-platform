-- Migration: deep-review persistence
-- Date: 2026-06-02
--
-- Scope:
-- - add deep-review columns to kv_curated.review_log
-- - create kv_curated.scraper_gap_log (confirmed scraper-miss backlog)
--
-- Rollback note:
--   ALTER TABLE kv_curated.review_log
--     DROP COLUMN IF EXISTS missing_field_report,
--     DROP COLUMN IF EXISTS unmapped_fields,
--     DROP COLUMN IF EXISTS fetch_status;
--   DROP TABLE IF EXISTS kv_curated.scraper_gap_log;

begin;

alter table kv_curated.review_log
  add column if not exists missing_field_report jsonb,
  add column if not exists unmapped_fields      jsonb,
  add column if not exists fetch_status          text;

create table if not exists kv_curated.scraper_gap_log (
  id              bigint generated always as identity primary key,
  listing_id      text not null references kv_curated.listings(id) on delete cascade,
  source_id       text not null,
  field           text not null,
  recovered_value text,
  evidence        text,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists scraper_gap_log_source_field_idx
  on kv_curated.scraper_gap_log (source_id, field);

revoke all on kv_curated.scraper_gap_log from anon;
revoke all on kv_curated.scraper_gap_log from authenticated;

commit;
