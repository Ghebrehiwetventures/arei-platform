import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import * as crypto from "crypto";
import { SourcePlugin, ListingSeed, ListingDetail, DetailPolicy } from "../types";

// ============================================
// LIST PAGE PARSING
// ============================================

function generateListingId(title: string, price: number | undefined, url: string): string {
  const input = `${title || ""}|${price || ""}|${url}`;
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
}

function parsePrice(priceText: string): number | undefined {
  if (!priceText) return undefined;

  const cleaned = priceText.replace(/[€$£,\s]/g, "").replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);

  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

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
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${url}`;
  }
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
  if (lower.includes("logo")) return false;
  if (lower.includes("icon")) return false;
  if (lower.includes("avatar")) return false;
  if (lower.includes("sprite")) return false;
  if (lower.includes("placeholder") && !lower.includes("property")) return false;
  if (lower.includes("default")) return false;
  if (lower.includes("spinner")) return false;
  if (lower.includes("loading")) return false;
  if (lower.endsWith(".svg")) return false;
  if (lower.endsWith(".gif") && lower.includes("load")) return false;
  if (/[_\-\/](32|48|50|64|72|80|100)(x\d+)?[_\-\.\/]|[_\-\/]\d+x(32|48|50|64|72|80|100)[_\-\.\/]/i.test(lower)) return false;
  return true;
}

const UI_STRINGS_PATTERN = /\b(Add to favou?rites?|Favou?rite|Share|Print|Contact|Call|Email|WhatsApp|Similar properties|Related properties|Back)\b/gi;

function cleanDescription(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let cleaned = raw
    .replace(UI_STRINGS_PATTERN, "")
    .replace(/[ \t]+/g, " ")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line, idx, arr) => arr.findIndex((l) => l.toLowerCase() === line.toLowerCase()) === idx)
    .join(" ");

  cleaned = cleaned.trim();
  if (cleaned.length > 300) cleaned = cleaned.slice(0, 300) + "...";

  return cleaned || undefined;
}

function cleanImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of urls) {
    if (!seen.has(url)) {
      seen.add(url);
      deduped.push(url);
    }
  }
  return deduped.slice(0, 20);
}

function extractImagesFromElement($: CheerioAPI, $el: Cheerio<AnyNode>, baseUrl: string): string[] {
  const imageUrls: string[] = [];
  const seen = new Set<string>();

  function addImage(url: string) {
    const absUrl = makeAbsoluteUrl(url, baseUrl);
    if (absUrl && isValidImageUrl(absUrl) && !seen.has(absUrl)) {
      seen.add(absUrl);
      imageUrls.push(absUrl);
    }
  }

  $el.find("img").each((_, img) => {
    const $img = $(img);

    const src = $img.attr("src");
    if (src) addImage(src);

    const dataSrc = $img.attr("data-src");
    if (dataSrc) addImage(dataSrc);

    const dataLazy = $img.attr("data-lazy");
    if (dataLazy) addImage(dataLazy);

    const dataLazySrc = $img.attr("data-lazy-src");
    if (dataLazySrc) addImage(dataLazySrc);

    const dataOriginal = $img.attr("data-original");
    if (dataOriginal) addImage(dataOriginal);

    const srcset = $img.attr("srcset") || $img.attr("data-srcset");
    if (srcset) {
      const srcsetParts = srcset.split(",");
      for (const part of srcsetParts) {
        const urlMatch = part.trim().split(/\s+/)[0];
        if (urlMatch) addImage(urlMatch);
      }
    }
  });

  $el.find("source").each((_, source) => {
    const $source = $(source);
    const srcset = $source.attr("srcset") || $source.attr("data-srcset");
    if (srcset) {
      const srcsetParts = srcset.split(",");
      for (const part of srcsetParts) {
        const urlMatch = part.trim().split(/\s+/)[0];
        if (urlMatch) addImage(urlMatch);
      }
    }
  });

  $el.find("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    const bgMatches = style.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of bgMatches) {
      if (match[1]) addImage(match[1]);
    }
  });

  const elStyle = $el.attr("style") || "";
  if (elStyle) {
    const bgMatches = elStyle.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of bgMatches) {
      if (match[1]) addImage(match[1]);
    }
  }

  $el.find("[data-background], [data-bg]").each((_, el) => {
    const $bgEl = $(el);
    const dataBg = $bgEl.attr("data-background") || $bgEl.attr("data-bg");
    if (dataBg) addImage(dataBg);
  });

  return imageUrls;
}

function parseList(html: string, sourceName: string, baseUrl: string): ListingSeed[] {
  const $ = cheerio.load(html);
  const listings: ListingSeed[] = [];
  const now = new Date();
  const sourceId = "cv_simplycapeverde";

  const cardSelectors = [
    ".es-listing",
    ".js-es-listing",
    ".property-card",
    ".listing-item",
    "article.property",
    "[class*='listing']",
    "[class*='property']",
  ];

  let $cards = $();
  for (const selector of cardSelectors) {
    $cards = $(selector);
    if ($cards.length > 0) break;
  }

  if ($cards.length === 0) {
    const propertyLinks = $('a[href*="/property/"]');
    const processedUrls = new Set<string>();

    propertyLinks.each((_, el) => {
      const $link = $(el);
      const href = $link.attr("href");
      if (!href || processedUrls.has(href)) return;
      processedUrls.add(href);

      const detailUrl = makeAbsoluteUrl(href, baseUrl);

      const $container = $link.closest("div, article, section, li").first();

      let title = $link.find("h1, h2, h3, h4").first().text().trim();
      if (!title) title = $link.text().trim();
      if (!title) title = $container.find("h1, h2, h3, h4").first().text().trim();

      if (title) {
        title = title.replace(/\s+/g, " ").trim();
        if (title.length > 200) title = title.slice(0, 200);
      }

      let priceText = "";
      const pricePatterns = [
        /€[\d,]+/,
        /[\d,]+\s*€/,
        /EUR\s*[\d,]+/,
        /[\d,]+\s*EUR/,
      ];

      const containerText = $container.text();
      for (const pattern of pricePatterns) {
        const match = containerText.match(pattern);
        if (match) {
          priceText = match[0];
          break;
        }
      }

      const price = parsePrice(priceText);

      const imageUrls = extractImagesFromElement($, $container, baseUrl);

      let location = "";
      const locationPatterns = [
        /Santa Maria/i,
        /Sal/i,
        /Praia/i,
        /Mindelo/i,
        /Boa Vista/i,
        /Santiago/i,
        /Cabo Verde/i,
        /Cape Verde/i,
      ];

      for (const pattern of locationPatterns) {
        const match = containerText.match(pattern);
        if (match) {
          location = match[0];
          break;
        }
      }

      let description = "";
      const $desc = $container.find("p, .description, .excerpt, .summary").first();
      if ($desc.length) {
        description = $desc.text().trim().replace(/\s+/g, " ");
        if (description.length > 300) description = description.slice(0, 300) + "...";
      }

      if (title || price) {
        listings.push({
          id: `scv_${generateListingId(title || "", price, detailUrl)}`,
          sourceId,
          sourceName,
          title: title || undefined,
          price,
          description: cleanDescription(description),
          imageUrls: cleanImageUrls(imageUrls),
          location: location || undefined,
          detailUrl,
          externalUrl: detailUrl || undefined,
          createdAt: now,
        });
      }
    });
  } else {
    $cards.each((_, card) => {
      const $card = $(card);

      const $link = $card.find("a[href*='/property/']").first();
      const href = $link.attr("href") || $card.find("a").first().attr("href");
      const detailUrl = href ? makeAbsoluteUrl(href, baseUrl) : "";

      let title = $card.find("h1, h2, h3, h4, .title, .name").first().text().trim();
      if (!title) title = $link.text().trim();
      title = title.replace(/\s+/g, " ").trim();
      if (title.length > 200) title = title.slice(0, 200);

      let priceText = $card.find(".price, .es-price, [class*='price']").first().text().trim();
      if (!priceText) {
        const cardText = $card.text();
        const priceMatch = cardText.match(/€[\d,]+|[\d,]+\s*€/);
        if (priceMatch) priceText = priceMatch[0];
      }
      const price = parsePrice(priceText);

      const imageUrls = extractImagesFromElement($, $card, baseUrl);

      let location = "";
      const locationText = $card.find(".location, .address, [class*='location']").first().text().trim();
      if (locationText) {
        location = locationText;
      } else {
        const cardText = $card.text();
        const locPatterns = [/Santa Maria/i, /Sal/i, /Praia/i, /Mindelo/i, /Boa Vista/i];
        for (const pattern of locPatterns) {
          const match = cardText.match(pattern);
          if (match) {
            location = match[0];
            break;
          }
        }
      }

      let description = $card.find(".description, .excerpt, p").first().text().trim();

      if (title || price) {
        listings.push({
          id: `scv_${generateListingId(title || "", price, detailUrl)}`,
          sourceId,
          sourceName,
          title: title || undefined,
          price,
          description: cleanDescription(description),
          imageUrls: cleanImageUrls(imageUrls),
          location: location || undefined,
          detailUrl,
          createdAt: now,
        });
      }
    });
  }

  return listings;
}

// ============================================
// DETAIL PAGE EXTRACTION
// ============================================

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

const SMALL_IMAGE_PATTERNS = [
  /-\d{2,3}x\d{2,3}\./i,
  /\/\d{2,3}x\d{2,3}\//i,
  /size=\d{2,3}/i,
  /width=\d{2,3}(?!\d)/i,
  /w=\d{2,3}(?!\d)/i,
];

const NEGATION_WORDS = ["no", "not", "without", "sem", "não", "nao"];

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

function cleanDetailDescription(text: string): string {
  let cleaned = text;

  for (const pattern of UI_TEXT_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  const lines = cleaned.split(/[\n\r]+/);
  const seenLines = new Set<string>();
  const uniqueLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    if (trimmed.length < 3) continue;
    const normalized = trimmed.toLowerCase();
    if (seenLines.has(normalized)) continue;
    seenLines.add(normalized);
    uniqueLines.push(trimmed);
  }

  return uniqueLines.join(" ").replace(/\s+/g, " ").trim();
}

function isValidDetailImageUrl(url: string): boolean {
  if (!url) return false;

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  for (const pattern of INVALID_IMAGE_PATTERNS) {
    if (pattern.test(url)) return false;
  }

  for (const pattern of SMALL_IMAGE_PATTERNS) {
    if (pattern.test(url)) return false;
  }

  return true;
}

function makeDetailAbsoluteUrl(url: string, baseUrl: string): string {
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

function parseDetailPrice(priceText: string): number | undefined {
  if (!priceText) return undefined;

  const cleaned = priceText.replace(/[€$£,\s]/g, "").replace(/[^\d.]/g, "");
  const num = parseFloat(cleaned);

  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

function parseCleanInteger(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function parseArea(value: string): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function extractDetail(html: string, baseUrl: string): ListingDetail {
  const $ = cheerio.load(html);
  const imageUrls: string[] = [];
  const seenImages = new Set<string>();
  const amenities = new Set<string>();

  const canonicalLink = $('link[rel="canonical"]').attr("href");
  const effectiveUrl = canonicalLink || baseUrl;

  let title: string | undefined;
  const h1Text = $("h1").first().text().trim();
  if (h1Text && h1Text.length > 5) {
    title = h1Text;
  }

  let price: number | undefined;

  const priceElement = $(".es-price").first().text().trim();
  if (priceElement) {
    price = parseDetailPrice(priceElement);
  }

  if (!price) {
    const bodyText = $("body").text();
    const priceMatch = bodyText.match(/€[\d,]+/);
    if (priceMatch) {
      price = parseDetailPrice(priceMatch[0]);
    }
  }

  let bedrooms: number | null = null;
  let bathrooms: number | null = null;
  let terraceArea: number | null = null;

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

  $(".es-listing__meta-area, [class*='area']").each((_, el) => {
    const text = $(el).text().trim();
    const parsed = parseArea(text);
    if (parsed !== null) {
      terraceArea = parsed;
    }
  });

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

  let description: string | undefined;

  $("dd").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 100 && !description) {
      description = cleanDetailDescription(text);
    }
  });

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
          description = cleanDetailDescription(text);
          break;
        }
      }
    }
  }

  if (!description || description.length < 50) {
    const paragraphs: string[] = [];
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 30 && text.length < 2000) {
        const lowerText = text.toLowerCase();
        const isUIText = UI_TEXT_PATTERNS.some((p) => p.test(lowerText));
        if (!isUIText) {
          paragraphs.push(text);
        }
      }
    });
    if (paragraphs.length > 0) {
      description = cleanDetailDescription(paragraphs.join(" "));
    }
  }

  if (description) {
    extractAmenitiesFromText(description, amenities);
  }

  function addImage(url: string) {
    const absUrl = makeDetailAbsoluteUrl(url, effectiveUrl);
    if (absUrl && isValidDetailImageUrl(absUrl) && !seenImages.has(absUrl)) {
      seenImages.add(absUrl);
      imageUrls.push(absUrl);
    }
  }

  $(".es-p-slideshow img, .slick-slide img, .swiper-slide img, .gallery img").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy");
    if (src) addImage(src);

    const srcset = $img.attr("srcset") || $img.attr("data-srcset");
    if (srcset) {
      const parts = srcset.split(",");
      for (const part of parts) {
        const urlMatch = part.trim().split(/\s+/)[0];
        if (urlMatch) addImage(urlMatch);
      }
    }
  });

  $("a[href*='.jpg'], a[href*='.jpeg'], a[href*='.png'], a[href*='.webp']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) addImage(href);
  });

  $("img[src*='uploads'], img[data-src*='uploads']").each((_, el) => {
    const $img = $(el);
    const src = $img.attr("src") || $img.attr("data-src");
    if (src) addImage(src);
  });

  if (imageUrls.length < 3) {
    $("img").each((_, el) => {
      const $img = $(el);
      const src = $img.attr("src") || $img.attr("data-src");
      const width = parseInt($img.attr("width") || "0", 10);
      const height = parseInt($img.attr("height") || "0", 10);

      if ((width > 0 && width < 100) || (height > 0 && height < 100)) {
        return;
      }

      if (src) addImage(src);
    });
  }

  const finalImages = imageUrls.slice(0, 20);

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
}

// ============================================
// PLUGIN EXPORT
// ============================================

export const simplyPlugin: SourcePlugin = {
  sourceId: "cv_simplycapeverde",
  marketId: "cv",
  detailPolicy: "never",
  parseList,
  extractDetail,
};
