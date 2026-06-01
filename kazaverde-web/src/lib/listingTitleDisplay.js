// ---------------------------------------------------------------------------
// buildListingTitle — deterministic, fully-localized, no AI, no broker names
// ---------------------------------------------------------------------------

/**
 * Normalized property-type → display label per language.
 * Keys match the values returned by extractPropertyType() in the pipeline.
 * 'property' is the generic fallback the pipeline uses when type is unknown —
 * we treat it as missing (label = null) so the location alone carries the title.
 */
const TYPE_LABELS = {
  en: {
    apartment: "Apartment",
    house: "House",
    villa: "Villa",
    townhouse: "Townhouse",
    penthouse: "Penthouse",
    duplex: "Duplex",
    bungalow: "Bungalow",
    maisonette: "Maisonette",
    studio: "Studio Apartment",
    land: "Land Plot",
    commercial: "Commercial Property",
  },
  pt: {
    apartment: "Apartamento",
    house: "Casa",
    villa: "Moradia",
    townhouse: "Casa em Banda",
    penthouse: "Cobertura",
    duplex: "Duplex",
    bungalow: "Bangalô",
    maisonette: "Maisonette",
    studio: "Estúdio",
    land: "Terreno",
    commercial: "Imóvel Comercial",
  },
};

/**
 * Property types that carry no bedroom count by definition.
 * For these types the bedroom prefix is suppressed even if bedrooms > 0.
 */
const NO_BEDROOM_TYPES = new Set(["studio", "land", "commercial"]);

/**
 * Bedroom prefix per language.
 * "studio" is handled by its own label (no prefix needed).
 */
function bedroomPrefix(n, lang) {
  if (lang === "pt") {
    return `T${n}`; // Portuguese notation: T1, T2, T3 …
  }
  // English
  if (n === 1) return "1-Bedroom";
  return `${n}-Bedroom`;
}

/**
 * Clean a city value: strip sentinels and parenthetical suffixes.
 * e.g. "Santa Maria (Sal)" → "Santa Maria"
 *      "__hidden_for_dedup__" → null
 */
function cleanCity(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("__")) return null;
  return trimmed.replace(/\s*\([^)]*\)\s*$/, "").trim() || null;
}

/**
 * Clean an island value. In the DB the island field sometimes stores a
 * "City (Island)" pattern where the *parenthetical* is the canonical island.
 * e.g. "Vila de Sal Rei (Boa Vista)" → "Boa Vista"
 *      "Santa Maria (Sal)"           → "Sal"
 *      "Sal"                         → "Sal"
 *      "__hidden_for_dedup__"        → null
 */
function cleanIsland(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("__")) return null;
  const parenthetical = trimmed.match(/\(([^)]+)\)\s*$/);
  if (parenthetical) return parenthetical[1].trim() || null;
  return trimmed;
}

/**
 * Build the location segment: "{city}, {island}" or just one of them.
 * Returns null if neither is usable.
 */
function buildLocationSegment(listing) {
  const city = cleanCity(listing.city);
  const island = cleanIsland(listing.island);

  if (city && island && city !== island) return `${city}, ${island}`;
  if (city) return city;
  if (island) return island;
  return null;
}

/**
 * Build a deterministic, localized listing title from structured fields.
 *
 * Fallback chain:
 *   1. {bedroom-prefix} {type-label} — {city}, {island}
 *   2. {type-label} — {city}, {island}   (no bedrooms)
 *   3. {type-label}                       (no usable location)
 *   4. Property — {city}, {island}        (no usable type)
 *   5. null → caller must use raw listing.title
 *
 * Never returns AI text, marketing language, or broker names.
 *
 * @param {object} listing  — must have at minimum { title, property_type?, bedrooms?, city?, island? }
 * @param {string} [lang]   — "en" or "pt"; defaults to "en"
 * @returns {string | null}
 */
export function buildListingTitle(listing, lang = "en") {
  const effectiveLang = lang === "pt" ? "pt" : "en";
  const labels = TYPE_LABELS[effectiveLang];
  const rawType = (listing.property_type || "").toLowerCase().trim();
  const typeLabel = labels[rawType] ?? null; // null for 'property' or unknown

  const location = buildLocationSegment(listing);
  const bedrooms = listing.bedrooms;
  const showBedrooms =
    typeLabel !== null &&
    !NO_BEDROOM_TYPES.has(rawType) &&
    typeof bedrooms === "number" &&
    bedrooms > 0;

  // Assemble type part
  let typePart = null;
  if (typeLabel) {
    typePart = showBedrooms
      ? `${bedroomPrefix(bedrooms, effectiveLang)} ${typeLabel}`
      : typeLabel;
  }

  if (typePart && location) return `${typePart} — ${location}`;
  if (typePart) return typePart;
  if (location) return `Property — ${location}`;
  return null; // caller falls back to raw listing.title
}

// ---------------------------------------------------------------------------
// isBadListingTitle — conservative detector for clearly broken/scraped titles
// ---------------------------------------------------------------------------

/**
 * Returns true ONLY when the raw title is clearly broken scraped metadata
 * that should be replaced by a deterministic title.
 *
 * Conservative by design — acceptable project names, location descriptions,
 * generic titles, and marketing copy are NOT flagged.
 *
 * Flagged patterns:
 *   • null / empty
 *   • Starts with a numeric area measurement   "88.66 SqM Condo/Apartment…"
 *   • Contains "SqM" + a second scraped marker  "… For Sale" / "located at" / "Bedrooms located"
 *   • "for sale … located at …" boilerplate     "Property for sale located at …"
 *
 * NOT flagged (these titles should be preserved):
 *   • "Modern Residential"
 *   • "Vila Verde Resort"
 *   • "Praia de Chaves Villa"
 *   • "Beachfront Apartment"
 *   • "Santa Maria Apartment"
 *   • "Investment with Profitability and Sea View: Entire Building with Active B&B"
 *   • "2 and 3-Bedroom Villas - Murdeira"   (has "Bedroom" but not SqM)
 *
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isBadListingTitle(value) {
  // 1. Null or empty
  if (!value || typeof value !== "string") return true;
  const t = value.trim();
  if (!t) return true;

  // 2. Starts with a numeric area measurement
  //    e.g. "88.66 SqM Condo/Apartment For Sale…"
  //    e.g. "120 m² Villa for Sale"
  //    Note: \b is not used because "m²" ends with a non-word character (²),
  //    so a lookahead for whitespace/end is used instead.
  if (/^\d[\d.,]*\s*(sqm|m²|sq\.?\s*m)(?=[\s,./]|$)/i.test(t)) return true;

  // 3. Contains "SqM" as a unit AND at least one additional scraped-field marker.
  //    Requiring two signals prevents flagging a title that merely mentions size.
  if (/\bsqm\b/i.test(t) && /\b(for sale|located at|bedrooms? located)\b/i.test(t)) return true;

  // 4. "for sale … located at …" boilerplate (no SqM required — pattern alone is diagnostic)
  //    e.g. "Property for sale located at Santa Maria, SAL, SAL"
  if (/\bfor sale\b.{0,40}\blocated at\b/i.test(t)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// normalizeListingDisplayTitle — title-case normalizer for raw scraped titles
// ---------------------------------------------------------------------------

const WORD_BOUNDARY = /(^|[\s\-/])(\S)/g;
const SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "by",
  "for",
  "in",
  "of",
  "on",
  "to",
  "with",
  "from",
  "at",
]);

function hasLowercaseLetter(value) {
  return /[a-zà-öø-ÿ]/.test(value);
}

function countLetters(value) {
  return Array.from(value).filter((char) => /\p{L}/u.test(char));
}

export function isAllCapsStyleTitle(value) {
  if (typeof value !== "string") return false;

  const letters = countLetters(value);
  if (letters.length < 2) return false;
  if (hasLowercaseLetter(value)) return false;

  const uppercaseLetters = letters.filter((char) => char === char.toLocaleUpperCase());
  return uppercaseLetters.length / letters.length >= 0.8;
}

export function normalizeListingDisplayTitle(value, fallback = "Property") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  if (!isAllCapsStyleTitle(trimmed)) return trimmed;

  const titleCase = trimmed
    .toLocaleLowerCase()
    .replace(WORD_BOUNDARY, (_match, prefix, char) => `${prefix}${char.toLocaleUpperCase()}`);

  const words = titleCase.split(" ");
  return words
    .map((word, index) => {
      if (index === 0 || index === words.length - 1) return word;
      return SMALL_WORDS.has(word.toLocaleLowerCase()) ? word.toLocaleLowerCase() : word;
    })
    .join(" ");
}
