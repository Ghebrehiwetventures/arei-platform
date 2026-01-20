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
  violations: RuleViolation[];
}

/**
 * Result from detail page enrichment
 */
export interface DetailEnrichmentResult {
  listingId: string;
  success: boolean;
  enriched: boolean;
  canonicalId?: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  error?: string;
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
  description?: string;
  imageUrls: string[];
  location?: string;
  error?: string;
}

/**
 * Summary of enrichment run
 */
export interface EnrichmentSummary {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  enrichedCount: number;
  stoppedReason?: "CAPTCHA" | "HTTP_403" | "HTTP_429";
}
