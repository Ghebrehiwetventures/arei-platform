// Shared per-listing extract-result application logic.
//
// Both orchestrators (core/ingestMarket.ts, scripts/ingest_to_curated.ts) had
// near-identical bodies for "given a listing and the detail-page extractResult,
// merge the new fields onto the listing." This module factors that body out.
//
// Caller-specific behaviors (deriveProjectMetadata, description_html fallback,
// title upgrade, enrichment-flag tracking) stay opt-in via ApplyOptions so
// path A and path B preserve their current observable behavior exactly.

import { dedupeImageUrls } from "../fetcher";

export interface EnrichableListing {
  id: string;
  sourceId: string;
  title?: string;
  price?: number;
  description?: string;
  description_html?: string;
  imageUrls?: string[];
  location?: string;
  detailUrl?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_type?: string;
  area_sqm?: number | null;
  parkingSpaces?: number | null;
  amenities?: string[];
}

export interface ExtractResultLike {
  success: boolean;
  title?: string;
  description?: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: string | null;
  parkingSpaces?: number | null;
  areaSqm?: number | null;
  amenities?: string[];
  imageUrls?: string[];
  location?: string;
}

export interface ApplyOptions {
  /** Strip description_html to plain text when extract description is short. (path A) */
  applyDescriptionHtmlFallback?: boolean;
  /** Overwrite title when extract title is longer. (path A) */
  applyTitleUpgrade?: boolean;
  /** Assign parkingSpaces when extracted. (path A) */
  applyParkingSpaces?: boolean;
}

const MIN_DESCRIPTION_LENGTH = 50;
const MIN_DETAIL_PRICE = 500;

/**
 * Merge extractResult fields onto listing. Returns true if any "enrichment"
 * signal was added (used by path A to set detail_enriched).
 */
export function applyExtractResultToListing(
  listing: EnrichableListing,
  extract: ExtractResultLike,
  options: ApplyOptions = {}
): boolean {
  let wasEnriched = false;

  // ── description ─────────────────────────────────────────────────────────
  let plainDescription = extract.description;
  if (
    options.applyDescriptionHtmlFallback &&
    (!plainDescription || plainDescription.length < MIN_DESCRIPTION_LENGTH) &&
    listing.description_html
  ) {
    const stripped = listing.description_html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (stripped.length >= MIN_DESCRIPTION_LENGTH) {
      plainDescription = stripped;
    }
  }
  if (plainDescription && plainDescription.length >= MIN_DESCRIPTION_LENGTH) {
    if (!listing.description || plainDescription.length > listing.description.length) {
      listing.description = plainDescription;
      wasEnriched = true;
    }
  }

  // ── structured fields ───────────────────────────────────────────────────
  if (extract.bedrooms !== undefined) listing.bedrooms = extract.bedrooms;
  if (extract.bathrooms !== undefined) listing.bathrooms = extract.bathrooms;
  if (extract.propertyType) listing.property_type = extract.propertyType;
  if (options.applyParkingSpaces && extract.parkingSpaces !== undefined) {
    listing.parkingSpaces = extract.parkingSpaces;
  }
  if (extract.areaSqm !== undefined) listing.area_sqm = extract.areaSqm;
  if (extract.amenities?.length) listing.amenities = extract.amenities;

  // ── price (only when listing had none and detail price is non-placeholder) ─
  if (extract.price && extract.price >= MIN_DETAIL_PRICE && !listing.price) {
    listing.price = extract.price;
    wasEnriched = true;
  }

  // ── title (path A only) ─────────────────────────────────────────────────
  if (options.applyTitleUpgrade && extract.title && extract.title.length > (listing.title?.length || 0)) {
    listing.title = extract.title;
  }

  // ── location (when listing has none) ────────────────────────────────────
  if (extract.location && !listing.location) {
    listing.location = extract.location;
    wasEnriched = true;
  }

  // ── image merge ─────────────────────────────────────────────────────────
  if (extract.imageUrls?.length) {
    const merged = [...(listing.imageUrls || []), ...extract.imageUrls];
    const deduped = dedupeImageUrls(merged);
    if (deduped.length !== (listing.imageUrls || []).length) {
      wasEnriched = true;
    }
    listing.imageUrls = deduped;
  }

  return wasEnriched;
}
