import { useMemo } from "react";
import { MARKET_NEWS_ITEMS, type MarketNewsItem } from "../lib/market-news-data";

export type UseMarketNewsResult = {
  items: MarketNewsItem[];
  loading: boolean;
  error: string | null;
};

/*
 * Phase 1 — static curated data, no network calls.
 *
 * Phase 2 replacement (Supabase):
 *   Replace this hook body with:
 *
 *   const [items, setItems] = useState<MarketNewsItem[]>([]);
 *   const [loading, setLoading] = useState(true);
 *   const [error, setError] = useState<string | null>(null);
 *
 *   useEffect(() => {
 *     supabase
 *       .from("market_news")
 *       .select("*")
 *       .eq("status", "published")
 *       .order("published_at", { ascending: false })
 *       .then(({ data, error }) => {
 *         if (error) setError(error.message);
 *         else setItems(data ?? []);
 *         setLoading(false);
 *       });
 *   }, []);
 *
 *   return { items, loading, error };
 *
 * The component (MarketNews.tsx) does not need to change.
 * Map DB column names to MarketNewsItem field names in the select or a transform.
 */
export function useMarketNews(): UseMarketNewsResult {
  const items = useMemo(() => MARKET_NEWS_ITEMS, []);
  return { items, loading: false, error: null };
}
