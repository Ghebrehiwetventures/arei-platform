/**
 * Backwards-compatible shim for the generic config-driven paginated fetcher.
 *
 * The real implementation lives in ./fetcher/ now, split into per-strategy
 * modules. This file exists only so existing callers (ingestMarket,
 * ingestCv, ingestCvGeneric, runMarketSource, configLoader,
 * genericDetailExtractor, pipeline/enrich, tests) keep working without
 * having to update their imports. New code should import from
 * "./fetcher" directly.
 */

export {
  buildFetchConfigFromYaml,
  dedupeImageUrls,
  genericPaginatedFetcher,
  mapJsonItem,
} from "./fetcher";

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
} from "./fetcher";
