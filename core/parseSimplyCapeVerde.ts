import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio, Element } from "cheerio";
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
  createdAt: Date;
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
  if (lower.includes("logo")) return false;
  if (lower.includes("icon")) return false;
  if (lower.includes("avatar")) return false;
  if (lower.includes("placeholder") && !lower.includes("property")) return false;
  if (lower.includes("spinner")) return false;
  if (lower.includes("loading")) return false;
  if (lower.endsWith(".svg")) return false;
  if (lower.endsWith(".gif") && lower.includes("load")) return false;
  return true;
}

function extractImagesFromElement($: CheerioAPI, $el: Cheerio<Element>, baseUrl: string): string[] {
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

      if (title || price) {
        listings.push({
          id: `scv_${generateListingId(title || "", price, detailUrl)}`,
          sourceId,
          sourceName,
          title: title || undefined,
          price,
          description: description || undefined,
          imageUrls: imageUrls.slice(0, 10),
          location: location || undefined,
          detailUrl,
          createdAt: now,
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
      description = description.replace(/\s+/g, " ");
      if (description.length > 300) description = description.slice(0, 300) + "...";

      if (title || price) {
        listings.push({
          id: `scv_${generateListingId(title || "", price, detailUrl)}`,
          sourceId,
          sourceName,
          title: title || undefined,
          price,
          description: description || undefined,
          imageUrls: imageUrls.slice(0, 10),
          location: location || undefined,
          detailUrl,
          createdAt: now,
        });
      }
    });
  }

  return listings;
}
