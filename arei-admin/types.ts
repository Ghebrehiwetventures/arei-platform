export enum SourceStatus {
  OK = "OK",
  PARTIAL_OK = "PARTIAL_OK",
  BROKEN_SOURCE = "BROKEN_SOURCE",
  UNSCRAPABLE = "UNSCRAPABLE",
  PAUSED_BY_SYSTEM = "PAUSED_BY_SYSTEM",
}

export interface SourceState {
  status: SourceStatus;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
  pausedAt?: Date;
}

export interface Source {
  id: string;
  name: string;
  state: SourceState;
}

export interface Listing {
  id: string;
  title?: string;
  price?: number;
  project_start_price?: number | null;
  currency?: string;
  images: string[];
  description?: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string | null;
  source_ref?: string | null;
  location?: string;
  island?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  land_area_sqm?: number | null;
  property_type?: string;
  status?: string;
  approved?: boolean;
  violations?: string[];
  amenities?: string[];
  price_period?: string;
  project_flag?: boolean | null;
}

export interface Market {
  id: string;
  name: string;
  status: SourceStatus;
  sources: Source[];
  listings: Listing[];
}

// Dashboard: per-source stats from RPC (raw)
export interface SourceQualityRowRaw {
  source_id: string;
  listing_count: number;
  approved_count: number;
  with_image_count: number;
  with_price_count: number;
  /** Optional fields are present when the RPC has been migrated to the latest
   *  schema (Sprint 2 health columns). Older RPCs omit them. */
  with_sqm_count?: number;
  with_beds_count?: number;
  with_baths_count?: number;
  trust_passed_count?: number;
  indexable_count?: number;
  public_feed_count?: number;
  /** Max(listings.updated_at) per source. Null when source has no rows or
   *  the RPC has not yet been migrated to expose this column. */
  last_updated_at?: string | null;
}

// Dashboard: with computed ratios and grade
export interface SourceQualityRow extends SourceQualityRowRaw {
  approved_pct: number;
  with_image_pct: number;
  with_price_pct: number;
  with_sqm_pct: number;
  with_beds_pct: number;
  with_baths_pct: number;
  /** Resolved counts (default 0 when RPC has not been migrated). */
  trust_passed_count_n: number;
  indexable_count_n: number;
  public_feed_count_n: number;
  /** public_feed_count / approved_count * 100. 0 when approved_count is 0. */
  feed_conversion_pct: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  sourceName: string;
  marketId: string;
  /** True when this row corresponds to a `type: stub` source declared in
   *  markets/<m>/sources.yml. Stub rows are excluded from the public feed
   *  upstream (migrations/010); we mirror that exclusion in admin aggregates. */
  isStub: boolean;
}

export interface DashboardStats {
  totalListings: number;
  approvedCount: number;
  sourceCount: number;
  marketCount: number;
  sourceRows: SourceQualityRow[];
  // Direct COUNT(*) FROM public.v1_feed_cv — the canonical public feed.
  // Do NOT derive this by summing per-source public_feed_count from the RPC:
  // the RPC starts from public.listings and silently drops v1_feed_cv rows
  // whose source_id has no corresponding row in public.listings (e.g. rows
  // that originate in kv_curated but never touched the pipeline table).
  liveFeedTotal: number;
}

export type IngestRunPhase = "post_fetch_snapshot" | "final_post_enrichment";

// ============================================================
// AGENCY CONSOLE TYPES
// Two-layer model: agencies (broker-safe) + agency_relationships (internal only)
// See docs/03-product/agency-console-v0.md
// ============================================================

export type AgencyClaimedStatus = "unclaimed" | "invited" | "claimed" | "verified";
export type AgencyDataPartnerStatus = "none" | "interested" | "active" | "paused";
export type AgencyRelationshipStatus =
  | "not_contacted"
  | "contacted"
  | "replied"
  | "meeting_booked"
  | "onboarded"
  | "rejected"
  | "dormant";
export type AgencyPriority = "high" | "medium" | "low";
export type AgencyLeadQuality = "unknown" | "strong" | "average" | "weak";

/** Broker-safe agency profile. Safe to eventually expose to agency users. */
export interface Agency {
  id: string;
  market_code: string;
  agency_name: string;
  public_display_name: string | null;
  contact_person: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  description: string | null;
  source_ids: string[];
  claimed_status: AgencyClaimedStatus;
  data_partner_status: AgencyDataPartnerStatus;
  created_at: string;
  updated_at: string;
}

/** Internal relationship CRM record. NEVER expose to broker-facing surfaces. */
export interface AgencyRelationship {
  id: string;
  agency_id: string;
  relationship_status: AgencyRelationshipStatus;
  priority: AgencyPriority;
  lead_quality: AgencyLeadQuality;
  relationship_owner: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Joined view used in the Agency Console table — agency + its relationship record. */
export interface AgencyWithRelationship extends Agency {
  relationship: AgencyRelationship | null;
}

// ============================================================
// AGENCY DATA CONSOLE TYPES
// Broker contribution / data acquisition layer.
// See docs/03-product/agency-data-console-v0.md
// ============================================================

export type AgencyListingRelationshipType = "source_owner" | "claimed" | "submitted" | "verified";

export interface AgencyListingLink {
  id: string;
  agency_id: string;
  listing_id: string | null;
  source_id: string | null;
  external_listing_id: string | null;
  relationship_type: AgencyListingRelationshipType;
  created_at: string;
  updated_at: string;
}

export type SubmissionType =
  | "new_listing"
  | "update_existing"
  | "availability_update"
  | "duplicate_report"
  | "removal_request";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_more_info";

/** Payload shape for update_existing and availability_update submissions. */
export interface SubmissionPayload {
  title?: string;
  price?: number | null;
  currency?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
  island?: string | null;
  city?: string | null;
  description?: string | null;
  property_type?: string | null;
  availability_status?: AvailabilityStatus;
  image_urls?: string[];
  /** For new_listing: full source URL */
  source_url?: string | null;
  /** For duplicate_report: the canonical ID of the original */
  duplicate_of_id?: string | null;
  /** Free-text note from the agency explaining the change */
  agency_note?: string | null;
}

export interface AgencyListingSubmission {
  id: string;
  agency_id: string;
  listing_id: string | null;
  submission_type: SubmissionType;
  status: SubmissionStatus;
  payload: SubmissionPayload;
  reviewer_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type IssueType =
  | "missing_price"
  | "missing_sqm"
  | "missing_bedrooms"
  | "missing_bathrooms"
  | "missing_location"
  | "missing_photos"
  | "weak_description"
  | "stale_listing"
  | "possible_duplicate"
  | "broken_image"
  | "suspicious_price";

export type IssueSeverity = "low" | "medium" | "high";
export type IssueStatus = "open" | "fixed" | "ignored" | "submitted_for_review";

export interface ListingDataIssue {
  id: string;
  listing_id: string;
  agency_id: string | null;
  source_id: string | null;
  issue_type: IssueType;
  severity: IssueSeverity;
  status: IssueStatus;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgencyDataQualitySnapshot {
  id: string;
  agency_id: string;
  market_code: string;
  snapshot_date: string;
  listing_count: number;
  missing_price_count: number;
  missing_sqm_count: number;
  missing_photo_count: number;
  missing_beds_count: number;
  missing_baths_count: number;
  stale_listing_count: number;
  open_issues_count: number;
  open_submissions_count: number;
  average_quality_score: number;
  created_at: string;
}

/** Listing availability status used in agency submissions and UI. */
export type AvailabilityStatus =
  | "available"
  | "sold"
  | "reserved"
  | "rented"
  | "duplicate"
  | "removed"
  | "unknown";

/** A raw listing row as returned from Supabase, with quality computed client-side. */
export interface ListingQualityRow {
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
  /** Computed client-side via computeListingQualityScore() */
  quality_score: number;
  /** Detected missing/weak fields */
  issues: IssueType[];
  /** Pending submission for this listing (if any) */
  pending_submission: AgencyListingSubmission | null;
}

// ============================================================
// BROKER PILOT WORKSPACE TYPES
// See docs/03-product/broker-pilot-workspace-v0.md
// ============================================================

export type PilotPublishStatus = "draft" | "ready_for_review" | "published" | "rejected";

/**
 * A listing submitted directly by an agency through the Broker Pilot Workspace.
 * Not a correction to an existing pipeline listing — a net-new listing record.
 *
 * reviewer_notes, reviewed_by, reviewed_at are admin-only fields.
 * NEVER render them in any broker-facing view or component.
 */
export interface PilotListing {
  id: string;
  agency_id: string;
  market_code: string;
  title: string;
  price: number | null;
  currency: string;
  property_type: string | null;
  island: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  description: string | null;
  image_urls: string[];
  source_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  publish_status: PilotPublishStatus;
  /** Admin-only. Never show in broker-facing surfaces. */
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Quality check result for a pilot listing — one entry per check. */
export interface PilotQualityCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "required" | "recommended" | "optional";
  detail?: string;
}

// --- KV Curated reviewer ---

export interface CuratedListing {
  id: string;
  publish_status: "needs_review" | "published" | "hidden";
  title: string;
  description?: string | null;
  source_id_primary: string;
  source_url_primary: string | null;
  island: string;
  city: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  price: number | null;
  currency: string | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  image_urls: string[];
  first_seen_at: string | null;
  last_verified_at: string | null;
  /** Most recent kv_curated.review_log row; null if never reviewed. */
  last_review?: {
    verdict: "publish" | "hold" | "hide";
    confidence: number;
    hide_reason: string | null;
    created_at: string;
  } | null;
}

export interface SuggestedPatch {
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string | null;
  island?: string | null;
  city?: string | null;
  price?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
}

export interface MissingFieldEntry {
  field: string;
  status: "scraper_missed" | "absent_at_source" | "uncertain";
  found_value?: string | number | null;
  evidence?: string;
  confidence: number;
}

export interface UnmappedField {
  label: string;
  value: string;
  suggested_column: string;
  type: "numeric" | "integer" | "text" | "boolean";
  confidence: number;
}

export interface RecoveredGap {
  field: string;
  source_id: string;
  value?: string | number | null;
  evidence?: string;
  model?: string;
}

export interface ReviewVerdict {
  verdict: "publish" | "hold" | "hide";
  confidence: number;
  reasons: string[];
  suggested_patch: SuggestedPatch;
  hide_reason?: string;
  fetch_status?: "ok" | "failed" | "skipped";
  missing_field_report?: MissingFieldEntry[];
  unmapped_fields?: UnmappedField[];
}

export interface ReviewVerdictResult {
  id: string;
  verdict: ReviewVerdict;
  review_log_id?: number | null;
  source_id?: string | null;
}

export interface ReviewLogRow {
  id: number;
  listing_id: string;
  model: string;
  verdict: "publish" | "hold" | "hide";
  confidence: number;
  reasons: string[];
  suggested_patch: SuggestedPatch;
  hide_reason: string | null;
  created_at: string;
}

export interface CurationStats {
  live: number;
  needs_review: number;
  needs_review_older_than_14d: number;
  new_this_week: number;
  agent_flagged: number;
}

export interface CurationFilters {
  status?: "all" | "published" | "needs_review" | "hidden";
  source_id?: string;
  island?: string;
  q?: string;
  price_min?: number;
  price_max?: number;
  first_seen_after?: string;
  flagged_hide?: boolean;
  limit?: number;
  offset?: number;
}
