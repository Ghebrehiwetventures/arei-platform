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

/**
 * Internal sentinel rows — island names starting with '__' (e.g.
 * '__hidden_for_dedup__'). These are internal pipeline buckets and must never
 * reach public output (the public page or future email distribution).
 */
export function isInternalIslandRow(island: string): boolean {
  return island.startsWith("__");
}

/**
 * Island rows shown in the public island breakdown: real islands only.
 * Excludes the 'ALL' aggregate (used for KPIs, not the per-island table) and
 * internal sentinel rows.
 */
export function isPublicIslandRow(island: string): boolean {
  return island !== "ALL" && !isInternalIslandRow(island);
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

// ---------------------------------------------------------------------------
// Derived signals — computed from the snapshot, never stored. Honest by
// construction: the UI shows the underlying numbers alongside the label.
// ---------------------------------------------------------------------------

export type BriefingConfidenceLevel = "high" | "medium" | "low";

/** Methodology version of the confidence rule — tunable, not permanent truth. */
export const BRIEFING_CONFIDENCE_VERSION = "v0.1";

/** Below this many methodology-eligible records an island's median is withheld. */
export const BRIEFING_SMALL_SAMPLE_MIN = 5;

export interface BriefingConfidence {
  level: BriefingConfidenceLevel;
  /** Raw inputs so the UI can show why (transparency). */
  indexEligibleCount: number;
  priceCoveragePct: number | null;
  sqmCoveragePct: number | null;
  /** Public islands whose eligible sample is below BRIEFING_SMALL_SAMPLE_MIN. */
  smallSampleIslands: number;
}

/**
 * Derive a confidence label (v0.1) from the snapshot's 'ALL' aggregate +
 * island rows. Returns null when there is no 'ALL' row. Thresholds are tunable
 * methodology, not permanent — the UI must surface the raw numbers too.
 *
 *   High:   eligible >= 50 AND price_coverage >= 60 AND sqm_coverage >= 50
 *   Medium: eligible >= 20 AND price_coverage >= 40
 *   Low:    otherwise
 */
export function deriveBriefingConfidence(
  rows: MarketReportRow[] | null | undefined
): BriefingConfidence | null {
  const all = (rows ?? []).find((r) => r.island === "ALL");
  if (!all) return null;

  const eligible = all.index_eligible_count ?? 0;
  const price = all.price_coverage_pct;
  const sqm = all.sqm_coverage_pct;
  const smallSampleIslands = (rows ?? []).filter(
    (r) => isPublicIslandRow(r.island) && r.index_eligible_count < BRIEFING_SMALL_SAMPLE_MIN
  ).length;

  let level: BriefingConfidenceLevel;
  if (eligible >= 50 && (price ?? 0) >= 60 && (sqm ?? 0) >= 50) {
    level = "high";
  } else if (eligible >= 20 && (price ?? 0) >= 40) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    indexEligibleCount: eligible,
    priceCoveragePct: price,
    sqmCoveragePct: sqm,
    smallSampleIslands,
  };
}

/**
 * True when this edition has no earlier comparable edition — i.e. it is the
 * baseline. Used to show "Baseline established. Month-over-month comparison
 * begins with the next edition." instead of implying movement we can't show.
 *
 * ISO date strings (YYYY-MM-DD) compare correctly with <.
 */
export function isBaselineEdition(
  currentSnapshotDate: string,
  otherSnapshotDates: string[]
): boolean {
  return !otherSnapshotDates.some((d) => d < currentSnapshotDate);
}
