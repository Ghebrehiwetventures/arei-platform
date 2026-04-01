-- Tighten content draft access to the browser admin pattern used in this phase.
-- The admin currently reads/writes from the client with the anon key, so keep
-- anon access only and drop broader authenticated grants/policies.

DROP POLICY IF EXISTS content_drafts_select_all ON public.content_drafts;
CREATE POLICY content_drafts_select_anon
  ON public.content_drafts
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS content_drafts_insert_all ON public.content_drafts;
CREATE POLICY content_drafts_insert_anon
  ON public.content_drafts
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS content_drafts_update_all ON public.content_drafts;
CREATE POLICY content_drafts_update_anon
  ON public.content_drafts
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

REVOKE SELECT, INSERT, UPDATE ON public.content_drafts FROM authenticated;
