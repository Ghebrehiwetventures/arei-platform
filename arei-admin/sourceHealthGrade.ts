/**
 * Source health grade — pure function, no React, no Supabase.
 *
 * Single source of truth shared by:
 *   - arei-admin/data.ts            (live admin display)
 *   - scripts/snapshot_source_health.ts  (daily snapshot writer, future PR)
 *
 * Keeping these aligned ensures the admin chart's historical "Health A"
 * count never disagrees with the live admin's view of the same row.
 */

export const SOURCE_STALE_DAYS = 30;

export type HealthGrade = "A" | "B" | "C" | "D";

export interface HealthGradeInput {
  listing_count: number;
  approved_count: number;
  public_feed_count: number;
  trust_passed_count: number;
  indexable_count: number;
  sqm_pct: number;
  beds_pct: number;
  baths_pct: number;
  feed_conversion_pct: number;
  last_updated_at: string | null | undefined;
}

export interface HealthGradeResult {
  score: number;
  grade: HealthGrade;
}

/** Days since `ts`. Returns Infinity for missing/invalid timestamps so they
 *  fail any "stale >= N days" comparison and the source is treated as stale. */
export function daysSince(ts: string | null | undefined): number {
  if (!ts) return Infinity;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

/**
 * Operational health grade.
 *
 * Replaces the old approval/image/price composite, which could mark a source
 * as "A" while it had 0 public feed, 0 trust pass, or stale freshness — i.e.
 * data was complete but the source was operationally broken.
 *
 * Rules — worst grade wins:
 *
 *   D  approved > 0 AND public_feed = 0          (approved listings never reach the public feed)
 *   D  approved > 0 AND trust_passed = 0         (none pass trust gate)
 *   D  approved > 0 AND indexable = 0            (none indexable)
 *   D  stale >= 30 days
 *   C  approved >= 20 AND feed conversion < 25%
 *   C  listing_count >= 10 AND sqm_pct = 0
 *   B  sqm_pct < 30 OR beds_pct < 30 OR baths_pct < 30
 *   A  fresh, has feed/trust/indexable, conversion >= 25%, basic coverage >= 30
 *
 * Sources with 0 listings (e.g. placeholder rows) get C — neither broken
 * nor functional.
 */
export function computeHealthGrade(input: HealthGradeInput): HealthGradeResult {
  const {
    listing_count,
    approved_count,
    public_feed_count,
    trust_passed_count,
    indexable_count,
    sqm_pct,
    beds_pct,
    baths_pct,
    feed_conversion_pct,
    last_updated_at,
  } = input;

  if (listing_count === 0) return { score: 50, grade: "C" };

  const stale = daysSince(last_updated_at) >= SOURCE_STALE_DAYS;
  const isD =
    (approved_count > 0 && public_feed_count === 0) ||
    (approved_count > 0 && trust_passed_count === 0) ||
    (approved_count > 0 && indexable_count === 0) ||
    stale;
  if (isD) return { score: 25, grade: "D" };

  const isC =
    (approved_count >= 20 && feed_conversion_pct < 25) ||
    (listing_count >= 10 && sqm_pct === 0);
  if (isC) return { score: 55, grade: "C" };

  const isB = sqm_pct < 30 || beds_pct < 30 || baths_pct < 30;
  if (isB) return { score: 75, grade: "B" };

  return { score: 95, grade: "A" };
}
