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

export { briefingHasRequiredSnapshot } from "./briefing.js";
