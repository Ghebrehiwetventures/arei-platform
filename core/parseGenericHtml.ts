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

function extractImagesFromStyleBlocks($: CheerioAPI, $el: Cheerio<Element>, baseUrl: string): string[] {
  const imageUrls: string[] = [];

  // Get all classes from elements within this container
  const classes = new Set<string>();
  $el.find("[class]").each((_, el) => {
    const classAttr = $(el).attr("class") || "";
    classAttr.split(/\s+/).forEach((c) => {
      if (c) classes.add(c);
    });
  });
  // Also add classes from the element itself
  const elClass = $el.attr("class") || "";
  elClass.split(/\s+/).forEach((c) => {
    if (c) classes.add(c);
  });

  // Find all style blocks and extract background-image URLs for matching classes
  $("style").each((_, styleEl) => {
    const styleContent = $(styleEl).text();
    // Match patterns like .classname { ... background-image: url(...) ... }
    for (const className of classes) {
      // Escape special regex characters in class name
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\.${escaped}[^{]*\\{[^}]*background-image:\\s*url\\(\\s*['"]?([^'")]+)['"]?\\s*\\)`, "gi");
      let match;
      while ((match = regex.exec(styleContent)) !== null) {
        if (match[1]) {
          const absUrl = makeAbsoluteUrl(match[1], baseUrl);
          if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
            imageUrls.push(absUrl);
          }
        }
      }
    }
  });

  return imageUrls;
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

  // Also extract from style blocks (Elementor-style CSS)
  const styleBlockImages = extractImagesFromStyleBlocks($, $el, baseUrl);
  for (const img of styleBlockImages) {
    addImage(img);
  }

  return imageUrls;
}

export function parseGenericHtml(
  html: string,
  sourceId: string,
  sourceName: string,
  baseUrl: string
): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];
  const now = new Date();
  const processedUrls = new Set<string>();

  // Find property links - various patterns used by different sites
  const propertyLinks = $('a[href*="/property"], a[href*="property"], a[href*="/properties"], a[href*="detail"], a[href*="/listing"], a[href*="detalhe"], a[href*="imovel"], a[href*="propriedade"]');

  propertyLinks.each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");
    if (!href || processedUrls.has(href)) return;
    processedUrls.add(href);

    const detailUrl = makeAbsoluteUrl(href, baseUrl);

    // Try to find a meaningful container - prefer larger card-like containers
    let $container = $link.closest(".slide, .property-card, .listing-card, .property-item, .card, article").first();
    if ($container.length === 0) {
      // Fall back to parent div but try to get a larger one with images
      $container = $link.closest("div").first();
      // If this div has no images, try parent
      if ($container.length && $container.find("img").length === 0) {
        const $parent = $container.parent().closest("div, article, section, li").first();
        if ($parent.length && $parent.find("img").length > 0) {
          $container = $parent;
        }
      }
    }
    if ($container.length === 0) return;

    // Skip if this looks like navigation, not a property listing
    const containerClass = ($container.attr("class") || "").toLowerCase();
    const containerText = $container.text().trim();
    if (containerText.length < 20) return; // Too small to be a property card
    if (containerClass.includes("nav") || containerClass.includes("menu") || containerClass.includes("header") || containerClass.includes("footer")) return;

    // Extract title
    let title = $container.find("h1, h2, h3, h4, .title, .name").first().text().trim();
    if (!title) title = $link.text().trim();
    title = title.replace(/\s+/g, " ").trim();
    if (title.length > 200) title = title.slice(0, 200);

    // Extract price
    let priceText = "";
    const fullContainerText = $container.text();
    // Price patterns - look for currency with numbers, handle spaces in numbers (e.g., "109 000 €")
    const pricePatterns = [/€\s*[\d\s,]+/, /[\d\s,]+\s*€/, /£\s*[\d\s,]+/, /[\d\s,]+\s*£/, /\$\s*[\d\s,]+/];
    for (const pattern of pricePatterns) {
      const match = fullContainerText.match(pattern);
      if (match) {
        priceText = match[0];
        break;
      }
    }
    const price = parsePrice(priceText);

    // Extract images - also look in siblings and nearby elements for carousel structures
    let imageUrls = extractImagesFromElement($, $container, baseUrl);

    // If no images found, try looking at parent or sibling elements (for carousel layouts)
    if (imageUrls.length === 0) {
      const $parent = $container.parent();
      if ($parent.length) {
        imageUrls = extractImagesFromElement($, $parent, baseUrl);
      }
    }

    // Extract location
    let location = "";
    const locationPatterns = [/Santa Maria/i, /Sal/i, /Praia/i, /Mindelo/i, /Boa Vista/i, /Santiago/i, /Cape Verde/i, /Cabo Verde/i];
    for (const pattern of locationPatterns) {
      const match = fullContainerText.match(pattern);
      if (match) {
        location = match[0];
        break;
      }
    }

    // Extract description
    let description = "";
    const $desc = $container.find("p, .description, .excerpt").first();
    if ($desc.length) {
      description = $desc.text().trim().replace(/\s+/g, " ");
      if (description.length > 300) description = description.slice(0, 300) + "...";
    }

    // Skip navigation/info pages that aren't actual listings
    const skipTitles = ["serviços", "sobre", "contacto", "propriedades", "conhecer", "como comprar", "porquê investir", "venda a sua"];
    const titleLower = title.toLowerCase();
    let isNavLink = false;
    for (const skip of skipTitles) {
      if (titleLower.includes(skip) || titleLower === skip) {
        isNavLink = true;
        break;
      }
    }
    if (isNavLink && imageUrls.length === 0 && !price) return;

    if (title || price) {
      listings.push({
        id: `gen_${generateListingId(title || "", price, detailUrl)}`,
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

  return listings;
}
