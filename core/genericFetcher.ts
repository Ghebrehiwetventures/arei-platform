/**
 * Generic Config-Driven Paginated Fetcher
 *
 * PoC Goal: Zero source-specific code. All behavior from config.
 * Adding a new source = add YAML config only, no code changes.
 */

import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { Browser, Page } from "puppeteer";
import { deriveProjectMetadata } from "./projectMetadata";

// Stealth: bypass Cloudflare/bot detection
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteerExtra.use(StealthPlugin());
import { fetchHtml, FetchResult } from "./fetchHtml";
import { CMSType, CMS_PRESETS, detectCMS, mergeWithPreset, getImageAttrs } from "./cmsPresets";
import {
  detectPaginationType,
  findWorkingNextSelector,
  PaginationDetectionResult,
  DETECTION_LIMITATIONS,
} from "./paginationDetector";

// ============================================
// CONFIG TYPES (matches sources.yml schema)
// ============================================

export type PaginationType = "query_param" | "next_link" | "offset" | "cursor" | "click_next" | "infinite_scroll" | "path_segment" | "ajax_post" | "auto" | "none";
export type StopCondition = "empty_listings" | "no_next_link" | "max_items" | "max_pages" | "total_from_page";
export type FetchMethod = "http" | "headless";

export interface PaginationConfig {
  type: PaginationType;
  /** Query param name, e.g. "e-page", "page", "offset" */
  param?: string;
  /** Starting value (default: 1 for page, 0 for offset) */
  start?: number;
  /** If true, first page has no param (e.g. /properties/ not /properties/?page=1) */
  first_no_param?: boolean;
  /** Increment per page (default: 1 for page, items_per_page for offset) */
  increment?: number;
  /** CSS selector for "next" link/button */
  next_selector?: string;
  /** CSS selector to extract total count from page */
  total_selector?: string;
  /** URL pattern for path_segment pagination, e.g. "/page/{page}/" */
  pattern?: string;
  /** AJAX POST pagination fields */
  endpoint?: string;
  body_params?: Record<string, string>;
  page_param?: string;
  response_format?: "json_html";
  html_field?: string;
  has_more_field?: string;
  no_result_value?: string;
}

export interface SelectorsConfig {
  /** Container for each listing item */
  listing: string;
  /** Link to detail page (relative to listing container) */
  link?: string;
  /** Title element */
  title?: string;
  /** Price element */
  price?: string;
  /** Image elements */
  image?: string;
  /** Location element */
  location?: string;
  /** Description element (usually empty on list pages) */
  description?: string;
}

export interface SourceFetchConfig {
  id: string;
  name: string;
  base_url: string;

  /** http (native fetch) or headless (Puppeteer) */
  fetch_method: FetchMethod;

  pagination: PaginationConfig;
  selectors: SelectorsConfig;

  /** Delay between page fetches in ms (default: 2500) */
  delay_ms?: number;
  /** Random jitter added to delay (default: 500) */
  jitter_ms?: number;
  /** Max items to fetch (default: 200) */
  max_items?: number;
  /** Max pages to fetch (default: 50) */
  max_pages?: number;
  /** Stop condition (default: empty_listings) */
  stop_condition?: StopCondition;

  /** URL patterns to reject (regex strings) */
  reject_url_patterns?: string[];
  /** Minimum valid URL path segments after base */
  min_path_segments?: number;

  /** Price parsing hints */
  price_format?: {
    currency_symbol?: string;
    thousands_separator?: "." | "," | " ";
    decimal_separator?: "." | ",";
    multiplier?: number; // e.g. 1000 if prices shown in thousands
  };

  /** Location extraction patterns (regex strings) */
  location_patterns?: string[];

  /** ID prefix for generated listing IDs */
  id_prefix?: string;

  /** CMS type for selector fallbacks (auto-detected if not specified) */
  cms_type?: CMSType;
}

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
// PARSED LISTING (generic output)
// ============================================

export interface GenericParsedListing {
  id: string;
  sourceId: string;
  sourceName: string;
  source_ref?: string | null;
  title?: string;
  price?: number;
  priceText?: string;
  project_flag?: boolean | null;
  project_start_price?: number | null;
  description?: string;
  imageUrls: string[];
  location?: string;
  detailUrl?: string;
  createdAt: Date;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
}

// ============================================
// FETCH RESULT WITH DEBUG INFO
// ============================================

export interface GenericFetchResult {
  listings: GenericParsedListing[];
  debug: {
    pagesAttempted: number;
    pagesSuccessful: number;
    listingsPerPage: number[];
    stopReason: string;
    errors: string[];
    warnings?: string[];
    htmlLengths: number[];
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateListingId(prefix: string, title: string, price: number | undefined, url: string): string {
  const input = `${title || ""}|${price || ""}|${url}`;
  const hash = crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  url = url.trim();
  if (url.startsWith("data:")) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${url}`;
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const invalidPatterns = ["logo", "icon", "avatar", "spinner", "loading", ".svg"];
  if (lower.includes("placeholder") && !lower.includes("property")) return false;
  if (lower.endsWith(".gif") && lower.includes("load")) return false;
  return !invalidPatterns.some((p) => lower.includes(p));
}

/** Normalize URL: force https, strip query params, hash, trailing slashes. */
function normalizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.protocol = "https:";
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "");
    return u.href;
  } catch {
    return url;
  }
}

const NON_PROPERTY_PATTERNS = [
  /logo/i,
  /icon/i,
  /avatar/i,
  /spinner/i,
  /loading/i,
  /placeholder/i,
  /favicon/i,
  /badge/i,
  /banner[\-_]?ad/i,
  /pixel\.gif/i,
  /spacer/i,
  /blank\.(gif|png|jpg)/i,
  /1x1\./i,
  /tracking/i,
  /analytics/i,
  /\.svg$/i,
];

/**
 * Strip WordPress-style size suffix from a URL path.
 * e.g. "photo-1025x650.jpg" → "photo.jpg"
 * Returns the base key used to group size variants of the same image.
 */
function wpBaseKey(url: string): string {
  try {
    const u = new URL(url);
    // Match -123x456 right before the file extension
    u.pathname = u.pathname.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, "$1");
    return u.href;
  } catch {
    return url.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, "$1");
  }
}

/**
 * Extract pixel area from a WP size suffix, or 0 if none.
 * e.g. "photo-1440x914.jpg" → 1440*914 = 1,316,160
 */
function wpPixelArea(url: string): number {
  const m = url.match(/-(\d{2,5})x(\d{2,5})\.\w+$/);
  if (!m) return 0; // no suffix = original (treat as largest)
  return Number(m[1]) * Number(m[2]);
}

/**
 * Deduplicate & clean image URL list.
 * 1. Normalize (strip query/hash)
 * 2. Filter non-property images (logos, placeholders, icons, trackers)
 * 3. Group WP size variants by base filename, keep largest (or original)
 * 4. Preserve original order (by first occurrence of each group)
 */
export function dedupeImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const norm = normalizeImageUrl(url);
    if (seen.has(norm)) continue;
    seen.add(norm);
    if (NON_PROPERTY_PATTERNS.some((p) => p.test(norm))) continue;
    cleaned.push(norm);
  }

  // Group by WP base key → keep the variant with highest resolution
  // URLs without a size suffix (the original upload) are preferred (area = 0 → Infinity)
  const groups = new Map<string, { url: string; area: number; order: number }>();
  for (let i = 0; i < cleaned.length; i++) {
    const url = cleaned[i];
    const key = wpBaseKey(url);
    const area = wpPixelArea(url);
    // No suffix = original upload, treat as largest
    const effectiveArea = area === 0 ? Infinity : area;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { url, area: effectiveArea, order: i });
    } else if (effectiveArea > existing.area) {
      // Keep the larger variant but preserve the earlier order position
      groups.set(key, { url, area: effectiveArea, order: existing.order });
    }
  }

  // Return in original order
  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((g) => g.url);
}

function parsePrice(priceText: string, config?: SourceFetchConfig["price_format"]): number | undefined {
  if (!priceText) return undefined;

  // Skip "Call for price", "POA", "negotiated", etc.
  const lower = priceText.toLowerCase();
  if (lower.includes("call") || lower.includes("poa") || lower.includes("negotiat") || lower.includes("request") || lower.includes("contact")) {
    return undefined;
  }

  // If the selector captures surrounding text (for example title + address + price),
  // isolate the currency-bound fragment before parsing so "Porto Antigo 1 189.000€"
  // does not become 1,189,000.
  const boundedPriceMatch = priceText.match(
    /(?:€\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*€|\$\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*\$|£\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*£)/
  );
  const candidateText = boundedPriceMatch?.[0]?.trim() || priceText;

  const currencySymbol = config?.currency_symbol || "€";
  let cleaned = candidateText.replace(new RegExp(currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "").trim();

  // Handle thousands separator based on config
  const thousandsSep = config?.thousands_separator || ".";
  const decimalSep = config?.decimal_separator || ",";

  // Remove thousands separators
  if (thousandsSep === ".") {
    // European format: "130.000" (period = thousands)
    // Only strip dots that look like thousands separators (3-digit groups)
    if (/^\d{1,3}\.\d{3}(\.\d{3})*/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  } else if (thousandsSep === ",") {
    cleaned = cleaned.replace(/,/g, "");
  } else if (thousandsSep === " ") {
    cleaned = cleaned.replace(/[\s\u00A0]/g, ""); // Also handle non-breaking space
  }

  // Strip decimal portion if comma-separated (e.g. ",00")
  // Do this BEFORE removing non-digits to avoid "38000,00" → "3800000"
  if (decimalSep === ",") {
    cleaned = cleaned.replace(/,\d{1,2}$/, "");
  } else if (decimalSep === ".") {
    cleaned = cleaned.replace(/\.\d{1,2}$/, "");
  }

  cleaned = cleaned.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);

  if (isNaN(num) || num <= 0) return undefined;

  // Apply multiplier if prices shown in thousands
  const multiplier = config?.multiplier || 1;
  return num * multiplier;
}

// ============================================
// IMAGE EXTRACTION FROM CSS STYLE BLOCKS
// ============================================

function extractImagesFromStyleBlocks(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  baseUrl: string
): string[] {
  const imageUrls: string[] = [];
  const classes = new Set<string>();

  $el.find("[class]").each((_, el) => {
    const classAttr = $(el).attr("class") || "";
    classAttr.split(/\s+/).forEach((c) => c && classes.add(c));
  });

  const elClass = $el.attr("class") || "";
  elClass.split(/\s+/).forEach((c) => c && classes.add(c));

  $("style").each((_, styleEl) => {
    const styleContent = $(styleEl).text();
    for (const className of classes) {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(
        `\\.${escaped}[^{]*\\{[^}]*background-image:\\s*url\\(\\s*['"]?([^'")]+)['"]?\\s*\\)`,
        "gi"
      );
      let match;
      while ((match = regex.exec(styleContent)) !== null) {
        if (match[1]) {
          const absUrl = makeAbsoluteUrl(match[1], baseUrl);
          if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
            imageUrls.push(absUrl);
          }
        }
      }
    }
  });

  return imageUrls;
}

// ============================================
// CORE: PARSE LISTINGS FROM HTML (config-driven)
// ============================================

function parseListingsFromHtml(
  html: string,
  config: SourceFetchConfig,
  processedUrls: Set<string>,
  now: Date,
  debugErrors?: string[],
  pageUrl?: string
): GenericParsedListing[] {
  const listings: GenericParsedListing[] = [];
  try {
    const $ = cheerio.load(html);

    // Build reject patterns as RegExp
    const rejectPatterns = (config.reject_url_patterns || []).map((p) => new RegExp(p, "i"));

    // Find listing containers
    $(config.selectors.listing).each((containerIndex, containerEl) => {
      try {
        const $container = $(containerEl);

      // Find detail link
      // First check if the container itself is a link (common pattern)
      let href = $container.attr("href");

      // If not, look for a link inside the container
      if (!href) {
        const linkSelector = config.selectors.link || "a[href]";
        const $link = $container.find(linkSelector).first();
        href = $link.attr("href");
      }

      if (!href) return;

      // Reject patterns check
      for (const pattern of rejectPatterns) {
        if (pattern.test(href)) return;
      }

      // Skip already processed
      const absoluteUrl = makeAbsoluteUrl(href, config.base_url);
      if (processedUrls.has(absoluteUrl)) return;

      // Validate URL structure if min_path_segments specified
      if (config.min_path_segments) {
        try {
          const parsed = new URL(absoluteUrl);
          const segments = parsed.pathname.split("/").filter((s) => s);
          if (segments.length < config.min_path_segments) return;
        } catch {
          return;
        }
      }

      // Extract title
      let title = "";
      if (config.selectors.title) {
        const $titles = $container.find(config.selectors.title);
        $titles.each((_, titleEl) => {
          const text = $(titleEl).text().trim();
          if (text.length > 15 && (!title || text.length > title.length)) {
            title = text;
          }
        });
      }

      // Fallback: extract from URL slug
      if (!title) {
        const urlParts = absoluteUrl.split("/").filter((p) => p);
        const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        if (slug && !slug.includes("?")) {
          title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }

      title = title.replace(/\s+/g, " ").trim().slice(0, 200);

      // Extract price
      let price: number | undefined;
      let priceText = "";
      if (config.selectors.price) {
        priceText = $container.find(config.selectors.price).first().text();
        price = parsePrice(priceText, config.price_format);
      }

      // Fallback: find price in container text
      if (!price) {
        const containerText = $container.text();
        const pricePatterns = [/€\s*[\d.\s,]+/g, /[\d.\s,]+\s*€/g];
        for (const pattern of pricePatterns) {
          const matches = containerText.matchAll(pattern);
          for (const match of matches) {
            const parsed = parsePrice(match[0], config.price_format);
            if (parsed && parsed > 10000 && (!price || parsed > price)) {
              price = parsed;
            }
          }
        }
      }

      // Extract images from style blocks
      const imageUrls = extractImagesFromStyleBlocks($, $container, config.base_url);

      // Also check img tags (and image tags for SVG/XML sites like Property24)
      const imgSelector = config.selectors.image || "img, image";
      $container.find(imgSelector).each((_, img) => {
        const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("xlink:href");
        if (src) {
          const absUrl = makeAbsoluteUrl(src, config.base_url);
          if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
            imageUrls.push(absUrl);
          }
        }

        // Also check background-image on the matched image element itself (common pattern)
        // Many sites use div/span with background-image instead of <img> tags for lazy loading
        const style = $(img).attr("style") || "";
        const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
        if (bgMatch?.[1]) {
          const absUrl = makeAbsoluteUrl(bgMatch[1], config.base_url);
          if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
            imageUrls.push(absUrl);
          }
        }
      });

      // Fallback: Also check for any <image> tags (SVG/XML format)
      $container.find("image[src*='prop24'], image[src*='roam']").each((_, img) => {
        const src = $(img).attr("src");
        if (src) {
          const absUrl = makeAbsoluteUrl(src, config.base_url);
          if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
            imageUrls.push(absUrl);
          }
        }
      });

      // Extract location
      let location = "";
      if (config.location_patterns && config.location_patterns.length > 0) {
        // Search in container text AND img alt attributes (common pattern for location info)
        const containerText = $container.text();
        const imgAlts = $container.find("img").map((_, img) => $(img).attr("alt") || "").get().join(" ");
        const searchText = `${containerText} ${imgAlts}`;

        for (const patternStr of config.location_patterns) {
          const pattern = new RegExp(patternStr, "i");
          const match = searchText.match(pattern);
          if (match) {
            location = match[0];
            break;
          }
        }
      } else if (config.selectors.location) {
        location = $container.find(config.selectors.location).first().text().trim();
      }

      // Fallback: Extract location from URL path segments (common pattern)
      // URLs like /for-sale/houses/nairobi/karen/123 -> "nairobi, karen"
      if (!location && absoluteUrl) {
        try {
          const urlPath = new URL(absoluteUrl).pathname;
          const segments = urlPath.split("/").filter((s) => s && s.length > 2);
          // Skip common non-location segments
          const skipWords = ["for-sale", "for-rent", "houses", "apartments", "flats", "property", "properties", "listing", "detail", "en", "pt"];
          const locationSegments = segments.filter((s) => !skipWords.includes(s.toLowerCase()) && !/^\d+/.test(s));
          if (locationSegments.length >= 1) {
            // Take up to 2 location segments (e.g., "nairobi, karen")
            location = locationSegments.slice(0, 2).map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(", ");
          }
        } catch {
          // Invalid URL, skip
        }
      }

      // Skip invalid entries
      if (!title || title.length < 5) return;
      if (title.toLowerCase() === "en" || title.toLowerCase() === "pt") return;

      const idPrefix = config.id_prefix || config.id.replace(/^cv_/, "");

      const projectMetadata = deriveProjectMetadata({
        title,
        price,
        priceText,
      });

      listings.push({
        id: generateListingId(idPrefix, title, price, absoluteUrl),
        sourceId: config.id,
        sourceName: config.name,
        source_ref: projectMetadata.source_ref,
        title,
        price,
        priceText,
        project_flag: projectMetadata.project_flag,
        project_start_price: projectMetadata.project_start_price,
        description: undefined, // Usually not available on list pages
        imageUrls: dedupeImageUrls(imageUrls).slice(0, 10),
        location: location || undefined,
        detailUrl: absoluteUrl?.replace(/\/+$/, "") || absoluteUrl,
        createdAt: now,
      });
        processedUrls.add(absoluteUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const contextParts = [
          "listing_parse_error",
          `source=${config.id}`,
          pageUrl ? `page=${pageUrl}` : null,
          `container_index=${containerIndex}`,
          `error=${JSON.stringify(errorMessage)}`,
        ].filter(Boolean);
        debugErrors?.push(contextParts.join(" "));
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const contextParts = [
      "page_parse_error",
      `source=${config.id}`,
      pageUrl ? `page=${pageUrl}` : null,
      `error=${JSON.stringify(errorMessage)}`,
    ].filter(Boolean);
    debugErrors?.push(contextParts.join(" "));
    return [];
  }

  return listings;
}

// ============================================
// BUILD PAGINATION URL
// ============================================

function buildPaginationUrl(config: SourceFetchConfig, pageNum: number): string {
  const pagination = config.pagination;

  if (pagination.type === "none") {
    return config.base_url;
  }

  // First page might not need param
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
    // Ensure base URL ends with /
    const base = config.base_url.endsWith("/") ? config.base_url : config.base_url + "/";
    // Remove leading / from segment to avoid double slash
    const cleanSegment = segment.startsWith("/") ? segment.slice(1) : segment;
    return base + cleanSegment;
  }

  return config.base_url;
}

// ============================================
// COMMON NEXT BUTTON SELECTORS (for auto-detection fallback)
// ============================================

const COMMON_NEXT_SELECTORS = [
  'a[rel="next"]',
  '[aria-label="Next"]',
  '[aria-label="Next page"]',
  'a.next',
  '.pagination .next a',
  '.pagination a.next',
  '.page-numbers.next',
  '.elementor-pagination .page-numbers.next',
  '.e-pagination a.next',
  '.pagination li:last-child a',
  '.pagination a:last-of-type',
];

// ============================================
// CLICK-BASED PAGINATION (Puppeteer required)
// ============================================

interface ClickPaginationResult {
  htmlPages: string[];
  debug: {
    pagesAttempted: number;
    pagesSuccessful: number;
    stopReason: string;
    errors: string[];
    detectedSelector?: string;
    autoDetectionUsed: boolean;
  };
}

/**
 * Auto-detect working next selector from page
 * Tries common selectors until one matches a visible, enabled element
 */
async function autoDetectNextSelector(page: Page): Promise<string | null> {
  for (const selector of COMMON_NEXT_SELECTORS) {
    try {
      const exists = await page.$(selector);
      if (!exists) continue;

      // Check if it's visible and not disabled
      const isUsable = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;

        const styles = window.getComputedStyle(el);
        if (styles.display === "none" || styles.visibility === "hidden") return false;
        if ((el as HTMLElement).offsetParent === null) return false; // Hidden
        if (el.hasAttribute("disabled")) return false;
        if (el.classList.contains("disabled")) return false;
        if (el.getAttribute("aria-disabled") === "true") return false;

        return true;
      }, selector);

      if (isUsable) {
        return selector;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Wait for content change using MutationObserver
 * More reliable than polling for AJAX updates
 */
async function waitForContentChange(
  page: Page,
  listingSelector: string,
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    return await page.evaluate(
      (selector, timeout) => {
        return new Promise<boolean>((resolve) => {
          const container = document.querySelector(selector)?.parentElement || document.body;
          let resolved = false;

          const observer = new MutationObserver((mutations) => {
            // Check if any mutation affects listing elements
            for (const mutation of mutations) {
              if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                // Content was added - likely page changed
                if (!resolved) {
                  resolved = true;
                  observer.disconnect();
                  resolve(true);
                }
                return;
              }
              if (mutation.type === "attributes") {
                // Attribute change on listings container
                if (!resolved) {
                  resolved = true;
                  observer.disconnect();
                  resolve(true);
                }
                return;
              }
            }
          });

          observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-page"],
          });

          // Timeout fallback
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              resolve(false);
            }
          }, timeout);
        });
      },
      listingSelector,
      timeoutMs
    );
  } catch {
    return false;
  }
}

async function fetchWithClickPagination(
  config: SourceFetchConfig
): Promise<ClickPaginationResult> {
  const result: ClickPaginationResult = {
    htmlPages: [],
    debug: {
      pagesAttempted: 0,
      pagesSuccessful: 0,
      stopReason: "",
      errors: [],
      autoDetectionUsed: false,
    },
  };

  const maxPages = config.max_pages ?? 50;
  const delayMs = config.delay_ms ?? 2500;
  const jitterMs = config.jitter_ms ?? 500;
  let nextSelector = config.pagination.next_selector;
  const listingSelector = config.selectors.listing;

  let browser: Browser | undefined;

  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 30000,
    }) as Browser;

    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to the initial page
    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[ClickPagination] Navigating to: ${config.base_url}`);
    }

    await page.goto(config.base_url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for listings to appear
    await page.waitForSelector(listingSelector, { timeout: 15000 }).catch(() => {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] Warning: Listing selector not found on initial load`);
      }
    });

    // AUTO-DETECT next selector if not provided
    if (!nextSelector) {
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] No next_selector configured, attempting auto-detection...`);
      }

      nextSelector = await autoDetectNextSelector(page) || undefined;
      result.debug.autoDetectionUsed = true;

      if (nextSelector) {
        result.debug.detectedSelector = nextSelector;
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Auto-detected next selector: ${nextSelector}`);
        }
      } else {
        result.debug.stopReason = "no_next_selector_detected";
        result.debug.errors.push(
          "Could not auto-detect next button selector. " +
          "Site may use non-standard pagination. " +
          "Configure next_selector manually or use external acquisition layer."
        );
        // Still capture the first page
        result.htmlPages.push(await page.content());
        result.debug.pagesSuccessful = 1;
        return result;
      }
    }

    let pageNum = 1;
    let previousListingIds = new Set<string>();

    while (pageNum <= maxPages) {
      result.debug.pagesAttempted++;

      // Get current page content
      const html = await page.content();

      // Extract listing IDs for duplicate detection (more reliable than HTML comparison)
      const currentListingIds = await page.$$eval(listingSelector, (els) =>
        els.map((el) => {
          const link = el.querySelector("a[href]");
          return link?.getAttribute("href") || el.textContent?.substring(0, 100) || "";
        })
      );

      const currentSet = new Set(currentListingIds);
      const overlap = [...currentSet].filter((id) => previousListingIds.has(id)).length;

      // If >80% overlap, we're seeing the same page
      if (previousListingIds.size > 0 && overlap / currentSet.size > 0.8) {
        result.debug.stopReason = "duplicate_page_content";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Page ${pageNum}: Duplicate content detected (${overlap}/${currentSet.size} overlap), stopping`);
        }
        break;
      }
      previousListingIds = currentSet;

      result.htmlPages.push(html);
      result.debug.pagesSuccessful++;

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] Page ${pageNum}: Captured ${html.length} bytes, ${currentSet.size} listings`);
      }

      // Check if there's a next button/link
      const nextButton = await page.$(nextSelector);
      if (!nextButton) {
        result.debug.stopReason = "no_next_button";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Page ${pageNum}: No next button found, stopping`);
        }
        break;
      }

      // Check if the next button is disabled or hidden
      const isDisabled = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return true;
        const styles = window.getComputedStyle(el);
        if (styles.display === "none" || styles.visibility === "hidden") return true;
        if ((el as HTMLElement).offsetParent === null) return true;
        if (el.hasAttribute("disabled")) return true;
        if (el.classList.contains("disabled")) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        return false;
      }, nextSelector);

      if (isDisabled) {
        result.debug.stopReason = "next_button_disabled";
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] Page ${pageNum}: Next button is disabled, stopping`);
        }
        break;
      }

      // Delay before clicking next
      const actualDelay = delayMs + Math.floor(Math.random() * jitterMs);
      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[ClickPagination] Waiting ${actualDelay}ms before clicking next...`);
      }
      await sleep(actualDelay);

      // Click the next button
      try {
        await nextButton.click();
      } catch (clickErr) {
        // Try JavaScript click as fallback
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) (el as HTMLElement).click();
        }, nextSelector);
      }

      // Wait for content to change using MutationObserver
      const contentChanged = await waitForContentChange(page, listingSelector, 10000);

      if (!contentChanged) {
        // Fallback: wait for network idle
        if (process.env.DEBUG_GENERIC === "1") {
          console.log(`[ClickPagination] MutationObserver timeout, falling back to network idle`);
        }
        await page.waitForNetworkIdle({ idleTime: 1000, timeout: 5000 }).catch(() => {});
      }

      // Additional wait for any animations/rendering
      await sleep(500);

      pageNum++;
    }

    if (!result.debug.stopReason) {
      result.debug.stopReason = pageNum > maxPages ? "max_pages_reached" : "natural_end";
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result.debug.errors.push(errorMessage);
    result.debug.stopReason = `error: ${errorMessage}`;
    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[ClickPagination] Error: ${errorMessage}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  if (process.env.DEBUG_GENERIC === "1") {
    console.log(`[ClickPagination] Complete: ${result.debug.pagesSuccessful} pages captured`);
    if (result.debug.autoDetectionUsed) {
      console.log(`[ClickPagination] Auto-detected selector: ${result.debug.detectedSelector || "none"}`);
    }
  }

  return result;
}

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
  // =============================================
  if (config.pagination.type === "click_next") {
    if (config.fetch_method !== "headless") {
      debug.errors.push("click_next pagination requires fetch_method: headless");
      debug.stopReason = "config_error_click_next_requires_headless";
      return { listings: [], debug };
    }

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Using click_next pagination for ${config.id}`);
    }

    const clickResult = await fetchWithClickPagination(config);

    // Process all collected HTML pages
    for (let i = 0; i < clickResult.htmlPages.length; i++) {
      const html = clickResult.htmlPages[i];
      debug.pagesAttempted++;
      debug.pagesSuccessful++;
      debug.htmlLengths.push(html.length);

      const pageListings = parseListingsFromHtml(html, config, processedUrls, now, debug.errors);
      debug.listingsPerPage.push(pageListings.length);

      if (process.env.DEBUG_GENERIC === "1") {
        console.log(`[GenericFetcher] Page ${i + 1}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`);
      }

      allListings.push(...pageListings);

      if (allListings.length >= maxItems) {
        break;
      }
    }

    debug.stopReason = clickResult.debug.stopReason;
    debug.errors.push(...clickResult.debug.errors);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] ===== Complete (click_next) =====`);
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
  // STANDARD URL-BASED PAGINATION
  // =============================================
  let currentPage = startPage;
  let hasMore = true;
  let lastHtml = "";

  while (hasMore && allListings.length < maxItems && currentPage <= startPage + maxPages - 1) {
    // Delay between pages (skip first)
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

    // Detect duplicate page content (sign of failed pagination)
    if (result.html === lastHtml) {
      debug.stopReason = "duplicate_page_content";
      hasMore = false;
      break;
    }
    lastHtml = result.html;

    debug.pagesSuccessful++;

    // Parse listings from this page
    const pageListings = parseListingsFromHtml(result.html, config, processedUrls, now, debug.errors, url);
    debug.listingsPerPage.push(pageListings.length);

    if (process.env.DEBUG_GENERIC === "1") {
      console.log(`[GenericFetcher] Page ${currentPage}: ${pageListings.length} listings (total: ${allListings.length + pageListings.length})`);
    }

    // Check stop conditions
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
    // For offset pagination, always increment page counter by 1
    // (buildPaginationUrl handles the actual offset calculation)
    currentPage += (config.pagination.type === "offset" ? 1 : increment);
  }

  // Final stop reason if we just ran out
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

  return {
    listings: allListings.slice(0, maxItems),
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
    ...overrides,
  };

  return config;
}
