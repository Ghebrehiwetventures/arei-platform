import {
  Market,
  Source,
  Listing,
  SourceStatus,
  DashboardStats,
  SourceQualityRow,
  SourceQualityRowRaw,
  IngestRunPhase,
} from "./types";
import { supabase, supabaseAuth } from "./supabase";
import { computeHealthGrade } from "./sourceHealthGrade";

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

/**
 * Canonical display names for known sources.
 *
 * Source IDs in the database are flat slugs (e.g. "cv_terracaboverde") with no
 * word boundaries, so the algorithmic title-case fallback collapses them into
 * one ugly blob ("Terracaboverde"). The canonical names live in each market's
 * sources.yml; this map mirrors them so the admin UI displays them correctly.
 *
 * Keep in sync with markets/<market>/sources.yml. New sources without an
 * override fall back to the algorithmic name; not pretty, but never blocking.
 */
const SOURCE_NAME_OVERRIDES: Record<string, string> = {
  // Cape Verde — production
  cv_amicv: "AMICV",
  cv_cabohouseproperty: "Cabo House Property",
  cv_capeverdeproperty24: "Cape Verde Property 24",
  cv_capeverdepropertyuk: "Cape Verde Property UK",
  cv_ccoreinvestments: "CCore Investments",
  cv_estatecv: "Estate CV",
  cv_globallistings: "Global Listings",
  cv_greenacres: "Green Acres",
  cv_homescasaverde: "Homes Casa Verde",
  cv_nhakaza: "NhaKaza",
  cv_oceanproperty24: "Ocean Property 24",
  cv_properstar: "Properstar",
  cv_remax: "REMAX Cape Verde",
  cv_rightmove: "Rightmove Overseas",
  cv_simplycapeverde: "Simply Cape Verde",
  cv_terracaboverde: "Terra Cabo Verde",
  // Cape Verde — stub / test sources (markets/cv/sources.yml `type: stub`).
  // Excluded from the public feed by migrations/010 and from admin aggregates.
  cv_source_1: "Imobiliaria Praia (stub)",
  cv_source_2: "Mindelo Properties (stub)",
  // Test pipeline markets
  bw_property24: "Property24 Botswana",
  gh_meqasa: "Meqasa Ghana",
  gh_propertycentre: "Ghana Property Centre",
  ke_buyrentkenya: "BuyRentKenya",
  ke_property24: "Property24 Kenya",
  ke_propertycentre: "Kenya Property Centre",
  ng_propertycentre: "Nigeria Property Centre",
  ng_propertypro: "PropertyPro Nigeria",
  ug_propertycentre: "Uganda Property Centre",
  zm_property24: "Property24 Zambia",
};

function sourceIdToName(sourceId: string): string {
  const override = SOURCE_NAME_OVERRIDES[sourceId];
  if (override) return override;
  return sourceId
    .replace(/^[a-z]{2}_/, "")
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Stub / test source IDs declared with `type: stub` in markets/<m>/sources.yml.
 *  Admin aggregates exclude these so they don't pollute the working report.
 *  The `cv_source_\d+` regex catches future-numbered stubs without code edits. */
const STUB_SOURCE_PATTERN = /^cv_source_\d+$/;
function isStubSourceId(sourceId: string): boolean {
  return STUB_SOURCE_PATTERN.test(sourceId);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Fire the RPC and the direct feed count in parallel.
    // The direct count is the authoritative "live feed" total — it is a
    // single COUNT(*) on public.v1_feed_cv, identical to what the public
    // website SDK counts.  The per-source aggregation in the RPC starts from
    // public.listings and silently under-counts when v1_feed_cv contains
    // source_ids not present in public.listings (e.g. kv_curated-only rows).
    const [rpcResult, feedCountResult] = await Promise.all([
      supabase.rpc("get_source_quality_stats"),
      supabase.from("v1_feed_cv").select("id", { count: "exact", head: true }),
    ]);

    const liveFeedTotal = feedCountResult.count ?? 0;

    const { data: rows, error } = rpcResult;
    if (error) {
      console.warn("[Admin] RPC get_source_quality_stats failed (run docs/supabase_rpc.sql?):", error.message);
      return {
        totalListings: 0,
        approvedCount: 0,
        sourceCount: 0,
        marketCount: 0,
        sourceRows: [],
        liveFeedTotal,
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
        isStub: isStubSourceId(r.source_id),
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
      liveFeedTotal,
    };
  } catch (err) {
    console.error("[Admin] getDashboardStats error:", err);
    return {
      totalListings: 0,
      approvedCount: 0,
      sourceCount: 0,
      marketCount: 0,
      sourceRows: [],
      liveFeedTotal: 0,
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
// MARKET NEWS — Admin queue helpers
// All reads and writes use supabaseAuth so the authenticated JWT is sent.
// Public anon reads continue to use the anon client (only published rows).
// ============================================

export type MarketNewsStatus = "candidate" | "published" | "hidden" | "archived";

export interface MarketNewsRow {
  id: string;
  title: string;
  original_title: string | null;
  source_name: string;
  source_url: string;
  canonical_url: string | null;
  published_at: string | null;
  category: string;
  snippet: string;
  why_it_matters: string | null;
  status: MarketNewsStatus;
  relevance: "high" | "standard";
  language: string;
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

export interface MarketNewsFieldUpdate {
  title?: string;
  snippet?: string;
  why_it_matters?: string | null;
  category?: string;
  affected_regions?: string[] | null;
  signal_tags?: string[] | null;
  relevance?: "high" | "standard";
  title_pt?: string | null;
  snippet_pt?: string | null;
  why_it_matters_pt?: string | null;
}

export async function getMarketNewsQueue(status: MarketNewsStatus): Promise<MarketNewsRow[]> {
  let query = supabaseAuth
    .from("market_news")
    .select("id,title,original_title,source_name,source_url,canonical_url,published_at,category,snippet,why_it_matters,status,relevance,language,country_code,affected_regions,signal_tags,ingestion_source,created_at,updated_at,title_pt,snippet_pt,why_it_matters_pt,enriched_at,relevance_score,enrich_recommendation")
    .eq("status", status);

  if (status === "candidate") {
    // Highest-scored items first; unscored (null) items fall to the bottom
    query = query
      .order("relevance_score", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Admin] getMarketNewsQueue failed:", error.message);
    return [];
  }
  return (data ?? []) as MarketNewsRow[];
}

export async function updateMarketNewsStatus(id: string, status: MarketNewsStatus, currentPublishedAt?: string | null): Promise<void> {
  // When publishing, stamp published_at = now() if it's missing or in the past.
  // This ensures newly published articles sort to the top of the public feed.
  const extra: Record<string, unknown> = {};
  if (status === "published" && !currentPublishedAt) {
    extra.published_at = new Date().toISOString();
  }

  const { error } = await supabaseAuth
    .from("market_news")
    .update({ status, ...extra })
    .eq("id", id);

  if (error) {
    throw new Error(`[Admin] updateMarketNewsStatus failed: ${error.message}`);
  }
}

export async function updateMarketNewsFields(id: string, fields: MarketNewsFieldUpdate): Promise<void> {
  const { error } = await supabaseAuth
    .from("market_news")
    .update(fields)
    .eq("id", id);

  if (error) {
    throw new Error(`[Admin] updateMarketNewsFields failed: ${error.message}`);
  }
}

// ============================================
// ADMIN NOTIFICATIONS
// All browser reads/writes use supabaseAuth (authenticated session).
// INSERT is performed by scripts using the service role key only —
// never from the browser. Anon role has no access.
// ============================================

export type NotificationSeverity = "info" | "warning" | "critical";

export interface AdminNotification {
  id: string;
  event_type: string;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export type AdminSignalTone = "ok" | "info" | "warning" | "critical";

export interface AdminSignalMetric {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: AdminSignalTone;
}

export interface AdminSignalEvent {
  id: string;
  category: string;
  title: string;
  body: string;
  at: string;
  tone: AdminSignalTone;
  href?: string;
}

export interface AdminSignalDigest {
  generatedAt: string;
  metrics: AdminSignalMetric[];
  events: AdminSignalEvent[];
}

interface FeedSignalRow {
  id: string;
  title: string | null;
  source_id: string | null;
  price: number | null;
  island: string | null;
  image_urls: string[] | null;
  has_valid_images: boolean | null;
  first_seen_at: string | null;
  updated_at: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "No timestamp";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export async function getAdminSignalDigest(): Promise<AdminSignalDigest> {
  const now = new Date().toISOString();
  const sevenDaysAgo = sinceIso(7);
  const thirtyDaysAgo = sinceIso(30);

  const [
    stats,
    publishedNewsCountResult,
    candidateNewsCountResult,
    latestPublishedNewsResult,
    recentlyUpdatedNewsResult,
    feedRowsResult,
  ] = await Promise.all([
    getDashboardStats(),
    supabaseAuth
      .from("market_news")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("updated_at", sevenDaysAgo),
    supabaseAuth
      .from("market_news")
      .select("id", { count: "exact", head: true })
      .eq("status", "candidate"),
    supabaseAuth
      .from("market_news")
      .select("id,title,source_name,published_at,updated_at,source_url")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabaseAuth
      .from("market_news")
      .select("id,title,status,source_name,published_at,updated_at,source_url")
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("v1_feed_cv")
      .select("id,title,source_id,price,island,image_urls,has_valid_images,first_seen_at,updated_at")
      .order("first_seen_at", { ascending: false, nullsFirst: false })
      .limit(2000),
  ]);

  if (publishedNewsCountResult.error) {
    console.error("[Admin] published news signal failed:", publishedNewsCountResult.error.message);
  }
  if (candidateNewsCountResult.error) {
    console.error("[Admin] candidate news signal failed:", candidateNewsCountResult.error.message);
  }
  if (latestPublishedNewsResult.error) {
    console.error("[Admin] latest published news signal failed:", latestPublishedNewsResult.error.message);
  }
  if (recentlyUpdatedNewsResult.error) {
    console.error("[Admin] updated news signal failed:", recentlyUpdatedNewsResult.error.message);
  }
  if (feedRowsResult.error) {
    console.error("[Admin] feed signal failed:", feedRowsResult.error.message);
  }

  const feedRows = (feedRowsResult.data ?? []) as FeedSignalRow[];
  const newListings7d = feedRows.filter((r) => r.first_seen_at && r.first_seen_at >= sevenDaysAgo);
  const newListings30d = feedRows.filter((r) => r.first_seen_at && r.first_seen_at >= thirtyDaysAgo);
  const withImages = feedRows.filter((r) => r.has_valid_images || (r.image_urls?.length ?? 0) > 0).length;
  const withPrice = feedRows.filter((r) => Number(r.price ?? 0) > 0).length;
  const sourceIds = new Set(feedRows.map((r) => r.source_id).filter(Boolean));
  const nonStubSourceRows = stats.sourceRows.filter((r) => !r.isStub && r.marketId === "cv");
  const weakSources = nonStubSourceRows.filter((r) => r.grade === "D" || r.feed_conversion_pct < 70);
  const staleSources = nonStubSourceRows.filter((r) => {
    if (!r.last_updated_at) return true;
    return new Date(r.last_updated_at).getTime() < Date.now() - 7 * DAY_MS;
  });
  const sourceIssueIds = new Set([...weakSources, ...staleSources].map((r) => r.source_id));

  const publishedNews7d = publishedNewsCountResult.count ?? 0;
  const candidateNews = candidateNewsCountResult.count ?? 0;
  const latestPublishedNews = latestPublishedNewsResult.data?.[0] ?? null;
  const latestListing = feedRows[0] ?? null;
  const healthTone: AdminSignalTone =
    weakSources.length > 0 || staleSources.length > 0 ? "warning" : "ok";

  const metrics: AdminSignalMetric[] = [
    {
      key: "news",
      label: "News activity",
      value: String(publishedNews7d),
      detail: `published/updated · ${candidateNews} candidates · latest ${shortDate(latestPublishedNews?.updated_at ?? latestPublishedNews?.published_at)}`,
      tone: publishedNews7d > 0 ? "ok" : "info",
    },
    {
      key: "new-listings",
      label: "New listings",
      value: String(newListings7d.length),
      detail: `${newListings30d.length} in 30d · latest ${shortDate(latestListing?.first_seen_at)}`,
      tone: newListings7d.length > 0 ? "ok" : "info",
    },
    {
      key: "feed",
      label: "Live feed",
      value: String(stats.liveFeedTotal || feedRows.length),
      detail: `${sourceIds.size} sources · ${pct(withImages, feedRows.length)}% photos · ${pct(withPrice, feedRows.length)}% price`,
      tone: "ok",
    },
    {
      key: "health",
      label: "Data health",
      value: sourceIssueIds.size === 0 ? "OK" : String(sourceIssueIds.size),
      detail: sourceIssueIds.size === 0
        ? "No weak or stale source signals"
        : `${weakSources.length} weak · ${staleSources.length} stale · ${nonStubSourceRows.length} CV sources`,
      tone: healthTone,
    },
  ];

  const events: AdminSignalEvent[] = [];

  for (const item of latestPublishedNewsResult.data ?? []) {
    events.push({
      id: `news-published-${item.id}`,
      category: "Article published",
      title: item.title,
      body: item.source_name || "Market News",
      at: item.updated_at ?? item.published_at ?? now,
      tone: "ok",
      href: item.source_url ?? undefined,
    });
  }

  for (const item of recentlyUpdatedNewsResult.data ?? []) {
    if (item.status === "published") continue;
    events.push({
      id: `news-updated-${item.id}`,
      category: "Article changed",
      title: item.title,
      body: `${item.status} · ${item.source_name || "Market News"}`,
      at: item.updated_at ?? item.published_at ?? now,
      tone: item.status === "archived" ? "info" : "warning",
      href: item.source_url ?? undefined,
    });
  }

  for (const item of newListings30d.slice(0, 5)) {
    events.push({
      id: `listing-new-${item.id}`,
      category: "New listing indexed",
      title: item.title || item.id,
      body: [sourceIdToName(item.source_id || ""), item.island].filter(Boolean).join(" · "),
      at: item.first_seen_at ?? item.updated_at ?? now,
      tone: "info",
      href: `https://capeverderealestateindex.com/listing/${item.id}`,
    });
  }

  for (const source of weakSources.slice(0, 3)) {
    events.push({
      id: `source-health-${source.source_id}`,
      category: "Data health",
      title: `${source.sourceName} needs attention`,
      body: `Grade ${source.grade} · ${source.feed_conversion_pct}% feed conversion · ${source.public_feed_count_n} live`,
      at: source.last_updated_at ?? now,
      tone: "warning",
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    generatedAt: now,
    metrics,
    events: events.slice(0, 12),
  };
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabaseAuth
    .from("admin_notifications")
    .select("id,event_type,severity,title,body,entity_type,entity_id,meta,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[Admin] getAdminNotifications failed:", error.message);
    return [];
  }
  return (data ?? []) as AdminNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabaseAuth
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) {
    console.error("[Admin] getUnreadNotificationCount failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabaseAuth
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) {
    throw new Error(`[Admin] markNotificationRead failed: ${error.message}`);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabaseAuth
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    throw new Error(`[Admin] markAllNotificationsRead failed: ${error.message}`);
  }
}

// ============================================
// HOMEPAGE FEATURED SELECTIONS
// All reads/writes use supabaseAuth (authenticated JWT).
// ============================================

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

/** ISO 8601 week string for a given date (or today). 'YYYY-WNN', Monday-start. */
export function toIsoWeek(date: Date = new Date()): string {
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const jan4Monday = new Date(jan4);
  jan4Monday.setDate(jan4.getDate() - jan4Day + 1);
  const weekNum = Math.round((monday.getTime() - jan4Monday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${monday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns the Monday date for a given ISO week string. */
export function isoWeekToMonday(isoWeek: string): Date {
  const m = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return new Date();
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  // Jan 4 is always week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const jan4Monday = new Date(jan4);
  jan4Monday.setDate(jan4.getDate() - jan4Day + 1);
  const monday = new Date(jan4Monday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  return monday;
}

/** Fetch the 6 most recent weeks of selections (includes all statuses). */
export async function getFeaturedSelections(): Promise<FeaturedSelectionRow[]> {
  const { data, error } = await supabaseAuth
    .from("homepage_featured_selections")
    .select("*")
    .eq("market_id", "cv")
    .order("iso_week", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[Admin] getFeaturedSelections failed:", error.message);
    return [];
  }
  return (data ?? []) as FeaturedSelectionRow[];
}

/** Upsert a selection for a given ISO week. */
export async function saveFeaturedSelection(
  isoWeek: string,
  listingIds: string[],
  status: "draft" | "published",
  note?: string
): Promise<void> {
  const { data: sessionData } = await supabaseAuth.auth.getSession();
  const createdBy = sessionData.session?.user?.email ?? null;

  const { error } = await supabaseAuth
    .from("homepage_featured_selections")
    .upsert(
      {
        market_id: "cv",
        iso_week: isoWeek,
        listing_ids: listingIds,
        status,
        note: note ?? null,
        created_by: createdBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "market_id,iso_week" }
    );

  if (error) throw new Error(`[Admin] saveFeaturedSelection failed: ${error.message}`);
}

/** Promote a selection to published or demote to draft. */
export async function setFeaturedStatus(
  isoWeek: string,
  status: "draft" | "published"
): Promise<void> {
  const { error } = await supabaseAuth
    .from("homepage_featured_selections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("market_id", "cv")
    .eq("iso_week", isoWeek);

  if (error) throw new Error(`[Admin] setFeaturedStatus failed: ${error.message}`);
}

/** Delete a selection row entirely. */
export async function deleteFeaturedSelection(isoWeek: string): Promise<void> {
  const { error } = await supabaseAuth
    .from("homepage_featured_selections")
    .delete()
    .eq("market_id", "cv")
    .eq("iso_week", isoWeek);

  if (error) throw new Error(`[Admin] deleteFeaturedSelection failed: ${error.message}`);
}
