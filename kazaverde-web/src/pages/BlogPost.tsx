import { useParams, Link, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { getArticleBySlug } from "../lib/blog-data";
import NewsletterCta from "../components/NewsletterCta";
import "./BlogPost.css";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = slug ? getArticleBySlug(slug) : undefined;

  if (!article) {
    return (
      <div className="bp-notfound">
        <h1>Article not found</h1>
        <Link to="/blog" className="bp-back">← Back to blog</Link>
      </div>
    );
  }

  useDocumentMeta(
    article.title,
    article.description,
    article.heroImage ? { image: article.heroImage } : undefined
  );

  return (
    <>
      <a className="bp-back" onClick={() => navigate("/blog")} role="button" tabIndex={0}>
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to blog
      </a>

      <article className="bp-article">
        <div className="bp-meta">
          <time dateTime={article.date}>
            {new Date(article.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </time>
          <span>·</span>
          <span>{article.readTime}</span>
        </div>
        <h1>{article.title}</h1>
        <div className="bp-tags">
          {article.tags.map((t) => (
            <span key={t} className="bp-tag">{t}</span>
          ))}
        </div>

        <div
          className="bp-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      <NewsletterCta
        heading={<>Stay informed on <em>Cape Verde property</em></>}
        description="Monthly market updates, price trends by island, and regulatory changes — straight to your inbox."
      />
    </>
  );
}
