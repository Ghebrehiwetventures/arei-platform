import { useEffect, useState } from "react";
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

const METHODOLOGY = [
  {
    q: "How we calculate median price",
    a: "Median asking price is calculated from all listings with a publicly visible, extractable price. We take the middle value of sorted prices per island and overall. Outliers (prices below €10,000 or above €5,000,000) are excluded to avoid data entry errors skewing the median. Price is always the asking price — not transaction price.",
  },
  {
    q: "How we handle 'Price on request'",
    a: "Listings without a publicly visible price are included in the index with the label 'Price on request'. They count toward total inventory numbers but are excluded from all price-based calculations (median price, price per m², price trends).",
  },
  {
    q: "How often the data is updated",
    a: "Our crawlers run daily across all tracked sources. New listings typically appear within 24 hours of being published. Price changes are detected on the next crawl cycle. Removed listings are flagged as inactive after 48 hours of consecutive absence.",
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

      {/* Methodology accordion */}
      <section className="kv-m-section" id="methodology">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Methodology</span>
            <h2>How we calculate.</h2>
          </div>

          <div className="kv-m-acc-list">
            {METHODOLOGY.map((item, i) => (
              <div className={`kv-m-acc${openIdx === i ? " is-open" : ""}`} key={item.q}>
                <button
                  type="button"
                  className="kv-m-acc-q"
                  onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                  aria-expanded={openIdx === i}
                >
                  <span>{item.q}</span>
                  <span className="kv-m-acc-icon" aria-hidden="true">↓</span>
                </button>
                <div className="kv-m-acc-a">
                  <p>{item.a}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="kv-m-disclaimer">
            All market data is based on tracked public listings. This is not financial advice.
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
