/**
 * Monthly briefing auto-DRAFT scaffold — NOT YET IMPLEMENTED.
 *
 * ⚠️  This file is intentionally inert. It documents the intended future
 *     "auto-draft, human publish" workflow and exits without writing anything.
 *     It is NOT wired into any schedule and performs no database mutations.
 *
 * Product direction (confirmed): "auto-draft, human publish" — NEVER fully
 * automatic public publishing. A human always approves before an edition goes
 * live. There is NO AI text generation in this scaffold.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * INTENDED FUTURE WORKFLOW (implement in a later PR)
 *
 *   Trigger: a scheduled job (e.g. monthly cron, after the snapshot pipeline).
 *
 *   1. DETECT the latest PUBLISHED monthly snapshot.
 *      - Read market_report_snapshots: latest snapshot_date where
 *        island = 'ALL' AND status = 'published' AND published_at IS NOT NULL.
 *      - Derive the period (e.g. "June 2026") and slug (e.g. "2026-06") from
 *        that snapshot_date.
 *
 *   2. SKIP if a briefing already exists for that period/slug.
 *      - Idempotent: never create duplicates for the same period.
 *
 *   3. CREATE a DRAFT briefing (status = 'draft') when none exists.
 *      - Pin snapshot_date so the numeric KPIs + island breakdown link
 *        automatically from the snapshot (the public page already reads them
 *        from the pinned snapshot — no numbers are copied or hand-entered).
 *      - Leave editorial fields (title, executive_summary, key_takeaways,
 *        commentary) EMPTY or pre-templated so a human fills/edits them.
 *      - methodology_note stays null → the page renders the standard disclosure.
 *
 *   4. NOTIFY an editor (admin_notifications) that a draft is ready for review.
 *
 *   5. HUMAN APPROVAL is required to publish. This script must NEVER set
 *      status = 'published'. Publishing stays a deliberate manual action in
 *      the admin console (BriefingsView) or the publish CLI.
 *
 *   Optional, ISOLATED, draft-only later: an AI helper could pre-fill a first
 *   draft of the editorial prose for the editor to revise. It must remain
 *   draft-only and approval-gated. Do NOT add it here without that isolation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Auth note (for the future implementation): creating drafts requires write
 * access to market_briefings — run with SUPABASE_SERVICE_ROLE_KEY (bypasses
 * RLS), the same pattern as snapshot_market_report.ts.
 */

function main(): void {
  console.log(
    "[auto-draft:market-briefing] scaffold only — not implemented. " +
      "No snapshot was read and no briefing draft was created. " +
      "See the TODO in this file for the intended auto-draft → human-publish workflow."
  );
  // TODO(briefings-auto-draft): implement steps 1-5 above in a dedicated PR.
}

main();
