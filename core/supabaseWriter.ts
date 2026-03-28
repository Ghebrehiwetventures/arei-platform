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

  // Deduplicate by id, then by dedup_key (keep first seen)
  const byId = new Map(listings.map((l) => [l.id, l]));
  const byKey = new Map<string, SupabaseListing>();
  for (const l of byId.values()) {
    if (!byKey.has(l.dedup_key!)) byKey.set(l.dedup_key!, l);
  }
  const uniqueListings = Array.from(byKey.values());
  const idDupes = listings.length - byId.size;
  const keyDupes = byId.size - uniqueListings.length;

  const { error } = await supabase
    .from("listings")
    .upsert(uniqueListings, { onConflict: "id" });

  if (error) {
    if (error.message.includes("dedup_key")) {
      console.warn(`[Supabase] dedup_key conflict — upserting individually`);
      for (const l of uniqueListings) {
        const { error: e } = await supabase.from("listings").upsert(l, { onConflict: "id" });
        if (e && !e.message.includes("dedup_key")) {
          console.error(`[Supabase] Failed ${l.id}: ${e.message}`);
        }
      }
    } else {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }

  console.log(`[Supabase] Upserted ${uniqueListings.length} listings (${idDupes} id dupes, ${keyDupes} dedup_key dupes removed)`);
}
