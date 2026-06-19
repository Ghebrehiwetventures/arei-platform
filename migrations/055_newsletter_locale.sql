-- Add a language to newsletter subscribers so follow-up email can be sent in
-- the language the visitor signed up in (en / pt). Additive + idempotent.
-- Run in Supabase SQL editor.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

-- Only the two languages the subscribe page supports.
ALTER TABLE newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_locale_check;
ALTER TABLE newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_locale_check CHECK (locale IN ('en', 'pt'));

-- anon already has INSERT via the "anon_insert_only" policy (006); the new
-- column is covered by the existing table-level grant. Still no read access.
