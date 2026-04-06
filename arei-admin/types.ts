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
  createdAt?: string | null;
  updatedAt?: string | null;
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

export type IngestRunPhase = "post_fetch_snapshot" | "final_post_enrichment";

export type ContentDraftStatus = "pending" | "approved" | "rejected" | "revision_requested";

export type PublishChannel = "instagram" | "facebook" | "linkedin" | "blog" | "other";
export type PublishMode = "publish_now" | "schedule_later";
export type PublishItemStatus = "ready_to_publish" | "scheduled" | "published" | "failed" | "cancelled";

export interface ContentDraft {
  id: string;
  sourceListingId: string;
  listingTitle: string;
  selectedImage: string;
  suggestedCaption: string;
  suggestedHashtags: string[];
  suggestedChannel: "instagram" | "facebook" | "linkedin";
  createdAt: string;
  status: ContentDraftStatus;
  statusNote?: string;
}

export interface PublishItem {
  id: string;
  sourceListingId: string;
  contentDraftId: string;
  channel: PublishChannel;
  publishMode: PublishMode;
  status: PublishItemStatus;
  finalCopy: string;
  selectedImageUrl: string;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  postUrl?: string | null;
  operatorNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingSelectorScorePart {
  key: "trust" | "visual" | "completeness" | "location" | "value" | "freshness" | "uniqueness" | "material";
  label: string;
  score: number;
  maxScore: number;
  note: string;
}

export type ListingSelectionTheme = "dream" | "trust" | "opportunity";

export interface ListingSelection {
  listingId: string;
  rank: number;
  totalScore: number;
  selectionTheme: ListingSelectionTheme;
  title: string;
  sourceName: string;
  sourceUrl?: string | null;
  locationLabel: string;
  priceLabel?: string | null;
  selectedImage: string;
  reasons: string[];
  warnings: string[];
  contentAngle: string;
  scoreBreakdown: ListingSelectorScorePart[];
}

export type AgentMapCategory =
  | "Sales / Revenue"
  | "Data / Source Ops"
  | "Editorial / Content"
  | "SEO / Market Intelligence"
  | "Distribution / Growth"
  | "Founder / Decision Support";

export type AgentMapStatus =
  | "human_only"
  | "human_plus_ai"
  | "candidate_for_agent"
  | "in_progress"
  | "live"
  | "parked";

export type AgentMapPriority = "now" | "next" | "later";

export type AgentMapStrategicImportance = "critical" | "high" | "medium";

export interface AgentMapRow {
  id: string;
  category: AgentMapCategory;
  function: string;
  candidateAgent: string;
  currentOwner: string;
  status: AgentMapStatus;
  priority: AgentMapPriority;
  strategicImportance: AgentMapStrategicImportance;
  requiredInputs: string[];
  expectedOutputs: string[];
  notes: string;
}
