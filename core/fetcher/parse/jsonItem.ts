/**
 * JSON item mapping: walks a raw API record through the configured item_map
 * and produces a GenericParsedListing.
 *
 * Used by the json_api pagination strategy. Kept pure (no IO) so it stays
 * easy to unit-test (see tests/genericFetcherJsonApi.test.cjs).
 */

import { deriveProjectMetadata } from "../../projectMetadata";
import type {
  GenericParsedListing,
  ItemMapArrayPick,
  SourceFetchConfig,
} from "../types";
import { dedupeImageUrls } from "./images";
import {
  applyDetailUrlRewrite,
  extractIdFromUrl,
  generateListingId,
  makeAbsoluteUrl,
} from "./url";

/** Walk a dot-path (e.g. "value", "data.results", "content.City") safely. */
export function getByPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** Expand "{field}" placeholders against a scope, skipping empty values. */
export function renderTemplate(template: string, scope: Record<string, unknown>): string {
  return template
    .replace(/\{([\w.]+)\}/g, (_, key: string) => {
      const val = getByPath(scope, key);
      return val == null ? "" : String(val);
    })
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pick value(s) from an array field on an item using an ItemMapArrayPick spec.
 * Returns either a scalar (first match) or array of values (when all: true).
 */
export function pickFromArray(
  item: Record<string, unknown>,
  pick: ItemMapArrayPick,
): string | string[] | undefined {
  const raw = getByPath(item, pick.array);
  if (!Array.isArray(raw)) return undefined;

  // Sort by `sort_by` (numeric ascending) if specified; elements with missing
  // or non-numeric sort keys go to the end. Sort is stable on a shallow copy.
  let arr = raw;
  if (pick.sort_by) {
    const sortKey = pick.sort_by;
    arr = [...raw].sort((a, b) => {
      const av = (a as Record<string, unknown>)?.[sortKey];
      const bv = (b as Record<string, unknown>)?.[sortKey];
      const an = av == null ? Infinity : Number(av);
      const bn = bv == null ? Infinity : Number(bv);
      return (Number.isFinite(an) ? an : Infinity) - (Number.isFinite(bn) ? bn : Infinity);
    });
  }

  const applyTemplate = (raw: unknown): string | undefined => {
    if (raw == null) return undefined;
    const str = String(raw);
    if (!str) return undefined;
    if (!pick.template) return str;
    return pick.template.replace(/\{VALUE\}/g, str);
  };

  const extract = (el: unknown): string | undefined => {
    if (el == null || typeof el !== "object") return undefined;
    return applyTemplate((el as Record<string, unknown>)[pick.field]);
  };

  if (pick.all) {
    const results: string[] = [];
    for (const el of arr) {
      const v = extract(el);
      if (v) results.push(v);
      if (pick.limit && results.length >= pick.limit) break;
    }
    return results;
  }

  for (const el of arr) {
    if (pick.match_field !== undefined) {
      const mv = (el as Record<string, unknown>)[pick.match_field];
      if (mv !== pick.match_value) continue;
    }
    if (pick.matches?.length) {
      const record = el as Record<string, unknown>;
      const matched = pick.matches.every((rule) => record[rule.field] === rule.equals);
      if (!matched) continue;
    }
    const v = extract(el);
    if (v) return v;
  }
  return undefined;
}

export function pickMappedString(
  item: Record<string, unknown>,
  mapping: string | ItemMapArrayPick,
): string | undefined {
  if (typeof mapping === "string") {
    const raw = getByPath(item, mapping);
    return raw == null ? undefined : String(raw);
  }

  const picked = pickFromArray(item, mapping);
  return typeof picked === "string" ? picked : undefined;
}

/**
 * Map a single JSON item into a GenericParsedListing using config.item_map.
 * Returns null if the item should be skipped (unmappable or matches skip_if).
 */
export function mapJsonItem(
  rawItem: unknown,
  config: SourceFetchConfig,
  now: Date,
): GenericParsedListing | null {
  const map = config.item_map;
  if (!map || rawItem == null || typeof rawItem !== "object") return null;

  // Resolve content scope (e.g. Azure Search hits have payload under "content")
  const item =
    (map.content_base
      ? (getByPath(rawItem, map.content_base) as Record<string, unknown>)
      : (rawItem as Record<string, unknown>)) ?? (rawItem as Record<string, unknown>);

  // skip_if rules
  if (map.skip_if) {
    for (const rule of map.skip_if) {
      if (getByPath(item, rule.field) === rule.equals) return null;
    }
  }

  // Title — template wins, then single-path, then ordered fallbacks
  let title = "";
  if (map.title_template) {
    title = renderTemplate(map.title_template, item);
  } else if (map.title) {
    title = pickMappedString(item, map.title) ?? "";
  }
  if (!title && map.title_fallbacks?.length) {
    for (const fallback of map.title_fallbacks) {
      title = pickMappedString(item, fallback) ?? "";
      if (title) break;
    }
  }
  title = title.replace(/\s+/g, " ").trim();

  // Price — numeric coerce
  let price: number | undefined;
  if (map.price) {
    const raw = getByPath(item, map.price);
    if (typeof raw === "number" && raw > 0) price = raw;
    else if (typeof raw === "string") {
      const n = Number(raw.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n) && n > 0) price = n;
    }
  }

  // Location
  let location: string | undefined;
  if (map.location_template) {
    const rendered = renderTemplate(map.location_template, item)
      .replace(/,\s*,/g, ",")
      .replace(/^,\s*|,\s*$/g, "");
    if (rendered) location = rendered;
  } else if (map.location) {
    const raw = getByPath(item, map.location);
    if (raw) location = String(raw).trim();
  }

  // Scalars
  const coerceInt = (path?: string): number | undefined => {
    if (!path) return undefined;
    const raw = getByPath(item, path);
    if (raw == null) return undefined;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  };
  const coerceFloat = (path?: string): number | undefined => {
    if (!path) return undefined;
    const raw = getByPath(item, path);
    if (raw == null) return undefined;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const bedrooms = coerceInt(map.bedrooms);
  const bathrooms = coerceInt(map.bathrooms);
  const area_sqm = coerceFloat(map.area_sqm);

  // Description
  let description: string | undefined;
  if (typeof map.description === "string") {
    const raw = getByPath(item, map.description);
    if (raw) description = String(raw);
  } else if (map.description) {
    const picked = pickFromArray(item, map.description);
    if (typeof picked === "string") description = picked;
  }

  // Detail URL
  let detailUrl: string | undefined;
  if (typeof map.detail_url === "string") {
    const raw = getByPath(item, map.detail_url);
    if (raw) detailUrl = String(raw);
  } else if (map.detail_url) {
    const picked = pickFromArray(item, map.detail_url);
    if (typeof picked === "string") detailUrl = picked;
  }
  if (detailUrl && !/^https?:\/\//i.test(detailUrl)) {
    detailUrl = makeAbsoluteUrl(detailUrl, config.base_url);
  }
  // Strip trailing slashes to match HTML pipeline's canonical form
  if (detailUrl) detailUrl = detailUrl.replace(/\/+$/, "");
  // id_url_pattern matches against the pre-rewrite URL (mirrors HTML path
  // in parse/listings.ts), while detailUrl persisted to the listing is the
  // rewritten form so enrichment hits the chosen variant (e.g. en/).
  const preRewriteUrl = detailUrl;
  if (detailUrl) detailUrl = applyDetailUrlRewrite(detailUrl, config.detail_url_rewrite);

  // Images
  let imageUrls: string[] = [];
  if (map.images) {
    const picked = pickFromArray(item, { ...map.images, all: true });
    if (Array.isArray(picked)) imageUrls = picked;
  }
  imageUrls = dedupeImageUrls(imageUrls).slice(0, map.images?.limit ?? 100);

  // ID fallback chain: explicit id path → url pattern → title+price+url hash
  let id: string | undefined;
  if (map.id) {
    const raw = getByPath(item, map.id);
    if (raw != null) id = String(raw);
  }
  if (!id && preRewriteUrl) {
    id = extractIdFromUrl(preRewriteUrl, config.id_url_pattern);
  }
  const idPrefix = config.id_prefix || config.id.replace(/^cv_/, "");
  const listingId = id
    ? `${idPrefix}_${id}`
    : generateListingId(idPrefix, title, price, detailUrl || "");

  // Drop clearly unusable rows (need at least a title or detail URL)
  if (!title && !detailUrl) return null;
  if (title.length < 5 && !detailUrl) return null;

  const projectMetadata = deriveProjectMetadata({ title, price });

  return {
    id: listingId,
    sourceId: config.id,
    sourceName: config.name,
    source_ref: projectMetadata.source_ref,
    title: title || undefined,
    price,
    priceText: price ? String(price) : "",
    project_flag: projectMetadata.project_flag,
    project_start_price: projectMetadata.project_start_price,
    description,
    imageUrls,
    location,
    detailUrl,
    createdAt: now,
    bedrooms,
    bathrooms,
    area_sqm,
  };
}
