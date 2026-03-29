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
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
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
  project_start_price?: number | null;
  currency?: string;
  images: string[];
  description?: string;
  sourceId: string;
  sourceName: string;
  sourceUrl?: string | null;
  source_ref?: string | null;
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
  project_flag?: boolean | null;
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
