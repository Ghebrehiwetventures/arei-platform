import { useParams, Link, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { getArticleBySlug } from "../lib/blog-data";
import ArticleCta from "../components/ArticleCta";
import NewsletterCta from "../components/NewsletterCta";
import "./BlogPost.css";

interface ArticleCtaConfig {
  heading: string;
  body?: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

const ARTICLE_CTAS: Record<string, ArticleCtaConfig> = {
  "buying-property-cape-verde-guide": {
    heading: "Ready to explore what's available?",
    body: "Browse source-linked listings across all Cape Verde islands.",
    primaryHref: "/listings",
    primaryLabel: "Browse Properties",
  },
  "which-cape-verde-island-property": {
    heading: "Compare listings by island",
    body: "See what's currently tracked in Sal and Boa Vista.",
    primaryHref: "/listings/sal",
    primaryLabel: "Properties in Sal",
    secondaryHref: "/listings/boa-vista",
    secondaryLabel: "Boa Vista",
  },
  "cape-verde-property-tax-reform-2026": {
    heading: "See current listings in the index",
    body: "Browse tracked properties across Cape Verde with source links and price data.",
    primaryHref: "/listings",
    primaryLabel: "Browse Listings",
    secondaryHref: "/market",
    secondaryLabel: "Market Data",
  },
  "cape-verde-rental-yields-realistic": {
    heading: "Explore the two main investment islands",
    body: "Sal and Boa Vista have the strongest rental demand and the most active property markets.",
    primaryHref: "/listings/sal",
    primaryLabel: "Properties in Sal",
    secondaryHref: "/listings/boa-vista",
    secondaryLabel: "Boa Vista",
  },
  "cape-verde-green-card-residency": {
    heading: "Find qualifying properties",
    body: "Browse tracked listings across Cape Verde, all source-linked for verification.",
    primaryHref: "/listings",
    primaryLabel: "Browse Properties",
    secondaryHref: "/market",
    secondaryLabel: "Market Data",
  },
  "mistakes-buying-property-cape-verde": {
    heading: "Start with the step-by-step buying guide",
    primaryHref: "/blog/buying-property-cape-verde-guide",
    primaryLabel: "Read the Guide",
    secondaryHref: "/listings",
    secondaryLabel: "Browse Listings",
  },
};

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

      {article.slug in ARTICLE_CTAS && (
        <ArticleCta {...ARTICLE_CTAS[article.slug]} />
      )}

      <NewsletterCta
        heading={<>Stay informed on <em>Cape Verde property</em></>}
        description="Monthly market updates, price trends by island, and regulatory changes — straight to your inbox."
      />
    </>
  );
}
