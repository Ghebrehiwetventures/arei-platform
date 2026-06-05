/**
 * JSON-API pagination strategy.
 *
 * Generic POST/GET driver for structured JSON listings APIs (Azure Search,
 * OData, Elastic, REST). Each request advances by either `skip`/`top`
 * (skip mode) or `page`/`per_page` (page mode), the response carries an
 * items array at the configured dot-path, and each raw item is mapped to a
 * GenericParsedListing via the source's item_map.
 */

import { getByPath, mapJsonItem } from "../parse/jsonItem";
import type {
  GenericFetchResult,
  GenericParsedListing,
  SourceFetchConfig,
} from "../types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Run the JSON-API pagination loop. Mutates `debug`. Caller must have
 * validated config.pagination.type === "json_api". When item_map is missing
 * we set the error/stopReason and return [].
 */
export async function runJsonApiStrategy(
  config: SourceFetchConfig,
  processedUrls: Set<string>,
  now: Date,
  debug: GenericFetchResult["debug"],
): Promise<GenericParsedListing[]> {
  const allListings: GenericParsedListing[] = [];

  const p = config.pagination;
  const method = (p.method || "POST").toUpperCase();
  const pageMode = p.page_mode || "skip";
  const pageSize = p.page_size ?? 20;
  const pageField = p.page_field || (pageMode === "skip" ? "skip" : "page");
  const sizeField = p.size_field || (pageMode === "skip" ? "top" : "per_page");
  const itemsPath = p.items_path || "value";
  const countPath = p.count_path;

  if (!config.item_map) {
    debug.errors.push("json_api pagination requires item_map on source config");
    debug.stopReason = "config_error_missing_item_map";
    return allListings;
  }

  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  const maxItems = config.max_items ?? 200;
  const maxPages = config.max_pages ?? 50;
  const startPage = config.pagination.start ?? 1;

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(
      `[GenericFetcher] Using json_api pagination for ${config.id} (${method} ${config.base_url})`,
    );
  }

  let pageNum = startPage;
  let totalFromServer: number | undefined;

  while (allListings.length < maxItems && pageNum <= startPage + maxPages - 1) {
    if (pageNum > startPage) {
      const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Waiting ${actualDelay}ms before json_api page ${pageNum}...`);
      }
      await sleep(actualDelay);
    }

    debug.pagesAttempted++;

    // skip mode: page 1 → skip 0, page 2 → skip pageSize, …
    // page mode: page 1 → page 1, page 2 → page 2, …
    const pageValue = pageMode === "skip" ? (pageNum - startPage) * pageSize : pageNum;

    let requestUrl = config.base_url;
    const headers: Record<string, string> = {
      "User-Agent": getRandomUserAgent(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Referer": config.base_url,
    };
    let bodyStr: string | undefined;

    if (method === "POST") {
      const body: Record<string, unknown> = { ...(p.body || {}) };
      body[pageField] = pageValue;
      body[sizeField] = pageSize;
      bodyStr = JSON.stringify(body);
    } else {
      const url = new URL(config.base_url);
      for (const [k, v] of Object.entries(p.query || {})) url.searchParams.set(k, v);
      url.searchParams.set(pageField, String(pageValue));
      url.searchParams.set(sizeField, String(pageSize));
      requestUrl = url.toString();
    }

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(
        `[GenericFetcher] json_api page ${pageNum}: ${pageField}=${pageValue} ${sizeField}=${pageSize}`,
      );
    }

    try {
      const response = await fetch(requestUrl, { method, headers, body: bodyStr });

      if (!response.ok) {
        debug.errors.push(`json_api page ${pageNum}: HTTP ${response.status}`);
        debug.stopReason = `json_api_http_${response.status}_page_${pageNum}`;
        break;
      }

      const json = await response.json();
      const bodyText = JSON.stringify(json);
      debug.htmlLengths.push(bodyText.length);
      debug.pagesSuccessful++;

      if (countPath && totalFromServer === undefined) {
        const tv = getByPath(json, countPath);
        if (typeof tv === "number") totalFromServer = tv;
      }

      const items = getByPath(json, itemsPath);
      if (!Array.isArray(items)) {
        debug.errors.push(
          `json_api page ${pageNum}: items_path "${itemsPath}" did not resolve to an array`,
        );
        debug.stopReason = `json_api_bad_items_path_page_${pageNum}`;
        break;
      }

      const pageListings: GenericParsedListing[] = [];
      for (const raw of items) {
        const mapped = mapJsonItem(raw, config, now);
        if (!mapped) continue;
        if (processedUrls.has(mapped.detailUrl || mapped.id)) continue;
        processedUrls.add(mapped.detailUrl || mapped.id);
        pageListings.push(mapped);
      }

      debug.listingsPerPage.push(pageListings.length);
      allListings.push(...pageListings);

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(
          `[GenericFetcher] json_api page ${pageNum}: ${items.length} items → ${pageListings.length} mapped (total: ${allListings.length}${totalFromServer !== undefined ? `/${totalFromServer}` : ""})`,
        );
      }

      if (items.length === 0) {
        debug.stopReason = "empty_listings";
        break;
      }
      if (items.length < pageSize) {
        debug.stopReason = "last_page_partial";
        break;
      }
      if (totalFromServer !== undefined && allListings.length >= totalFromServer) {
        debug.stopReason = "reached_server_total";
        break;
      }
      if (allListings.length >= maxItems) {
        debug.stopReason = "max_items_reached";
        break;
      }

      pageNum++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      debug.errors.push(`json_api page ${pageNum}: ${errMsg}`);
      debug.stopReason = `json_api_error_page_${pageNum}`;
      break;
    }
  }

  if (!debug.stopReason) debug.stopReason = "natural_end";

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] ===== Complete (json_api) =====`);
    console.log(`[GenericFetcher] Pages: ${debug.pagesSuccessful}/${debug.pagesAttempted}`);
    console.log(
      `[GenericFetcher] Total listings: ${allListings.length}${totalFromServer !== undefined ? ` (server total: ${totalFromServer})` : ""}`,
    );
    console.log(`[GenericFetcher] Stop reason: ${debug.stopReason}`);
  }

  return allListings;
}
