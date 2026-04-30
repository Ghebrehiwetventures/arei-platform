import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import type { DemoListing } from "../lib/demo-data";
import { cardToDemoListing } from "../lib/transforms";
import "./IslandLanding.css";

interface IslandConfig {
  name: string;
  overline: string;
  intro: string;
  context: string;
  relatedGuides: { slug: string; title: string }[];
  seoTitle: string;
  seoDescription: string;
  newsletterOverline: string;
  newsletterDescription: string;
}

const ISLAND_CONFIG: Record<string, IslandConfig> = {
  Sal: {
    name: "Sal",
    overline: "Sal · Cape Verde",
    intro:
      "Sal is Cape Verde's most liquid property market, with direct international flights from London, Lisbon, Amsterdam, and Paris. Santa Maria concentrates the strongest short-term rental demand and the widest range of apartments, villas, and resort properties.",
    context:
      "Gross rental yields of 5–8% are reported in well-managed resort complexes. One-bedroom apartments in Santa Maria typically start around €95,000; resort units range from €120,000 to €200,000.",
    relatedGuides: [
      { slug: "which-cape-verde-island-property", title: "Which Cape Verde island should you buy on?" },
      { slug: "buying-property-cape-verde-guide", title: "How to buy property in Cape Verde" },
    ],
    seoTitle: "Property for Sale in Sal, Cape Verde",
    seoDescription:
      "Browse tracked property listings for sale in Sal, Cape Verde. Apartments, villas, and resort properties in Santa Maria and across the island.",
    newsletterOverline: "Sal Property Index",
    newsletterDescription:
      "New listings tracked in Sal, market price context, and regulatory updates — straight to your inbox.",
  },
  "Boa Vista": {
    name: "Boa Vista",
    overline: "Boa Vista · Cape Verde",
    intro:
      "Boa Vista is Cape Verde's main growth market — property prices run 15–25% below equivalent properties on Sal, with its own international airport and an expanding tourism infrastructure. Sal Rei is the commercial centre; most residential development clusters along the coast.",
    context:
      "Often described as where Sal was 5–10 years ago: lower entry prices, a growing rental market, and an active development pipeline. The most accessible beach-island alternative to Sal.",
    relatedGuides: [
      { slug: "which-cape-verde-island-property", title: "Which Cape Verde island should you buy on?" },
      { slug: "buying-property-cape-verde-guide", title: "How to buy property in Cape Verde" },
    ],
    seoTitle: "Property for Sale in Boa Vista, Cape Verde",
    seoDescription:
      "Browse tracked property listings for sale in Boa Vista, Cape Verde. Beach villas, resort apartments, and coastal properties in Sal Rei and across the island.",
    newsletterOverline: "Boa Vista Property Index",
    newsletterDescription:
      "New listings tracked in Boa Vista, market price context, and regulatory updates — straight to your inbox.",
  },
  Santiago: {
    name: "Santiago",
    overline: "Santiago · Cape Verde",
    intro:
      "Santiago is Cape Verde's largest island and home to the capital, Praia. It offers a broader range of residential property types than the beach islands, with growing interest from diaspora buyers and long-term residents.",
    context:
      "Property values in Santiago tend to run below Sal and Boa Vista. The market is less focused on short-term tourism investment and more on residential purchase and longer-term rental.",
    relatedGuides: [
      { slug: "which-cape-verde-island-property", title: "Which Cape Verde island should you buy on?" },
      { slug: "buying-property-cape-verde-guide", title: "How to buy property in Cape Verde" },
    ],
    seoTitle: "Property for Sale in Santiago, Cape Verde",
    seoDescription:
      "Browse tracked property listings for sale in Santiago, Cape Verde. Residential properties in Praia and across the island.",
    newsletterOverline: "Santiago Property Index",
    newsletterDescription:
      "New listings tracked in Santiago, market context, and buying guides — straight to your inbox.",
  },
  "São Vicente": {
    name: "São Vicente",
    overline: "São Vicente · Cape Verde",
    intro:
      "São Vicente is known for its culture, music, and the city of Mindelo — one of Cape Verde's most characterful urban centres. It attracts a distinct buyer: people interested in city life, culture, and marina access rather than pure beach tourism.",
    context:
      "Property in Mindelo is among the more affordable in Cape Verde for its character level. Marina-adjacent properties and colonial-era buildings attract buyers looking for something different from resort developments.",
    relatedGuides: [
      { slug: "which-cape-verde-island-property", title: "Which Cape Verde island should you buy on?" },
      { slug: "buying-property-cape-verde-guide", title: "How to buy property in Cape Verde" },
    ],
    seoTitle: "Property for Sale in São Vicente, Cape Verde",
    seoDescription:
      "Browse tracked property listings for sale in São Vicente, Cape Verde. Apartments and houses in Mindelo and across the island.",
    newsletterOverline: "São Vicente Property Index",
    newsletterDescription:
      "New listings tracked in São Vicente, market context, and buying guides — straight to your inbox.",
  },
};

interface Props {
  island: string;
}

export default function IslandLanding({ island }: Props) {
  const config = ISLAND_CONFIG[island];

  useDocumentMeta(
    config?.seoTitle ?? `Property for Sale in ${island}, Cape Verde`,
    config?.seoDescription ?? `Browse tracked property listings for sale in ${island}, Cape Verde.`,
  );

  const [listings, setListings] = useState<DemoListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [island]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await arei.getListings({ page, pageSize: 24, island });
        setListings(result.data.map(cardToDemoListing));
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch {
        setListings([]);
        setTotal(0);
        setTotalPages(0);
        setError("We could not load listings right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, island, retryCount]);

  if (!config) {
    return (
      <div className="il-notfound">
        <h1>Island not found</h1>
        <Link to="/listings" className="bo">Browse all properties</Link>
      </div>
    );
  }

  return (
    <>
      <div className="il-header anim-fu delay-1">
        <p className="il-overline">{config.overline}</p>
        <h1>Property for Sale in <em>{config.name}</em></h1>
        <p className="il-intro">{config.intro}</p>
        <Link to="/listings" className="il-all-link">← All Cape Verde properties</Link>
      </div>

      <div className="il-context anim-fu delay-2">
        <p>{config.context}</p>
      </div>

      {!loading && !error && total > 0 && (
        <p className="il-count anim-fu delay-2">{total} tracked listings in {config.name}</p>
      )}

      {loading ? (
        <div style={{ padding: "48px 0", color: "var(--tx3)", fontSize: "0.9rem" }}>
          Loading properties...
        </div>
      ) : error ? (
        <div
          className="empty-state"
          style={{ marginTop: 24, textAlign: "center" }}
          role="status"
          aria-live="polite"
        >
          <h3>We could not load listings right now.</h3>
          <p>Please try again.</p>
          <button
            type="button"
            className="pnn on"
            onClick={() => setRetryCount((c) => c + 1)}
            style={{ cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <h3>No tracked listings in {config.name} right now</h3>
          <p>
            Try <Link to="/listings" style={{ color: "var(--ac)" }}>browsing all Cape Verde properties</Link>.
          </p>
        </div>
      ) : (
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {listings.map((l) => (
            <PropertyCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pg">
          <div className="pn">
            <button
              type="button"
              className="pnn bo"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="pnn on" style={{ cursor: "default" }}>{page} / {totalPages}</span>
            <button
              type="button"
              className="pnn bp"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>
      )}

      {config.relatedGuides.length > 0 && (
        <div className="il-guides anim-fu delay-3">
          <h2>Related guides</h2>
          <div className="il-guide-list">
            {config.relatedGuides.map((g) => (
              <Link key={g.slug} to={`/blog/${g.slug}`} className="il-guide-link">
                {g.title}
                <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      <NewsletterCta
        overline={config.newsletterOverline}
        heading={<>New listings in <em>{config.name}</em></>}
        description={config.newsletterDescription}
      />
    </>
  );
}
