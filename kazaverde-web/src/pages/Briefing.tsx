import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { BriefingRow, BriefingSummary, MarketReportRow } from "arei-sdk";
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
  const islandRows = useMemo(
    () =>
      snapshot
        .filter((r) => r.island !== "ALL")
        .sort((a, b) => b.listing_count - a.listing_count),
    [snapshot],
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
        <Link className="kv-bf-back" to="/briefings">
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
        <Link className="kv-bf-back" to="/briefings">
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
                  {islandRows.map((r) => (
                    <tr key={r.island}>
                      <td>{r.island}</td>
                      <td className="num">{formatNumber(r.listing_count, locale)}</td>
                      <td className="num">
                        {formatNumber(r.index_eligible_count, locale)}
                      </td>
                      <td className="num">{formatMedian(r.median_price_eur, locale)}</td>
                      <td className="num">
                        {formatPricePerSqm(r.avg_eur_per_sqm, locale)}
                      </td>
                      <td className="num">{formatNumber(r.source_count, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="kv-bf-table-note">
              {isPt
                ? "Mediana e €/m² são omitidos quando a amostra elegível é inferior a cinco."
                : "Median and €/m² are withheld where the eligible sample is below five."}
            </p>
          </section>
        )}

        {/* 5 — Commentary */}
        {commentaryParas.length > 0 && (
          <section className="kv-bf-section">
            <h2 className="kv-bf-section-head">
              {isPt ? "Comentário" : "Commentary"}
            </h2>
            <div className="kv-bf-prose">
              {commentaryParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        )}

        {/* 6 — Methodology note */}
        <section className="kv-bf-section kv-bf-methodology">
          <h2 className="kv-bf-section-head">
            {isPt ? "Nota metodológica" : "Methodology note"}
          </h2>
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
                  <Link to={`/briefings/${b.slug}`}>
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
          <Link className="kv-bf-archive-all" to="/briefings">
            {isPt ? "Ver todas as edições →" : "View all editions →"}
          </Link>
        </nav>
      </main>
    </article>
  );
}
