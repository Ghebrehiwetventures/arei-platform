import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { BriefingRow, BriefingSummary, MarketReportRow, BriefingConfidence } from "arei-sdk";
import { isPublicIslandRow, deriveBriefingConfidence, isBaselineEdition } from "arei-sdk";
import { arei } from "../lib/arei";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import {
  formatDate,
  formatMedian,
  formatNumber,
  formatPricePerSqm,
  toLocale,
} from "../lib/formatters";
import PageHeader from "../components/PageHeader";
import "./Briefing.css";

/* ════════════════════════════════════════════════════════════
   Briefing — canonical edition page (/briefings/:slug).
   An institutional market-research publication rendered on web:
   headline → executive summary → KPIs → island breakdown →
   commentary → methodology → archive. Editorial fields come from
   market_briefings; the numbers come from the market_report_snapshots
   rows sharing the edition's snapshot_date. Print-friendly so the page
   saves cleanly as a PDF.
   ════════════════════════════════════════════════════════════ */

const STANDARD_METHODOLOGY_EN =
  "Figures are derived from public Cape Verde property listings tracked by the " +
  "Cape Verde Real Estate Index. Listing counts reflect screened, monitored " +
  "listings. Median asking price and average €/m² are computed only from " +
  "methodology-eligible records — sale listings priced in EUR within range and " +
  "not superseded — and are withheld when the eligible sample is below five. " +
  "These are asking prices from public listings, not completed sale prices, " +
  "bank valuations, or official registry data.";

const STANDARD_METHODOLOGY_PT =
  "Os valores derivam de anúncios públicos de imóveis em Cabo Verde acompanhados " +
  "pelo Cape Verde Real Estate Index. As contagens refletem anúncios filtrados e " +
  "monitorizados. O preço-pedido mediano e o €/m² médio são calculados apenas a " +
  "partir de registos elegíveis pela metodologia — anúncios de venda em EUR " +
  "dentro do intervalo e não substituídos — e são omitidos quando a amostra " +
  "elegível é inferior a cinco. São preços-pedidos de anúncios públicos, não " +
  "preços de venda concluídos, avaliações bancárias ou dados de registo oficiais.";

/* Standard disclosure line — the briefing's positioning, shown as the
   methodology lead. (Briefing v2.) */
const DISCLOSURE_EN =
  "The briefing interprets observed listing activity. It does not claim to " +
  "measure completed transactions or property values.";
const DISCLOSURE_PT =
  "A briefing interpreta a atividade de anúncios observada. Não pretende medir " +
  "transações concluídas ou valores de imóveis.";

/* Median / €/m² are withheld below this many methodology-eligible records
   (mirrors migration 044's MIN_ELIGIBLE_MEDIAN). Used only to flag small-sample
   islands in the breakdown — the values themselves are already null from 044. */
const SMALL_SAMPLE_MIN = 5;

function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function Briefing() {
  const { slug = "" } = useParams();
  const { i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const locale = toLocale(i18n.language);

  const [briefing, setBriefing] = useState<BriefingRow | null>(null);
  const [snapshot, setSnapshot] = useState<MarketReportRow[]>([]);
  const [others, setOthers] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta(
    briefing?.title ?? (isPt ? "Briefing de mercado" : "Market briefing"),
    briefing?.executive_summary ??
      (isPt
        ? "Briefing mensal do índice de anúncios de Cabo Verde."
        : "Monthly Cape Verde listing index briefing."),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    async function load() {
      try {
        const [result, list] = await Promise.all([
          arei.getBriefing(slug),
          arei.listBriefings(),
        ]);
        if (cancelled) return;
        if (!result) {
          setNotFound(true);
          return;
        }
        setBriefing(result.briefing);
        setSnapshot(result.snapshot);
        setOthers(list.filter((b) => b.slug !== slug));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load briefing.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const allRow = useMemo(
    () => snapshot.find((r) => r.island === "ALL") ?? null,
    [snapshot],
  );
  // Public island breakdown: real islands only (excludes 'ALL' + internal
  // sentinel rows like '__hidden_for_dedup__'). getBriefing already strips
  // sentinels; this is the belt-and-suspenders page-level filter.
  const islandRows = useMemo(
    () =>
      snapshot
        .filter((r) => isPublicIslandRow(r.island))
        .sort((a, b) => b.listing_count - a.listing_count),
    [snapshot],
  );
  // Derived (never stored): confidence from the snapshot, baseline from order.
  const confidence = useMemo(() => deriveBriefingConfidence(snapshot), [snapshot]);
  const baseline = useMemo(
    () =>
      briefing
        ? isBaselineEdition(briefing.snapshot_date, others.map((o) => o.snapshot_date))
        : false,
    [briefing, others],
  );

  if (loading) {
    return (
      <div className="kv-bf-state">
        <p>{isPt ? "A carregar briefing…" : "Loading briefing…"}</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="kv-bf-state kv-bf-state-error">
        <h1>{isPt ? "Briefing não encontrado" : "Briefing not found"}</h1>
        <p>
          {isPt
            ? "Esta edição não existe ou ainda não foi publicada."
            : "This edition does not exist or has not been published."}
        </p>
        <Link className="kv-bf-back" to="/market/briefings">
          {isPt ? "← Ver todas as edições" : "← View all editions"}
        </Link>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="kv-bf-state kv-bf-state-error">
        <h1>{isPt ? "Briefing indisponível" : "Briefing unavailable"}</h1>
        <p>
          {isPt
            ? "Esta edição não está disponível de momento."
            : "This edition is not available right now."}
        </p>
        <Link className="kv-bf-back" to="/market/briefings">
          {isPt ? "← Ver todas as edições" : "← View all editions"}
        </Link>
      </div>
    );
  }

  const methodology =
    briefing.methodology_note ??
    (isPt ? STANDARD_METHODOLOGY_PT : STANDARD_METHODOLOGY_EN);
  const commentaryParas = paragraphs(briefing.commentary);

  return (
    <article className="kv-bf">
      {/* 1 — Headline (shared site PageHeader) */}
      <PageHeader
        eyebrow={`${isPt ? "Briefing do índice" : "Index briefing"} · ${briefing.period}`}
        title={briefing.title}
        sub={
          isPt
            ? `Publicado ${formatDate(briefing.published_at, locale)} · Dados de ${formatDate(briefing.snapshot_date, locale, true)} · Publicado pela AREI`
            : `Published ${formatDate(briefing.published_at, locale)} · Data as of ${formatDate(briefing.snapshot_date, locale, true)} · Published by AREI`
        }
      />

      <main className="kv-bf-inner kv-bf-body">
        {/* 2 — Executive summary */}
        {briefing.executive_summary && (
          <section className="kv-bf-summary">
            <p className="kv-bf-section-kicker">
              {isPt ? "Resumo executivo" : "Executive summary"}
            </p>
            <p className="kv-bf-summary-lead">{briefing.executive_summary}</p>
          </section>
        )}

        {/* 2b — Key takeaways */}
        {briefing.key_takeaways && briefing.key_takeaways.length > 0 && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Conclusões principais" : "Key takeaways"}
            </h2>
            <ul className="kv-bf-takeaways">
              {briefing.key_takeaways.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 3 — Key market metrics */}
        {allRow && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Métricas-chave do mercado" : "Key market metrics"}
            </h2>
            <div className="kv-bf-kpis">
              <div className="kv-bf-kpi">
                <span className="kv-bf-kpi-val">
                  {formatNumber(allRow.listing_count, locale)}
                </span>
                <span className="kv-bf-kpi-label">
                  {isPt ? "Anúncios acompanhados" : "Listings tracked"}
                </span>
              </div>
              <div className="kv-bf-kpi">
                <span className="kv-bf-kpi-val">
                  {formatMedian(allRow.median_price_eur, locale)}
                </span>
                <span className="kv-bf-kpi-label">
                  {isPt ? "Preço-pedido mediano" : "Median asking price"}
                </span>
              </div>
              <div className="kv-bf-kpi">
                <span className="kv-bf-kpi-val">
                  {formatPricePerSqm(allRow.avg_eur_per_sqm, locale)}
                </span>
                <span className="kv-bf-kpi-label">
                  {isPt ? "€/m² médio" : "Avg €/m²"}
                </span>
              </div>
              <div className="kv-bf-kpi">
                <span className="kv-bf-kpi-val">
                  {formatNumber(allRow.source_count, locale)}
                </span>
                <span className="kv-bf-kpi-label">
                  {isPt ? "Fontes acompanhadas" : "Sources tracked"}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 4 — Island breakdown */}
        {islandRows.length > 0 && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Desagregação por ilha" : "Island breakdown"}
            </h2>
            <div className="kv-bf-table-wrap">
              <table className="kv-bf-table">
                <thead>
                  <tr>
                    <th>{isPt ? "Ilha" : "Island"}</th>
                    <th className="num">{isPt ? "Anúncios" : "Listings"}</th>
                    <th className="num">{isPt ? "Elegíveis" : "Eligible"}</th>
                    <th className="num">{isPt ? "Mediana" : "Median"}</th>
                    <th className="num">{isPt ? "€/m² médio" : "Avg €/m²"}</th>
                    <th className="num">{isPt ? "Fontes" : "Sources"}</th>
                  </tr>
                </thead>
                <tbody>
                  {islandRows.map((r) => {
                    const smallSample = r.index_eligible_count < SMALL_SAMPLE_MIN;
                    return (
                      <tr key={r.island}>
                        <td className="kv-bf-island">
                          {r.island}
                          {smallSample && (
                            <span
                              className="kv-bf-flag"
                              title={
                                isPt
                                  ? "Amostra pequena — mediana e €/m² omitidos"
                                  : "Small sample — median and €/m² withheld"
                              }
                            >
                              n&lt;5
                            </span>
                          )}
                        </td>
                        <td className="num">{formatNumber(r.listing_count, locale)}</td>
                        <td className="num">{formatNumber(r.index_eligible_count, locale)}</td>
                        <td className={`num${smallSample ? " is-withheld" : ""}`}>
                          {formatMedian(r.median_price_eur, locale)}
                        </td>
                        <td className={`num${smallSample ? " is-withheld" : ""}`}>
                          {formatPricePerSqm(r.avg_eur_per_sqm, locale)}
                        </td>
                        <td className="num">{formatNumber(r.source_count, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Derived data notes — explain the public output from the data
                itself. No editorial fields involved (those arrive in PR B). */}
            <div className="kv-bf-datanotes">
              <span className="kv-bf-datanotes-label">
                {isPt ? "Notas sobre os dados" : "Data notes"}
              </span>
              <ul>
                <li>
                  {isPt
                    ? "Ilhas com menos de cinco registos elegíveis (n<5) têm a mediana e o €/m² omitidos."
                    : "Islands with fewer than five eligible records (n<5) have median and €/m² withheld."}
                </li>
                <li>
                  {isPt
                    ? "Linhas técnicas internas são excluídas desta desagregação pública."
                    : "Internal technical rows are excluded from this public breakdown."}
                </li>
                <li>
                  {isPt
                    ? "Sinal baseado em anúncios (preços-pedidos), não preços de transação."
                    : "Listing-based signal (asking prices), not transaction prices."}
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* 5 — Key observations (reuses the commentary field) + baseline note */}
        {(commentaryParas.length > 0 || baseline) && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Observações principais" : "Key observations"}
            </h2>
            {baseline && (
              <p className="kv-bf-baseline">
                {isPt
                  ? "Baseline estabelecida. A comparação mês-a-mês começa na próxima edição."
                  : "Baseline established. Month-over-month comparison begins with the next edition."}
              </p>
            )}
            <div className="kv-bf-prose">
              {commentaryParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* 6 — Supply & price signals (editorial) */}
        {briefing.supply_price_note && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Sinais de oferta e preço" : "Supply & price signals"}
            </h2>
            <div className="kv-bf-prose">
              {paragraphs(briefing.supply_price_note).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* 7 — Island notes (editorial, short/optional) */}
        {briefing.island_notes && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Notas por ilha" : "Island notes"}
            </h2>
            <div className="kv-bf-prose">
              {paragraphs(briefing.island_notes).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* 8 — News context (manual, neutral, sourced).
            Array.isArray guards against a malformed (non-array) jsonb value. */}
        {Array.isArray(briefing.news_items) && briefing.news_items.length > 0 && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Contexto de notícias" : "News context"}
            </h2>
            <ul className="kv-bf-news">
              {briefing.news_items.map((item, i) => (
                <li key={i} className="kv-bf-news-item">
                  <div className="kv-bf-news-meta">
                    <span>{item.source}</span>
                    {item.date && <span className="kv-bf-news-date">{item.date}</span>}
                  </div>
                  {item.url ? (
                    <a
                      className="kv-bf-news-title"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.title} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="kv-bf-news-title">{item.title}</span>
                  )}
                  {item.note && <p className="kv-bf-news-note">{item.note}</p>}
                </li>
              ))}
            </ul>
            <p className="kv-bf-news-disclaimer">
              {isPt
                ? "Contexto externo apenas. Não implica relação causal com os preços observados."
                : "External context only. No causal link to observed prices is implied."}
            </p>
          </section>
        )}

        {/* 9 — Data confidence (derived from the snapshot; v0.1 rule) */}
        {confidence && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Confiança nos dados" : "Data confidence"}
            </h2>
            <div className={`kv-bf-conf kv-bf-conf-${confidence.level}`}>
              <span className="kv-bf-conf-level">
                {isPt
                  ? { high: "Alta", medium: "Média", low: "Baixa" }[confidence.level]
                  : confidence.level.toUpperCase()}
              </span>
              <ul className="kv-bf-conf-why">
                <li>
                  {isPt ? "Registos elegíveis: " : "Eligible records: "}
                  <b>{formatNumber(confidence.indexEligibleCount, locale)}</b>
                </li>
                <li>
                  {isPt ? "Cobertura de preço: " : "Price coverage: "}
                  <b>{confidence.priceCoveragePct === null ? "—" : `${confidence.priceCoveragePct}%`}</b>
                </li>
                <li>
                  {isPt ? "Cobertura de m²: " : "Sqm coverage: "}
                  <b>{confidence.sqmCoveragePct === null ? "—" : `${confidence.sqmCoveragePct}%`}</b>
                </li>
                {confidence.smallSampleIslands > 0 && (
                  <li>
                    {isPt
                      ? `Ilhas com amostra pequena (n<5): `
                      : `Small-sample islands (n<5): `}
                    <b>{formatNumber(confidence.smallSampleIslands, locale)}</b>
                  </li>
                )}
              </ul>
            </div>
            <p className="kv-bf-conf-note">
              {isPt
                ? "Regra de confiança v0.1 — heurística ajustável baseada na cobertura e no tamanho da amostra, não uma verdade permanente."
                : "Confidence rule v0.1 — a tunable heuristic from coverage and sample size, not permanent truth."}
            </p>
          </section>
        )}

        {/* 10 — Methodology / disclosure */}
        <section className="kv-bf-section kv-bf-methodology">
          <h2 className="kv-bf-section-head">
            {isPt ? "Metodologia e divulgação" : "Methodology & disclosure"}
          </h2>
          <p className="kv-bf-disclosure">{isPt ? DISCLOSURE_PT : DISCLOSURE_EN}</p>
          <p>{methodology}</p>
        </section>

        {/* 7 — Archive navigation */}
        <nav className="kv-bf-archive" aria-label={isPt ? "Edições anteriores" : "Previous editions"}>
          <p className="kv-bf-section-kicker">
            {isPt ? "Edições anteriores" : "Previous editions"}
          </p>
          {others.length > 0 ? (
            <ul className="kv-bf-archive-list">
              {others.map((b) => (
                <li key={b.slug}>
                  <Link to={`/market/briefings/${b.slug}`}>
                    <span className="kv-bf-archive-period">{b.period}</span>
                    <span className="kv-bf-archive-title">{b.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="kv-bf-archive-empty">
              {isPt ? "Esta é a única edição até à data." : "This is the only edition to date."}
            </p>
          )}
          <Link className="kv-bf-archive-all" to="/market/briefings">
            {isPt ? "Ver todas as edições →" : "View all editions →"}
          </Link>
        </nav>
      </main>
    </article>
  );
}
