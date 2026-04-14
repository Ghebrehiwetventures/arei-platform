/**
 * Generic Detail Extractor - Config-Driven
 *
 * PoC Goal: ZERO source-specific plugins. All detail extraction
 * driven by YAML config with CMS preset fallbacks.
 */

import * as cheerio from "cheerio";
import sanitize from "sanitize-html";
import { DetailConfig, SelectorsConfig } from "./configLoader";
import { CMSType, CMS_PRESETS, detectCMS, getImageAttrs } from "./cmsPresets";
import { dedupeImageUrls } from "./genericFetcher";

// Strict HTML sanitization: only structural tags allowed
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: ["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "a", "br"],
  allowedAttributes: {
    a: ["href"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  disallowedTagsMode: "discard",
};

// ============================================
// DETAIL EXTRACTION CONFIG (from sources.yml)
// ============================================

export interface DetailExtractionConfig {
  /** Enable detail extraction for this source */
  enabled: boolean;
  /** Policy: always, on_violation, never */
  policy: "always" | "on_violation" | "never";
  /** CMS type for preset fallbacks (auto-detected if not specified) */
  cms_type?: CMSType;
  /** Selectors for detail page extraction */
  selectors: {
    description?: string;
    images?: string;
    title?: string;
    price?: string;
    bedrooms?: string;
    bathrooms?: string;
    parking?: string;
    area?: string;
    amenities?: string;
  };
  /** Spec extraction patterns (for structured data like "Bedrooms: 3") */
  spec_patterns?: {
    bedrooms?: string[];
    bathrooms?: string[];
    parking?: string[];
    area?: string[];
  };
  /** Amenity keywords to detect */
  amenity_keywords?: {
    [key: string]: string[]; // e.g., "pool": ["pool", "piscina", "swimming"]
  };
  /** Negation words that cancel amenity detection */
  negation_words?: string[];
  /** Delay between detail fetches (ms) */
  delay_ms: number;
}

// ============================================
// EXTRACTION RESULT
// ============================================

export interface DetailExtractionResult {
  success: boolean;
  error?: string;
  title?: string;
  description?: string;
  description_html?: string;
  price?: number;
  imageUrls?: string[];
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  area?: number;
  terraceArea?: number;
  amenities?: string[];
}

// ============================================
// DEFAULT SPEC PATTERNS (fallback)
// ============================================

const DEFAULT_SPEC_PATTERNS = {
  bedrooms: [
    /(\d+)\s*(?:bed(?:room)?s?|quartos?|chambres?|schlafzimmer)/i,
    /(?:bed(?:room)?s?|quartos?)\s*[:\-]?\s*(\d+)/i,
  ],
  bathrooms: [
    /(\d+)\s*(?:bath(?:room)?s?|banheiros?|salles?\s*de\s*bain|badezimmer)/i,
    /(?:bath(?:room)?s?|banheiros?)\s*[:\-]?\s*(\d+)/i,
  ],
  parking: [
    /(\d+)\s*(?:parking|garage|vagas?|places?\s*de\s*parking)/i,
    /(?:parking|garage)\s*[:\-]?\s*(\d+)/i,
  ],
  area: [
    /(\d+(?:[.,]\d+)?)\s*(?:m²|sqm|square\s*met(?:er|re)s?)/i,
    /(?:area|size|superfície)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:m²|sqm|sq|$)/i,
  ],
};

// ============================================
// DEFAULT AMENITY KEYWORDS
// ============================================

const DEFAULT_AMENITY_KEYWORDS: Record<string, string[]> = {
  pool: ["pool", "piscina", "swimming", "piscine"],
  sea_view: ["sea view", "ocean view", "vista mar", "vue mer", "meerblick"],
  balcony: ["balcony", "varanda", "balcon", "balkon"],
  garden: ["garden", "jardim", "jardin", "garten"],
  air_conditioning: ["air conditioning", "ac", "a/c", "ar condicionado", "climatisation", "klimaanlage"],
  wifi: ["wifi", "wi-fi", "internet", "wireless"],
  elevator: ["elevator", "lift", "elevador", "ascenseur", "aufzug"],
  security: ["security", "segurança", "sécurité", "sicherheit", "24h", "gated"],
  parking: ["parking", "garage", "estacionamento"],
  terrace: ["terrace", "terraço", "terrasse"],
  furnished: ["furnished", "mobilado", "meublé", "möbliert"],
};

const DEFAULT_NEGATION_WORDS = [
  "no", "not", "without", "sem", "sans", "ohne", "ningún", "nenhum",
];

// ============================================
// UTILITY: Extract number from text
// ============================================

function extractNumber(text: string): number | undefined {
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (match) {
    const num = parseFloat(match[1].replace(",", "."));
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

// ============================================
// UTILITY: Check for negation within window
// ============================================

function hasNegationNearby(text: string, keyword: string, negationWords: string[], windowSize = 5): boolean {
  const words = text.toLowerCase().split(/\s+/);
  const keywordLower = keyword.toLowerCase();

  for (let i = 0; i < words.length; i++) {
    if (words[i].includes(keywordLower)) {
      // Check words before
      const start = Math.max(0, i - windowSize);
      const windowBefore = words.slice(start, i).join(" ");
      for (const neg of negationWords) {
        if (windowBefore.includes(neg.toLowerCase())) {
          return true;
        }
      }
    }
  }
  return false;
}

// ============================================
// UTILITY: Make absolute URL
// ============================================

function makeAbsoluteUrl(url: string, baseUrl: string): string {
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

// ============================================
// JSON-LD STRUCTURED DATA EXTRACTION
// ============================================

interface JsonLdSpecs {
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  description?: string;
}

function extractJsonLd($: cheerio.CheerioAPI): JsonLdSpecs {
  const specs: JsonLdSpecs = {};

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const data = JSON.parse(raw);

      // Handle @graph arrays (common in Yoast/WordPress)
      const nodes: any[] = Array.isArray(data)
        ? data
        : data?.["@graph"]
          ? data["@graph"]
          : [data];

      for (const node of nodes) {
        // Match RealEstateListing, SingleFamilyResidence, Apartment, House, Product, etc.
        const type = (node?.["@type"] || "").toLowerCase();
        const isRelevant =
          type.includes("realestate") ||
          type.includes("residence") ||
          type.includes("apartment") ||
          type.includes("house") ||
          type.includes("product") ||
          type.includes("accommodation") ||
          type.includes("lodging");

        if (!isRelevant) continue;

        // Bedrooms
        if (specs.bedrooms === undefined) {
          const bed =
            node.numberOfBedrooms ??
            node.numberOfRooms ??
            node.bedrooms;
          if (typeof bed === "number" && bed > 0) specs.bedrooms = bed;
        }

        // Bathrooms
        if (specs.bathrooms === undefined) {
          const bath =
            node.numberOfBathroomsTotal ??
            node.numberOfBathrooms ??
            node.bathrooms;
          if (typeof bath === "number" && bath > 0) specs.bathrooms = bath;
        }

        // Floor size / area (may be a QuantitativeValue or raw number)
        if (specs.area === undefined) {
          const fs = node.floorSize;
          if (fs) {
            const val = typeof fs === "number" ? fs : (fs?.value ?? null);
            if (typeof val === "number" && val > 0) {
              // Convert from sqft if needed (some themes incorrectly label sqm as SQFT)
              const unit = (fs?.unitText || fs?.unitCode || "").toUpperCase();
              specs.area = unit === "SQFT" || unit === "FTK"
                ? Math.round(val * 0.092903)  // real sqft → sqm
                : val;
              // Many Houzez sites mis-label m² as SQFT — if value < 500, it's likely already sqm
              if ((unit === "SQFT" || unit === "FTK") && val < 500) {
                specs.area = val;  // Trust the raw number; it's likely sqm mislabeled
              }
            }
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip silently
    }
  });

  // Second pass: extract description from any node regardless of @type.
  // Some CRMs (e.g. CasafariCRM/Proppy) place the property description on a
  // WebSite or non-real-estate node that the relevancy filter above skips.
  if (specs.description === undefined) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (!raw) return;
        const data = JSON.parse(raw);
        const nodes: any[] = Array.isArray(data)
          ? data
          : data?.["@graph"] ? data["@graph"] : [data];
        for (const node of nodes) {
          if (typeof node.description === "string") {
            const text = node.description.trim();
            if (text.length >= 50 && (!specs.description || text.length > specs.description.length)) {
              specs.description = text;
            }
          }
        }
      } catch {
        // Malformed JSON-LD — skip silently
      }
    });
  }

  return specs;
}

// ============================================
// MAIN: GENERIC DETAIL EXTRACTION
// ============================================

export function genericDetailExtract(
  html: string,
  baseUrl: string,
  config: DetailExtractionConfig
): DetailExtractionResult {
  try {
    const $ = cheerio.load(html);
    const result: DetailExtractionResult = { success: true };

    // Auto-detect CMS if not specified
    const cmsType = config.cms_type || detectCMS(html);
    const preset = CMS_PRESETS[cmsType] || CMS_PRESETS.custom;

    // ========================================
    // JSON-LD STRUCTURED DATA (highest priority)
    // ========================================
    // Many CMS themes (Houzez, RealHomes, etc.) embed RealEstateListing /
    // SingleFamilyResidence / Product schema. Parse it first — values here
    // are machine-generated and more reliable than regex on page text.
    const jsonLd = extractJsonLd($);
    if (jsonLd.bedrooms !== undefined) result.bedrooms = jsonLd.bedrooms;
    if (jsonLd.bathrooms !== undefined) result.bathrooms = jsonLd.bathrooms;
    if (jsonLd.area !== undefined) result.area = jsonLd.area;

    // ========================================
    // TITLE EXTRACTION
    // ========================================
    if (config.selectors.title) {
      const titleEl = $(config.selectors.title).first();
      if (titleEl.length) {
        result.title = titleEl.text().trim().slice(0, 200);
      }
    }
    // Fallback: h1
    if (!result.title) {
      const h1 = $("h1").first().text().trim();
      if (h1 && h1.length > 10) {
        result.title = h1.slice(0, 200);
      }
    }

    // ========================================
    // DESCRIPTION EXTRACTION
    // ========================================
    if (config.selectors.description) {
      // Try each selector (comma-separated)
      const selectors = config.selectors.description.split(",").map(s => s.trim());
      for (const sel of selectors) {
        const descEl = $(sel);
        if (descEl.length) {
          const text = descEl.text().trim();
          if (text.length >= 50 && (!result.description || text.length > result.description.length)) {
            result.description = text;
            // Sanitize the HTML version (strict whitelist)
            // Join all matched elements to avoid losing content when selector hits multiple nodes
            const rawHtml = descEl.map((_, el) => $.html(el)).get().join("");
            if (rawHtml) {
              const cleaned = sanitize(rawHtml, SANITIZE_OPTIONS).trim();
              if (cleaned.length > 0) {
                result.description_html = cleaned;
              }
            }
          }
        }
      }
    }
    // Fallback 1: JSON-LD description (covers CRMs like CasafariCRM that store
    // description in structured data rather than visible HTML paragraphs)
    if ((!result.description || result.description.length < 50) && jsonLd.description) {
      result.description = jsonLd.description;
    }

    // Fallback 2: find longest paragraph
    if (!result.description || result.description.length < 50) {
      let longestText = "";
      let longestEl: any = null;
      $("p, .description, [class*='description'], .content").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > longestText.length && text.length >= 50) {
          longestText = text;
          longestEl = el;
        }
      });
      if (longestText) {
        result.description = longestText;
        // Sanitize the HTML version for fallback too
        if (longestEl) {
          const rawHtml = $(longestEl).html();
          if (rawHtml) {
            const cleaned = sanitize(rawHtml, SANITIZE_OPTIONS).trim();
            if (cleaned.length > 0) {
              result.description_html = cleaned;
            }
          }
        }
      }
    }

    // ========================================
    // IMAGE EXTRACTION
    // ========================================
    const imageUrls: string[] = [];
    const imageAttrs = getImageAttrs(cmsType);

    if (config.selectors.images) {
      const selectors = config.selectors.images.split(",").map(s => s.trim());
      for (const sel of selectors) {
        $(sel).each((_, img) => {
          for (const attr of imageAttrs) {
            const src = $(img).attr(attr);
            if (src) {
              const absUrl = makeAbsoluteUrl(src, baseUrl);
              if (absUrl && !imageUrls.includes(absUrl)) {
                imageUrls.push(absUrl);
              }
            }
          }
          // Also check for lightbox links
          const href = $(img).closest("a").attr("href");
          if (href && (href.includes(".jpg") || href.includes(".png") || href.includes(".webp"))) {
            const absUrl = makeAbsoluteUrl(href, baseUrl);
            if (absUrl && !imageUrls.includes(absUrl)) {
              imageUrls.push(absUrl);
            }
          }
        });
      }
    }
    // Fallback: all images
    if (imageUrls.length < 3) {
      $("img").each((_, img) => {
        for (const attr of imageAttrs) {
          const src = $(img).attr(attr);
          if (src) {
            const absUrl = makeAbsoluteUrl(src, baseUrl);
            if (absUrl && !imageUrls.includes(absUrl) && !absUrl.includes("logo") && !absUrl.includes("icon")) {
              imageUrls.push(absUrl);
            }
          }
        }
      });
    }
    result.imageUrls = dedupeImageUrls(imageUrls).slice(0, 15);

    // ========================================
    // SPEC EXTRACTION (bedrooms, bathrooms, etc.)
    // ========================================
    const pageText = $("body").text();

    // Bedrooms (JSON-LD may have set this already — only override if still undefined)
    if (result.bedrooms === undefined && config.selectors.bedrooms) {
      const bedroomEl = $(config.selectors.bedrooms).first();
      if (bedroomEl.length) {
        result.bedrooms = extractNumber(bedroomEl.text());
      }
    }
    if (result.bedrooms === undefined) {
      const patterns = config.spec_patterns?.bedrooms?.map(p => new RegExp(p, "i")) || DEFAULT_SPEC_PATTERNS.bedrooms;
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match && match[1]) {
          result.bedrooms = parseInt(match[1], 10);
          break;
        }
      }
    }

    // Bathrooms (JSON-LD may have set this already)
    if (result.bathrooms === undefined && config.selectors.bathrooms) {
      const bathroomEl = $(config.selectors.bathrooms).first();
      if (bathroomEl.length) {
        result.bathrooms = extractNumber(bathroomEl.text());
      }
    }
    if (result.bathrooms === undefined) {
      const patterns = config.spec_patterns?.bathrooms?.map(p => new RegExp(p, "i")) || DEFAULT_SPEC_PATTERNS.bathrooms;
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match && match[1]) {
          result.bathrooms = parseInt(match[1], 10);
          break;
        }
      }
    }

    // Parking
    if (config.selectors.parking) {
      const parkingEl = $(config.selectors.parking).first();
      if (parkingEl.length) {
        result.parkingSpaces = extractNumber(parkingEl.text());
      }
    }
    if (result.parkingSpaces === undefined) {
      const patterns = config.spec_patterns?.parking?.map(p => new RegExp(p, "i")) || DEFAULT_SPEC_PATTERNS.parking;
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match && match[1]) {
          result.parkingSpaces = parseInt(match[1], 10);
          break;
        }
      }
    }

    // Area (JSON-LD may have set this already)
    if (result.area === undefined && config.selectors.area) {
      const areaEl = $(config.selectors.area).first();
      if (areaEl.length) {
        result.area = extractNumber(areaEl.text());
      }
    }
    if (result.area === undefined) {
      const patterns = config.spec_patterns?.area?.map(p => new RegExp(p, "i")) || DEFAULT_SPEC_PATTERNS.area;
      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match && match[1]) {
          result.area = parseFloat(match[1].replace(",", "."));
          break;
        }
      }
    }

    // ========================================
    // AMENITY EXTRACTION
    // ========================================
    const amenities: string[] = [];
    const amenityKeywords = config.amenity_keywords || DEFAULT_AMENITY_KEYWORDS;
    const negationWords = config.negation_words || DEFAULT_NEGATION_WORDS;
    const pageTextLower = pageText.toLowerCase();

    for (const [amenity, keywords] of Object.entries(amenityKeywords)) {
      for (const keyword of keywords) {
        if (pageTextLower.includes(keyword.toLowerCase())) {
          // Check for negation
          if (!hasNegationNearby(pageText, keyword, negationWords)) {
            amenities.push(amenity);
            break; // Move to next amenity
          }
        }
      }
    }
    result.amenities = [...new Set(amenities)]; // Dedupe

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================
// BUILD CONFIG FROM YAML SOURCE
// ============================================

export function buildDetailConfig(
  sourceDetail: DetailConfig | undefined,
  cmsType?: CMSType
): DetailExtractionConfig {
  const cms = cmsType || "custom";
  const preset = CMS_PRESETS[cms] || CMS_PRESETS.custom;

  return {
    enabled: sourceDetail?.enabled ?? false,
    policy: sourceDetail?.policy || "on_violation",
    cms_type: cms,
    selectors: {
      description: sourceDetail?.selectors?.description || ".description, [class*='description'], p",
      images: sourceDetail?.selectors?.images || preset.selectors.image,
      title: undefined, // Usually not needed, use list page title
      price: undefined,
      bedrooms: sourceDetail?.selectors?.bedrooms,
      bathrooms: sourceDetail?.selectors?.bathrooms,
      parking: undefined,
      area: undefined,
      amenities: undefined,
    },
    delay_ms: sourceDetail?.delay_ms ?? 2500,
  };
}
