import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Trans, useTranslation } from "react-i18next";
import { formatDate, toLocale } from "../lib/formatters";
import NewsletterCta from "../components/NewsletterCta";
import PageHeader from "../components/PageHeader";
import CategoryFilter from "../components/CategoryFilter";
import SectionHead from "../components/SectionHead";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useMarketNews } from "../hooks/useMarketNews";
import { MARKET_NEWS_CATEGORIES, type MarketNewsItem } from "../lib/market-news-data";
import "./MarketNews.css";

const MARKET_NEWS_DESCRIPTION =
  "Curated economic, tourism, investment and policy news relevant to Cape Verde's property market.";

const MAX_VISIBLE_TAGS = 3;
const INITIAL_COUNT = 10;
const LOAD_MORE_STEP = 10;


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
  const aHigh = a.relevance === "high";
  const bHigh = b.relevance === "high";
  if (aHigh && !bHigh) return -1;
  if (!aHigh && bHigh) return 1;
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
  const { t, i18n } = useTranslation();
  const locale = toLocale(i18n.language);
  useDocumentMeta(t("marketNews.metaTitle"), t("marketNews.description"));

  const catLabel = (c: string) =>
    t(`marketNews.categories.${c}`, { defaultValue: c });

  // Each category → its step on the shared sage tonal scale, by canonical
  // order. Same value drives the marker square and the filter underline.
  const catTone = (c: string) => {
    const i = MARKET_NEWS_CATEGORIES.indexOf(c as (typeof MARKET_NEWS_CATEGORIES)[number]);
    return `var(--kv-cat-${i >= 0 ? i + 1 : 1})`;
  };

  const { items, loading, error } = useMarketNews();

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [query, activeCat]);

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

  // Only categories that actually have items, in canonical order.
  const presentCategories = useMemo(() => {
    const present = new Set(items.map((i) => i.category));
    return MARKET_NEWS_CATEGORIES.filter((c) => present.has(c)).map((c) => ({
      value: c,
      label: catLabel(c),
      tone: catTone(c),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, t]);

  const filteredItems = useMemo(
    () =>
      sortedItems.filter(
        (item) =>
          (activeCat === null || item.category === activeCat) &&
          matches(query, item),
      ),
    [query, activeCat, sortedItems],
  );

  const isSearching = query.trim().length > 0;
  const visibleItems = filteredItems.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredItems.length;

  return (
    <div className="kv-news">
      <PageHeader
        eyebrow={t("marketNews.eyebrow")}
        title={t("marketNews.metaTitle")}
        sub={t("marketNews.description")}
      >
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

        <CategoryFilter
          allLabel={t("common.allCategories")}
          options={presentCategories}
          active={activeCat}
          onChange={setActiveCat}
        />
      </PageHeader>

      <main className="kv-news-body">
        <section className="kv-news-section">
          {isSearching && (
            <div className="kv-news-result-meta">
              <b>{filteredItems.length}</b>{" "}
              {filteredItems.length === 1 ? t("common.result") : t("common.results")}
            </div>
          )}

          <SectionHead
            eyebrow={t("marketNews.sectionEyebrow")}
            title={t("marketNews.sectionTitle")}
          />

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
                visibleItems.map((item) => (
                  <article className="kv-news-item" key={item.id}>
                    <div className="kv-news-item-meta">
                      <span>{item.sourceName}</span>
                      <span>{formatDate(item.publishedAt, locale, true)}</span>
                      <span
                        className="kv-news-cat"
                        style={{ "--cat-tone": catTone(item.category) } as CSSProperties}
                      >
                        {catLabel(item.category)}
                      </span>
                      {item.relevance === "high" && (
                        <span className="kv-news-relevance">
                          {t("marketNews.relevanceBadge")}
                        </span>
                      )}
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
            {!loading && !error && filteredItems.length > 0 && (
              <div className="kv-news-pager">
                <div>
                  <b>1–{visibleItems.length}</b> of <b>{filteredItems.length}</b>
                </div>
                {canLoadMore && (
                  <button
                    type="button"
                    className="kv-pager-btn"
                    onClick={() => setVisibleCount((c) => c + LOAD_MORE_STEP)}
                  >
                    Load more [↓]
                  </button>
                )}
              </div>
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
