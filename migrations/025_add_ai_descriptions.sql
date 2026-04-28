-- 025_add_ai_descriptions.sql
--
-- Adds the JSONB column that stores AI-generated descriptions per language.
-- Shape (per language key):
--   { "text": <string>,
--     "generated_at": <ISO8601 timestamp>,
--     "prompt_version": <string e.g. "v1.2">,
--     "model": <string e.g. "claude-sonnet-4-6">,
--     "validated": <boolean> }
--
-- Multi-language by design — `en` is populated first (2026-04-27 backfill,
-- 380 rows). Future languages (it/pt/de/sv) plug in as additional keys
-- without schema changes.
--
-- This column was applied directly to the live Supabase database via the
-- SQL editor on 2026-04-27 before this migration file was written. The
-- statement below is idempotent so it can be re-run safely against any
-- environment that's already had the change applied.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS ai_descriptions JSONB DEFAULT '{}'::jsonb NOT NULL;
