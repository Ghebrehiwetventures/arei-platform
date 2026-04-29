import {
  Market,
  Source,
  Listing,
  SourceStatus,
  DashboardStats,
  SourceQualityRow,
  SourceQualityRowRaw,
  IngestRunPhase,
  ContentDraft,
  ContentDraftStatus,
} from "./types";
import { supabase } from "./supabase";

// ============================================
// ARTIFACT LOADING
// Prefers /artifacts/cv_ingest_report.json if present
// Falls back to MOCK data otherwise
// ============================================

interface IngestReportSource {
  id: string;
  name: string;
  status: string;
  scrapeAttempts: number;
  repairAttempts: number;
  lastError?: string;
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
}

interface IngestReportListing {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  images?: string[];
  imageCount?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  violations?: string[];
}

interface IngestReport {
  marketId: string;
  marketName: string;
  generatedAt: string;
  runPhase?: IngestRunPhase;
  isFinal?: boolean;
  runStartedAt?: string;
  artifactWrittenAt?: string;
  summary: {
    totalListings: number;
    visibleCount: number;
    hiddenCount: number;
    duplicatesRemoved: number;
    sourceCount: number;
  };
  sources: IngestReportSource[];
  visibleListings: IngestReportListing[];
  hiddenListings: IngestReportListing[];
}

let cachedReport: IngestReport | null = null;
let reportLoadAttempted = false;

async function loadIngestReport(): Promise<IngestReport | null> {
  if (reportLoadAttempted) return cachedReport;
  reportLoadAttempted = true;

  try {
    const response = await fetch("/cv_ingest_report.json");
    if (response.ok) {
      cachedReport = await response.json();
      console.log("[arei-admin] Loaded ingest report from artifacts");
      return cachedReport;
    }
  } catch {
    console.log("[arei-admin] No ingest report found, using MOCK data");
  }
  return null;
}

/** Latest sync log from ingest report (when served from artifacts). */
export interface LatestSyncLog {
  at: string;
  marketName: string;
  totalListings: number;
  visibleCount: number;
  runPhase?: IngestRunPhase;
  isFinal?: boolean;
  runStartedAt?: string;
  artifactWrittenAt?: string;
  phaseLabel: string;
}

function getRunPhaseLabel(report: Pick<IngestReport, "runPhase" | "isFinal">): string {
  if (report.runPhase === "post_fetch_snapshot") {
    return "In progress snapshot";
  }
  if (report.runPhase === "final_post_enrichment") {
    return "Final run result";
  }
  if (report.isFinal === false) {
    return "In progress snapshot";
  }
  if (report.isFinal === true) {
    return "Final run result";
  }
  return "Legacy report";
}

export async function getLatestSyncLog(): Promise<LatestSyncLog | null> {
  const report = await loadIngestReport();
  if (!report?.generatedAt) return null;
  return {
    at: report.artifactWrittenAt ?? report.generatedAt,
    marketName: report.marketName ?? report.marketId ?? "—",
    totalListings: report.summary?.totalListings ?? 0,
    visibleCount: report.summary?.visibleCount ?? 0,
    runPhase: report.runPhase,
    isFinal: report.isFinal,
    runStartedAt: report.runStartedAt,
    artifactWrittenAt: report.artifactWrittenAt ?? report.generatedAt,
    phaseLabel: getRunPhaseLabel(report),
  };
}

function convertReportToMarket(report: IngestReport): Market {
  const sources: Source[] = report.sources.map((s) => ({
    id: s.id,
    name: s.name,
    state: {
      status: s.status as SourceStatus,
      scrapeAttempts: s.scrapeAttempts,
      repairAttempts: s.repairAttempts,
      lastError: s.lastError,
      debugErrors: s.debugErrors,
      consecutiveFailureCount: s.consecutiveFailureCount,
      lastErrorClass: s.lastErrorClass,
      pauseReason: s.pauseReason,
      pauseDetail: s.pauseDetail,
      lastSeenAt: s.lastSeenAt,
    },
  }));

  const allListings = [...report.visibleListings, ...report.hiddenListings];
  const listings: Listing[] = allListings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    description: l.description || (l.violations ? `[HIDDEN: ${l.violations.join(", ")}]` : undefined),
    images: l.images || [],
    sourceId: l.sourceId,
    sourceName: l.sourceName,
    sourceUrl: undefined,
    location: l.location,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    area_sqm: l.area_sqm,
  }));

  const statuses = sources.map((s) => s.state.status);
  let marketStatus = SourceStatus.OK;
  if (statuses.every((s) => s === SourceStatus.OK)) {
    marketStatus = SourceStatus.OK;
  } else if (statuses.every((s) => s === SourceStatus.BROKEN_SOURCE || s === SourceStatus.UNSCRAPABLE)) {
    marketStatus = SourceStatus.BROKEN_SOURCE;
  } else if (statuses.some((s) => s === SourceStatus.PAUSED_BY_SYSTEM)) {
    marketStatus = SourceStatus.PAUSED_BY_SYSTEM;
  } else {
    marketStatus = SourceStatus.PARTIAL_OK;
  }

  return {
    id: report.marketId,
    name: report.marketName,
    status: marketStatus,
    sources,
    listings,
  };
}

// ============================================
// MOCK DATA FALLBACK
// ============================================

const mockSources: Source[] = [
  {
    id: "src_1",
    name: "MOCK Source A",
    state: {
      status: SourceStatus.OK,
      scrapeAttempts: 1,
      repairAttempts: 0,
    },
  },
  {
    id: "src_2",
    name: "MOCK Source B",
    state: {
      status: SourceStatus.BROKEN_SOURCE,
      scrapeAttempts: 3,
      repairAttempts: 2,
      lastError: "Selector .listing-item not found on page",
    },
  },
  {
    id: "src_3",
    name: "MOCK Source C",
    state: {
      status: SourceStatus.PARTIAL_OK,
      scrapeAttempts: 2,
      repairAttempts: 1,
      lastError: "Missing price field on 12 listings",
    },
  },
];

const mockListings: Listing[] = [
  {
    id: "lst_1",
    sourceId: "src_1",
    sourceName: "MOCK Source A",
    title: "MOCK Apartment in Praia",
    price: 45000,
    description: "2 bedroom apartment near the beach",
    images: [],
  },
  {
    id: "lst_2",
    sourceId: "src_1",
    sourceName: "MOCK Source A",
    title: undefined,
    price: 120000,
    description: "Large house with garden",
    images: ["https://via.placeholder.com/400x300", "https://via.placeholder.com/400x300/eee"],
  },
  {
    id: "lst_3",
    sourceId: "src_3",
    sourceName: "MOCK Source C",
    title: "MOCK Villa Mindelo",
    price: undefined,
    description: undefined,
    images: ["https://via.placeholder.com/400x300"],
  },
  {
    id: "lst_4",
    sourceId: "src_1",
    sourceName: "MOCK Source A",
    title: "MOCK Studio Downtown",
    price: 28000,
    description: "Compact studio in city center",
    images: ["https://via.placeholder.com/400x300", "https://via.placeholder.com/400x300/ddd", "https://via.placeholder.com/400x300/ccc"],
  },
];

function getMockMarket(): Market {
  const statuses = mockSources.map((s) => s.state.status);
  let marketStatus = SourceStatus.OK;
  if (statuses.every((s) => s === SourceStatus.OK)) {
    marketStatus = SourceStatus.OK;
  } else if (statuses.every((s) => s === SourceStatus.BROKEN_SOURCE || s === SourceStatus.UNSCRAPABLE)) {
    marketStatus = SourceStatus.BROKEN_SOURCE;
  } else if (statuses.some((s) => s === SourceStatus.PAUSED_BY_SYSTEM)) {
    marketStatus = SourceStatus.PAUSED_BY_SYSTEM;
  } else {
    marketStatus = SourceStatus.PARTIAL_OK;
  }

  return {
    id: "cv",
    name: "Cape Verde (cv) [MOCK]",
    status: marketStatus,
    sources: mockSources,
    listings: mockListings,
  };
}

// ============================================
// SUPABASE DATA LOADER
// ============================================

interface SupabaseListing {
  id: string;
  source_id: string;
  source_url: string | null;
  source_ref?: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  currency: string;
  island: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  land_area_sqm?: number | null;
  image_urls: string[];
  status: string;
  approved: boolean;
  violations: string[] | null;
  property_type?: string | null;
  amenities?: string[] | null;
  price_period?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

async function loadFromSupabase(): Promise<Market[]> {
  try {
    const { data: listings, error } = await supabase
      .from("listings")
      .select("*")
      .order("id");

    if (error) {
      console.error("[Admin] Supabase error:", error);
      return [];
    }

    if (!listings || listings.length === 0) {
      console.warn("[Admin] No listings found in Supabase");
      return [];
    }

    console.log(`[Admin] Loaded ${listings.length} listings from Supabase`);

    // Group by market (extract from source_id prefix, e.g., "cv_", "gh_", "ke_")
    const marketGroups = new Map<string, SupabaseListing[]>();
    
    for (const listing of listings as SupabaseListing[]) {
      const match = listing.source_id.match(/^([a-z]{2})_/);
      const marketId = match ? match[1] : "unknown";
      
      if (!marketGroups.has(marketId)) {
        marketGroups.set(marketId, []);
      }
      marketGroups.get(marketId)!.push(listing);
    }

    // Convert to Market objects
    const markets: Market[] = [];
    
    const marketNames: Record<string, string> = {
      cv: "Cape Verde",
      gh: "Ghana",
      ke: "Kenya",
      ng: "Nigeria",
      zm: "Zambia",
      bw: "Botswana",
    };

    for (const [marketId, marketListings] of marketGroups.entries()) {
      // Group by source
      const sourceGroups = new Map<string, SupabaseListing[]>();
      for (const listing of marketListings) {
        if (!sourceGroups.has(listing.source_id)) {
          sourceGroups.set(listing.source_id, []);
        }
        sourceGroups.get(listing.source_id)!.push(listing);
      }

      // Build sources
      const sources: Source[] = Array.from(sourceGroups.entries()).map(([sourceId, listings]) => {
        // Infer source name from first listing or use source_id
        const sourceName = sourceId
          .replace(/^[a-z]{2}_/, "")
          .split(/[_-]/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        // Determine status based on listings (simplified - all are OK if they exist)
        const status = listings.length > 0 ? SourceStatus.OK : SourceStatus.BROKEN_SOURCE;

        return {
          id: sourceId,
          name: sourceName,
          state: {
            status,
            scrapeAttempts: 1,
            repairAttempts: 0,
          },
        };
      });

      // Build listings (all DB fields for admin view)
      const convertedListings: Listing[] = marketListings.map((l) => ({
        id: l.id,
        title: l.title || undefined,
        price: l.price ?? undefined,
        currency: l.currency,
        images: l.image_urls || [],
        description: l.description || undefined,
        sourceId: l.source_id,
        sourceName: sources.find(s => s.id === l.source_id)?.name || l.source_id,
        sourceUrl: l.source_url,
        source_ref: l.source_ref ?? null,
        location: [l.city, l.island].filter(Boolean).join(", ") || undefined,
        island: l.island,
        city: l.city,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        area_sqm: l.property_size_sqm,
        land_area_sqm: l.land_area_sqm,
        property_type: l.property_type || undefined,
        status: l.status,
        approved: l.approved,
        project_flag: l.project_flag ?? null,
        project_start_price: l.project_start_price ?? null,
        violations: l.violations || undefined,
        amenities: l.amenities || undefined,
        price_period: l.price_period || undefined,
      }));

      // Determine market status
      const sourceStatuses = sources.map(s => s.state.status);
      let marketStatus = SourceStatus.OK;
      if (sourceStatuses.every(s => s === SourceStatus.OK)) {
        marketStatus = SourceStatus.OK;
      } else if (sourceStatuses.some(s => s === SourceStatus.BROKEN_SOURCE)) {
        marketStatus = SourceStatus.PARTIAL_OK;
      }

      markets.push({
        id: marketId,
        name: marketNames[marketId] || marketId.toUpperCase(),
        status: marketStatus,
        sources,
        listings: convertedListings,
      });
    }

    return markets.sort((a, b) => b.listings.length - a.listings.length);
  } catch (err) {
    console.error("[Admin] Failed to load from Supabase:", err);
    return [];
  }
}

// ============================================
// EXPORTS
// ============================================

let marketsCache: Market[] | null = null;
let loadPromise: Promise<Market[]> | null = null;

export async function getMarketsAsync(): Promise<Market[]> {
  if (marketsCache) return marketsCache;
  
  if (!loadPromise) {
    loadPromise = loadFromSupabase();
  }
  
  const markets = await loadPromise;
  if (markets.length > 0) {
    marketsCache = markets;
    return markets;
  }

  // Fallback to local artifact
  const report = await loadIngestReport();
  if (report) {
    marketsCache = [convertReportToMarket(report)];
    return marketsCache;
  }

  // Final fallback to mock
  marketsCache = [getMockMarket()];
  return marketsCache;
}

export function getMarkets(): Market[] {
  if (marketsCache) return marketsCache;
  return [getMockMarket()];
}

export function getMarket(id: string): Market | undefined {
  return getMarkets().find((m) => m.id === id);
}

// Trigger async load on module init
getMarketsAsync().then((markets) => {
  marketsCache = markets;
  console.log(`[Admin] Loaded ${markets.length} markets`);
});

// ============================================
// DASHBOARD (RPC + grades)
// ============================================

function sourceIdToName(sourceId: string): string {
  return sourceId
    .replace(/^[a-z]{2}_/, "")
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Days since `ts`. Returns Infinity for missing/invalid timestamps so they
 *  fail any "stale >= N days" comparison and the source is treated as stale. */
function daysSince(ts: string | null | undefined): number {
  if (!ts) return Infinity;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

const SOURCE_STALE_DAYS_DATA = 30;

/**
 * Operational health grade.
 *
 * Replaces the old approval/image/price composite, which could mark a source
 * as "A" while it had 0 public feed, 0 trust pass, or stale freshness — i.e.
 * data was complete but the source was operationally broken.
 *
 * Rules — worst grade wins:
 *
 *   D  approved > 0 AND public_feed = 0          (approved listings never reach the public feed)
 *   D  approved > 0 AND trust_passed = 0         (none pass trust gate)
 *   D  approved > 0 AND indexable = 0            (none indexable)
 *   D  stale ≥ 30 days
 *   C  approved ≥ 20 AND feed conversion < 25%
 *   C  listing_count ≥ 10 AND with_sqm_pct = 0
 *   B  with_sqm_pct < 30  OR  with_beds_pct < 30  OR  with_baths_pct < 30
 *   A  fresh, has feed/trust/indexable, conversion ≥ 25%, basic coverage ≥ 30
 *
 * Sources with 0 listings (e.g. placeholder rows) get C — neither broken
 * nor functional.
 */
function computeHealthGrade(input: {
  listing_count: number;
  approved_count: number;
  public_feed_count: number;
  trust_passed_count: number;
  indexable_count: number;
  sqm_pct: number;
  beds_pct: number;
  baths_pct: number;
  feed_conversion_pct: number;
  last_updated_at: string | null | undefined;
}): { score: number; grade: "A" | "B" | "C" | "D" } {
  const {
    listing_count,
    approved_count,
    public_feed_count,
    trust_passed_count,
    indexable_count,
    sqm_pct,
    beds_pct,
    baths_pct,
    feed_conversion_pct,
    last_updated_at,
  } = input;

  if (listing_count === 0) return { score: 50, grade: "C" };

  const stale = daysSince(last_updated_at) >= SOURCE_STALE_DAYS_DATA;
  const isD =
    (approved_count > 0 && public_feed_count === 0) ||
    (approved_count > 0 && trust_passed_count === 0) ||
    (approved_count > 0 && indexable_count === 0) ||
    stale;
  if (isD) return { score: 25, grade: "D" };

  const isC =
    (approved_count >= 20 && feed_conversion_pct < 25) ||
    (listing_count >= 10 && sqm_pct === 0);
  if (isC) return { score: 55, grade: "C" };

  const isB = sqm_pct < 30 || beds_pct < 30 || baths_pct < 30;
  if (isB) return { score: 75, grade: "B" };

  return { score: 95, grade: "A" };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const { data: rows, error } = await supabase.rpc("get_source_quality_stats");
    if (error) {
      console.warn("[Admin] RPC get_source_quality_stats failed (run docs/supabase_rpc.sql?):", error.message);
      return {
        totalListings: 0,
        approvedCount: 0,
        sourceCount: 0,
        marketCount: 0,
        sourceRows: [],
      };
    }
    const raw = (rows || []) as SourceQualityRowRaw[];
    const marketSet = new Set<string>();
    let totalListings = 0;
    let approvedCount = 0;
    const sourceRows: SourceQualityRow[] = raw.map((r) => {
      const marketId = r.source_id.match(/^([a-z]{2})_/)?.[1] || "?";
      marketSet.add(marketId);
      totalListings += Number(r.listing_count);
      approvedCount += Number(r.approved_count);
      const n = Number(r.listing_count) || 1;
      const approvedPct = (Number(r.approved_count) / n) * 100;
      const imagePct = (Number(r.with_image_count) / n) * 100;
      const pricePct = (Number(r.with_price_count) / n) * 100;
      const sqmPct = (Number(r.with_sqm_count ?? 0) / n) * 100;
      const bedsPct = (Number(r.with_beds_count ?? 0) / n) * 100;
      const bathsPct = (Number(r.with_baths_count ?? 0) / n) * 100;
      const trustPassedN = Number(r.trust_passed_count ?? 0);
      const indexableN = Number(r.indexable_count ?? 0);
      const feedN = Number(r.public_feed_count ?? 0);
      const approvedN = Number(r.approved_count);
      const feedConvPct = approvedN > 0 ? (feedN / approvedN) * 100 : 0;
      const { score, grade } = computeHealthGrade({
        listing_count: Number(r.listing_count),
        approved_count: approvedN,
        public_feed_count: feedN,
        trust_passed_count: trustPassedN,
        indexable_count: indexableN,
        sqm_pct: sqmPct,
        beds_pct: bedsPct,
        baths_pct: bathsPct,
        feed_conversion_pct: feedConvPct,
        last_updated_at: r.last_updated_at,
      });
      return {
        ...r,
        last_updated_at: r.last_updated_at ?? null,
        approved_pct: Math.round(approvedPct * 10) / 10,
        with_image_pct: Math.round(imagePct * 10) / 10,
        with_price_pct: Math.round(pricePct * 10) / 10,
        with_sqm_pct: Math.round(sqmPct * 10) / 10,
        with_beds_pct: Math.round(bedsPct * 10) / 10,
        with_baths_pct: Math.round(bathsPct * 10) / 10,
        trust_passed_count_n: trustPassedN,
        indexable_count_n: indexableN,
        public_feed_count_n: feedN,
        feed_conversion_pct: Math.round(feedConvPct * 10) / 10,
        score,
        grade,
        sourceName: sourceIdToName(r.source_id),
        marketId,
      };
    });
    // Sort worst grade first (D, C, B, A), then by listing count desc
    const gradeOrder = { D: 0, C: 1, B: 2, A: 3 };
    sourceRows.sort((a, b) => {
      const g = gradeOrder[a.grade] - gradeOrder[b.grade];
      if (g !== 0) return g;
      return Number(b.listing_count) - Number(a.listing_count);
    });
    return {
      totalListings,
      approvedCount,
      sourceCount: sourceRows.length,
      marketCount: marketSet.size,
      sourceRows,
    };
  } catch (err) {
    console.error("[Admin] getDashboardStats error:", err);
    return {
      totalListings: 0,
      approvedCount: 0,
      sourceCount: 0,
      marketCount: 0,
      sourceRows: [],
    };
  }
}

// ============================================
// LISTINGS (server-side pagination + filters)
// ============================================

export interface ListingsFilters {
  priceMin?: number;
  priceMax?: number;
  island?: string;
  city?: string;
  sourceId?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  /** Search in title (ilike) */
  titleSearch?: string;
  /** Filter by approved (visible) status */
  approved?: boolean;
  /** Filter by last updated date (updated_at). ISO date YYYY-MM-DD. */
  importedAfter?: string;
  /** Filter by last updated date (updated_at). ISO date YYYY-MM-DD. */
  importedBefore?: string;
}

/** Column key for sorting (must match DB column or mapped) */
export type ListingsSortKey = "id" | "title" | "price" | "island" | "city" | "bedrooms" | "bathrooms" | "property_size_sqm" | "source_id";

export interface ListingsResult {
  data: Listing[];
  totalCount: number;
}

const LISTING_COLS =
  "id,title,price,project_start_price,currency,source_id,source_url,source_ref,project_flag,island,city,bedrooms,bathrooms,property_size_sqm,image_urls,approved,created_at,updated_at";

export async function getListings(
  marketId: string,
  page: number,
  pageSize: number,
  filters: ListingsFilters = {},
  sortBy: ListingsSortKey = "id",
  sortDir: "asc" | "desc" = "asc"
): Promise<ListingsResult> {
  try {
    let query = supabase
      .from("listings")
      .select(LISTING_COLS, { count: "exact" })
      .order(sortBy, { ascending: sortDir === "asc" });
    if (marketId && marketId !== "all") {
      query = query.ilike("source_id", marketId + "_%");
    }
    if (filters.priceMin != null) query = query.gte("price", filters.priceMin);
    if (filters.priceMax != null) query = query.lte("price", filters.priceMax);
    if (filters.island) query = query.eq("island", filters.island);
    if (filters.city) query = query.eq("city", filters.city);
    if (filters.sourceId) query = query.eq("source_id", filters.sourceId);
    if (filters.titleSearch?.trim()) query = query.ilike("title", "%" + filters.titleSearch.trim() + "%");
    if (filters.bedrooms != null) query = query.gte("bedrooms", filters.bedrooms);
    if (filters.bathrooms != null) query = query.gte("bathrooms", filters.bathrooms);
    if (filters.areaMin != null) query = query.gte("property_size_sqm", filters.areaMin);
    if (filters.areaMax != null) query = query.lte("property_size_sqm", filters.areaMax);
    if (filters.approved !== undefined) query = query.eq("approved", filters.approved);
    if (filters.importedAfter) query = query.gte("updated_at", filters.importedAfter + "T00:00:00.000Z");
    if (filters.importedBefore) query = query.lte("updated_at", filters.importedBefore + "T23:59:59.999Z");

    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) {
      console.error("[Admin] getListings error:", error);
      return { data: [], totalCount: 0 };
    }
    const rows = (data || []) as SupabaseListing[];
    const sourceNameMap = new Map<string, string>();
    const listings: Listing[] = rows.map((l) => {
      if (!sourceNameMap.has(l.source_id)) sourceNameMap.set(l.source_id, sourceIdToName(l.source_id));
      return {
        id: l.id,
        title: l.title || undefined,
        price: l.price ?? undefined,
        currency: l.currency,
        images: l.image_urls || [],
        sourceId: l.source_id,
        sourceName: sourceNameMap.get(l.source_id)!,
        sourceUrl: l.source_url,
        source_ref: l.source_ref ?? null,
        location: [l.city, l.island].filter(Boolean).join(", ") || undefined,
        island: l.island,
        city: l.city,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        area_sqm: l.property_size_sqm,
        approved: l.approved,
        project_flag: l.project_flag ?? null,
        project_start_price: l.project_start_price ?? null,
      };
    });
    return { data: listings, totalCount: count ?? 0 };
  } catch (err) {
    console.error("[Admin] getListings error:", err);
    return { data: [], totalCount: 0 };
  }
}

export async function getListingById(id: string): Promise<Listing | null> {
  try {
    const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
    if (error || !data) return null;
    const l = data as SupabaseListing;
    return {
      id: l.id,
      title: l.title || undefined,
      price: l.price ?? undefined,
      currency: l.currency,
      images: l.image_urls || [],
      description: l.description || undefined,
      sourceId: l.source_id,
      sourceName: sourceIdToName(l.source_id),
      sourceUrl: l.source_url,
      source_ref: l.source_ref ?? null,
      location: [l.city, l.island].filter(Boolean).join(", ") || undefined,
      island: l.island,
      city: l.city,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      area_sqm: l.property_size_sqm,
      land_area_sqm: l.land_area_sqm,
      property_type: l.property_type || undefined,
      status: l.status,
      approved: l.approved,
      project_flag: l.project_flag ?? null,
      project_start_price: l.project_start_price ?? null,
      violations: l.violations || undefined,
      amenities: l.amenities || undefined,
      price_period: l.price_period || undefined,
    };
  } catch {
    return null;
  }
}

// Get distinct market ids for Listings tab (from RPC rows or fallback)
export async function getMarketIds(): Promise<{ id: string; name: string }[]> {
  const stats = await getDashboardStats();
  const names: Record<string, string> = {
    cv: "Cape Verde",
    gh: "Ghana",
    ke: "Kenya",
    ng: "Nigeria",
    zm: "Zambia",
    bw: "Botswana",
  };
  const set = new Set<string>();
  for (const r of stats.sourceRows) {
    set.add(r.marketId);
  }
  return Array.from(set)
    .sort()
    .map((id) => ({ id, name: names[id] || id.toUpperCase() }));
}

// ============================================
// CONTENT DRAFT AGENT V1
// Supabase persistence for this phase; human approval stays in admin.
// ============================================

const MAX_CONTENT_DRAFTS_PER_RUN = 5;

interface ContentDraftRow {
  id: string;
  source_listing_id: string;
  listing_title: string;
  selected_image: string;
  suggested_caption: string;
  suggested_hashtags: string[] | null;
  suggested_channel: ContentDraft["suggestedChannel"];
  created_at: string;
  status: ContentDraftStatus;
  status_note: string | null;
}

function isContentDraftStatus(value: string): value is ContentDraftStatus {
  return value === "pending" || value === "approved" || value === "rejected" || value === "revision_requested";
}

function mapContentDraftRow(row: ContentDraftRow): ContentDraft {
  return {
    id: row.id,
    sourceListingId: row.source_listing_id,
    listingTitle: row.listing_title,
    selectedImage: row.selected_image,
    suggestedCaption: row.suggested_caption,
    suggestedHashtags: Array.isArray(row.suggested_hashtags) ? row.suggested_hashtags.filter(Boolean) : [],
    suggestedChannel: row.suggested_channel,
    createdAt: row.created_at,
    status: isContentDraftStatus(row.status) ? row.status : "pending",
    statusNote: row.status_note || undefined,
  };
}

function mapContentDraftToInsert(row: ContentDraft) {
  return {
    id: row.id,
    source_listing_id: row.sourceListingId,
    listing_title: row.listingTitle,
    selected_image: row.selectedImage,
    suggested_caption: row.suggestedCaption,
    suggested_hashtags: row.suggestedHashtags,
    suggested_channel: row.suggestedChannel,
    created_at: row.createdAt,
    status: row.status,
    status_note: row.statusNote ?? null,
  };
}

async function listStoredContentDrafts(): Promise<ContentDraft[]> {
  const { data, error } = await supabase
    .from("content_drafts")
    .select("id,source_listing_id,listing_title,selected_image,suggested_caption,suggested_hashtags,suggested_channel,created_at,status,status_note")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Admin] Failed to load content drafts from Supabase:", error.message);
    return [];
  }

  return ((data || []) as ContentDraftRow[]).map(mapContentDraftRow);
}

async function insertContentDrafts(drafts: ContentDraft[]): Promise<void> {
  if (drafts.length === 0) return;

  const { error } = await supabase
    .from("content_drafts")
    .upsert(drafts.map(mapContentDraftToInsert), { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    throw new Error(`[Admin] Failed to persist content drafts: ${error.message}`);
  }
}

async function updateStoredContentDraftStatus(id: string, status: ContentDraftStatus, statusNote?: string): Promise<void> {
  const payload = {
    status,
    status_note: statusNote?.trim() ? statusNote.trim() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("content_drafts").update(payload).eq("id", id);
  if (error) {
    throw new Error(`[Admin] Failed to update content draft status: ${error.message}`);
  }
}

function slugifyTag(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part, index) => (index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join("");
}

function formatCompactPrice(listing: Listing): string | null {
  if (listing.price == null) return null;
  const currency = listing.currency || "EUR";
  const symbol = currency === "EUR" ? "EUR " : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${Math.round(listing.price).toLocaleString()}`;
}

function getListingLocationLabel(listing: Listing): string {
  return [listing.city, listing.island].filter(Boolean).join(", ") || listing.location || "Cape Verde";
}

function chooseSuggestedChannel(listing: Listing): ContentDraft["suggestedChannel"] {
  if (listing.project_flag) return "linkedin";
  if ((listing.images?.length ?? 0) >= 4 || (listing.price ?? 0) >= 250000) return "instagram";
  return "facebook";
}

function buildSuggestedHashtags(listing: Listing): string[] {
  const tags = [
    "AfricaPropertyIndex",
    listing.island ? slugifyTag(listing.island) : null,
    listing.city ? slugifyTag(listing.city) : null,
    listing.property_type ? slugifyTag(listing.property_type) : "PropertyListing",
    listing.bedrooms ? `${listing.bedrooms}Bed` : null,
  ].filter(Boolean) as string[];
  return Array.from(new Set(tags)).slice(0, 5);
}

function buildCaption(listing: Listing): string {
  const title = listing.title || "Featured listing";
  const location = getListingLocationLabel(listing);
  const price = formatCompactPrice(listing);
  const facts = [
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.area_sqm ? `${Math.round(listing.area_sqm)} m2` : null,
  ].filter(Boolean);

  const opener = `${title} in ${location}.`;
  const valueLine = price ? ` Asking ${price}.` : "";
  const factsLine = facts.length > 0 ? ` Highlights: ${facts.join(" · ")}.` : "";
  const closer = " Draft only for approval review. Not published.";

  return `${opener}${valueLine}${factsLine}${closer}`.trim();
}

function scoreListingForContent(listing: Listing): number {
  let score = 0;
  if (listing.approved) score += 5;
  if ((listing.images?.length ?? 0) > 0) score += Math.min(4, listing.images.length);
  if (listing.price != null) score += 2;
  if (listing.title) score += 2;
  if (listing.description && listing.description.length >= 120) score += 1;
  if (listing.bedrooms != null) score += 1;
  if (listing.bathrooms != null) score += 1;
  if (listing.area_sqm != null) score += 1;
  if (listing.project_flag) score += 1;
  return score;
}

async function getLiveContentCandidateListings(limit = 80): Promise<Listing[]> {
  const feedSources = ["v1_feed_cv_indexable", "v1_feed_cv"] as const;

  try {
    for (const feedSource of feedSources) {
      const { data, error } = await supabase
        .from(feedSource)
        .select("id,title,price,currency,source_id,source_url,island,city,bedrooms,bathrooms,property_size_sqm,image_urls,approved,property_type,description")
        .order("updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn(`[Admin] Could not load content candidates from ${feedSource}:`, error.message);
        continue;
      }

      const candidates = ((data || []) as SupabaseListing[])
        .map((l) => ({
          id: l.id,
          title: l.title || undefined,
          price: l.price ?? undefined,
          currency: l.currency,
          images: (l.image_urls || []).filter(Boolean),
          description: l.description || undefined,
          sourceId: l.source_id,
          sourceName: sourceIdToName(l.source_id),
          sourceUrl: l.source_url,
          source_ref: l.source_ref ?? null,
          location: [l.city, l.island].filter(Boolean).join(", ") || undefined,
          island: l.island,
          city: l.city,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          area_sqm: l.property_size_sqm,
          approved: l.approved,
          project_flag: l.project_flag ?? null,
          project_start_price: l.project_start_price ?? null,
          property_type: l.property_type || undefined,
        }))
        .filter((listing) => listing.images.length > 0);

      if (candidates.length > 0) {
        console.info(`[Admin] Loaded ${candidates.length} content candidates from ${feedSource}`);
        return candidates;
      }
    }

    return [];
  } catch (err) {
    console.warn("[Admin] Failed to load live content candidates:", err);
    return [];
  }
}

function createDraftFromListing(listing: Listing): ContentDraft {
  const createdAt = new Date().toISOString();
  return {
    id: `draft_${listing.id}_${createdAt.slice(0, 10)}`,
    sourceListingId: listing.id,
    listingTitle: listing.title || "Untitled listing",
    selectedImage: listing.images[0],
    suggestedCaption: buildCaption(listing),
    suggestedHashtags: buildSuggestedHashtags(listing),
    suggestedChannel: chooseSuggestedChannel(listing),
    createdAt,
    status: "pending",
  };
}

export async function getContentDrafts(): Promise<ContentDraft[]> {
  return listStoredContentDrafts();
}

export async function generateContentDrafts(): Promise<ContentDraft[]> {
  const existingDrafts = await listStoredContentDrafts();
  const todayKey = new Date().toISOString().slice(0, 10);
  const existingListingIds = new Set(
    existingDrafts
      .filter((draft) => draft.createdAt.slice(0, 10) === todayKey)
      .map((draft) => draft.sourceListingId)
  );

  const candidates = await getLiveContentCandidateListings();

  const selected = candidates
    .filter((listing) => !existingListingIds.has(listing.id))
    .sort((a, b) => scoreListingForContent(b) - scoreListingForContent(a))
    .slice(0, MAX_CONTENT_DRAFTS_PER_RUN);

  const newDrafts = selected.map(createDraftFromListing);
  await insertContentDrafts(newDrafts);
  return listStoredContentDrafts();
}

export async function updateContentDraftStatus(
  id: string,
  status: ContentDraftStatus,
  statusNote?: string
): Promise<ContentDraft[]> {
  await updateStoredContentDraftStatus(id, status, statusNote);
  return listStoredContentDrafts();
}
