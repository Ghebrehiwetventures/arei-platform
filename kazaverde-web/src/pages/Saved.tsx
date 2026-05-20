import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useSaved } from "../hooks/useSaved";
import { arei } from "../lib/arei";
import NewsletterCta from "../components/NewsletterCta";
import type { ListingCard as ListingCardType } from "arei-sdk";
import { Card } from "./Listings";
import { formatNumber, toLocale } from "../lib/formatters";
import "./Saved.css";

/** Project a ListingDetail to ListingCard so the Listings <Card> works.
 *  Only the fields the card actually reads. */
function detailToCard(d: NonNullable<Awaited<ReturnType<typeof arei.getListing>>>): ListingCardType {
  return {
    id: d.id,
    source_id: d.source_id,
    title: d.title,
    ai_descriptions: d.ai_descriptions,
    price: d.price,
    currency: d.currency,
    city: d.city,
    island: d.island,
    property_type: d.property_type,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    land_area_sqm: d.land_area_sqm,
    image_url: d.image_urls?.[0] ?? null,
    image_urls: d.image_urls,
    is_new: d.is_new,
    first_seen_at: d.first_seen_at,
    last_seen_at: d.last_seen_at,
  } as ListingCardType;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
}

interface IslandStat {
  island: string;
  count: number;
  avgPrice: number | null;
  marketMedian: number | null;
  /** Negative = user's avg below market median; positive = above. */
  vsPct: number | null;
}

export default function Saved() {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const locale = toLocale(i18n.language);
  const fmtPrice = (n: number | null | undefined) =>
    n == null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  useDocumentMeta(
    t("common.shortlist"),
    isPt ? "Imóveis guardados neste dispositivo." : "Properties you've saved on this device. A read-only index of public Cape Verde listings.",
  );

  const { saved, count, clear } = useSaved();
  const [cards, setCards] = useState<ListingCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(0);

  /* Suggestions for the empty state — three newest cards from the
     index. Fetched in parallel with the saved-listings hydrate so a
     visitor with an empty shortlist sees something tangible to bite
     into instead of a dead-end CTA. */
  const [suggestions, setSuggestions] = useState<ListingCardType[]>([]);

  /* Market stats for the vs-index comparison. Lazy-loaded only when
     the shortlist has items — empty-state visitors don't need it. */
  const [marketStats, setMarketStats] = useState<{
    total: number;
    sourceCount: number;
    islands: { island: string; median_price: number | null; n_price: number }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set(saved)];

    if (ids.length === 0) {
      setCards([]);
      setUnavailable(0);
      setLoading(false);
      /* Empty state — fetch newest 3 as suggestions. Silent on failure. */
      arei
        .getListings({ pageSize: 3 })
        .then((res) => {
          if (cancelled) return;
          setSuggestions(res.data);
        })
        .catch(() => {});
      return;
    }

    setLoading(true);
    Promise.all(ids.map((id) => arei.getListing(id).catch(() => null)))
      .then((resolved) => {
        if (cancelled) return;
        const found = resolved.filter((x): x is NonNullable<typeof x> => x !== null);
        setCards(found.map(detailToCard));
        setUnavailable(ids.length - found.length);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [saved]);

  /* Pull market stats once the shortlist is hydrated. Wrapped in
     Promise.resolve so a synchronously-thrown env error is caught. */
  useEffect(() => {
    if (cards.length === 0) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => arei.getMarketStats())
      .then((s) => {
        if (cancelled) return;
        setMarketStats(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cards.length]);

  const isEmpty = !loading && cards.length === 0;
  const hasItems = !loading && cards.length > 0;

  // Summary KPIs over the user's loaded shortlist.
  const summary = useMemo(() => {
    if (cards.length === 0) return null;
    const prices = cards.map((c) => c.price).filter((p): p is number => p != null);
    const totalValue = prices.reduce((sum, p) => sum + p, 0);
    const avgPrice = prices.length > 0 ? totalValue / prices.length : null;
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const islands = new Set(cards.map((c) => c.island).filter(Boolean));
    const sources = new Set(cards.map((c) => c.source_id).filter(Boolean));
    return {
      count: cards.length,
      avgPrice,
      minPrice,
      maxPrice,
      islands: islands.size,
      sources: sources.size,
    };
  }, [cards]);

  /* Vs-index analytics — group user's saves by island, compute their
     avg per island, then compare to the market median. Only islands
     with both a user-avg AND a market median are returned (no half
     rows). Sorted by the user's count desc so the islands they care
     about most are at the top. */
  const islandStats = useMemo<IslandStat[]>(() => {
    if (cards.length === 0 || !marketStats) return [];
    const byIsland = new Map<string, number[]>();
    for (const c of cards) {
      if (!c.island) continue;
      if (!byIsland.has(c.island)) byIsland.set(c.island, []);
      if (c.price != null) byIsland.get(c.island)!.push(c.price);
    }
    const out: IslandStat[] = [];
    for (const [island, prices] of byIsland) {
      const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : null;
      const market = marketStats.islands.find((i) => i.island === island);
      const marketMedian = market?.median_price ?? null;
      const vsPct =
        avgPrice != null && marketMedian != null && marketMedian > 0
          ? ((avgPrice - marketMedian) / marketMedian) * 100
          : null;
      out.push({
        island,
        count: prices.length || byIsland.get(island)!.length,
        avgPrice,
        marketMedian,
        vsPct,
      });
    }
    out.sort((a, b) => b.count - a.count);
    return out;
  }, [cards, marketStats]);

  const indexCoverage = useMemo(() => {
    if (!marketStats) return null;
    const userIslands = new Set(cards.map((c) => c.island).filter(Boolean));
    const userSources = new Set(cards.map((c) => c.source_id).filter(Boolean));
    return {
      indexTotal: marketStats.total,
      indexIslands: marketStats.islands.length,
      indexSources: marketStats.sourceCount,
      userIslands: userIslands.size,
      userSources: userSources.size,
    };
  }, [cards, marketStats]);

  const handleClear = () => {
    if (window.confirm(isPt ? "Limpar toda a sua lista? Isto afeta apenas este dispositivo." : "Clear your entire shortlist? This only affects this device.")) {
      clear();
    }
  };

  return (
    <div className="kv-saved">
      {/* ─── Header (off-white) ─── */}
      <header className="kv-saved-head">
        <div className="kv-saved-head-inner">
          <div className="kv-saved-eyebrow">{t("common.shortlist")}</div>
          <h1 className="kv-saved-title">
            {isEmpty ? (isPt ? "Ainda não guardou nada." : "Nothing saved yet.") : (isPt ? "A sua lista." : "Your shortlist.")}
          </h1>
          <div className="kv-saved-meta">
            <span><b>{count}</b> {count === 1 ? (isPt ? "imóvel" : "property") : (isPt ? "imóveis" : "properties")}</span>
            {unavailable > 0 && (
              <span><b>{unavailable}</b> {isPt ? "já não está no feed" : "no longer in feed"}</span>
            )}
            <span>{isPt ? "Apenas este dispositivo" : "This device only"}</span>
          </div>
        </div>
      </header>

      {/* ─── Loading skeleton ─── */}
      {loading && (
        <section className="kv-saved-section kv-saved-section-white">
          <div className="kv-saved-section-inner">
            <div className="kv-saved-loading-lbl">{isPt ? "A carregar lista" : "Loading shortlist"}</div>
            <div className="kv-saved-loading-skel" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>
        </section>
      )}

      {/* ─── Empty state (white) — lead + CTA + suggestion strip ─── */}
      {isEmpty && (
        <>
          <section className="kv-saved-section kv-saved-section-white">
            <div className="kv-saved-section-inner">
              <div className="kv-saved-empty">
                <p className="kv-saved-empty-lead">
                  {isPt
                    ? "Abra qualquer anúncio e toque em guardar na lista no resumo do anúncio. A lista fica neste navegador — sem conta, sem sincronização, sem marketing."
                    : <>Open any listing and tap <b>Save to shortlist</b> in the listing summary card. Your list lives in this browser — no account, no sync, no marketing.</>}
                </p>
                <Link to="/listings" className="kv-saved-cta">
                  <span>{t("common.browseAllListings")}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>

          {suggestions.length > 0 && (
            <section className="kv-saved-section kv-saved-section-paper">
              <div className="kv-saved-section-inner">
                <div className="kv-saved-section-head">
                  <div>
                    <div className="kv-saved-section-eyebrow">{isPt ? "Enquanto decide" : "While you decide"}</div>
                    <h2 className="kv-saved-section-title">{isPt ? "Mais recentes no índice." : "Newest on the index."}</h2>
                  </div>
                  <Link to="/listings" className="kv-saved-section-link">
                    {t("nav.allListingsCta")}
                  </Link>
                </div>
                <div className="kv-grid">
                  {suggestions.map((l) => <Card key={l.id} l={l} />)}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ─── Populated state (white) — summary + grid + utility ─── */}
      {hasItems && (
        <section className="kv-saved-section kv-saved-section-white">
          <div className="kv-saved-section-inner">
            {summary && (
              <div className="kv-saved-summary">
                <div className="kv-saved-summary-cell">
                  <div className="kv-saved-summary-lbl">{isPt ? "Preço pedido médio" : "Average asking"}</div>
                  <div className="kv-saved-summary-num">{fmtPrice(summary.avgPrice)}</div>
                </div>
                <div className="kv-saved-summary-cell">
                  <div className="kv-saved-summary-lbl">{isPt ? "Intervalo" : "Range"}</div>
                  <div className="kv-saved-summary-num">
                    {summary.minPrice != null && summary.maxPrice != null
                      ? `${fmtPrice(summary.minPrice)} – ${fmtPrice(summary.maxPrice)}`
                      : "—"}
                  </div>
                </div>
                <div className="kv-saved-summary-cell">
                  <div className="kv-saved-summary-lbl">{t("home.islands")}</div>
                  <div className="kv-saved-summary-num">{summary.islands}</div>
                </div>
                <div className="kv-saved-summary-cell">
                  <div className="kv-saved-summary-lbl">{isPt ? "Fontes" : "Sources"}</div>
                  <div className="kv-saved-summary-num">{summary.sources}</div>
                </div>
              </div>
            )}

            <div className="kv-grid">
              {cards.map((l) => <Card key={l.id} l={l} />)}
            </div>

            <div className="kv-saved-foot">
              <Link to="/listings" className="kv-saved-foot-link">
                <span>{t("common.browseAllListings")}</span>
                <span aria-hidden="true">→</span>
              </Link>
              <button
                type="button"
                className="kv-saved-foot-clear"
                onClick={handleClear}
              >
                {isPt ? "Limpar lista" : "Clear shortlist"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Vs-index analytics (off-white) — only when we have data
              for at least one island. Reads as an editorial close that
              gives the user's selection meaning against the broader
              market, not just a list of saves. ─── */}
      {hasItems && islandStats.length > 0 && (
        <section className="kv-saved-section kv-saved-section-paper kv-saved-vs">
          <div className="kv-saved-section-inner">
            <div className="kv-saved-section-head">
              <div>
                <div className="kv-saved-section-eyebrow">{isPt ? "Como compara" : "How yours compares"}</div>
                <h2 className="kv-saved-section-title">
                  {isPt ? "A sua lista face ao índice." : "Your shortlist against the index."}
                </h2>
                <p className="kv-saved-section-sub">
                  {isPt
                    ? "Comparamos o seu preço pedido médio por ilha com a mediana da mesma ilha no índice completo. Amostras pequenas são excluídas."
                    : "We compare your average asking price per island to the median for the same island across the full index. Small samples are excluded — only islands with enough liquidity for a stable median appear."}
                </p>
              </div>
              {indexCoverage && (
                <div className="kv-saved-coverage">
                  <div className="kv-saved-coverage-row">
                    <span className="kv-saved-coverage-k">{isPt ? "Total indexado" : "Indexed total"}</span>
                    <span className="kv-saved-coverage-v">{formatNumber(indexCoverage.indexTotal, locale)}</span>
                  </div>
                  <div className="kv-saved-coverage-row">
                    <span className="kv-saved-coverage-k">{isPt ? "As suas ilhas" : "Your islands"}</span>
                    <span className="kv-saved-coverage-v">
                      {indexCoverage.userIslands} {isPt ? "de" : "of"} {indexCoverage.indexIslands}
                    </span>
                  </div>
                  <div className="kv-saved-coverage-row">
                    <span className="kv-saved-coverage-k">{isPt ? "As suas fontes" : "Your sources"}</span>
                    <span className="kv-saved-coverage-v">
                      {indexCoverage.userSources} {isPt ? "de" : "of"} {indexCoverage.indexSources}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="kv-saved-vs-table">
              <div className="kv-saved-vs-row kv-saved-vs-head">
                <div>{isPt ? "Ilha" : "Island"}</div>
                <div>{isPt ? "Guardados" : "You saved"}</div>
                <div>{isPt ? "Média" : "Your avg"}</div>
                <div>{isPt ? "Mediana da ilha" : "Island median"}</div>
                <div>{isPt ? "Face ao mercado" : "Vs market"}</div>
              </div>
              {islandStats.map((s) => (
                <div className="kv-saved-vs-row" key={s.island}>
                  <div className="kv-saved-vs-island">{s.island}</div>
                  <div>{s.count}</div>
                  <div>{fmtPrice(s.avgPrice)}</div>
                  <div>{fmtPrice(s.marketMedian)}</div>
                  <div
                    className={
                      s.vsPct == null
                        ? "kv-saved-vs-pct"
                        : s.vsPct < -2
                          ? "kv-saved-vs-pct is-lower"
                          : s.vsPct > 2
                            ? "kv-saved-vs-pct is-higher"
                            : "kv-saved-vs-pct"
                    }
                  >
                    {s.vsPct == null ? "—" : fmtPct(s.vsPct)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Editorial close (green) ─── */}
      <NewsletterCta />
    </div>
  );
}
