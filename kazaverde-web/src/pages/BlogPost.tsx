import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDate, toLocale } from "../lib/formatters";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { getArticleBySlug, BLOG_ARTICLES } from "../lib/blog-data";
import { arei } from "../lib/arei";
import NewsletterCta from "../components/NewsletterCta";
import "./BlogPost.css";

/* Active scrape sources count — keep in sync with markets/cv/sources.yml lifecycleOverride: IN */
const ACTIVE_SOURCE_COUNT = 9;

interface InlineCtaStats {
  total: number;
  islandCount: number;
}

/** Split article HTML at the first <hr> so an inline CTA can sit between
 *  the intro and the first body section. The trailing <hr> is dropped to
 *  avoid stacking with the CTA's own visual separator. */
function splitAtFirstHr(html: string): { intro: string; rest: string } {
  const match = html.match(/<hr\s*\/?\s*>/i);
  if (!match || match.index === undefined) return { intro: html, rest: "" };
  const idx = match.index + match[0].length;
  const intro = html.slice(0, match.index);
  const rest = html.slice(idx);
  return { intro, rest };
}


function categoryFor(tags: string[]): "buying" | "market" | "legal" | "tax" {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((x) => x.includes("legal"))) return "legal";
  if (t.some((x) => x.includes("tax"))) return "tax";
  if (t.some((x) => x.includes("market") || x.includes("yield"))) return "market";
  return "buying";
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function categoryLabelPt(cat: string): string {
  const labels: Record<string, string> = {
    buying: "Compra",
    market: "Mercado",
    legal: "Legal",
    tax: "Fiscal",
  };
  return labels[cat] ?? cat;
}

const TAG_PT: Record<string, string> = {
  Market: "Mercado",
  Markets: "Mercados",
  Islands: "Ilhas",
  Island: "Ilha",
  Data: "Dados",
  Buying: "Compra",
  Legal: "Legal",
  Guide: "Guia",
  Tax: "Fiscal",
  Rental: "Arrendamento",
  Yields: "Rentabilidade",
  Residency: "Residência",
  Mistakes: "Erros",
  Sal: "Sal",
  Santiago: "Santiago",
  "Off-plan": "Em planta",
  Management: "Gestão",
  Financing: "Financiamento",
  "Boa Vista": "Boa Vista",
};

const ARTICLE_PT: Record<string, { title: string; description: string }> = {
  "best-real-estate-agents-cape-verde": {
    title: "Melhores agentes imobiliários em Cabo Verde 2026 — guia completo",
    description:
      "Uma visão independente das agências imobiliárias de Cabo Verde acompanhadas pelo Cape Verde Real Estate Index — por ilha, orientação e especialização. Não é um ranking.",
  },
  "cape-verde-property-prices-by-island": {
    title: "Preços de imóveis em Cabo Verde por ilha: o que o Cape Verde Real Estate Index mostra atualmente",
    description:
      "Medianas de preços pedidos e contagens de anúncios por ilha, retiradas do Cape Verde Real Estate Index. Um retrato do inventário público anunciado em Cabo Verde, não do mercado completo.",
  },
  "buying-property-cape-verde-guide": {
    title: "Como comprar imóvel em Cabo Verde: guia passo a passo para compradores estrangeiros",
    description:
      "Cabo Verde permite que estrangeiros comprem imóveis em propriedade plena, sem restrições de nacionalidade. O enquadramento legal assenta no direito português.",
  },
  "which-cape-verde-island-property": {
    title: "Em que ilha de Cabo Verde deve comprar imóvel? Uma comparação baseada em dados",
    description:
      "As dez ilhas de Cabo Verde têm perfis, infraestruturas e mercados imobiliários distintos. Escolher a ilha certa é uma das decisões mais importantes.",
  },
  "cape-verde-property-tax-reform-2026": {
    title: "Reforma fiscal imobiliária de Cabo Verde em 2026: o que mudou e o que significa para compradores",
    description:
      "Em 1 de janeiro de 2026, Cabo Verde implementou a reforma fiscal imobiliária mais significativa em mais de 25 anos.",
  },
  "cape-verde-rental-yields-realistic": {
    title: "Rentabilidades de arrendamento em Cabo Verde: o que esperar realisticamente em 2026",
    description:
      "As promessas de rentabilidade em Cabo Verde variam entre conservadoras e demasiado otimistas. Antes de comprar para investimento, é importante perceber os fatores reais.",
  },
  "cape-verde-green-card-residency": {
    title: "Green Card de Cabo Verde: como obter residência através de investimento imobiliário",
    description:
      "O programa Green Card de Cabo Verde oferece residência permanente a estrangeiros que investem em imobiliário nas ilhas.",
  },
  "mistakes-buying-property-cape-verde": {
    title: "7 erros caros a evitar ao comprar imóvel em Cabo Verde",
    description:
      "O mercado imobiliário cabo-verdiano é acessível e o processo de compra é relativamente claro, mas há erros que podem custar caro.",
  },
  "sal-vs-santiago-property": {
    title: "Sal vs Santiago: que ilha de Cabo Verde faz sentido para compradores de imóvel?",
    description:
      "Sal e Santiago são dois dos mercados imobiliários mais ativos de Cabo Verde, mas servem perfis de comprador muito diferentes.",
  },
  "off-plan-property-cape-verde-risks": {
    title: "Comprar imóvel em planta em Cabo Verde: riscos, proteções e o que verificar",
    description:
      "Compras em planta são comuns em Cabo Verde, sobretudo em empreendimentos turísticos no Sal e na Boa Vista. Convém saber o que verificar.",
  },
  "cape-verde-property-management-remotely": {
    title: "Gerir imóvel em Cabo Verde à distância: guia para proprietários estrangeiros",
    description:
      "A maioria dos compradores estrangeiros em Cabo Verde não vive na ilha onde o imóvel se encontra. A gestão à distância exige preparação operacional.",
  },
  "financing-property-cape-verde": {
    title: "Como financiar a compra de imóvel em Cabo Verde enquanto comprador estrangeiro",
    description:
      "Compras a pronto dominam o mercado estrangeiro em Cabo Verde. Existem créditos locais, mas são caros e difíceis para não residentes.",
  },
  "boa-vista-property-guide": {
    title: "Guia imobiliário da Boa Vista: o que os compradores precisam de saber em 2026",
    description:
      "A Boa Vista é a segunda grande ilha turística de Cabo Verde e um dos mercados imobiliários mais ativos, muitas vezes vista como alternativa de crescimento ao Sal.",
  },
};

const MONTH_PT: Record<string, string> = {
  January: "janeiro",
  February: "fevereiro",
  March: "março",
  April: "abril",
  May: "maio",
  June: "junho",
  July: "julho",
  August: "agosto",
  September: "setembro",
  October: "outubro",
  November: "novembro",
  December: "dezembro",
};

function localizeReadTime(readTime: string, isPt: boolean): string {
  return isPt ? readTime.replace("min read", "min de leitura") : readTime;
}

function localizeTags(tags: string[], isPt: boolean): string {
  return (isPt ? tags.map((tag) => TAG_PT[tag] ?? tag) : tags).join(" · ");
}

function localizeArticleMetadataHtml(html: string, isPt: boolean): string {
  if (!isPt) return html;
  return html.replace(/Last updated:\s*([A-Za-z]+)\s+(\d{4})/g, (_match, month, year) => {
    const localizedMonth = MONTH_PT[month] ?? month;
    return `Última atualização: ${localizedMonth.charAt(0).toUpperCase()}${localizedMonth.slice(1)} de ${year}`;
  });
}

/** Inject id="..." attributes onto h2 tags in the article HTML so the
 *  TOC can scroll to them. Slug = lowercase, hyphenated text content. */
function decorateHtml(html: string): { html: string; toc: { id: string; label: string }[] } {
  const toc: { id: string; label: string }[] = [];
  const withHeadingIds = html.replace(/<h2(?:\s+[^>]*)?>([\s\S]*?)<\/h2>/gi, (_m, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60);
    toc.push({ id, label: text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  const out = withHeadingIds.replace(/<table(?:\s+[^>]*)?>[\s\S]*?<\/table>/gi, (tableHtml) => {
    const columnCount = (tableHtml.match(/<th(?:\s+[^>]*)?>/gi) ?? []).length;
    const isWide = columnCount >= 4;
    const className = `kv-bp-table-scroll${isWide ? " is-wide" : ""}`;
    const hint = isWide
      ? '<div class="kv-bp-table-hint">Scroll sideways to view all columns.</div>'
      : "";
    return `<div class="${className}">${hint}${tableHtml}</div>`;
  });
  return { html: out, toc };
}

export default function BlogPost() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const locale = toLocale(i18n.language);
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticleBySlug(slug) : undefined;
  const localizedArticle = article && isPt ? ARTICLE_PT[article.slug] : undefined;

  useDocumentMeta(
    article ? localizedArticle?.title ?? article.title : t("blogPost.notFoundTitle"),
    article ? localizedArticle?.description ?? article.description : "",
    article?.heroImage ? { image: article.heroImage } : undefined,
  );

  const { html: decoratedHtml, toc } = useMemo(
    () => (article ? decorateHtml(localizeArticleMetadataHtml(article.content, isPt)) : { html: "", toc: [] }),
    [article, isPt],
  );

  /* Split decorated HTML at first <hr> — intro carries no h2s in current
     articles, so TOC built from full decoratedHtml stays accurate. */
  const split = useMemo(() => splitAtFirstHr(decoratedHtml), [decoratedHtml]);

  const [stats, setStats] = useState<InlineCtaStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    /* getMarketStats throws synchronously when Supabase env is missing,
       so wrap in Promise.resolve to convert to a rejected promise. */
    Promise.resolve()
      .then(() => arei.getMarketStats())
      .then((s) => {
        if (cancelled) return;
        setStats({ total: s.total, islandCount: s.islands.length });
      })
      .catch(() => {
        /* Silent: CTA falls back to a generic message. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inlineCtaBody = stats
    ? isPt
      ? `${stats.total} anúncios verificados em ${stats.islandCount} ilhas, recolhidos de ${ACTIVE_SOURCE_COUNT} agentes — atualizados diariamente.`
      : `${stats.total} verified listings across ${stats.islandCount} islands, sourced from ${ACTIVE_SOURCE_COUNT} agents — updated daily.`
    : isPt
      ? `Anúncios verificados em todo o arquipélago, recolhidos de ${ACTIVE_SOURCE_COUNT} agentes — atualizados diariamente.`
      : `Verified listings across the archipelago, sourced from ${ACTIVE_SOURCE_COUNT} agents — updated daily.`;

  const [activeId, setActiveId] = useState<string>("");
  const bodyRef = useRef<HTMLElement>(null);

  // Highlight TOC item matching the heading currently in view.
  useEffect(() => {
    if (!bodyRef.current || toc.length === 0) return;
    const headings = Array.from(bodyRef.current.querySelectorAll<HTMLElement>("h2[id]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  if (!article) {
    return (
      <div className="kv-bp">
        <div className="kv-bp-not-found">
          <h1>{t("blogPost.notFoundTitle")}</h1>
          <p>{t("blogPost.notFoundBody")}</p>
          <button onClick={() => navigate("/blog")} className="kv-btn">{t("blogPost.allGuides")} →</button>
        </div>
      </div>
    );
  }

  const cat = categoryFor(article.tags);
  const articleNumber = BLOG_ARTICLES.findIndex((a) => a.slug === article.slug) + 1;
  const related = BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="kv-bp">
      {/* Off-white breadcrumb bar */}
      <div className="kv-bp-crumb">
        <div className="kv-bp-crumb-inner">
          <Link to="/">{isPt ? "Índice" : "Index"}</Link>
          <span className="kv-bp-crumb-sep">/</span>
          <Link to="/blog">{isPt ? "Guias" : "Guides"}</Link>
          <span className="kv-bp-crumb-sep">/</span>
          <span className="kv-bp-crumb-cur">{localizedArticle?.title ?? article.title}</span>
        </div>
      </div>

      {/* Article header */}
      <header className="kv-bp-head">
        <div className="kv-bp-head-inner">
          {isPt && (
            <div className="kv-bp-translation-banner">
              Esta página ainda não está totalmente disponível em português — o corpo do artigo permanece em inglês.
            </div>
          )}
          <div className="kv-bp-eyebrow-row">
            <span className="kv-eyebrow-cat" data-cat={cat}>{isPt ? categoryLabelPt(cat) : categoryLabel(cat)}</span>
            <span className="kv-bp-divider" />
            <span className="kv-bp-num">{isPt ? "Guia" : "Guide"} № {String(articleNumber).padStart(2, "0")}</span>
          </div>
          <h1 className="kv-bp-title">{localizedArticle?.title ?? article.title}</h1>
          <p className="kv-bp-deck">{localizedArticle?.description ?? article.description}</p>
          <div className="kv-bp-byline">
            <span>{formatDate(article.date, locale)}</span>
            <span>{localizeReadTime(article.readTime, isPt)}</span>
            {article.tags.length > 0 && <span>{localizeTags(article.tags, isPt)}</span>}
          </div>
        </div>
      </header>

      {/* Body — 2 col with sticky TOC */}
      <div className="kv-bp-wrap">
        <div className="kv-bp-grid">
          <article
            ref={bodyRef}
            className="kv-bp-body kv-prose"
            dangerouslySetInnerHTML={{ __html: decoratedHtml }}
          />

          <aside className="kv-bp-side">
            {toc.length > 0 && (
              <nav className="kv-bp-toc">
                <div className="kv-bp-toc-head">{isPt ? "Conteúdo" : "Contents"}</div>
                <ul>
                  {toc.map((item) => (
                    <li key={item.id} className={activeId === item.id ? "is-active" : ""}>
                      <a href={`#${item.id}`}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* CTA sits under the TOC so it stays visible alongside body
                content for SEO landings without breaking reading flow. */}
            <div className="kv-bp-cta">
              <div className="kv-bp-cta-eyebrow">{isPt ? "Ver o índice" : "Browse the index"}</div>
              <div className="kv-bp-cta-heading">{isPt ? "Pronto para pesquisar?" : "Ready to browse?"}</div>
              <p className="kv-bp-cta-body">{inlineCtaBody}</p>
              <Link to="/listings" className="kv-btn kv-btn-primary kv-btn-block">
                {isPt ? "Ver todos os anúncios" : "Browse all listings"} →
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* End-of-article CTA — visible inline after the body so SEO
          landings get a clear path to the index, not just a sidebar
          on desktop. Mirrors the sidebar CTA copy but presented as
          a full-width editorial close before related guides. */}
      <section className="kv-bp-end-cta">
        <div className="kv-bp-end-cta-inner">
          <div className="kv-bp-end-cta-eyebrow">{isPt ? "Ver o índice" : "Browse the index"}</div>
          <h2 className="kv-bp-end-cta-heading">
            {isPt ? "Terminou a leitura? Veja o que está realmente à venda." : "Done reading? See what's actually for sale."}
          </h2>
          <p className="kv-bp-end-cta-body">
            {isPt
              ? `${ACTIVE_SOURCE_COUNT}+ fontes acompanhadas, com atribuição à fonte e atualização diária. Filtre por ilha, faixa de preço, quartos e tipo de imóvel — cada anúncio liga ao agente original.`
              : `${ACTIVE_SOURCE_COUNT}+ tracked sources, source-attributed and updated daily. Filter by island, price band, bedrooms, and property type — every listing links back to the original agent.`}
          </p>
          <div className="kv-bp-end-cta-actions">
            <Link to="/listings" className="kv-bp-end-cta-primary">
              <span>{isPt ? "Ver todos os anúncios" : "Browse all listings"}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/market" className="kv-bp-end-cta-ghost">
              <span>{isPt ? "Ver dados de mercado" : "See market data"}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Related guides */}
      {related.length > 0 && (
        <section className="kv-bp-related">
          <div className="kv-bp-related-inner">
            <div className="kv-bp-related-head">
              <h2>{isPt ? "Guias relacionados" : "Related guides"}</h2>
              <Link to="/blog">{isPt ? "Todos os guias" : "All guides"} →</Link>
            </div>
            <div className="kv-bp-related-grid">
              {related.map((a) => {
                const rcat = categoryFor(a.tags);
                const rnum = BLOG_ARTICLES.findIndex((x) => x.slug === a.slug) + 1;
                return (
                  <Link key={a.slug} to={`/blog/${a.slug}`} className="kv-bp-rel-card" data-cat={rcat}>
                    <div className="kv-bp-rel-band">
                      <span className="kv-eyebrow-cat" data-cat={rcat}>{isPt ? categoryLabelPt(rcat) : categoryLabel(rcat)}</span>
                      <span className="kv-bp-rel-num">№ {String(rnum).padStart(2, "0")}</span>
                    </div>
                    <div className="kv-bp-rel-title">{isPt ? ARTICLE_PT[a.slug]?.title ?? a.title : a.title}</div>
                    <div className="kv-bp-rel-foot">
                      <span>{formatDate(a.date, locale)}</span>
                      <span>{localizeReadTime(a.readTime, isPt)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <NewsletterCta />
    </div>
  );
}
