// =============================================================================
// arei-sdk/src/index.ts
// Public API
// =============================================================================

export { AREIClient } from "./client.js";

export type {
  ListingCard,
  ListingDetail,
  ListingRow,
  IslandOption,
  IslandMedianStat,
  IslandContext,
  PriceBucket,
  GetListingsParams,
  GetSimilarParams,
  PaginatedListings,
  AREIConfig,
  MarketNewsRow,
  MarketReportRow,
  BriefingRow,
  BriefingSummary,
  BriefingNewsItem,
  FeaturedSelectionRow,
  AgencyRow,
  AgencyListingStats,
} from "./types.js";

export {
  PRICE_BUCKETS,
  MIN_MEDIAN_SAMPLE,
  PRICE_FLOOR,
  PRICE_CEILING,
} from "./types.js";

export { toListingCard, toListingDetail } from "./transforms.js";

export {
  briefingHasRequiredSnapshot,
  isInternalIslandRow,
  isPublicIslandRow,
  validateBriefingForPublish,
  deriveBriefingConfidence,
  isBaselineEdition,
  MIN_KEY_TAKEAWAYS,
  MAX_KEY_TAKEAWAYS,
  BRIEFING_CONFIDENCE_VERSION,
  BRIEFING_SMALL_SAMPLE_MIN,
} from "./briefing.js";
export type {
  BriefingPublishInput,
  BriefingConfidence,
  BriefingConfidenceLevel,
} from "./briefing.js";
