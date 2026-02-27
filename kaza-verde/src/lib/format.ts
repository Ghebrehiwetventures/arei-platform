/**
 * Formatting helpers — match the v1 UI wiring contract.
 * These are pure functions, no SDK dependency.
 */

const NEW_LISTING_DAYS = 7;

export function formatPrice(price: number | null, currency = "EUR"): string {
  if (!price || price <= 0) return "Price on request";
  const symbol = currency === "CVE" ? "CVE " : "€";
  return symbol + price.toLocaleString("en-US");
}

export function formatLocation(city: string | null, island: string): string {
  return city ? `${city}, ${island}` : island;
}

export function formatBedrooms(bedrooms: number | null): string | null {
  if (bedrooms === null || bedrooms === undefined) return null;
  if (bedrooms === 0) return "Studio";
  return `${bedrooms} Bed`;
}

export function formatBathrooms(bathrooms: number | null): string | null {
  if (!bathrooms || bathrooms <= 0) return null;
  return `${bathrooms} Bath`;
}

export function isNewListing(firstSeenAt: string | null): boolean {
  if (!firstSeenAt) return false;
  const diff = Date.now() - new Date(firstSeenAt).getTime();
  return diff < NEW_LISTING_DAYS * 86400000;
}

export function formatMedian(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1000) return `€${Math.round(value / 1000)}K`;
  return `€${value.toLocaleString("en-US")}`;
}
