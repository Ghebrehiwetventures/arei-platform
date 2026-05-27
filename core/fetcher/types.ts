/**
 * Shared types for the generic config-driven fetcher.
 *
 * Source-of-truth interfaces matching markets/*\/sources.yml schema. Kept in a
 * leaf module so strategy and parse helpers can import them without pulling in
 * the orchestrator.
 */

import type { CMSType } from "../cmsPresets";

// ============================================
// CONFIG TYPES (matches sources.yml schema)
// ============================================

export type PaginationType =
  | "query_param"
  | "next_link"
  | "offset"
  | "cursor"
  | "click_next"
  | "infinite_scroll"
  | "path_segment"
  | "ajax_post"
  | "json_api"
  | "auto"
  | "none";

export type StopCondition =
  | "empty_listings"
  | "no_next_link"
  | "max_items"
  | "max_pages"
  | "total_from_page";

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

  // ============================================
  // JSON API pagination (type: json_api)
  // Generic support for POST/GET JSON APIs (Azure Search, OData, Elastic, REST)
  // ============================================
  /** HTTP method for json_api (default: POST) */
  method?: "GET" | "POST";
  /** Request body template (POST). Pagination params injected at runtime. */
  body?: Record<string, unknown>;
  /** Extra query params (GET). Pagination params injected at runtime. */
  query?: Record<string, string>;
  /** Items per request (default: 20) */
  page_size?: number;
  /** How to advance pages: skip = body[page_param] = (page-1)*page_size, page = body[page_param] = pageNum */
  page_mode?: "skip" | "page";
  /** Body/query field name for page offset or page number (default: "skip" for skip mode, "page" for page mode) */
  page_field?: string;
  /** Body/query field name for page size (default: "top" for skip mode, "per_page" for page mode) */
  size_field?: string;
  /** Dot-path to items array in response (e.g. "value", "data.results") */
  items_path?: string;
  /** Dot-path to total count in response (optional, for stop condition) */
  count_path?: string;
}

// ============================================
// ITEM MAP (for type: json_api)
// Field-level mapping from JSON item → GenericParsedListing
// ============================================

export interface ItemMapArrayPick {
  /** Dot-path to array field on item */
  array: string;
  /** Field name on each array element to extract */
  field: string;
  /** Optional filter: pick element whose match_field equals match_value */
  match_field?: string;
  match_value?: string | number | boolean;
  /** Optional filters: pick element matching every field/value pair. */
  matches?: Array<{ field: string; equals: string | number | boolean }>;
  /** Optional template applied to the extracted value, with `{VALUE}` placeholder */
  template?: string;
  /** For image arrays: cap number of entries returned */
  limit?: number;
  /** If true, return all entries (array); otherwise return first match (scalar) */
  all?: boolean;
  /** Optional field to sort array elements by (numeric ascending) before extracting.
   *  Use for sources whose API doesn't return elements in display order (e.g. REMAX
   *  ListingImages where `Order=1` may appear last in the response). */
  sort_by?: string;
}

export interface ItemMapConfig {
  /** Optional base path inside each search hit (e.g. "content" for Azure Search docs) */
  content_base?: string;
  /** Dot-path to unique ID field */
  id?: string;
  /** Title from path or array-pick by language/type */
  title?: string | ItemMapArrayPick;
  /** Ordered title fallbacks tried when `title` and `title_template` are empty. */
  title_fallbacks?: Array<string | ItemMapArrayPick>;
  title_template?: string;
  /** Dot-path to numeric price */
  price?: string;
  /** Dot-paths for optional scalars */
  bedrooms?: string;
  bathrooms?: string;
  area_sqm?: string;
  /** Location from single path OR template */
  location?: string;
  location_template?: string;
  /** Description from path or array-pick by language */
  description?: string | ItemMapArrayPick;
  /** Detail URL from path or array-pick */
  detail_url?: string | ItemMapArrayPick;
  /** Image URLs from array-pick */
  images?: ItemMapArrayPick;
  /** Optional hide rules — items matching any rule are dropped */
  skip_if?: Array<{ field: string; equals: unknown }>;
}

export interface SelectorsConfig {
  /** Container for each listing item (required for HTML sources; unused for json_api) */
  listing?: string;
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

  /** Regex (with one capture group) extracting a stable id from the detail URL.
   *  Use this when the site has the same listing under multiple URL slugs
   *  (e.g. language variants) so the same row resolves to the same id. */
  id_url_pattern?: string;

  /** Regex substitution applied to detail URLs after extraction (one-shot).
   *  Use when the listing card hrefs point at the wrong language variant. */
  detail_url_rewrite?: { from: string; to: string };

  /** CMS type for selector fallbacks (auto-detected if not specified) */
  cms_type?: CMSType;

  /** Item field mapping (required when pagination.type === "json_api") */
  item_map?: ItemMapConfig;
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
