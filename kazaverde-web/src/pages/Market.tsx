import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatMedian } from "../lib/format";
import { PRICE_BUCKETS, type PriceBucket } from "arei-sdk";
import "./Detail.css"; // shares kv-d-card / kv-d-meta-row primitives
import "./Market.css";

const BUCKET_LABEL: Record<PriceBucket, string> = {
  under_100k: "Under €100K",
  "100k_250k": "€100K – €250K",
  "250k_500k": "€250K – €500K",
  over_500k: "Over €500K",
};
const BUCKET_ORDER: PriceBucket[] = ["under_100k", "100k_250k", "250k_500k", "over_500k"];

/* ─────────────────────────────────────────────────────────────────
   Market — KV-design port of the chocolate-themed market page.
   Reuses primitives from Landing (.kv-hero, .kv-l-mmi-strip) and
   Detail (.kv-d-card-soft, .kv-d-meta-row) so the page reads as a
   continuation of the index, not a separate visual idiom.
   ───────────────────────────────────────────────────────────────── */

const MARKET_FAQ_SCRIPT_ID = "kv-jsonld-market-faq";

const MARKET_FAQ = [
  {
    topic: "Coverage",
    q: "What does KazaVerde’s market data measure?",
    a: "It measures public Cape Verde property listings from tracked sources. The page summarizes asking prices, inventory, island distribution, and price visibility where KazaVerde can verify the listing data.",
  },
  {
    topic: "Prices",
    q: "Are these asking prices or completed sales?",
    a: "They are asking prices from public listings, not completed sale prices. KazaVerde does not claim transaction values, bank valuations, or official registry data.",
  },
  {
    topic: "Method",
    q: "How do you calculate median property price?",
    a: "Median price is calculated from listings with a public, extractable asking price. Price-on-request listings and clear data-entry outliers are excluded so the benchmark reflects the priced sample.",
  },
  {
    topic: "Method",
    q: "Why are “Price on request” listings excluded?",
    a: "They count toward total inventory, but they do not contain a usable asking price. Including them in price calculations would make medians and price bands misleading.",
  },
  {
    topic: "Trust",
    q: "What does verified-price coverage mean?",
    a: "Verified-price coverage is the share of tracked listings with a public price KazaVerde can read and normalize. A lower coverage rate means more of the market is visible as inventory than as price data.",
  },
  {
    topic: "Freshness",
    q: "How often is the market data updated?",
    a: "Tracked sources are checked daily. New listings, price changes, and removals appear as each source refreshes and the listing can be matched back to public data.",
  },
  {
    topic: "Samples",
    q: "Why do some islands show inventory but no median price?",
    a: "Some islands have too few priced listings for a useful median. In those cases KazaVerde shows inventory, but withholds the median rather than publishing a weak benchmark.",
  },
  {
    topic: "Limits",
    q: "Can I use this data to value a specific property?",
    a: "No. This is a market benchmark, not valuation advice. A specific property still depends on location, condition, title, view, building quality, costs, and local due diligence.",
  },
  {
    topic: "Quality",
    q: "Does KazaVerde remove duplicate listings?",
    a: "KazaVerde removes or groups duplicate records where source data gives enough matching signals. Some duplicates can remain when agents publish the same property with different descriptions, prices, or photos.",
  },
];

/* SVG area chart — recoloured to use --kv-green so it speaks the
   KV palette. Identical geometry to the chocolate version. */
function InventoryChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return null;
  const W = 600;
  const H = 200;
  const PX = 44;
  const PY = 24;
  const maxVal = Math.max(...points.map((p) => p.value));
  const minVal = Math.min(...points.map((p) => p.value)) * 0.85;
  const range = maxVal - minVal || 1;
  const xs = points.map((_, i) => PX + (i / (points.length - 1)) * (W - PX * 2));
  const ys = points.map((p) => PY + (1 - (p.value - minVal) / range) * (H - PY * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${H - PY} L${xs[0]},${H - PY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="kv-m-chart" role="img" aria-label="Inventory trend chart">
      <defs>
        <linearGradient id="kv-m-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--kv-green)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--kv-green)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kv-m-chart-fill)" />
      <path d={line} fill="none" stroke="var(--kv-green-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="3.5" fill="var(--kv-green-deep)" />
          <text x={x} y={H - 4} textAnchor="middle" fontSize="10" fontFamily="var(--kv-mono)" fill="var(--kv-gray-500)">
            {points[i].label}
          </text>
          <text x={x} y={ys[i] - 10} textAnchor="middle" fontSize="11" fontWeight="600" fontFamily="var(--kv-mono)" fill="var(--kv-black)">
            {points[i].value}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Where is Cape Verde? — interactive Mapbox GL JS map.
   Bounds frame Cape Verde on the left and Senegal / Mauritania /
   West Africa on the right. Token comes from VITE_MAPBOX_TOKEN.

   Editorial fit:
   - Flat Mercator (not globe).
   - Pan + zoom only (no rotate, no pitch, no compass).
   - Default Mapbox wordmark + compact AttributionControl kept
     (Mapbox ToS require both on the map surface; compact mode
     keeps them small and unobtrusive).
   - mapbox-gl is dynamically imported so it only ships in the
     Market route chunk, which is already lazy-loaded. */
function CapeVerdeMap() {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    let cancelled = false;
    let map: { remove: () => void } | null = null;

    (async () => {
      const [{ default: mapboxgl }] = await Promise.all([
        import("mapbox-gl"),
        import("mapbox-gl/dist/mapbox-gl.css"),
      ]);
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      const instance = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: { name: "mercator" },
        bounds: [
          [-28, 12], // SW — Atlantic, south of Cape Verde
          [-10, 22], // NE — Mauritania interior
        ],
        fitBoundsOptions: { padding: 12, animate: false },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        // Compact attribution chip (small (i) that expands on tap)
        // — required by Mapbox ToS along with the wordmark.
        attributionControl: false,
        // One-finger drag scrolls the page on mobile; two fingers
        // pan the map. Desktop scroll-zoom requires Ctrl/Cmd.
        cooperativeGestures: true,
      });
      instance.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      instance.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          showZoom: true,
          visualizePitch: false,
        }),
        "top-right",
      );
      map = instance;
    })().catch((err) => {
      console.error("[CapeVerdeMap] failed to initialise", err);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [token]);

  if (!token) {
    return (
      <div className="kv-m-geo-wrap">
        <div className="kv-m-geo-map">
          <div
            className="kv-m-geo-fallback"
            role="img"
            aria-label="Map preview unavailable — Cape Verde, west of Senegal"
          >
            <div className="kv-m-geo-fallback-pin" aria-hidden="true">⊙</div>
            <div className="kv-m-geo-fallback-label">Map preview unavailable</div>
            <div className="kv-m-geo-fallback-sub">Cape Verde · West Africa · Atlantic Ocean</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kv-m-geo-wrap">
      <div className="kv-m-geo-map">
        <div
          ref={containerRef}
          className="kv-m-geo-mapbox"
          role="region"
          aria-label="Interactive map showing Cape Verde in the Atlantic Ocean approximately 570 km west of Senegal, with Mauritania and the West African coast visible on the right"
        />
      </div>
    </div>
  );
}

interface IslandRow {
  name: string;
  median: number | null;
  count: number;
  totalListings: number;
}

interface MarketData {
  total: number;
  medianPrice: number | null;
  islandCount: number;
  islands: IslandRow[];
  trend: { label: string; value: number }[];
  pricedCount: number;
  addedThisMonth: number;
  buckets: { key: PriceBucket; label: string; count: number }[];
}

export default function Market() {
  useDocumentMeta(
    "Market Data — KazaVerde",
    "Median prices by island, inventory trends, and Cape Verde property market insights."
  );
  const [openIdx, setOpenIdx] = useState(0);
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || error || !data) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://www.kazaverde.com/market#faq",
      mainEntity: MARKET_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    };

    document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((node) => {
      if (
        node.id !== MARKET_FAQ_SCRIPT_ID &&
        node.textContent?.includes('"FAQPage"') &&
        node.textContent.includes("/market#faq")
      ) {
        node.remove();
      }
    });

    const script =
      (document.getElementById(MARKET_FAQ_SCRIPT_ID) as HTMLScriptElement | null) ??
      document.createElement("script");
    script.id = MARKET_FAQ_SCRIPT_ID;
    script.type = "application/ld+json";
    script.dataset.kvJsonld = "market-faq";
    script.textContent = JSON.stringify(schema);
    if (!script.parentNode) document.head.appendChild(script);

    return () => {
      document.getElementById(MARKET_FAQ_SCRIPT_ID)?.remove();
    };
  }, [loading, error, data]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsRes, islandsRes, listingsRes] = await Promise.all([
          arei.getMarketStats(),
          arei.getIslandOptions(),
          arei.getListings({ page: 1, pageSize: 500 }),
        ]);
        if (cancelled) return;

        const withPrice = statsRes.islands.filter((i) => i.median_price !== null);
        const weightedSum = withPrice.reduce(
          (s, i) => s + i.median_price! * i.n_price,
          0
        );
        const pricedCount = statsRes.islands.reduce((s, i) => s + i.n_price, 0);
        const medianPrice = pricedCount > 0 ? Math.round(weightedSum / pricedCount) : null;

        const islandCountMap = new Map(islandsRes.map((i) => [i.island, i.count]));
        const islands: IslandRow[] = statsRes.islands
          .map((i) => ({
            name: i.island,
            median: i.median_price,
            count: i.n_price,
            totalListings: islandCountMap.get(i.island) ?? i.n_price,
          }))
          .sort((a, b) => b.totalListings - a.totalListings);

        const total = statsRes.total;

        /* New-this-month from card-level first_seen_at. Counts every listing
           first observed since the 1st of the current month. */
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const addedThisMonth = listingsRes.data.reduce((n, l) => {
          const seen = l.first_seen_at ? new Date(l.first_seen_at) : null;
          return seen && seen >= monthStart ? n + 1 : n;
        }, 0);

        /* Price-bucket distribution across the full priced sample. */
        const bucketCounts: Record<PriceBucket, number> = {
          under_100k: 0,
          "100k_250k": 0,
          "250k_500k": 0,
          over_500k: 0,
        };
        for (const l of listingsRes.data) {
          if (l.price == null) continue;
          for (const k of BUCKET_ORDER) {
            const { min, max } = PRICE_BUCKETS[k];
            if (l.price >= min && l.price < max) {
              bucketCounts[k]++;
              break;
            }
          }
        }
        const buckets = BUCKET_ORDER.map((k) => ({
          key: k,
          label: BUCKET_LABEL[k],
          count: bucketCounts[k],
        }));

        /* Inventory trend stub — historical snapshots not yet recorded.
           Section is rendered with a "coming soon" overlay below. */
        const trend = [
          { label: "Nov", value: Math.round(total * 0.78) },
          { label: "Dec", value: Math.round(total * 0.84) },
          { label: "Jan", value: Math.round(total * 0.92) },
          { label: "Feb", value: total },
        ];

        setData({
          total,
          medianPrice,
          islandCount: islandsRes.length,
          islands,
          trend,
          pricedCount,
          addedThisMonth,
          buckets,
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load market data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="kv-m-state">
        <p>Loading market data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="kv-m-state kv-m-state-error">
        <h1>Market data unavailable</h1>
        <p>{error ?? "We could not load market data right now. Please try again later."}</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.islands.map((i) => i.totalListings), 1);
  const maxBucket = Math.max(...data.buckets.map((b) => b.count), 1);
  const pricedPct = data.total > 0 ? Math.round((data.pricedCount / data.total) * 100) : 0;

  return (
    <div className="kv-m">
      {/* Hero — slim variant, brand surface for the page */}
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">Market intelligence · April 2026</div>
          <h1>The state of Cape Verde property.</h1>
          <p className="kv-hero-sub">
            Index-level data derived from {data.total.toLocaleString("en")} tracked public listings
            across {data.islandCount} islands. Updated daily as crawlers complete.
          </p>
        </div>
      </header>

      {/* Geographic context — orientation block for first-time visitors.
          Lightweight, factual, editorial. No external map API. */}
      <section className="kv-m-geo">
        <div className="kv-m-inner">
          <div className="kv-m-section-head" style={{ marginBottom: 20 }}>
            <span className="kv-l-eyebrow">Where is Cape Verde?</span>
            <h2>An archipelago off West Africa.</h2>
          </div>
          <div className="kv-m-geo-grid">
            <CapeVerdeMap />
            <div className="kv-m-geo-facts">
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Population</span>
                <span className="kv-m-geo-fact-v">~600,000</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Independence</span>
                <span className="kv-m-geo-fact-v">1975 (from Portugal)</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Capital</span>
                <span className="kv-m-geo-fact-v">Praia, Santiago</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Islands</span>
                <span className="kv-m-geo-fact-v">10 (9 inhabited)</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Key investment islands</span>
                <span className="kv-m-geo-fact-v">Sal · Boa Vista · Santiago</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Official language</span>
                <span className="kv-m-geo-fact-v">Portuguese</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Spoken language</span>
                <span className="kv-m-geo-fact-v">Kriolu</span>
              </div>
              <div className="kv-m-geo-fact">
                <span className="kv-m-geo-fact-k">Currency</span>
                <span className="kv-m-geo-fact-v">CVE · prices in EUR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intro — gives the page a real opening before the KPI strip.
          Frames what the data is, where it comes from, and how to read it.
          Mirrors the editorial pacing of the Detail and Blog headers. */}
      <section className="kv-m-intro">
        <div className="kv-m-inner">
          <div className="kv-m-intro-grid">
            <div className="kv-m-intro-lead">
              <p>
                Cape Verde's property market sits between Atlantic resort
                economies and a domestic residential cycle that's growing
                with the diaspora. There's no public land registry feed and
                no single MLS — which makes a source-attributed index the
                only way to see asking prices, supply concentration, and
                month-over-month movement at a glance.
              </p>
              <p>
                This page is the public read of that index. It's built from
                tracked listings on agent and portal sources, refreshed
                daily, and intentionally narrow on what it asserts: we
                publish what we can verify, label what we can't, and never
                represent ask as transaction.
              </p>
            </div>
            <div className="kv-m-intro-meta">
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">Last refresh</span>
                <span className="kv-m-intro-meta-v">Daily, automated</span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">Sample</span>
                <span className="kv-m-intro-meta-v">{data.total.toLocaleString("en")} listings · {data.islandCount} islands</span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">Method</span>
                <span className="kv-m-intro-meta-v"><a href="#methodology">See below ↓</a></span>
              </div>
              <div className="kv-m-intro-meta-row">
                <span className="kv-m-intro-meta-k">Use it for</span>
                <span className="kv-m-intro-meta-v">Pricing benchmarks, not transactions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip — four cells of index-level intelligence. Each tells
          a different story (level, supply, freshness, transparency) so
          the row reads as a snapshot rather than a list of counts. */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-l-mmi-strip">
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">Estimated median price</div>
              <div className="kv-l-mmi-num">{formatMedian(data.medianPrice)}</div>
              <div className="kv-l-mmi-delta">Across {data.pricedCount.toLocaleString("en")} priced listings</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">Total inventory</div>
              <div className="kv-l-mmi-num">{data.total.toLocaleString("en")}</div>
              <div className="kv-l-mmi-delta">Tracked across {data.islandCount} islands</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">Added this month</div>
              <div className="kv-l-mmi-num">{data.addedThisMonth.toLocaleString("en")}</div>
              <div className="kv-l-mmi-delta">First seen since the 1st</div>
            </div>
            <div className="kv-l-mmi-cell">
              <div className="kv-l-mmi-lbl">Verified-price coverage</div>
              <div className="kv-l-mmi-num">{pricedPct}%</div>
              <div className="kv-l-mmi-delta">{data.pricedCount.toLocaleString("en")} of {data.total.toLocaleString("en")} have a public price</div>
            </div>
          </div>
        </div>
      </section>

      {/* Price distribution — where the inventory actually sits.
          Reuses .kv-m-bars primitive so it reads as a sibling of the
          island distribution section below. */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Price distribution</span>
            <h2>Where the inventory sits.</h2>
            <p>
              Priced listings grouped into four asking-price bands. Helps anchor
              expectations before browsing — most of Cape Verde's tracked supply
              clusters in a narrower band than headline medians suggest.
            </p>
          </div>

          <div className="kv-m-bars">
            {data.buckets.map((b) => (
              <div className="kv-m-bar-row" key={b.key}>
                <div className="kv-m-bar-label">{b.label}</div>
                <div className="kv-m-bar-track" aria-hidden="true">
                  <div
                    className="kv-m-bar-fill"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
                <div className="kv-m-bar-val">{b.count}</div>
              </div>
            ))}
          </div>
          <p className="kv-m-disclaimer">
            Based on {data.pricedCount.toLocaleString("en")} listings with a public price.
            Price-on-request listings excluded.
          </p>
        </div>
      </section>

      {/* Median price by island — k/v table reusing Detail primitives */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">By island</span>
            <h2>Median price by island.</h2>
            <p>
              Asking-price median for each island with verified price data. Minimum sample 5 listings
              per island; islands below the threshold show inventory only.
            </p>
          </div>

          {/* Three-column table — island name, listings count, median price.
              Replaces the older 2-column flex layout where listings and
              median were squeezed into one right-hand cell ("57 · €450,000")
              which read as a single jumbled value rather than two distinct
              data points. Now each metric has its own column with right-
              aligned tabular numbers, headers aligned to data columns. */}
          <div className="kv-m-island-table">
            <div className="kv-m-island-h">
              <span>Island</span>
              <span>Listings</span>
              <span>Median price</span>
            </div>
            {data.islands.map((island) => (
              <div className="kv-m-island-row" key={island.name}>
                <span className="kv-m-island-name">{island.name}</span>
                <span className="kv-m-island-count">{island.totalListings.toLocaleString("en")}</span>
                <span className="kv-m-island-median">
                  {island.median !== null ? formatMedian(island.median) : "—"}
                </span>
              </div>
            ))}
          </div>

          <p className="kv-m-disclaimer">
            Based on listings with verified price. Minimum sample 5 listings per island.
          </p>
        </div>
      </section>

      {/* Listing distribution — KV-styled bar chart */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Distribution</span>
            <h2>Listings by island.</h2>
            <p>
              Share of tracked inventory per island — shows where supply concentrates.
            </p>
          </div>

          <div className="kv-m-bars">
            {data.islands
              .filter((i) => i.totalListings > 0)
              .map((island) => (
                <div className="kv-m-bar-row" key={island.name}>
                  <div className="kv-m-bar-label">{island.name}</div>
                  <div className="kv-m-bar-track" aria-hidden="true">
                    <div
                      className="kv-m-bar-fill"
                      style={{ width: `${(island.totalListings / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="kv-m-bar-val">{island.totalListings}</div>
                </div>
              ))}
          </div>
          <p className="kv-m-disclaimer">Based on tracked public listings.</p>
        </div>
      </section>

      {/* Inventory trend — coming soon (stub data, blurred) */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Trend · Coming soon</span>
            <h2>Inventory over time.</h2>
            <p>
              Historical inventory tracking begins November 2025. The chart populates as monthly
              snapshots accumulate.
            </p>
          </div>

          <div className="kv-coming">
            <div className="kv-coming-content" aria-hidden="true">
              <InventoryChart points={data.trend} />
            </div>
            <div className="kv-coming-overlay">
              <span className="kv-pill">Coming soon</span>
              <p>Historical data collection in progress</p>
            </div>
          </div>
        </div>
      </section>

      {/* Market FAQ / methodology */}
      <section className="kv-m-section" id="methodology">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Methodology</span>
            <h2>How to read this market data.</h2>
            <p>
              Short answers on what the index measures, where the limits are,
              and how to interpret the numbers without treating them as
              transaction prices or valuation advice.
            </p>
          </div>

          <div className="kv-m-faq" id="faq">
            {MARKET_FAQ.map((item, i) => {
              const isOpen = openIdx === i;
              return (
                <div className={`kv-m-faq-row${isOpen ? " is-open" : ""}`} key={item.q}>
                  <button
                    type="button"
                    className="kv-m-faq-q"
                    onClick={() => setOpenIdx(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="kv-m-faq-topic">{item.topic}</span>
                    <span className="kv-m-faq-text">{item.q}</span>
                    <span className="kv-m-faq-icon" aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  <div className="kv-m-faq-a" aria-hidden={!isOpen}>{item.a}</div>
                </div>
              );
            })}
          </div>

          <p className="kv-m-disclaimer">
            All market data is based on tracked public listings. This is not legal, financial, or valuation advice.
          </p>
          <p className="kv-m-disclaimer">
            <Link to="/about">
              Read more about how KazaVerde fits into the Africa Real Estate Index.
            </Link>
          </p>
        </div>
      </section>

      <NewsletterCta
        overline="Monthly market report"
        heading={<>Median moves and notable shifts. Once a month.</>}
        description="Per-island price movements, inventory trends, and the notable activity from the index — delivered the 1st of every month."
      />
    </div>
  );
}
