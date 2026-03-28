import { getSupabaseClient } from "./supabaseClient";
import { isValidSourceUrl } from "./goldenRules";
import { getCanonicalId } from "./canonicalId";
import { normalizeUrl } from "./normalizeUrl";
import * as crypto from "crypto";

export interface SupabaseListing {
  id: string;
  source_id: string;
  source_url: string | null;
  source_ref?: string | null;
  title?: string;
  description?: string;
  description_html?: string;
  price?: number;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  currency: string;
  island?: string;
  city?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
  image_urls: string[];
  status: string;
  violations: string[];
  approved: boolean;
  dedup_key?: string;
  country?: string;
  property_type?: string;
  amenities?: string[];
  price_period?: string;
  canonical_id?: string | null;
  source_url_normalized?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  is_superseded?: boolean;
  price_status?: string;
  location_confidence?: string;
  has_valid_image?: boolean;
  cover_image_url?: string | null;
  cover_image_hash?: string | null;
  duplicate_risk?: string;
  identity_fingerprint?: string | null;
  cross_source_match_key?: string | null;
  canonical_listing_id?: string | null;
  trust_tier?: string;
  trust_gate_passed?: boolean;
  indexable?: boolean;
  review_reasons?: string[];
  multi_domain_gallery?: boolean;
}

function makeDedupKey(title?: string, price?: number, url?: string | null): string {
  const t = (title || "").toLowerCase().trim();
  const p = price && price > 0 ? Math.round(price).toString() : "";
  const u = (url || "").split("?")[0].toLowerCase().replace(/\/+$/, "");
  return crypto.createHash("sha256").update(`${t}|${p}|${u}`).digest("hex").slice(0, 16);
}

export async function upsertListings(listings: SupabaseListing[]): Promise<void> {
  if (listings.length === 0) return;

  const supabase = getSupabaseClient();

  const nowIso = new Date().toISOString();

  for (const l of listings) {
    if (!isValidSourceUrl(l.source_url)) {
      l.source_url = null;
      if (!l.violations.includes("MISSING_SOURCE_URL")) {
        l.violations.push("MISSING_SOURCE_URL");
      }
      l.approved = false;
    }

    if (!l.dedup_key) {
      l.dedup_key = makeDedupKey(l.title, l.price, l.source_url);
    }

    l.canonical_id = getCanonicalId(l.source_id, l.source_url, l.id);
    l.source_url_normalized = l.source_url != null ? normalizeUrl(l.source_url) : null;
    l.last_seen_at = nowIso;
    l.is_superseded = false;
  }

  // Deduplicate by id only.
  // Legacy dedup_key is now informational; trust-stage canonicalization controls
  // publishability and duplicate handling.
  const byId = new Map(listings.map((l) => [l.id, l]));
  const uniqueListings = Array.from(byId.values());
  const idDupes = listings.length - byId.size;

  const { error } = await supabase
    .from("listings")
    .upsert(uniqueListings, { onConflict: "id" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`[Supabase] Upserted ${uniqueListings.length} listings (${idDupes} id dupes removed)`);
}
