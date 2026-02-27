import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import "./BlogList.css";

export default function BlogList() {
  useDocumentMeta("Blog", "Cape Verde real estate insights, guides, and market analysis. Property buying, islands, legal requirements, and investment tips.");

  return (
    <>
      <section className="bl-header anim-fu delay-1">
        <div className="bl-overline">BLOG</div>
        <h1>Cape Verde <em>Real Estate</em> Insights</h1>
        <p>Guides, market analysis, and practical advice for property buyers and investors.</p>
      </section>

      <div className="bl-grid">
        {BLOG_ARTICLES.map((article, i) => (
          <Link
            key={article.slug}
            to={`/blog/${article.slug}`}
            className="bl-card anim-fu"
            style={{ animationDelay: `${0.15 + i * 0.05}s` }}
          >
            <div className="bl-card-inner">
              <div className="bl-meta">
                <span>{new Date(article.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span>·</span>
                <span>{article.readTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <div className="bl-tags">
                {article.tags.map((t) => (
                  <span key={t} className="bl-tag">{t}</span>
                ))}
              </div>
            </div>
            <span className="bl-arrow">→</span>
          </Link>
        ))}
      </div>

      <NewsletterCta />
    </>
  );
}
