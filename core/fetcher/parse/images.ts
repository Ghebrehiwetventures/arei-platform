/**
 * Image URL filtering, normalization, and WordPress-size-aware dedup.
 */

export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const invalidPatterns = ["logo", "icon", "avatar", "spinner", "loading", ".svg"];
  if (lower.includes("placeholder") && !lower.includes("property")) return false;
  if (lower.endsWith(".gif") && lower.includes("load")) return false;
  return !invalidPatterns.some((p) => lower.includes(p));
}

/** Normalize URL: force https, strip query params, hash, trailing slashes. */
export function normalizeImageUrl(url: string): string {
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
export function wpBaseKey(url: string): string {
  try {
    const u = new URL(url);
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
export function wpPixelArea(url: string): number {
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

  // Group by WP base key → keep the variant with highest resolution.
  // URLs without a size suffix (the original upload) are preferred (area = 0 → Infinity).
  const groups = new Map<string, { url: string; area: number; order: number }>();
  for (let i = 0; i < cleaned.length; i++) {
    const url = cleaned[i];
    const key = wpBaseKey(url);
    const area = wpPixelArea(url);
    const effectiveArea = area === 0 ? Infinity : area;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { url, area: effectiveArea, order: i });
    } else if (effectiveArea > existing.area) {
      // Keep the larger variant but preserve the earlier order position
      groups.set(key, { url, area: effectiveArea, order: existing.order });
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((g) => g.url);
}
