# Audit Remediation — 2026-05-14

This note tracks the focused remediation branch for the May 2026 code audit.

## Fixed in this PR

1. **content_drafts anon mutation exposure**
   - Finding: `public.content_drafts` allowed broad browser-side access through the anon key.
   - Fix: migration `038_content_drafts_admin_auth_rls.sql` removes anon `SELECT`, `INSERT`, `UPDATE`, and `DELETE` access. Authenticated access is limited by RLS to users with a matching `public.admin_users` row.
   - Code change: AREI Admin content draft reads/writes now use the authenticated Supabase client instead of the always-anon data client.

2. **v1_feed_cv conflicting public feed gate**
   - Finding: legacy migrations `009` and `010` defined conflicting `public.v1_feed_cv` gates, with the later legacy migration loosening source URL/image requirements.
   - Fix: migration `039_v1_feed_cv_canonical_public_gate.sql` restates the canonical public feed gate over the current curated upstream. The public feed now explicitly requires a non-empty source URL, at least one image, published/approved non-superseded Cape Verde rows, canonical islands, and exclusion of stub/demo/test sources.

## Left Open

3. **dedup-key conflict reporting**
   - The writer can still report success when individual rows fail on `dedup_key` conflicts.

4. **absent-listing aging / inactive logic**
   - The writer still updates seen rows but does not implement the advertised absent-row aging/inactive transition.

5. **SDK aggregate pagination/RPCs**
   - SDK aggregate reads still use unpaginated client-side selects and should move to paginated reads or RPCs before feed size makes API row caps material.

## Recommended Follow-Up Order

1. Writer dedup reporting correctness.
2. Absent-listing aging / inactive logic.
3. SDK aggregate pagination/RPCs.

## Verification Notes

This PR is verified in code and with local static/type checks only. It does not claim live Supabase verification.
