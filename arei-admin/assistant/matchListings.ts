// Score and rank listings against a buyer intent, while being honest about
// missing data: a listing whose price is null does not "satisfy" maxPrice —
// it's unknown. Such listings are bucketed as partial/possible matches and
// only their verified attributes are surfaced as match reasons.

import type { Listing } from "../types";
import type {
  BuyerIntent,
  ListingMatch,
  MatchConfidence,
  PropertyTypeIntent,
} from "./types";

const TYPE_KEYWORDS: Record<PropertyTypeIntent, string[]> = {
  apartment: ["apartment", "flat", "condo", "studio"],
  villa: ["villa"],
  house: ["house", "home", "townhouse", "moradia"],
  land: ["land", "plot", "terreno", "lote"],
  commercial: ["commercial", "office", "shop", "retail"],
  studio: ["studio"],
};

const HOLIDAY_TERMS = [
  "holiday",
  "beach",
  "beachfront",
  "sea view",
  "ocean view",
  "resort",
  "porto antigo",
  "leme bedje",
];

type ConstraintState = "verified" | "violated" | "unknown";

function listingText(listing: Listing): string {
  return [listing.title, listing.description, listing.city, listing.island]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function listingTypeState(
  listing: Listing,
  want: PropertyTypeIntent
): ConstraintState {
  const haystack = [listing.property_type, listing.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return "unknown";
  // Special case: land is detectable by title even when property_type is null.
  if (TYPE_KEYWORDS[want].some((kw) => haystack.includes(kw))) return "verified";
  // If property_type field is set and disagrees, treat as violated.
  if (listing.property_type) return "violated";
  // If title exists but no type keyword and no property_type field, unknown.
  return "unknown";
}

function listingMatchesKeyword(listing: Listing, kw: string): boolean {
  return listingText(listing).includes(kw.toLowerCase());
}

function eq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export interface MatchOptions {
  /** How many to return. Default 5. */
  limit?: number;
  /** Only consider listings where approved !== false. Default true. */
  approvedOnly?: boolean;
}

interface Evaluated {
  match: ListingMatch;
  /** Number of constraints actively verified (used for ranking). */
  verifiedCount: number;
}

function hasHolidayIntent(intent: BuyerIntent): boolean {
  return intent.keywords.some((kw) =>
    ["holiday", "beach", "beachfront", "sea view", "ocean view", "resort"].includes(kw)
  );
}

function holidayRelevanceScore(listing: Listing, intent: BuyerIntent): number {
  if (!hasHolidayIntent(intent)) return 0;
  const haystack = listingText(listing);
  let bonus = 0;
  for (const term of HOLIDAY_TERMS) {
    if (haystack.includes(term)) bonus += 0.45;
  }
  if (intent.island === "Sal" && listing.city && eq(listing.city, "Santa Maria")) {
    bonus += 0.8;
  }
  if (intent.island === "Boa Vista" && listing.city && eq(listing.city, "Sal Rei")) {
    bonus += 0.6;
  }
  return Math.min(bonus, 2.2);
}

function broadSearchPriceScore(listing: Listing, intent: BuyerIntent): number {
  if (intent.selector || intent.maxPrice != null || intent.minPrice != null || intent.preferLowPrice) {
    return 0;
  }
  if (listing.price == null) return -0.2;
  if (listing.price > 1_500_000) return -1.6;
  if (listing.price > 900_000) return -0.8;
  if (listing.price >= 75_000 && listing.price <= 450_000) return 0.45;
  return 0.1;
}

function evaluateListing(listing: Listing, intent: BuyerIntent): Evaluated | null {
  const reasons: string[] = [];
  const unknownFields: string[] = [];
  let score = 0;
  let verified = 0;

  // Bedrooms don't apply to land — never count missing bedrooms against it.
  const bedroomsApplies =
    intent.minBedrooms != null && intent.propertyType !== "land";

  // ── island ──────────────────────────────────────────────────────────
  if (intent.island) {
    if (listing.island && eq(listing.island, intent.island)) {
      score += 3;
      reasons.push(`on ${listing.island}`);
      verified++;
    } else if (listing.island) {
      return null; // violated
    } else {
      unknownFields.push("island");
    }
  }

  // ── city ────────────────────────────────────────────────────────────
  if (intent.city) {
    if (listing.city && eq(listing.city, intent.city)) {
      score += 2;
      reasons.push(`in ${listing.city}`);
      verified++;
    } else if (listing.city) {
      // soft penalty for wrong city — many sources don't normalize city well
      score -= 0.3;
    } else {
      unknownFields.push("city");
    }
  }

  // ── property type ───────────────────────────────────────────────────
  if (intent.propertyType) {
    const state = listingTypeState(listing, intent.propertyType);
    if (state === "verified") {
      score += 2;
      reasons.push(intent.propertyType);
      verified++;
    } else if (state === "violated") {
      return null;
    } else {
      unknownFields.push("property_type");
    }
  }

  // ── max price ───────────────────────────────────────────────────────
  if (intent.maxPrice != null) {
    if (listing.price != null) {
      if (listing.price <= intent.maxPrice) {
        score += 1.5;
        reasons.push(`under €${formatPrice(intent.maxPrice)}`);
        verified++;
      } else {
        return null; // priced above ceiling
      }
    } else {
      unknownFields.push("price");
    }
  }

  // ── min price ───────────────────────────────────────────────────────
  if (intent.minPrice != null && listing.price != null && listing.price < intent.minPrice) {
    return null;
  }

  // ── min bedrooms ────────────────────────────────────────────────────
  if (bedroomsApplies) {
    if (listing.bedrooms != null) {
      if (listing.bedrooms >= (intent.minBedrooms ?? 0)) {
        score += 1;
        reasons.push(`${listing.bedrooms}-bed`);
        verified++;
      } else {
        return null;
      }
    } else {
      unknownFields.push("bedrooms");
    }
  }

  // ── min size sqm ────────────────────────────────────────────────────
  if (intent.minSizeSqm != null) {
    if (listing.area_sqm != null) {
      if (listing.area_sqm >= intent.minSizeSqm) {
        score += 1;
        reasons.push(`${listing.area_sqm} sqm`);
        verified++;
      } else {
        return null;
      }
    } else {
      unknownFields.push("size");
    }
  }

  // ── keywords (soft) ─────────────────────────────────────────────────
  for (const kw of intent.keywords) {
    if (listingMatchesKeyword(listing, kw)) {
      score += 0.8;
      reasons.push(kw);
      verified++;
    }
    // Missing keyword evidence is not "unknown" in a load-bearing way —
    // many listings just have sparse descriptions.
  }

  // Completeness bonus
  let completeness = 0;
  if (listing.title) completeness += 0.2;
  if (listing.price != null) completeness += 0.3;
  if (listing.island || listing.city) completeness += 0.2;
  if (listing.images && listing.images.length > 0) completeness += 0.2;
  if (listing.sourceUrl) completeness += 0.1;
  score += completeness;

  score += holidayRelevanceScore(listing, intent);
  score += broadSearchPriceScore(listing, intent);

  // Penalize each unknown applicable constraint.
  score -= unknownFields.length * 0.4;

  // Determine confidence bucket.
  const applicableCount =
    (intent.island ? 1 : 0) +
    (intent.propertyType ? 1 : 0) +
    (intent.maxPrice != null ? 1 : 0) +
    (bedroomsApplies ? 1 : 0) +
    (intent.minSizeSqm != null ? 1 : 0);
  // city and keywords count toward verified but are soft and not required
  // for the strong/partial split.

  let confidence: MatchConfidence;
  if (unknownFields.length === 0) {
    confidence = "strong";
  } else if (verified > 0) {
    confidence = "partial";
  } else if (applicableCount > 0) {
    confidence = "possible";
  } else {
    // No applicable constraints at all — treat as strong (the user gave
    // no filters to fail).
    confidence = "strong";
  }

  const pricePerSqm =
    listing.price != null && listing.area_sqm != null && listing.area_sqm > 0
      ? Math.round(listing.price / listing.area_sqm)
      : null;

  return {
    match: {
      listing,
      score,
      reasons,
      pricePerSqm,
      confidence,
      unknownFields,
    },
    verifiedCount: verified,
  };
}

const CONFIDENCE_RANK: Record<MatchConfidence, number> = {
  strong: 0,
  partial: 1,
  possible: 2,
};

export function matchListings(
  listings: Listing[],
  intent: BuyerIntent,
  opts: MatchOptions = {}
): ListingMatch[] {
  const limit = opts.limit ?? 5;
  const approvedOnly = opts.approvedOnly ?? true;

  const evaluated: Evaluated[] = [];
  for (const l of listings) {
    if (approvedOnly && l.approved === false) continue;
    const e = evaluateListing(l, intent);
    if (e) evaluated.push(e);
  }

  // Selector: pick a single listing by price extreme, considering only
  // listings with a known price (and otherwise satisfying all hard filters).
  if (intent.selector) {
    const priced = evaluated.filter((e) => e.match.listing.price != null);
    priced.sort((a, b) => {
      const pa = a.match.listing.price as number;
      const pb = b.match.listing.price as number;
      return intent.selector === "most_expensive" ? pb - pa : pa - pb;
    });
    const top = priced.slice(0, opts.limit ?? 1);
    for (const e of top) {
      const label =
        intent.selector === "most_expensive"
          ? "highest price among matches"
          : "lowest price among matches";
      if (!e.match.reasons.includes(label)) e.match.reasons.unshift(label);
    }
    return top.map((e) => e.match);
  }

  evaluated.sort((a, b) => {
    const ca = CONFIDENCE_RANK[a.match.confidence];
    const cb = CONFIDENCE_RANK[b.match.confidence];
    if (ca !== cb) return ca - cb;
    if (a.match.score !== b.match.score) return b.match.score - a.match.score;
    if (intent.preferLowPrice) {
      const ap = a.match.listing.price ?? Number.POSITIVE_INFINITY;
      const bp = b.match.listing.price ?? Number.POSITIVE_INFINITY;
      if (ap !== bp) return ap - bp;
    }
    return 0;
  });

  // Trim partial/possible if we already have enough strong matches.
  const strong = evaluated.filter((e) => e.match.confidence === "strong");
  if (strong.length >= limit) {
    return strong.slice(0, limit).map((e) => e.match);
  }
  return evaluated.slice(0, limit).map((e) => e.match);
}

/**
 * Identify the constraint most likely responsible for a zero-match result.
 * Returned as a human-readable suggestion to relax.
 */
export function diagnoseEmpty(
  listings: Listing[],
  intent: BuyerIntent
): string | null {
  if (listings.length === 0) return null;

  const trials: Array<{ key: keyof BuyerIntent; label: string }> = [
    { key: "maxPrice", label: "raising the budget" },
    { key: "minBedrooms", label: "reducing the minimum bedrooms" },
    { key: "minSizeSqm", label: "lowering the minimum size" },
    { key: "city", label: "broadening from the city to the whole island" },
    { key: "propertyType", label: "considering other property types" },
    { key: "island", label: "looking at other islands" },
  ];

  for (const t of trials) {
    if ((intent as unknown as Record<string, unknown>)[t.key] == null) continue;
    const relaxed: BuyerIntent = { ...intent, keywords: [...intent.keywords] };
    delete (relaxed as unknown as Record<string, unknown>)[t.key];
    const m = matchListings(listings, relaxed, { limit: 1 });
    if (m.length > 0) return t.label;
  }
  return null;
}
