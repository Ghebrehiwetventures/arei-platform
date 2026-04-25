/**
 * Formatting helpers — match the v1 UI wiring contract.
 * These are pure functions, no SDK dependency.
 */

const NEW_LISTING_DAYS = 7;
const SOURCE_LABELS: Record<string, string> = {
  cv_simplycapeverde: "Simply Cape Verde",
  cv_terracaboverde: "Terra Cabo Verde",
  cv_homescasaverde: "Homes Casa Verde",
  cv_capeverdeproperty24: "Cape Verde Property 24",
  cv_gabetticasecapoverde: "Gabetti Case Cape Verde",
  cv_cabohouseproperty: "Cabo House Property",
  cv_estatecv: "Estate CV",
  cv_oceanproperty24: "Ocean Property 24",
  cv_capeverdepropertyuk: "Cape Verde Property UK",
  cv_ccoreinvestments: "CCore Investments",
  cv_rightmove: "Rightmove Overseas",
  cv_globallistings: "Global Listings",
  cv_properstar: "Properstar",
  cv_greenacres: "Green Acres",
};

export function formatPrice(
  price: number | null,
  currency: string | null | undefined = "EUR",
): string {
  if (!price || price <= 0) return "Price on request";
  const symbol = currency === "CVE" ? "CVE " : "€";
  return symbol + price.toLocaleString("en-US");
}

export function formatCompactPrice(price: number | null, currency = "EUR"): string {
  if (!price || price <= 0) return "Price on request";

  const symbol = currency === "CVE" ? "CVE " : "€";

  if (price >= 1_000_000) {
    return `${symbol}${(price / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }

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

export function formatPricePerSqm(value: number | null): string {
  if (value === null) return "—";
  return `€${Math.round(value).toLocaleString("en-US")}`;
}

export function formatSourceLabel(sourceId: string | null | undefined): string {
  if (!sourceId) return "Partner listing";
  return SOURCE_LABELS[sourceId]
    ?? sourceId
      .replace(/^[a-z]{2}_/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
}
