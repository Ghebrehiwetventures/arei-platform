/**
 * Deduplication helpers for market_news candidate ingestion.
 *
 * Strategy (evaluated in order, first match wins):
 *   1. canonical_url — normalized URL from the feed link/guid
 *   2. source_url    — also normalized, as a secondary fallback
 *
 * "Normalized" means: UTM/tracking params removed, trailing slash stripped,
 * scheme and host lowercased, fragment dropped.
 *
 * The full existing key set is loaded once per run (not per item) to avoid
 * N+1 DB calls.
 */

import { SupabaseClient } from "@supabase/supabase-js";

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
  "fbclid", "gclid", "gbraid", "wbraid", "msclkid", "twclid",
  "mc_cid", "mc_eid", "ref", "_hsenc", "_hsmi", "hsCtaTracking",
]);

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    // Strip trailing slash from non-root paths
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    url.hostname = url.hostname.toLowerCase();
    url.protocol = url.protocol.toLowerCase();
    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

/**
 * Load all existing canonical_url and source_url values from market_news
 * into a single normalized Set. Used for O(1) duplicate checks.
 *
 * Requires service-role client (bypasses RLS to see all statuses).
 */
export async function loadExistingKeys(sb: SupabaseClient): Promise<Set<string>> {
  const keys = new Set<string>();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await sb
      .from("market_news")
      .select("canonical_url, source_url")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Failed to load existing market_news keys: ${error.message}`);
    const rows = data ?? [];

    for (const row of rows) {
      if (row.canonical_url) keys.add(normalizeUrl(row.canonical_url));
      if (row.source_url) keys.add(normalizeUrl(row.source_url));
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return keys;
}

/**
 * Returns true if this candidate's canonical_url or source_url is already
 * present in the existing key set.
 */
export function isDuplicate(
  canonicalUrl: string,
  sourceUrl: string,
  existingKeys: Set<string>
): boolean {
  return (
    existingKeys.has(normalizeUrl(canonicalUrl)) ||
    existingKeys.has(normalizeUrl(sourceUrl))
  );
}
