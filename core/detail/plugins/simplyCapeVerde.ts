import * as cheerio from "cheerio";
import { DetailPlugin, DetailExtractResult } from "../types";

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
  /-\d{2,3}x\d{2,3}\./i, // e.g., -32x32. -100x100.
  /\/\d{2,3}x\d{2,3}\//i, // e.g., /32x32/ /100x100/
  /size=\d{2,3}/i,
  /width=\d{2,3}(?!\d)/i,
  /w=\d{2,3}(?!\d)/i,
];

// Negation words for amenity detection
const NEGATION_WORDS = ["no", "not", "without", "sem", "n\u00e3o", "nao"];

// Amenity keywords with English and Portuguese variants
const AMENITY_KEYWORDS: { keyword: string; amenity: string }[] = [
  { keyword: "pool", amenity: "Pool" },
  { keyword: "swimming pool", amenity: "Pool" },
  { keyword: "piscina", amenity: "Pool" },
  { keyword: "sea view", amenity: "Sea View" },
  { keyword: "ocean view", amenity: "Sea View" },
  { keyword: "vista mar", amenity: "Sea View" },
  { keyword: "balcony", amenity: "Balcony" },
  { keyword: "varanda", amenity: "Balcony" },
  { keyword: "terrace", amenity: "Terrace" },
  { keyword: "terraço", amenity: "Terrace" },
  { keyword: "garden", amenity: "Garden" },
  { keyword: "jardim", amenity: "Garden" },
  { keyword: "air conditioning", amenity: "Air Conditioning" },
  { keyword: "a/c", amenity: "Air Conditioning" },
  { keyword: "ar condicionado", amenity: "Air Conditioning" },
  { keyword: "wifi", amenity: "WiFi" },
  { keyword: "wi-fi", amenity: "WiFi" },
  { keyword: "internet", amenity: "WiFi" },
  { keyword: "elevator", amenity: "Elevator" },
  { keyword: "lift", amenity: "Elevator" },
  { keyword: "elevador", amenity: "Elevator" },
  { keyword: "parking", amenity: "Parking" },
  { keyword: "garage", amenity: "Parking" },
  { keyword: "estacionamento", amenity: "Parking" },
  { keyword: "security", amenity: "Security" },
  { keyword: "gated", amenity: "Security" },
  { keyword: "segurança", amenity: "Security" },
  { keyword: "furnished", amenity: "Furnished" },
  { keyword: "mobilado", amenity: "Furnished" },
];

/**
 * Check if a negation appears within N words before a keyword position in text.
 */
function hasNegationBefore(text: string, keywordIndex: number, windowWords: number = 5): boolean {
  const before = text.slice(0, keywordIndex).toLowerCase();
  const words = before.split(/\s+/).filter((w) => w.length > 0);
  const windowStart = Math.max(0, words.length - windowWords);
  const windowSlice = words.slice(windowStart);

  for (const word of windowSlice) {
    const cleanWord = word.replace(/[.,;:!?()]/g, "");
    if (NEGATION_WORDS.includes(cleanWord)) {
      return true;
    }
  }
  return false;
}

/**
 * Extract amenities from description text using keyword scan with negation guard.
 */
function extractAmenitiesFromText(text: string, existingAmenities: Set<string>): void {
  const lowerText = text.toLowerCase();

  for (const { keyword, amenity } of AMENITY_KEYWORDS) {
    if (existingAmenities.has(amenity)) continue;

    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
    let match;

    while ((match = regex.exec(lowerText)) !== null) {
      const keywordIndex = match.index;
      if (!hasNegationBefore(lowerText, keywordIndex, 5)) {
        existingAmenities.add(amenity);
        break;
      }
    }
  }
}

/**
 * Clean description text by removing UI elements and normalizing whitespace.
 */
function cleanDescription(text: string): string {
  let cleaned = text;

  // Remove UI text patterns
  for (const pattern of UI_TEXT_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  // Split into lines, trim each, remove empty/duplicate lines
  const lines = cleaned.split(/[\n\r]+/);
  const seenLines = new Set<string>();
  const uniqueLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    if (trimmed.length < 3) continue; // Skip very short lines
    const normalized = trimmed.toLowerCase();
    if (seenLines.has(normalized)) continue;
    seenLines.add(normalized);
    uniqueLines.push(trimmed);
  }

  // Join and normalize whitespace
  return uniqueLines.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Check if image URL is valid (not a logo, icon, or small image).
 */
function isValidImageUrl(url: string): boolean {
  if (!url) return false;

  // Must be http/https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  // Check for invalid patterns
  for (const pattern of INVALID_IMAGE_PATTERNS) {
    if (pattern.test(url)) return false;
  }

  // Check for small image size indicators
  for (const pattern of SMALL_IMAGE_PATTERNS) {
    if (pattern.test(url)) return false;
  }

  return true;
}

/**
 * Make URL absolute.
 */
function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return "";
  url = url.trim();
  if (url.startsWith("data:")) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("//")) {
    return "https:" + url;
  }
  if (url.startsWith("/")) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    } catch {
      return "";
    }
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

/**
 * Parse price from text (handles €250,000 format).
 */
function parsePrice(priceText: string): number | undefined {
  if (!priceText) return undefined;

  // Remove currency symbols, spaces, and extract numbers
  const cleaned = priceText.replace(/[€$£,\s]/g, "").replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);

  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

/**
 * Parse clean integer from text.
 */
function parseCleanInteger(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Parse area value (sq ft or sqm).
 */
function parseArea(value: string): number | null {
  if (!value) return null;
  // Remove commas and extract number
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

export const simplyCapeVerdePlugin: DetailPlugin = {
  sourceId: "cv_simplycapeverde",

  extract(html: string, baseUrl: string): DetailExtractResult {
    const $ = cheerio.load(html);
    const imageUrls: string[] = [];
    const seenImages = new Set<string>();
    const amenities = new Set<string>();

    // ========================================
    // A) Extract canonical URL if present
    // ========================================
    const canonicalLink = $('link[rel="canonical"]').attr("href");
    const effectiveUrl = canonicalLink || baseUrl;

    // ========================================
    // B) Extract title from h1
    // ========================================
    let title: string | undefined;
    const h1Text = $("h1").first().text().trim();
    if (h1Text && h1Text.length > 5) {
      title = h1Text;
    }

    // ========================================
    // C) Extract price
    // ========================================
    let price: number | undefined;

    // Try .es-price class first
    const priceElement = $(".es-price").first().text().trim();
    if (priceElement) {
      price = parsePrice(priceElement);
    }

    // Fallback: search for price pattern in page
    if (!price) {
      const bodyText = $("body").text();
      const priceMatch = bodyText.match(/€[\d,]+/);
      if (priceMatch) {
        price = parsePrice(priceMatch[0]);
      }
    }

    // ========================================
    // D) Extract property specs
    // ========================================
    let bedrooms: number | null = null;
    let bathrooms: number | null = null;
    let terraceArea: number | null = null;

    // Look for meta items with beds/baths
    $(".es-listing__meta-bedrooms, [class*='bedrooms']").each((_, el) => {
      const text = $(el).text().trim();
      const parsed = parseCleanInteger(text);
      if (parsed !== null && parsed < 20) {
        bedrooms = parsed;
      }
    });

    $(".es-listing__meta-bathrooms, [class*='bathrooms']").each((_, el) => {
      const text = $(el).text().trim();
      const parsed = parseCleanInteger(text);
      if (parsed !== null && parsed < 20) {
        bathrooms = parsed;
      }
    });

    // Look for area
    $(".es-listing__meta-area, [class*='area']").each((_, el) => {
      const text = $(el).text().trim();
      const parsed = parseArea(text);
      if (parsed !== null) {
        terraceArea = parsed;
      }
    });

    // Fallback: search in dl/dt/dd structure
    $("dl dt, dl dd").each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      const $next = $(el).next("dd");
      const value = $next.length ? $next.text().trim() : "";

      if (text.includes("bed") && bedrooms === null) {
        bedrooms = parseCleanInteger(value || text);
      } else if (text.includes("bath") && bathrooms === null) {
        bathrooms = parseCleanInteger(value || text);
      }
    });

    // Fallback: search in list items
    if (bedrooms === null || bathrooms === null) {
      $("li").each((_, el) => {
        const text = $(el).text().trim();
        const lowerText = text.toLowerCase();

        if (lowerText.includes("bed") && bedrooms === null) {
          const match = text.match(/(\d+)\s*bed/i);
          if (match) bedrooms = parseInt(match[1], 10);
        }
        if (lowerText.includes("bath") && bathrooms === null) {
          const match = text.match(/(\d+)\s*bath/i);
          if (match) bathrooms = parseInt(match[1], 10);
        }
      });
    }

    // ========================================
    // E) Extract description
    // ========================================
    let description: string | undefined;

    // Try to find description in dd element (property details structure)
    $("dd").each((_, el) => {
      const text = $(el).text().trim();
      // Look for substantial text that looks like a description
      if (text.length > 100 && !description) {
        description = cleanDescription(text);
      }
    });

    // Fallback: look for description in specific containers
    if (!description || description.length < 50) {
      const descSelectors = [
        ".property-description",
        ".es-listing__description",
        "[class*='description']",
        ".property-content p",
        ".listing-content p",
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

    // Final fallback: concatenate paragraphs
    if (!description || description.length < 50) {
      const paragraphs: string[] = [];
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 30 && text.length < 2000) {
          // Skip if it looks like UI text
          const lowerText = text.toLowerCase();
          const isUIText = UI_TEXT_PATTERNS.some((p) => p.test(lowerText));
          if (!isUIText) {
            paragraphs.push(text);
          }
        }
      });
      if (paragraphs.length > 0) {
        description = cleanDescription(paragraphs.join(" "));
      }
    }

    // ========================================
    // F) Extract amenities from description
    // ========================================
    if (description) {
      extractAmenitiesFromText(description, amenities);
    }

    // ========================================
    // G) Extract images
    // ========================================

    // Helper to add image
    function addImage(url: string) {
      const absUrl = makeAbsoluteUrl(url, effectiveUrl);
      if (absUrl && isValidImageUrl(absUrl) && !seenImages.has(absUrl)) {
        seenImages.add(absUrl);
        imageUrls.push(absUrl);
      }
    }

    // 1) Try slideshow/carousel images first
    $(".es-p-slideshow img, .slick-slide img, .swiper-slide img, .gallery img").each((_, el) => {
      const $img = $(el);
      const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy");
      if (src) addImage(src);

      // Check srcset for higher quality images
      const srcset = $img.attr("srcset") || $img.attr("data-srcset");
      if (srcset) {
        const parts = srcset.split(",");
        for (const part of parts) {
          const urlMatch = part.trim().split(/\s+/)[0];
          if (urlMatch) addImage(urlMatch);
        }
      }
    });

    // 2) Try lightbox links
    $("a[href*='.jpg'], a[href*='.jpeg'], a[href*='.png'], a[href*='.webp']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) addImage(href);
    });

    // 3) Try all property images
    $("img[src*='uploads'], img[data-src*='uploads']").each((_, el) => {
      const $img = $(el);
      const src = $img.attr("src") || $img.attr("data-src");
      if (src) addImage(src);
    });

    // 4) Fallback: all images with reasonable size
    if (imageUrls.length < 3) {
      $("img").each((_, el) => {
        const $img = $(el);
        const src = $img.attr("src") || $img.attr("data-src");
        const width = parseInt($img.attr("width") || "0", 10);
        const height = parseInt($img.attr("height") || "0", 10);

        // Skip very small images
        if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
          return;
        }

        if (src) addImage(src);
      });
    }

    // Dedupe and limit to 20
    const finalImages = imageUrls.slice(0, 20);

    // ========================================
    // H) Debug output
    // ========================================
    if (process.env.DEBUG_SCV === "1") {
      console.log(
        JSON.stringify(
          {
            source_url: baseUrl,
            canonical_url: canonicalLink,
            title,
            price,
            bedrooms,
            bathrooms,
            terraceArea,
            description_length: description?.length || 0,
            image_count: finalImages.length,
            amenities: Array.from(amenities),
          },
          null,
          2
        )
      );
    }

    return {
      success: true,
      title,
      price,
      description,
      imageUrls: finalImages,
      bedrooms,
      bathrooms,
      terraceArea,
      amenities: Array.from(amenities),
    };
  },
};
