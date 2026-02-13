import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import * as crypto from "crypto";

export interface ParsedListing {
  id: string;
  sourceId: string;
  sourceName: string;
  title?: string;
  price?: number;
  description?: string;
  imageUrls: string[];
  location?: string;
  detailUrl?: string;
  externalUrl?: string;
  createdAt: Date;
  area_sqm?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

function generateListingId(title: string, price: number | undefined, url: string): string {
  const input = `${title || ""}|${price || ""}|${url}`;
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
}

function parsePrice(priceText: string): number | undefined {
  if (!priceText) return undefined;

  // Remove currency symbols, spaces, and extract numbers
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
  // Filter non-http(s) URLs
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) return false;
  // Filter UI elements
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
  // Filter tiny images by size hints in URL (e.g., 32x32, 64px, 100w)
  if (/[_\-\/](32|48|50|64|72|80|100)(x\d+)?[_\-\.\/]|[_\-\/]\d+x(32|48|50|64|72|80|100)[_\-\.\/]/i.test(lower)) return false;
  return true;
}

// UI strings to remove from descriptions
const UI_STRINGS_PATTERN = /\b(Add to favou?rites?|Favou?rite|Share|Print|Contact|Call|Email|WhatsApp|Similar properties|Related properties|Back)\b/gi;

function cleanDescription(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let cleaned = raw
    // Remove UI strings
    .replace(UI_STRINGS_PATTERN, "")
    // Normalize whitespace within lines
    .replace(/[ \t]+/g, " ")
    // Split into lines for deduplication
    .split(/\n+/)
    // Trim each line
    .map((line) => line.trim())
    // Remove empty lines
    .filter((line) => line.length > 0)
    // Remove duplicate lines (case-insensitive)
    .filter((line, idx, arr) => arr.findIndex((l) => l.toLowerCase() === line.toLowerCase()) === idx)
    // Rejoin
    .join(" ");

  // Final trim and length cap
  cleaned = cleaned.trim();
  if (cleaned.length > 300) cleaned = cleaned.slice(0, 300) + "...";

  return cleaned || undefined;
}

const SQFT_TO_SQM = 0.092903;

function parseArea(text: string): number | null {
  if (!text) return null;

  // Clean and normalize
  const cleaned = text.toLowerCase().replace(/,/g, "").trim();

  // Match number followed by unit - support "1380 sq ft", "150 sqm", "150m²", "150 m²"
  const match = cleaned.match(/([\d.]+)\s*(m²|m2|sqm|sqft|sq\s*ft)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (isNaN(value) || value <= 0) return null;

  const unit = match[2].toLowerCase().replace(/\s+/g, "");

  // Convert sqft to sqm (handles "sqft" and "sq ft" which becomes "sqft" after whitespace removal)
  if (unit === "sqft" || unit === "sqft") {
    return Math.round(value * SQFT_TO_SQM * 100) / 100;
  }

  // m², m2, sqm - return as-is (these are already in square meters)
  return value;
}

function parseNumericSpec(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  if (isNaN(value) || value < 0) return null;
  return value;
}

function extractSpecsFromMetaElements($: CheerioAPI, $container: Cheerio<AnyNode>): {
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
} {
  let area_sqm: number | null = null;
  let bedrooms: number | null = null;
  let bathrooms: number | null = null;

  // Simply Cape Verde uses .es-listing__meta-* classes for specs
  // Primary selectors based on actual DOM inspection:
  // - <li class="es-listing__meta-bedrooms"> containing "2 beds"
  // - <li class="es-listing__meta-bathrooms"> containing "2 baths"
  // - <li class="es-listing__meta-area"> containing "1380 sq ft"

  // Try bedrooms - look for .es-listing__meta-bedrooms first
  const $bedroomsMeta = $container.find(".es-listing__meta-bedrooms").first();
  if ($bedroomsMeta.length) {
    const text = $bedroomsMeta.text().trim();
    // Text format: "2 beds" - extract the number
    const match = text.match(/(\d+)\s*beds?/i);
    if (match) {
      bedrooms = parseInt(match[1], 10);
    } else {
      bedrooms = parseNumericSpec(text);
    }
  }

  // Try bathrooms - look for .es-listing__meta-bathrooms first
  const $bathroomsMeta = $container.find(".es-listing__meta-bathrooms").first();
  if ($bathroomsMeta.length) {
    const text = $bathroomsMeta.text().trim();
    // Text format: "2 baths" - extract the number
    const match = text.match(/(\d+)\s*baths?/i);
    if (match) {
      bathrooms = parseInt(match[1], 10);
    } else {
      bathrooms = parseNumericSpec(text);
    }
  }

  // Try area - look for .es-listing__meta-area first
  const $areaMeta = $container.find(".es-listing__meta-area").first();
  if ($areaMeta.length) {
    const text = $areaMeta.text().trim();
    // Text format: "1380 sq ft" or "150 sqm"
    area_sqm = parseArea(text);
  }

  // Fallback: try alternative class patterns if primary selectors didn't work
  if (bedrooms === null) {
    const $altBedrooms = $container.find("[class*='meta-bedrooms'], [class*='bedrooms']").first();
    if ($altBedrooms.length) {
      const text = $altBedrooms.text().trim();
      const match = text.match(/(\d+)\s*beds?/i);
      if (match) {
        bedrooms = parseInt(match[1], 10);
      } else {
        bedrooms = parseNumericSpec(text);
      }
    }
  }

  if (bathrooms === null) {
    const $altBathrooms = $container.find("[class*='meta-bathrooms'], [class*='bathrooms']").first();
    if ($altBathrooms.length) {
      const text = $altBathrooms.text().trim();
      const match = text.match(/(\d+)\s*baths?/i);
      if (match) {
        bathrooms = parseInt(match[1], 10);
      } else {
        bathrooms = parseNumericSpec(text);
      }
    }
  }

  if (area_sqm === null) {
    const $altArea = $container.find("[class*='meta-area'], [class*='area']").first();
    if ($altArea.length) {
      const text = $altArea.text().trim();
      area_sqm = parseArea(text);
    }
  }

  // Look for specs in dl/dt/dd structure (common pattern)
  if (bedrooms === null || bathrooms === null || area_sqm === null) {
    $container.find("dl").each((_, dl) => {
      $(dl).find("dt").each((_, dt) => {
        const $dt = $(dt);
        const label = $dt.text().toLowerCase().trim();
        const $dd = $dt.next("dd");
        const value = $dd.text().trim();

        if (area_sqm === null && (label.includes("living area") || label.includes("internal area") || label.includes("living space"))) {
          area_sqm = parseArea(value);
        }
        if (area_sqm === null && (label.includes("plot size") || label.includes("land area") || label.includes("total area") || label.includes("size"))) {
          area_sqm = parseArea(value);
        }
        if (bedrooms === null && (label.includes("bedroom") || label === "beds" || label === "bed")) {
          bedrooms = parseNumericSpec(value);
        }
        if (bathrooms === null && (label.includes("bathroom") || label === "baths" || label === "bath")) {
          bathrooms = parseNumericSpec(value);
        }
      });
    });
  }

  // Look for specs in table rows
  if (bedrooms === null || bathrooms === null || area_sqm === null) {
    $container.find("table tr, .specs tr, .features tr").each((_, row) => {
      const $row = $(row);
      const cells = $row.find("td, th");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().toLowerCase().trim();
        const value = $(cells[1]).text().trim();

        if (area_sqm === null && (label.includes("living area") || label.includes("internal area"))) {
          area_sqm = parseArea(value);
        }
        if (area_sqm === null && (label.includes("plot size") || label.includes("land area") || label.includes("size"))) {
          area_sqm = parseArea(value);
        }
        if (bedrooms === null && (label.includes("bedroom") || label === "beds")) {
          bedrooms = parseNumericSpec(value);
        }
        if (bathrooms === null && (label.includes("bathroom") || label === "baths")) {
          bathrooms = parseNumericSpec(value);
        }
      }
    });
  }

  // Look for specs in list items with label: value pattern or "X beds/baths" pattern
  if (bedrooms === null || bathrooms === null || area_sqm === null) {
    $container.find("li, .spec-item, [class*='spec']").each((_, el) => {
      const text = $(el).text();
      const lowerText = text.toLowerCase();

      // Pattern: "2 beds", "Bedrooms: 3", "3 Bedrooms"
      if (bedrooms === null) {
        const bedroomMatch = lowerText.match(/(\d+)\s*beds?\b|(?:bedroom|beds?)[\s:]*(\d+)/i);
        if (bedroomMatch) {
          bedrooms = parseInt(bedroomMatch[1] || bedroomMatch[2], 10);
        }
      }

      // Pattern: "2 baths", "Bathrooms: 2", "2 Bathrooms"
      if (bathrooms === null) {
        const bathroomMatch = lowerText.match(/(\d+)\s*baths?\b|(?:bathroom|baths?)[\s:]*(\d+)/i);
        if (bathroomMatch) {
          bathrooms = parseInt(bathroomMatch[1] || bathroomMatch[2], 10);
        }
      }

      // Pattern: "1380 sq ft", "150 sqm", "150 m²"
      if (area_sqm === null) {
        const areaMatch = text.match(/([\d,]+(?:\.\d+)?)\s*(m²|m2|sqm|sqft|sq\s*ft)/i);
        if (areaMatch) {
          area_sqm = parseArea(areaMatch[0]);
        }
      }
    });
  }

  return { area_sqm, bedrooms, bathrooms };
}

function extractSpecsFromText(text: string): {
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
} {
  let area_sqm: number | null = null;
  let bedrooms: number | null = null;
  let bathrooms: number | null = null;

  if (!text) return { area_sqm, bedrooms, bathrooms };

  const lowerText = text.toLowerCase();

  // Area from description - look for patterns like "150 sqm", "150m²", "1500 sq ft", "1380 sq ft"
  const areaMatch = lowerText.match(/([\d,]+(?:\.\d+)?)\s*(m²|m2|sqm|sqft|sq\s*ft)/i);
  if (areaMatch) {
    area_sqm = parseArea(areaMatch[0]);
  }

  // Bedrooms - patterns like "3 bedrooms", "3 bed", "3br", "2 beds"
  // Also match title patterns like "2 Bed Apartment"
  const bedMatch = lowerText.match(/(\d+)\s*(?:bedroom|beds?\b|br\b)/i);
  if (bedMatch) {
    bedrooms = parseInt(bedMatch[1], 10);
    if (isNaN(bedrooms) || bedrooms < 0) bedrooms = null;
  }

  // Bathrooms - patterns like "2 bathrooms", "2 bath", "2ba", "2 baths"
  const bathMatch = lowerText.match(/(\d+)\s*(?:bathroom|baths?\b|ba\b)/i);
  if (bathMatch) {
    bathrooms = parseInt(bathMatch[1], 10);
    if (isNaN(bathrooms) || bathrooms < 0) bathrooms = null;
  }

  return { area_sqm, bedrooms, bathrooms };
}

function cleanImageUrls(urls: string[]): string[] {
  // Dedupe while preserving order
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of urls) {
    if (!seen.has(url)) {
      seen.add(url);
      deduped.push(url);
    }
  }
  // Cap at 20
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

  // Extract from img tags - check all possible attributes
  $el.find("img").each((_, img) => {
    const $img = $(img);

    // src attribute
    const src = $img.attr("src");
    if (src) addImage(src);

    // data-src (lazy loading)
    const dataSrc = $img.attr("data-src");
    if (dataSrc) addImage(dataSrc);

    // data-lazy (lazy loading variant)
    const dataLazy = $img.attr("data-lazy");
    if (dataLazy) addImage(dataLazy);

    // data-lazy-src (another variant)
    const dataLazySrc = $img.attr("data-lazy-src");
    if (dataLazySrc) addImage(dataLazySrc);

    // data-original (some lazy loaders)
    const dataOriginal = $img.attr("data-original");
    if (dataOriginal) addImage(dataOriginal);

    // srcset - extract URLs from srcset attribute
    const srcset = $img.attr("srcset") || $img.attr("data-srcset");
    if (srcset) {
      // srcset format: "url1 1x, url2 2x" or "url1 100w, url2 200w"
      const srcsetParts = srcset.split(",");
      for (const part of srcsetParts) {
        const urlMatch = part.trim().split(/\s+/)[0];
        if (urlMatch) addImage(urlMatch);
      }
    }
  });

  // Extract from source tags (picture elements)
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

  // Extract from background-image in style attributes
  $el.find("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    // Match url(...) patterns, handling quotes and no-quotes
    const bgMatches = style.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of bgMatches) {
      if (match[1]) addImage(match[1]);
    }
  });

  // Also check the element itself for style
  const elStyle = $el.attr("style") || "";
  if (elStyle) {
    const bgMatches = elStyle.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi);
    for (const match of bgMatches) {
      if (match[1]) addImage(match[1]);
    }
  }

  // Check data-background attributes
  $el.find("[data-background], [data-bg]").each((_, el) => {
    const $bgEl = $(el);
    const dataBg = $bgEl.attr("data-background") || $bgEl.attr("data-bg");
    if (dataBg) addImage(dataBg);
  });

  return imageUrls;
}

export function parseSimplyCapeVerde(
  html: string,
  sourceId: string,
  sourceName: string,
  baseUrl: string
): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  const now = new Date();

  // Try multiple possible selectors for listing cards
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

  // If no cards found, try to find any links to /property/ pages
  if ($cards.length === 0) {
    const propertyLinks = $('a[href*="/property/"]');
    const processedUrls = new Set<string>();

    propertyLinks.each((_, el) => {
      const $link = $(el);
      const href = $link.attr("href");
      if (!href || processedUrls.has(href)) return;
      processedUrls.add(href);

      const detailUrl = makeAbsoluteUrl(href, baseUrl);

      // Try to get parent container with more info
      const $container = $link.closest("div, article, section, li").first();

      // Extract title
      let title = $link.find("h1, h2, h3, h4").first().text().trim();
      if (!title) title = $link.text().trim();
      if (!title) title = $container.find("h1, h2, h3, h4").first().text().trim();

      // Clean title
      if (title) {
        title = title.replace(/\s+/g, " ").trim();
        if (title.length > 200) title = title.slice(0, 200);
      }

      // Extract price
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

      // Extract images using comprehensive extraction
      const imageUrls = extractImagesFromElement($, $container, baseUrl);

      // Extract location
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

      // Extract description snippet
      let description = "";
      const $desc = $container.find("p, .description, .excerpt, .summary").first();
      if ($desc.length) {
        description = $desc.text().trim().replace(/\s+/g, " ");
        if (description.length > 300) description = description.slice(0, 300) + "...";
      }

      // Extract specs from meta elements first, fallback to text
      let specs = extractSpecsFromMetaElements($, $container);
      const textSpecs = extractSpecsFromText(containerText + " " + (title || ""));

      // Use table specs if available, otherwise fallback to text
      const area_sqm = specs.area_sqm ?? textSpecs.area_sqm;
      const bedrooms = specs.bedrooms ?? textSpecs.bedrooms;
      const bathrooms = specs.bathrooms ?? textSpecs.bathrooms;

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
          area_sqm,
          bedrooms,
          bathrooms,
        });
      }
    });
  } else {
    // Process found cards
    $cards.each((_, card) => {
      const $card = $(card);

      // Extract detail URL
      const $link = $card.find("a[href*='/property/']").first();
      const href = $link.attr("href") || $card.find("a").first().attr("href");
      const detailUrl = href ? makeAbsoluteUrl(href, baseUrl) : "";

      // Extract title
      let title = $card.find("h1, h2, h3, h4, .title, .name").first().text().trim();
      if (!title) title = $link.text().trim();
      title = title.replace(/\s+/g, " ").trim();
      if (title.length > 200) title = title.slice(0, 200);

      // Extract price
      let priceText = $card.find(".price, .es-price, [class*='price']").first().text().trim();
      if (!priceText) {
        const cardText = $card.text();
        const priceMatch = cardText.match(/€[\d,]+|[\d,]+\s*€/);
        if (priceMatch) priceText = priceMatch[0];
      }
      const price = parsePrice(priceText);

      // Extract images using comprehensive extraction
      const imageUrls = extractImagesFromElement($, $card, baseUrl);

      // Extract location
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

      // Extract description
      let description = $card.find(".description, .excerpt, p").first().text().trim();

      // Extract specs from meta elements first, fallback to text
      const cardText = $card.text();
      let specs = extractSpecsFromMetaElements($, $card);
      const textSpecs = extractSpecsFromText(cardText + " " + (title || ""));

      // Use table specs if available, otherwise fallback to text
      const area_sqm = specs.area_sqm ?? textSpecs.area_sqm;
      const bedrooms = specs.bedrooms ?? textSpecs.bedrooms;
      const bathrooms = specs.bathrooms ?? textSpecs.bathrooms;

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
          area_sqm,
          bedrooms,
          bathrooms,
        });
      }
    });
  }

  return listings;
}
