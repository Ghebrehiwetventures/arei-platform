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
