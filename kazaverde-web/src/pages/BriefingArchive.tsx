import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { BriefingSummary } from "arei-sdk";
import { arei } from "../lib/arei";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { formatDate, toLocale } from "../lib/formatters";
import PageHeader from "../components/PageHeader";
import "./Briefing.css";

/* ════════════════════════════════════════════════════════════
   BriefingArchive — index of published editions (/briefings).
   A publication archive, newest first. Each entry links to its
   canonical edition page at /briefings/:slug. Uses the shared
   PageHeader so it reads as part of the same site as Guides / News.
   ════════════════════════════════════════════════════════════ */

export default function BriefingArchive() {
  const { i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const locale = toLocale(i18n.language);

  const [editions, setEditions] = useState<BriefingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // No published edition yet — or the read failed — both resolve to the same
  // calm empty state. A raw backend error is never shown to visitors.
  const [failed, setFailed] = useState(false);

  useDocumentMeta(
    isPt ? "Briefings de mercado" : "Market briefings",
    isPt
      ? "Arquivo de briefings mensais do índice de anúncios de Cabo Verde."
      : "Archive of monthly Cape Verde listing index briefings.",
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await arei.listBriefings();
        if (!cancelled) setEditions(list);
      } catch (e) {
        // Log for debugging; never surface the raw error to the page.
        console.error("[briefings] listBriefings failed:", e);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const showEmpty = !loading && (failed || editions.length === 0);

  return (
    <div className="kv-bf-archive-page">
      <PageHeader
        eyebrow={isPt ? "Publicado pela AREI" : "Published by AREI"}
        title={isPt ? "Cape Verde Listing Index — Briefings" : "Cape Verde Listing Index — Briefings"}
        sub={
          isPt
            ? "Briefings mensais de mercado, gerados a partir de dados de índice ao vivo. Gratuitos e arquivados de forma permanente."
            : "Monthly market briefings, generated from live index data. Free and permanently archived."
        }
      />

      <main className="kv-bf-inner kv-bf-body">
        {loading ? (
          <div className="kv-bf-state">
            <p>{isPt ? "A carregar edições…" : "Loading editions…"}</p>
          </div>
        ) : showEmpty ? (
          <div className="kv-bf-empty">
            <h2>{isPt ? "A primeira edição em breve" : "First edition coming soon"}</h2>
            <p>
              {isPt
                ? "Ainda não foi publicado nenhum briefing. Volte em breve para a primeira edição."
                : "No briefing has been published yet. Check back soon for the first edition."}
            </p>
          </div>
        ) : (
          <ul className="kv-bf-index-list">
            {editions.map((b) => (
              <li key={b.slug} className="kv-bf-index-item">
                <Link to={`/briefings/${b.slug}`} className="kv-bf-index-link">
                  <div className="kv-bf-index-meta">
                    <span className="kv-bf-index-period">{b.period}</span>
                    <span className="kv-bf-index-date">
                      {formatDate(b.published_at, locale)}
                    </span>
                  </div>
                  <h2 className="kv-bf-index-title">{b.title}</h2>
                  {b.executive_summary && (
                    <p className="kv-bf-index-summary">{b.executive_summary}</p>
                  )}
                  <span className="kv-bf-index-cta">
                    {isPt ? "Ler edição →" : "Read edition →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
