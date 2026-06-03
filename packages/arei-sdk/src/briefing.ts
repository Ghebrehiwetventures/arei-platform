// =============================================================================
// arei-sdk/src/briefing.ts
// Pure briefing helpers (no I/O) — safe to unit test in isolation.
// =============================================================================

import type { MarketReportRow } from "./types.js";

/**
 * A briefing is only renderable when its pinned snapshot date actually has the
 * required published snapshot rows behind it.
 *
 * The 'ALL' aggregate row is the minimum requirement: it drives the headline
 * KPI cards, and migration 044 always writes it alongside the per-island rows.
 * Its absence means the snapshot for this date is missing, unpublished, or
 * malformed — in which case the briefing must be treated as unavailable rather
 * than rendered with empty data.
 *
 * `rows` is expected to be the already-published-filtered result set for the
 * briefing's snapshot_date (the SDK query and RLS both enforce that filter).
 */
export function briefingHasRequiredSnapshot(
  rows: MarketReportRow[] | null | undefined
): boolean {
  if (!rows || rows.length === 0) return false;
  return rows.some((r) => r.island === "ALL");
}

/** Min / max number of key takeaways an edition must carry to be published. */
export const MIN_KEY_TAKEAWAYS = 3;
export const MAX_KEY_TAKEAWAYS = 5;

/** Editorial fields an editor fills in before an edition can go live. */
export interface BriefingPublishInput {
  title?: string | null;
  period?: string | null;
  slug?: string | null;
  snapshot_date?: string | null;
  executive_summary?: string | null;
  commentary?: string | null;
  key_takeaways?: (string | null)[] | null;
}

/**
 * Pure publish-readiness check for a briefing edition. Returns the list of
 * blocking problems; an empty array means the edition is ready to publish.
 *
 * This validates only the editorial payload — it does NOT check that a
 * published snapshot exists for snapshot_date (that needs a DB read and is
 * enforced separately by the admin before publishing).
 *
 * methodology_note is intentionally not required: when absent, the public
 * page renders the standard methodology disclosure.
 */
export function validateBriefingForPublish(
  input: BriefingPublishInput
): string[] {
  const errors: string[] = [];
  const blank = (v: string | null | undefined) => !v || v.trim().length === 0;

  if (blank(input.title)) errors.push("Title is required.");
  if (blank(input.period)) errors.push("Period label is required.");
  if (blank(input.slug)) errors.push("Slug is required.");
  if (blank(input.snapshot_date)) errors.push("A snapshot date must be pinned.");
  if (blank(input.executive_summary)) errors.push("Executive summary is required.");
  if (blank(input.commentary)) errors.push("Commentary is required.");

  const takeaways = (input.key_takeaways ?? [])
    .map((t) => (t ?? "").trim())
    .filter((t) => t.length > 0);
  if (takeaways.length < MIN_KEY_TAKEAWAYS || takeaways.length > MAX_KEY_TAKEAWAYS) {
    errors.push(
      `Provide between ${MIN_KEY_TAKEAWAYS} and ${MAX_KEY_TAKEAWAYS} key takeaways (have ${takeaways.length}).`
    );
  }

  return errors;
}
