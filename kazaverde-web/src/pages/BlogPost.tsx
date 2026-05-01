import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticleBySlug(slug) : undefined;

  useDocumentMeta(
    article ? `${article.title} — KazaVerde` : "Article not found",
    article?.description ?? "",
    article?.heroImage ? { image: article.heroImage } : undefined,
  );

  const { html: decoratedHtml, toc } = useMemo(
    () => (article ? decorateHtml(article.content) : { html: "", toc: [] }),
    [article],
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
    ? `${stats.total} verified listings across ${stats.islandCount} islands, sourced from ${ACTIVE_SOURCE_COUNT} agents — updated daily.`
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
          <h1>Article not found</h1>
          <p>This guide may have been moved or renamed.</p>
          <button onClick={() => navigate("/blog")} className="kv-btn">All guides →</button>
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
          <Link to="/">Index</Link>
          <span className="kv-bp-crumb-sep">/</span>
          <Link to="/blog">Guides</Link>
          <span className="kv-bp-crumb-sep">/</span>
          <span className="kv-bp-crumb-cur">{article.title}</span>
        </div>
      </div>

      {/* Article header */}
      <header className="kv-bp-head">
        <div className="kv-bp-head-inner">
          <div className="kv-bp-eyebrow-row">
            <span className="kv-eyebrow-cat" data-cat={cat}>{categoryLabel(cat)}</span>
            <span className="kv-bp-divider" />
            <span className="kv-bp-num">Guide № {String(articleNumber).padStart(2, "0")}</span>
          </div>
          <h1 className="kv-bp-title">{article.title}</h1>
          <p className="kv-bp-deck">{article.description}</p>
          <div className="kv-bp-byline">
            <span>{fmtDate(article.date)}</span>
            <span>{article.readTime}</span>
            {article.tags.length > 0 && <span>{article.tags.join(" · ")}</span>}
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
                <div className="kv-bp-toc-head">Contents</div>
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
              <div className="kv-bp-cta-eyebrow">Browse the index</div>
              <div className="kv-bp-cta-heading">Ready to browse?</div>
              <p className="kv-bp-cta-body">{inlineCtaBody}</p>
              <Link to="/listings" className="kv-btn kv-btn-primary kv-btn-block">
                Browse all listings →
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
          <div className="kv-bp-end-cta-eyebrow">Browse the index</div>
          <h2 className="kv-bp-end-cta-heading">
            Done reading? See what's actually for sale.
          </h2>
          <p className="kv-bp-end-cta-body">
            {ACTIVE_SOURCE_COUNT}+ tracked sources, source-attributed and
            updated daily. Filter by island, price band, bedrooms, and
            property type — every listing links back to the original agent.
          </p>
          <div className="kv-bp-end-cta-actions">
            <Link to="/listings" className="kv-bp-end-cta-primary">
              <span>Browse all listings</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link to="/market" className="kv-bp-end-cta-ghost">
              <span>See market data</span>
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
              <h2>Related guides</h2>
              <Link to="/blog">All guides →</Link>
            </div>
            <div className="kv-bp-related-grid">
              {related.map((a) => {
                const rcat = categoryFor(a.tags);
                const rnum = BLOG_ARTICLES.findIndex((x) => x.slug === a.slug) + 1;
                return (
                  <Link key={a.slug} to={`/blog/${a.slug}`} className="kv-bp-rel-card" data-cat={rcat}>
                    <div className="kv-bp-rel-band">
                      <span className="kv-eyebrow-cat" data-cat={rcat}>{categoryLabel(rcat)}</span>
                      <span className="kv-bp-rel-num">№ {String(rnum).padStart(2, "0")}</span>
                    </div>
                    <div className="kv-bp-rel-title">{a.title}</div>
                    <div className="kv-bp-rel-foot">
                      <span>{fmtDate(a.date)}</span>
                      <span>{a.readTime}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <NewsletterCta
        overline="Monthly update"
        heading={<>One email a month. Everything that changed on the index.</>}
        description="New listings, median-price shifts, island activity, sources added. No promotional mail, no listings to feature, no spam — just the month in Cape Verde property."
      />
    </div>
  );
}
