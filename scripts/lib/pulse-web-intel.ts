/**
 * AREI Pulse — external web intelligence provider interface.
 *
 * AREI Pulse is designed so that web intelligence (events, competitor
 * monitoring, market news, institutional/government announcements) can
 * be added SAFELY later, without changing the generator or the schema.
 *
 * IMPORTANT — no fabricated opportunities:
 *   The DEFAULT provider is a no-op that returns an empty list and must
 *   NEVER invent results. A real provider (Tavily) is implemented below
 *   but stays DORMANT unless BOTH PULSE_WEB_INTEL_PROVIDER=tavily and
 *   TAVILY_API_KEY are set — and even then it only returns what the
 *   search API returns. With nothing configured, Pulse runs on internal
 *   signals only, which is correct and honest. To add another provider,
 *   implement WebIntelProvider and add a case in getWebIntelProvider().
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

// ── Tavily provider ──────────────────────────────────────────────────────────
// Tavily (https://tavily.com) is a search API designed for LLM use: it returns
// clean per-result summaries + source URLs. We map each watch-list query to one
// Tavily search and translate results into WebIntelResult. It ONLY returns what
// the API returns — it never fabricates. Dormant unless both
// PULSE_WEB_INTEL_PROVIDER=tavily and TAVILY_API_KEY are set.

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  published_date?: string;
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const PER_QUERY_RESULTS = 3;   // keep the prompt small
const TOTAL_RESULT_CAP = 12;   // hard ceiling across all queries
const REQUEST_TIMEOUT_MS = 12_000;

export class TavilyWebIntelProvider implements WebIntelProvider {
  readonly name = "tavily";
  constructor(private readonly apiKey: string) {}

  private async runOne(q: WebIntelQuery): Promise<WebIntelResult[]> {
    // News-style topics get Tavily's recency-aware "news" mode.
    const isNews = q.topic === "market_news" || q.topic === "regulation" || q.topic === "competitors";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(TAVILY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          api_key: this.apiKey,
          query: q.query,
          search_depth: "basic",
          topic: isNews ? "news" : "general",
          ...(isNews ? { days: 30 } : {}),
          max_results: PER_QUERY_RESULTS,
          include_answer: false,
          include_raw_content: false,
        }),
      });
      if (!res.ok) {
        console.warn(`[pulse] tavily query failed (${res.status}) for "${q.query}"`);
        return [];
      }
      const json = (await res.json()) as { results?: TavilyResult[] };
      const results = Array.isArray(json.results) ? json.results : [];
      return results
        .filter((r) => r && r.url && (r.title || r.content))
        .map((r) => ({
          topic: q.topic,
          title: (r.title ?? r.url!).trim(),
          summary: (r.content ?? "").trim(),
          url: r.url!,
          published_at: r.published_date ?? null,
          source_name: (() => {
            try {
              return new URL(r.url!).hostname.replace(/^www\./, "");
            } catch {
              return null;
            }
          })(),
        }));
    } catch (e) {
      console.warn(`[pulse] tavily query error for "${q.query}": ${String(e)}`);
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  async search(queries: WebIntelQuery[]): Promise<WebIntelResult[]> {
    const batches = await Promise.all(queries.map((q) => this.runOne(q)));
    // Flatten, de-duplicate by URL, cap the total.
    const seen = new Set<string>();
    const out: WebIntelResult[] = [];
    for (const r of batches.flat()) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
      if (out.length >= TOTAL_RESULT_CAP) break;
    }
    return out;
  }
}

/**
 * Select the active provider. Returns the no-op provider unless a real one
 * is BOTH explicitly configured (PULSE_WEB_INTEL_PROVIDER) AND has its
 * credentials present. Adding a provider is a conscious, reviewed step —
 * and a misconfiguration falls back to no-op (never fabricates).
 */
export function getWebIntelProvider(): WebIntelProvider {
  const configured = (process.env.PULSE_WEB_INTEL_PROVIDER ?? "").trim().toLowerCase();

  switch (configured) {
    case "tavily": {
      const key = (process.env.TAVILY_API_KEY ?? "").trim();
      if (!key) {
        console.warn(
          "[pulse] PULSE_WEB_INTEL_PROVIDER=tavily but TAVILY_API_KEY is not set; " +
            "falling back to no-op (no web intelligence)."
        );
        return new NoopWebIntelProvider();
      }
      return new TavilyWebIntelProvider(key);
    }
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
