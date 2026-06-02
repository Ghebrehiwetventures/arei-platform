-- Migration: kv_curated.review_log
-- Date: 2026-06-01
--
-- Scope:
-- - create kv_curated.review_log to persist reviewer verdicts (one row per run)
--
-- Rollback note:
--   DROP TABLE IF EXISTS kv_curated.review_log;

begin;

create table if not exists kv_curated.review_log (
  id              bigserial primary key,
  listing_id      text not null references kv_curated.listings(id) on delete cascade,
  model           text not null,
  verdict         text not null check (verdict in ('publish','hold','hide')),
  confidence      numeric not null,
  reasons         jsonb not null,
  suggested_patch jsonb not null,
  hide_reason     text,
  created_at      timestamptz not null default now()
);

create index if not exists review_log_listing_id_idx
  on kv_curated.review_log (listing_id, created_at desc);

revoke all on kv_curated.review_log from anon;
revoke all on kv_curated.review_log from authenticated;

commit;
