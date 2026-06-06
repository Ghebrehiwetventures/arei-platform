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

// Map a headline to a SINGLE light subject word used to refine a Cape Verde
// query (e.g. "Cabo Verde beach"). Kept to one word so the country anchor
// stays dominant — multi-word topics dilute the match and Pexels starts
// returning generic / wrong-country photos.
// Patterns intentionally omit a trailing \b so plurals/inflections match
// ("Flights" → flight, "buildings" → build).
const TOPIC_RULES = [
  [/\b(hotel|resort|hospitality|room|tourist|tourism)/i, "resort"],
  [/\b(flight|airline|route|airport|aviation|charter)/i, "airport"],
  [/\b(port|harbou?r|shipping|cargo|maritime|cruise|ferry)/i, "harbour"],
  [/\b(road|highway|bridge|construction|build|develop|crane|stadium)/i, "construction"],
  [/\b(property|real estate|apartment|villa|housing|residen|land)/i, "architecture"],
  [/\b(bank|credit|mortgage|loan|finance|fiscal|econom|currency|investment|fund)/i, "city"],
  [/\b(tax|residency|visa|law|regulat|policy|government|statute|ministr|parliament)/i, "town"],
];

// Known Cape Verde place names (islands + main towns). Used both to build
// location-specific queries and to recognise genuinely Cape-Verdean photos in
// the results. "Cabo Verde" is the native (Portuguese) name and Pexels' richest
// tag, so it leads.
const CV_PLACES = [
  "Sal", "Boa Vista", "Santiago", "São Vicente", "Sao Vicente", "Fogo",
  "Santo Antão", "Santo Antao", "Maio", "Brava", "São Nicolau", "Sao Nicolau",
  "Mindelo", "Praia", "Santa Maria", "Sal Rei", "Espargos",
];
const CV_RELEVANCE_RE = new RegExp(
  ["cabo verde", "cape verde", ...CV_PLACES].map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i"
);

/**
 * Build the ordered list of search queries for a news item. Every query is
 * anchored to Cape Verde (native "Cabo Verde" first) so results stay in-country
 * — no landless generic queries, which is what previously surfaced wrong
 * -country photos (e.g. Dakar).
 * @param {{ headline?: string, category?: string, location?: string }} item
 * @returns {string[]} de-duplicated, non-empty queries in priority order
 */
export function buildPexelsQueries(item = {}) {
  const headline = String(item.headline || "");
  // Region/island hint, when it is an actual place (not the country itself).
  const rawLoc = String(item.location || "").trim();
  const island = rawLoc && !/^(cape|cabo)\s+verde$/i.test(rawLoc) ? rawLoc : "";

  let topic = null;
  for (const [re, t] of TOPIC_RULES) {
    if (re.test(headline)) { topic = t; break; }
  }
  if (!topic) {
    const cat = String(item.category || "").toLowerCase();
    topic = /tourism/.test(cat) ? "beach"
      : /infrastructure/.test(cat) ? "construction"
      : /(bank|credit|economy)/.test(cat) ? "city"
      : /(policy|tax)/.test(cat) ? "town"
      : "island";
  }

  const queries = [
    island && `Cabo Verde ${island}`,
    island && `Cape Verde ${island}`,
    `Cabo Verde ${topic}`,
    `Cape Verde ${topic}`,
    "Cabo Verde",
    "Cape Verde",
    "Cabo Verde beach",
  ];
  return Array.from(new Set(queries.map((q) => String(q || "").trim()).filter(Boolean)));
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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const toResult = (photo, query) => {
    // Prefer a portrait-cropped render sized for the 1080x1350 slide.
    const imageUrl =
      photo.src.portrait || photo.src.large2x || photo.src.large || photo.src.original;
    if (!imageUrl) return null;
    const photographer = String(photo.photographer || "Unknown");
    return {
      imageUrl,
      photographer,
      photographerUrl: String(photo.photographer_url || ""),
      sourceUrl: String(photo.url || ""),
      attribution: `Photo: ${photographer} / Pexels`,
      query,
    };
  };

  // Build a candidate POOL across the (all Cape-Verde-anchored) queries, deduped
  // by photo id, then shuffle across the whole pool. Every query already pins
  // the country, so the pool stays in-country — we no longer hard-filter on the
  // alt text (which collapsed variety to the ~3 photos that happen to name Cape
  // Verde). Stop early once the pool is wide enough to avoid extra API calls.
  const POOL_TARGET = 24;
  const pool = new Map(); // id/url -> { photo, query }

  for (const query of queries) {
    let usable = [];
    try {
      const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=30&orientation=portrait`;
      const res = await fetch(url, { headers: { Authorization: key } });
      if (!res.ok) continue; // try next query (rate limit, bad query, etc.)
      const json = await res.json();
      usable = Array.isArray(json?.photos) ? json.photos.filter((p) => p?.src) : [];
    } catch {
      continue; // network error — try next query
    }
    for (const photo of usable) {
      const id = photo.id ?? photo.src?.original ?? Math.random();
      if (!pool.has(id)) pool.set(id, { photo, query });
    }
    if (pool.size >= POOL_TARGET) break; // enough variety — stop fetching
  }

  if (!pool.size) return null;
  const all = [...pool.values()];

  // Soft preference: if a healthy number of photos explicitly name Cape Verde,
  // shuffle among those; otherwise shuffle the whole in-country pool.
  const cvMatches = all.filter((x) => CV_RELEVANCE_RE.test(String(x.photo.alt || "")));
  const chosenSet = cvMatches.length >= 5 ? cvMatches : all;

  const choice = pick(chosenSet);
  return toResult(choice.photo, choice.query);
}
