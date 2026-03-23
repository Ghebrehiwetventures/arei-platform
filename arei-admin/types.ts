export enum SourceStatus {
  OK = "OK",
  PARTIAL_OK = "PARTIAL_OK",
  BROKEN_SOURCE = "BROKEN_SOURCE",
  UNSCRAPABLE = "UNSCRAPABLE",
  PAUSED_BY_SYSTEM = "PAUSED_BY_SYSTEM",
}

export interface SourceState {
  status: SourceStatus;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
  pausedAt?: Date;
}

export interface Source {
  id: string;
  name: string;
  state: SourceState;
}

export interface Listing {
  id: string;
  title?: string;
  price?: number;
  currency?: string;
  images: string[];
  description?: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string | null;
  location?: string;
  island?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  land_area_sqm?: number | null;
  property_type?: string;
  status?: string;
  approved?: boolean;
  violations?: string[];
  amenities?: string[];
  price_period?: string;
}

export interface Market {
  id: string;
  name: string;
  status: SourceStatus;
  sources: Source[];
  listings: Listing[];
}

// Dashboard: per-source stats from RPC (raw)
export interface SourceQualityRowRaw {
  source_id: string;
  listing_count: number;
  approved_count: number;
  with_image_count: number;
  with_price_count: number;
  tier_a_count?: number;
  tier_b_count?: number;
  tier_c_count?: number;
  without_price_pct?: number;
  without_location_pct?: number;
  multi_domain_gallery_rate?: number;
  duplicate_cover_rate?: number;
  price_completeness?: number;
  location_completeness?: number;
  image_validity_rate?: number;
  duplicate_rate?: number;
  freshness?: number;
  title_cleanliness?: number;
  stale_share_pct?: number;
  base_quality_score?: number;
  quality_score?: number;
  latest_run_delta_pct?: number | null;
  latest_run_warning?: boolean;
}

// Dashboard: with computed ratios and grade
export interface SourceQualityRow extends SourceQualityRowRaw {
  approved_pct: number;
  with_image_pct: number;
  with_price_pct: number;
  score: number;
  grade: "A" | "B" | "C" | "D";
  sourceName: string;
  marketId: string;
}

export interface DashboardStats {
  totalListings: number;
  approvedCount: number;
  sourceCount: number;
  marketCount: number;
  sourceRows: SourceQualityRow[];
}

export interface SourceStaleRow {
  source_id: string;
  listing_count: number;
  stale_count: number;
  newly_stale_count: number;
  reactivated_count: number;
  stale_share_pct: number;
  latest_run_started_at: string;
  sourceName: string;
  marketId: string;
}
