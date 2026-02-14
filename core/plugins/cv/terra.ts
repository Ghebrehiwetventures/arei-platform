import * as cheerio from "cheerio";
import type { CheerioAPI, Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";
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

  let cleaned = priceText.replace(/€/g, "").trim();

  if (/^\d{1,3}\.\d{3}$/.test(cleaned) || /^\d{1,3}\.\d{3}\.\d{3}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }

  cleaned = cleaned.replace(/\s/g, "");
  cleaned = cleaned.replace(/,/g, "");
  cleaned = cleaned.replace(/[^\d]/g, "");

  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0) return undefined;

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

function parseList(html: string, sourceName: string, baseUrl: string): ListingSeed[] {
  const $ = cheerio.load(html);
  const listings: ListingSeed[] = [];
  const now = new Date();
  const processedUrls = new Set<string>();
  const sourceId = "cv_terracaboverde";

  const propertyLinks = $('a[href*="/properties/"]');

  propertyLinks.each((_, el) => {
    const $link = $(el);
    const href = $link.attr("href");

    if (!href) return;
    if (href.includes("/page/")) return;
    if (href.includes("?e-page-")) return;
    if (processedUrls.has(href)) return;

    try {
      const parsed = new URL(href, baseUrl);
      const pathname = parsed.pathname;
      const match = pathname.match(/^\/properties\/([^/]+)\/?$/);
      if (!match || !match[1]) return;
    } catch {
      return;
    }

    processedUrls.add(href);

    const detailUrl = makeAbsoluteUrl(href, baseUrl);

    let $container = $link.closest("[class*='e-loop-item']").first();
    if ($container.length === 0) {
      $container = $link.closest("div").first();
    }
    if ($container.length === 0) return;

    const $titles = $container.find(".elementor-heading-title, h3");
    let title = "";

    $titles.each((_, titleEl) => {
      const text = $(titleEl).text().trim();
      const locationOnly = ["boa vista", "sal", "praia", "mindelo", "santiago", "santa maria"];
      const textLower = text.toLowerCase();

      if (text.length > 15 && !locationOnly.includes(textLower)) {
        if (!title || text.length > title.length) {
          title = text;
        }
      }
    });

    if (!title) {
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

    let price: number | undefined;
    const containerText = $container.text();

    const pricePatterns = [
      /€\s*[\d.\s,]+/g,
      /[\d.\s,]+\s*€/g,
    ];

    for (const pattern of pricePatterns) {
      const matches = containerText.matchAll(pattern);
      for (const match of matches) {
        const parsed = parsePrice(match[0]);
        if (parsed && parsed > 10000 && (!price || parsed > price)) {
          price = parsed;
        }
      }
    }

    const imageUrls = extractImagesFromStyleBlocks($, $container, baseUrl);

    $container.find("img").each((_, img) => {
      const src = $(img).attr("src") || $(img).attr("data-src");
      if (src) {
        const absUrl = makeAbsoluteUrl(src, baseUrl);
        if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
          imageUrls.push(absUrl);
        }
      }
    });

    let location = "";
    const locationPatterns = [/Boa Vista/i, /Sal\b/i, /Santa Maria/i, /Praia/i, /Mindelo/i, /Santiago/i];
    for (const pattern of locationPatterns) {
      const match = containerText.match(pattern);
      if (match) {
        location = match[0];
        break;
      }
    }

    if (!title || title.length < 5) return;
    if (title.toLowerCase() === "en" || title.toLowerCase() === "pt") return;

    listings.push({
      id: `tcv_${generateListingId(title, price, detailUrl)}`,
      sourceId,
      sourceName,
      title,
      price,
      description: undefined,
      imageUrls: imageUrls.slice(0, 10),
      location: location || undefined,
      detailUrl,
      createdAt: now,
    });
  });

  return listings;
}

// ============================================
// DETAIL PAGE EXTRACTION
// ============================================

const NEGATION_WORDS = ["no", "not", "without", "sem", "não", "nao"];

const AMENITY_KEYWORDS: { keyword: string; amenity: string }[] = [
  { keyword: "pool", amenity: "Pool" },
  { keyword: "piscina", amenity: "Pool" },
  { keyword: "sea view", amenity: "Sea View" },
  { keyword: "vista mar", amenity: "Sea View" },
  { keyword: "balcony", amenity: "Balcony" },
  { keyword: "varanda", amenity: "Balcony" },
  { keyword: "garden", amenity: "Garden" },
  { keyword: "jardim", amenity: "Garden" },
  { keyword: "air conditioning", amenity: "Air Conditioning" },
  { keyword: "ar condicionado", amenity: "Air Conditioning" },
  { keyword: "wifi", amenity: "WiFi" },
  { keyword: "elevator", amenity: "Elevator" },
  { keyword: "elevador", amenity: "Elevator" },
  { keyword: "security", amenity: "Security" },
  { keyword: "segurança", amenity: "Security" },
];

function isCssLikeValue(value: string): boolean {
  const lower = value.toLowerCase();
  if (/^[a-z-]+\s*:\s*\d+px/i.test(value)) return true;
  if (lower.includes("{") || lower.includes("}")) return true;
  if (lower.includes("px;")) return true;
  return false;
}

function parseCleanInteger(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

function parseNumericValue(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const cleaned = match[1].replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function hasNegationBefore(text: string, keywordIndex: number, windowWords: number = 5): boolean {
  const before = text.slice(0, keywordIndex).toLowerCase();
  const words = before.split(/\s+/).filter(w => w.length > 0);
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

function extractSpecPairsFromWidgets(
  $: CheerioAPI,
  widgets: Element[],
  specPairs: { label: string; value: string }[]
): void {
  for (const w of widgets) {
    const hasDescription = $(w).find("h2").filter((_, el) =>
      $(el).text().trim().toLowerCase() === "description"
    ).length > 0;
    if (hasDescription) break;

    $(w).find("span.pre-data, .pre-data").each((_, pre) => {
      const labelRaw = $(pre).text().trim();
      const label = labelRaw.replace(/:$/, "").trim();
      if (!label) return;

      const $row = $(pre).closest("li, p, div");
      const full = $row.text().trim();
      let value = full.replace(labelRaw, "").trim();

      if (!value || value === "-") return;
      if (isCssLikeValue(value)) return;

      specPairs.push({ label, value });
    });
  }
}

function extractDetail(html: string, baseUrl: string): ListingDetail {
  if (baseUrl.includes("?e-page-")) {
    return { success: false, imageUrls: [] };
  }
  const url = new URL(baseUrl);
  if (url.pathname === "/properties/" || url.pathname === "/properties") {
    return { success: false, imageUrls: [] };
  }

  const $ = cheerio.load(html);
  const imageUrls: string[] = [];
  const specPairs: { label: string; value: string }[] = [];
  const amenities = new Set<string>();

  $("h2").each((_, h2El) => {
    const h2Text = $(h2El).text().trim().toLowerCase();
    if (h2Text !== "property data") return;

    const $h2 = $(h2El);
    const $headingWidget = $h2.closest(".elementor-widget");
    const $section = $headingWidget.closest("section, .elementor-section, .elementor-top-section");

    if ($section.length > 0) {
      const $widgets = $section.find(".elementor-widget");
      const widgetsArray = $widgets.toArray();

      let headingIndex = -1;
      const headingNode = $headingWidget.get(0);
      for (let i = 0; i < widgetsArray.length; i++) {
        if (widgetsArray[i] === headingNode) {
          headingIndex = i;
          break;
        }
      }

      if (headingIndex >= 0) {
        const candidateWidgets = widgetsArray.slice(headingIndex + 1);
        extractSpecPairsFromWidgets($, candidateWidgets, specPairs);
      }
    }

    if (specPairs.length === 0) {
      const allWidgets = $(".elementor-widget").toArray();
      const headingNode = $headingWidget.get(0);
      let headingIndex = -1;
      for (let i = 0; i < allWidgets.length; i++) {
        if (allWidgets[i] === headingNode) {
          headingIndex = i;
          break;
        }
      }

      if (headingIndex >= 0) {
        const candidateWidgets: Element[] = [];
        const limit = Math.min(allWidgets.length, headingIndex + 1 + 50);
        for (let i = headingIndex + 1; i < limit; i++) {
          const w = allWidgets[i];
          const hasDescription = $(w).find("h2").filter((_, el) =>
            $(el).text().trim().toLowerCase() === "description"
          ).length > 0;
          if (hasDescription) break;
          candidateWidgets.push(w);
        }
        extractSpecPairsFromWidgets($, candidateWidgets, specPairs);
      }
    }
  });

  let bedrooms: number | null = null;
  let bathrooms: number | null = null;
  let parkingSpaces: number | null = null;
  let terraceArea: number | null = null;

  for (const { label, value } of specPairs) {
    const lowerLabel = label.toLowerCase();

    if (lowerLabel === "bedrooms" || lowerLabel === "quartos") {
      const parsed = parseCleanInteger(value);
      if (parsed !== null && parsed < 10) {
        bedrooms = parsed;
      }
    } else if (lowerLabel === "bathrooms" || lowerLabel === "casas de banho") {
      const parsed = parseCleanInteger(value);
      if (parsed !== null && parsed < 10) {
        bathrooms = parsed;
      }
    } else if (lowerLabel === "parking spaces" || lowerLabel === "lugares de estacionamento") {
      const parsed = parseCleanInteger(value);
      if (parsed !== null && parsed < 10) {
        parkingSpaces = parsed;
      }
    } else if (lowerLabel === "terrace area" || lowerLabel === "área do terraço") {
      terraceArea = parseNumericValue(value);
    }
  }

  if (terraceArea !== null && terraceArea > 0) {
    amenities.add("Terrace");
  }

  if (parkingSpaces !== null && parkingSpaces > 0) {
    amenities.add("Parking");
  }

  let description: string | undefined;
  const descHeading = $("h2:contains('Description')").first();
  if (descHeading.length) {
    const descContainer = descHeading.closest(".elementor-element").next(".elementor-widget-text-editor");
    if (descContainer.length) {
      description = descContainer.find("p").map((_, el) => $(el).text().trim()).get().join(" ");
    }
  }

  if (!description || description.length < 30) {
    $(".elementor-widget-text-editor p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 50 && (!description || text.length > description.length)) {
        description = text;
      }
    });
  }

  if (description) {
    extractAmenitiesFromText(description, amenities);
  }

  $(".swiper-slide img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("http") && !imageUrls.includes(src)) {
      imageUrls.push(src);
    }
  });

  $(".swiper-slide a[href*='.jpg'], .swiper-slide a[href*='.png']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && href.startsWith("http") && !imageUrls.includes(href)) {
      imageUrls.push(href);
    }
  });

  let title: string | undefined;
  const h1 = $("h1").first().text().trim();
  if (h1 && h1.length > 5) {
    title = h1;
  }

  return {
    success: true,
    title,
    description,
    imageUrls,
    bedrooms,
    bathrooms,
    parkingSpaces,
    terraceArea,
    amenities: Array.from(amenities),
  };
}

// ============================================
// PLUGIN EXPORT
// ============================================

export const terraPlugin: SourcePlugin = {
  sourceId: "cv_terracaboverde",
  marketId: "cv",
  detailPolicy: "always",
  parseList,
  extractDetail,
};
