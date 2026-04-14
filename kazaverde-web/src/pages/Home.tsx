import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import SectionHeader from "../components/SectionHeader";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import type { DemoListing } from "../lib/demo-data";
import { cardToDemoListing, detailToDemoListing } from "../lib/transforms";
import { mergeCuratedFeaturedListings, selectFeaturedListings } from "../lib/featured";
import { formatMedian } from "../lib/format";
import { CURATED_FEATURED_IDS } from "../lib/prerender-listings";
import "./Home.css";

/* Number of actively configured scrape sources (lifecycleOverride: IN in markets/cv/sources.yml) */
const ACTIVE_SOURCE_COUNT = 9;

/* Static gradients for island explorer cards */
const ISLAND_BG: Record<string, string> = {
  Sal: "linear-gradient(180deg, #5CB8E6 0%, #3A9AC8 35%, #E8D5A0 36%, #D4C088 50%, #2A8A7A 51%, #1A6A5A 100%)",
  "Boa Vista": "linear-gradient(180deg, #E8A050 0%, #D08030 25%, #C4A060 26%, #B89050 45%, #4A9AB0 46%, #2A7A90 100%)",
  Santiago: "linear-gradient(180deg, #6AACE0 0%, #4A8CC0 30%, #3A7A4A 31%, #2A6A3A 55%, #5A8A5A 56%, #1A4A2A 100%)",
  "São Vicente": "linear-gradient(180deg, #7AC0E0 0%, #5AA0C0 40%, #8A7A6A 41%, #6A5A4A 60%, #4A7A9A 61%, #2A5A7A 100%)",
  "Santo Antão": "linear-gradient(180deg, #B0D0E8 0%, #90B0C8 20%, #3A8A4A 21%, #2A7A3A 50%, #4A6A3A 51%, #1A3A1A 100%)",
  Fogo: "linear-gradient(180deg, #E8B080 0%, #D09060 20%, #8A4A2A 21%, #6A3A1A 55%, #4A2A1A 56%, #2A1A0A 100%)",
  Maio: "linear-gradient(180deg, #80D0F0 0%, #60B0D0 45%, #F0E8D0 46%, #E0D0B0 55%, #50B0C0 56%, #3090A0 100%)",
};
const DEFAULT_BG = "linear-gradient(145deg,#5B8A72,#1A4A32)";

interface HomeData {
  featured: DemoListing[];
  islands: { name: string; count: number; bg: string }[];
  stats: {
    total: number;
    islandCount: number;
    sourceCount: number;
    medianPrice: number | null;
    islands: { name: string; median: number | null; count: number; totalListings: number }[];
  };
}

// Production homepage for `/`. Keep temporary experiments and draft flows off
// this component so they cannot accidentally override the live product home.
export default function Home() {
  useDocumentMeta("KazaVerde — Cape Verde Real Estate");
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setError(null);
        const [listingsRes, statsRes, islandsRes, curatedRes] = await Promise.all([
          arei.getListings({ page: 1, pageSize: 24 }),
          arei.getMarketStats(),
          arei.getIslandOptions(),
          Promise.all(
            CURATED_FEATURED_IDS.map(async (id) => {
              try {
                return await arei.getListing(id);
              } catch {
                return null;
              }
            })
          ),
        ]);

        const fallbackFeatured = selectFeaturedListings(listingsRes.data.map(cardToDemoListing), 3);
        const curatedFeatured = curatedRes
          .filter((listing): listing is NonNullable<typeof listing> => listing !== null)
          .map(detailToDemoListing);
        const featured = mergeCuratedFeaturedListings(curatedFeatured, fallbackFeatured, 3);

        const islands = islandsRes.map((i) => ({
          name: i.island,
          count: i.count,
          bg: ISLAND_BG[i.island] || DEFAULT_BG,
        }));

        /* Weighted average as overall median proxy */
        const withPrice = statsRes.islands.filter((i) => i.median_price !== null);
        const weightedSum = withPrice.reduce((s, i) => s + i.median_price! * i.n_price, 0);
        const totalPriced = withPrice.reduce((s, i) => s + i.n_price, 0);
        const medianPrice = totalPriced > 0 ? Math.round(weightedSum / totalPriced) : null;

        const islandCountMap = new Map(islandsRes.map((i) => [i.island, i.count]));
        setData({
          featured,
          islands,
          stats: {
            total: statsRes.total,
            islandCount: islandsRes.length,
            sourceCount: statsRes.sourceCount,
            medianPrice,
            islands: statsRes.islands.map((i) => ({
              name: i.island,
              median: i.median_price,
              count: i.n_price,
              totalListings: islandCountMap.get(i.island) ?? i.n_price,
            })),
          },
        });
      } catch (e) {
        console.error("[Home] Failed to load data:", e);
        setError(e instanceof Error ? e.message : "Could not load property data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <section className="hero anim-fu delay-1">
        <h1>
          Discover<br />
          <span className="ac">Island</span><br />
          Living
        </h1>
        <p className="hero-sub">Loading Cape Verde property data...</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="hero anim-fu delay-1">
        <h1>
          Discover<br />
          <span className="ac">Island</span><br />
          Living
        </h1>
        <p className="hero-sub">
          {error ? "Live property data could not be loaded." : "Cape Verde's read-only property index."}
        </p>
        {error && (
          <div
            style={{
              marginTop: 20,
              maxWidth: 680,
              padding: "14px 16px",
              borderRadius: 16,
              background: "rgba(104, 31, 31, 0.12)",
              border: "1px solid rgba(104, 31, 31, 0.22)",
              color: "#5f1d1d",
            }}
          >
            <strong>Data connection error</strong>
            <p style={{ margin: "8px 0 0" }}>{error}</p>
          </div>
        )}
        <div className="hero-acts">
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
        </div>
      </section>
    );
  }

  const { featured, islands, stats } = data;

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
          A read-only Cape Verde property index with {stats.total} tracked listings across {stats.islandCount} islands.
        </p>
        <div className="hero-acts">
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
          <button className="bo" onClick={() => navigate("/market")}>MARKET DATA</button>
        </div>
      </section>

      {/* Stats strip */}
      <div className="sr anim-fu delay-25">
        <div className="si"><div className="sn">{stats.total}</div><div className="sl">Active Listings</div></div>
        <div className="si si-desktop-only"><div className="sn">{stats.islandCount}</div><div className="sl">Islands</div></div>
        <div className="si"><div className="sn">{ACTIVE_SOURCE_COUNT}</div><div className="sl">Active Sources</div></div>
        <div className="si"><div className="sn">{stats.medianPrice ? formatMedian(stats.medianPrice) : "—"}</div><div className="sl">Estimated Median Price</div></div>
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
        {islands.map((island) => (
          <a
            key={island.name}
            className="ic"
            href={`/listings?island=${encodeURIComponent(island.name)}`}
            style={{ background: island.bg }}
          >
            <div className="ov" />
            <div className="ic-i">
              <h3>{island.name}</h3>
              <span>{island.count} properties</span>
            </div>
          </a>
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
        {stats.islands.filter(i => i.median !== null).slice(0, 4).map((island) => (
          <div className="mp-card" key={island.name}>
            <div className="mp-island">{island.name.toUpperCase()}</div>
            <div className="mp-price-row">
              <div className="mp-price">{formatMedian(island.median)}</div>
              <div className="mp-coverage">{island.totalListings} listings</div>
            </div>
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
        {featured.map((listing, index) => (
          <PropertyCard key={listing.id} listing={listing} index={index} />
        ))}
      </div>

      <NewsletterCta />
    </>
  );
}
