import { Market, Source, Listing, SourceStatus } from "./types";

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
      console.log("[diagnostics] Loaded ingest report from artifacts");
      return cachedReport;
    }
  } catch {
    console.log("[diagnostics] No ingest report found, using MOCK data");
  }
  return null;
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
    },
  }));

  const allListings = [...report.visibleListings, ...report.hiddenListings];
  const listings: Listing[] = allListings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    description: l.description || (l.violations ? `[HIDDEN: ${l.violations.join(", ")}]` : undefined),
    images: l.images || [],
    sourceName: l.sourceName,
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
    sourceName: "MOCK Source A",
    title: "MOCK Apartment in Praia",
    price: 45000,
    description: "2 bedroom apartment near the beach",
    images: [],
  },
  {
    id: "lst_2",
    sourceName: "MOCK Source A",
    title: undefined,
    price: 120000,
    description: "Large house with garden",
    images: ["https://via.placeholder.com/400x300", "https://via.placeholder.com/400x300/eee"],
  },
  {
    id: "lst_3",
    sourceName: "MOCK Source C",
    title: "MOCK Villa Mindelo",
    price: undefined,
    description: undefined,
    images: ["https://via.placeholder.com/400x300"],
  },
  {
    id: "lst_4",
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
// EXPORTS
// ============================================

let marketsCache: Market[] | null = null;

export async function getMarketsAsync(): Promise<Market[]> {
  if (marketsCache) return marketsCache;

  const report = await loadIngestReport();
  if (report) {
    marketsCache = [convertReportToMarket(report)];
  } else {
    marketsCache = [getMockMarket()];
  }
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
loadIngestReport().then((report) => {
  if (report) {
    marketsCache = [convertReportToMarket(report)];
  }
});
