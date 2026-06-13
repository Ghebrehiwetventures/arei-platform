/**
 * wikimedia.js — Wikimedia Commons candidate fetcher for the curated Cape Verde
 * photo allowlist.
 *
 * Commons hosts real, geotagged, freely-licensed photography of actual Cape
 * Verde places (Sal, Mindelo, Boa Vista, Praia, Fogo …) — unlike generic stock
 * search, which pads "Cape Verde" with look-alike tropical beaches from Bali /
 * the Canaries. This module queries the public, unauthenticated Commons API and
 * returns candidates ready for human review, in the SAME shape the runtime
 * allowlist (`cape-verde-photos.json`) expects — with `provider: "wikimedia"`
 * and a precomputed, licence-aware `attribution` string so credit is automatic.
 *
 * Commons API: https://commons.wikimedia.org/w/api.php (action=query)
 * Licences are CC / public-domain; attribution to the author + Commons + the
 * licence is required, so every candidate carries that text.
 */
import { isLikelyWrongCountry } from "./pexels.js";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

// Default search queries — Cape Verde places + built-environment terms, so the
// results lean toward architecture / townscape / coast rather than maps or
// wildlife. `filetype:bitmap` drops SVG maps, flags, diagrams at the source.
export const DEFAULT_QUERIES = [
  "Cape Verde architecture",
  "Cabo Verde building",
  "Santa Maria Sal Cape Verde",
  "Mindelo São Vicente",
  "Praia Santiago Cape Verde",
  "Sal island Cape Verde",
  "Boa Vista Cape Verde",
  "Cape Verde town street",
  "Cape Verde coast",
  "Fogo Cape Verde",
].map((q) => `${q} filetype:bitmap`);

// Positive Cape Verde signal in a title / description / category text.
const CV_NAMED_RE = new RegExp(
  ["cabo verde", "cape verde", "sal rei", "boa vista", "santiago", "são vicente",
   "sao vicente", "mindelo", "praia", "santa maria", "fogo", "santo antão",
   "santo antao", "maio", "brava", "espargos", "tarrafal", "sal island"].join("|"),
  "i"
);

// Files that are not real photographs — drop by title.
const NON_PHOTO_RE =
  /\b(map|flag|coat of arms|locator|logo|seal|icon|diagram|chart|stamp|banknote|coin|emblem|svg)\b/i;

const stripHtml = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Fetch and parse Cape Verde photo candidates from Wikimedia Commons.
 *
 * @param {{ queries?: string[], widthPx?: number, perQuery?: number }} [opts]
 * @returns {Promise<{ photos: object[], queriesUsed: string[] }>}
 *   photos are allowlist-shaped candidates with a `confident` flag and a
 *   licence-aware `attribution` string. Human review keeps only the keepers.
 */
export async function fetchWikimediaCandidates(opts = {}) {
  const queries = Array.isArray(opts.queries) && opts.queries.length ? opts.queries : DEFAULT_QUERIES;
  const widthPx = Number(opts.widthPx) > 0 ? Math.floor(Number(opts.widthPx)) : 1600;
  const perQuery = Number(opts.perQuery) > 0 ? Math.floor(Number(opts.perQuery)) : 40;

  const byKey = new Map();
  for (const query of queries) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6", // File: namespace
      gsrlimit: String(perQuery),
      prop: "imageinfo",
      iiprop: "url|extmetadata|mime|size",
      iiurlwidth: String(widthPx),
    });
    let json;
    try {
      const r = await fetch(`${COMMONS_API}?${params.toString()}`, {
        headers: { "User-Agent": "AREI-CVREI-curate/1.0 (https://capeverderealestateindex.com)" },
      });
      if (!r.ok) continue;
      json = await r.json();
    } catch {
      continue; // skip this query on error
    }
    const pages = json?.query?.pages && typeof json.query.pages === "object" ? json.query.pages : {};
    for (const page of Object.values(pages)) {
      const title = String(page?.title || "");
      const ii = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
      if (!ii) continue;
      const mime = String(ii.mime || "");
      if (!/^image\/(jpe?g|png|webp)$/i.test(mime)) continue; // photos only
      if (NON_PHOTO_RE.test(title)) continue;

      const meta = ii.extmetadata || {};
      const description = stripHtml(meta.ImageDescription?.value || "");
      const categories = stripHtml(meta.Categories?.value || "");
      const haystack = `${title} ${description} ${categories}`;
      if (isLikelyWrongCountry(haystack)) continue; // drop named look-alikes

      const key = page.pageid ?? title;
      if (byKey.has(key)) continue;

      const author = stripHtml(meta.Artist?.value) || "Unknown";
      const license =
        stripHtml(meta.LicenseShortName?.value) ||
        stripHtml(meta.License?.value) ||
        "see source";
      const imageUrl = ii.thumburl || ii.url;
      if (!imageUrl) continue;
      const sourceUrl = ii.descriptionurl || "";

      byKey.set(key, {
        id: title,
        provider: "wikimedia",
        imageUrl,
        width: ii.thumbwidth || ii.width || null,
        height: ii.thumbheight || ii.height || null,
        photographer: author,
        photographerUrl: sourceUrl,
        sourceUrl,
        license,
        licenseUrl: stripHtml(meta.LicenseUrl?.value) || "",
        attribution: `Photo: ${author} / Wikimedia Commons${license !== "see source" ? ` (${license})` : ""}`,
        alt: description,
        confident: CV_NAMED_RE.test(haystack),
      });
    }
  }

  const photos = [...byKey.values()];
  // Confident (positively names Cape Verde) first, for quick eyeballing.
  photos.sort((a, b) => Number(b.confident) - Number(a.confident));
  return { photos, queriesUsed: queries };
}
