/**
 * Configured ingestion sources for public.market_news candidates.
 *
 * Types:
 *   rss             — direct publisher RSS feed
 *   google_news_rss — Google News RSS search query feed
 *
 * Google News RSS items link to Google's own redirect URLs, not the original
 * article. canonical_url will therefore be the Google redirect URL. An admin
 * reviewing candidates can click through to the original source.
 *
 * All source URLs should be verified manually before adding. RSS availability
 * changes over time — mark any feed that stops returning items as inactive
 * rather than deleting it, to preserve the ingestion_source audit trail.
 */

export type SourceType = "rss" | "google_news_rss";

export interface MarketNewsSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  defaultCategory: string;
  language: string;
  countryCode: string;
  /** Set to false to skip without removing from config */
  active?: boolean;
  /** Set to false to disable this source without removing it from config */
  enabled?: boolean;
}

export const MARKET_NEWS_SOURCES: MarketNewsSource[] = [
  // ── Google News RSS — English queries ────────────────────────────────────
  {
    id: "gnews-cv-economy",
    name: "Google News — Cape Verde Economy & Investment",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+economy+OR+investment+OR+GDP+-site%3Astatista.com&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Economy",
    language: "en",
    countryCode: "CV",
    enabled: false,
  },
  {
    id: "gnews-cv-tourism",
    name: "Google News — Cape Verde Tourism",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+hotel+OR+resort+OR+hospitality+-crime+-assault+-outbreak&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Tourism",
    language: "en",
    countryCode: "CV",
    enabled: false,
  },
  {
    id: "gnews-cv-aviation",
    name: "Google News — Cape Verde Aviation",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+aviation+OR+airport+OR+airline+OR+%22Cabo+Verde+Airlines%22&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Infrastructure",
    language: "en",
    countryCode: "CV",
  },
  {
    id: "gnews-cv-property",
    name: "Google News — Cape Verde Real Estate & Construction",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+%22real+estate%22+OR+property+OR+construction&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Infrastructure",
    language: "en",
    countryCode: "CV",
  },
  {
    id: "gnews-cv-policy",
    name: "Google News — Cape Verde Policy & Regulation",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+%28policy+OR+regulation+OR+tax+OR+residency%29+%28investment+OR+property+OR+%22real+estate%22+OR+construction%29&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Policy & Tax",
    language: "en",
    countryCode: "CV",
    enabled: false,
  },
  {
    id: "gnews-cv-infrastructure",
    name: "Google News — Cape Verde Infrastructure & Energy",
    url: 'https://news.google.com/rss/search?q=%22Cape+Verde%22+infrastructure+OR+energy+OR+port+OR+water+-travel+-cruise+-hantavirus&hl=en&gl=US&ceid=US:en',
    type: "google_news_rss",
    defaultCategory: "Infrastructure",
    language: "en",
    countryCode: "CV",
    enabled: false,
  },

  // ── Google News RSS — Portuguese queries ──────────────────────────────────
  {
    id: "gnews-cv-pt-governo",
    name: "Google News — Cabo Verde (Português)",
    url: 'https://news.google.com/rss/search?q=%22Cabo+Verde%22+investimento+OR+turismo+OR+economia&hl=pt&gl=CV&ceid=CV:pt',
    type: "google_news_rss",
    defaultCategory: "Economy",
    language: "pt",
    countryCode: "CV",
    enabled: false,
  },

  // ── Direct publisher RSS feeds ────────────────────────────────────────────
  // Verify each URL manually before relying on it — publisher feeds change.
  {
    id: "governo-cv-rss",
    name: "Governo de Cabo Verde",
    url: "https://www.governo.cv/feed/",
    type: "rss",
    defaultCategory: "Policy & Tax",
    language: "pt",
    countryCode: "CV",
  },
];
