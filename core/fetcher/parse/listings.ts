/**
 * HTML listing parser: walks a list-page DOM with cheerio and produces an
 * array of GenericParsedListing using the source's selector + fallback config.
 *
 * Used by every HTML-based pagination strategy (query_param / offset /
 * path_segment / next_link / click_next / ajax_post). The json_api strategy
 * uses mapJsonItem instead.
 */

import * as cheerio from "cheerio";
import { deriveProjectMetadata } from "../../projectMetadata";
import type { GenericParsedListing, SourceFetchConfig } from "../types";
import { dedupeImageUrls, isValidImageUrl } from "./images";
import { parsePrice } from "./price";
import {
  applyDetailUrlRewrite,
  extractIdFromUrl,
  generateListingId,
  makeAbsoluteUrl,
} from "./url";

/**
 * Extract background-image URLs declared in `<style>` blocks for classes that
 * appear on or inside the listing container. Sites that build cards from CSS
 * (no `<img>` tags) need this fallback.
 */
export function extractImagesFromStyleBlocks(
  $: cheerio.CheerioAPI,
  $el: cheerio.Cheerio<any>,
  baseUrl: string,
): string[] {
  const imageUrls: string[] = [];
  const classes = new Set<string>();

  $el.find("[class]").each((_, el) => {
    const classAttr = $(el).attr("class") || "";
    classAttr.split(/\s+/).forEach((c) => c && classes.add(c));
  });

  const elClass = $el.attr("class") || "";
  elClass.split(/\s+/).forEach((c) => c && classes.add(c));

  $("style").each((_, styleEl) => {
    const styleContent = $(styleEl).text();
    for (const className of classes) {
      const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(
        `\\.${escaped}[^{]*\\{[^}]*background-image:\\s*url\\(\\s*['"]?([^'")]+)['"]?\\s*\\)`,
        "gi",
      );
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

/**
 * Parse a list page's HTML into GenericParsedListing rows. Idempotent across
 * pages of the same paginated run via `processedUrls`.
 */
export function parseListingsFromHtml(
  html: string,
  config: SourceFetchConfig,
  processedUrls: Set<string>,
  now: Date,
  debugErrors?: string[],
  pageUrl?: string,
): GenericParsedListing[] {
  const listings: GenericParsedListing[] = [];
  try {
    const $ = cheerio.load(html);

    const rejectPatterns = (config.reject_url_patterns || []).map((p) => new RegExp(p, "i"));

    $(config.selectors.listing).each((containerIndex, containerEl) => {
      try {
        const $container = $(containerEl);

        // Find detail link — container may itself be an <a>, or wrap one.
        let href = $container.attr("href");
        if (!href) {
          const linkSelector = config.selectors.link || "a[href]";
          const $link = $container.find(linkSelector).first();
          href = $link.attr("href");
        }
        if (!href) return;

        for (const pattern of rejectPatterns) {
          if (pattern.test(href)) return;
        }

        const absoluteUrl = makeAbsoluteUrl(href, config.base_url);
        if (processedUrls.has(absoluteUrl)) return;

        if (config.min_path_segments) {
          try {
            const parsed = new URL(absoluteUrl);
            const segments = parsed.pathname.split("/").filter((s) => s);
            if (segments.length < config.min_path_segments) return;
          } catch {
            return;
          }
        }

        // Title
        let title = "";
        if (config.selectors.title) {
          const $titles = $container.find(config.selectors.title);
          $titles.each((_, titleEl) => {
            const text = $(titleEl).text().trim();
            if (text.length >= 5 && (!title || text.length > title.length)) {
              title = text;
            }
          });
        }

        // Title fallback: from URL slug
        if (!title) {
          const urlParts = absoluteUrl.split("/").filter((p) => p);
          const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          if (slug && !slug.includes("?")) {
            title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          }
        }

        title = title.replace(/\s+/g, " ").trim().slice(0, 200);

        // Price
        let price: number | undefined;
        let priceText = "";
        if (config.selectors.price) {
          priceText = $container.find(config.selectors.price).first().text();
          price = parsePrice(priceText, config.price_format);
        }

        // Price fallback: search container text for €-bounded numbers
        if (!price) {
          const containerText = $container.text();
          const pricePatterns = [/€\s*[\d.\s,]+/g, /[\d.\s,]+\s*€/g];
          for (const pattern of pricePatterns) {
            const matches = containerText.matchAll(pattern);
            for (const match of matches) {
              const parsed = parsePrice(match[0], config.price_format);
              if (parsed && parsed > 10000 && (!price || parsed > price)) {
                price = parsed;
              }
            }
          }
        }

        // Images — from CSS background-image declarations…
        const imageUrls = extractImagesFromStyleBlocks($, $container, config.base_url);

        // …and from <img> / <image> tags (including inline background-image styles).
        const imgSelector = config.selectors.image || "img, image";
        $container.find(imgSelector).each((_, img) => {
          const src = $(img).attr("src") || $(img).attr("data-src") || $(img).attr("xlink:href");
          if (src) {
            const absUrl = makeAbsoluteUrl(src, config.base_url);
            if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
              imageUrls.push(absUrl);
            }
          }

          // Sites that lazy-load via div/span with `style="background-image:url(...)"`
          // instead of <img>.
          const style = $(img).attr("style") || "";
          const bgMatch = style.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
          if (bgMatch?.[1]) {
            const absUrl = makeAbsoluteUrl(bgMatch[1], config.base_url);
            if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
              imageUrls.push(absUrl);
            }
          }
        });

        // SVG/XML-style <image> with src to known image CDNs (op24 / roam).
        $container.find("image[src*='prop24'], image[src*='roam']").each((_, img) => {
          const src = $(img).attr("src");
          if (src) {
            const absUrl = makeAbsoluteUrl(src, config.base_url);
            if (absUrl && isValidImageUrl(absUrl) && !imageUrls.includes(absUrl)) {
              imageUrls.push(absUrl);
            }
          }
        });

        // Location
        let location = "";
        if (config.location_patterns && config.location_patterns.length > 0) {
          const containerText = $container.text();
          const imgAlts = $container.find("img").map((_, img) => $(img).attr("alt") || "").get().join(" ");
          const searchText = `${containerText} ${imgAlts}`;

          for (const patternStr of config.location_patterns) {
            const pattern = new RegExp(patternStr, "i");
            const match = searchText.match(pattern);
            if (match) {
              location = match[0];
              break;
            }
          }
        } else if (config.selectors.location) {
          // Join ALL matched elements, not just .first(). Some sites (e.g. op24)
          // split location into multiple links inside one container: "São Paulo"
          // (area) → "Santa Maria" (city). Taking only the first link loses the
          // city/island info the location resolver needs to disambiguate areas
          // whose name happens to be a substring of an unrelated place.
          const parts: string[] = [];
          $container.find(config.selectors.location).each((_, el) => {
            const t = $(el).text().trim();
            if (t && !parts.includes(t)) parts.push(t);
          });
          location = parts.join(", ");
        }

        // Location fallback: parse from URL path segments.
        // URLs like /for-sale/houses/nairobi/karen/123 → "Nairobi, Karen"
        if (!location && absoluteUrl) {
          try {
            const urlPath = new URL(absoluteUrl).pathname;
            const segments = urlPath.split("/").filter((s) => s && s.length > 2);
            const skipWords = [
              "for-sale",
              "for-rent",
              "houses",
              "apartments",
              "flats",
              "property",
              "properties",
              "listing",
              "detail",
              "en",
              "pt",
            ];
            const locationSegments = segments.filter(
              (s) => !skipWords.includes(s.toLowerCase()) && !/^\d+/.test(s),
            );
            if (locationSegments.length >= 1) {
              location = locationSegments
                .slice(0, 2)
                .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
                .join(", ");
            }
          } catch {
            // Invalid URL, skip.
          }
        }

        // Drop unusable rows
        if (!title || title.length < 5) return;
        if (title.toLowerCase() === "en" || title.toLowerCase() === "pt") return;

        const idPrefix = config.id_prefix || config.id.replace(/^cv_/, "");
        const urlId = extractIdFromUrl(absoluteUrl, config.id_url_pattern);
        const rewrittenUrl = applyDetailUrlRewrite(absoluteUrl, config.detail_url_rewrite);

        const projectMetadata = deriveProjectMetadata({
          title,
          price,
          priceText,
        });

        listings.push({
          id: urlId
            ? `${idPrefix}_${urlId}`
            : generateListingId(idPrefix, title, price, rewrittenUrl),
          sourceId: config.id,
          sourceName: config.name,
          source_ref: projectMetadata.source_ref,
          title,
          price,
          priceText,
          project_flag: projectMetadata.project_flag,
          project_start_price: projectMetadata.project_start_price,
          description: undefined, // not available on list pages
          imageUrls: dedupeImageUrls(imageUrls).slice(0, 10),
          location: location || undefined,
          detailUrl: rewrittenUrl?.replace(/\/+$/, "") || rewrittenUrl,
          createdAt: now,
        });
        processedUrls.add(absoluteUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const contextParts = [
          "listing_parse_error",
          `source=${config.id}`,
          pageUrl ? `page=${pageUrl}` : null,
          `container_index=${containerIndex}`,
          `error=${JSON.stringify(errorMessage)}`,
        ].filter(Boolean);
        debugErrors?.push(contextParts.join(" "));
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const contextParts = [
      "page_parse_error",
      `source=${config.id}`,
      pageUrl ? `page=${pageUrl}` : null,
      `error=${JSON.stringify(errorMessage)}`,
    ].filter(Boolean);
    debugErrors?.push(contextParts.join(" "));
    return [];
  }

  return listings;
}
