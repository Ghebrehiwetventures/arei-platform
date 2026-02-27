import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import SectionHeader from "../components/SectionHeader";
import NewsletterCta from "../components/NewsletterCta";
import { DEMO_LISTINGS, ISLANDS, MARKET_STATS } from "../lib/demo-data";
import { formatMedian } from "../lib/format";
import "./Home.css";

export default function Home() {
  useDocumentMeta("KazaVerde — Cape Verde Real Estate");
  const navigate = useNavigate();
  const featured = DEMO_LISTINGS.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="hero anim-fu delay-1">
        <h1>
          Discover<br />
          <span className="ac">Island</span><br />
          Living
        </h1>
        <p className="hero-sub">
          Cape Verde's real estate aggregator. {MARKET_STATS.totalInventory} properties across {MARKET_STATS.islands.length} islands, from beachfront villas to volcanic terrain.
        </p>
        <div className="hero-acts">
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
          <button className="bo" onClick={() => navigate("/market")}>MARKET DATA</button>
        </div>
      </section>

      {/* Stats strip */}
      <div className="sr anim-fu delay-25">
        <div className="si"><div className="sn">{MARKET_STATS.totalInventory}</div><div className="sl">Active Listings</div></div>
        <div className="si"><div className="sn">{MARKET_STATS.islands.length}</div><div className="sl">Islands</div></div>
        <div className="si"><div className="sn">{MARKET_STATS.sources}</div><div className="sl">Sources</div></div>
        <div className="si"><div className="sn">€68K</div><div className="sl">Starting From</div></div>
      </div>

      {/* Island explorer */}
      <SectionHeader
        action={
          <a className="sa" onClick={() => navigate("/listings")}>
            View all
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        }
      >
        Explore by <em>Island</em>
      </SectionHeader>
      <div className="is anim-fu delay-35">
        {ISLANDS.map((island) => (
          <div
            key={island.name}
            className="ic"
            style={{ background: island.bg }}
            onClick={() => navigate(`/listings?island=${encodeURIComponent(island.name)}`)}
          >
            <div className="ov" />
            <div className="ic-i">
              <h3>{island.name}</h3>
              <span>{island.count} properties</span>
            </div>
          </div>
        ))}
      </div>

      {/* Median price teaser */}
      <SectionHeader
        action={
          <a onClick={() => navigate("/market")} className="sa">
            <span className="bo" style={{ padding: "8px 18px", fontSize: "0.72rem" }}>FULL MARKET DATA →</span>
          </a>
        }
      >
        Median Price by <em>Island</em>
      </SectionHeader>
      <div className="mp-grid anim-fu delay-4">
        {MARKET_STATS.islands.filter(i => i.median !== null).slice(0, 4).map((island) => (
          <div className="mp-card" key={island.name}>
            <div className="mp-island">{island.name.toUpperCase()}</div>
            <div className="mp-price">{formatMedian(island.median)}</div>
            <div className="mp-note">Based on {island.count} listings with verified price</div>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />

      {/* Featured properties */}
      <SectionHeader
        action={
          <a className="sa" onClick={() => navigate("/listings")}>
            See all
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        }
      >
        Featured <em>Properties</em>
      </SectionHeader>
      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
        {featured.map((l, i) => (
          <PropertyCard key={l.id} listing={l} index={i} />
        ))}
      </div>

      <NewsletterCta />
    </>
  );
}
