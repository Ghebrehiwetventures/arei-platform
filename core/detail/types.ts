import { RuleViolation } from "../goldenRules";

/**
 * Input for detail page enrichment
 */
export interface DetailEnrichmentInput {
  listingId: string;
  sourceId: string;
  detailUrl: string;
  currentTitle?: string;
  currentPrice?: number;
  currentDescription?: string;
  currentImageUrls: string[];
  currentLocation?: string;
  currentBedrooms?: number | null;
  currentArea?: number | null;
  violations: RuleViolation[];
}

/**
 * Result from detail page enrichment
 */
export interface DetailEnrichmentResult {
  listingId: string;
  detailUrl: string;
  success: boolean;
  enriched: boolean;
  skipped?: boolean;
  skippedReason?: string;
  canonicalId?: string;
  source_ref?: string | null;
  title?: string;
  price?: number;
  priceText?: string;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  description?: string;
  imageUrls: string[];
  location?: string;
  error?: string;
  // Structured property data
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
}

/**
 * Plugin interface for source-specific detail page extraction
 */
export interface DetailPlugin {
  sourceId: string;
  extract(html: string, baseUrl: string): DetailExtractResult;
}

/**
 * Result from plugin extraction
 */
export interface DetailExtractResult {
  success: boolean;
  title?: string;
  price?: number;
  priceText?: string;
  description?: string;
  imageUrls: string[];
  location?: string;
  error?: string;
  // Structured property data
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  terraceArea?: number | null;
  amenities?: string[];
}

/**
 * Summary of enrichment run
 */
export interface EnrichmentSummary {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  enrichedCount: number;
  stoppedReason?: "CAPTCHA" | "HTTP_403" | "HTTP_429";
}
