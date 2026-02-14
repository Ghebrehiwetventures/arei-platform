// core/dropReport.ts

export type DropReason =
  | "missing_price"
  | "missing_location"
  | "missing_property_type"
  | "missing_images"
  | "invalid_area"
  | "invalid_bedrooms"
  | "schema_violation"
  | "unstructured_market_data"
  | "other";

export type DropCounters = Record<DropReason, number>;

export type SourceDropStats = {
  source_id: string;
  fetched_total: number;
  kept_normalized: number;
  dropped: DropCounters;
};

export function initSourceStats(sourceId: string): SourceDropStats {
  return {
    source_id: sourceId,
    fetched_total: 0,
    kept_normalized: 0,
    dropped: {
      missing_price: 0,
      missing_location: 0,
      missing_property_type: 0,
      missing_images: 0,
      invalid_area: 0,
      invalid_bedrooms: 0,
      schema_violation: 0,
      unstructured_market_data: 0,
      other: 0,
    },
  };
}

export function normalizeOrDrop(
  raw: any,
  stats: SourceDropStats
): any | null {
  stats.fetched_total += 1;

  // PRICE
  if (typeof raw.price !== "number") {
    stats.dropped.missing_price += 1;
    return null;
  }

  // LOCATION
  if (!raw.location || typeof raw.location !== "string") {
    stats.dropped.missing_location += 1;
    return null;
  }

  // PROPERTY TYPE
  if (!raw.property_type) {
    stats.dropped.missing_property_type += 1;
    return null;
  }

  // IMAGES (support both 'images' and 'imageUrls' field names)
  const images = raw.images || raw.imageUrls;
  if (!Array.isArray(images) || images.length === 0) {
    stats.dropped.missing_images += 1;
    return null;
  }

  // AREA
  if (raw.area !== undefined && isNaN(Number(raw.area))) {
    stats.dropped.invalid_area += 1;
    return null;
  }

  // BEDROOMS
  if (raw.bedrooms !== undefined && isNaN(Number(raw.bedrooms))) {
    stats.dropped.invalid_bedrooms += 1;
    return null;
  }

  // SUCCESS
  stats.kept_normalized += 1;
  return raw;
}
