import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { DetailPlugin, DetailExtractResult } from "../types";

// Negation words to check (lowercase)
const NEGATION_WORDS = ["no", "not", "without", "sem", "não", "nao"];

// Amenity keywords with English and Portuguese variants
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

// Fallback widget limit to avoid scanning entire page
const FALLBACK_WIDGET_LIMIT = 8;

/**
 * Check if text matches CSS-like pattern (leakage guard)
 */
function isCssLikeValue(value: string): boolean {
  const lower = value.toLowerCase();
  if (/^[a-z-]+\s*:\s*\d+px/i.test(value)) return true;
  if (lower.includes("{") || lower.includes("}")) return true;
  if (lower.includes("px;")) return true;
  return false;
}

/**
 * Parse a clean integer from a value string using word-boundary match.
 * Returns null if no clean 1-2 digit integer found or value is "-".
 */
function parseCleanInteger(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Parse numeric value (allows decimals) for area fields.
 */
function parseNumericValue(value: string): number | null {
  if (!value || value.trim() === "-") return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const cleaned = match[1].replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Check if a negation appears within N words before a keyword position in text.
 */
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
 * Helper: Extract spec pairs from a list of widget elements.
 * Stops when encountering a widget with h2 "Description".
 */
function extractSpecPairsFromWidgets(
  $: CheerioAPI,
  widgets: Element[],
  specPairs: { label: string; value: string }[]
): void {
  for (const w of widgets) {
    // Stop condition: if this widget contains h2 "Description", break
    const hasDescription = $(w).find("h2").filter((_, el) =>
      $(el).text().trim().toLowerCase() === "description"
    ).length > 0;
    if (hasDescription) break;

    // Collect spec pairs from span.pre-data inside this widget
    $(w).find("span.pre-data, .pre-data").each((_, pre) => {
      const labelRaw = $(pre).text().trim();
      const label = labelRaw.replace(/:$/, "").trim();
      if (!label) return;

      // Value: text of the closest list item or row, minus label text
      const $row = $(pre).closest("li, p, div");
      const full = $row.text().trim();
      let value = full.replace(labelRaw, "").trim();

      // Ignore empty or "-" values
      if (!value || value === "-") return;

      // CSS leakage guard
      if (isCssLikeValue(value)) return;

      specPairs.push({ label, value });
    });
  }
}

export const terraCaboVerdePlugin: DetailPlugin = {
  sourceId: "cv_terracaboverde",

  extract(html: string, baseUrl: string): DetailExtractResult {
    // Guard: reject list pages
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

    // ========================================
    // A) Parse "Property data" section
    // ========================================
    let propertyDataFound = false;

    // DEBUG: Print all h2 headings found
    if (process.env.DEBUG_TERRA === "1") {
      const h2Texts: string[] = [];
      $("h2").each((i, h2El) => {
        if (i < 30) h2Texts.push($(h2El).text().trim());
      });
      console.log("[DEBUG_TERRA] All h2 headings:", JSON.stringify(h2Texts, null, 2));
    }

    // Find h2 with text "Property data" (case-insensitive)
    $("h2").each((_, h2El) => {
      const h2Text = $(h2El).text().trim().toLowerCase();
      if (h2Text !== "property data") return;

      propertyDataFound = true;

      if (process.env.DEBUG_TERRA === "1") {
        console.log("[DEBUG_TERRA] Matched h2 text:", $(h2El).text().trim());
      }

      const $h2 = $(h2El);
      const $headingWidget = $h2.closest(".elementor-widget");
      const $section = $headingWidget.closest("section, .elementor-section, .elementor-top-section");

      // Try section-based traversal first
      let usedSectionTraversal = false;
      if ($section.length > 0) {
        const $widgets = $section.find(".elementor-widget");
        const widgetsArray = $widgets.toArray();

        // Find index of heading widget
        let headingIndex = -1;
        const headingNode = $headingWidget.get(0);
        for (let i = 0; i < widgetsArray.length; i++) {
          if (widgetsArray[i] === headingNode) {
            headingIndex = i;
            break;
          }
        }

        if (process.env.DEBUG_TERRA === "1") {
          console.log("[DEBUG_TERRA] Section found:", true);
          console.log("[DEBUG_TERRA] Total widgets in section:", widgetsArray.length);
          console.log("[DEBUG_TERRA] Heading widget index:", headingIndex);
        }

        // Only use section traversal if headingIndex > 0 (valid index found)
        if (headingIndex >= 0) {
          usedSectionTraversal = true;
          const candidateWidgets = widgetsArray.slice(headingIndex + 1);

          if (process.env.DEBUG_TERRA === "1") {
            console.log("[DEBUG_TERRA] Candidate widgets from section:", candidateWidgets.length);
            for (let i = 0; i < Math.min(3, candidateWidgets.length); i++) {
              const text = $(candidateWidgets[i]).text().trim().slice(0, 150);
              console.log(`[DEBUG_TERRA] Widget ${headingIndex + 1 + i} text: "${text}"`);
            }
          }

          extractSpecPairsFromWidgets($, candidateWidgets, specPairs);
        }
      }

      // Fallback: use page-ordered widgets if section traversal yielded no specs
      if (specPairs.length === 0) {
        if (process.env.DEBUG_TERRA === "1") {
          console.log("[DEBUG_TERRA] Using fallback page-ordered widgets");
        }

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
            // Stop on h2 "Description"
            const hasDescription = $(w).find("h2").filter((_, el) =>
              $(el).text().trim().toLowerCase() === "description"
            ).length > 0;
            if (hasDescription) break;
            candidateWidgets.push(w);
          }

          if (process.env.DEBUG_TERRA === "1") {
            console.log("[DEBUG_TERRA] Fallback candidateWidgets length:", candidateWidgets.length);
          }

          extractSpecPairsFromWidgets($, candidateWidgets, specPairs);
        }
      }

      // DEBUG: Log specPairs after parsing
      if (process.env.DEBUG_TERRA === "1") {
        console.log("[DEBUG_TERRA] specPairs:", JSON.stringify(specPairs, null, 2));
      }
    });

    // DEBUG: Log if property data section was not found
    if (process.env.DEBUG_TERRA === "1" && !propertyDataFound) {
      console.log("[DEBUG_TERRA] No 'Property data' h2 found");
    }

    // ========================================
    // B) Populate structured fields
    // ========================================
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

    // ========================================
    // C) Build amenities list
    // ========================================

    // C.1) Add "Terrace" if terrace area is present and > 0
    if (terraceArea !== null && terraceArea > 0) {
      amenities.add("Terrace");
    }

    // C.2) Add "Parking" if parking spaces is present and > 0
    if (parkingSpaces !== null && parkingSpaces > 0) {
      amenities.add("Parking");
    }

    // C.3) Extract description for keyword scan
    let description: string | undefined;
    const descHeading = $("h2:contains('Description')").first();
    if (descHeading.length) {
      const descContainer = descHeading.closest(".elementor-element").next(".elementor-widget-text-editor");
      if (descContainer.length) {
        description = descContainer.find("p").map((_, el) => $(el).text().trim()).get().join(" ");
      }
    }

    // Fallback: look for any substantial paragraph text
    if (!description || description.length < 30) {
      $(".elementor-widget-text-editor p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && (!description || text.length > description.length)) {
          description = text;
        }
      });
    }

    // C.4) Keyword scan with negation guard
    if (description) {
      extractAmenitiesFromText(description, amenities);
    }

    // ========================================
    // Extract images from #prop-gallery (property-specific)
    // ========================================
    $("#prop-gallery .swiper-slide img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http") && !imageUrls.includes(src)) {
        imageUrls.push(src);
      }
    });

    // Also extract from lightbox hrefs within #prop-gallery
    $("#prop-gallery .swiper-slide a[href*='.jpg'], #prop-gallery .swiper-slide a[href*='.png'], #prop-gallery .swiper-slide a[href*='.jpeg']").each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.startsWith("http") && !imageUrls.includes(href)) {
        imageUrls.push(href);
      }
    });

    // Fallback: if no images in #prop-gallery, try elementor-image-carousel
    if (imageUrls.length === 0) {
      $(".elementor-image-carousel .swiper-slide img").each((_, el) => {
        const src = $(el).attr("src");
        if (src && src.startsWith("http") && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
      });
    }

    // Extract title from h1 or page title
    let title: string | undefined;
    const h1 = $("h1").first().text().trim();
    if (h1 && h1.length > 5) {
      title = h1;
    }

    // ========================================
    // E) Debug output (guarded by DEBUG_TERRA=1)
    // ========================================
    if (process.env.DEBUG_TERRA === "1") {
      console.log(JSON.stringify({
        source_url: baseUrl,
        spec_pairs_count: specPairs.length,
        bedrooms,
        bathrooms,
        parkingSpaces,
        terraceArea,
        amenities: Array.from(amenities),
      }, null, 2));
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
  },
};
