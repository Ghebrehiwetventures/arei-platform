/**
 * CMS Presets - Fallback selector schemas for common platforms
 *
 * PoC Goal: If a source doesn't specify all selectors, fall back to
 * platform-specific defaults. Zero per-source hardcoding.
 */

import { SelectorsConfig } from "./configLoader";

export type CMSType = "elementor" | "wordpress" | "wix" | "squarespace" | "shopify" | "custom";

export interface CMSPreset {
  name: string;
  description: string;
  selectors: SelectorsConfig;
  pagination: {
    type: "query_param" | "next_link" | "none";
    param?: string;
    next_selector?: string;
  };
  /** Patterns that indicate this CMS (for auto-detection) */
  detection_patterns: string[];
  /** Common image lazy-load attributes */
  image_attrs: string[];
  /** Price patterns common to this CMS */
  price_patterns: RegExp[];
}

// ============================================
// CMS PRESETS REGISTRY
// ============================================

export const CMS_PRESETS: Record<CMSType, CMSPreset> = {
  elementor: {
    name: "Elementor",
    description: "WordPress + Elementor page builder",
    selectors: {
      listing: "[class*='e-loop-item'], .elementor-post, .elementor-grid-item",
      link: "a[href]",
      title: ".elementor-heading-title, .elementor-post__title, h2, h3",
      price: ".elementor-price, [class*='price'], .price",
      image: ".elementor-image img, .swiper-slide img, img",
      location: ".elementor-icon-list-text, [class*='location']",
    },
    pagination: {
      type: "query_param",
      param: "e-page",
      next_selector: ".e-load-more, .elementor-pagination a.next",
    },
    detection_patterns: [
      "elementor",
      "e-loop-item",
      "elementor-widget",
      "data-elementor",
    ],
    image_attrs: ["data-src", "data-lazy-src", "data-bg"],
    price_patterns: [/€\s*[\d.,\s]+/, /[\d.,\s]+\s*€/],
  },

  wordpress: {
    name: "WordPress",
    description: "Standard WordPress themes",
    selectors: {
      listing: "article, .post, .listing-item, .property-item, .hentry",
      link: "a[href]",
      title: ".entry-title, h2.title, h3, .post-title",
      price: ".price, .property-price, .listing-price, [class*='price']",
      image: ".wp-post-image, .attachment-thumbnail, img",
      location: ".property-location, .listing-location, [class*='location']",
    },
    pagination: {
      type: "query_param",
      param: "paged",
      next_selector: ".nav-previous a, .next, a.next-page",
    },
    detection_patterns: [
      "wp-content",
      "wp-includes",
      "wordpress",
      "wp-post-image",
    ],
    image_attrs: ["data-src", "data-lazy", "srcset"],
    price_patterns: [/\$[\d.,]+/, /€[\d.,]+/, /£[\d.,]+/],
  },

  wix: {
    name: "Wix",
    description: "Wix website builder",
    selectors: {
      listing: "[data-hook='item-container'], .gallery-item, .pro-gallery-item",
      link: "a[href]",
      title: "[data-hook='title'], h2, h3",
      price: "[data-hook='price'], .price",
      image: "img, [data-hook='image']",
      location: "[data-hook='location']",
    },
    pagination: {
      type: "next_link",
      next_selector: "[data-hook='load-more'], .load-more",
    },
    detection_patterns: [
      "wix.com",
      "wixsite",
      "_wix",
      "data-hook",
    ],
    image_attrs: ["data-src", "data-pin-media"],
    price_patterns: [/[\d.,]+/],
  },

  squarespace: {
    name: "Squarespace",
    description: "Squarespace templates",
    selectors: {
      listing: ".summary-item, .gallery-item, .product-item, article",
      link: "a[href]",
      title: ".summary-title, .product-title, h2",
      price: ".product-price, .summary-price",
      image: ".summary-thumbnail img, .product-image img, img",
      location: ".summary-location, .product-location",
    },
    pagination: {
      type: "next_link",
      next_selector: ".summary-pagination .next, .pagination-next",
    },
    detection_patterns: [
      "squarespace",
      "sqsp",
      "static1.squarespace",
    ],
    image_attrs: ["data-src", "data-image"],
    price_patterns: [/\$[\d.,]+/, /€[\d.,]+/],
  },

  shopify: {
    name: "Shopify",
    description: "Shopify storefronts",
    selectors: {
      listing: ".product-item, .grid-item, .collection-product",
      link: "a[href]",
      title: ".product-title, .product-card__title, h3",
      price: ".product-price, .price, .money",
      image: ".product-image img, .product-card__image img",
      location: "",
    },
    pagination: {
      type: "query_param",
      param: "page",
      next_selector: ".pagination .next, .pagination__next",
    },
    detection_patterns: [
      "shopify",
      "cdn.shopify",
      "myshopify",
    ],
    image_attrs: ["data-src", "data-srcset"],
    price_patterns: [/[\d.,]+/],
  },

  custom: {
    name: "Custom",
    description: "Fallback for unknown platforms",
    selectors: {
      listing: "article, .listing, .item, .card, .property, [class*='listing'], [class*='property']",
      link: "a[href]",
      title: "h2, h3, .title, [class*='title']",
      price: ".price, [class*='price']",
      image: "img",
      location: ".location, [class*='location'], .address",
    },
    pagination: {
      type: "query_param",
      param: "page",
      next_selector: ".next, .pagination a:last-child, a[rel='next']",
    },
    detection_patterns: [],
    image_attrs: ["data-src", "data-lazy-src", "data-original"],
    price_patterns: [/€\s*[\d.,\s]+/, /\$[\d.,]+/, /[\d.,]+\s*€/],
  },
};

// ============================================
// AUTO-DETECT CMS FROM HTML
// ============================================

export function detectCMS(html: string): CMSType {
  const htmlLower = html.toLowerCase();

  for (const [cmsType, preset] of Object.entries(CMS_PRESETS)) {
    if (cmsType === "custom") continue; // Skip fallback

    for (const pattern of preset.detection_patterns) {
      if (htmlLower.includes(pattern.toLowerCase())) {
        return cmsType as CMSType;
      }
    }
  }

  return "custom";
}

// ============================================
// MERGE SELECTORS WITH PRESET DEFAULTS
// ============================================

export function mergeWithPreset(
  sourceSelectors: Partial<SelectorsConfig> | undefined,
  cmsType: CMSType = "custom"
): SelectorsConfig {
  const preset = CMS_PRESETS[cmsType] || CMS_PRESETS.custom;

  return {
    listing: sourceSelectors?.listing || preset.selectors.listing,
    link: sourceSelectors?.link || preset.selectors.link,
    title: sourceSelectors?.title || preset.selectors.title,
    price: sourceSelectors?.price || preset.selectors.price,
    image: sourceSelectors?.image || preset.selectors.image,
    location: sourceSelectors?.location || preset.selectors.location,
    description: sourceSelectors?.description || preset.selectors.description,
  };
}

// ============================================
// GET IMAGE ATTRIBUTES FOR CMS
// ============================================

export function getImageAttrs(cmsType: CMSType = "custom"): string[] {
  const preset = CMS_PRESETS[cmsType] || CMS_PRESETS.custom;
  return ["src", ...preset.image_attrs];
}
