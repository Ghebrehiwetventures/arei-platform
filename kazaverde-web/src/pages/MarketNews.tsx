import { useEffect, useMemo, useState } from "react";
import NewsletterCta from "../components/NewsletterCta";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useMarketNews } from "../hooks/useMarketNews";
import {
  MARKET_NEWS_CATEGORIES,
  type MarketNewsCategory,
  type MarketNewsItem,
} from "../lib/market-news-data";
import "./MarketNews.css";

const MARKET_NEWS_DESCRIPTION =
  "Curated economic, tourism, investment and policy news relevant to Cape Verde's property market.";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function matches(query: string, item: MarketNewsItem): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.title,
    item.sourceName,
    item.category,
    item.snippet,
    item.whyItMatters ?? "",
  ].join("   ").toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function sortNews(a: MarketNewsItem, b: MarketNewsItem): number {
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  return b.publishedAt.localeCompare(a.publishedAt);
}

export default function MarketNews() {
  useDocumentMeta("Cape Verde Market News", MARKET_NEWS_DESCRIPTION);

  const { items, loading, error } = useMarketNews();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MarketNewsCategory | "All">("All");

  useEffect(() => {
    if (!items.length) return;
    const SCRIPT_ID = "kv-jsonld-market-news";
    const schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": "https://capeverderealestateindex.com/market-news",
      name: "Cape Verde Market News",
      description: MARKET_NEWS_DESCRIPTION,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: item.sourceUrl,
          name: item.title,
        })),
      },
    };

    const script =
      (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ??
      document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    if (!script.parentNode) document.head.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [items]);

  const sortedItems = useMemo(() => [...items].sort(sortNews), [items]);
  const filteredItems = useMemo(
    () =>
      sortedItems.filter((item) => {
        if (category !== "All" && item.category !== category) return false;
        return matches(query, item);
      }),
    [category, query, sortedItems],
  );

  const isSearching = query.trim().length > 0 || category !== "All";

  return (
    <div className="kv-news">
      <header className="kv-news-head">
        <div className="kv-news-head-inner">
          <h1 className="kv-news-title">Cape Verde Market News</h1>
          <p className="kv-news-sub">{MARKET_NEWS_DESCRIPTION}</p>

          <form
            className="kv-news-search"
            onSubmit={(event) => event.preventDefault()}
            role="search"
          >
            <span className="kv-news-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="kv-news-search-input"
              placeholder="Search — e.g. aviation, tax, hotels"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search market news"
            />
            {query && (
              <button
                type="button"
                className="kv-news-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </form>
        </div>
      </header>

      <main className="kv-news-body">
        <section className="kv-news-section">
          <div className="kv-news-filterbar" aria-label="Filter by category">
            <button
              type="button"
              className={`kv-news-filter${category === "All" ? " on" : ""}`}
              onClick={() => setCategory("All")}
            >
              All
            </button>
            {MARKET_NEWS_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`kv-news-filter${category === cat ? " on" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {isSearching && (
            <div className="kv-news-result-meta">
              <b>{filteredItems.length}</b>{" "}
              {filteredItems.length === 1 ? "result" : "results"}
              {category !== "All" ? ` · ${category}` : ""}
            </div>
          )}

          <div className="kv-news-layout">
            <div className="kv-news-feed">
              {loading ? (
                <div className="kv-news-loading">Loading market news…</div>
              ) : error ? (
                <div className="kv-news-error">{error}</div>
              ) : filteredItems.length === 0 ? (
                <div className="kv-news-empty">
                  No market news matches <b>"{query}"</b>.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <article className="kv-news-item" key={item.id}>
                    <div className="kv-news-item-meta">
                      <span>{item.sourceName}</span>
                      <span>{fmtDate(item.publishedAt)}</span>
                    </div>

                    <a
                      className="kv-news-item-title"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title}
                      <span aria-hidden="true">↗</span>
                    </a>

                    {item.originalTitle && (
                      <p className="kv-news-item-original">
                        Source title: {item.originalTitle}
                      </p>
                    )}

                    <p className="kv-news-item-snippet">{item.snippet}</p>

                    {item.whyItMatters && (
                      <div className="kv-news-why">
                        <span>Why it matters</span>
                        <p>{item.whyItMatters}</p>
                      </div>
                    )}

                    <a
                      className="kv-news-item-read"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read at {item.sourceName} →
                    </a>
                  </article>
                ))
              )}
            </div>

            <aside className="kv-news-side" aria-label="Editorial criteria">
              <div className="kv-news-side-card">
                <div className="kv-news-side-eyebrow">Editorial criteria</div>
                <p>
                  We include source-linked stories that may affect demand,
                  supply, financing, access, regulation, tourism,
                  infrastructure, foreign investment or destination confidence.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <p className="kv-news-disclaimer">
          Market News is a curated link feed. AREI does not republish full
          articles, provide investment advice, or claim comprehensive coverage
          of Cape Verde's economy or property market.
        </p>
      </main>

      <NewsletterCta />
    </div>
  );
}
