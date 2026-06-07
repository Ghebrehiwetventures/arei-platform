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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

// Curated allowlist of human-verified Cape Verde photos. When non-empty it is
// used exclusively — the background is then ALWAYS genuinely Cape Verde, never a
// look-alike neighbour (Canary Islands, etc.), and needs no live search. Build /
// extend it via the /api/pexels-curate endpoint. Falls back to live keyword
// search only while the list is empty.
const HERE = path.dirname(fileURLToPath(import.meta.url));
let ALLOWLIST = [];
try {
  const parsed = JSON.parse(fs.readFileSync(path.join(HERE, "cape-verde-photos.json"), "utf8"));
  if (Array.isArray(parsed)) ALLOWLIST = parsed.filter((p) => p && p.imageUrl);
} catch {
  // absent / unreadable / empty → live-search fallback
}

/** True when a photo's description names a place that is NOT Cape Verde. */
export function isLikelyWrongCountry(alt) {
  return WRONG_COUNTRY_RE.test(String(alt || ""));
}

// Places that, when named in a photo's description, mean it is NOT Cape Verde.
// Pexels pads "Cabo Verde" searches with generic West-African / coastal photos,
// but the wrong-country ones almost always name their location in the alt text
// (e.g. "… in Monrovia, Liberia", "… Dakar, Senegal"). We simply drop those and
// keep everything else, which keeps the rotation wide and on-country.
const WRONG_COUNTRY_RE = new RegExp(
  [
    "liberia", "monrovia", "senegal", "dakar", "gambia", "banjul",
    "guinea", "conakry", "bissau", "sierra leone", "freetown",
    "nigeria", "lagos", "abuja", "ghana", "accra", "ivory coast",
    "côte d'ivoire", "cote d'ivoire", "abidjan", "mali", "bamako",
    "mauritania", "nouakchott", "morocco", "marrakech", "casablanca",
    "togo", "benin", "cotonou", "lome", "lomé", "angola", "luanda",
    "mozambique", "maputo", "south africa", "cape town", "johannesburg",
    "kenya", "nairobi", "tanzania", "zanzibar", "ethiopia", "egypt", "cairo",
  ].join("|"),
  "i"
);

/**
 * Build a small, simple set of Cape-Verde search queries. No topic/category
 * refinement — multi-word topics diluted the match and pulled in wrong-country
 * photos. Just the country (native "Cabo Verde" first) plus the island when
 * known, which keeps results broad and on-country.
 * @param {{ location?: string }} item
 * @returns {string[]} de-duplicated, non-empty queries in priority order
 */
export function buildPexelsQueries(item = {}) {
  const rawLoc = String(item.location || "").trim();
  const island = rawLoc && !/^(cape|cabo)\s+verde$/i.test(rawLoc) ? rawLoc : "";
  const queries = [
    island && `Cabo Verde ${island}`,
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
  // Curated allowlist takes precedence: a fixed, human-verified set of Cape
  // Verde photos. Shuffling among them guarantees a genuine Cape Verde
  // background every time — no live search, no look-alike countries.
  if (ALLOWLIST.length) {
    const p = ALLOWLIST[Math.floor(Math.random() * ALLOWLIST.length)];
    const photographer = String(p.photographer || "Unknown");
    return {
      imageUrl: p.imageUrl,
      photographer,
      photographerUrl: String(p.photographerUrl || ""),
      sourceUrl: String(p.sourceUrl || ""),
      attribution: `Photo: ${photographer} / Pexels`,
      query: "curated",
    };
  }

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

  // Pull a broad pool from the simple Cape-Verde queries, deduped by id. Drop
  // only photos whose description names another country (those wrong-country
  // leaks self-identify, e.g. "Monrovia, Liberia"); keep everything else so the
  // rotation stays varied. Stop once the pool is comfortably large.
  const POOL_TARGET = 40;
  const pool = new Map(); // id -> { photo, query }

  for (const query of queries) {
    let usable = [];
    try {
      const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=80&orientation=portrait`;
      const res = await fetch(url, { headers: { Authorization: key } });
      if (!res.ok) continue; // try next query (rate limit, bad query, etc.)
      const json = await res.json();
      usable = Array.isArray(json?.photos) ? json.photos.filter((p) => p?.src) : [];
    } catch {
      continue; // network error — try next query
    }
    for (const photo of usable) {
      if (WRONG_COUNTRY_RE.test(String(photo.alt || ""))) continue; // drop named wrong-country
      const id = photo.id ?? photo.src?.original ?? Math.random();
      if (!pool.has(id)) pool.set(id, { photo, query });
    }
    if (pool.size >= POOL_TARGET) break; // enough variety — stop fetching
  }

  if (!pool.size) return null; // nothing usable → AI fallback
  const choice = pick([...pool.values()]);
  return toResult(choice.photo, choice.query);
}
