/**
 * URL + ID utilities used across fetcher strategies and parsers.
 */

import * as crypto from "crypto";

export function generateListingId(
  prefix: string,
  title: string,
  price: number | undefined,
  url: string,
): string {
  const input = `${title || ""}|${price || ""}|${url}`;
  const hash = crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

/** Extract a stable id from the URL using the configured regex (one capture group).
 *  Returns undefined when no pattern is configured or the URL doesn't match —
 *  callers fall back to the title+price+url hash. */
export function extractIdFromUrl(url: string, pattern: string | undefined): string | undefined {
  if (!pattern || !url) return undefined;
  try {
    const m = url.match(new RegExp(pattern));
    return m?.[1];
  } catch {
    return undefined;
  }
}

/** Apply the configured detail URL rewrite. Returns the input unchanged when
 *  no rewrite is configured or the pattern doesn't match. */
export function applyDetailUrlRewrite(
  url: string,
  rewrite: { from: string; to: string } | undefined,
): string {
  if (!rewrite || !url) return url;
  try {
    return url.replace(new RegExp(rewrite.from), rewrite.to);
  } catch {
    return url;
  }
}

export function makeAbsoluteUrl(url: string, baseUrl: string): string {
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
