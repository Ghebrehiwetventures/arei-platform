// Shared location fallback chain: location field → title → description (first
// 500 chars) → market-specific hooks. Both orchestrators duplicated this body.

import { parseLocation } from "../locationMapper";
import { LocationHookModule } from "./locationHooks";

export interface ListingForLocation {
  id: string;
  sourceId: string;
  title?: string;
  description?: string;
  detailUrl?: string;
  externalUrl?: string;
  location?: string;
}

export function resolveLocation(
  listing: ListingForLocation,
  marketId: string,
  hooks: LocationHookModule | null
): { island?: string; city?: string } {
  const fromLoc = parseLocation(listing.location, marketId);
  if (fromLoc.island) return { island: fromLoc.island, city: fromLoc.city };

  if (listing.title) {
    const fromTitle = parseLocation(listing.title, marketId);
    if (fromTitle.island) return { island: fromTitle.island, city: fromTitle.city };
  }

  if (listing.description) {
    const fromDesc = parseLocation(listing.description.substring(0, 500), marketId);
    if (fromDesc.island) return { island: fromDesc.island, city: fromDesc.city };
  }

  if (hooks) {
    const hookResult = hooks.resolveLocation({
      id: listing.id,
      sourceId: listing.sourceId,
      title: listing.title ?? null,
      description: listing.description ?? null,
      sourceUrl: listing.detailUrl ?? listing.externalUrl ?? null,
      rawIsland: listing.location ?? null,
      rawCity: null,
    });
    if (hookResult) return hookResult;
  }

  return {};
}
