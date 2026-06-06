/**
 * pexels.js — optional real-photo background provider for the News Post Studio.
 *
 * Searches the Pexels API for a portrait photo to use as the slide background,
 * as an alternative to the OpenAI/gpt-image AI background. Purely additive:
 * the caller is expected to fall back to the existing AI/placeholder flow if
 * this module returns null (missing key, API error, or no usable photo).
 *
 * Pexels API: https://www.pexels.com/api/documentation/
 * Auth is the raw API key in the Authorization header (no "Bearer" prefix).
 * Attribution to the photographer + Pexels is required by their guidelines, so
 * every successful result carries an `attribution` string for rendering/credit.
 */

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

// Map a headline to a concrete photo subject so the query is specific
// ("resort", "architecture") rather than always "Cape Verde". Mirrors the
// intent of newsHero.buildImagePrompt's SUBJECT_RULES, kept lightweight here.
const TOPIC_RULES = [
  [/\b(hotel|resort|hospitality|rooms?|tourist|tourism)\b/i, "resort hotel"],
  [/\b(flight|airline|route|airport|aviation|charter)\b/i, "airport airplane"],
  [/\b(port|harbou?r|shipping|cargo|maritime|cruise|ferry)\b/i, "coastal port harbour"],
  [/\b(road|highway|bridge|construction|build|develop|crane|stadium)\b/i, "construction site building"],
  [/\b(property|real estate|apartment|villa|housing|residen|land)\b/i, "modern coastal architecture"],
  [/\b(bank|credit|mortgage|loan|finance|fiscal|econom|currency|investment|fund)\b/i, "modern office building"],
  [/\b(tax|residency|visa|law|regulat|policy|government|statute|ministr|parliament)\b/i, "civic government building"],
];

// Ordered fallback queries (per spec) used when the derived query yields
// nothing. Each is tried in turn until a usable photo is found.
const FALLBACK_QUERIES = [
  "Cape Verde real estate",
  "Cape Verde architecture",
  "coastal property",
  "modern apartment building",
];

/**
 * Build the ordered list of search queries for a news item.
 * Derived (location + topic) first, then the spec fallback chain.
 * @param {{ headline?: string, category?: string, location?: string }} item
 * @returns {string[]} de-duplicated, non-empty queries in priority order
 */
export function buildPexelsQueries(item = {}) {
  const headline = String(item.headline || "");
  const location = String(item.location || "").trim() || "Cape Verde";

  let topic = null;
  for (const [re, t] of TOPIC_RULES) {
    if (re.test(headline)) { topic = t; break; }
  }
  if (!topic) {
    const cat = String(item.category || "").toLowerCase();
    topic = /tourism/.test(cat) ? "resort coastline"
      : /infrastructure/.test(cat) ? "construction development"
      : /(bank|credit|economy)/.test(cat) ? "modern office building"
      : /(policy|tax)/.test(cat) ? "civic government building"
      : "coastal architecture";
  }

  const derived = `${location} ${topic}`.trim();
  const queries = [derived, ...FALLBACK_QUERIES];
  return Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
}

/**
 * Search Pexels for a single usable portrait photo.
 *
 * @param {{ headline?: string, category?: string, location?: string }} item
 * @returns {Promise<null | {
 *   imageUrl: string,
 *   photographer: string,
 *   photographerUrl: string,
 *   sourceUrl: string,
 *   attribution: string,
 *   query: string,
 * }>} the chosen photo, or null if the key is missing / API fails / no result.
 */
export async function searchPexelsPhoto(item = {}) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  const queries = buildPexelsQueries(item);

  for (const query of queries) {
    let photo;
    try {
      const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=15&orientation=portrait`;
      const res = await fetch(url, { headers: { Authorization: key } });
      if (!res.ok) continue; // try next query (rate limit, bad query, etc.)
      const json = await res.json();
      photo = Array.isArray(json?.photos) ? json.photos.find((p) => p?.src) : null;
    } catch {
      continue; // network error — try next query
    }
    if (!photo) continue;

    // Prefer a portrait-cropped render sized for the 1080x1350 slide.
    const imageUrl =
      photo.src.portrait || photo.src.large2x || photo.src.large || photo.src.original;
    if (!imageUrl) continue;

    const photographer = String(photo.photographer || "Unknown");
    const photographerUrl = String(photo.photographer_url || "");
    const sourceUrl = String(photo.url || "");
    return {
      imageUrl,
      photographer,
      photographerUrl,
      sourceUrl,
      attribution: `Photo: ${photographer} / Pexels`,
      query,
    };
  }

  return null;
}
