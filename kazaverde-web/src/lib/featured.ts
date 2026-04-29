import type { DemoListing } from "./demo-data";

const SCREENSHOT_HINTS = ["screenshot", "screen-shot", "capture", "overlay"];
const PLACEHOLDER_HINTS = ["placeholder", "logo", "watermark", "default", "no-image", "coming-soon"];
const LAND_HINTS = ["land", "plot", "lot", "lote", "terreno", "terrenos", "parcela", "parcel", "terrain"];
const PREFERRED_TYPES = ["apartment", "villa", "house", "penthouse", "townhouse", "duplex"];

function hasAnyHint(value: string, hints: string[]): boolean {
  return hints.some((hint) => value.includes(hint));
}

function scoreImage(url: string | undefined): number {
  if (!url) return -100;

  const lower = url.toLowerCase();
  let score = 60;

  const dimensions = lower.match(/(\d{3,4})[x_-](\d{3,4})/);
  if (dimensions) {
    const width = Number(dimensions[1]);
    const height = Number(dimensions[2]);
    const shortestSide = Math.min(width, height);
    const ratio = width / height;

    if (shortestSide >= 1200) score += 20;
    else if (shortestSide >= 800) score += 12;
    else if (shortestSide < 500) score -= 10;

    if (ratio > 3 || ratio < 0.33) score -= 12;
    else if (ratio >= 0.75 && ratio <= 1.8) score += 6;
  }

  if (hasAnyHint(lower, SCREENSHOT_HINTS)) score -= 20;
  if (hasAnyHint(lower, PLACEHOLDER_HINTS)) score -= 30;

  return score;
}

function normalizePropertyType(listing: DemoListing): string {
  const type = (listing.property_type ?? "").trim().toLowerCase();
  const title = (listing.title ?? "").trim().toLowerCase();

  if (LAND_HINTS.includes(type) || LAND_HINTS.some((hint) => title.includes(hint))) {
    return "land";
  }

  return type || "unknown";
}

function hasValidFeaturedType(listing: DemoListing): boolean {
  const propertyType = normalizePropertyType(listing);
  return propertyType !== "unknown" && propertyType !== "land";
}

function hasCoreResidentialData(listing: DemoListing): boolean {
  return listing.bedrooms != null && listing.bathrooms != null;
}

function isRepresentativeFeaturedListing(listing: DemoListing): boolean {
  return (
    listing.image_urls.length > 0 &&
    hasValidFeaturedType(listing) &&
    Boolean(listing.price) &&
    Boolean(listing.city) &&
    hasCoreResidentialData(listing)
  );
}

function scoreListing(listing: DemoListing): number {
  const imageScore = scoreImage(listing.image_urls[0]);
  let score = imageScore;

  if (listing.price) score += 8;
  if (listing.bedrooms != null) score += 3;
  if (listing.bathrooms != null) score += 3;
  if (listing.property_size_sqm != null) score += 3;
  if (listing.land_area_sqm != null) score += 2;
  if (listing.city) score += 3;

  const propertyType = normalizePropertyType(listing);
  if (propertyType === "land") score -= 8;

  const seenAt = listing.first_seen_at ? new Date(listing.first_seen_at).getTime() : 0;
  if (seenAt > 0) {
    const ageDays = (Date.now() - seenAt) / 86400000;
    score += Math.max(0, 10 - ageDays);
  }

  return score;
}

/** Categories the home page wants represented, in order of preference.
 *  Three featured slots → one apartment + one villa + one house. If a
 *  category has zero eligible listings the slot is filled by the next
 *  best representative listing of any preferred type. */
const FEATURED_CATEGORIES = ["apartment", "villa", "house"] as const;

export function selectFeaturedListings(listings: DemoListing[], limit = 3): DemoListing[] {
  const eligible = listings.filter(isRepresentativeFeaturedListing);

  const ranked = eligible
    .map((listing) => ({
      listing,
      score: scoreListing(listing),
      propertyType: normalizePropertyType(listing),
    }))
    .map((entry) => ({
      ...entry,
      score: entry.score + (PREFERRED_TYPES.includes(entry.propertyType) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const picked: typeof ranked = [];
  const usedIslands = new Set<string>();
  const usedIds = new Set<string>();

  // Pass 1 — one per featured category, in declared order. Within each
  // category we also try to keep islands distinct, so the row reads as
  // a spread of the market rather than three Sal villas.
  for (const category of FEATURED_CATEGORIES) {
    if (picked.length >= limit) break;
    const pickForCategory =
      ranked.find(
        (c) =>
          c.propertyType === category &&
          c.score >= 0 &&
          !usedIds.has(c.listing.id) &&
          !usedIslands.has(c.listing.island),
      ) ??
      // Fall back to ignoring island diversity if every match is on the
      // same island as an earlier pick.
      ranked.find(
        (c) => c.propertyType === category && c.score >= 0 && !usedIds.has(c.listing.id),
      );
    if (pickForCategory) {
      picked.push(pickForCategory);
      usedIds.add(pickForCategory.listing.id);
      usedIslands.add(pickForCategory.listing.island);
    }
  }

  // Pass 2 — fill remaining slots if a category had no eligible listings.
  for (const candidate of ranked) {
    if (picked.length >= limit) break;
    if (candidate.score < 0) continue;
    if (usedIds.has(candidate.listing.id)) continue;
    picked.push(candidate);
    usedIds.add(candidate.listing.id);
  }

  return picked.map((entry) => entry.listing);
}

