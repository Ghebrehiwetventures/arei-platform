import * as cheerio from "cheerio";
import { DetailPlugin, DetailExtractResult } from "../types";

const MAX_IMAGES = 15;

const REAL_ESTATE_TYPES = [
  "realestate",
  "residence",
  "apartment",
  "house",
  "accommodation",
  "lodging",
  "singlefamily",
  "product",
];

const REJECT_PATTERNS = [
  "/property/q_cdnize",
  "/property/to_auto",
  "/property/s_webp:avif",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "pinterest",
  "/wp-content/themes/",
  "/wp-content/plugins/",
  "logo",
  "icon",
];

export type HomesCasaVerdeExtractionSource = "jsonld" | "og_image" | "gallery_fallback" | "none";

export interface HomesCasaVerdeImageExtractionResult {
  imageUrls: string[];
  extractedCount: number;
  acceptedCount: number;
  extractionSource: HomesCasaVerdeExtractionSource;
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function normalizeUrl(value: string, baseUrl: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;

  try {
    const url = new URL(trimmed, baseUrl).href;
    return isHttpUrl(url) ? url : null;
  } catch {
    return null;
  }
}

function isAcceptedHomesCasaVerdeImage(url: string): boolean {
  const lower = url.toLowerCase();

  if (!isHttpUrl(url)) return false;
  if (!lower.includes("/wp-content/uploads/")) return false;
  if (!/\.(?:jpe?g|png|webp|avif)(?:[?#].*)?$/i.test(url)) return false;

  for (const pattern of REJECT_PATTERNS) {
    if (lower.includes(pattern)) return false;
  }

  return true;
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    deduped.push(url);
  }

  return deduped.slice(0, MAX_IMAGES);
}

function flattenJsonLdNodes(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => flattenJsonLdNodes(item));
  }

  if (!input || typeof input !== "object") {
    return [];
  }

  const record = input as Record<string, unknown>;
  const graph = record["@graph"];
  if (Array.isArray(graph)) {
    return [record, ...graph.flatMap((item) => flattenJsonLdNodes(item))];
  }

  return [record];
}

function isRelevantRealEstateNode(node: Record<string, unknown>): boolean {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];

  return types.some((value) => {
    if (typeof value !== "string") return false;
    const lower = value.toLowerCase();
    return REAL_ESTATE_TYPES.some((token) => lower.includes(token));
  });
}

function normalizeImageField(value: unknown, baseUrl: string): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeImageField(item, baseUrl));
  }

  if (typeof value === "string") {
    const url = normalizeUrl(value, baseUrl);
    return url ? [url] : [];
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = typeof record.url === "string" ? record.url : typeof record.contentUrl === "string" ? record.contentUrl : null;
    const url = direct ? normalizeUrl(direct, baseUrl) : null;
    return url ? [url] : [];
  }

  return [];
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function collectJsonLdDescription($: cheerio.CheerioAPI): string | undefined {
  let best: string | undefined;

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const nodes = flattenJsonLdNodes(parsed);
      for (const node of nodes) {
        if (!isRelevantRealEstateNode(node)) continue;
        if (typeof node.description !== "string") continue;

        const cleaned = decodeHtmlEntities(node.description);
        if (cleaned.length >= 50 && (!best || cleaned.length > best.length)) {
          best = cleaned;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blobs.
    }
  });

  return best;
}

function collectJsonLdImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const candidates: string[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const nodes = flattenJsonLdNodes(parsed);
      for (const node of nodes) {
        if (!isRelevantRealEstateNode(node) || node.image == null) continue;
        candidates.push(...normalizeImageField(node.image, baseUrl));
      }
    } catch {
      // Ignore malformed JSON-LD blobs for this source.
    }
  });

  return candidates;
}

function collectOgImage($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const content = $('meta[property="og:image"]').attr("content");
  const url = content ? normalizeUrl(content, baseUrl) : null;
  return url ? [url] : [];
}

function collectGalleryFallback($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const candidates: string[] = [];
  const selectors = [
    ".lightbox-gallery a[href]",
    ".lightbox-slider a[href]",
    ".property-banner a[href]",
    ".property-banner img",
    ".lightbox-gallery img",
    ".lightbox-slider img",
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized) candidates.push(normalized);
      }

      const src = $(el).attr("src") || $(el).attr("data-src");
      if (src) {
        const normalized = normalizeUrl(src, baseUrl);
        if (normalized) candidates.push(normalized);
      }
    });
  }

  return candidates;
}

function finalize(candidates: string[], source: HomesCasaVerdeExtractionSource): HomesCasaVerdeImageExtractionResult {
  const accepted = dedupe(candidates.filter(isAcceptedHomesCasaVerdeImage));
  return {
    imageUrls: accepted,
    extractedCount: candidates.length,
    acceptedCount: accepted.length,
    extractionSource: accepted.length > 0 ? source : "none",
  };
}

export function extractHomesCasaVerdeImages(html: string, baseUrl: string): HomesCasaVerdeImageExtractionResult {
  const $ = cheerio.load(html);

  const jsonLdCandidates = collectJsonLdImages($, baseUrl);
  const jsonLdResult = finalize(jsonLdCandidates, "jsonld");
  if (jsonLdResult.acceptedCount > 0) return jsonLdResult;

  const ogCandidates = collectOgImage($, baseUrl);
  const ogResult = finalize(ogCandidates, "og_image");
  if (ogResult.acceptedCount > 0) return ogResult;

  const galleryCandidates = collectGalleryFallback($, baseUrl);
  return finalize(galleryCandidates, "gallery_fallback");
}

export const homesCasaVerdePlugin: DetailPlugin = {
  sourceId: "cv_homescasaverde",

  extract(html: string, baseUrl: string): DetailExtractResult {
    const $ = cheerio.load(html);
    console.log(`[homesCasaVerde] ${baseUrl} ld+json blocks: ${$('script[type="application/ld+json"]').length}`);
    const extracted = extractHomesCasaVerdeImages(html, baseUrl);
    const description = collectJsonLdDescription($);
    return {
      success: extracted.acceptedCount > 0 || description !== undefined,
      imageUrls: extracted.imageUrls,
      description,
      error: extracted.acceptedCount > 0 || description !== undefined ? undefined : "No images or description extracted",
    };
  },
};
