import * as cheerio from "cheerio";
import { DetailPlugin, DetailExtractResult } from "../types";
import { DetailConfig, PriceFormatConfig } from "../../configLoader";
import { dedupeImageUrls } from "../../fetcher/parse/images";
const parseSrcsetModule = require("parse-srcset");
const parseSrcset = parseSrcsetModule.default || parseSrcsetModule;

/**
 * Generic Config-Driven Detail Plugin
 *
 * Instead of hardcoded per-source logic, this plugin uses the `detail`
 * config from sources.yml to extract data from any detail page.
 *
 * Works with ANY source — no per-source code needed.
 */

// UI text patterns to filter from descriptions
const UI_TEXT_PATTERNS = [
  /add\s*to\s*favou?rites?/gi,
  /favou?rites?/gi,
  /share/gi,
  /print/gi,
  /contact\s*(us|agent)?/gi,
  /call\s*(us|now)?/gi,
  /email\s*(us)?/gi,
  /whatsapp/gi,
  /similar\s*properties/gi,
  /related\s*properties/gi,
  /\bback\b/gi,
  /show\s*(all|more|less)\s*description/gi,
  /read\s*more/gi,
  /read\s*less/gi,
  /view\s*(all|more|details)/gi,
  /enquire\s*now/gi,
  /request\s*info/gi,
  /schedule\s*(a\s*)?viewing/gi,
  /book\s*(a\s*)?viewing/gi,
  /get\s*in\s*touch/gi,
  /send\s*message/gi,
  /send\s*enquiry/gi,
];

// Image URL patterns to filter out
const INVALID_IMAGE_PATTERNS = [
  /pinterest\.com\/pin\/create\/button/i,
  /\/share(?:\/|$)/i,
  /logo/i,
  /icon/i,
  /sprite/i,
  /placeholder/i,
  /default/i,
  /avatar/i,
  /loading/i,
  /spinner/i,
  /blank\./i,
  /1x1\./i,
  /\bpixel\.(?:gif|png|jpe?g|webp)(?:[?#]|$)/i,
  /spacer/i,
  /emoji/i,
  /smiley/i,
  /wp-includes/i,
  /\/Group-18-Copy\.(?:png|jpe?g|webp)$/i,
];

// Element class/alt patterns identifying site chrome (header/footer/branding).
// Catches logos whose URL is a CDN-served UUID with no "logo" substring.
const CHROME_ELEMENT_PATTERNS = [
  /\b(?:header|footer|nav|brand)[_-]/i,
  /\blogo\b/i,
  /\bicon\b/i,
  /favicon/i,
  /\bsymbol\b/i,
  /\bwatermark\b/i,
];

// Filename-level logo patterns checked against image src URLs (basename).
// Real estate property photos are rarely named with these markers.
const CHROME_FILENAME_PATTERNS = [
  /-(?:symbol|logo|brand|watermark|favicon)\b/i,  // "Gamma-symbol.png", "site-logo.svg"
  /\b(?:symbol|logo|brand|watermark|favicon)-/i,  // "logo-horizontal.png"
  /\b(?:site|company|brand)[-_]?logo\b/i,
];

function isChromeElement(
  classAttr: string | undefined,
  altAttr: string | undefined,
  srcAttr?: string | undefined,
): boolean {
  for (const p of CHROME_ELEMENT_PATTERNS) {
    if (classAttr && p.test(classAttr)) return true;
    if (altAttr && p.test(altAttr)) return true;
  }
  if (srcAttr) {
    // Test against the full URL — filename-style markers and full-URL markers
    // both live in src. The basename match still catches files like
    // "ocean-property-silver-horizontal.jpg" via the broader src match below.
    for (const p of CHROME_FILENAME_PATTERNS) {
      if (p.test(srcAttr)) return true;
    }
  }
  return false;
}

// Size patterns in URLs that indicate small images (true thumbnails, <200px)
// Width/w bounded to 1-199; -NxN and /NxN/ unchanged because dimension pairs ≥1000px
// are routinely written as `1200x800` which already escapes \d{2,3}.
const SMALL_IMAGE_PATTERNS = [
  /-\d{2,3}x\d{2,3}\./i,
  /\/\d{2,3}x\d{2,3}\//i,
  /[?&]size=\d{1,3}(?!\d)/i,
  /[?&]width=(?:[1-9]\d?|1\d{2})(?!\d)/i,
  /[?&]w=(?:[1-9]\d?|1\d{2})(?!\d)/i,
];

// Negation words for amenity detection
const NEGATION_WORDS = ["no", "not", "without", "sem", "não", "nao"];

function extractCurrencyBoundPriceText(text: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(
    /(?:€\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*€|\$\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*\$|£\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?|\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*£)/
  );
  return match?.[0]?.trim();
}

/**
 * Generic price parser — handles all common formats:
 *   "€ 38 000,00"  → 38000 (space thousands, comma decimal)
 *   "€130.000"     → 130000 (dot thousands)
 *   "$250,000"     → 250000 (comma thousands)
 *   "150000"       → 150000 (plain integer)
 * Skips "Call for price", "POA", "negotiated" etc.
 */
function parseGenericPrice(priceText: string): number | undefined {
  if (!priceText) return undefined;
  const candidateText = extractCurrencyBoundPriceText(priceText) || priceText;
  const lower = candidateText.toLowerCase();
  if (lower.includes("call") || lower.includes("poa") || lower.includes("negotiat") ||
      lower.includes("request") || lower.includes("contact") || lower.includes("price on")) {
    return undefined;
  }

  // Remove currency symbols
  let cleaned = candidateText.replace(/[€$£R]/g, "").trim();

  // Detect format by analyzing separators
  // Space-separated thousands: "38 000,00" or "38 000"
  if (/\d\s\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(/[\s\u00A0]/g, ""); // Remove all spaces
  }

  // Now handle remaining separators
  // If we have both . and , → determine which is thousands vs decimal
  if (cleaned.includes(".") && cleaned.includes(",")) {
    // Last separator is decimal: "1.234,56" → dot=thousands, comma=decimal
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      // "1.234,56" → European: dot=thousands, comma=decimal
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // "1,234.56" → US: comma=thousands, dot=decimal
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // Only comma: "38000,00" or "38,000"
    const afterComma = cleaned.split(",").pop() || "";
    if (afterComma.length <= 2) {
      // "38000,00" → comma is decimal separator
      cleaned = cleaned.replace(",", ".");
    } else {
      // "38,000" → comma is thousands separator
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(".")) {
    // Only dot: "130.000" or "38000.50"
    const afterDot = cleaned.split(".").pop() || "";
    if (afterDot.length === 3 && /^\d{1,3}\.\d{3}(\.\d{3})*$/.test(cleaned)) {
      // "130.000" → dot is thousands separator
      cleaned = cleaned.replace(/\./g, "");
    }
    // else "38000.50" → dot is decimal, leave as-is
  }

  // Strip any remaining non-numeric chars except dot
  cleaned = cleaned.replace(/[^\d.]/g, "");

  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return undefined;

  // Return integer (property prices are whole numbers)
  return Math.round(num);
}

function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  url = url.trim();
  if (url.startsWith("data:")) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    } catch { return ""; }
  }
  try { return new URL(url, baseUrl).href; }
  catch { return ""; }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  for (const p of INVALID_IMAGE_PATTERNS) { if (p.test(url)) return false; }
  for (const p of SMALL_IMAGE_PATTERNS) { if (p.test(url)) return false; }
  return true;
}

function extractSrcsetUrls(srcset: string): string[] {
  if (!srcset) return [];
  try {
    return parseSrcset(srcset)
      .map((entry: { url?: string }) => entry.url)
      .filter((url: unknown): url is string => typeof url === "string" && url.length > 0);
  } catch {
    return [];
  }
}

type JsonLdObject = Record<string, any>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function findRealEstateJsonLd(value: unknown): JsonLdObject | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as JsonLdObject;
  const types = asArray(obj["@type"]).map(String);
  const isRealEstate = types.some((type) =>
    ["Apartment", "House", "SingleFamilyResidence", "Residence", "Accommodation"].includes(type)
  );
  if (isRealEstate && (obj.offers || obj.floorSize || obj.numberOfBedrooms || obj.image)) {
    return obj;
  }

  for (const child of Object.values(obj)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findRealEstateJsonLd(item);
        if (found) return found;
      }
    } else {
      const found = findRealEstateJsonLd(child);
      if (found) return found;
    }
  }
  return undefined;
}

function extractRealEstateJsonLd($: cheerio.CheerioAPI): JsonLdObject | undefined {
  let found: JsonLdObject | undefined;
  $("script[type='application/ld+json'], script[type=\"application/ld+json\"]").each((_, el) => {
    if (found) return;
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      found = findRealEstateJsonLd(JSON.parse(raw));
    } catch {
      // Ignore malformed JSON-LD blocks; sites often include unrelated plugin data.
    }
  });
  return found;
}

function parseJsonLdInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\b(\d{1,6}(?:[.,]\d+)?)\b/);
  if (!match) return null;
  const parsed = parseFloat(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

const COUNT_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseCountToken(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (/^\d+$/.test(normalized)) return parseInt(normalized, 10);
  return COUNT_WORDS[normalized] ?? null;
}

function parseJsonLdFloorSizeSqm(floorSize: unknown): number | null {
  const floor = Array.isArray(floorSize) ? floorSize[0] : floorSize;
  if (floor == null) return null;

  let rawValue: unknown;
  let unitText = "";
  if (typeof floor === "object") {
    const obj = floor as JsonLdObject;
    rawValue = obj.value ?? obj.amount;
    unitText = String(obj.unitText ?? obj.unitCode ?? "").toLowerCase();
  } else {
    rawValue = floor;
  }

  const value = typeof rawValue === "number"
    ? rawValue
    : typeof rawValue === "string"
      ? parseFloat(rawValue.replace(",", "."))
      : NaN;
  if (!Number.isFinite(value) || value <= 0) return null;

  if (/(sq\s*ft|sqft|ft2|ft²|square\s*feet|square\s*foot)/i.test(unitText)) {
    return Math.round(value * 0.09290304);
  }
  return Math.round(value);
}

function firstJsonLdOffer(jsonLd: JsonLdObject | undefined): JsonLdObject | undefined {
  const offer = asArray(jsonLd?.offers)[0];
  return offer && typeof offer === "object" ? offer as JsonLdObject : undefined;
}

// Below this, an "area" value is implausible for a real property/unit and is
// almost always a mis-parsed code or stray digit (e.g. "En-bv-01" → 1).
const MIN_PLAUSIBLE_AREA_SQM = 5;

function parseAreaTextSqm(text: string): number | null {
  if (!text) return null;

  // A range or a multi-parcel value is not one exact property area.
  if (
    /\d[\d\s.,]*\s*(?:-|–|—|to)\s*\d[\d\s.,]*\s*(?:m[²2]|sqm)/i.test(text) ||
    /\b(?:up\s+to|to)\s+\d[\d\s.,]*\s*(?:m[²2]|sqm)/i.test(text) ||
    /\d[\d\s.,]*\s*(?:m[²2]|sqm)?\s+and\s+\d[\d\s.,]*\s*(?:m[²2]|sqm)/i.test(text)
  ) {
    return null;
  }

  const numberPattern = String.raw`(\d{1,3}(?:[\s\u00a0]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)`;
  const unitBoundMatch = text.match(
    new RegExp(
      `${numberPattern}\\s*(?:m[²2]|sqm|sq\\.?\\s*m|sq\\.?\\s*ft|sqft|ft[²2]|square\\s*(?:met(?:er|re)s?|feet|foot))`,
      "i",
    ),
  );
  // Unitless fallback: accept a standalone number, but never digits glued into
  // an alphanumeric code like "En-bv-01" (a unit/neighborhood identifier whose
  // trailing digits would otherwise become a bogus 1 m² area).
  const standaloneMatch = text.match(new RegExp(String.raw`(?<![\w-])` + numberPattern + String.raw`(?![\w-])`));
  const match = unitBoundMatch || standaloneMatch;
  if (!match) return null;

  let numeric = match[1].replace(/[\s\u00a0]/g, "");
  if (numeric.includes(",") && numeric.includes(".")) {
    numeric = numeric.lastIndexOf(",") > numeric.lastIndexOf(".")
      ? numeric.replace(/\./g, "").replace(",", ".")
      : numeric.replace(/,/g, "");
  } else if (numeric.includes(",")) {
    const parts = numeric.split(",");
    numeric = parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
      ? parts.join("")
      : numeric.replace(",", ".");
  }

  const value = parseFloat(numeric);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (/(sq\s*ft|sqft|ft2|ft²|square\s*feet|square\s*foot)/i.test(text)) {
    const sqm = Math.round(value * 0.09290304);
    return sqm < MIN_PLAUSIBLE_AREA_SQM ? null : sqm;
  }
  // Sanity floor: a sub-5 m² "area" is never a real property/unit area and is a
  // tell-tale of a mis-parsed code or stray digit.
  const rounded = Math.round(value);
  return rounded < MIN_PLAUSIBLE_AREA_SQM ? null : rounded;
}

function normalizePropertyType(value: string): string | null {
  const normalized = value.toLowerCase().trim();
  if (/\b(apartment|flat|apartamento|appartement)\b/.test(normalized)) return "apartment";
  if (/\b(villa|vila|moradia)\b/.test(normalized)) return "villa";
  if (/\b(house|home|casa|maison)\b/.test(normalized)) return "house";
  if (/\b(penthouse|cobertura|ático|attique)\b/.test(normalized)) return "penthouse";
  if (/\b(studio|estúdio|estudio)\b/.test(normalized)) return "studio";
  if (/\b(land|plot|lot|terreno|lote|parcela|terrain)\b/.test(normalized)) return "land";
  if (/\b(commercial|office|shop|comercial|escritório|loja)\b/.test(normalized)) return "commercial";
  return null;
}

function cleanDescription(text: string): string {
  let cleaned = text;
  for (const pattern of UI_TEXT_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  const lines = cleaned.split(/[\n\r]+/);
  const seenLines = new Set<string>();
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (!trimmed || trimmed.length < 3) continue;
    const normalized = trimmed.toLowerCase();
    if (seenLines.has(normalized)) continue;
    seenLines.add(normalized);
    uniqueLines.push(trimmed);
  }
  return uniqueLines.join(" ").replace(/\s+/g, " ").trim();
}

function hasNegationBefore(text: string, keywordIndex: number, windowWords: number = 5): boolean {
  const before = text.slice(0, keywordIndex).toLowerCase();
  const words = before.split(/\s+/).filter(w => w.length > 0);
  const windowStart = Math.max(0, words.length - windowWords);
  for (const word of words.slice(windowStart)) {
    const cleanWord = word.replace(/[.,;:!?()]/g, "");
    if (NEGATION_WORDS.includes(cleanWord)) return true;
  }
  return false;
}

/**
 * Parse price using explicit source config (thousands/decimal separators).
 * More reliable than heuristic parsing when config is available.
 */
function parseConfiguredPrice(priceText: string, config: PriceFormatConfig): number | undefined {
  if (!priceText) return undefined;
  const candidateText = extractCurrencyBoundPriceText(priceText) || priceText;
  const lower = candidateText.toLowerCase();
  if (lower.includes("call") || lower.includes("poa") || lower.includes("negotiat") ||
      lower.includes("request") || lower.includes("contact") || lower.includes("price on")) {
    return undefined;
  }

  const currencySymbol = config.currency_symbol || "€";
  let cleaned = candidateText.replace(new RegExp(currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "").trim();

  const thousandsSep = config.thousands_separator || ".";
  const decimalSep = config.decimal_separator || ",";

  // Remove thousands separator
  if (thousandsSep === ".") {
    if (/^\d{1,3}\.\d{3}(\.\d{3})*/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  } else if (thousandsSep === ",") {
    cleaned = cleaned.replace(/,/g, "");
  } else if (thousandsSep === " ") {
    cleaned = cleaned.replace(/[\s\u00A0]/g, "");
  }

  // Remove decimal portion
  if (decimalSep === ",") {
    cleaned = cleaned.replace(/,\d{1,2}$/, "");
  } else if (decimalSep === ".") {
    cleaned = cleaned.replace(/\.\d{1,2}$/, "");
  }

  cleaned = cleaned.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0) return undefined;
  return num * (config.multiplier || 1);
}

/**
 * Create a generic detail plugin for a source using YAML config.
 * Optionally accepts price_format from source config for precise price parsing.
 */
export function createGenericDetailPlugin(
  sourceId: string,
  detailConfig: DetailConfig,
  priceFormat?: PriceFormatConfig
): DetailPlugin {
  return {
    sourceId,

    extract(html: string, baseUrl: string): DetailExtractResult {
      const $ = cheerio.load(html);
      const jsonLd = extractRealEstateJsonLd($);
      const imageUrls: string[] = [];
      const seenImages = new Set<string>();
      const amenities = new Set<string>();

      function addImage(url: string) {
        const absUrl = makeAbsoluteUrl(url, baseUrl);
        if (absUrl && isValidImageUrl(absUrl) && !seenImages.has(absUrl)) {
          seenImages.add(absUrl);
          imageUrls.push(absUrl);
        }
      }

      // ========================================
      // A) Extract description using config selectors
      // ========================================
      let description: string | undefined;

      if (detailConfig.selectors?.description) {
        const descSelector = detailConfig.selectors.description;
        const $desc = $(descSelector);
        if ($desc.length) {
          const texts: string[] = [];
          $desc.each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > 20) texts.push(text);
          });
          if (texts.length > 0) {
            description = cleanDescription(texts.join(" "));
          }
        }
      }

      // ========================================
      // A2) Extract location using config selector
      // ========================================
      let location: string | undefined;

      if (detailConfig.selectors?.location) {
        const locSelector = detailConfig.selectors.location;
        const $loc = $(locSelector);
        if ($loc.length) {
          const rawLoc = $loc.first().text().trim();
          if (rawLoc.length > 2) {
            location = rawLoc;
          }
        }
      }

      // Fallback: generic description extraction
      if (!description || description.length < 50) {
        const descSelectors = [
          ".property-description",
          "[class*='description']",
          ".property-content p",
          ".listing-content p",
          ".elementor-widget-text-editor p",
        ];
        for (const selector of descSelectors) {
          const $desc = $(selector).first();
          if ($desc.length) {
            const text = $desc.text().trim();
            if (text.length > 50) {
              description = cleanDescription(text);
              break;
            }
          }
        }
      }

      // Final fallback: concatenate substantial paragraphs
      if (!description || description.length < 50) {
        const paragraphs: string[] = [];
        $("p").each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 30 && text.length < 2000) {
            const lowerText = text.toLowerCase();
            const isUIText = UI_TEXT_PATTERNS.some(p => p.test(lowerText));
            if (!isUIText) paragraphs.push(text);
          }
        });
        if (paragraphs.length > 0) {
          description = cleanDescription(paragraphs.join(" "));
        }
      }

      // ========================================
      // B) Extract images using config selectors
      // ========================================
      if (detailConfig.selectors?.images) {
        const imgSelector = detailConfig.selectors.images;
        $(imgSelector).each((_, el) => {
          const tagName = (el as any).tagName?.toLowerCase();
          if (tagName === "img") {
            const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy");
            if (isChromeElement($(el).attr("class"), $(el).attr("alt"), src)) return;
            if (src) addImage(src);
            const srcset = $(el).attr("srcset") || $(el).attr("data-srcset");
            if (srcset) {
              for (const url of extractSrcsetUrls(srcset)) addImage(url);
            }
          } else if (tagName === "a") {
            const href = $(el).attr("href");
            if (href && isChromeElement(undefined, undefined, href)) return;
            if (href) addImage(href);
          } else {
            // Maybe a div with background-image
            const style = $(el).attr("style") || "";
            const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
            const bgUrl = bgMatch?.[1];
            if (isChromeElement($(el).attr("class"), $(el).attr("aria-label"), bgUrl)) return;
            if (bgUrl) addImage(bgUrl);
            // Check for img children
            $(el).find("img").each((_, img) => {
              const childSrc = $(img).attr("src") || $(img).attr("data-src");
              if (isChromeElement($(img).attr("class"), $(img).attr("alt"), childSrc)) return;
              if (childSrc) addImage(childSrc);
            });
          }
        });
      }

      // Fallback: generic image extraction
      if (imageUrls.length < 3 && detailConfig.image_fallback !== false) {
        // Try lightbox links
        $("a[href*='.jpg'], a[href*='.jpeg'], a[href*='.png'], a[href*='.webp']").each((_, el) => {
          const href = $(el).attr("href");
          if (href && isChromeElement(undefined, undefined, href)) return;
          if (href) addImage(href);
        });

        // Try slideshow/carousel images
        $(".swiper-slide img, .slick-slide img, .gallery img, .carousel img").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (isChromeElement($(el).attr("class"), $(el).attr("alt"), src)) return;
          if (src) addImage(src);
        });

        // Try all images with uploads path (WordPress)
        $("img[src*='uploads'], img[data-src*='uploads']").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (isChromeElement($(el).attr("class"), $(el).attr("alt"), src)) return;
          if (src) addImage(src);
        });
      }

      // Final fallback: all reasonably-sized images
      if (imageUrls.length < 3 && detailConfig.image_fallback !== false) {
        $("img").each((_, el) => {
          const $img = $(el);
          const src = $img.attr("src") || $img.attr("data-src");
          if (isChromeElement($img.attr("class"), $img.attr("alt"), src)) return;
          const width = parseInt($img.attr("width") || "0", 10);
          const height = parseInt($img.attr("height") || "0", 10);
          if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;
          if (src) addImage(src);
        });
      }

      for (const image of asArray(jsonLd?.image)) {
        if (typeof image === "string") {
          addImage(image);
        } else if (image && typeof image === "object") {
          const imageObj = image as JsonLdObject;
          const url = imageObj.url ?? imageObj.contentUrl;
          if (typeof url === "string") addImage(url);
        }
      }

      // ========================================
      // C) Extract specs using config patterns
      // ========================================
      let bedrooms: number | null = null;
      let bathrooms: number | null = null;
      let parkingSpaces: number | null = null;
      let areaSqm: number | null = null;
      let propertyType: string | null = null;
      let structuredAreaFound = false;

      // Scope spec_patterns text to avoid regex pollution from Similar Listings,
      // navigation, sidebar, etc. Priority: explicit specs_selector → description →
      // body (fallback). Without scoping, regexes like `(\d+)\s*Bedrooms?` match
      // any digit-bedroom pair anywhere on the page (op24 studio bug: bedrooms=9
      // bled in from "Similar Listings" / "%20Bedje" URL fragments).
      let bodyText: string;
      if (detailConfig.specs_selector) {
        const $specs = $(detailConfig.specs_selector);
        bodyText = $specs.length ? $specs.text() : "";
      } else if (description && description.length >= 50) {
        bodyText = description;
      } else {
        bodyText = $("body").text();
      }

      if (detailConfig.selectors?.bedrooms) {
        const text = $(detailConfig.selectors.bedrooms).first().text().trim();
        const match = text.match(/\b(\d{1,2})\b/);
        if (match) bedrooms = parseInt(match[1], 10);
      }
      if (detailConfig.selectors?.bathrooms) {
        const text = $(detailConfig.selectors.bathrooms).first().text().trim();
        const match = text.match(/\b(\d{1,2})\b/);
        if (match) bathrooms = parseInt(match[1], 10);
      }
      if (detailConfig.selectors?.area) {
        const text = $(detailConfig.selectors.area).first().text().trim();
        structuredAreaFound = text.length > 0;
        const parsed = parseAreaTextSqm(text);
        if (parsed !== null) areaSqm = parsed;
      }

      // C0) spec_table — structured label/value pairs (Elementor pre-data, dl/dt/dd, Houzez meta).
      // Runs BEFORE regex spec_patterns; structured pairs are more reliable than prose.
      let specTablePrice: string | undefined;
      if (detailConfig.spec_table) {
        const st = detailConfig.spec_table;
        const matchLabel = (raw: string): keyof typeof st.label_map | undefined => {
          const lower = raw.toLowerCase().replace(/:$/, "").trim();
          for (const [field, aliases] of Object.entries(st.label_map)) {
            for (const alias of aliases) {
              if (lower === alias.toLowerCase()) {
                return field as keyof typeof st.label_map;
              }
            }
          }
          const genericAliases = new Set(["area", "size", "price", "bed", "bath"]);
          for (const [field, aliases] of Object.entries(st.label_map)) {
            for (const alias of aliases) {
              const normalizedAlias = alias.toLowerCase();
              if (!genericAliases.has(normalizedAlias) && lower.includes(normalizedAlias)) {
                return field as keyof typeof st.label_map;
              }
            }
          }
          return undefined;
        };
        const resolveValue = ($label: cheerio.Cheerio<any>, labelText: string): string => {
          if (st.value_selector) {
            const sel = st.value_selector.trim();
            if (sel.startsWith("+")) {
              return $label.next(sel.slice(1).trim()).first().text().trim();
            }
            if (sel.startsWith("~")) {
              return $label.nextAll(sel.slice(1).trim()).first().text().trim();
            }
            const $val = $label.parent().find(sel).first();
            if ($val.length) return $val.text().trim();
          }
          const previousSiblingText = $label.prev().text().trim();
          if (previousSiblingText) {
            const followingSiblingText = $label.nextAll().text().trim();
            return followingSiblingText ? `${previousSiblingText} ${followingSiblingText}` : previousSiblingText;
          }
          const $row = $label.closest("li, tr, p, div");
          const full = $row.text().trim();
          return full.replace(labelText, "").trim();
        };
        $(st.container).each((_, container) => {
          $(container).find(st.label_selector).each((_, labelEl) => {
            const $label = $(labelEl);
            const rawLabel = $label.text().trim();
            if (!rawLabel) return;
            const field = matchLabel(rawLabel);
            if (!field) return;
            const value = resolveValue($label, rawLabel);
            if (!value || value === "-") return;
            const intMatch = value.match(/\b(\d{1,3})\b/);
            const intVal = intMatch ? parseInt(intMatch[1], 10) : null;
            if (field === "bedrooms" && bedrooms === null && intVal !== null && intVal > 0 && intVal < 20) {
              bedrooms = intVal;
            } else if (field === "bathrooms" && bathrooms === null && intVal !== null && intVal > 0 && intVal < 20) {
              bathrooms = intVal;
            } else if (field === "parking" && parkingSpaces === null && intVal !== null && intVal >= 0 && intVal < 20) {
              parkingSpaces = intVal;
            } else if (field === "area" && areaSqm === null) {
              structuredAreaFound = true;
              const n = parseAreaTextSqm(value);
              if (n !== null) areaSqm = n;
            } else if (field === "price" && !specTablePrice) {
              specTablePrice = value;
            } else if (field === "property_type" && propertyType === null) {
              propertyType = normalizePropertyType(value);
            }
          });
        });
      }

      if (detailConfig.spec_patterns) {
        // Structured selector values are more trustworthy than prose when both exist.
        if (bedrooms === null && detailConfig.spec_patterns.bedrooms) {
          for (const patternStr of detailConfig.spec_patterns.bedrooms) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseCountToken(match[1]);
              if (num !== null && num > 0 && num < 20) { bedrooms = num; break; }
            }
          }
        }

        if (bathrooms === null && detailConfig.spec_patterns.bathrooms) {
          for (const patternStr of detailConfig.spec_patterns.bathrooms) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseCountToken(match[1]);
              if (num !== null && num > 0 && num < 20) { bathrooms = num; break; }
            }
          }
        }

        // Parking
        if (detailConfig.spec_patterns.parking) {
          for (const patternStr of detailConfig.spec_patterns.parking) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num >= 0 && num < 20) { parkingSpaces = num; break; }
            }
          }
        }

        // Area
        if (areaSqm === null && !structuredAreaFound && detailConfig.spec_patterns.area) {
          for (const patternStr of detailConfig.spec_patterns.area) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseAreaTextSqm(match[0]);
              if (num !== null) { areaSqm = num; break; }
            }
          }
        }
      }

      if (bathrooms === null && bedrooms !== null) {
        const everyBedroomEnsuite =
          /\beach bedroom has (?:an?\s+)?(?:own\s+)?(?:en[- ]?suite|ensuite) bathroom\b/i.test(bodyText) ||
          /\bboth bedrooms\b[^.!?]{0,180}\beach\b[^.!?]{0,80}\b(?:en[- ]?suite|ensuite) bathroom\b/i.test(bodyText);
        if (everyBedroomEnsuite) {
          bathrooms = bedrooms;
        } else if (
          /\bmaster bedroom\b[^.!?]{0,100}\bown bathroom\b[^.!?]{0,160}\bother two bedrooms share a bathroom\b/i.test(bodyText)
        ) {
          bathrooms = 2;
        }
      }

      // JSON-LD floorSize is a fallback only. A structured on-page value (e.g.
      // a Houzez "87.41 m²" overview row) must win, because some themes emit
      // the square-meter figure in JSON-LD while mislabeling the unit as SQFT,
      // which would otherwise be wrongly divided to ~1/10.76 of the real area.
      if (areaSqm === null && !structuredAreaFound) {
        const jsonLdAreaSqm = parseJsonLdFloorSizeSqm(jsonLd?.floorSize);
        if (jsonLdAreaSqm !== null) {
          areaSqm = jsonLdAreaSqm;
        }
      }
      if (bedrooms === null) {
        const jsonLdBedrooms = parseJsonLdInteger(jsonLd?.numberOfBedrooms);
        if (jsonLdBedrooms !== null && jsonLdBedrooms > 0 && jsonLdBedrooms < 20) {
          bedrooms = jsonLdBedrooms;
        }
      }
      if (bathrooms === null) {
        const jsonLdBathrooms = parseJsonLdInteger(jsonLd?.numberOfBathroomsTotal ?? jsonLd?.numberOfBathrooms);
        if (jsonLdBathrooms !== null && jsonLdBathrooms > 0 && jsonLdBathrooms < 20) {
          bathrooms = jsonLdBathrooms;
        }
      }

      // ========================================
      // D) Extract amenities from config keywords
      // ========================================
      if (detailConfig.amenity_keywords && description) {
        const lowerDesc = description.toLowerCase();
        for (const [amenityKey, keywords] of Object.entries(detailConfig.amenity_keywords)) {
          for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+").replace(/\//g, "\\/")}\\b`, "gi");
            let match;
            while ((match = regex.exec(lowerDesc)) !== null) {
              if (!hasNegationBefore(lowerDesc, match.index, 5)) {
                amenities.add(amenityKey);
                break;
              }
            }
          }
        }
      }

      // ========================================
      // E) Extract title from h1
      // ========================================
      let title: string | undefined;
      const h1 = $("h1").first().text().trim();
      if (h1 && h1.length > 5) title = h1;
      if (!title && typeof jsonLd?.name === "string" && jsonLd.name.trim().length > 5) {
        title = jsonLd.name.trim();
      }

      // ========================================
      // F) Extract price (config selector first, then regex fallback)
      // ========================================
      let price: number | undefined;

      // F.0) Price found via spec_table label/value pair (if configured)
      if (specTablePrice) {
        price = priceFormat
          ? parseConfiguredPrice(specTablePrice, priceFormat)
          : parseGenericPrice(specTablePrice);
      }

      // F.1) Try config price selector first
      if (!price && detailConfig.selectors?.price) {
        const priceEl = $(detailConfig.selectors.price).first();
        if (priceEl.length) {
          const priceText = priceEl.text().trim();
          // Use source price_format if available for precise parsing, otherwise heuristic
          price = priceFormat
            ? parseConfiguredPrice(priceText, priceFormat)
            : parseGenericPrice(priceText);
        }
      }

      // F.2) Regex fallback on body text (strict: must be near € symbol, reasonable range)
      // SKIP regex fallback if a price selector was configured and found in DOM —
      // this means the page has a dedicated price element that returned "Call for price" / POA,
      // and the regex would incorrectly pick up prices from carousels or related listings.
      const selectorFoundButNoParse = detailConfig.selectors?.price && !price &&
        $(detailConfig.selectors.price).length > 0;
      if (!price && !selectorFoundButNoParse) {
        // More restrictive patterns: currency symbol immediately adjacent to digits
        const pricePatterns = [
          /€\s*\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\b/,  // "€ 38 000,00" or "€130.000"
          /\d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})?\s*€/,     // "38 000,00 €"
          /\$\s*\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?\b/,      // "$250,000"
          /£\s*\d{1,3}(?:[.,]\d{3})*(?:\.\d{2})?\b/,       // "£250,000"
        ];
        for (const pattern of pricePatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            const parsed = parseGenericPrice(match[0]);
            // Reasonable property price range: 1,000 to 50,000,000
            if (parsed && parsed >= 1000 && parsed <= 50000000) { price = parsed; break; }
          }
        }
      }
      if (!price) {
        const jsonLdPrice = parseJsonLdInteger(firstJsonLdOffer(jsonLd)?.price);
        if (jsonLdPrice !== null && jsonLdPrice >= 1000 && jsonLdPrice <= 50000000) {
          price = jsonLdPrice;
        }
      }

      return {
        success: true,
        title,
        price,
        description,
        location,
        imageUrls: dedupeImageUrls(imageUrls).slice(0, 20),
        areaSqm,
        bedrooms,
        bathrooms,
        propertyType,
        parkingSpaces,
        amenities: Array.from(amenities),
      };
    },
  };
}
