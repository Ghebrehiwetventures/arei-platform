/**
 * URL-loop pagination strategy.
 *
 * Handles the default URL-based pagination types: query_param, offset,
 * path_segment, next_link, and "none" (single-page fetch). Each iteration
 * builds a page URL via buildPaginationUrl, fetches it, parses listings,
 * and checks the configured stop condition.
 *
 * The click_next, ajax_post, and json_api strategies live in sibling modules.
 */

import * as cheerio from "cheerio";
import type { FetchResult } from "../../fetchHtml";
import { parseListingsFromHtml } from "../parse/listings";
import type {
  GenericFetchResult,
  GenericParsedListing,
  SourceFetchConfig,
} from "../types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build the URL for the Nth page given the source's pagination config. */
export function buildPaginationUrl(config: SourceFetchConfig, pageNum: number): string {
  const pagination = config.pagination;

  if (pagination.type === "none") {
    return config.base_url;
  }

  // First page often has no pagination param (e.g. /properties/ not /properties/?page=1).
  if (pageNum === (pagination.start ?? 1) && pagination.first_no_param) {
    return config.base_url;
  }

  if (pagination.type === "query_param" && pagination.param) {
    const separator = config.base_url.includes("?") ? "&" : "?";
    return `${config.base_url}${separator}${pagination.param}=${pageNum}`;
  }

  if (pagination.type === "offset" && pagination.param) {
    const offset = (pageNum - 1) * (pagination.increment || 10);
    const separator = config.base_url.includes("?") ? "&" : "?";
    return `${config.base_url}${separator}${pagination.param}=${offset}`;
  }

  if (pagination.type === "path_segment" && pagination.pattern) {
    // e.g. pattern="/page/{page}/" → append "/page/2/" to base URL
    const segment = pagination.pattern.replace("{page}", String(pageNum));
    const base = config.base_url.endsWith("/") ? config.base_url : config.base_url + "/";
    const cleanSegment = segment.startsWith("/") ? segment.slice(1) : segment;
    return base + cleanSegment;
  }

  return config.base_url;
}

/**
 * Run the URL-based pagination loop. Mutates `debug` (pagesAttempted,
 * pagesSuccessful, listingsPerPage, htmlLengths, errors, warnings,
 * stopReason). Returns the listings collected across all fetched pages.
 */
export async function runUrlLoopStrategy(
  config: SourceFetchConfig,
  doFetch: (url: string) => Promise<FetchResult>,
  processedUrls: Set<string>,
  now: Date,
  debug: GenericFetchResult["debug"],
): Promise<GenericParsedListing[]> {
  const allListings: GenericParsedListing[] = [];

  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  const maxItems = config.max_items ?? 200;
  const maxPages = config.max_pages ?? 50;
  const stopCondition = config.stop_condition ?? "empty_listings";
  const startPage = config.pagination.start ?? 1;
  const increment = config.pagination.increment ?? 1;

  let currentPage = startPage;
  let hasMore = true;
  let lastHtml = "";

  while (hasMore && allListings.length < maxItems && currentPage <= startPage + maxPages - 1) {
    if (currentPage > startPage) {
      const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Waiting ${actualDelay}ms before page ${currentPage}...`);
      }
      await sleep(actualDelay);
    }

    const url = buildPaginationUrl(config, currentPage);
    debug.pagesAttempted++;

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Fetching page ${currentPage}: ${url}`);
    }

    const result = await doFetch(url);

    if (!result.success || !result.html) {
      debug.errors.push(`Page ${currentPage}: ${result.error || "No HTML"}`);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Failed page ${currentPage}: ${result.error}`);
      }
      hasMore = false;
      debug.stopReason = `fetch_failed_page_${currentPage}`;
      break;
    }

    if (result.statusCode !== 200) {
      debug.errors.push(`Page ${currentPage}: HTTP ${result.statusCode}`);
      hasMore = false;
      debug.stopReason = `http_${result.statusCode}_page_${currentPage}`;
      break;
    }

    debug.htmlLengths.push(result.html.length);

    // Duplicate page content = pagination silently failed (e.g. infinite-scroll
    // sites that return page 1 for every query param).
    if (result.html === lastHtml) {
      debug.stopReason = "duplicate_page_content";
      hasMore = false;
      break;
    }
    lastHtml = result.html;

    debug.pagesSuccessful++;

    const pageListings = parseListingsFromHtml(
      result.html,
      config,
      processedUrls,
      now,
      debug.errors,
      url,
    );
    debug.listingsPerPage.push(pageListings.length);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(
        `[GenericFetcher] Page ${currentPage}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`,
      );
    }

    if (stopCondition === "empty_listings" && pageListings.length === 0) {
      debug.stopReason = "empty_listings";
      hasMore = false;
    } else if (stopCondition === "max_items" && allListings.length + pageListings.length >= maxItems) {
      debug.stopReason = "max_items_reached";
      hasMore = false;
    } else if (stopCondition === "max_pages" && currentPage >= startPage + maxPages - 1) {
      debug.stopReason = "max_pages_reached";
      hasMore = false;
    } else if (stopCondition === "no_next_link" && config.pagination.next_selector) {
      const $ = cheerio.load(result.html);
      const nextLink = $(config.pagination.next_selector);
      if (nextLink.length === 0) {
        debug.stopReason = "no_next_link";
        hasMore = false;
      }
    }

    allListings.push(...pageListings);
    // offset pagination uses pageNum as a 1-based counter that buildPaginationUrl
    // converts into a byte offset; bump by 1 here regardless of `increment`.
    currentPage += config.pagination.type === "offset" ? 1 : increment;
  }

  if (!debug.stopReason && allListings.length >= maxItems) {
    debug.stopReason = "max_items_reached";
  }
  if (!debug.stopReason) {
    debug.stopReason = "natural_end";
  }

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] ===== Complete =====`);
    console.log(`[GenericFetcher] Pages: ${debug.pagesSuccessful}/${debug.pagesAttempted}`);
    console.log(`[GenericFetcher] Total listings: ${allListings.length}`);
    console.log(`[GenericFetcher] Stop reason: ${debug.stopReason}`);
    console.log(`[GenericFetcher] HTML lengths: ${debug.htmlLengths.join(", ")}`);
  }

  return allListings;
}
