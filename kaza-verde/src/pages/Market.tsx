import { useState } from "react";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { MARKET_STATS, ISLANDS } from "../lib/demo-data";
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

export default function Market() {
  useDocumentMeta("Market Data", "Median prices by island, inventory trends, and Cape Verde property market insights.");
  const [openIdx, setOpenIdx] = useState(0);
  const maxCount = Math.max(...ISLANDS.map((i) => i.count));

  return (
    <>
      <div className="mi-header anim-fu delay-1">
        <div className="mi-overline">MARKET INTELLIGENCE</div>
        <h1>Cape Verde Property Market</h1>
        <p>
          Index-level market data derived from {MARKET_STATS.totalInventory} tracked public
          listings across {MARKET_STATS.sources} sources.
        </p>
      </div>

      {/* KPIs */}
      <div className="mi-kpis anim-fu delay-15">
        <div className="kpi">
          <div className="kl">Median Asking Price</div>
          <div className="kv">{formatMedian(MARKET_STATS.medianPrice)}</div>
          <div className="kn">Based on listings with verified price</div>
        </div>
        <div className="kpi">
          <div className="kl">Total Tracked Inventory</div>
          <div className="kv">{MARKET_STATS.totalInventory}</div>
          <div className="kn">Active buy listings in v1 feed</div>
        </div>
        <div className="kpi">
          <div className="kl">Islands Covered</div>
          <div className="kv">{MARKET_STATS.islands.length}</div>
          <div className="kn">{MARKET_STATS.sources} sources tracked</div>
        </div>
      </div>

      {/* Median by island table */}
      <div className="mi-section anim-fu delay-2">
        <h3>Median Price by Island</h3>
        <div className="sub">Asking price median for each island with verified price data</div>
        <table className="mi-table">
          <thead>
            <tr><th>Island</th><th>Median Price</th><th>Listings</th></tr>
          </thead>
          <tbody>
            {MARKET_STATS.islands.map((island) => (
              <tr key={island.name}>
                <td className="island-name">{island.name}</td>
                <td>{island.median !== null ? formatMedian(island.median) : "Insufficient data"}</td>
                <td>{island.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="chart-disc">
          Based on listings with verified price. Minimum sample: 5 listings per island.
        </div>
      </div>

      {/* Listing Distribution */}
      <div className="mi-section anim-fu delay-25">
        <h3>Listing Distribution by Island</h3>
        <div className="sub">Share of tracked listings per island</div>
        {ISLANDS.filter((i) => i.count > 0).map((island) => (
          <div className="bar-row" key={island.name}>
            <div className="bar-label">{island.name}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(island.count / maxCount) * 100}%` }} />
            </div>
            <div className="bar-val">{island.count}</div>
          </div>
        ))}
        <div className="chart-disc">Based on tracked public listings.</div>
      </div>

      {/* Methodology */}
      <div className="mi-section anim-fu delay-3">
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
