-- Content Draft Agent v1 persistence
-- Durable, shared storage for human-gated content drafts in AREI Admin.

CREATE TABLE IF NOT EXISTS public.content_drafts (
  id text PRIMARY KEY,
  source_listing_id text NOT NULL,
  listing_title text NOT NULL,
  selected_image text NOT NULL,
  suggested_caption text NOT NULL,
  suggested_hashtags text[] NOT NULL DEFAULT '{}',
  suggested_channel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  status_note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_drafts_suggested_channel_check
    CHECK (suggested_channel IN ('instagram', 'facebook', 'linkedin')),
  CONSTRAINT content_drafts_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'revision_requested'))
);

CREATE INDEX IF NOT EXISTS content_drafts_created_at_idx
  ON public.content_drafts (created_at DESC);

ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_drafts_select_all ON public.content_drafts;
CREATE POLICY content_drafts_select_all
  ON public.content_drafts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS content_drafts_insert_all ON public.content_drafts;
CREATE POLICY content_drafts_insert_all
  ON public.content_drafts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS content_drafts_update_all ON public.content_drafts;
CREATE POLICY content_drafts_update_all
  ON public.content_drafts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.content_drafts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.content_drafts TO authenticated;
