import { useEffect, useState } from "react";
import type { MarketNewsRow } from "arei-sdk";
import { arei } from "../lib/arei";
import {
  MARKET_NEWS_ITEMS,
  type MarketNewsCategory,
  type MarketNewsItem,
} from "../lib/market-news-data";

export type UseMarketNewsResult = {
  items: MarketNewsItem[];
  loading: boolean;
  error: string | null;
};

// published_at / created_at arrive as ISO timestamptz strings from Supabase.
// MarketNewsItem expects a plain date string ("YYYY-MM-DD").
function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

// Safety net: map any legacy 11-category value to the consolidated 5 so the
// UI is correct even before migration 041 normalises the stored data. Remove
// this once 041 has run in prod and the CHECK constraint is in place.
const LEGACY_CATEGORY: Record<string, MarketNewsCategory> = {
  "Currency / macro risk": "Economy",
  "Foreign investment": "Economy",
  Hospitality: "Tourism",
  Aviation: "Infrastructure",
  Construction: "Infrastructure",
  "Policy / regulation": "Policy & Tax",
  "Tax / residency": "Policy & Tax",
  "Banking / credit": "Banking & Credit",
  Property: "Economy",
  Other: "Economy",
};

function normalizeCategory(raw: string): MarketNewsCategory {
  return LEGACY_CATEGORY[raw] ?? (raw as MarketNewsCategory);
}

function toMarketNewsItem(row: MarketNewsRow): MarketNewsItem {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    publishedAt: row.published_at ? isoToDate(row.published_at) : isoToDate(row.created_at),
    category: normalizeCategory(row.category),
    snippet: row.snippet,
    whyItMatters: row.why_it_matters ?? undefined,
    signalTags: row.signal_tags ?? undefined,
    affectedRegions: row.affected_regions ?? undefined,
    addedAt: isoToDate(row.created_at),
    relevance: row.relevance,
  };
}

/*
 * Phase 2b — reads from public.market_news (status = 'published').
 * Falls back to MARKET_NEWS_ITEMS when:
 *   - env vars are missing (getClient() throws synchronously)
 *   - Supabase query errors
 *   - Supabase returns zero rows
 *
 * MarketNews.tsx does not need to change.
 */
export function useMarketNews(): UseMarketNewsResult {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await arei.getMarketNews();
        if (cancelled) return;
        setItems(rows.length > 0 ? rows.map(toMarketNewsItem) : MARKET_NEWS_ITEMS);
        setLoading(false);
      } catch {
        if (cancelled) return;
        // Silent fallback — public page always has content
        setItems(MARKET_NEWS_ITEMS);
        setError(null);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
