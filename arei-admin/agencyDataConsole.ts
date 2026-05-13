/**
 * Agency Data Console — data layer.
 *
 * Handles:
 *   - Fetching listings linked to an agency (via source_ids or agency_listing_links)
 *   - Computing per-listing quality scores and detecting data issues (client-side)
 *   - Creating and managing agency_listing_submissions (broker corrections)
 *   - AREI admin review actions (approve / reject / needs_more_info)
 *   - Agency-level quality snapshot writes
 *
 * Quality scoring (V0):
 *   Start at 100. Deduct for each missing/weak field. Clamp 0–100.
 *   This is intentionally simple and replaceable. See computeListingQualityScore().
 */

import { supabase } from "./supabase";
import type {
  Agency,
  AgencyListingLink,
  AgencyListingSubmission,
  AgencyDataQualitySnapshot,
  ListingQualityRow,
  IssueType,
  SubmissionType,
  SubmissionStatus,
  SubmissionPayload,
} from "./types";

const nowIso = () => new Date().toISOString();

// Days after which a listing is considered stale (matches SOURCE_STALE_DAYS in app.tsx)
const STALE_DAYS = 30;

// ============================================================
// QUALITY SCORING
// ============================================================

/**
 * V0 quality score. Start at 100, deduct for each problem.
 * Replace with a server-side function when scoring logic matures.
 */
export function computeListingQualityScore(row: {
  price: number | null;
  image_urls: string[];
  property_size_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  island: string | null;
  city: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
}): number {
  let score = 100;
  if (!row.price) score -= 25;
  if (!row.image_urls || row.image_urls.length === 0) score -= 20;
  if (!row.property_size_sqm) score -= 15;
  if (row.bedrooms == null) score -= 10;
  if (row.bathrooms == null) score -= 10;
  if (!row.island && !row.city) score -= 10;
  // Stale: last_seen_at or updated_at older than STALE_DAYS
  const lastSeen = row.last_seen_at ?? row.updated_at;
  if (lastSeen) {
    const days = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 86_400_000);
    if (days >= STALE_DAYS) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

/** Detect which issue types are present for a listing row. */
export function detectListingIssues(row: {
  price: number | null;
  image_urls: string[];
  property_size_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  island: string | null;
  city: string | null;
  description: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
}): IssueType[] {
  const issues: IssueType[] = [];
  if (!row.price) issues.push("missing_price");
  if (!row.image_urls || row.image_urls.length === 0) issues.push("missing_photos");
  if (!row.property_size_sqm) issues.push("missing_sqm");
  if (row.bedrooms == null) issues.push("missing_bedrooms");
  if (row.bathrooms == null) issues.push("missing_bathrooms");
  if (!row.island && !row.city) issues.push("missing_location");
  if (!row.description || row.description.trim().length < 20) issues.push("weak_description");
  const lastSeen = row.last_seen_at ?? row.updated_at;
  if (lastSeen) {
    const days = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 86_400_000);
    if (days >= STALE_DAYS) issues.push("stale_listing");
  }
  return issues;
}

// ============================================================
// LISTINGS — fetch per agency
// ============================================================

const QUALITY_LISTING_COLS =
  "id,title,price,currency,source_id,source_url,island,city,bedrooms,bathrooms,property_size_sqm,image_urls,description,property_type,approved,last_seen_at,updated_at";

interface RawListing {
  id: string;
  title: string | null;
  price: number | null;
  currency: string;
  source_id: string;
  source_url: string | null;
  island: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  image_urls: string[];
  description: string | null;
  property_type: string | null;
  approved: boolean;
  last_seen_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch all listings for an agency's linked source_ids, joined with any
 * pending submissions. Returns rows with quality score and issues computed.
 */
export async function getAgencyListingQuality(
  agency: Agency
): Promise<ListingQualityRow[]> {
  if (agency.source_ids.length === 0) return [];

  const [listingsResult, submissionsResult] = await Promise.all([
    supabase
      .from("listings")
      .select(QUALITY_LISTING_COLS)
      .in("source_id", agency.source_ids)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("agency_listing_submissions")
      .select("*")
      .eq("agency_id", agency.id)
      .in("status", ["draft", "submitted", "under_review"]),
  ]);

  if (listingsResult.error) throw listingsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const submissions = (submissionsResult.data ?? []) as AgencyListingSubmission[];
  const submissionByListingId = new Map<string, AgencyListingSubmission>(
    submissions
      .filter((s) => s.listing_id)
      .map((s) => [s.listing_id!, s])
  );

  return ((listingsResult.data ?? []) as RawListing[]).map((l) => ({
    ...l,
    quality_score: computeListingQualityScore(l),
    issues: detectListingIssues(l),
    pending_submission: submissionByListingId.get(l.id) ?? null,
  }));
}

// ============================================================
// AGENCY LISTING LINKS
// ============================================================

export async function getAgencyListingLinks(agencyId: string): Promise<AgencyListingLink[]> {
  const { data, error } = await supabase
    .from("agency_listing_links")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AgencyListingLink[];
}

export async function createAgencyListingLink(
  link: Omit<AgencyListingLink, "id" | "created_at" | "updated_at">
): Promise<AgencyListingLink> {
  const { data, error } = await supabase
    .from("agency_listing_links")
    .insert({ ...link, created_at: nowIso(), updated_at: nowIso() })
    .select()
    .single();
  if (error) throw error;
  return data as AgencyListingLink;
}

// ============================================================
// SUBMISSIONS — create / read / review
// ============================================================

export type SubmissionInsert = {
  agency_id: string;
  listing_id: string | null;
  submission_type: SubmissionType;
  payload: SubmissionPayload;
};

export async function createSubmission(
  input: SubmissionInsert
): Promise<AgencyListingSubmission> {
  const now = nowIso();
  const { data, error } = await supabase
    .from("agency_listing_submissions")
    .insert({
      agency_id: input.agency_id,
      listing_id: input.listing_id,
      submission_type: input.submission_type,
      status: "submitted" as SubmissionStatus,
      payload: input.payload,
      submitted_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AgencyListingSubmission;
}

export async function getAgencySubmissions(
  agencyId: string
): Promise<AgencyListingSubmission[]> {
  const { data, error } = await supabase
    .from("agency_listing_submissions")
    .select("*")
    .eq("agency_id", agencyId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AgencyListingSubmission[];
}

/** All pending submissions across agencies — for the AREI admin review queue. */
export async function getPendingSubmissions(): Promise<AgencyListingSubmission[]> {
  const { data, error } = await supabase
    .from("agency_listing_submissions")
    .select("*")
    .in("status", ["submitted", "under_review"])
    .order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AgencyListingSubmission[];
}

export async function reviewSubmission(
  id: string,
  status: Extract<SubmissionStatus, "approved" | "rejected" | "needs_more_info" | "under_review">,
  reviewerNotes?: string
): Promise<AgencyListingSubmission> {
  const now = nowIso();
  const { data, error } = await supabase
    .from("agency_listing_submissions")
    .update({
      status,
      reviewer_notes: reviewerNotes ?? null,
      reviewed_at: status !== "under_review" ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AgencyListingSubmission;
}

// ============================================================
// QUALITY SNAPSHOTS — write today's snapshot
// ============================================================

export async function writeAgencyQualitySnapshot(
  agency: Agency,
  rows: ListingQualityRow[],
  openSubmissionsCount: number
): Promise<AgencyDataQualitySnapshot> {
  const listing_count = rows.length;
  const missing_price_count = rows.filter((r) => !r.price).length;
  const missing_sqm_count = rows.filter((r) => !r.property_size_sqm).length;
  const missing_photo_count = rows.filter((r) => r.image_urls.length === 0).length;
  const missing_beds_count = rows.filter((r) => r.bedrooms == null).length;
  const missing_baths_count = rows.filter((r) => r.bathrooms == null).length;
  const stale_listing_count = rows.filter((r) => r.issues.includes("stale_listing")).length;
  const open_issues_count = rows.reduce((n, r) => n + r.issues.length, 0);
  const average_quality_score =
    listing_count > 0
      ? Math.round(rows.reduce((s, r) => s + r.quality_score, 0) / listing_count * 10) / 10
      : 0;

  const snapshot = {
    agency_id: agency.id,
    market_code: agency.market_code,
    snapshot_date: new Date().toISOString().slice(0, 10),
    listing_count,
    missing_price_count,
    missing_sqm_count,
    missing_photo_count,
    missing_beds_count,
    missing_baths_count,
    stale_listing_count,
    open_issues_count,
    open_submissions_count: openSubmissionsCount,
    average_quality_score,
    created_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("agency_data_quality_snapshots")
    .upsert(snapshot, { onConflict: "agency_id,snapshot_date" })
    .select()
    .single();
  if (error) throw error;
  return data as AgencyDataQualitySnapshot;
}
