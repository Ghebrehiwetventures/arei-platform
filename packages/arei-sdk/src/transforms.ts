// =============================================================================
// arei-sdk/src/transforms.ts
// Convert raw DB rows to UI-safe types
// =============================================================================

import {
  PRICE_CEILING,
  PRICE_FLOOR,
  type ListingRow,
  type ListingCard,
  type ListingDetail,
} from "./types.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isNew(firstSeenAt: string): boolean {
  const seen = new Date(firstSeenAt).getTime();
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  return seen > cutoff;
}

function sanitizePrice(price: number | null): number | null {
  if (price == null) return null;
  if (price < PRICE_FLOOR || price > PRICE_CEILING) return null;
  return price;
}

/** Raw row → ListingCard (for grids) */
export function toListingCard(row: ListingRow): ListingCard {
  const imageUrls = row.image_urls ?? [];
  return {
    id: row.id,
    title: row.title,
    island: row.island,
    city: row.city,
    price: sanitizePrice(row.price),
    currency: row.currency,
    property_type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    land_area_sqm: row.land_area_sqm,
    image_urls: imageUrls,
    image_url: imageUrls[0] ?? null,
    source_id: row.source_id,
    first_seen_at: row.first_seen_at,
    is_new: isNew(row.first_seen_at),
  };
}

/** Raw row → ListingDetail (for detail page) */
export function toListingDetail(row: ListingRow): ListingDetail {
  return {
    id: row.id,
    title: row.title,
    island: row.island,
    city: row.city,
    price: sanitizePrice(row.price),
    currency: row.currency,
    property_type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    land_area_sqm: row.land_area_sqm,
    property_size_sqm: row.property_size_sqm,
    description: row.description,
    description_html: row.description_html,
    image_urls: row.image_urls ?? [],
    source_id: row.source_id,
    source_url: row.source_url,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    is_new: isNew(row.first_seen_at),
  };
}
