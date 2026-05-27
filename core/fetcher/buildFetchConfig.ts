/**
 * YAML → SourceFetchConfig converter.
 *
 * Resolves CMS preset defaults, merges them with the per-source overrides
 * declared in markets/<region>/sources.yml, and returns a fully-populated
 * SourceFetchConfig ready to hand to genericPaginatedFetcher.
 */

import { CMS_PRESETS, type CMSType, mergeWithPreset } from "../cmsPresets";
import type { SourceFetchConfig } from "./types";

export function buildFetchConfigFromYaml(
  yamlSource: any,
  overrides?: Partial<SourceFetchConfig>,
): SourceFetchConfig {
  const cmsType: CMSType = yamlSource.cms_type || "custom";
  const preset = CMS_PRESETS[cmsType] || CMS_PRESETS.custom;

  const mergedSelectors = mergeWithPreset(yamlSource.selectors, cmsType);

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
