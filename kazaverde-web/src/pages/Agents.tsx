import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useAgencies } from "../hooks/useAgencies";
import NewsletterCta from "../components/NewsletterCta";
import PageHeader from "../components/PageHeader";
import SectionHead from "../components/SectionHead";
import "./Agents.css";

const PAGE_TITLE = "Real Estate Agents in Cape Verde — Cape Verde Real Estate Index";
const PAGE_DESCRIPTION =
  "Real estate agencies tracked by the Cape Verde Real Estate Index. Explore agencies across Sal, Santiago, Boa Vista and São Vicente.";

function displayName(agency: { agency_name: string; public_display_name: string | null }): string {
  return agency.public_display_name ?? agency.agency_name;
}

function websiteHostname(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function websiteHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

export default function Agents() {
  useDocumentMeta(PAGE_TITLE, PAGE_DESCRIPTION);

  const { agencies, loading, error } = useAgencies();
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return agencies;
    const q = query.trim().toLowerCase();
    return agencies.filter((a) => {
      const name = displayName(a).toLowerCase();
      const desc = (a.description ?? "").toLowerCase();
      return q.split(/\s+/).every((token) => name.includes(token) || desc.includes(token));
    });
  }, [agencies, query, isSearching]);

  /* JSON-LD: ItemList of LocalBusiness entries */
  useEffect(() => {
    if (agencies.length === 0) return;
    const SCRIPT_ID = "kv-jsonld-agents";

    const data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Real Estate Agents in Cape Verde",
      description: PAGE_DESCRIPTION,
      numberOfItems: agencies.length,
      itemListElement: agencies.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "RealEstateAgent",
          name: displayName(a),
          description: a.description ?? undefined,
          url: a.website ? websiteHref(a.website) : undefined,
          areaServed: "Cape Verde",
        },
      })),
    };

    const script =
      (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ??
      document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    if (!script.parentNode) document.head.appendChild(script);

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [agencies]);

  return (
    <div className="kv-agents">
      <PageHeader
        eyebrow="Directory"
        title="Real Estate Agents in Cape Verde"
        sub="Agencies tracked by the Cape Verde Real Estate Index — source-linked, publicly listed."
      >
        <form
          className="kv-agents-search"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
          <span className="kv-agents-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            className="kv-agents-search-input"
            placeholder="Search agencies…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search real estate agencies"
          />
          {isSearching && (
            <button
              type="button"
              className="kv-agents-search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </form>

        {!loading && (
          <div className="kv-agents-count">
            <b>{isSearching ? filtered.length : agencies.length}</b>{" "}
            {(isSearching ? filtered.length : agencies.length) === 1 ? "agency" : "agencies"}
            {isSearching && agencies.length > 0 && ` of ${agencies.length}`}
          </div>
        )}
      </PageHeader>

      <section className="kv-agents-body">
        <SectionHead
          eyebrow="Tracked Agencies"
          title="Agencies operating in Cape Verde"
        />

        {loading && (
          <div className="kv-agents-loading">Loading…</div>
        )}

        {error && (
          <div className="kv-agents-empty">
            Could not load agency data. Please try again later.
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="kv-agents-empty">
            {isSearching ? (
              <>No agencies match <b>"{query}"</b>.</>
            ) : (
              "No agencies listed yet."
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="kv-agents-grid" role="list">
            {filtered.map((agency) => {
              const name = displayName(agency);
              const isUnclaimed = agency.claimed_status === "unclaimed";

              return (
                <li key={agency.id} className="kv-agent-card" role="listitem">
                  <div className="kv-agent-card-top">
                    <h2 className="kv-agent-name">{name}</h2>
                    {isUnclaimed && (
                      <span className="kv-agent-badge" title="This profile has not been claimed by the agency">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {agency.description ? (
                    <p className="kv-agent-description">{agency.description}</p>
                  ) : (
                    <p className="kv-agent-no-description">No description available.</p>
                  )}

                  <div className="kv-agent-card-foot">
                    {agency.website ? (
                      <a
                        href={websiteHref(agency.website)}
                        className="kv-agent-website"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${name} website`}
                      >
                        {websiteHostname(agency.website)} ↗
                      </a>
                    ) : (
                      <span className="kv-agent-website" style={{ color: "var(--kv-ink-400)" }}>
                        No website listed
                      </span>
                    )}
                    {agency.source_ids.length > 0 && (
                      <Link
                        to={`/listings?source=${agency.source_ids[0]}`}
                        className="kv-agent-listings-link"
                        aria-label={`View listings from ${name}`}
                      >
                        View listings →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NewsletterCta />
    </div>
  );
}
