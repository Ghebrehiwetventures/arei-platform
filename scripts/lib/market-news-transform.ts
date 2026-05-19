/**
 * Transform helpers: raw RSS feed item → insertable market_news row.
 *
 * Rules:
 *   - title        = cleaned feed title (HTML-stripped, entity-decoded)
 *   - original_title = raw feed title (stored as-is for reference)
 *   - source_url   = first usable link from the item
 *   - canonical_url = normalizeUrl(source_url)
 *   - published_at  = parsed pubDate if valid; null otherwise
 *   - snippet      = description stripped of HTML, truncated to 280 chars;
 *                    falls back to a conservative placeholder
 *   - why_it_matters = null — never fabricated for candidates
 *   - status       = 'candidate' (hardcoded; never overridden)
 */

import * as cheerio from "cheerio";
import { MarketNewsSource } from "./market-news-sources";
import { normalizeUrl } from "./market-news-dedup";

const SNIPPET_MAX = 280;
const SNIPPET_MIN = 20; // below this, description is useless — use placeholder
const SNIPPET_PLACEHOLDER = "[No excerpt available — review original source.]";

/** Insertable row shape for public.market_news */
export interface MarketNewsInsert {
  title: string;
  original_title: string | null;
  source_name: string;
  source_url: string;
  canonical_url: string;
  published_at: string | null;
  category: string;
  snippet: string;
  why_it_matters: null;
  status: "candidate";
  language: string;
  country_code: string;
  ingestion_source: string;
}

/** Raw data extracted from a single <item> element */
export interface RawFeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
  sourceAttrib: string;    // <source> element text (Google News only)
  sourceAttribUrl: string; // <source url="..."> attribute (Google News only)
}

// ── HTML / entity helpers ──────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#39;": "'", "&apos;": "'",
  "&nbsp;": " ", "&#8211;": "–", "&#8212;": "—",
  "&#8216;": "'", "&#8217;": "'", "&#8220;": '"', "&#8221;": '"',
  "&#8230;": "…",
};

function decodeEntities(str: string): string {
  return str.replace(/&[^;]+;/g, (match) => HTML_ENTITIES[match] ?? match);
}

function cleanText(raw: string): string {
  return decodeEntities(stripHtml(raw)).replace(/\s+/g, " ").trim();
}

// ── Snippet extraction ─────────────────────────────────────────────────────

function extractSnippet(description: string): string {
  const plain = cleanText(description);
  if (plain.length < SNIPPET_MIN) return SNIPPET_PLACEHOLDER;
  if (plain.length <= SNIPPET_MAX) return plain;
  // Truncate at last word boundary before limit
  const cut = plain.slice(0, SNIPPET_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > SNIPPET_MAX * 0.8 ? cut.slice(0, lastSpace) : cut) + "…";
}

// ── pubDate parsing ────────────────────────────────────────────────────────

function parsePubDate(raw: string): string | null {
  if (!raw.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Feed parsing ───────────────────────────────────────────────────────────

/**
 * Parse raw RSS/Atom XML and extract all <item> elements.
 * Works with standard RSS 2.0 and Google News RSS.
 */
export function parseFeedItems(xml: string): RawFeedItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RawFeedItem[] = [];

  $("item").each((_, el) => {
    // <link> in RSS can be text content or an href attribute
    const linkText = $(el).find("link").first().text().trim();
    const linkHref = $(el).find("link").first().attr("href")?.trim() ?? "";
    const link = linkText || linkHref;

    items.push({
      title: $(el).find("title").first().text(),
      link,
      guid: $(el).find("guid").first().text().trim(),
      pubDate: $(el).find("pubDate").first().text().trim(),
      description: $(el).find("description").first().text(),
      sourceAttrib: $(el).find("source").first().text().trim(),
      sourceAttribUrl: $(el).find("source").first().attr("url")?.trim() ?? "",
    });
  });

  return items;
}

// ── Transform ─────────────────────────────────────────────────────────────

/**
 * Map one raw feed item to an insertable market_news row.
 * Returns null if the item lacks a usable URL (cannot be deduped or linked).
 */
export function transformFeedItem(
  raw: RawFeedItem,
  source: MarketNewsSource
): MarketNewsInsert | null {
  // Prefer explicit link; fall back to guid if it looks like a URL
  const rawUrl =
    raw.link ||
    (raw.guid.startsWith("http") ? raw.guid : "");

  if (!rawUrl) return null;

  const canonical = normalizeUrl(rawUrl);
  const title = cleanText(raw.title) || "[Untitled]";

  const sourceName =
    source.type === "google_news_rss" && raw.sourceAttrib
      ? raw.sourceAttrib
      : source.name;

  return {
    title,
    original_title: raw.title.trim() !== title ? raw.title.trim() : null,
    source_name: sourceName,
    source_url: rawUrl,
    canonical_url: canonical,
    published_at: parsePubDate(raw.pubDate),
    category: source.defaultCategory,
    snippet: extractSnippet(raw.description),
    why_it_matters: null,
    status: "candidate",
    language: source.language,
    country_code: source.countryCode,
    ingestion_source: source.id,
  };
}
