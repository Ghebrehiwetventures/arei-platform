-- Add is_active to newsletter_subscribers so the unsubscribe flow can
-- soft-deactivate a subscriber (is_active=false) instead of deleting the row.
-- Additive + idempotent: production already has this column (added out-of-band),
-- so this is a no-op there and only matters when rebuilding from migrations.
-- Run in Supabase SQL editor.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Partial index for the common "active subscribers" read (e.g. digest sends).
CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_idx
  ON newsletter_subscribers (email)
  WHERE is_active;

-- The unsubscribe Edge Function updates is_active via the service role, which
-- bypasses RLS; anon still only has the INSERT policy from migration 006.
