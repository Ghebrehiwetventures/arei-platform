import { useEffect, useState } from "react";
import { arei } from "../lib/arei";
import type { IslandContext } from "arei-sdk";
import { formatMedian, formatPricePerSqm } from "../lib/format";
import "./MarketContext.css";

interface Props {
  island: string;
  price: number | null;
}

interface StatCard {
  value: string;
  label: string;
  note?: string;
  percentile?: number; // 0-100, for visual bar
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export default function MarketContext({ island, price }: Props) {
  const [ctx, setCtx] = useState<IslandContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    arei
      .getIslandContext(island, price)
      .then((data) => {
        if (!cancelled) setCtx(data);
      })
      .catch(() => {
        if (!cancelled) setCtx(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [island, price]);

  if (loading || !ctx) return null;

  // Build stat cards — only metrics with data
  const cards: StatCard[] = [];

  if (ctx.medianPrice !== null) {
    cards.push({
      value: formatMedian(ctx.medianPrice),
      label: `${island} Median`,
      note: `Based on ${ctx.activeListings} priced listings`,
    });
  }

  if (ctx.activeListings > 0) {
    cards.push({
      value: String(ctx.activeListings),
      label: "Priced Listings",
      note: `On ${island}`,
    });
  }

  if (ctx.medianPricePerSqm !== null) {
    cards.push({
      value: formatPricePerSqm(ctx.medianPricePerSqm),
      label: "Median €/m²",
      note: `${ctx.nSqmListings} listings with size data`,
    });
  }

  if (ctx.pricePercentile !== null) {
    const p = ctx.pricePercentile;
    const suffix =
      p % 100 >= 11 && p % 100 <= 13
        ? "th"
        : p % 10 === 1
          ? "st"
          : p % 10 === 2
            ? "nd"
            : p % 10 === 3
              ? "rd"
              : "th";
    cards.push({
      value: `${p}${suffix}`,
      label: "Price Percentile",
      note: p >= 50 ? "Above island median" : "Below island median",
      percentile: p,
    });
  }

  if (cards.length < 4 && ctx.lastUpdated) {
    cards.push({
      value: formatShortDate(ctx.lastUpdated),
      label: "Last Seen",
      note: "Latest tracked update",
    });
  }

  // Don't render the section if no cards
  if (cards.length === 0) return null;

  return (
    <section className="mctx">
      <h2 className="mctx-h">
        Market <em>Context</em>
      </h2>
      <div className={`mctx-grid mctx-grid-${Math.min(cards.length, 4)}`}>
        {cards.map((card) => (
          <div className="sb" key={card.label}>
            <div className="v">{card.value}</div>
            <div className="l">{card.label}</div>
            {card.percentile != null && (
              <div className="mctx-pbar">
                <div className="mctx-pbar-track">
                  <div className="mctx-pbar-dot" style={{ left: `${card.percentile}%` }} />
                </div>
                <div className="mctx-pbar-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
            {card.note && <div className="mctx-note">{card.note}</div>}
          </div>
        ))}
      </div>
      <div className="mctx-disc">
        Asking price data from public listings. Not financial advice.{" "}
        <a href="/market">View full market data</a>
      </div>
    </section>
  );
}
