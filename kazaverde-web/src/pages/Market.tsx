import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatMedian, formatNumber, toLocale } from "../lib/formatters";
import type { MarketOverview } from "arei-sdk";
import "./Market.css";
import "./Policy.css";

export default function Market() {
  const { i18n, t } = useTranslation();
  const locale = toLocale(i18n.language);
  const [data, setData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta(t("market.metaTitle"), t("market.metaDescription"));

  useEffect(() => {
    let cancelled = false;
    arei
      .getMarketOverview()
      .then((d) => {
        if (!cancelled) { setData(d); setLoading(false); }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load market data.");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="kv-m-state">
        <p>{t("market.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="kv-m-state kv-m-state-error">
        <h1>{t("market.unavailable")}</h1>
        <p>{error ?? t("common.liveDataUnavailable")}</p>
      </div>
    );
  }

  const dataPoints = t("market.dataPoints", { returnObjects: true }) as string[];

  return (
    <div className="kv-m">
      {/* Hero */}
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("market.eyebrow")}</div>
          <h1>{t("market.title")}</h1>
          <p className="kv-hero-sub">{t("market.intro")}</p>
        </div>
      </header>

      {/* Summary metrics */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-l-mmi-strip">
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{t("market.trackedListings")}</div>
              <div className="kv-l-mmi-num">{formatNumber(data.totalListings, locale)}</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{t("market.islandsRepresented")}</div>
              <div className="kv-l-mmi-num">{data.islandCount}</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{t("market.sourcesRepresented")}</div>
              <div className="kv-l-mmi-num">{data.sourceCount}</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">{t("market.inPriceSample")}</div>
              <div className="kv-l-mmi-num">{formatNumber(data.priceSampleCount, locale)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Island asking-price table */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("market.islandEyebrow")}</span>
            <h2>{t("market.islandHeading")}</h2>
            <p>{t("market.islandIntro")}</p>
          </div>

          <div className="kv-m-island-table kv-m-island-table-4col">
            <div className="kv-m-island-h">
              <span>{t("market.tableIsland")}</span>
              <span>{t("market.tableTracked")}</span>
              <span>{t("market.tableSample")}</span>
              <span>{t("market.tableMedian")}</span>
            </div>
            {data.islands.map((island) => (
              <div className="kv-m-island-row" key={island.island}>
                <span className="kv-m-island-name">{island.island}</span>
                <span className="kv-m-island-count">{formatNumber(island.totalListings, locale)}</span>
                <span className="kv-m-island-count">{formatNumber(island.priceSampleCount, locale)}</span>
                <span className="kv-m-island-median">
                  {island.medianAskingPrice !== null ? formatMedian(island.medianAskingPrice, locale) : "—"}
                </span>
              </div>
            ))}
          </div>

          <p className="kv-m-disclaimer">{t("market.tableNote")}</p>
        </div>
      </section>

      {/* Data limits — id keeps /market#methodology footer link working */}
      <section className="kv-m-section" id="methodology">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("market.dataEyebrow")}</span>
            <h2>{t("market.dataHeading")}</h2>
          </div>
          <ul className="kv-pol-list">
            {dataPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="kv-m-disclaimer">
            <Link to="/about">{t("market.dataLink")}</Link>
          </p>
          <p className="kv-m-disclaimer">{t("market.disclosure")}</p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
