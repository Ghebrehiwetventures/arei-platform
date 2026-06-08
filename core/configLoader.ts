import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { SourceStatus } from "./status";

// ============================================
// EXTENDED CONFIG TYPES (supports new fields)
// ============================================

export type FetchMethod = "http" | "headless";
export type PaginationType = "query_param" | "next_link" | "offset" | "cursor" | "path_segment" | "click_next" | "infinite_scroll" | "ajax_post" | "json_api" | "auto" | "none";
export type StopCondition = "empty_listings" | "no_next_link" | "max_items" | "max_pages" | "total_from_page";
export type DetailPolicy = "always" | "on_violation" | "never";

export interface PaginationConfig {
  type: PaginationType;
  param?: string;
  start?: number;
  first_no_param?: boolean;
  increment?: number;
  next_selector?: string;
  total_selector?: string;
  pattern?: string;
  /** AJAX POST pagination fields */
  endpoint?: string;
  body_params?: Record<string, string>;
  page_param?: string;
  response_format?: "json_html";
  html_field?: string;
  has_more_field?: string;
  no_result_value?: string;
  /** json_api pagination (structured JSON APIs) */
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  page_size?: number;
  page_mode?: "skip" | "page";
  page_field?: string;
  size_field?: string;
  items_path?: string;
  count_path?: string;
}

/** Array-pick spec for json_api item mapping */
export interface ItemMapArrayPick {
  array: string;
  field: string;
  match_field?: string;
  match_value?: string | number | boolean;
  matches?: Array<{ field: string; equals: string | number | boolean }>;
  template?: string;
  limit?: number;
  all?: boolean;
  sort_by?: string;
}

/** Field mapping for json_api sources */
export interface ItemMapConfig {
  content_base?: string;
  id?: string;
  title?: string | ItemMapArrayPick;
  title_fallbacks?: Array<string | ItemMapArrayPick>;
  title_template?: string;
  price?: string;
  bedrooms?: string;
  bathrooms?: string;
  area_sqm?: string;
  location?: string;
  location_template?: string;
  description?: string | ItemMapArrayPick;
  detail_url?: string | ItemMapArrayPick;
  images?: ItemMapArrayPick;
  skip_if?: Array<{ field: string; equals: unknown }>;
}

export interface PriceFormatConfig {
  currency_symbol?: string;
  thousands_separator?: "." | "," | " ";
  decimal_separator?: "." | ",";
  multiplier?: number;
}

export interface DetailConfig {
  enabled?: boolean;
  policy?: DetailPolicy;
  /** Detail pages may be server-rendered even when catalogue pagination needs
   *  a headless browser. Defaults to the source-level fetch method. */
  fetch_method?: FetchMethod;
  selectors?: {
    description?: string;
    images?: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    price?: string;
    location?: string;
  };
  /** Disable generic page-wide image fallbacks when the configured image
   *  selector is authoritative and unrelated sidebar images are present. */
  image_fallback?: boolean;
  delay_ms?: number;
  /** Scope `spec_patterns` regexes to this container instead of `<body>`. Prevents
   *  regex pollution from Similar Listings / sidebar / navigation. When unset, the
   *  engine falls back to the description text, then to the full body. */
  specs_selector?: string;
  /** Spec extraction patterns (config-driven, from sources.yml) */
  spec_patterns?: {
    bedrooms?: string[];
    bathrooms?: string[];
    parking?: string[];
    area?: string[];
  };
  /** Amenity keywords to detect (config-driven, from sources.yml) */
  amenity_keywords?: {
    [key: string]: string[];
  };
  /** Label/value spec table extractor for sites where specs are structured pairs
   *  (Elementor widgets with `span.pre-data`, definition lists, Houzez meta items).
   *  Runs between explicit `selectors.{bedrooms,bathrooms}` and the regex-based
   *  `spec_patterns` fallback. See docs/operations/engine-config-reference.md. */
  spec_table?: {
    container: string;
    label_selector: string;
    /** If set, value is the text of element matching this selector relative to
     *  the label. Prefix with `+` or `~` for an adjacent/general sibling selector
     *  (resolved via cheerio.next/nextAll). If unset, value = closest
     *  `li, tr, p, div` text with the label text removed. */
    value_selector?: string;
    label_map: {
      bedrooms?: string[];
      bathrooms?: string[];
      parking?: string[];
      area?: string[];
      price?: string[];
    };
  };
}

export interface SelectorsConfig {
  listing?: string;
  link?: string;
  title?: string;
  price?: string;
  image?: string;
  location?: string;
  description?: string;
}

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  userAgent?: string;
  lifecycleOverride?: "IN" | "OBSERVE" | "DROP";

  /** CMS type for preset fallbacks (auto-detected if not specified) */
  cms_type?: "elementor" | "wordpress" | "wix" | "squarespace" | "shopify" | "custom";

  /** ISO 4217 currency code for this source (e.g. "EUR", "CVE").
   *  Overrides the market-level currency from locations.yml when set. */
  currency?: string;

  // Extended fields for generic fetcher
  fetch_method?: FetchMethod;
  pagination?: PaginationConfig;
  delay_ms?: number;
  jitter_ms?: number;
  max_items?: number;
  max_pages?: number;
  stop_condition?: StopCondition;
  /** Whether absence from a successful fetch proves removal. Disable for
   *  featured/search subsets that do not represent the full source catalogue. */
  removal_detection?: boolean;
  reject_url_patterns?: string[];
  min_path_segments?: number;
  price_format?: PriceFormatConfig;
  location_patterns?: string[];
  id_prefix?: string;
  /** Regex (with one capture group) extracting a stable id from the detail URL.
   *  When set, takes precedence over the title+price+url hash so the same listing
   *  resolves to the same id across language variants of the same site. */
  id_url_pattern?: string;
  /** Regex substitution applied to detail URLs after extraction. Use when the
   *  listing card hrefs point at the wrong language variant of the same page. */
  detail_url_rewrite?: { from: string; to: string };
  detail?: DetailConfig;

  selectors?: SelectorsConfig;
  item_map?: ItemMapConfig;
}

export interface SourcesConfig {
  market: string;
  sources: SourceConfig[];
}

export interface RulesConfig {
  market: string;
  rules: Record<string, unknown>;
}

export interface ConfigLoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function loadSourcesConfig(marketId: string): ConfigLoadResult<SourcesConfig> {
  const filePath = path.resolve(__dirname, `../markets/${marketId}/sources.yml`);

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `sources.yml not found at ${filePath}`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as SourcesConfig;

    if (!parsed.market) {
      return {
        success: false,
        error: "sources.yml missing required field: market",
      };
    }

    if (!Array.isArray(parsed.sources)) {
      return {
        success: false,
        error: "sources.yml missing required field: sources (array)",
      };
    }

    for (const source of parsed.sources) {
      if (!source.id || !source.url) {
        return {
          success: false,
          error: `Source missing required fields (id, url): ${JSON.stringify(source)}`,
        };
      }

      // Apply defaults for pagination
      if (!source.pagination) {
        source.pagination = { type: "none" };
      }

      // Apply defaults for fetch method
      if (!source.fetch_method) {
        source.fetch_method = "http";
      }
    }

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse sources.yml: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function loadRulesConfig(marketId: string): ConfigLoadResult<RulesConfig> {
  const filePath = path.resolve(__dirname, `../markets/${marketId}/rules.yml`);

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `rules.yml not found at ${filePath}`,
    };
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as RulesConfig;

    if (!parsed.market) {
      return {
        success: false,
        error: "rules.yml missing required field: market",
      };
    }

    return { success: true, data: parsed };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse rules.yml: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ============================================
// HELPER: Convert SourceConfig to FetchConfig
// ============================================

import {
  SourceFetchConfig,
  buildFetchConfigFromYaml,
} from "./fetcher";

export function sourceConfigToFetchConfig(source: SourceConfig): SourceFetchConfig {
  return buildFetchConfigFromYaml(source);
}
