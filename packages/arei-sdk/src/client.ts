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

// Optional columns that may not exist yet (added by later migrations)
const DETAIL_COLUMNS_OPTIONAL = ["description_html"];

const DETAIL_COLUMNS = [...DETAIL_COLUMNS_BASE, ...DETAIL_COLUMNS_OPTIONAL].join(",");
const DETAIL_COLUMNS_FALLBACK = DETAIL_COLUMNS_BASE.join(",");

// ---------------------------------------------------------------------------
// Client class
// ---------------------------------------------------------------------------
export class AREIClient {
  private sb: SupabaseClient;

  constructor(config: AREIConfig);
  constructor(client: SupabaseClient);
  constructor(configOrClient: AREIConfig | SupabaseClient) {
    const config = configOrClient as AREIConfig;
    if (config && "supabaseUrl" in config && "supabaseAnonKey" in config) {
      this.sb = createClient(config.supabaseUrl, config.supabaseAnonKey);
    } else {
      this.sb = configOrClient as SupabaseClient;
    }
  }

  // =========================================================================
  // getListings — paginated, filterable
  // =========================================================================
  async getListings(
    params: GetListingsParams = {}
  ): Promise<PaginatedListings> {
    const { page = 1, pageSize = 12, island, priceBucket } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.sb
      .from(VIEW)
      .select(CARD_COLUMNS, { count: "exact" });

    // Island filter
    if (island) {
      query = query.eq("island", island);
    }

    // Price bucket filter
    if (priceBucket) {
      const bucket = PRICE_BUCKETS[priceBucket];
      query = query
        .gt("price", 0)
        .gte("price", bucket.min)
        .lte("price", bucket.max);
    }

    // Sort and paginate
    query = query
      .order("first_seen_at", { ascending: false })
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
      .from(VIEW)
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .single();

    // Retry without optional columns if the DB doesn't have them yet (42703 = column not found)
    if (error && error.code === "42703") {
      ({ data, error } = await this.sb
        .from(VIEW)
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
      .from(VIEW)
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
        .from(VIEW)
        .select(CARD_COLUMNS)
        .eq("island", listing.island)
        .gt("price", 0)
        .neq("id", listing.id)
        .order("first_seen_at", { ascending: false })
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
      .from(VIEW)
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
      .from(VIEW)
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
}
