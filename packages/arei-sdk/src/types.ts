// =============================================================================
// arei-sdk/src/types.ts
// Types for Africa Real Estate Index consumer sites
// =============================================================================

/** Per-language entry inside listings.ai_descriptions JSONB */
export interface AiDescriptionEntry {
  title?: string;
  text: string;
  generated_at: string;
  prompt_version: string;
  model: string;
  validated: boolean;
}

/** JSONB shape: { en: {...}, it: {...}, pt: {...}, ... } */
export type AiDescriptions = Partial<Record<string, AiDescriptionEntry>>;

/** Raw row from v1_feed_cv (or any v1_feed_* view) */
export interface ListingRow {
  id: string;
  title: string;
  island: string;
  city: string | null;
  price: number | null;
  currency: string | null;
  price_period: string;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  description: string | null;
  description_html: string | null;
  /** AI-generated descriptions per language. May be missing if the view
   *  hasn't yet been updated to expose the column — the SDK falls back. */
  ai_descriptions?: AiDescriptions | null;
  image_urls: string[] | null;
  source_id: string;
  source_url: string;
  first_seen_at: string;
  last_seen_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Subset used by property cards in grid/list views */
export interface ListingCard {
  id: string;
  title: string;
  island: string;
  city: string | null;
  price: number | null;
  currency: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  land_area_sqm: number | null;
  image_urls: string[];
  image_url: string | null;
  source_id: string;
  first_seen_at: string;
  ai_descriptions?: AiDescriptions | null;
  is_new: boolean;
}

/** Full listing for detail page */
export interface ListingDetail {
  id: string;
  title: string;
  island: string;
  city: string | null;
  price: number | null;
  currency: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  land_area_sqm: number | null;
  property_size_sqm: number | null;
  description: string | null;
  description_html: string | null;
  ai_descriptions: AiDescriptions | null;
  image_urls: string[];
  source_id: string;
  source_url: string;
  first_seen_at: string;
  last_seen_at: string | null;
  is_new: boolean;
}

/** Parameters for getSimilarListings() */
export interface GetSimilarParams {
  listing: ListingDetail;
  limit?: number;       // default 4
  minResults?: number;   // default 2 — threshold to trigger next fallback
}

/** Island option for filter dropdown */
export interface IslandOption {
  island: string;
  count: number;
}

/** Per-island market stat */
export interface IslandMedianStat {
  island: string;
  n_price: number;
  median_price: number | null; // null when n_price < 5
}

/** Price filter buckets */
export type PriceBucket =
  | "under_100k"
  | "100k_250k"
  | "250k_500k"
  | "over_500k";

/** Price bucket ranges (EUR) */
export const PRICE_BUCKETS: Record<PriceBucket, { min: number; max: number }> = {
  under_100k: { min: 10_000, max: 100_000 },
  "100k_250k": { min: 100_000, max: 250_000 },
  "250k_500k": { min: 250_000, max: 500_000 },
  over_500k: { min: 500_000, max: 5_000_000 },
};

/** Params for getListings */
export interface GetListingsParams {
  page?: number;
  pageSize?: number;
  island?: string;
  priceBucket?: PriceBucket;
  /** Match a single property_type (case-insensitive equality) */
  propertyType?: string;
  /** Minimum bedrooms (>=). 0 or undefined = no filter */
  minBeds?: number;
  /**
   * Filter by exact source_id (e.g. "cv_terracaboverde").
   * Maps to the URL param ?source= on the listings page.
   */
  sourceId?: string;
}

/** Paginated response */
export interface PaginatedListings {
  data: ListingCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Current market overview derived from the live public feed */
export interface MarketOverview {
  totalListings: number;
  sourceCount: number;
  islandCount: number;
  /** Listings with numeric asking price in [PRICE_FLOOR, PRICE_CEILING] */
  priceSampleCount: number;
  /** ISO timestamp of the most recent last_seen_at across all tracked listings */
  latestSuccessfulCheck: string | null;
  islands: Array<{
    island: string;
    totalListings: number;
    priceSampleCount: number;
    /** Median asking price (EUR). Null when priceSampleCount < MIN_MEDIAN_SAMPLE. */
    medianAskingPrice: number | null;
  }>;
}

/** Config for creating an AREI client */
export interface AREIConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Override the feed view name (e.g. "v1_feed_cv_dev" for local preview). */
  feedView?: string;
}

/** Market context stats for a single island, relative to one listing */
export interface IslandContext {
  island: string;
  /** Number of active listings on this island (with valid price) */
  activeListings: number;
  /** Median asking price for the island (null if < MIN_MEDIAN_SAMPLE) */
  medianPrice: number | null;
  /** Median price per sqm for the island (null if insufficient sqm data) */
  medianPricePerSqm: number | null;
  /** Number of listings used in sqm calculation */
  nSqmListings: number;
  /** Percentile rank of the given price (0-100), null if insufficient data */
  pricePercentile: number | null;
  /** ISO timestamp of the most recent last_seen_at among island listings */
  lastUpdated: string | null;
}

/** Minimum sample size for showing median */
export const MIN_MEDIAN_SAMPLE = 5;

/** A single weekly featured selection row from homepage_featured_selections */
export interface FeaturedSelectionRow {
  id: string;
  market_id: string;
  iso_week: string;
  listing_ids: string[];
  status: "draft" | "published";
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Outlier price bounds */
export const PRICE_FLOOR = 10_000;
export const PRICE_CEILING = 5_000_000;

/**
 * One row from market_report_snapshots for a single island (or 'ALL').
 * Only published rows are returned — the SDK query and RLS both enforce
 * status = 'published' AND published_at IS NOT NULL.
 */
export interface MarketReportRow {
  /** ISO date string: YYYY-MM-DD */
  snapshot_date: string;
  /** Island name, or 'ALL' for the cross-island aggregate */
  island: string;
  /** Tier 2 — screened / monitored listings visible in the public feed */
  listing_count: number;
  /** Distinct source_ids in the screened population */
  source_count: number;
  /** Tier 3 — methodology-eligible records (sale, EUR, price in range, not superseded) */
  index_eligible_count: number;
  /** Median asking price (EUR) of eligible records. Null when eligible < 5. */
  median_price_eur: number | null;
  /** Mean EUR per sqm of eligible records with valid floor area. Null when sample < 5. */
  avg_eur_per_sqm: number | null;
  /** % of eligible records that have valid floor area data */
  sqm_coverage_pct: number | null;
  /** % of screened records that are methodology-eligible (have valid sale price) */
  price_coverage_pct: number | null;
  /** Snapshot methodology version, e.g. 'v1' */
  methodology_version: string;
  /** ISO timestamp when this snapshot was published */
  published_at: string;
  /** ISO timestamp of last data update */
  last_updated: string;
}

/**
 * One published market briefing edition (editorial layer over a snapshot).
 * Only published editions are returned — the SDK query and RLS both enforce
 * status = 'published' AND published_at IS NOT NULL.
 *
 * The numbers are NOT stored here; the canonical page pairs this row with the
 * market_report_snapshots rows that share its snapshot_date.
 */
export interface BriefingRow {
  /** URL key, e.g. '2026-05' */
  slug: string;
  /** Human display label for the period, e.g. 'May 2026' */
  period: string;
  /** ISO date string (YYYY-MM-DD) of the pinned snapshot in market_report_snapshots */
  snapshot_date: string;
  /** Headline, e.g. "Cape Verde Listing Index — May 2026" */
  title: string;
  /** Executive summary: 2-3 sentence key takeaway. Null when not yet written. */
  executive_summary: string | null;
  /** 3-5 short key-takeaway statements. Null/empty when not yet written. */
  key_takeaways: string[] | null;
  /** Editorial context: 2-3 paragraphs (plain text / light markdown). */
  commentary: string | null;
  /** Optional methodology override. Null → page renders the standard disclosure. */
  methodology_note: string | null;
  /** ISO timestamp when this edition was published */
  published_at: string;
  /** ISO timestamp of last edit */
  updated_at: string;
}

/** Light row for the briefing archive index — no full editorial body. */
export interface BriefingSummary {
  slug: string;
  period: string;
  snapshot_date: string;
  title: string;
  executive_summary: string | null;
  published_at: string;
}

/** Public-safe row from public.agencies (no relationship/CRM data) */
export interface AgencyRow {
  id: string;
  market_code: string;
  agency_name: string;
  public_display_name: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  source_ids: string[];
  claimed_status: "unclaimed" | "invited" | "claimed" | "verified";
  created_at: string;
}

/**
 * Aggregated public-feed stats for one scraping source, used to enrich
 * agency cards with AREI-owned data (never external/Google data).
 * Keyed by source_id when returned from getAgencyListingStats().
 */
export interface AgencyListingStats {
  sourceId: string;
  /** Number of listings in the public feed for this source_id */
  listingCount: number;
  /** Distinct island values present for this source_id, sorted */
  islands: string[];
  /** Max last_seen_at across this source's listings (ISO string), or null */
  lastSeenAt: string | null;
}

/** Raw row returned by the public.market_news table (snake_case DB shape) */
export interface MarketNewsRow {
  id: string;
  title: string;
  original_title: string | null;
  source_name: string;
  source_url: string;
  published_at: string | null;
  category: string;
  snippet: string;
  why_it_matters: string | null;
  status: string;
  relevance: "high" | "standard";
  canonical_url: string | null;
  language: string | null;
  country_code: string;
  affected_regions: string[] | null;
  signal_tags: string[] | null;
  ingestion_source: string | null;
  created_at: string;
  updated_at: string;
  title_pt: string | null;
  snippet_pt: string | null;
  why_it_matters_pt: string | null;
  enriched_at: string | null;
  relevance_score: number | null;
  enrich_recommendation: "publish" | "keep_candidate" | "archive" | null;
}
