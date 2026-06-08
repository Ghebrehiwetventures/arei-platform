/**
 * news-cluster.ts — types + internal helpers for the News Cluster data
 * foundation (Stage 2 of the Africa Real Estate News cluster architecture,
 * docs/03-product/africa-real-estate-news-cluster-architecture.md, #322).
 *
 * Foundation only: row shapes that mirror migration 054, plus the canonical-URL
 * normaliser used as the article-level dedup key. Clustering logic (title
 * similarity, entity overlap, admin merge/split) lands in later stages.
 */

export type NewsStatus = "candidate" | "published" | "hidden" | "archived";
export type EditorialPriority = "high" | "standard";
export type ClusterMatchMethod =
  | "canonical_url"
  | "resolved_url"
  | "title_similarity"
  | "entity_overlap"
  | "number_overlap"
  | "topic_overlap"
  | "manual"
  | "semantic";

export interface NewsSource {
  id: string;
  name: string;
  homepage_url: string | null;
  feed_url: string | null;
  source_type: string | null;
  country_scope: string | null;
  language: string | null;
  enabled: boolean;
  reliability_tier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string | null;
  original_title: string | null;
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  canonical_url: string | null;
  resolved_url: string | null;
  published_at: string | null;
  first_seen_at: string;
  language: string | null;
  country_code: string | null;
  source_country_code: string | null;
  snippet: string | null;
  image_url: string | null;
  ingestion_source: string | null;
  raw_feed_meta: Record<string, unknown>;
  status: NewsStatus;
  relevance_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface NewsStoryCluster {
  id: string;
  cluster_title: string | null;
  summary: string | null;
  market_relevance_note: string | null;
  country_code: string | null;
  primary_topic: string | null;
  topics: string[];
  affected_regions: string[];
  entities: string[];
  status: NewsStatus;
  editorial_priority: EditorialPriority;
  cluster_confidence: number | null;
  first_published_at: string | null;
  latest_published_at: string | null;
  source_count: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticleClusterLink {
  cluster_id: string;
  article_id: string;
  match_method: ClusterMatchMethod | null;
  match_score: number | null;
  is_primary_source: boolean;
  created_at: string;
}

// Query/tracking params that never identify the article itself — stripped so
// the same story shared with different tracking still dedupes to one key.
const TRACKING_PARAM = /^(utm_|mc_|hsa_|pk_|piwik_|matomo_|_hs)/i;
const TRACKING_PARAM_EXACT = new Set([
  "fbclid", "gclid", "dclid", "gclsrc", "wbraid", "gbraid", "msclkid",
  "igshid", "igsh", "ref", "ref_src", "ref_url", "source", "cmpid", "spm",
  "yclid", "twclid", "li_fat_id", "vero_id", "oly_anon_id", "oly_enc_id",
  "s_cid", "ncid", "amp", "__twitter_impression", "guccounter",
]);

/**
 * Normalize an article URL into a stable dedup key:
 * - https, lowercase host, no leading "www.", no default port
 * - path without a trailing slash (except root)
 * - tracking/query params removed, remaining params sorted
 * - fragment dropped
 * Returns null for an empty or unparseable URL.
 */
export function normalizeCanonicalUrl(rawUrl: string | null | undefined): string | null {
  const input = (rawUrl || "").trim();
  if (!input) return null;
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  u.protocol = "https:";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  u.hash = "";
  if ((u.port === "80" || u.port === "443")) u.port = "";

  // Path: drop a single trailing slash (but keep the root "/").
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");

  // Filter + sort query params.
  const kept: [string, string][] = [];
  for (const [k, v] of u.searchParams.entries()) {
    if (TRACKING_PARAM.test(k) || TRACKING_PARAM_EXACT.has(k.toLowerCase())) continue;
    kept.push([k, v]);
  }
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);

  return u.toString();
}
