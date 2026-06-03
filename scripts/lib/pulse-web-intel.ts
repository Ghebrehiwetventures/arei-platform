/**
 * AREI Pulse — external web intelligence provider interface.
 *
 * AREI Pulse is designed so that web intelligence (events, competitor
 * monitoring, market news, institutional/government announcements) can
 * be added SAFELY later, without changing the generator or the schema.
 *
 * IMPORTANT — no fabricated opportunities:
 *   The repo currently has NO safe web-search infrastructure. The
 *   default provider returned by getWebIntelProvider() is therefore a
 *   no-op that returns an empty list. It must NEVER invent results.
 *   When a real, safe provider is wired up (e.g. a vetted search API),
 *   implement WebIntelProvider against it and select it via the
 *   PULSE_WEB_INTEL_PROVIDER env var. Until then Pulse runs on internal
 *   signals only, which is correct and honest.
 *
 * Topics we intend to monitor when a provider exists:
 *   - relevant African real estate / proptech / data conferences & events
 *   - Cape Verde / Ghana / Nigeria / Kenya real estate market news
 *   - competitor positioning (Africa property intelligence / aggregation)
 *   - institutional or government announcements affecting the markets
 */

export type WebIntelTopic =
  | "events"
  | "market_news"
  | "competitors"
  | "regulation";

export interface WebIntelQuery {
  topic: WebIntelTopic;
  /** Free-text query, e.g. "Cape Verde real estate investment conference 2026". */
  query: string;
  /** Markets the query is relevant to, e.g. ["cv", "gh"]. */
  markets?: string[];
}

export interface WebIntelResult {
  topic: WebIntelTopic;
  title: string;
  /** One-paragraph factual summary. Provider must not editorialize. */
  summary: string;
  url: string;
  /** ISO date the item was published/found, when known. */
  published_at?: string | null;
  /** Provider-specific source label, e.g. domain or feed name. */
  source_name?: string | null;
}

export interface WebIntelProvider {
  readonly name: string;
  /** Returns [] when nothing relevant is found. Never fabricates. */
  search(queries: WebIntelQuery[]): Promise<WebIntelResult[]>;
}

/**
 * The honest default: returns nothing. Logs once so operators understand
 * why no web-sourced cards appear.
 */
export class NoopWebIntelProvider implements WebIntelProvider {
  readonly name = "noop";
  async search(_queries: WebIntelQuery[]): Promise<WebIntelResult[]> {
    return [];
  }
}

/**
 * Select the active provider. Returns the no-op provider unless a real
 * one is explicitly configured AND implemented here. We deliberately do
 * NOT auto-wire any provider — adding one is a conscious, reviewed step.
 */
export function getWebIntelProvider(): WebIntelProvider {
  const configured = (process.env.PULSE_WEB_INTEL_PROVIDER ?? "").trim();

  switch (configured) {
    // case "your-vetted-search-api":
    //   return new YourVettedSearchProvider(process.env.YOUR_API_KEY!);
    case "":
    case "noop":
      return new NoopWebIntelProvider();
    default:
      console.warn(
        `[pulse] PULSE_WEB_INTEL_PROVIDER="${configured}" is not implemented; ` +
          `falling back to no-op (no web intelligence). Implement it in ` +
          `scripts/lib/pulse-web-intel.ts before enabling.`
      );
      return new NoopWebIntelProvider();
  }
}

/**
 * The standing watch-list of queries Pulse would run if a provider were
 * configured. Kept here so the intent is reviewable even while the
 * provider is a no-op.
 */
export function defaultWatchlist(): WebIntelQuery[] {
  return [
    { topic: "events", query: "Cape Verde real estate investment conference", markets: ["cv"] },
    { topic: "events", query: "Africa proptech / real estate data conference", markets: ["cv", "gh"] },
    { topic: "events", query: "diaspora investment Cape Verde Ghana event", markets: ["cv", "gh"] },
    { topic: "market_news", query: "Cape Verde real estate market news", markets: ["cv"] },
    { topic: "market_news", query: "Ghana real estate market news portals brokers", markets: ["gh"] },
    { topic: "competitors", query: "Africa property data intelligence platform", markets: ["cv", "gh"] },
    { topic: "regulation", query: "Cape Verde property registry / housing policy announcement", markets: ["cv"] },
  ];
}
