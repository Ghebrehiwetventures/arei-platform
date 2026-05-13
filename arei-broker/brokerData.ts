/**
 * AREI Broker — data layer.
 *
 * Broker-safe CRUD for listings, agencies, and leads.
 * All selects use explicit column lists — no SELECT * — to prevent
 * accidental exposure of admin-only fields.
 */

import { supabase } from "./supabase";
import type {
  BrokerAgency,
  BrokerListing,
  Lead,
  PilotPublishStatus,
  PilotQualityCheck,
} from "./types";

const nowIso = () => new Date().toISOString();

// ── Column selectors ─────────────────────────────────────────────────────────

const BROKER_AGENCY_COLS =
  "id,agency_name,public_display_name,contact_person,website,email,phone,whatsapp,logo_url,description,market_code,created_at,updated_at";

const BROKER_LISTING_COLS =
  "id,agency_id,market_code,title,price,currency,property_type,island,city,bedrooms,bathrooms,property_size_sqm,description,image_urls,source_url,contact_name,contact_email,contact_phone,publish_status,created_at,updated_at";

const LEAD_COLS =
  "id,agency_id,listing_id,buyer_name,buyer_phone,buyer_email,buyer_whatsapp,message,source,status,follow_up_date,notes,created_at,updated_at";

// ── Quality hints ────────────────────────────────────────────────────────────

export function computeListingHints(listing: Partial<BrokerListing>): PilotQualityCheck[] {
  const imgs = listing.image_urls ?? [];
  const hasLocation = !!(listing.island || listing.city);
  const descLen = (listing.description ?? "").trim().length;
  return [
    {
      id: "price",
      label: "Price included",
      passed: listing.price != null && listing.price > 0,
      severity: "required",
      detail: "Listings without a price have lower visibility.",
    },
    {
      id: "photos",
      label: "At least 3 photos",
      passed: imgs.length >= 3,
      severity: "required",
      detail: `${imgs.length} photo${imgs.length === 1 ? "" : "s"} — add at least 3 for better visibility.`,
    },
    {
      id: "location",
      label: "Location specified",
      passed: hasLocation,
      severity: "required",
      detail: "Island or city is required for buyers to find the listing.",
    },
    {
      id: "description",
      label: "Description (100+ characters)",
      passed: descLen >= 100,
      severity: "recommended",
      detail: `${descLen} characters — aim for 100+ to give buyers useful context.`,
    },
    {
      id: "sqm",
      label: "Property size (sqm)",
      passed: listing.property_size_sqm != null && listing.property_size_sqm > 0,
      severity: "recommended",
      detail: "Size in sqm helps buyers compare properties.",
    },
  ];
}

export function isReadyForReview(listing: Partial<BrokerListing>): boolean {
  return computeListingHints(listing)
    .filter((c) => c.severity === "required")
    .every((c) => c.passed);
}

// ── Agency helpers ────────────────────────────────────────────────────────────

export async function getBrokerAgencies(): Promise<BrokerAgency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select(BROKER_AGENCY_COLS)
    .order("agency_name");
  if (error) throw error;
  return (data ?? []) as BrokerAgency[];
}

export async function getBrokerAgency(id: string): Promise<BrokerAgency | null> {
  const { data, error } = await supabase
    .from("agencies")
    .select(BROKER_AGENCY_COLS)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as BrokerAgency;
}

export async function updateBrokerAgency(
  id: string,
  patch: Partial<
    Pick<
      BrokerAgency,
      | "public_display_name"
      | "contact_person"
      | "email"
      | "phone"
      | "whatsapp"
      | "description"
      | "logo_url"
      | "website"
    >
  >
): Promise<BrokerAgency> {
  const { data, error } = await supabase
    .from("agencies")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id)
    .select(BROKER_AGENCY_COLS)
    .single();
  if (error) throw error;
  return data as BrokerAgency;
}

// ── Listing helpers ───────────────────────────────────────────────────────────

export async function getBrokerListings(agencyId: string): Promise<BrokerListing[]> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .select(BROKER_LISTING_COLS)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BrokerListing[];
}

export async function getBrokerListing(id: string): Promise<BrokerListing | null> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .select(BROKER_LISTING_COLS)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as BrokerListing;
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
  patch: Partial<
    Omit<BrokerListing, "id" | "agency_id" | "market_code" | "created_at" | "updated_at">
  >
): Promise<BrokerListing> {
  const { data, error } = await supabase
    .from("broker_pilot_listings")
    .update({ ...patch, updated_at: nowIso() })
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

// ── Lead helpers ──────────────────────────────────────────────────────────────

export async function getLeads(agencyId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLS)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLS)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Lead;
}

export async function createLead(
  input: Omit<Lead, "id" | "created_at" | "updated_at">
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input, created_at: nowIso(), updated_at: nowIso() })
    .select(LEAD_COLS)
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Omit<Lead, "id" | "agency_id" | "created_at" | "updated_at">>
): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", id)
    .select(LEAD_COLS)
    .single();
  if (error) throw error;
  return data as Lead;
}
