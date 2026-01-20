import * as crypto from "crypto";

/**
 * Normalizes a string for canonical ID generation
 * - Lowercases
 * - Removes accents/diacritics
 * - Removes extra whitespace
 * - Removes special characters
 */
function normalizeString(str: string | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s]/g, "") // Keep only alphanumeric and spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes price to integer (removes decimals, rounds)
 */
function normalizePrice(price: number | undefined): string {
  if (price === undefined || price <= 0) return "";
  return Math.round(price).toString();
}

/**
 * Generates a canonical ID for deduplication across sources
 *
 * Formula: hash(source_id + normalized_title + normalized_price + normalized_location)
 *
 * This allows detection of the same property listed on multiple sites.
 */
export function generateCanonicalId(
  sourceId: string,
  title: string | undefined,
  price: number | undefined,
  location: string | undefined
): string {
  const normalizedTitle = normalizeString(title);
  const normalizedPrice = normalizePrice(price);
  const normalizedLocation = normalizeString(location);

  // Combine components with pipe separator
  const input = [
    sourceId,
    normalizedTitle,
    normalizedPrice,
    normalizedLocation,
  ].join("|");

  // Generate SHA-256 hash and take first 16 characters
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Generates a cross-source canonical ID for detecting duplicates across different sources
 *
 * Does NOT include sourceId, so the same property on different sites will match
 */
export function generateCrossSourceCanonicalId(
  title: string | undefined,
  price: number | undefined,
  location: string | undefined
): string {
  const normalizedTitle = normalizeString(title);
  const normalizedPrice = normalizePrice(price);
  const normalizedLocation = normalizeString(location);

  // Only use property attributes, not source
  const input = [
    normalizedTitle,
    normalizedPrice,
    normalizedLocation,
  ].join("|");

  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

/**
 * Checks if two listings are likely duplicates based on their attributes
 */
export function areLikelyDuplicates(
  listing1: { title?: string; price?: number; location?: string },
  listing2: { title?: string; price?: number; location?: string }
): boolean {
  const id1 = generateCrossSourceCanonicalId(
    listing1.title,
    listing1.price,
    listing1.location
  );
  const id2 = generateCrossSourceCanonicalId(
    listing2.title,
    listing2.price,
    listing2.location
  );
  return id1 === id2;
}
