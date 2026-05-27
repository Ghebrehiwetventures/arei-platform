/**
 * AJAX-POST pagination strategy.
 *
 * Used by sites that serve paginated listings via a load-more endpoint that
 * returns JSON wrapping an HTML fragment (typical WordPress / Houzez pattern).
 * Each page is fetched with a POST whose body carries the configured params
 * plus the current page number; the response JSON exposes the HTML fragment
 * and a "has more" flag.
 */

import { makeAbsoluteUrl } from "../parse/url";
import { parseListingsFromHtml } from "../parse/listings";
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
 * Run the AJAX-POST load-more loop. Mutates `debug`. Caller must have
 * validated config.pagination.type === "ajax_post". When endpoint is missing
 * we set the error/stopReason and return [].
 */
export async function runAjaxPostStrategy(
  config: SourceFetchConfig,
  processedUrls: Set<string>,
  now: Date,
  debug: GenericFetchResult["debug"],
): Promise<GenericParsedListing[]> {
  const allListings: GenericParsedListing[] = [];

  const endpoint = config.pagination.endpoint;
  if (!endpoint) {
    debug.errors.push("ajax_post pagination requires endpoint");
    debug.stopReason = "config_error_missing_endpoint";
    return allListings;
  }

  const bodyParams = config.pagination.body_params || {};
  const pageParam = config.pagination.page_param || "paged";
  const htmlField = config.pagination.html_field || "html";
  const hasMoreField = config.pagination.has_more_field || "has_more_posts";
  const noResultValue = config.pagination.no_result_value || "no_result";

  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  const maxItems = config.max_items ?? 200;
  const maxPages = config.max_pages ?? 50;
  const startPage = config.pagination.start ?? 1;

  const ajaxUrl = makeAbsoluteUrl(endpoint, config.base_url);

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] Using ajax_post pagination for ${config.id}`);
    console.log(`[GenericFetcher] AJAX endpoint: ${ajaxUrl}`);
  }

  let currentPage = startPage;
  let hasMore = true;

  while (hasMore && allListings.length < maxItems && currentPage <= startPage + maxPages - 1) {
    if (currentPage > startPage) {
      const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Waiting ${actualDelay}ms before AJAX page ${currentPage}...`);
      }
      await sleep(actualDelay);
    }

    debug.pagesAttempted++;

    const postBody = new URLSearchParams();
    for (const [key, value] of Object.entries(bodyParams)) {
      postBody.append(key, value);
    }
    postBody.append(pageParam, String(currentPage));

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(
        `[GenericFetcher] AJAX POST page ${currentPage}: ${postBody.toString().substring(0, 200)}`,
      );
    }

    try {
      const response = await fetch(ajaxUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": getRandomUserAgent(),
          "Accept": "application/json, text/javascript, */*",
          "X-Requested-With": "XMLHttpRequest",
          "Referer": config.base_url,
          "Origin": new URL(config.base_url).origin,
        },
        body: postBody.toString(),
      });

      if (!response.ok) {
        debug.errors.push(`AJAX page ${currentPage}: HTTP ${response.status}`);
        debug.stopReason = `ajax_http_${response.status}_page_${currentPage}`;
        hasMore = false;
        break;
      }

      const jsonResponse = await response.json();
      const htmlContent = jsonResponse[htmlField] || "";
      const serverHasMore = jsonResponse[hasMoreField];

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(
          `[GenericFetcher] AJAX page ${currentPage}: html=${htmlContent.length} chars, hasMore=${serverHasMore}`,
        );
      }

      if (!htmlContent || htmlContent === noResultValue || htmlContent.trim() === "") {
        debug.stopReason = "ajax_no_result";
        hasMore = false;
        break;
      }

      debug.htmlLengths.push(htmlContent.length);
      debug.pagesSuccessful++;

      const pageListings = parseListingsFromHtml(
        htmlContent,
        config,
        processedUrls,
        now,
        debug.errors,
        ajaxUrl,
      );
      debug.listingsPerPage.push(pageListings.length);

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(
          `[GenericFetcher] AJAX page ${currentPage}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`,
        );
      }

      allListings.push(...pageListings);

      if (pageListings.length === 0) {
        debug.stopReason = "empty_listings";
        hasMore = false;
      } else if (!serverHasMore) {
        debug.stopReason = "ajax_server_no_more";
        hasMore = false;
      } else if (allListings.length >= maxItems) {
        debug.stopReason = "max_items_reached";
        hasMore = false;
      }

      currentPage++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      debug.errors.push(`AJAX page ${currentPage}: ${errMsg}`);
      debug.stopReason = `ajax_error_page_${currentPage}`;
      hasMore = false;
    }
  }

  if (!debug.stopReason) {
    debug.stopReason = "natural_end";
  }

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] ===== Complete (ajax_post) =====`);
    console.log(`[GenericFetcher] Pages: ${debug.pagesSuccessful}/${debug.pagesAttempted}`);
    console.log(`[GenericFetcher] Total listings: ${allListings.length}`);
    console.log(`[GenericFetcher] Stop reason: ${debug.stopReason}`);
  }

  return allListings;
}
