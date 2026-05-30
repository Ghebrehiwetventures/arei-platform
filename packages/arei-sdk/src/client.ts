// =============================================================================
// arei-sdk/src/client.ts
// AREI client for consumer sites
// All reads go through v1_feed_* views. Never reads public.listings directly.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  AREIConfig,
  GetListingsParams,
  GetSimilarParams,
  PaginatedListings,
  IslandOption,
  IslandMedianStat,
  IslandContext,
  ListingRow,
  ListingCard,
  ListingDetail,
  PriceBucket,
  MarketNewsRow,
  MarketReportRow,
  FeaturedSelectionRow,
  AgencyRow,
} from "./types.js";
import {
  PRICE_BUCKETS,
  MIN_MEDIAN_SAMPLE,
  PRICE_FLOOR,
  PRICE_CEILING,
} from "./types.js";
import { toListingCard, toListingDetail } from "./transforms.js";

// ---------------------------------------------------------------------------
// View name — change per market
// ---------------------------------------------------------------------------
const VIEW = "v1_feed_cv";

// ---------------------------------------------------------------------------
// Card columns — only fetch what the card needs
// ---------------------------------------------------------------------------
const CARD_COLUMNS = [
  "id",
  "title",
  "island",
  "city",
  "price",
  "currency",
  "property_type",
  "bedrooms",
  "bathrooms",
  "land_area_sqm",
  "image_urls",
  "source_id",
  "first_seen_at",
  "ai_descriptions",
].join(",");

// ---------------------------------------------------------------------------
// Detail columns — full row
// ---------------------------------------------------------------------------
const DETAIL_COLUMNS_BASE = [
  "id",
  "title",
  "island",
  "city",
  "price",
  "currency",
  "property_type",
  "bedrooms",
  "bathrooms",
  "land_area_sqm",
  "property_size_sqm",
  "description",
  "image_urls",
  "source_id",
  "source_url",
  "first_seen_at",
  "last_seen_at",
];

// Optional columns that may not exist yet (added by later migrations).
// `ai_descriptions` is added to `listings` in migration 025 and exposed
// through v1_feed_cv in migration 026 — the graceful fallback means the
// SDK still works against environments where 026 hasn't been applied.
const DETAIL_COLUMNS_OPTIONAL = ["description_html", "ai_descriptions"];

const DETAIL_COLUMNS = [...DETAIL_COLUMNS_BASE, ...DETAIL_COLUMNS_OPTIONAL].join(",");
const DETAIL_COLUMNS_FALLBACK = DETAIL_COLUMNS_BASE.join(",");

// ---------------------------------------------------------------------------
// ISO week helper — 'YYYY-WNN' with ISO Monday-start convention
// ---------------------------------------------------------------------------
function currentIsoWeek(): string {
  const d = new Date();
  // ISO 8601: week starts Monday; day 0 = Sunday = offset -6, else 1 - day
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);

  // ISO week number: Jan 4 is always in week 1
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const jan4Day = jan4.getDay() || 7; // treat Sunday as 7
  const jan4Monday = new Date(jan4);
  jan4Monday.setDate(jan4.getDate() - jan4Day + 1);
  const weekNum = Math.round((monday.getTime() - jan4Monday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const year = monday.getFullYear();
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------
export class AREIClient {
  private sb: SupabaseClient;
  private view: string;

  constructor(config: AREIConfig);
  constructor(client: SupabaseClient);
  constructor(configOrClient: AREIConfig | SupabaseClient) {
    const config = configOrClient as AREIConfig;
    if (config && "supabaseUrl" in config && "supabaseAnonKey" in config) {
      this.sb = createClient(config.supabaseUrl, config.supabaseAnonKey);
      this.view = config.feedView ?? VIEW;
    } else {
      this.sb = configOrClient as SupabaseClient;
      this.view = VIEW;
    }
  }

  // =========================================================================
  // getListings — paginated, filterable
  // =========================================================================
  async getListings(
    params: GetListingsParams = {}
  ): Promise<PaginatedListings> {
    const { page = 1, pageSize = 12, island, priceBucket, propertyType, minBeds, sourceId } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.sb
      .from(this.view)
      .select(CARD_COLUMNS, { count: "exact" });

    // Island filter
    if (island) {
      query = query.eq("island", island);
    }

    // Property type filter — case-insensitive equality.
    // DB values are normalized lowercase by the ingester (see core/ingestCv.ts
    // extractPropertyType), but ilike keeps us safe against legacy rows.
    if (propertyType) {
      query = query.ilike("property_type", propertyType);
    }

    // Minimum bedrooms
    if (minBeds && minBeds > 0) {
      query = query.gte("bedrooms", minBeds);
    }

    // Source filter — exact match on source_id column
    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    // Price bucket filter
    if (priceBucket) {
      const bucket = PRICE_BUCKETS[priceBucket];
      query = query
        .gt("price", 0)
        .gte("price", bucket.min)
        .lte("price", bucket.max);
    }

    // Sort and paginate. `id` is the unique tie-breaker — without it, rows
    // sharing a `first_seen_at` value can drift between pages, making the same
    // listing appear on multiple pages of the paginated feed.
    query = query
      .order("first_seen_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) throw new Error(`getListings failed: ${error.message}`);

    const rows = (data ?? []) as unknown as ListingRow[];
    const total = count ?? 0;

    return {
      data: rows.map(toListingCard),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // =========================================================================
  // getListing — single listing for detail page
  // =========================================================================
  async getListing(id: string): Promise<ListingDetail | null> {
    let { data, error } = await this.sb
      .from(this.view)
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .single();

    // Retry without optional columns if the DB doesn't have them yet (42703 = column not found)
    if (error && error.code === "42703") {
      ({ data, error } = await this.sb
        .from(this.view)
        .select(DETAIL_COLUMNS_FALLBACK)
        .eq("id", id)
        .single());
    }

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(`getListing failed: ${error.message}`);
    }

    return toListingDetail(data as unknown as ListingRow);
  }

  // =========================================================================
  // getIslandOptions — for filter dropdown
  // =========================================================================
  async getIslandOptions(): Promise<IslandOption[]> {
    // Supabase JS doesn't support GROUP BY natively,
    // so we fetch distinct islands and count via RPC or a simple approach.
    // Using a raw query via rpc would be ideal, but for v1 we fetch all
    // island values and count client-side. With 377 rows this is fine.

    const { data, error } = await this.sb
      .from(this.view)
      .select("island");

    if (error) throw new Error(`getIslandOptions failed: ${error.message}`);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const island = (row as { island: string }).island;
      counts.set(island, (counts.get(island) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([island, count]) => ({ island, count }))
      .sort((a, b) => b.count - a.count);
  }

  // =========================================================================
  // getSimilarListings — fallback chain for detail page
  // =========================================================================
  async getSimilarListings(
    params: GetSimilarParams
  ): Promise<ListingCard[]> {
    const { listing, limit = 4, minResults = 2 } = params;

    // Guard: no island → no query possible
    if (!listing.island) return [];

    const hasType = listing.property_type != null;
    const hasPrice = listing.price != null && listing.price > 0;
    const hasBedrooms =
      hasType &&
      listing.property_type!.toLowerCase() !== "land" &&
      listing.bedrooms != null;

    // Build deterministic strategy list
    type Strategy = {
      type?: string;
      minPrice?: number;
      maxPrice?: number;
      minBed?: number;
      maxBed?: number;
    };
    const strategies: Strategy[] = [];

    if (hasType && hasPrice && hasBedrooms) {
      const minPrice = Math.max(0, Math.round(listing.price! * 0.7));
      const maxPrice = Math.round(listing.price! * 1.3);
      const minBed = Math.max(0, listing.bedrooms! - 1);
      const maxBed = listing.bedrooms! + 1;
      // Step 1: island + type + price + bedrooms
      strategies.push({
        type: listing.property_type!,
        minPrice,
        maxPrice,
        minBed,
        maxBed,
      });
      // Step 2: island + type + price
      strategies.push({
        type: listing.property_type!,
        minPrice,
        maxPrice,
      });
    } else if (hasType && hasPrice) {
      const minPrice = Math.max(0, Math.round(listing.price! * 0.7));
      const maxPrice = Math.round(listing.price! * 1.3);
      // Step 2: island + type + price
      strategies.push({
        type: listing.property_type!,
        minPrice,
        maxPrice,
      });
    }

    if (hasType) {
      // Step 3: island + type
      strategies.push({ type: listing.property_type! });
    }

    if (!hasType) {
      // Step 4: island only (only when type is null)
      strategies.push({});
    }

    let lastResults: ListingCard[] = [];

    for (const strategy of strategies) {
      let query = this.sb
        .from(this.view)
        .select(CARD_COLUMNS)
        .eq("island", listing.island)
        .gt("price", 0)
        .neq("id", listing.id)
        .order("first_seen_at", { ascending: false })
        .order("id", { ascending: true })
        .limit(limit + 4);

      if (strategy.type) {
        query = query.eq("property_type", strategy.type);
      }
      if (strategy.minPrice != null && strategy.maxPrice != null) {
        query = query
          .gte("price", strategy.minPrice)
          .lte("price", strategy.maxPrice);
      }
      if (strategy.minBed != null && strategy.maxBed != null) {
        query = query
          .gte("bedrooms", strategy.minBed)
          .lte("bedrooms", strategy.maxBed);
      }

      const { data, error } = await query;
      if (error) continue;

      const rows = (data ?? []) as unknown as ListingRow[];
      let cards = rows.map(toListingCard);

      if (hasPrice) {
        cards.sort(
          (a, b) =>
            Math.abs((a.price ?? 0) - listing.price!) -
            Math.abs((b.price ?? 0) - listing.price!)
        );
      }

      lastResults = cards.slice(0, limit);

      if (lastResults.length >= minResults) {
        return lastResults;
      }
    }

    return lastResults;
  }

  // =========================================================================
  // getMarketStats — per-island median price
  // =========================================================================
  async getMarketStats(): Promise<{
    total: number;
    sourceCount: number;
    islands: IslandMedianStat[];
  }> {
    // Fetch all prices + islands + source_ids for stats computation.
    // With ~400 rows this is efficient. For larger feeds, move to an RPC.

    const { data, error } = await this.sb
      .from(this.view)
      .select("island, price, source_id");

    if (error) throw new Error(`getMarketStats failed: ${error.message}`);

    const rows = (data ?? []) as { island: string; price: number | null; source_id: string | null }[];
    const total = rows.length;
    const sourceCount = new Set(rows.map((r) => r.source_id).filter(Boolean)).size;

    // Group prices by island, applying outlier filter
    const byIsland = new Map<string, number[]>();
    for (const row of rows) {
      if (!byIsland.has(row.island)) byIsland.set(row.island, []);
      if (
        row.price != null &&
        row.price >= PRICE_FLOOR &&
        row.price <= PRICE_CEILING
      ) {
        byIsland.get(row.island)!.push(row.price);
      }
    }

    // Compute medians
    const islands: IslandMedianStat[] = [];
    for (const [island, prices] of byIsland) {
      prices.sort((a, b) => a - b);
      const n = prices.length;
      const median =
        n >= MIN_MEDIAN_SAMPLE
          ? n % 2 === 0
            ? (prices[n / 2 - 1] + prices[n / 2]) / 2
            : prices[Math.floor(n / 2)]
          : null;

      islands.push({
        island,
        n_price: n,
        median_price: median,
      });
    }

    // Sort by count descending
    islands.sort((a, b) => b.n_price - a.n_price);

    return { total, sourceCount, islands };
  }

  // =========================================================================
  // getIslandContext — market context for a listing's island
  // =========================================================================
  async getIslandContext(
    island: string,
    listingPrice: number | null
  ): Promise<IslandContext> {
    const { data, error } = await this.sb
      .from(this.view)
      .select("price, property_size_sqm, last_seen_at")
      .eq("island", island);

    if (error) throw new Error(`getIslandContext failed: ${error.message}`);

    const rows = (data ?? []) as {
      price: number | null;
      property_size_sqm: number | null;
      last_seen_at: string | null;
    }[];

    // --- Valid prices (outlier-filtered) ---
    const validPrices: number[] = [];
    for (const row of rows) {
      if (
        row.price != null &&
        row.price >= PRICE_FLOOR &&
        row.price <= PRICE_CEILING
      ) {
        validPrices.push(row.price);
      }
    }
    validPrices.sort((a, b) => a - b);
    const n = validPrices.length;

    // --- Median price ---
    const medianPrice =
      n >= MIN_MEDIAN_SAMPLE
        ? n % 2 === 0
          ? (validPrices[n / 2 - 1] + validPrices[n / 2]) / 2
          : validPrices[Math.floor(n / 2)]
        : null;

    // --- Median price per sqm ---
    const pricesPerSqm: number[] = [];
    for (const row of rows) {
      if (
        row.price != null &&
        row.price >= PRICE_FLOOR &&
        row.price <= PRICE_CEILING &&
        row.property_size_sqm != null &&
        row.property_size_sqm > 0
      ) {
        pricesPerSqm.push(row.price / row.property_size_sqm);
      }
    }
    pricesPerSqm.sort((a, b) => a - b);
    const nSqm = pricesPerSqm.length;
    const medianPricePerSqm =
      nSqm >= MIN_MEDIAN_SAMPLE
        ? nSqm % 2 === 0
          ? (pricesPerSqm[nSqm / 2 - 1] + pricesPerSqm[nSqm / 2]) / 2
          : pricesPerSqm[Math.floor(nSqm / 2)]
        : null;

    // --- Price percentile ---
    let pricePercentile: number | null = null;
    if (
      listingPrice != null &&
      listingPrice >= PRICE_FLOOR &&
      listingPrice <= PRICE_CEILING &&
      n >= MIN_MEDIAN_SAMPLE
    ) {
      const below = validPrices.filter((p) => p < listingPrice).length;
      pricePercentile = Math.round((below / n) * 100);
    }

    // --- Last updated ---
    let lastUpdated: string | null = null;
    for (const row of rows) {
      if (row.last_seen_at && (!lastUpdated || row.last_seen_at > lastUpdated)) {
        lastUpdated = row.last_seen_at;
      }
    }

    return {
      island,
      activeListings: n,
      medianPrice,
      medianPricePerSqm,
      nSqmListings: nSqm,
      pricePercentile,
      lastUpdated,
    };
  }

  // =========================================================================
  // getFeaturedListings — fetch the admin-curated selection for a given ISO
  // week (defaults to the current week). Returns null when no published
  // selection exists — callers should fall back to algorithmic selection.
  // =========================================================================
  async getFeaturedListings(isoWeek?: string): Promise<ListingCard[] | null> {
    const week = isoWeek ?? currentIsoWeek();

    const { data, error } = await this.sb
      .from("homepage_featured_selections")
      .select("listing_ids")
      .eq("market_id", "cv")
      .eq("iso_week", week)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw new Error(`getFeaturedListings failed: ${error.message}`);
    if (!data || !Array.isArray(data.listing_ids) || data.listing_ids.length === 0) {
      return null;
    }

    const { data: rows, error: rowErr } = await this.sb
      .from(this.view)
      .select(CARD_COLUMNS)
      .in("id", data.listing_ids as string[]);

    if (rowErr) throw new Error(`getFeaturedListings rows failed: ${rowErr.message}`);

    // Return in the order the admin pinned them
    const typedRows = (rows ?? []) as unknown as ListingRow[];
    const byId = new Map(typedRows.map((r) => [r.id, r]));
    const ordered = (data.listing_ids as string[])
      .map((id) => byId.get(id))
      .filter((r): r is ListingRow => r != null);

    return ordered.map(toListingCard);
  }

  // =========================================================================
  // getAgencies — public agency directory for a given market
  // Only returns public-safe columns — never joins agency_relationships.
  // =========================================================================
  async getAgencies(marketCode = "cv"): Promise<AgencyRow[]> {
    const { data, error } = await this.sb
      .from("agencies")
      .select(
        "id, market_code, agency_name, public_display_name, website, email, phone, logo_url, description, source_ids, claimed_status, created_at"
      )
      .eq("market_code", marketCode)
      .order("agency_name", { ascending: true });

    if (error) throw new Error(`getAgencies failed: ${error.message}`);
    return (data ?? []) as AgencyRow[];
  }

  // =========================================================================
  // subscribeNewsletter — insert email into newsletter_subscribers
  // =========================================================================
  async subscribeNewsletter(email: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.sb
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        // Unique constraint — already subscribed
        return { ok: true };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // =========================================================================
  // getMarketNews — published market news items for public display
  // RLS on public.market_news ensures only status = 'published' is returned.
  // =========================================================================
  async getMarketNews(): Promise<MarketNewsRow[]> {
    const { data, error } = await this.sb
      .from("market_news")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) throw new Error(`getMarketNews failed: ${error.message}`);
    return (data ?? []) as MarketNewsRow[];
  }

  // =========================================================================
  // getMarketReportSnapshot — latest published market report stats
  //
  // Returns one row per island plus the 'ALL' aggregate row, from the most
  // recent snapshot where status = 'published' AND published_at IS NOT NULL.
  //
  // Both conditions are checked here and enforced by RLS — belt-and-suspenders.
  // Draft snapshots are invisible to this method regardless of snapshot_date.
  //
  // Returns an empty array if no published snapshot exists yet.
  // =========================================================================
  async getMarketReportSnapshot(): Promise<MarketReportRow[]> {
    // Supabase JS does not support a correlated subquery in .eq(), so we fetch
    // the latest published date in one round-trip, then fetch the rows.
    const { data: dateData, error: dateError } = await this.sb
      .from("market_report_snapshots")
      .select("snapshot_date")
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dateError) {
      throw new Error(`getMarketReportSnapshot (date lookup) failed: ${dateError.message}`);
    }

    if (!dateData) return [];

    const latestDate = (dateData as { snapshot_date: string }).snapshot_date;

    const { data, error } = await this.sb
      .from("market_report_snapshots")
      .select(
        "snapshot_date, island, listing_count, source_count, " +
        "index_eligible_count, median_price_eur, avg_eur_per_sqm, " +
        "sqm_coverage_pct, price_coverage_pct, methodology_version, " +
        "published_at, last_updated"
      )
      .eq("snapshot_date", latestDate)
      .eq("status", "published")
      .not("published_at", "is", null)
      .order("island");

    if (error) {
      throw new Error(`getMarketReportSnapshot failed: ${error.message}`);
    }

    // TODO: ta bort dubbel-cast när migration 044 körts och
    // Supabase-typerna regenererats — då härleds MarketReportRow korrekt
    return (data ?? []) as unknown as MarketReportRow[];
  }
}
