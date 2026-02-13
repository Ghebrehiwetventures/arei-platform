import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import * as crypto from "crypto";
import { fetchHtml } from "./fetchHtml";

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

  // Terra uses "€ 130.000" format (periods as thousands separator)
  // Also handles "130 000 €" or "€130,000"
  let cleaned = priceText.replace(/€/g, "").trim();

  // Replace periods used as thousands separator (European format)
  // If format is "130.000" (with period), it's likely thousands separator
  if (/^\d{1,3}\.\d{3}$/.test(cleaned) || /^\d{1,3}\.\d{3}\.\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }

  // Remove spaces (for "130 000" format)
  cleaned = cleaned.replace(/\s/g, "");

  // Remove commas
  cleaned = cleaned.replace(/,/g, "");

  // Extract just digits
  cleaned = cleaned.replace(/[^\d]/g, "");

  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0) return undefined;

  // If number is very small (< 1000), it's likely in thousands format
  // Terra Cabo Verde shows prices like "130" meaning €130,000
  if (num < 1000 && num > 10) {
    return num * 1000;
  }

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

function extractImagesFromStyleBlocks($: CheerioAPI, $el: Cheerio<AnyNode>, baseUrl: string): string[] {
  const imageUrls: string[] = [];

  const classes = new Set<string>();
  $el.find("[class]").each((_, el) => {
    const classAttr = $(el).attr("class") || "";
    classAttr.split(/\s+/).forEach((c) => {
      if (c) classes.add(c);
    });
  });
  const elClass = $el.attr("class") || "";
  elClass.split(/\s+/).forEach((c) => {
    if (c) classes.add(c);
  });

  $("style").each((_, styleEl) => {
    const styleContent = $(styleEl).text();
    for (const className of classes) {
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

function parseListingsFromHtml(
  html: string,
  sourceId: string,
  sourceName: string,
  baseUrl: string,
  processedUrls: Set<string>,
  now: Date
): ParsedListing[] {
  const $ = cheerio.load(html);
  const listings: ParsedListing[] = [];

  // Find property links
  const propertyLinks = $('a[href*="/properties/"]');

  propertyLinks.each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");

    // Skip pagination, category, and non-property links
    if (!href) return;
    if (href.includes("/page/")) return;
    if (href.includes("?e-page-")) return; // pagination query param
    if (processedUrls.has(href)) return;

    // Only accept /properties/<slug>/ URLs (actual detail pages)
    // Reject: /properties/ , /properties/?e-page-xxx
    try {
      const parsed = new URL(href, baseUrl);
      const pathname = parsed.pathname;
      // Must match /properties/<slug>/ where slug is non-empty
      const match = pathname.match(/^\/properties\/([^/]+)\/?$/);
      if (!match || !match[1]) return;
    } catch {
      return;
    }

    processedUrls.add(href);

    const detailUrl = makeAbsoluteUrl(href, baseUrl);

    // Find the property card container - Terra uses e-loop-item classes
    let $container = $link.closest("[class*='e-loop-item']").first();
    if ($container.length === 0) {
      $container = $link.closest("div").first();
    }
    if ($container.length === 0) return;

    // Extract title from .elementor-heading-title (h3 elements)
    // Look for the property name, not the location
    const $titles = $container.find(".elementor-heading-title, h3");
    let title = "";

    $titles.each((_, titleEl) => {
      const text = $(titleEl).text().trim();
      // Skip if it's just a location name
      const locationOnly = ["boa vista", "sal", "praia", "mindelo", "santiago", "santa maria"];
      const textLower = text.toLowerCase();

      // If text is longer and not just a location, use it as title
      if (text.length > 15 && !locationOnly.includes(textLower)) {
        if (!title || text.length > title.length) {
          title = text;
        }
      }
    });

    // If no good title found, try to get it from the link text or URL
    if (!title) {
      // Extract from URL slug
      const urlParts = detailUrl.split("/").filter((p) => p);
      const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      if (slug && slug !== "properties") {
        title = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    title = title.replace(/\s+/g, " ").trim();
    if (title.length > 200) title = title.slice(0, 200);

    // Extract price - look for € symbol with numbers
    let price: number | undefined;
    const containerText = $container.text();

    // Match patterns like "€ 130.000" or "€130,000" or "130 000 €"
    const pricePatterns = [
      /€\s*[\d.\s,]+/g,
      /[\d.\s,]+\s*€/g,
    ];

    for (const pattern of pricePatterns) {
      const matches = containerText.matchAll(pattern);
      for (const match of matches) {
        const parsed = parsePrice(match[0]);
        // Take the largest price found (likely the property price, not fees)
        if (parsed && parsed > 10000 && (!price || parsed > price)) {
          price = parsed;
        }
      }
    }

    // Extract images from style blocks
    const imageUrls = extractImagesFromStyleBlocks($, $container, baseUrl);

    // Also check for regular img tags
    $container.find("img").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src");
      if (src) {
        const absUrl = makeAbsoluteUrl(src, baseUrl);
        if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
          imageUrls.push(absUrl);
        }
      }
    });

    // Extract location
    let location = "";
    const locationPatterns = [/Boa Vista/i, /Sal\b/i, /Santa Maria/i, /Praia/i, /Mindelo/i, /Santiago/i];
    for (const pattern of locationPatterns) {
      const match = containerText.match(pattern);
      if (match) {
        location = match[0];
        break;
      }
    }

    // Skip entries that are clearly not property listings
    if (!title || title.length < 5) return;
    if (title.toLowerCase() === "en" || title.toLowerCase() === "pt") return;

    listings.push({
      id: `tcv_${generateListingId(title, price, detailUrl)}`,
      sourceId,
      sourceName,
      title,
      price,
      description: undefined, // Terra doesn't show descriptions on list page
      imageUrls: imageUrls.slice(0, 10),
      location: location || undefined,
      detailUrl,
      createdAt: now,
    });
  });

  return listings;
}

export function parseTerraCaboVerde(
  html: string,
  sourceId: string,
  sourceName: string,
  baseUrl: string
): ParsedListing[] {
  const now = new Date();
  const processedUrls = new Set<string>();
  const listings = parseListingsFromHtml(html, sourceId, sourceName, baseUrl, processedUrls, now);

  // DEBUG_TERRA: assert no pagination URLs leaked through
  if (process.env.DEBUG_TERRA === "1") {
    const paginationUrls = listings.filter((l) => l.detailUrl?.includes("?e-page-"));
    console.log(`[DEBUG_TERRA] detailUrls with ?e-page-: ${paginationUrls.length}`);
    if (paginationUrls.length > 0) {
      console.log(`[DEBUG_TERRA] WARNING: pagination URLs found:`, paginationUrls.map((l) => l.detailUrl));
    }
  }

  return listings;
}

const MAX_LISTINGS = 100;
const BASE_URL = "https://terracaboverde.com/properties/";
const PAGE_DELAY_MS = 2500; // Delay between page fetches to prevent rate limiting

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseTerraCaboVerdePaginated(
  sourceId: string,
  sourceName: string
): Promise<ParsedListing[]> {
  const now = new Date();
  const processedUrls = new Set<string>();
  const allListings: ParsedListing[] = [];

  let page = 1;
  let hasMore = true;

  while (hasMore && allListings.length < MAX_LISTINGS) {
    // Add delay between pages (skip for first page)
    if (page > 1) {
      const jitter = Math.floor(Math.random() * 500); // 0-500ms jitter
      const delayMs = PAGE_DELAY_MS + jitter;
      if (process.env.DEBUG_TERRA === "1") {
        console.log(`[DEBUG_TERRA] Waiting ${delayMs}ms before fetching page ${page}...`);
      }
      await sleep(delayMs);
    }

    const url = page === 1
      ? BASE_URL
      : `${BASE_URL}?e-page=${page}`;

    if (process.env.DEBUG_TERRA === "1") {
      console.log(`[DEBUG_TERRA] Fetching page ${page}: ${url}`);
    }

    const result = await fetchHtml(url);

    if (!result.success || !result.html) {
      if (process.env.DEBUG_TERRA === "1") {
        console.log(`[DEBUG_TERRA] Failed to fetch page ${page}: ${result.error}`);
      }
      hasMore = false;
      break;
    }

    if (result.statusCode !== 200) {
      if (process.env.DEBUG_TERRA === "1") {
        console.log(`[DEBUG_TERRA] Page ${page} returned status ${result.statusCode}`);
      }
      hasMore = false;
      break;
    }

    const pageListings = parseListingsFromHtml(
      result.html,
      sourceId,
      sourceName,
      BASE_URL,
      processedUrls,
      now
    );

    if (process.env.DEBUG_TERRA === "1") {
      console.log(`[DEBUG_TERRA] Page ${page}: found ${pageListings.length} listings (total so far: ${allListings.length + pageListings.length})`);
    }

    if (pageListings.length === 0) {
      if (process.env.DEBUG_TERRA === "1") {
        console.log(`[DEBUG_TERRA] No listings found on page ${page}, stopping pagination`);
      }
      hasMore = false;
    } else {
      allListings.push(...pageListings);
      page++;
      
      if (allListings.length >= MAX_LISTINGS) {
        if (process.env.DEBUG_TERRA === "1") {
          console.log(`[DEBUG_TERRA] Reached MAX_LISTINGS (${MAX_LISTINGS}), stopping pagination`);
        }
      }
    }
  }

  // DEBUG_TERRA: assert no pagination URLs leaked through
  if (process.env.DEBUG_TERRA === "1") {
    const paginationUrls = allListings.filter((l) => l.detailUrl?.includes("?e-page-"));
    console.log(`[DEBUG_TERRA] ===== Pagination Complete =====`);
    console.log(`[DEBUG_TERRA] Total pages fetched: ${page - 1}`);
    console.log(`[DEBUG_TERRA] Total listings extracted: ${allListings.length}`);
    console.log(`[DEBUG_TERRA] Unique URLs processed: ${processedUrls.size}`);
    console.log(`[DEBUG_TERRA] detailUrls with ?e-page-: ${paginationUrls.length}`);
    if (paginationUrls.length > 0) {
      console.log(`[DEBUG_TERRA] WARNING: pagination URLs found:`, paginationUrls.map((l) => l.detailUrl));
    }
  }

  return allListings.slice(0, MAX_LISTINGS);
}
