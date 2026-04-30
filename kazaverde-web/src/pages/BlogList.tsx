import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import { FAQ_ENTRIES, type FaqEntry } from "../lib/faq-data";
import NewsletterCta from "../components/NewsletterCta";
import "./BlogList.css";

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

function matches(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.join(" \u2007 ").toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export default function BlogList() {
  useDocumentMeta(
    "Guides — KazaVerde",
    "Independent explainers and a buyer's FAQ for Cape Verde property — legal process, island comparisons, tax changes, and residence options.",
  );

  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* Inject FAQPage JSON-LD built from the same FAQ_ENTRIES rendered on
     this page, so the structured data matches visible content. */
  useEffect(() => {
    const SCRIPT_ID = "kv-jsonld-faq";
    const data = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://www.kazaverde.com/blog#faq",
      mainEntity: FAQ_ENTRIES.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };

    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((node) => {
      if (node.id !== SCRIPT_ID && node.textContent?.includes('"FAQPage"') && node.textContent.includes("/blog#faq")) {
        node.remove();
      }
    });

    const script = (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ?? document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.dataset.kvJsonld = "blog-faq";
    script.textContent = JSON.stringify(data);
    if (!script.parentNode) document.head.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, []);

  const filteredArticles = useMemo(
    () =>
      BLOG_ARTICLES.filter((a) =>
        matches(query, a.title, a.description, a.tags.join(" ")),
      ),
    [query],
  );

  const filteredFaq = useMemo(
    () =>
      FAQ_ENTRIES.filter((f: FaqEntry) =>
        matches(query, f.question, f.answer, f.topic),
      ),
    [query],
  );

  const isSearching = query.trim().length > 0;
  const totalHits = filteredArticles.length + filteredFaq.length;

  return (
    <div className="kv-blog">
      {/* Off-white header band — quieter than the main hero */}
      <header className="kv-blog-head">
        <div className="kv-blog-head-inner">
          <div className="kv-blog-eyebrow">Guides &amp; Knowledge Base</div>
          <h1 className="kv-blog-title">
            Buying property in Cape Verde, explained.
          </h1>
          <p className="kv-blog-sub">
            Independent explainers on the legal process, island comparisons, tax
            changes, and residence options — plus a searchable FAQ for the
            questions buyers ask most.
          </p>

          <form
            className="kv-blog-search"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <span className="kv-blog-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              className="kv-blog-search-input"
              placeholder="Search guides and FAQ — e.g. 'NIF', 'mortgage', 'IUP'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search guides and FAQ"
            />
            {isSearching && (
              <button
                type="button"
                className="kv-blog-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </form>

          {isSearching && (
            <div className="kv-blog-search-meta">
              <b>{totalHits}</b> {totalHits === 1 ? "result" : "results"}
              {" · "}
              {filteredArticles.length} {filteredArticles.length === 1 ? "guide" : "guides"}
              {" · "}
              {filteredFaq.length} FAQ
            </div>
          )}
        </div>
      </header>

      <section className="kv-blog-body">
        {/* Articles — hide block when searching narrows it to zero */}
        {(filteredArticles.length > 0 || !isSearching) && (
          <div className="kv-blog-section">
            <div className="kv-blog-section-head">
              <div className="kv-blog-section-eyebrow">Guides</div>
              <h2 className="kv-blog-section-title">
                Long-form explainers
              </h2>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="kv-blog-empty">
                No guides match <b>"{query}"</b>. Check the FAQ below — short
                answers to the most common buyer questions.
              </div>
            ) : (
              <div className="kv-blog-grid">
                {filteredArticles.map((a, i) => {
                  const cat = categoryFor(a.tags);
                  return (
                    <Link
                      key={a.slug}
                      to={`/blog/${a.slug}`}
                      className="kv-blog-card"
                      data-cat={cat}
                    >
                      <div className="kv-blog-card-band">
                        <span className="kv-eyebrow-cat" data-cat={cat}>{categoryLabel(cat)}</span>
                        <span className="kv-blog-card-num">№ {String(i + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="kv-blog-card-title">{a.title}</div>
                      <div className="kv-blog-card-excerpt">{a.description}</div>
                      <div className="kv-blog-card-foot">
                        <span>{fmtDate(a.date)}</span>
                        <span>{a.readTime}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FAQ — accordion. Hide block entirely if search filters it to zero
            AND there are guide hits, so the page doesn't show an empty FAQ
            section beneath a populated guide grid. */}
        {(filteredFaq.length > 0 || !isSearching || filteredArticles.length === 0) && (
          <div className="kv-blog-section kv-blog-faq-section">
            <div className="kv-blog-section-head">
              <div className="kv-blog-section-eyebrow">FAQ</div>
              <h2 className="kv-blog-section-title">
                The questions buyers ask most.
              </h2>
              <p className="kv-blog-section-sub">
                Short, direct answers — sourced from the long-form guides above.
                If the FAQ doesn't cover it, the guides go deeper.
              </p>
            </div>

            {filteredFaq.length === 0 ? (
              <div className="kv-blog-empty">
                No FAQ entries match <b>"{query}"</b>.
              </div>
            ) : (
              <div className="kv-faq">
                {filteredFaq.map((f, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div key={f.question} className={`kv-faq-row${isOpen ? " is-open" : ""}`}>
                      <button
                        type="button"
                        className="kv-faq-q"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                      >
                        <span className="kv-faq-q-topic">{f.topic}</span>
                        <span className="kv-faq-q-text">{f.question}</span>
                        <span className="kv-faq-q-icon" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="kv-faq-a">{f.answer}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <NewsletterCta
        overline="Monthly update"
        heading={<>One email a month. Everything that changed on the index.</>}
        description="New listings, median-price shifts, island activity, sources added. No promotional mail, no listings to feature, no spam — just the month in Cape Verde property."
      />
    </div>
  );
}
