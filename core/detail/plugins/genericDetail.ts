import * as cheerio from "cheerio";
import { DetailPlugin, DetailExtractResult } from "../types";
import { DetailConfig, PriceFormatConfig } from "../../configLoader";

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
  /pixel\./i,
  /spacer/i,
  /emoji/i,
  /smiley/i,
  /wp-includes/i,
];

// Size patterns in URLs that indicate small images
const SMALL_IMAGE_PATTERNS = [
  /-\d{2,3}x\d{2,3}\./i,
  /\/\d{2,3}x\d{2,3}\//i,
  /size=\d{2,3}/i,
  /width=\d{2,3}(?!\d)/i,
  /w=\d{2,3}(?!\d)/i,
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

function extractLabeledDetailValue(
  $: cheerio.CheerioAPI,
  labels: string[]
): string | undefined {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  const detailSelectors = [
    ".listing_detail",
    ".property_listing_details .listing_detail",
    "#accordion_property_address .listing_detail",
  ];

  for (const selector of detailSelectors) {
    const $rows = $(selector);
    if ($rows.length === 0) continue;

    for (const row of $rows.toArray()) {
      const $row = $(row);
      const labelText = $row.find("strong").first().text().replace(/:\s*$/, "").trim().toLowerCase();
      if (!labelText || !normalizedLabels.includes(labelText)) continue;

      const cloned = $row.clone();
      cloned.find("strong").remove();
      const value = cloned.text().replace(/\s+/g, " ").trim().replace(/^:\s*/, "");
      if (value) {
        return value;
      }
    }
  }

  return undefined;
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
      const rawCity = extractLabeledDetailValue($, ["City"]);
      const rawArea = extractLabeledDetailValue($, ["Area", "Neighborhood", "Neighbourhood"]);
      const rawIsland = extractLabeledDetailValue($, ["State/County", "County/State", "Island", "State"]);

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
            if (src) addImage(src);
            const srcset = $(el).attr("srcset") || $(el).attr("data-srcset");
            if (srcset) {
              for (const part of srcset.split(",")) {
                const url = part.trim().split(/\s+/)[0];
                if (url) addImage(url);
              }
            }
          } else if (tagName === "a") {
            const href = $(el).attr("href");
            if (href) addImage(href);
          } else {
            // Maybe a div with background-image
            const style = $(el).attr("style") || "";
            const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
            if (bgMatch?.[1]) addImage(bgMatch[1]);
            // Check for img children
            $(el).find("img").each((_, img) => {
              const src = $(img).attr("src") || $(img).attr("data-src");
              if (src) addImage(src);
            });
          }
        });
      }

      // Fallback: generic image extraction
      if (imageUrls.length < 3) {
        // Try lightbox links
        $("a[href*='.jpg'], a[href*='.jpeg'], a[href*='.png'], a[href*='.webp']").each((_, el) => {
          const href = $(el).attr("href");
          if (href) addImage(href);
        });

        // Try slideshow/carousel images
        $(".swiper-slide img, .slick-slide img, .gallery img, .carousel img").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (src) addImage(src);
        });

        // Try all images with uploads path (WordPress)
        $("img[src*='uploads'], img[data-src*='uploads']").each((_, el) => {
          const src = $(el).attr("src") || $(el).attr("data-src");
          if (src) addImage(src);
        });
      }

      // Final fallback: all reasonably-sized images
      if (imageUrls.length < 3) {
        $("img").each((_, el) => {
          const $img = $(el);
          const src = $img.attr("src") || $img.attr("data-src");
          const width = parseInt($img.attr("width") || "0", 10);
          const height = parseInt($img.attr("height") || "0", 10);
          if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;
          if (src) addImage(src);
        });
      }

      // ========================================
      // C) Extract specs using config patterns
      // ========================================
      let bedrooms: number | null = null;
      let bathrooms: number | null = null;
      let parkingSpaces: number | null = null;
      let areaSqm: number | null = null;

      const bodyText = $("body").text();

      if (detailConfig.spec_patterns) {
        // Bedrooms
        if (detailConfig.spec_patterns.bedrooms) {
          for (const patternStr of detailConfig.spec_patterns.bedrooms) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > 0 && num < 20) { bedrooms = num; break; }
            }
          }
        }

        // Bathrooms
        if (detailConfig.spec_patterns.bathrooms) {
          for (const patternStr of detailConfig.spec_patterns.bathrooms) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > 0 && num < 20) { bathrooms = num; break; }
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
        if (detailConfig.spec_patterns.area) {
          for (const patternStr of detailConfig.spec_patterns.area) {
            const regex = new RegExp(patternStr, "i");
            const match = bodyText.match(regex);
            if (match?.[1]) {
              const num = parseFloat(match[1].replace(",", "."));
              if (!isNaN(num) && num > 0) { areaSqm = num; break; }
            }
          }
        }
      }

      // Fallback: bedrooms/bathrooms from selectors
      if (bedrooms === null && detailConfig.selectors?.bedrooms) {
        const text = $(detailConfig.selectors.bedrooms).first().text().trim();
        const match = text.match(/\b(\d{1,2})\b/);
        if (match) bedrooms = parseInt(match[1], 10);
      }
      if (bathrooms === null && detailConfig.selectors?.bathrooms) {
        const text = $(detailConfig.selectors.bathrooms).first().text().trim();
        const match = text.match(/\b(\d{1,2})\b/);
        if (match) bathrooms = parseInt(match[1], 10);
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

      // ========================================
      // F) Extract price (config selector first, then regex fallback)
      // ========================================
      let price: number | undefined;

      // F.1) Try config price selector first
      if (detailConfig.selectors?.price) {
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

      return {
        success: true,
        title,
        price,
        description,
        location,
        rawCity,
        rawArea,
        rawIsland,
        imageUrls: imageUrls.slice(0, 20),
        bedrooms,
        bathrooms,
        parkingSpaces,
        terraceArea: areaSqm, // mapped to terraceArea for interface compat
        amenities: Array.from(amenities),
      };
    },
  };
}
