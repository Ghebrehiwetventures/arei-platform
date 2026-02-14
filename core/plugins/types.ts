/**
 * Plugin contract v1 for source plugins
 */

/**
 * Seed data from list page parsing
 */
export interface ListingSeed {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  detailUrl?: string;
  externalUrl?: string;
  createdAt: Date;
}

/**
 * Detailed data from detail page extraction
 */
export interface ListingDetail {
  success: boolean;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  error?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
}

/**
 * Normalized listing ready for upsert
 */
export interface NormalizedListing {
  id: string;
  source_id: string;
  source_url: string | null;
  title?: string;
  description?: string;
  price?: number;
  currency: string;
  island?: string;
  city?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  property_size_sqm?: number | null;
  land_area_sqm?: number | null;
  image_urls: string[];
  status: string;
}

/**
 * Detail enrichment policy
 */
export type DetailPolicy = "always" | "on_violation" | "never";

/**
 * Source plugin interface
 */
export interface SourcePlugin {
  /** Unique plugin identifier matching source config id */
  sourceId: string;

  /** Market this plugin belongs to */
  marketId: string;

  /** Detail enrichment policy */
  detailPolicy: DetailPolicy;

  /**
   * Parse list page HTML into listing seeds
   */
  parseList(html: string, sourceName: string, baseUrl: string): ListingSeed[];

  /**
   * Extract detailed data from a detail page
   */
  extractDetail(html: string, baseUrl: string): ListingDetail;
}
