import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  uiLang: string;
};

// published_at / created_at arrive as ISO timestamptz strings from Supabase.
// MarketNewsItem expects a plain date string ("YYYY-MM-DD").
function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}


function toMarketNewsItem(row: MarketNewsRow): MarketNewsItem {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    sourceName: row.source_name ?? "Unknown",
    sourceUrl: row.source_url,
    publishedAt: row.published_at ? isoToDate(row.published_at) : isoToDate(row.created_at),
    category: row.category as MarketNewsCategory,
    snippet: row.snippet,
    whyItMatters: row.why_it_matters ?? undefined,
    signalTags: row.signal_tags ?? undefined,
    affectedRegions: row.affected_regions ?? undefined,
    addedAt: isoToDate(row.created_at),
    relevance: row.relevance,
    language: row.language ?? undefined,
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
  const { i18n } = useTranslation();
  const uiLang = i18n.language.split("-")[0];
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

  return { items, loading, error, uiLang };
}
