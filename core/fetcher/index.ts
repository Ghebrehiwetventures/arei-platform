/**
 * Generic config-driven paginated fetcher — public entry point.
 *
 * genericPaginatedFetcher inspects the source's pagination.type and dispatches
 * to one of four strategy modules: urlLoop, clickNext, ajaxPost, jsonApi.
 * Auto-detection (pagination.type === "auto") is resolved before dispatch.
 *
 * Re-exports the parse helpers and types that downstream callers still
 * import — pipeline/enrich (dedupeImageUrls), tests (mapJsonItem), and the
 * many call sites that pass SourceFetchConfig / GenericFetchResult around.
 */

import { fetchHtml, type FetchResult } from "../fetchHtml";
import {
  detectPaginationType,
  type PaginationDetectionResult,
  DETECTION_LIMITATIONS,
} from "../paginationDetector";
import { runAjaxPostStrategy } from "./strategies/ajaxPost";
import { runClickNextStrategy } from "./strategies/clickNext";
import { runJsonApiStrategy } from "./strategies/jsonApi";
import { runUrlLoopStrategy } from "./strategies/urlLoop";
import type {
  GenericFetchResult,
  GenericParsedListing,
  SourceFetchConfig,
} from "./types";

// Re-export the helpers and types downstream callers consume.
export { buildFetchConfigFromYaml } from "./buildFetchConfig";
export { dedupeImageUrls } from "./parse/images";
export { mapJsonItem } from "./parse/jsonItem";
export type {
  FetchMethod,
  GenericFetchResult,
  GenericParsedListing,
  ItemMapArrayPick,
  ItemMapConfig,
  PaginationConfig,
  PaginationType,
  SelectorsConfig,
  SourceFetchConfig,
  StopCondition,
} from "./types";

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
 * Request headers for one source run. The User-Agent is the per-source config
 * override when set, otherwise one random UA chosen ONCE and reused for every
 * page of the run — a UA that changes between pages of the same crawl is a WAF
 * fingerprint, and so are forced no-cache headers, which is why this matches
 * the plain browser-like header set the legacy pipeline proved against the
 * same sources (see fetchHtml DEFAULT_HEADERS).
 */
export function buildRequestHeaders(config: Pick<SourceFetchConfig, "userAgent">): Record<string, string> {
  return {
    "User-Agent": config.userAgent ?? getRandomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  };
}

/** Build the default doFetch function for a source: HTTP via fetchHtml, or
 *  headless via the lazily-imported fetchHeadless module. Callers can override
 *  with their own fetchFn (used by tests + offline preflight). */
function defaultFetchFn(config: SourceFetchConfig): (url: string) => Promise<FetchResult> {
  if (config.fetch_method === "headless") {
    return async (url: string): Promise<FetchResult> => {
      // Dynamic import so puppeteer only loads for headless sources.
      const { fetchHeadless } = await import("../fetchHeadless");
      const result = await fetchHeadless(url);
      return {
        success: result.success,
        html: result.html,
        error: result.error,
        statusCode: result.statusCode,
      };
    };
  }
  // Headers built once per run so the UA stays stable across this run's pages.
  const headers = buildRequestHeaders(config);
  return async (url: string) => {
    return fetchHtml(url, { headers });
  };
}

/** Resolve pagination.type === "auto" into a concrete strategy by sniffing the
 *  first page. Returns an updated config, or sets debug.stopReason and returns
 *  null when auto-detection can't proceed (and the caller should bail). */
async function resolveAutoDetection(
  config: SourceFetchConfig,
  doFetch: (url: string) => Promise<FetchResult>,
  debug: GenericFetchResult["debug"],
): Promise<SourceFetchConfig | null> {
  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] Auto-detecting pagination type for ${config.id}...`);
  }

  const firstPageResult = await doFetch(config.base_url);
  if (!firstPageResult.success || !firstPageResult.html) {
    debug.errors.push(`Failed to fetch first page for auto-detection: ${firstPageResult.error}`);
    debug.stopReason = "auto_detection_fetch_failed";
    return null;
  }

  const detection: PaginationDetectionResult = detectPaginationType(
    firstPageResult.html,
    config.base_url,
  );

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[GenericFetcher] Auto-detection result:`, {
      type: detection.type,
      confidence: detection.confidence,
      detected: detection.detected,
      signals: detection.signals.slice(0, 3),
    });
  }

  const effectiveConfig: SourceFetchConfig = { ...config };

  if (detection.type === "unknown") {
    debug.warnings = debug.warnings || [];
    debug.warnings.push(
      `Auto-detection failed with low confidence. ${DETECTION_LIMITATIONS.recommendation}`,
    );
    debug.warnings.push(...detection.warnings);

    if (config.fetch_method === "headless") {
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "click_next",
        // next_selector will be auto-detected by the click handler.
      };
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Falling back to click_next with selector auto-detection`);
      }
    } else {
      // Can't auto-detect without headless; try query_param as last resort.
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "query_param",
        param: "page",
        start: 1,
        first_no_param: true,
      };
      debug.warnings.push("Falling back to query_param with page=N - may not work");
    }
  } else if (detection.type === "query_param") {
    effectiveConfig.pagination = {
      ...effectiveConfig.pagination,
      type: "query_param",
      param: detection.detected.param || "page",
      start: 1,
      first_no_param: true,
    };
  } else if (detection.type === "click_next") {
    if (config.fetch_method !== "headless") {
      debug.errors.push(
        "Auto-detection found click_next pagination but fetch_method is not headless. " +
          "Set fetch_method: headless or configure pagination manually.",
      );
      debug.stopReason = "auto_detection_requires_headless";
      return null;
    }
    effectiveConfig.pagination = {
      ...effectiveConfig.pagination,
      type: "click_next",
      next_selector: detection.detected.nextSelector,
    };
  } else if (detection.type === "infinite_scroll") {
    debug.warnings = debug.warnings || [];
    debug.warnings.push(
      "Auto-detection found infinite_scroll pagination. " +
        "This type is not fully supported - attempting click_next fallback.",
    );
    if (config.fetch_method === "headless") {
      effectiveConfig.pagination = {
        ...effectiveConfig.pagination,
        type: "click_next",
        next_selector: detection.detected.loadMoreSelector,
      };
    } else {
      debug.errors.push("infinite_scroll requires fetch_method: headless");
      debug.stopReason = "infinite_scroll_requires_headless";
      return null;
    }
  } else if (detection.type === "none") {
    effectiveConfig.pagination = {
      ...effectiveConfig.pagination,
      type: "none",
    };
  }

  (debug as any).autoDetection = {
    detected: detection.type,
    confidence: detection.confidence,
    signals: detection.signals,
    warnings: detection.warnings,
    effective: effectiveConfig.pagination.type,
  };

  return effectiveConfig;
}

/**
 * Public entry point. Resolves auto-detection (if any) and dispatches to the
 * appropriate per-strategy runner. All four strategies mutate a shared
 * `debug` block in place, which is returned alongside the listings.
 */
export async function genericPaginatedFetcher(
  config: SourceFetchConfig,
  fetchFn?: (url: string) => Promise<FetchResult>,
): Promise<GenericFetchResult> {
  const now = new Date();
  const processedUrls = new Set<string>();

  const debug: GenericFetchResult["debug"] = {
    pagesAttempted: 0,
    pagesSuccessful: 0,
    listingsPerPage: [],
    stopReason: "",
    errors: [],
    htmlLengths: [],
  };

  const maxItems = config.max_items ?? 200;
  const doFetch = fetchFn || defaultFetchFn(config);

  let effective = config;
  if (config.pagination.type === "auto") {
    const resolved = await resolveAutoDetection(config, doFetch, debug);
    if (!resolved) return { listings: [], debug };
    effective = resolved;
  }

  const slice = (listings: GenericParsedListing[]): GenericFetchResult => ({
    listings: listings.slice(0, maxItems),
    debug,
  });

  switch (effective.pagination.type) {
    case "click_next": {
      if (effective.fetch_method !== "headless") {
        debug.errors.push("click_next pagination requires fetch_method: headless");
        debug.stopReason = "config_error_click_next_requires_headless";
        return { listings: [], debug };
      }
      return slice(await runClickNextStrategy(effective, processedUrls, now, debug));
    }
    case "ajax_post":
      return slice(await runAjaxPostStrategy(effective, processedUrls, now, debug));
    case "json_api":
      return slice(await runJsonApiStrategy(effective, processedUrls, now, debug));
    default:
      return slice(await runUrlLoopStrategy(effective, doFetch, processedUrls, now, debug));
  }
}
