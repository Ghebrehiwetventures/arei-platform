import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useMarketNews } from "../hooks/useMarketNews";
import type { MarketNewsItem } from "../lib/market-news-data";
import "./MarketNews.css";

const MARKET_NEWS_DESCRIPTION =
  "Curated economic, tourism, investment and policy news relevant to Cape Verde's property market.";

const MAX_VISIBLE_TAGS = 3;

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
    ...(item.signalTags ?? []),
    ...(item.affectedRegions ?? []),
  ].join("   ").toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

function sortNews(a: MarketNewsItem, b: MarketNewsItem): number {
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  return b.publishedAt.localeCompare(a.publishedAt);
}

function SignalTags({ tags }: { tags: string[] }) {
  const { t } = useTranslation();
  if (tags.length === 0) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const extra = tags.length - MAX_VISIBLE_TAGS;
  return (
    <div className="kv-news-signals">
      <span className="kv-news-signals-label">{t("marketNews.signals")}</span>
      <span className="kv-news-signals-items">
        {visible.join(" · ")}
        {extra > 0 && <span className="kv-news-signals-more"> +{extra}</span>}
      </span>
    </div>
  );
}

export default function MarketNews() {
  const { t } = useTranslation();
  useDocumentMeta(t("marketNews.metaTitle"), t("marketNews.description"));

  const { items, loading, error } = useMarketNews();

  const [query, setQuery] = useState("");

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
    () => sortedItems.filter((item) => matches(query, item)),
    [query, sortedItems],
  );

  const isSearching = query.trim().length > 0;

  return (
    <div className="kv-news">
      <header className="kv-news-head">
        <div className="kv-news-head-inner">
          <div className="kv-news-eyebrow">{t("marketNews.eyebrow")}</div>
          <h1 className="kv-news-title">{t("marketNews.metaTitle")}</h1>
          <p className="kv-news-sub">{t("marketNews.description")}</p>

          <form
            className="kv-news-search"
            onSubmit={(event) => event.preventDefault()}
            role="search"
          >
            <span className="kv-news-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="kv-news-search-input"
              placeholder={t("marketNews.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={t("marketNews.searchLabel")}
            />
            {query && (
              <button
                type="button"
                className="kv-news-search-clear"
                onClick={() => setQuery("")}
                aria-label={t("marketNews.clearSearch")}
              >
                ×
              </button>
            )}
          </form>
        </div>
      </header>

      <main className="kv-news-body">
        <section className="kv-news-section">
          {isSearching && (
            <div className="kv-news-result-meta">
              <b>{filteredItems.length}</b>{" "}
              {filteredItems.length === 1 ? t("common.result") : t("common.results")}
            </div>
          )}

          <div className="kv-news-layout">
            <div className="kv-news-feed">
              {loading ? (
                <div className="kv-news-loading">{t("marketNews.loading")}</div>
              ) : error ? (
                <div className="kv-news-error">{error}</div>
              ) : filteredItems.length === 0 ? (
                <div className="kv-news-empty">
                  <Trans i18nKey="marketNews.empty" values={{ query }} components={{ 1: <b /> }} />
                </div>
              ) : (
                filteredItems.map((item) => (
                  <article className="kv-news-item" key={item.id}>
                    <div className="kv-news-item-meta">
                      <span>{item.sourceName}</span>
                      <span>{fmtDate(item.publishedAt)}</span>
                      <span>{item.category}</span>
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
                        {t("marketNews.sourceTitle")} {item.originalTitle}
                      </p>
                    )}

                    <p className="kv-news-item-snippet">{item.snippet}</p>

                    {item.whyItMatters && (
                      <div className="kv-news-why">
                        <span>{t("marketNews.whyItMatters")}</span>
                        <p>{item.whyItMatters}</p>
                      </div>
                    )}

                    {item.signalTags && item.signalTags.length > 0 && (
                      <SignalTags tags={item.signalTags} />
                    )}

                    <a
                      className="kv-news-item-read"
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("marketNews.readAt", { source: item.sourceName })}
                    </a>
                  </article>
                ))
              )}
            </div>

            <aside className="kv-news-side" aria-label={t("marketNews.editorialCriteria")}>
              <div className="kv-news-side-card">
                <div className="kv-news-side-eyebrow">{t("marketNews.editorialCriteria")}</div>
                <p>
                  {t("marketNews.editorialCriteriaBody")}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <p className="kv-news-disclaimer">
          {t("marketNews.disclaimer")}
        </p>
      </main>

      <NewsletterCta />
    </div>
  );
}
