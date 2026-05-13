// ============================================================
// AREI BROKER — Broker-safe types only
// NEVER include: reviewer_notes, reviewed_by, reviewed_at,
// source_ids, claimed_status, data_partner_status,
// agency_relationships, internal_notes, lead_quality,
// relationship_owner
// ============================================================

// Working product display name — final name TBD
export const PRODUCT_DISPLAY_NAME = "Listo by AREI";

export type ListingStatus = "active" | "reserved" | "sold" | "inactive";
export type PilotPublishStatus = "draft" | "ready_for_review" | "published" | "rejected";

/** Broker-safe agency profile. Excludes all admin-internal fields. */
export interface BrokerAgency {
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
  created_at: string;
  updated_at: string;
}

/**
 * Broker-safe pilot listing. Excludes admin-only review fields.
 * NEVER render reviewer_notes, reviewed_by, or reviewed_at in any broker surface.
 */
export interface BrokerListing {
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
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "viewing_booked"
  | "negotiating"
  | "lost"
  | "closed";

export type LeadSource = "form" | "whatsapp" | "manual" | "email";

export interface Lead {
  id: string;
  agency_id: string;
  listing_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  buyer_whatsapp: string | null;
  message: string | null;
  source: LeadSource;
  status: LeadStatus;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Quality check result for a pilot listing — one entry per check. */
export interface PilotQualityCheck {
  id: string;
  label: string;
  passed: boolean;
  severity: "required" | "recommended";
  detail?: string;
}

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_more_info";
