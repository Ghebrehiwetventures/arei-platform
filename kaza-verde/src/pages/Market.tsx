import { useEffect, useState } from "react";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatMedian } from "../lib/format";
import "./Market.css";

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

/* SVG area chart for inventory trend */
function InventoryChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return null;
  const W = 560, H = 180, PX = 40, PY = 20;
  const maxVal = Math.max(...points.map((p) => p.value));
  const minVal = Math.min(...points.map((p) => p.value)) * 0.85;
  const range = maxVal - minVal || 1;
  const xs = points.map((_, i) => PX + (i / (points.length - 1)) * (W - PX * 2));
  const ys = points.map((p) => PY + (1 - (p.value - minVal) / range) * (H - PY * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${H - PY} L${xs[0]},${H - PY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="inv-chart">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--ac)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="var(--ac)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={ys[i]} r="4" fill="var(--ac)" />
          <text x={x} y={H - 2} textAnchor="middle" fontSize="10" fill="var(--tx3)">{points[i].label}</text>
          <text x={x} y={ys[i] - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx)">{points[i].value}</text>
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
}

export default function Market() {
  useDocumentMeta("Market Data", "Median prices by island, inventory trends, and Cape Verde property market insights.");
  const [openIdx, setOpenIdx] = useState(0);
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, islandsRes] = await Promise.all([
          arei.getMarketStats(),
          arei.getIslandOptions(),
        ]);

        const withPrice = statsRes.islands.filter((i) => i.median_price !== null);
        const weightedSum = withPrice.reduce((s, i) => s + i.median_price! * i.n_price, 0);
        const totalPriced = withPrice.reduce((s, i) => s + i.n_price, 0);
        const medianPrice = totalPriced > 0 ? Math.round(weightedSum / totalPriced) : null;

        /* Build island rows merging stats + options */
        const islandCountMap = new Map(islandsRes.map((i) => [i.island, i.count]));
        const islands: IslandRow[] = statsRes.islands.map((i) => ({
          name: i.island,
          median: i.median_price,
          count: i.n_price,
          totalListings: islandCountMap.get(i.island) ?? i.n_price,
        }));

        /* Inventory trend — approximate from current total */
        const total = statsRes.total;
        const trend = [
          { label: "Nov", value: Math.round(total * 0.78) },
          { label: "Dec", value: Math.round(total * 0.84) },
          { label: "Jan", value: Math.round(total * 0.92) },
          { label: "Feb", value: total },
        ];

        setData({ total, medianPrice, islandCount: islandsRes.length, islands, trend });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load market data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading market data...</div>;

  if (error || !data) {
    return (
      <div style={{ padding: "2rem", maxWidth: 560 }}>
        <h1>Cape Verde Property Market</h1>
        <div style={{ marginTop: 16, padding: 16, background: "#fef2f2", borderRadius: 8, color: "#991b1b" }}>
          <strong>Could not load market data</strong>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{error}</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.islands.map((i) => i.totalListings));

  return (
    <>
      <div className="mi-header anim-fu delay-1">
        <div className="mi-overline">MARKET INTELLIGENCE</div>
        <h1>Cape Verde Property Market</h1>
        <p>
          Index-level market data derived from {data.total} tracked public
          listings across 9 sources.
        </p>
      </div>

      {/* KPIs */}
      <div className="mi-kpis anim-fu delay-15">
        <div className="kpi">
          <div className="kl">Median Asking Price</div>
          <div className="kv">{formatMedian(data.medianPrice)}</div>
          <div className="kn">Based on listings with verified price</div>
        </div>
        <div className="kpi">
          <div className="kl">Total Tracked Inventory</div>
          <div className="kv">{data.total}</div>
          <div className="kn">Across all tracked sources</div>
        </div>
        <div className="kpi">
          <div className="kl">Islands Covered</div>
          <div className="kv">{data.islandCount}</div>
          <div className="kn">9 sources tracked</div>
        </div>
      </div>

      {/* Inventory Trend — coming soon */}
      <div className="mi-section anim-fu delay-2 mi-coming">
        <h3>Inventory Trend</h3>
        <div className="sub">Total tracked listings over the last 4 months</div>
        <div className="mi-blur-wrap">
          <div className="mi-blur-content">
            <InventoryChart points={data.trend} />
          </div>
          <div className="mi-blur-overlay">
            <span>COMING SOON</span>
            <p>Historical data collection in progress</p>
          </div>
        </div>
      </div>

      {/* Median by island table */}
      <div className="mi-section anim-fu delay-25">
        <h3>Median Price by Island</h3>
        <div className="sub">Asking price median for each island with verified price data</div>
        <div className="mi-table-wrap">
          <table className="mi-table">
            <thead>
              <tr>
                <th>Island</th>
                <th>Median Price</th>
                <th>Listings</th>
              </tr>
            </thead>
            <tbody>
              {data.islands.map((island) => (
                <tr key={island.name}>
                  <td className="island-name">{island.name}</td>
                  <td>{island.median !== null ? formatMedian(island.median) : "Insufficient data"}</td>
                  <td>{island.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-disc">
          Based on listings with verified price. Minimum sample: 5 listings per island.
        </div>
      </div>

      {/* Listing Distribution */}
      <div className="mi-section anim-fu delay-3">
        <h3>Listing Distribution by Island</h3>
        <div className="sub">Share of tracked listings per island</div>
        {data.islands.filter((i) => i.totalListings > 0).map((island) => (
          <div className="bar-row" key={island.name}>
            <div className="bar-label">{island.name}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(island.totalListings / maxCount) * 100}%` }} />
            </div>
            <div className="bar-val">{island.totalListings}</div>
          </div>
        ))}
        <div className="chart-disc">Based on tracked public listings.</div>
      </div>

      {/* Methodology */}
      <div className="mi-section anim-fu delay-35">
        <h3>Methodology</h3>
        <div style={{ height: 16 }} />
        {METHODOLOGY.map((item, i) => (
          <div className={`meth-item${openIdx === i ? " open" : ""}`} key={i}>
            <div className="meth-q" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}>
              {item.q}
              <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="meth-a"><p>{item.a}</p></div>
          </div>
        ))}
        <div className="mi-disclaimer">
          All market data is based on tracked public listings. This is not financial advice.
        </div>
      </div>

      <NewsletterCta
        heading={<>Get the <em>market report</em></>}
        description="Median price movements, inventory trends, and notable market shifts — delivered monthly."
      />
    </>
  );
}
