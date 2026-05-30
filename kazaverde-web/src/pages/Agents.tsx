import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AgencyRow, AgencyListingStats } from "arei-sdk";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useAgencies } from "../hooks/useAgencies";
import { formatDate, toLocale } from "../lib/formatters";
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

/** Max islands to list inline before collapsing to "+N". */
const MAX_ISLANDS_SHOWN = 3;

/**
 * Aggregate AREI-owned listing stats for one agency across all its
 * source_ids (usually one). Returns null when there is no listing data —
 * the caller hides the stats block rather than showing zeros.
 */
function aggregateStats(
  agency: AgencyRow,
  statsBySource: Record<string, AgencyListingStats>,
): { listingCount: number; islands: string[]; lastSeenAt: string | null } | null {
  let listingCount = 0;
  const islands = new Set<string>();
  let lastSeenAt: string | null = null;

  for (const sid of agency.source_ids) {
    const s = statsBySource[sid];
    if (!s) continue;
    listingCount += s.listingCount;
    s.islands.forEach((i) => islands.add(i));
    if (s.lastSeenAt && (!lastSeenAt || s.lastSeenAt > lastSeenAt)) {
      lastSeenAt = s.lastSeenAt;
    }
  }

  if (listingCount === 0) return null;
  return { listingCount, islands: Array.from(islands).sort(), lastSeenAt };
}

function islandsLabel(islands: string[]): string {
  if (islands.length <= MAX_ISLANDS_SHOWN) return islands.join(", ");
  return `${islands.slice(0, MAX_ISLANDS_SHOWN).join(", ")} +${islands.length - MAX_ISLANDS_SHOWN}`;
}

export default function Agents() {
  useDocumentMeta(PAGE_TITLE, PAGE_DESCRIPTION);

  const { agencies, stats, loading, error } = useAgencies();
  const locale = toLocale("en");
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  // Public directory shows only agencies that currently have tracked
  // listing data. 0-listing agencies (e.g. a source returning nothing right
  // now) stay in the DB but are hidden here, and reappear automatically once
  // they have listings. Guard: if stats failed to load entirely (empty map),
  // don't hide everything — fall back to showing all agencies.
  const visibleAgencies = useMemo(() => {
    const statsLoaded = Object.keys(stats).length > 0;
    if (!statsLoaded) return agencies;
    return agencies.filter((a) => aggregateStats(a, stats) !== null);
  }, [agencies, stats]);

  const filtered = useMemo(() => {
    if (!isSearching) return visibleAgencies;
    const q = query.trim().toLowerCase();
    return visibleAgencies.filter((a) => {
      const name = displayName(a).toLowerCase();
      const desc = (a.description ?? "").toLowerCase();
      return q.split(/\s+/).every((token) => name.includes(token) || desc.includes(token));
    });
  }, [visibleAgencies, query, isSearching]);

  /* JSON-LD: ItemList of the agencies actually rendered (visible cards),
     so structured data matches on-page content. */
  useEffect(() => {
    if (visibleAgencies.length === 0) return;
    const SCRIPT_ID = "kv-jsonld-agents";

    const data = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Real Estate Agents in Cape Verde",
      description: PAGE_DESCRIPTION,
      numberOfItems: visibleAgencies.length,
      itemListElement: visibleAgencies.map((a, i) => ({
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
  }, [visibleAgencies]);

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
            <b>{isSearching ? filtered.length : visibleAgencies.length}</b>{" "}
            {(isSearching ? filtered.length : visibleAgencies.length) === 1 ? "agency" : "agencies"}
            {isSearching && visibleAgencies.length > 0 && ` of ${visibleAgencies.length}`}
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
              const agencyStats = aggregateStats(agency, stats);

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

                  {agency.description && (
                    <p className="kv-agent-description">{agency.description}</p>
                  )}

                  {agencyStats && (
                    <ul className="kv-agent-stats" aria-label="Tracked data">
                      <li>
                        {agencyStats.listingCount}{" "}
                        {agencyStats.listingCount === 1 ? "tracked listing" : "tracked listings"}
                      </li>
                      {agencyStats.islands.length > 0 && (
                        <li>{islandsLabel(agencyStats.islands)}</li>
                      )}
                      {agencyStats.lastSeenAt && (
                        <li>Updated {formatDate(agencyStats.lastSeenAt, locale)}</li>
                      )}
                    </ul>
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
