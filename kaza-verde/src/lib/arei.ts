import { AREIClient } from "arei-sdk";

let _client: AREIClient | null = null;

function getClient(): AREIClient {
  if (_client) return _client;

  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !key) {
    const msg =
      "Missing Supabase config. Copy kaza-verde/.env.example to .env and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
    if (import.meta.env.DEV) {
      console.warn("[arei] " + msg);
    }
    throw new Error(msg);
  }

  if (import.meta.env.DEV) {
    console.info("[arei] AREIClient initialized with VITE_SUPABASE_URL");
  }

  _client = new AREIClient({ supabaseUrl: url, supabaseAnonKey: key });
  return _client;
}

/** Lazy-initialized so the app can load (e.g. Home) even before .env is set. Fails when first used if env is missing. */
export const arei = {
  getListings: (p: Parameters<AREIClient["getListings"]>[0]) => getClient().getListings(p),
  getListing: (id: string) => getClient().getListing(id),
  getSimilarListings: (p: Parameters<AREIClient["getSimilarListings"]>[0]) => getClient().getSimilarListings(p),
  getMarketStats: () => getClient().getMarketStats(),
  getIslandOptions: () => getClient().getIslandOptions(),
  getIslandContext: (island: string, listingPrice: number | null) =>
    getClient().getIslandContext(island, listingPrice),
  subscribeNewsletter: (email: string) => getClient().subscribeNewsletter(email),
};
