// Merge a fresh parse into a running conversation intent.
// Replacement fields overwrite; modifiers adjust numeric constraints;
// otherwise newer values win, but absent fields do not clobber prior intent.

import type { BuyerIntent, ListingMatch, ParseResult } from "./types";

export function updateConversationIntent(
  prior: BuyerIntent,
  parsed: ParseResult,
  /** Optional current result set used to anchor relative modifiers
   *  ("cheaper" → undercut current cheapest, "bigger" → exceed current largest). */
  lastMatches: ListingMatch[] = []
): BuyerIntent {
  const next: BuyerIntent = { ...prior, keywords: [...prior.keywords] };

  // Replacements overwrite first.
  for (const [k, v] of Object.entries(parsed.replacements)) {
    if (v != null) (next as unknown as Record<string, unknown>)[k] = v;
  }

  // Then merge new fields from intent.
  for (const [k, v] of Object.entries(parsed.intent)) {
    if (v == null) continue;
    if (k === "keywords") {
      next.keywords = Array.from(
        new Set([...(next.keywords ?? []), ...(v as string[])])
      );
    } else {
      (next as unknown as Record<string, unknown>)[k] = v;
    }
  }

  // Apply modifiers — prefer anchoring to the current result set when present
  // ("cheaper" = below the current cheapest match), fall back to a relative
  // adjustment of the prior numeric state.
  for (const m of parsed.modifiers) {
    if (m === "cheaper") {
      const currentPrices = lastMatches
        .map((x) => x.listing.price)
        .filter((p): p is number => p != null);
      if (currentPrices.length > 0) {
        const minCurrent = Math.min(...currentPrices);
        next.maxPrice = Math.max(10_000, minCurrent - 1);
      } else {
        const base = next.maxPrice ?? prior.maxPrice;
        if (base != null) {
          next.maxPrice = Math.max(10_000, Math.round(base * 0.7));
        } else {
          // No anchor: bias ranking toward cheaper listings.
          next.preferLowPrice = true;
        }
      }
    } else if (m === "bigger") {
      const currentSizes = lastMatches
        .map((x) => x.listing.area_sqm)
        .filter((s): s is number => s != null);
      if (currentSizes.length > 0) {
        next.minSizeSqm = Math.max(...currentSizes) + 1;
      } else {
        const base = next.minSizeSqm ?? prior.minSizeSqm ?? 0;
        next.minSizeSqm = base + 30;
      }
    }
  }

  // "cheap" said in a fresh message with no prior price anchor should also
  // bias ranking, even without an explicit modifier match later in the turn.
  if (parsed.modifiers.includes("cheaper") && next.maxPrice == null) {
    next.preferLowPrice = true;
  }

  return next;
}
