/**
 * Pagination Auto-Detection Module
 *
 * Attempts to automatically detect pagination type and selectors from HTML.
 *
 * HONEST LIMITATIONS (see bottom of file):
 * - Works for ~60-70% of standard CMS/template sites
 * - Fails on SPAs, custom frameworks, obfuscated selectors
 * - Production systems should use external acquisition layer
 */

import * as cheerio from "cheerio";

// ============================================
// TYPES
// ============================================

export type DetectedPaginationType = "query_param" | "click_next" | "infinite_scroll" | "none" | "unknown";

export interface PaginationDetectionResult {
  type: DetectedPaginationType;
  confidence: "high" | "medium" | "low";
  detected: {
    param?: string;                    // For query_param: the param name (e.g., "page", "e-page")
    nextSelector?: string;             // For click_next: the working selector
    loadMoreSelector?: string;         // For infinite_scroll: load more button
    scrollTrigger?: boolean;           // For infinite_scroll: uses scroll position
  };
  signals: string[];                   // Debug: what signals led to this detection
  warnings: string[];                  // Issues that may affect reliability
}

// ============================================
// COMMON SELECTOR PATTERNS (ordered by reliability)
// ============================================

const NEXT_BUTTON_SELECTORS = [
  // Explicit "next" labels (highest confidence)
  'a[rel="next"]',
  'link[rel="next"]',
  '[aria-label="Next"]',
  '[aria-label="Next page"]',
  'a.next',
  'a.next-page',
  '.pagination .next a',
  '.pagination a.next',
  '.pagination-next a',
  'a[title="Next"]',
  'a[title="Next page"]',

  // Common CMS patterns
  '.page-numbers.next',                          // WordPress
  '.elementor-pagination .page-numbers.next',    // Elementor
  '.e-pagination a.next',                        // Elementor variants
  '.wp-pagenavi .nextpostslink',                 // WP-PageNavi
  '.nav-links .next',                            // WordPress default

  // Icon-based (medium confidence)
  '.pagination a[class*="next"]',
  '.pagination [class*="arrow-right"]',
  '.pagination [class*="chevron-right"]',
  'a[class*="pagination"] svg[class*="right"]',

  // Positional fallbacks (lower confidence)
  '.pagination li:last-child a',
  '.pagination a:last-of-type',
  'nav[aria-label*="pagination"] a:last-child',
];

const LOAD_MORE_SELECTORS = [
  'button[class*="load-more"]',
  'a[class*="load-more"]',
  '.load-more',
  '#load-more',
  'button:contains("Load More")',
  'button:contains("Show More")',
  'a:contains("Load More")',
  '[data-action="load-more"]',
];

const PAGINATION_PARAM_PATTERNS = [
  // Standard
  { pattern: /[?&](page)=(\d+)/i, param: "page" },
  { pattern: /[?&](p)=(\d+)/i, param: "p" },
  { pattern: /[?&](pg)=(\d+)/i, param: "pg" },

  // CMS-specific
  { pattern: /[?&](e-page)=(\d+)/i, param: "e-page" },           // Elementor
  { pattern: /[?&](paged)=(\d+)/i, param: "paged" },             // WordPress
  { pattern: /[?&](start)=(\d+)/i, param: "start" },             // Offset-based
  { pattern: /[?&](offset)=(\d+)/i, param: "offset" },

  // Path-based (different handling)
  { pattern: /\/page\/(\d+)/i, param: "__path_page__" },
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Detect pagination type from HTML content
 */
export function detectPaginationType(html: string, baseUrl: string): PaginationDetectionResult {
  const $ = cheerio.load(html);
  const result: PaginationDetectionResult = {
    type: "unknown",
    confidence: "low",
    detected: {},
    signals: [],
    warnings: [],
  };

  // ---- PHASE 1: Check for query_param pagination ----
  const queryParamResult = detectQueryParamPagination($, baseUrl);
  if (queryParamResult.found) {
    result.signals.push(...queryParamResult.signals);

    // If we find clear pagination links with query params, this is likely query_param type
    if (queryParamResult.confidence === "high") {
      result.type = "query_param";
      result.confidence = "high";
      result.detected.param = queryParamResult.param;
      return result;
    }
  }

  // ---- PHASE 2: Check for click_next pagination ----
  const clickNextResult = detectClickNextPagination($);
  if (clickNextResult.found) {
    result.signals.push(...clickNextResult.signals);

    // Check if the next link has a real href or is JS-driven
    if (clickNextResult.isJsDriven) {
      result.type = "click_next";
      result.confidence = clickNextResult.confidence;
      result.detected.nextSelector = clickNextResult.selector;

      if (queryParamResult.found) {
        result.warnings.push("Found both query params and JS pagination - site may use hybrid approach");
      }
      return result;
    } else if (queryParamResult.found) {
      // Has real hrefs with query params - prefer query_param
      result.type = "query_param";
      result.confidence = queryParamResult.confidence;
      result.detected.param = queryParamResult.param;
      return result;
    }
  }

  // ---- PHASE 3: Check for infinite_scroll ----
  const infiniteScrollResult = detectInfiniteScroll($, html);
  if (infiniteScrollResult.found) {
    result.signals.push(...infiniteScrollResult.signals);
    result.type = "infinite_scroll";
    result.confidence = infiniteScrollResult.confidence;
    result.detected.loadMoreSelector = infiniteScrollResult.loadMoreSelector;
    result.detected.scrollTrigger = infiniteScrollResult.scrollTrigger;
    return result;
  }

  // ---- PHASE 4: Check if single page (no pagination) ----
  const noPaginationSignals = detectNoPagination($);
  if (noPaginationSignals.likely) {
    result.signals.push(...noPaginationSignals.signals);
    result.type = "none";
    result.confidence = "medium";
    return result;
  }

  // ---- Fallback: Unknown ----
  result.type = "unknown";
  result.confidence = "low";
  result.warnings.push("Could not reliably detect pagination type - manual config recommended");

  return result;
}

/**
 * Detect query parameter based pagination
 */
function detectQueryParamPagination($: cheerio.CheerioAPI, baseUrl: string): {
  found: boolean;
  param?: string;
  confidence: "high" | "medium" | "low";
  signals: string[];
} {
  const signals: string[] = [];
  const foundParams = new Map<string, number>();

  // Check pagination links for query params
  const paginationContainers = $(
    '.pagination, .paging, [class*="pagination"], nav[aria-label*="page"], .page-numbers, .wp-pagenavi'
  );

  paginationContainers.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";

    for (const { pattern, param } of PAGINATION_PARAM_PATTERNS) {
      const match = href.match(pattern);
      if (match) {
        foundParams.set(param, (foundParams.get(param) || 0) + 1);
        signals.push(`Found ${param} in pagination link: ${href.substring(0, 100)}`);
      }
    }
  });

  // Also check for rel="next" links
  const relNext = $('a[rel="next"], link[rel="next"]').attr("href");
  if (relNext) {
    signals.push(`Found rel="next" link: ${relNext.substring(0, 100)}`);
    for (const { pattern, param } of PAGINATION_PARAM_PATTERNS) {
      const match = relNext.match(pattern);
      if (match) {
        foundParams.set(param, (foundParams.get(param) || 0) + 10); // Weight rel=next highly
      }
    }
  }

  if (foundParams.size === 0) {
    return { found: false, confidence: "low", signals };
  }

  // Find most common param
  let bestParam = "";
  let bestCount = 0;
  foundParams.forEach((count, param) => {
    if (count > bestCount) {
      bestCount = count;
      bestParam = param;
    }
  });

  const confidence = bestCount >= 3 ? "high" : bestCount >= 1 ? "medium" : "low";

  return {
    found: true,
    param: bestParam,
    confidence,
    signals,
  };
}

/**
 * Detect click-based pagination (JS-driven)
 */
function detectClickNextPagination($: cheerio.CheerioAPI): {
  found: boolean;
  selector?: string;
  isJsDriven: boolean;
  confidence: "high" | "medium" | "low";
  signals: string[];
} {
  const signals: string[] = [];

  for (const selector of NEXT_BUTTON_SELECTORS) {
    try {
      const elements = $(selector);
      if (elements.length > 0) {
        const el = elements.first();
        const href = el.attr("href") || "";
        const onclick = el.attr("onclick") || "";
        const dataAction = el.attr("data-action") || "";
        const role = el.attr("role") || "";

        signals.push(`Found next element with selector: ${selector}`);

        // Determine if this is JS-driven
        const isJsDriven =
          href === "#" ||
          href === "" ||
          href === "javascript:void(0)" ||
          href.startsWith("javascript:") ||
          onclick.length > 0 ||
          dataAction.length > 0 ||
          role === "button" ||
          el.is("button");

        if (isJsDriven) {
          signals.push(`Detected JS-driven pagination (href="${href}", onclick="${onclick.substring(0, 50)}")`);
        }

        // Confidence based on selector type
        let confidence: "high" | "medium" | "low" = "medium";
        if (selector.includes('rel="next"') || selector.includes('aria-label')) {
          confidence = "high";
        } else if (selector.includes(":last-child") || selector.includes(":last-of-type")) {
          confidence = "low";
        }

        return {
          found: true,
          selector,
          isJsDriven,
          confidence,
          signals,
        };
      }
    } catch {
      // Selector might be invalid for cheerio (e.g., :contains)
      continue;
    }
  }

  return { found: false, isJsDriven: false, confidence: "low", signals };
}

/**
 * Detect infinite scroll pagination
 */
function detectInfiniteScroll($: cheerio.CheerioAPI, html: string): {
  found: boolean;
  loadMoreSelector?: string;
  scrollTrigger: boolean;
  confidence: "high" | "medium" | "low";
  signals: string[];
} {
  const signals: string[] = [];
  let loadMoreSelector: string | undefined;
  let scrollTrigger = false;

  // Check for load more buttons
  for (const selector of LOAD_MORE_SELECTORS) {
    try {
      if ($(selector).length > 0) {
        loadMoreSelector = selector;
        signals.push(`Found load more button: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }

  // Check for infinite scroll indicators in HTML/JS
  const infiniteScrollIndicators = [
    'infinite-scroll',
    'infiniteScroll',
    'infinite_scroll',
    'data-infinite',
    'IntersectionObserver',
    'scroll-trigger',
    'lazy-load',
  ];

  for (const indicator of infiniteScrollIndicators) {
    if (html.includes(indicator)) {
      signals.push(`Found infinite scroll indicator: ${indicator}`);
      scrollTrigger = true;
    }
  }

  const found = loadMoreSelector !== undefined || scrollTrigger;
  const confidence = loadMoreSelector && scrollTrigger ? "high" : found ? "medium" : "low";

  return {
    found,
    loadMoreSelector,
    scrollTrigger,
    confidence,
    signals,
  };
}

/**
 * Detect if page likely has no pagination
 */
function detectNoPagination($: cheerio.CheerioAPI): {
  likely: boolean;
  signals: string[];
} {
  const signals: string[] = [];

  // No pagination containers found
  const paginationElements = $(
    '.pagination, .paging, [class*="pagination"], .page-numbers, nav[aria-label*="page"]'
  );

  if (paginationElements.length === 0) {
    signals.push("No pagination container elements found");
  }

  // Check for "showing all" or "1 of 1" type indicators
  const bodyText = $("body").text().toLowerCase();
  const singlePageIndicators = [
    /showing\s+all/i,
    /page\s+1\s+of\s+1/i,
    /1\s*-\s*\d+\s+of\s+\d+/i, // "1-10 of 10" style
  ];

  for (const pattern of singlePageIndicators) {
    if (pattern.test(bodyText)) {
      signals.push(`Found single page indicator: ${pattern}`);
    }
  }

  return {
    likely: paginationElements.length === 0,
    signals,
  };
}

/**
 * Try to find a working next selector by testing against the DOM
 * Returns the first selector that matches a visible, enabled element
 */
export function findWorkingNextSelector($: cheerio.CheerioAPI): string | null {
  for (const selector of NEXT_BUTTON_SELECTORS) {
    try {
      const el = $(selector).first();
      if (el.length > 0) {
        // Check it's not hidden
        const style = el.attr("style") || "";
        if (style.includes("display: none") || style.includes("visibility: hidden")) {
          continue;
        }
        // Check it's not disabled
        if (el.attr("disabled") || el.hasClass("disabled")) {
          continue;
        }
        return selector;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ============================================
// HONEST LIMITATIONS
// ============================================

/**
 * WHAT THIS MODULE CAN'T DO:
 *
 * 1. SPAs (React, Vue, Angular):
 *    - Virtual DOM means cheerio sees empty shell
 *    - Need headless browser + wait for hydration
 *    - Even then, pagination might be state-based with no DOM indicators
 *
 * 2. Custom/Obfuscated Selectors:
 *    - Sites using hashed class names (CSS modules, styled-components)
 *    - Example: .Button_next__x7Yz9 instead of .next
 *    - No reliable way to detect without ML/heuristics
 *
 * 3. Authentication-Gated Pagination:
 *    - Some sites only show pagination to logged-in users
 *    - Or show different pagination based on user type
 *
 * 4. Anti-Bot Measures:
 *    - Cloudflare, PerimeterX, DataDome, etc.
 *    - May serve different HTML to bots
 *    - May require JS execution to reveal pagination
 *
 * 5. Hybrid/Conditional Pagination:
 *    - Sites that switch between types based on viewport
 *    - Mobile vs desktop pagination
 *
 * RECOMMENDATION FOR PRODUCTION:
 *
 * Use an external acquisition layer:
 * - Browserless.io, ScrapingBee, Bright Data, Apify
 * - Or self-hosted: Playwright cluster, Puppeteer pool
 *
 * These handle:
 * - Browser fingerprinting
 * - Proxy rotation
 * - CAPTCHA solving (where legal)
 * - Consistent execution environment
 *
 * Your pipeline then receives clean HTML, decoupled from acquisition complexity.
 */

export const DETECTION_LIMITATIONS = {
  reliabilityEstimate: "60-70% of standard sites",
  knownFailures: [
    "SPAs without SSR",
    "CSS-modules/hashed class names",
    "Sites requiring authentication",
    "Heavy anti-bot protection",
    "Viewport-conditional pagination",
  ],
  recommendation: "For production: use external acquisition layer (Browserless, ScrapingBee, etc.)",
};
