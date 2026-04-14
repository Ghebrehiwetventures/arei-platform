import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { SourceStatus } from "./status";

// ============================================
// EXTENDED CONFIG TYPES (supports new fields)
// ============================================

export type FetchMethod = "http" | "headless";
export type PaginationType = "query_param" | "next_link" | "offset" | "cursor" | "path_segment" | "click_next" | "infinite_scroll" | "ajax_post" | "auto" | "none";
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
  selectors?: {
    description?: string;
    images?: string;
    bedrooms?: string;
    bathrooms?: string;
    price?: string;
    location?: string;
  };
  delay_ms?: number;
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
}

export interface SelectorsConfig {
  listing: string;
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
  reject_url_patterns?: string[];
  min_path_segments?: number;
  price_format?: PriceFormatConfig;
  location_patterns?: string[];
  id_prefix?: string;
  detail?: DetailConfig;

  selectors: SelectorsConfig;
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
} from "./genericFetcher";

export function sourceConfigToFetchConfig(source: SourceConfig): SourceFetchConfig {
  return buildFetchConfigFromYaml(source);
}
