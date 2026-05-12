/**
 * Market selection context — drives market-scoped views (Dashboard, Sources,
 * Stats, Source Health Report). Default: Cape Verde (the only active market).
 *
 * UI-only. No data changes. Persists selection to localStorage so the
 * operator's market choice survives reloads and tab switches.
 *
 * TODO(weekly-digest): the upcoming Weekly Data Health Digest should also be
 * market-scoped, starting with Cape Verde. It should reuse this context's
 * selected-market value so manual selection and digest scope stay in sync.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { getMarketIds } from "./data";

export type MarketStatus = "active" | "pipeline" | "research" | "future" | "paused";

/** Status assignments. Only Cape Verde is in production today; every other
 *  market in the DB is pre-production / test pipeline. Edit this when a new
 *  market goes live. */
const STATUS_TABLE: Record<string, MarketStatus> = {
  cv: "active",
};
const DEFAULT_STATUS: MarketStatus = "pipeline";

export const DEFAULT_MARKET_ID = "cv";
export const DEFAULT_MARKET_NAME = "Cape Verde";
const STORAGE_KEY = "arei-admin-selected-market";

export function marketStatus(id: string): MarketStatus {
  return STATUS_TABLE[id] ?? DEFAULT_STATUS;
}

export const STATUS_LABEL: Record<MarketStatus, string> = {
  active: "Active",
  pipeline: "Pipeline",
  research: "Research",
  future: "Future",
  paused: "Paused",
};

const STATUS_TONE: Record<MarketStatus, string> = {
  active: "bg-green-muted text-green",
  pipeline: "bg-surface-3 text-foreground-muted",
  research: "bg-surface-3 text-foreground-muted",
  future: "bg-surface-3 text-foreground-muted",
  paused: "bg-amber-muted text-amber",
};

export interface MarketInfo {
  id: string;
  name: string;
  status: MarketStatus;
}

interface Ctx {
  selectedMarketId: string;
  setSelectedMarketId: (id: string) => void;
  markets: MarketInfo[];
  selected: MarketInfo;
}

const MarketCtx = createContext<Ctx | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [selectedMarketId, setSelectedMarketIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_MARKET_ID;
    } catch {
      return DEFAULT_MARKET_ID;
    }
  });
  const [markets, setMarkets] = useState<MarketInfo[]>([
    { id: DEFAULT_MARKET_ID, name: DEFAULT_MARKET_NAME, status: marketStatus(DEFAULT_MARKET_ID) },
  ]);

  useEffect(() => {
    let cancelled = false;
    getMarketIds().then((ms) => {
      if (cancelled) return;
      const merged: MarketInfo[] = ms.map((m) => ({ id: m.id, name: m.name, status: marketStatus(m.id) }));
      // Guarantee cv is always present even if the markets RPC returns nothing.
      if (!merged.find((m) => m.id === DEFAULT_MARKET_ID)) {
        merged.unshift({ id: DEFAULT_MARKET_ID, name: DEFAULT_MARKET_NAME, status: "active" });
      }
      setMarkets(merged);
    });
    return () => { cancelled = true; };
  }, []);

  const setSelectedMarketId = (id: string) => {
    setSelectedMarketIdState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode etc. */ }
  };

  const selected: MarketInfo =
    markets.find((m) => m.id === selectedMarketId) ?? {
      id: selectedMarketId,
      name: selectedMarketId.toUpperCase(),
      status: marketStatus(selectedMarketId),
    };

  return (
    <MarketCtx.Provider value={{ selectedMarketId, setSelectedMarketId, markets, selected }}>
      {children}
    </MarketCtx.Provider>
  );
}

export function useSelectedMarket(): Ctx {
  const c = useContext(MarketCtx);
  if (!c) throw new Error("useSelectedMarket must be used inside <MarketProvider>");
  return c;
}

export function MarketSelector() {
  const { selectedMarketId, setSelectedMarketId, markets, selected } = useSelectedMarket();
  // Sort: active first (so Cape Verde anchors the list), then by name.
  const ranked = [...markets].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return a.name.localeCompare(b.name);
  });
  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="arei-market-selector" className="text-xs text-foreground-muted">Market:</label>
      <div className="relative">
        <select
          id="arei-market-selector"
          value={selectedMarketId}
          onChange={(e) => setSelectedMarketId(e.target.value)}
          className="appearance-none pl-3 pr-8 py-1.5 text-xs font-medium rounded border border-border-strong bg-surface-1 text-foreground hover:bg-surface-2 transition-colors font-mono"
        >
          {ranked.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} — {STATUS_LABEL[m.status]}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted text-[10px]">▼</span>
      </div>
      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-medium ${STATUS_TONE[selected.status]}`}>
        {STATUS_LABEL[selected.status]}
      </span>
    </div>
  );
}

/** Empty state for non-active markets with no source health rows yet. */
export function PipelineEmptyState({ market }: { market: MarketInfo }) {
  return (
    <div className="surface-1 rounded border border-border border-dashed p-12 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
        <span className="text-foreground-subtle text-sm">⬡</span>
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        No production source health available for this market yet.
      </p>
      <p className="text-xs text-foreground-muted">
        {market.name} is {STATUS_LABEL[market.status].toLowerCase()} only.
      </p>
    </div>
  );
}
