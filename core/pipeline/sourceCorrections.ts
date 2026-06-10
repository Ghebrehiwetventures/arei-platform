/**
 * Source corrections — market-agnostic post-enrichment data fixes.
 *
 * Applies declarative `corrections:` rules from a source's config
 * (markets/<market>/sources.yml). No source-specific logic lives here, so the
 * generic pipeline can call this for every source without importing per-market
 * code.
 */

import { extractPropertyType } from "./propertyType";
import type { SourceCorrectionsConfig } from "../configLoader";

export interface CorrectableListing {
  title?: string;
  description?: string;
  detailUrl?: string;
  property_type?: string;
  area_sqm?: number | null;
  land_area_sqm?: number | null;
}

interface SourceLike {
  corrections?: SourceCorrectionsConfig;
}

export function applySourceCorrections(
  listing: CorrectableListing,
  source: SourceLike | undefined
): void {
  const rule = source?.corrections?.reclassify_area_as_land;
  if (!rule || listing.area_sqm == null) return;

  const propertyType =
    listing.property_type || extractPropertyType(listing.title, listing.detailUrl);
  if (!rule.when_property_type.includes(propertyType)) return;

  const text = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();
  if (!new RegExp(rule.when_text_matches).test(text)) return;

  listing.property_type = propertyType;
  listing.land_area_sqm = listing.area_sqm;
  listing.area_sqm = null;
}
