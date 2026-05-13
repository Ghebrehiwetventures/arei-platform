/**
 * Broker Pilot Workspace — data layer.
 *
 * Handles CRUD for broker_pilot_listings and quality check computation.
 * Uses the same Supabase anon client as the rest of the admin SPA.
 */

import { supabase } from "./supabase";
import type { Agency, PilotListing, PilotPublishStatus, PilotQualityCheck } from "./types";

const nowIso = () => new Date().toISOString();

// ── Quality checks ────────────────────────────────────────────────────────────

/**
 * Run the quality checklist against a pilot listing's fields.
 * Returns an array of check results — all checks, passed or failed.
 * Reuse this to render the live checklist in the intake form.
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
      detail: listing.price == null ? "Listings without a price are excluded from the public feed." : undefined,
    },
    {
      id: "photos",
      label: "At least 3 photos",
      passed: imgs.length >= 3,
      severity: "required",
      detail: imgs.length < 3
        ? `${imgs.length} photo${imgs.length === 1 ? "" : "s"} provided — 3 minimum required for quality listings.`
        : undefined,
    },
    {
      id: "location",
      label: "Location specified",
      passed: hasLocation,
      severity: "required",
      detail: hasLocation ? undefined : "Island or city is required for map placement and filtering.",
    },
    {
      id: "description",
      label: "Description (100+ characters)",
      passed: descLen >= 100,
      severity: "recommended",
      detail: descLen < 100
        ? `${descLen} characters — aim for 100+ to give buyers useful context.`
        : undefined,
    },
    {
      id: "sqm",
      label: "Property size (sqm)",
      passed: listing.property_size_sqm != null && listing.property_size_sqm > 0,
      severity: "recommended",
      detail: listing.property_size_sqm == null ? "Missing sqm reduces search accuracy and data quality score." : undefined,
    },
    {
      id: "contact",
      label: "Contact details",
      passed: hasContact,
      severity: "recommended",
      detail: hasContact ? undefined : "Email or phone ensures interested buyers can reach the agency.",
    },
  ];
}

/** Overall readiness: all required checks pass. */
export function isReadyForReview(listing: Parameters<typeof computePilotQualityChecks>[0]): boolean {
  return computePilotQualityChecks(listing)
    .filter((c) => c.severity === "required")
    .every((c) => c.passed);
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export type PilotListingInsert = Omit<
  PilotListing,
  "id" | "created_at" | "updated_at" | "reviewer_notes" | "reviewed_by" | "reviewed_at"
>;

export type PilotListingUpdate = Partial<PilotListingInsert>;

export async function getPilotListings(agencyId: string): Promise<PilotListing[]> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PilotListing[];
}

export async function createPilotListing(input: PilotListingInsert): Promise<PilotListing> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .insert({ ...input, created_at: nowIso(), updated_at: nowIso() })
    .select()
    .single();
  if (error) throw error;
  return data as PilotListing;
}

export async function updatePilotListing(id: string, input: PilotListingUpdate): Promise<PilotListing> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PilotListing;
}

/** Set publish_status. Optionally record reviewer context (admin-only). */
export async function setPilotListingStatus(
  id: string,
  status: PilotPublishStatus,
  opts?: { reviewer_notes?: string; reviewed_by?: string }
): Promise<PilotListing> {
  const now = nowIso();
  const patch: Record<string, unknown> = {
    publish_status: status,
    updated_at: now,
  };
  if (opts?.reviewer_notes !== undefined) patch.reviewer_notes = opts.reviewer_notes;
  if (opts?.reviewed_by !== undefined) patch.reviewed_by = opts.reviewed_by;
  if (status === "published" || status === "rejected") patch.reviewed_at = now;
  return updatePilotListing(id, patch as PilotListingUpdate);
}

// ── Agency helpers ─────────────────────────────────────────────────────────────

export async function getPilotAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select(
      "id,agency_name,public_display_name,contact_person,email,phone,whatsapp,logo_url,description,market_code,source_ids,claimed_status,data_partner_status,created_at,updated_at"
    )
    .order("agency_name");
  if (error) throw error;
  return (data ?? []) as Agency[];
}
