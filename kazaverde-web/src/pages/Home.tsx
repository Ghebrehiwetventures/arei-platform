import { useEffect, useState, type FormEvent } from "react";
import { arei } from "../lib/arei";
import { formatMedian } from "../lib/format";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./Home.css";

interface HomeData {
  total: number;
  islandCount: number;
  sourceCount: number;
  medianPrice: number | null;
}

const PIPELINE_MARKETS = [
  { name: "Cape Verde", detail: "Live consumer proof via KazaVerde", status: "Live" },
  { name: "Nigeria", detail: "Priority expansion market", status: "Pipeline" },
  { name: "Kenya", detail: "Priority expansion market", status: "Pipeline" },
  { name: "Ghana", detail: "Research and source mapping", status: "Research" },
  { name: "Morocco", detail: "Research and source mapping", status: "Research" },
];

export default function Home() {
  useDocumentMeta(
    "Africa Real Estate Index",
    "AREI is building the index layer for fragmented African property markets, with live proof in Cape Verde."
  );

  const [data, setData] = useState<HomeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoadError(null);
        const [listingsRes, statsRes, islandsRes] = await Promise.all([
          arei.getListings({ page: 1, pageSize: 1000 }),
          arei.getMarketStats(),
          arei.getIslandOptions(),
        ]);

        const sourceCount = new Set(
          listingsRes.data.map((listing) => listing.source_id).filter(Boolean)
        ).size;

        const withPrice = statsRes.islands.filter((island) => island.median_price !== null);
        const weightedSum = withPrice.reduce((sum, island) => sum + island.median_price! * island.n_price, 0);
        const totalPriced = withPrice.reduce((sum, island) => sum + island.n_price, 0);
        const medianPrice = totalPriced > 0 ? Math.round(weightedSum / totalPriced) : null;

        setData({
          total: statsRes.total,
          islandCount: islandsRes.length,
          sourceCount,
          medianPrice,
        });
      } catch (error) {
        console.error("[Home] Failed to load landing stats:", error);
        setLoadError(error instanceof Error ? error.message : "Could not load live stats.");
      }
    }

    load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const result = await arei.subscribeNewsletter(trimmed);
      if (result.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="landing-page">
      <section className="landing-hero landing-full-bleed">
        <div className="landing-wrap">
          <div className="landing-live">Live proof in Cape Verde</div>
          <div className="landing-kicker">Africa Real Estate Index</div>
          <h1>The index layer behind fragmented property markets.</h1>
          <p className="landing-subcopy">
            African real estate is enormous, local, and structurally hard to compare. AREI is
            building the normalized data layer that turns scattered listings into a usable market
            index.
          </p>
          <div className="landing-actions">
            <a className="landing-btn landing-btn-fill" href="#proof">
              See the live proof
            </a>
            <a className="landing-btn landing-btn-ghost" href="#contact">
              Join the investor list
            </a>
          </div>
          {loadError && (
            <div className="landing-note">
              Live Cape Verde stats could not be refreshed just now. The page still reflects the
              latest launch narrative.
            </div>
          )}
        </div>
      </section>

      <div className="landing-ticker landing-full-bleed">
        <div className="landing-ticker-track">
          <span>Cape Verde · Live proof</span>
          <span>Nigeria · Priority pipeline</span>
          <span>Kenya · Priority pipeline</span>
          <span>Ghana · Research pipeline</span>
          <span>Morocco · Research pipeline</span>
          <span>B2C search · B2B data · Institutional intelligence</span>
          <span>Cape Verde · Live proof</span>
          <span>Nigeria · Priority pipeline</span>
          <span>Kenya · Priority pipeline</span>
          <span>Ghana · Research pipeline</span>
          <span>Morocco · Research pipeline</span>
          <span>B2C search · B2B data · Institutional intelligence</span>
        </div>
      </div>

      <section className="landing-section landing-full-bleed" id="opportunity">
        <div className="landing-wrap">
          <div className="landing-section-label">Market Opportunity</div>
          <div className="landing-two-col">
            <h2>Africa's property market is large. The index layer is still open.</h2>
            <p>
              Most African property markets remain fragmented across broker sites, portals,
              classifieds, currencies, and inconsistent metadata. Local products exist in pockets.
              What barely exists is a clean, repeatable, cross-source data engine that can support
              search, market intelligence, and APIs.
            </p>
          </div>
          <div className="landing-stat-grid">
            <article>
              <div className="landing-stat-value">{data ? data.total.toLocaleString() : "Live"}</div>
              <div className="landing-stat-label">Listings Indexed Today</div>
              <p>Current live proof from Cape Verde, fetched from the production feed.</p>
            </article>
            <article>
              <div className="landing-stat-value">{data ? data.sourceCount : "Multi"}</div>
              <div className="landing-stat-label">Source Domains</div>
              <p>Distinct source coverage normalized into one read-only surface.</p>
            </article>
            <article>
              <div className="landing-stat-value">{data ? data.islandCount : "Pan"}</div>
              <div className="landing-stat-label">Cape Verde Islands Covered</div>
              <p>Live proof already spans multiple local market contexts, not a single resort pocket.</p>
            </article>
            <article>
              <div className="landing-stat-value">
                {data?.medianPrice ? formatMedian(data.medianPrice) : "3"}
              </div>
              <div className="landing-stat-label">
                {data?.medianPrice ? "Weighted Median Price Proxy" : "Revenue Layers"}
              </div>
              <p>
                {data?.medianPrice
                  ? "Computed from the current feed as a live directional market signal."
                  : "Consumer search, B2B data licensing, and institutional market intelligence."}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed landing-section-alt">
        <div className="landing-wrap">
          <div className="landing-section-label">Why Now</div>
          <div className="landing-two-col">
            <h2>The window exists because the tooling finally caught up.</h2>
            <p>
              Scraping, cloud pipelines, source monitoring, and LLM-assisted parsing now make it
              realistic to build market infrastructure without a giant field team. The opportunity
              is no longer blocked by raw ingestion cost. It is blocked by execution quality.
            </p>
          </div>
          <div className="landing-card-grid">
            <article>
              <h3>Urbanisation keeps creating demand</h3>
              <p>More buyers, more renters, more search intent, and more need for comparable data.</p>
            </article>
            <article>
              <h3>Mobile search moved the market online</h3>
              <p>The traffic is there. The indexing layer underneath still is not.</p>
            </article>
            <article>
              <h3>AI lowers normalization cost</h3>
              <p>Messy listing formats, language variance, and incomplete attributes are now tractable.</p>
            </article>
            <article>
              <h3>No dominant pan-African incumbent</h3>
              <p>The market leader for this layer has not already been decided.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed" id="engine">
        <div className="landing-wrap">
          <div className="landing-section-label">How It Works</div>
          <div className="landing-two-col">
            <h2>Not a marketplace. A clean underlying data engine.</h2>
            <p>
              AREI sits below consumer products. It discovers sources, ingests listings, normalizes
              structure, scores quality, and exposes usable market surfaces on top. KazaVerde is
              the first live proof, not the final form factor.
            </p>
          </div>
          <div className="landing-pillars">
            <article>
              <div className="landing-pillars-step">01</div>
              <h3>Discover</h3>
              <p>Map brokers, portals, classified sites, and developer inventory by market.</p>
            </article>
            <article>
              <div className="landing-pillars-step">02</div>
              <h3>Normalize</h3>
              <p>Standardize price, location, property type, size, and source provenance.</p>
            </article>
            <article>
              <div className="landing-pillars-step">03</div>
              <h3>Trust</h3>
              <p>Deduplicate, score completeness, preserve source links, and avoid fake marketplace flows.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed landing-section-alt">
        <div className="landing-wrap">
          <div className="landing-section-label">The Moat</div>
          <div className="landing-two-col">
            <h2>A data flywheel that gets stronger as each market is added.</h2>
            <p>
              Better source coverage improves product quality. Better products create more usage and
              better feedback loops. Better feedback makes the next market faster to launch. The moat
              is not one page of listings. It is the system that compounds across markets.
            </p>
          </div>
          <div className="landing-flywheel">
            <article>
              <h3>More sources</h3>
              <p>Coverage gets broader and more resilient.</p>
            </article>
            <article>
              <h3>Richer data</h3>
              <p>Comparison and market context become meaningfully better.</p>
            </article>
            <article>
              <h3>Better products</h3>
              <p>Search, reports, and API surfaces gain trust and utility.</p>
            </article>
            <article>
              <h3>More demand</h3>
              <p>Users, partners, and institutions create stronger feedback and pull.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed" id="proof">
        <div className="landing-wrap">
          <div className="landing-section-label">Proof of Concept</div>
          <div className="landing-proof">
            <div className="landing-proof-browser">
              <div className="landing-browser-bar">
                <span />
                <span />
                <span />
                <div>kazaverde.com</div>
              </div>
              <div className="landing-browser-body">
                <div className="landing-browser-chip">Read-only market index</div>
                <h3>KazaVerde is the live proof layer.</h3>
                <p>
                  A public Cape Verde property index running on the same ingestion, normalization,
                  and trust logic that underpins the broader AREI thesis.
                </p>
                <div className="landing-browser-stats">
                  <div>
                    <strong>{data ? data.total.toLocaleString() : "Live"}</strong>
                    <span>Listings</span>
                  </div>
                  <div>
                    <strong>{data ? data.sourceCount : "Multi"}</strong>
                    <span>Sources</span>
                  </div>
                  <div>
                    <strong>{data ? data.islandCount : "Across islands"}</strong>
                    <span>Island contexts</span>
                  </div>
                </div>
                <a href="https://www.kazaverde.com" target="_blank" rel="noreferrer" className="landing-inline-link">
                  Open KazaVerde
                </a>
              </div>
            </div>

            <div className="landing-proof-copy">
              <h2>The model is already operating in public.</h2>
              <p>
                KazaVerde proves the core claim: a read-only consumer experience can be powered by
                structured aggregation rather than manual listing entry. That gives AREI real product
                evidence, not just deck logic.
              </p>
              <div className="landing-checklist">
                <div>Live read-only product available today.</div>
                <div>Source-linked listing detail pages, not fake lead funnels.</div>
                <div>Multiple source domains already normalized into one feed.</div>
                <div>Market data and consumer surfaces can sit on the same engine.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed landing-section-alt" id="model">
        <div className="landing-wrap">
          <div className="landing-section-label">Business Model</div>
          <div className="landing-two-col">
            <h2>Three layers of revenue built on one engine.</h2>
            <p>
              The same normalized property data can support consumer search, a paid data API, and
              institutional market intelligence. New revenue layers do not require a new data stack.
            </p>
          </div>
          <div className="landing-model-grid">
            <article>
              <div className="landing-model-tier">Layer 01</div>
              <h3>Consumer Search</h3>
              <p>Market-specific search surfaces like KazaVerde, with premium context and alerts on top.</p>
            </article>
            <article>
              <div className="landing-model-tier">Layer 02</div>
              <h3>Data API</h3>
              <p>Programmatic access to listing-level coverage, price signals, and market datasets.</p>
            </article>
            <article>
              <div className="landing-model-tier">Layer 03</div>
              <h3>Institutional Intelligence</h3>
              <p>Quarterly indices, custom reports, and bespoke datasets for funds, banks, and public-sector actors.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section landing-full-bleed" id="markets">
        <div className="landing-wrap">
          <div className="landing-section-label">Expansion Roadmap</div>
          <div className="landing-two-col">
            <h2>One system. Multiple markets. Reusable logic.</h2>
            <p>
              Consumer surfaces will always be market-specific. The engine underneath should not be.
              Each new market improves the underlying operating system for the next one.
            </p>
          </div>
          <div className="landing-market-table">
            {PIPELINE_MARKETS.map((market) => (
              <div className="landing-market-row" key={market.name}>
                <div>
                  <strong>{market.name}</strong>
                  <span>{market.detail}</span>
                </div>
                <div className={`landing-market-badge landing-market-${market.status.toLowerCase()}`}>
                  {market.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta landing-full-bleed" id="contact">
        <div className="landing-wrap landing-cta-inner">
          <div>
            <div className="landing-section-label landing-section-label-light">Investor Updates</div>
            <h2>Join the list for launch updates and investor conversations.</h2>
            <p>
              This signup is live. We use it to collect email interest while we finalize the public
              AREI launch and next market rollout.
            </p>
          </div>
          <div className="landing-cta-card">
            {status === "success" ? (
              <div className="landing-success">
                You&apos;re on the list. We&apos;ll follow up by email.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="landing-form">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  disabled={status === "submitting"}
                />
                <button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Submitting..." : "Join the list"}
                </button>
              </form>
            )}
            {status === "error" && <div className="landing-error">{errorMsg}</div>}
            <div className="landing-cta-note">Stored in the existing launch email capture flow.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
