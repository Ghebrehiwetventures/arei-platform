import { extractPropertyType } from "./propertyType";

export interface CvCorrectableListing {
  sourceId: string;
  title?: string;
  description?: string;
  detailUrl?: string;
  property_type?: string;
  area_sqm?: number | null;
  land_area_sqm?: number | null;
}

export function applyCvSourceCorrections(listing: CvCorrectableListing): void {
  if (listing.sourceId !== "cv_remax" || listing.area_sqm == null) return;

  const propertyType =
    listing.property_type || extractPropertyType(listing.title, listing.detailUrl);
  const text = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();
  const describesPlotArea = /\b(?:plot|land parcel|lot)\b/.test(text);
  if (!describesPlotArea || !/^(?:villa|house)$/.test(propertyType)) return;

  listing.property_type = propertyType;
  listing.land_area_sqm = listing.area_sqm;
  listing.area_sqm = null;
}
