/**
 * AREI Broker — data layer.
 *
 * Broker-safe CRUD for pilot listings, agencies, and submissions.
 * All selects use explicit column lists — no SELECT * — to prevent
 * accidental exposure of admin-only fields.
 */

import { supabase } from "./supabase";
import type {
  BrokerAgency,
  BrokerListing,
  BrokerSubmission,
  PilotPublishStatus,
  PilotQualityCheck,
} from "./types";

const nowIso = () => new Date().toISOString();

// ── Quality checks ────────────────────────────────────────────────────────────

/**
 * Run the quality checklist against a pilot listing's fields.
 * Returns an array of check results — all checks, passed or failed.
 */
export function computePilotQualityChecks(listing: {
  title?: string;
  price?: number | null;
  description?: string | null;
  image_urls?: string[];
  island?: string | null;
  city?: string | null;
  property_size_sqm?: number | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}): PilotQualityCheck[] {
  const imgs = listing.image_urls ?? [];
  const hasLocation = !!(listing.island || listing.city);
  const descLen = (listing.description ?? "").trim().length;
  const hasContact = !!(listing.contact_email || listing.contact_phone);

  return [
    {
      id: "price",
      label: "Price included",
      passed: listing.price != null && listing.price > 0,
      severity: "required",
      detail:
        listing.price == null
          ? "Listings without a price are excluded from the public feed."
          : undefined,
    },
    {
      id: "photos",
      label: "At least 3 photos",
      passed: imgs.length >= 3,
      severity: "required",
      detail:
        imgs.length < 3
          ? `${imgs.length} photo${imgs.length === 1 ? "" : "s"} provided — 3 minimum required for quality listings.`
          : undefined,
    },
    {
      id: "location",
      label: "Location specified",
      passed: hasLocation,
      severity: "required",
      detail: hasLocation
        ? undefined
        : "Island or city is required for map placement and filtering.",
    },
    {
      id: "description",
      label: "Description (100+ characters)",
      passed: descLen >= 100,
      severity: "recommended",
      detail:
        descLen < 100
          ? `${descLen} characters — aim for 100+ to give buyers useful context.`
          : undefined,
    },
    {
      id: "sqm",
      label: "Property size (sqm)",
      passed: listing.property_size_sqm != null && listing.property_size_sqm > 0,
      severity: "recommended",
      detail:
        listing.property_size_sqm == null
          ? "Missing sqm reduces search accuracy and data quality score."
          : undefined,
    },
    {
      id: "contact",
      label: "Contact details",
      passed: hasContact,
      severity: "recommended",
      detail: hasContact
        ? undefined
        : "Email or phone ensures interested buyers can reach the agency.",
    },
  ];
}

/** Overall readiness: all required checks pass. */
export function isReadyForReview(
  listing: Parameters<typeof computePilotQualityChecks>[0]
): boolean {
  return computePilotQualityChecks(listing)
    .filter((c) => c.severity === "required")
    .every((c) => c.passed);
}

// ── Agency helpers ─────────────────────────────────────────────────────────────

const BROKER_AGENCY_COLS =
  "id,agency_name,public_display_name,contact_person,website,email,phone,whatsapp,logo_url,description,market_code,created_at,updated_at";

export async function getBrokerAgencies(): Promise<BrokerAgency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select(BROKER_AGENCY_COLS)
    .order("agency_name");
  if (error) throw error;
  return (data ?? []) as BrokerAgency[];
}

export async function getBrokerAgency(agencyId: string): Promise<BrokerAgency | null> {
  const { data, error } = await supabase
    .from("agencies")
    .select(BROKER_AGENCY_COLS)
    .eq("id", agencyId)
    .single();
  if (error) return null;
  return data as BrokerAgency;
}

// ── Listing helpers ────────────────────────────────────────────────────────────

const BROKER_LISTING_COLS =
  "id,agency_id,market_code,title,price,currency,property_type,island,city,bedrooms,bathrooms,property_size_sqm,description,image_urls,source_url,contact_name,contact_email,contact_phone,publish_status,created_at,updated_at";

export async function getBrokerListings(agencyId: string): Promise<BrokerListing[]> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .select(BROKER_LISTING_COLS)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrokerListing[];
}

export async function createBrokerListing(
  input: Omit<BrokerListing, "id" | "created_at" | "updated_at">
): Promise<BrokerListing> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .insert({ ...input, created_at: nowIso(), updated_at: nowIso() })
    .select(BROKER_LISTING_COLS)
    .single();
  if (error) throw error;
  return data as BrokerListing;
}

export async function updateBrokerListing(
  id: string,
  input: Partial<
    Omit<BrokerListing, "id" | "agency_id" | "market_code" | "created_at" | "updated_at">
  >
): Promise<BrokerListing> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select(BROKER_LISTING_COLS)
    .single();
  if (error) throw error;
  return data as BrokerListing;
}

export async function submitListingForReview(id: string): Promise<BrokerListing> {
  return updateBrokerListing(id, {
    publish_status: "ready_for_review" as PilotPublishStatus,
  });
}

// ── Submission helpers ─────────────────────────────────────────────────────────

const BROKER_SUBMISSION_COLS =
  "id,agency_id,listing_id,submission_type,status,payload,submitted_at,created_at,updated_at";

export async function getBrokerSubmissions(agencyId: string): Promise<BrokerSubmission[]> {
  const { data, error } = await supabase
    .from("agency_listing_submissions")
    .select(BROKER_SUBMISSION_COLS)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrokerSubmission[];
}
