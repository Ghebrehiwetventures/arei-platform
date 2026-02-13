// ============================================
// PREFLIGHT & SOURCE LIFECYCLE TYPES
// Block 8b: PRE-FLIGHT + SOURCE LIFECYCLE
// ============================================

export enum LifecycleState {
  IN = "IN",
  OBSERVE = "OBSERVE",
  DROP = "DROP",
}

export enum DropReason {
  NO_LISTINGS = "NO_LISTINGS",
}

export enum ObserveReason {
  LOW_COUNT = "LOW_COUNT",
  LOW_PRICE_RATIO = "LOW_PRICE_RATIO",
  LOW_IMAGE_RATIO = "LOW_IMAGE_RATIO",
}

export interface ImageQualityMetrics {
  avgScore: number;
  tierDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  percentAB: number;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface PreflightMetrics {
  listingsCount: number;
  hasPriceRatio: number;
  hasImageRatio: number;
  hasDescriptionRatio: number;
  imageQuality?: ImageQualityMetrics;
}

export interface PreflightResult {
  sourceId: string;
  sourceName: string;
  lifecycleState: LifecycleState;
  metrics: PreflightMetrics;
  reasons: string[];
  timestamp: string;
  trialEnrichmentDone?: boolean;
  promotedToIn?: boolean;
}

export interface SourceImageQualityBreakdown {
  sourceId: string;
  sourceName: string;
  listingCount: number;
  avgScore: number;
  tierDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  percentD: number;
  topReasons: Array<{ reason: string; count: number }>;
}

export interface PreflightReport {
  marketId: string;
  generatedAt: string;
  results: PreflightResult[];
  summary: {
    total: number;
    inCount: number;
    observeCount: number;
    dropCount: number;
  };
  globalImageQuality?: ImageQualityMetrics;
  sourceImageQualityBreakdown?: SourceImageQualityBreakdown[];
}

// Thresholds for preflight classification
export const PREFLIGHT_THRESHOLDS = {
  minListingsForNormal: 10,
  minPriceRatio: 0.5,
  minImageRatio: 0.5,
  minDescriptionRatio: 0.5,
  minImagesPerListing: 3,
  minDescriptionLength: 50,
  trialEnrichmentLimit: 3,
} as const;
