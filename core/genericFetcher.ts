/**
 * Generic Config-Driven Paginated Fetcher
 *
 * PoC Goal: Zero source-specific code. All behavior from config.
 * Adding a new source = add YAML config only, no code changes.
 */

import * as cheerio from "cheerio";
import { fetchHtml, FetchResult } from "./fetchHtml";
import { CMSType, CMS_PRESETS, detectCMS, mergeWithPreset, getImageAttrs } from "./cmsPresets";
import {
  detectPaginationType,
  findWorkingNextSelector,
  PaginationDetectionResult,
  DETECTION_LIMITATIONS,
} from "./paginationDetector";

// Config + result types live in ./fetcher/types so strategy and parse modules
// can import them without pulling in this orchestrator. Re-exported here so
// existing callers (ingestMarket, runMarketSource, configLoader, …) keep
// working unchanged.
export type {
  PaginationType,
  StopCondition,
  FetchMethod,
  PaginationConfig,
  ItemMapArrayPick,
  ItemMapConfig,
  SelectorsConfig,
  SourceFetchConfig,
  GenericParsedListing,
  GenericFetchResult,
} from "./fetcher/types";

import type {
  SourceFetchConfig,
  GenericParsedListing,
  GenericFetchResult,
} from "./fetcher/types";

// ============================================
// ROTATING USER AGENTS
// ============================================

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

// ============================================
// UTILITY FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// URL helper (used by ajax_post to resolve the AJAX endpoint).
import { makeAbsoluteUrl } from "./fetcher/parse/url";

// dedupeImageUrls is re-exported to preserve the public API for existing
// callers (genericDetailExtractor, pipeline/enrich).
export { dedupeImageUrls } from "./fetcher/parse/images";

// JSON item mapping (for json_api sources) lives in ./fetcher/parse/jsonItem.
// mapJsonItem is re-exported to preserve the public API (tests + any direct
// consumer). getByPath is needed locally by the json_api pagination branch
// for advancing through skip/page responses.
import { getByPath, mapJsonItem } from "./fetcher/parse/jsonItem";
export { mapJsonItem } from "./fetcher/parse/jsonItem";

// HTML listing parser lives in ./fetcher/parse/listings.
import { parseListingsFromHtml } from "./fetcher/parse/listings";

// URL-loop pagination strategy (query_param / offset / path_segment /
// next_link / none) lives in ./fetcher/strategies/urlLoop.
import { runUrlLoopStrategy } from "./fetcher/strategies/urlLoop";

// click_next strategy (Puppeteer-driven) lives in ./fetcher/strategies/clickNext.
import { runClickNextStrategy } from "./fetcher/strategies/clickNext";


// ============================================
// MAIN: GENERIC PAGINATED FETCHER
// ============================================

export async function genericPaginatedFetcher(
  config: SourceFetchConfig,
  fetchFn?: (url: string) => Promise<FetchResult>
): Promise<GenericFetchResult> {
  const now = new Date();
  const processedUrls = new Set<string>();
  const allListings: GenericParsedListing[] = [];

  const debug: GenericFetchResult["debug"] = {
    pagesAttempted: 0,
    pagesSuccessful: 0,
    listingsPerPage: [],
    stopReason: "",
    errors: [],
    htmlLengths: [],
  };

  // Config defaults
  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  const maxItems = config.max_items ?? 200;
  const maxPages = config.max_pages ?? 50;
  const stopCondition = config.stop_condition ?? "empty_listings";
  const startPage = config.pagination.start ?? 1;
  const increment = config.pagination.increment ?? 1;

  // Use provided fetch function, or select based on config.fetch_method
  const doFetch = fetchFn || (config.fetch_method === "headless"
    ? async (url: string): Promise<FetchResult> => {
        // Dynamic import to avoid loading puppeteer when not needed
        const { fetchHeadless } = await import("./fetchHeadless");
        const result = await fetchHeadless(url);
        return {
          success: result.success,
          html: result.html,
          error: result.error,
          statusCode: result.statusCode,
        };
      }
    : async (url: string) => {
        return fetchHtml(url, {
          headers: {
            "User-Agent": getRandomUserAgent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
        });
      }
  );

  // =============================================
  // AUTO-DETECTION: Detect pagination type from first page
  // =============================================
  let effectiveConfig = { ...config };
  let autoDetectionResult: PaginationDetectionResult | null = null;

  if (config.pagination.type === "auto") {
    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Auto-detecting pagination type for ${config.id}...`);
    }

    // Fetch first page for analysis
    const firstPageResult = await doFetch(config.base_url);
    if (!firstPageResult.success || !firstPageResult.html) {
      debug.errors.push(`Failed to fetch first page for auto-detection: ${firstPageResult.error}`);
      debug.stopReason = "auto_detection_fetch_failed";
      return { listings: [], debug };
    }

    autoDetectionResult = detectPaginationType(firstPageResult.html, config.base_url);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Auto-detection result:`, {
        type: autoDetectionResult.type,
        confidence: autoDetectionResult.confidence,
        detected: autoDetectionResult.detected,
        signals: autoDetectionResult.signals.slice(0, 3),
      });
    }

    // Apply detected settings
    if (autoDetectionResult.type === "unknown") {
      debug.warnings = debug.warnings || [];
      debug.warnings.push(
        `Auto-detection failed with low confidence. ${DETECTION_LIMITATIONS.recommendation}`
      );
      debug.warnings.push(...autoDetectionResult.warnings);

      // Fallback: try click_next with auto-detected selector if headless
      if (config.fetch_method === "headless") {
        effectiveConfig.pagination = {
          ...effectiveConfig.pagination,
          type: "click_next",
          // next_selector will be auto-detected by click handler
        };
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[GenericFetcher] Falling back to click_next with selector auto-detection`);
        }
      } else {
        // Can't auto-detect without headless, try query_param as last resort
        effectiveConfig.pagination = {
          ...effectiveConfig.pagination,
          type: "query_param",
          param: "page",
          start: 1,
          first_no_param: true,
        };
        debug.warnings.push("Falling back to query_param with page=N - may not work");
      }
    } else if (autoDetectionResult.type === "query_param") {
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "query_param",
        param: autoDetectionResult.detected.param || "page",
        start: 1,
        first_no_param: true,
      };
    } else if (autoDetectionResult.type === "click_next") {
      if (config.fetch_method !== "headless") {
        debug.errors.push(
          "Auto-detection found click_next pagination but fetch_method is not headless. " +
          "Set fetch_method: headless or configure pagination manually."
        );
        debug.stopReason = "auto_detection_requires_headless";
        return { listings: [], debug };
      }
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "click_next",
        next_selector: autoDetectionResult.detected.nextSelector,
      };
    } else if (autoDetectionResult.type === "infinite_scroll") {
      debug.warnings = debug.warnings || [];
      debug.warnings.push(
        "Auto-detection found infinite_scroll pagination. " +
        "This type is not fully supported - attempting click_next fallback."
      );
      if (config.fetch_method === "headless") {
        effectiveConfig.pagination = {
          ...effectiveConfig.pagination,
          type: "click_next",
          next_selector: autoDetectionResult.detected.loadMoreSelector,
        };
      } else {
        debug.errors.push("infinite_scroll requires fetch_method: headless");
        debug.stopReason = "infinite_scroll_requires_headless";
        return { listings: [], debug };
      }
    } else if (autoDetectionResult.type === "none") {
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "none",
      };
    }

    // Store detection metadata in debug
    (debug as any).autoDetection = {
      detected: autoDetectionResult.type,
      confidence: autoDetectionResult.confidence,
      signals: autoDetectionResult.signals,
      warnings: autoDetectionResult.warnings,
      effective: effectiveConfig.pagination.type,
    };
  }

  // Use effective config from here on
  config = effectiveConfig;

  // =============================================
  // SPECIAL CASE: click_next pagination (headless only)
  // Delegated to ./fetcher/strategies/clickNext.
  // =============================================
  if (config.pagination.type === "click_next") {
    if (config.fetch_method !== "headless") {
      debug.errors.push("click_next pagination requires fetch_method: headless");
      debug.stopReason = "config_error_click_next_requires_headless";
      return { listings: [], debug };
    }

    const listings = await runClickNextStrategy(config, processedUrls, now, debug);
    return {
      listings: listings.slice(0, maxItems),
      debug,
    };
  }

  // =============================================
  // AJAX POST PAGINATION (e.g. Houzez load-more)
  // =============================================
  if (config.pagination.type === "ajax_post") {
    const endpoint = config.pagination.endpoint;
    if (!endpoint) {
      debug.errors.push("ajax_post pagination requires endpoint");
      debug.stopReason = "config_error_missing_endpoint";
      return { listings: [], debug };
    }

    const bodyParams = config.pagination.body_params || {};
    const pageParam = config.pagination.page_param || "paged";
    const htmlField = config.pagination.html_field || "html";
    const hasMoreField = config.pagination.has_more_field || "has_more_posts";
    const noResultValue = config.pagination.no_result_value || "no_result";

    // Resolve absolute endpoint URL
    const ajaxUrl = makeAbsoluteUrl(endpoint, config.base_url);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Using ajax_post pagination for ${config.id}`);
      console.log(`[GenericFetcher] AJAX endpoint: ${ajaxUrl}`);
    }

    let currentPage = startPage;
    let hasMore = true;

    while (hasMore && allListings.length < maxItems && currentPage <= startPage + maxPages - 1) {
      // Delay between pages (skip first)
      if (currentPage > startPage) {
        const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[GenericFetcher] Waiting ${actualDelay}ms before AJAX page ${currentPage}...`);
        }
        await sleep(actualDelay);
      }

      debug.pagesAttempted++;

      // Build POST body from config params + page number
      const postBody = new URLSearchParams();
      for (const [key, value] of Object.entries(bodyParams)) {
        postBody.append(key, value);
      }
      postBody.append(pageParam, String(currentPage));

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] AJAX POST page ${currentPage}: ${postBody.toString().substring(0, 200)}`);
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
          console.log(`[GenericFetcher] AJAX page ${currentPage}: html=${htmlContent.length} chars, hasMore=${serverHasMore}`);
        }

        // Check for no results
        if (!htmlContent || htmlContent === noResultValue || htmlContent.trim() === "") {
          debug.stopReason = "ajax_no_result";
          hasMore = false;
          break;
        }

        debug.htmlLengths.push(htmlContent.length);
        debug.pagesSuccessful++;

        // Parse listings from HTML fragment
        const pageListings = parseListingsFromHtml(htmlContent, config, processedUrls, now, debug.errors, ajaxUrl);
        debug.listingsPerPage.push(pageListings.length);

        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[GenericFetcher] AJAX page ${currentPage}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`);
        }

        allListings.push(...pageListings);

        // Check stop conditions
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

    return {
      listings: allListings.slice(0, maxItems),
      debug,
    };
  }

  // =============================================
  // JSON API PAGINATION (skip/top or page/per_page)
  // Generic handler for structured JSON APIs (Azure Search, OData, Elastic, REST)
  // =============================================
  if (config.pagination.type === "json_api") {
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
      return { listings: [], debug };
    }

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Using json_api pagination for ${config.id} (${method} ${config.base_url})`);
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

      // Build pagination values
      const pageValue = pageMode === "skip" ? (pageNum - startPage) * pageSize : pageNum;

      // Build request
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
        console.log(`[GenericFetcher] json_api page ${pageNum}: ${pageField}=${pageValue} ${sizeField}=${pageSize}`);
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
          debug.errors.push(`json_api page ${pageNum}: items_path "${itemsPath}" did not resolve to an array`);
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
          console.log(`[GenericFetcher] json_api page ${pageNum}: ${items.length} items → ${pageListings.length} mapped (total: ${allListings.length}${totalFromServer !== undefined ? `/${totalFromServer}` : ""})`);
        }

        // Stop conditions
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
      console.log(`[GenericFetcher] Total listings: ${allListings.length}${totalFromServer !== undefined ? ` (server total: ${totalFromServer})` : ""}`);
      console.log(`[GenericFetcher] Stop reason: ${debug.stopReason}`);
    }

    return {
      listings: allListings.slice(0, maxItems),
      debug,
    };
  }

  // =============================================
  // STANDARD URL-BASED PAGINATION
  // Delegated to ./fetcher/strategies/urlLoop.
  // =============================================
  const urlLoopListings = await runUrlLoopStrategy(config, doFetch, processedUrls, now, debug);
  return {
    listings: urlLoopListings.slice(0, maxItems),
    debug,
  };
}

// ============================================
// EXPORT CONFIG BUILDER (for converting YAML)
// ============================================

export function buildFetchConfigFromYaml(
  yamlSource: any,
  overrides?: Partial<SourceFetchConfig>
): SourceFetchConfig {
  // Determine CMS type from config or use custom as fallback
  const cmsType: CMSType = yamlSource.cms_type || "custom";
  const preset = CMS_PRESETS[cmsType] || CMS_PRESETS.custom;

  // Merge selectors with CMS preset defaults
  const mergedSelectors = mergeWithPreset(yamlSource.selectors, cmsType);

  // Merge pagination with CMS preset defaults
  const paginationType = yamlSource.pagination?.type || preset.pagination.type || "none";
  const paginationParam = yamlSource.pagination?.param || preset.pagination.param;
  const nextSelector = yamlSource.pagination?.next_selector || preset.pagination.next_selector;

  const config: SourceFetchConfig = {
    id: yamlSource.id,
    name: yamlSource.name,
    base_url: yamlSource.url,
    fetch_method: yamlSource.fetch_method || "http",
    cms_type: cmsType,
    pagination: {
      type: paginationType,
      param: paginationParam,
      start: yamlSource.pagination?.start ?? 1,
      first_no_param: yamlSource.pagination?.first_no_param ?? false,
      increment: yamlSource.pagination?.increment ?? 1,
      next_selector: nextSelector,
      total_selector: yamlSource.pagination?.total_selector,
      pattern: yamlSource.pagination?.pattern,
      // AJAX POST pagination fields
      endpoint: yamlSource.pagination?.endpoint,
      body_params: yamlSource.pagination?.body_params,
      page_param: yamlSource.pagination?.page_param,
      response_format: yamlSource.pagination?.response_format,
      html_field: yamlSource.pagination?.html_field,
      has_more_field: yamlSource.pagination?.has_more_field,
      no_result_value: yamlSource.pagination?.no_result_value,
      // JSON API pagination fields
      method: yamlSource.pagination?.method,
      body: yamlSource.pagination?.body,
      query: yamlSource.pagination?.query,
      page_size: yamlSource.pagination?.page_size,
      page_mode: yamlSource.pagination?.page_mode,
      page_field: yamlSource.pagination?.page_field,
      size_field: yamlSource.pagination?.size_field,
      items_path: yamlSource.pagination?.items_path,
      count_path: yamlSource.pagination?.count_path,
    },
    selectors: mergedSelectors,
    delay_ms: yamlSource.delay_ms ?? 2500,
    jitter_ms: yamlSource.jitter_ms ?? 500,
    max_items: yamlSource.max_items ?? 200,
    max_pages: yamlSource.max_pages ?? 50,
    stop_condition: yamlSource.stop_condition || "empty_listings",
    reject_url_patterns: yamlSource.reject_url_patterns || [],
    min_path_segments: yamlSource.min_path_segments,
    price_format: yamlSource.price_format,
    location_patterns: yamlSource.location_patterns || [],
    id_prefix: yamlSource.id_prefix,
    id_url_pattern: yamlSource.id_url_pattern,
    detail_url_rewrite: yamlSource.detail_url_rewrite,
    item_map: yamlSource.item_map,
    ...overrides,
  };

  return config;
}
