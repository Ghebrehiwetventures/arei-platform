// Shared list-page fetch wrapper used by both orchestrators.
// Identical body in core/ingestMarket.ts and scripts/ingest_to_curated.ts
// before this extraction.

import { fetchHeadless } from "../fetchHeadless";
import { fetchHtml, FetchResult } from "../fetchHtml";

const DEFAULT_LIST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Cache-Control": "no-cache",
} as const;

export function buildListFetchFn(fetchMethod: string | undefined): (url: string) => Promise<FetchResult> {
  return async (url: string): Promise<FetchResult> => {
    if (fetchMethod === "headless") {
      return fetchHeadless(url);
    }
    return fetchHtml(url, { headers: { ...DEFAULT_LIST_HEADERS } });
  };
}
