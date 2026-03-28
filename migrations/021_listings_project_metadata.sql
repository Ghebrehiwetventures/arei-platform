-- Run in Supabase SQL Editor.
-- Adds nullable project/source metadata for Cape Verde ingest persistence.

alter table public.listings
  add column if not exists source_ref text,
  add column if not exists project_flag boolean,
  add column if not exists project_start_price numeric;
