import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  getMarkets,
  getMarket,
  getDashboardStats,
  getLatestSyncLog,
  getListings,
  getListingById,
  getMarketIds,
  type ListingsFilters,
  type ListingsSortKey,
  type LatestSyncLog,
} from "./data";

const SYNC_STALE_MINUTES = 24 * 60 * 3; // 3 days
import { Market, Source, Listing, SourceStatus, DashboardStats, SourceQualityRow } from "./types";

// ============================================
// IMAGE GALLERY — arrows on hover, dot navigation
// ============================================

function ImageGallery({
  images,
  width,
  height,
  responsive = false,
}: {
  images: string[];
  width: number;
  height: number;
  responsive?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  const sizeStyle = responsive
    ? { width: "100%", height: "100%" }
    : { width, height };

  if (images.length === 0) {
    return (
      <div
        style={{
          ...sizeStyle,
          background: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#555",
          fontSize: 13,
          borderRadius: "8px 8px 0 0",
        }}
      >
        NO IMAGE
      </div>
    );
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % images.length);
  };

  const showArrows = hovered && images.length > 1;

  const arrowBase: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 18,
    lineHeight: "32px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: showArrows ? 1 : 0,
    transition: "opacity 0.2s",
    zIndex: 2,
    padding: 0,
  };

  return (
    <div
      style={{
        position: "relative",
        ...sizeStyle,
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={images[idx]}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
        }}
      />

      {/* Left arrow */}
      {images.length > 1 && (
        <button onClick={prev} style={{ ...arrowBase, left: 6 }}>
          &#8249;
        </button>
      )}

      {/* Right arrow */}
      {images.length > 1 && (
        <button onClick={next} style={{ ...arrowBase, right: 6 }}>
          &#8250;
        </button>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 5,
            alignItems: "center",
            zIndex: 2,
          }}
        >
          {images.slice(0, 7).map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
              style={{
                width: i === idx ? 8 : 6,
                height: i === idx ? 8 : 6,
                borderRadius: "50%",
                border: "none",
                background: i === idx ? "#fff" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s",
              }}
            />
          ))}
          {images.length > 7 && (
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 10,
                lineHeight: "8px",
              }}
            >
              +{images.length - 7}
            </span>
          )}
        </div>
      )}

      {/* Image counter badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 11,
          padding: "2px 7px",
          borderRadius: 10,
          zIndex: 2,
        }}
      >
        {idx + 1}/{images.length}
      </div>
    </div>
  );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: SourceStatus }) {
  const classes: Record<string, string> = {
    OK: "bg-green text-primary-foreground",
    PARTIAL_OK: "bg-amber text-foreground",
    BROKEN_SOURCE: "bg-red text-primary-foreground",
    UNSCRAPABLE: "bg-red text-primary-foreground",
    PAUSED_BY_SYSTEM: "bg-amber text-foreground",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${classes[status] ?? "bg-muted-foreground text-background"}`}>
      {status}
    </span>
  );
}

// ============================================
// PRICE FORMATTER + CURRENCY CONVERSION
// ============================================

/** Approximate rate to 1 USD (e.g. 1 KES = 0.0077 USD). Used when no API. */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  KES: 0.0077,
  GHS: 0.065,
  NGN: 0.00062,
  ZAR: 0.055,
  TZS: 0.00039,
  UGX: 0.00026,
  XOF: 0.0016,
  XAF: 0.0016,
};

function toUsd(amount: number, currency?: string): number {
  const c = (currency || "USD").toUpperCase();
  const rate = RATES_TO_USD[c] ?? RATES_TO_USD[c.slice(0, 3)];
  if (rate != null) return amount * rate;
  return amount; // assume USD if unknown
}

type DisplayCurrency = "original" | "USD" | "EUR";

function formatPrice(
  price?: number,
  currency?: string,
  displayCurrency?: DisplayCurrency
): string {
  if (price === undefined) return "No price";
  const c = currency || "EUR";
  if (displayCurrency === "USD" || displayCurrency === "EUR") {
    const usd = toUsd(price, c);
    const displayAmount = displayCurrency === "EUR" ? usd / (RATES_TO_USD.EUR ?? 1) : usd;
    const symbol = displayCurrency === "EUR" ? "€" : "$";
    return symbol + " " + Math.round(displayAmount).toLocaleString() + " " + displayCurrency;
  }
  const formatted = price.toLocaleString();
  if (c === "EUR") return formatted + " EUR";
  return c + " " + formatted;
}

// ============================================
// GRADE BADGE (A/B/C/D)
// ============================================

function GradeBadge({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const classes: Record<string, string> = {
    A: "bg-green text-primary-foreground",
    B: "bg-green/80 text-primary-foreground",
    C: "bg-amber text-foreground",
    D: "bg-red text-primary-foreground",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-sm font-bold ${classes[grade] ?? "bg-muted-foreground text-background"}`}>
      {grade}
    </span>
  );
}

// ============================================
// DASHBOARD VIEW — Data health + Sync + Source quality
// ============================================

/** Optional GitHub Actions URL for "Latest sync logs" link. Set in env or leave empty. */
const GITHUB_ACTIONS_URL = import.meta.env.VITE_GITHUB_ACTIONS_URL ?? "";

type SourceQualitySortKey = "sourceName" | "marketId" | "listing_count" | "approved_pct" | "with_image_pct" | "with_price_pct" | "grade";

function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestSync, setLatestSync] = useState<{ at: string; marketName: string; totalListings: number; visibleCount: number } | null>(null);
  const [exportingRunReport, setExportingRunReport] = useState(false);
  const [sortKey, setSortKey] = useState<SourceQualitySortKey>("listing_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    getDashboardStats().then((s) => {
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLatestSyncLog().then((log) => {
      if (!cancelled && log) setLatestSync(log);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-muted-foreground font-mono">
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-foreground font-mono">
        Failed to load dashboard. Ensure Supabase RPC <code className="bg-muted px-1">get_source_quality_stats</code> exists (see docs/supabase_rpc.sql).
      </div>
    );
  }

  const worst = stats.sourceRows.filter((r) => r.grade === "D" || r.grade === "C").slice(0, 5);
  const best = stats.sourceRows.filter((r) => r.grade === "A" || r.grade === "B").slice(-5).reverse();
  const approvedPct = stats.totalListings > 0 ? Math.round((100 * stats.approvedCount) / stats.totalListings) : 0;
  const healthLabel = approvedPct >= 70 ? "Good" : approvedPct >= 40 ? "Acceptable" : "Needs attention";

  const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
  const sortedSourceRows = [...stats.sourceRows].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1;
    if (sortKey === "sourceName" || sortKey === "marketId") {
      const va = String(a[sortKey] ?? "");
      const vb = String(b[sortKey] ?? "");
      return mult * va.localeCompare(vb);
    }
    if (sortKey === "grade") {
      return mult * (gradeOrder[a.grade] - gradeOrder[b.grade]);
    }
    const va = Number(a[sortKey]);
    const vb = Number(b[sortKey]);
    return mult * (va - vb);
  });

  const handleSort = (key: SourceQualitySortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "sourceName" || key === "marketId" ? "asc" : "desc");
    }
  };

  const handleExportRunReport = async () => {
    setExportingRunReport(true);
    try {
      const res = await fetch("/cv_ingest_report.json");
      if (!res.ok) throw new Error("Report not found");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv_ingest_report_${latestSync?.at ? new Date(latestSync.at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.warn("[Dashboard] Could not export run report");
    } finally {
      setExportingRunReport(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* ── Data health ───────────────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Data health
        </h2>
        <p className="label-style mb-6">
          Overview of data quality and sources
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Total listings</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {stats.totalListings.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Approved (visible)</div>
            <div className="text-2xl font-bold text-green tabular-nums">
              {stats.approvedCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Sources</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{stats.sourceCount}</div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Markets</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{stats.marketCount}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center mb-2">
          <span className="label-style">Overall health status:</span>
          <span
            className={
              approvedPct >= 70
                ? "bg-green text-primary-foreground px-3 py-1 text-sm font-bold uppercase"
                : approvedPct >= 40
                  ? "bg-amber text-foreground px-3 py-1 text-sm font-bold uppercase"
                  : "bg-red text-primary-foreground px-3 py-1 text-sm font-bold uppercase"
            }
          >
            {healthLabel}
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            ({approvedPct}% approved)
          </span>
        </div>

        {/* Need attention / Performing well */}
        {(worst.length > 0 || best.length > 0) && (
          <div className="flex flex-wrap gap-4 mt-4">
            {worst.length > 0 && (
              <div className="flex-1 min-w-[200px] border border-foreground brutalist-shadow-sm p-4 bg-amber/10">
                <div className="label-style text-amber mb-2">Needs attention</div>
                <p className="text-foreground text-sm font-mono">
                  {worst.map((r) => r.sourceName).join(", ")}
                </p>
              </div>
            )}
            {best.length > 0 && (
              <div className="flex-1 min-w-[200px] border border-foreground brutalist-shadow-sm p-4 bg-green/10">
                <div className="label-style text-green mb-2">Performing well</div>
                <p className="text-foreground text-sm font-mono">
                  {best.map((r) => r.sourceName).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Latest sync logs ───────────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground mb-1">
          Latest sync logs
        </h2>
        <p className="label-style mb-4">
          Latest runs and sync status
        </p>
        <div className="border border-foreground brutalist-shadow-sm p-4 bg-muted">
          <p className="text-muted-foreground text-sm mb-2">
            Last synced:{" "}
            <span className="text-foreground font-mono">
              {latestSync?.at
                ? new Date(latestSync.at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
            {latestSync && (
              <span className="text-muted-foreground text-xs ml-2">
                ({latestSync.marketName}: {latestSync.totalListings} total, {latestSync.visibleCount} visible)
              </span>
            )}
          </p>
          {!latestSync && (
            <p className="text-muted-foreground text-xs mb-2">
              Runs are logged in CI/CD. Serve the app with <code className="bg-background px-1">artifacts/cv_ingest_report.json</code> in place to see last sync from the report.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={handleExportRunReport}
              disabled={exportingRunReport || !latestSync}
              className="border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingRunReport ? "Exporting…" : "Export run report (JSON)"}
            </button>
            {GITHUB_ACTIONS_URL && (
              <a
                href={GITHUB_ACTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
              >
                Open GitHub Actions →
              </a>
            )}
          </div>
          {!GITHUB_ACTIONS_URL && (
            <p className="text-muted-foreground text-xs mt-2">
              Set <code className="bg-background px-1">VITE_GITHUB_ACTIONS_URL</code> to link to run history.
            </p>
          )}
        </div>
      </section>

      {/* ── Source quality table ───────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground mb-1">
          Source quality
        </h2>
        <p className="label-style mb-4">
          Per source: count, approved %, images, prices, grade
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                {(
                  [
                    { key: "sourceName" as const, label: "Source" },
                    { key: "marketId" as const, label: "Market" },
                    { key: "listing_count" as const, label: "Count" },
                    { key: "approved_pct" as const, label: "Approved %" },
                    { key: "with_image_pct" as const, label: "With image %" },
                    { key: "with_price_pct" as const, label: "With price %" },
                    { key: "grade" as const, label: "Grade" },
                  ] as const
                ).map(({ key, label }) => (
                  <th key={key} className="text-left py-2 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="label-style w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {label}
                      {sortKey === key && (
                        <span className="text-foreground" aria-hidden>
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSourceRows.map((r: SourceQualityRow) => (
                <tr key={r.source_id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">{r.sourceName}</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.marketId}</td>
                  <td className="py-2 px-3 text-muted-foreground tabular-nums">
                    {Number(r.listing_count).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{r.approved_pct}%</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.with_image_pct}%</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.with_price_pct}%</td>
                  <td className="py-2 px-3">
                    <GradeBadge grade={r.grade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.sourceRows.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">
            No source data. Run the SQL in <code className="bg-muted px-1">docs/supabase_rpc.sql</code> in Supabase.
          </p>
        )}
      </section>
    </div>
  );
}

// ============================================
// LISTING CARD
// ============================================

function ListingCard({
  listing,
  onClick,
}: {
  listing: Listing;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        background: "#16213e",
        borderRadius: 12,
        overflow: "hidden",
        width: 280,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
      }}
    >
      <ImageGallery images={listing.images} width={280} height={190} />

      <div style={{ padding: "12px 14px" }}>
        {/* Property type badge */}
        {listing.property_type && (
          <span
            style={{
              background: "#0f3460",
              color: "#7ec8e3",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {listing.property_type}
          </span>
        )}

        {/* Title */}
        <div
          style={{
            color: "#e8e8e8",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 6,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title || "[No title]"}
        </div>

        {/* Location */}
        {listing.location && (
          <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
            {listing.location}
          </div>
        )}

        {/* Price */}
        <div
          style={{
            color: "#7ec8e3",
            fontSize: 18,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {formatPrice(listing.price, listing.currency)}
        </div>

        {/* Specs row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
            color: "#999",
            fontSize: 12,
          }}
        >
          {listing.bedrooms != null && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms != null && <span>{listing.bathrooms} bath</span>}
          {listing.area_sqm != null && (
            <span>{Math.round(listing.area_sqm)} m&sup2;</span>
          )}
          {!listing.bedrooms && !listing.bathrooms && !listing.area_sqm && (
            <span style={{ color: "#555" }}>No specs</span>
          )}
        </div>

        {/* Source */}
        <div
          style={{
            color: "#555",
            fontSize: 11,
            marginTop: 8,
            borderTop: "1px solid #1a1a3e",
            paddingTop: 8,
          }}
        >
          {listing.sourceName}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LISTINGS TAB (server-side pagination + table + detail)
// ============================================

const LISTINGS_PAGE_SIZE = 50;
const EXPORT_ALL_MAX = 5000;

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function listingsToCsv(listings: Listing[]): string {
  const headers = [
    "id",
    "title",
    "price",
    "currency",
    "island",
    "city",
    "bedrooms",
    "bathrooms",
    "area_sqm",
    "source",
    "source_id",
    "approved",
    "source_url",
    "image_url",
  ];
  const rows = listings.map((l) =>
    [
      l.id,
      l.title ?? "",
      l.price ?? "",
      l.currency ?? "",
      l.island ?? "",
      l.city ?? "",
      l.bedrooms ?? "",
      l.bathrooms ?? "",
      l.area_sqm != null ? Math.round(l.area_sqm) : "",
      l.sourceName ?? "",
      l.sourceId ?? "",
      l.approved != null ? (l.approved ? "yes" : "no") : "",
      l.sourceUrl ?? "",
      l.images?.[0] ?? "",
    ].map(escapeCsvCell).join(",")
  );
  return [headers.join(","), ...rows].join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LISTINGS_COLUMNS: { key: ListingsSortKey | "photo" | "grade" | "action"; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "island", label: "Island" },
  { key: "city", label: "City" },
  { key: "bedrooms", label: "Beds" },
  { key: "bathrooms", label: "Baths" },
  { key: "property_size_sqm", label: "Area" },
  { key: "source_id", label: "Source" },
  { key: "grade", label: "Grade" },
  { key: "action", label: "" },
];

function ListingsTabView() {
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [marketId, setMarketId] = useState("all");
  const [sourceOptions, setSourceOptions] = useState<{ id: string; name: string }[]>([]);
  const [gradeBySourceId, setGradeBySourceId] = useState<Map<string, "A" | "B" | "C" | "D">>(new Map());
  const [filters, setFilters] = useState<ListingsFilters>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ListingsSortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState<{ data: Listing[]; totalCount: number }>({ data: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("original");

  useEffect(() => {
    getMarketIds().then(setMarkets);
  }, []);

  useEffect(() => {
    getDashboardStats().then((s) => {
      const opts =
        marketId && marketId !== "all"
          ? s.sourceRows.filter((r) => r.marketId === marketId).map((r) => ({ id: r.source_id, name: r.sourceName }))
          : s.sourceRows.map((r) => ({ id: r.source_id, name: r.sourceName }));
      setSourceOptions(opts);
      setGradeBySourceId(new Map(s.sourceRows.map((r) => [r.source_id, r.grade])));
    });
  }, [marketId]);

  useEffect(() => {
    setLoading(true);
    getListings(marketId, page, LISTINGS_PAGE_SIZE, filters, sortBy, sortDir)
      .then((r) => {
        setResult(r);
        setLoading(false);
      })
      .catch(() => {
        setResult({ data: [], totalCount: 0 });
        setLoading(false);
      });
  }, [marketId, page, filters, sortBy, sortDir]);

  const handleSort = (key: ListingsSortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleExportPage = () => {
    setExportOpen(false);
    const csv = listingsToCsv(result.data);
    downloadCsv(csv, `listings-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAll = async () => {
    setExportOpen(false);
    setExporting(true);
    try {
      const { data } = await getListings(
        marketId,
        1,
        EXPORT_ALL_MAX,
        filters,
        sortBy,
        sortDir
      );
      const csv = listingsToCsv(data);
      downloadCsv(
        csv,
        `listings-export-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(result.totalCount / LISTINGS_PAGE_SIZE));

  if (detailListing) {
    return (
      <div>
        <ListingDetail
          listing={detailListing}
          onBack={() => setDetailListing(null)}
          displayCurrency={displayCurrency}
        />
      </div>
    );
  }

  const inputCls = "bg-background border border-foreground text-foreground px-3 py-2 text-sm font-mono w-full";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
            Listings
          </h2>
          <p className="label-style">
            Browse by market. Server-side pagination.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
            className="border border-foreground px-4 py-2 text-sm font-mono hover:bg-foreground hover:text-background transition-colors"
          >
            Clear filters
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting}
              className="border border-foreground px-4 py-2 text-sm font-mono hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export report"}
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] border border-foreground bg-background py-1">
                  <button
                    type="button"
                    onClick={handleExportPage}
                    className="block w-full px-4 py-2 text-left text-sm font-mono hover:bg-muted"
                  >
                    This page (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="block w-full px-4 py-2 text-left text-sm font-mono hover:bg-muted"
                  >
                    All matching, max {EXPORT_ALL_MAX.toLocaleString()} (CSV)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border border-border bg-muted/30 p-4 mb-6">
        <div className="label-style mb-3">Filters</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="label-style block mb-1">Market</label>
            <select
              value={marketId}
              onChange={(e) => {
                setMarketId(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="all">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-style block mb-1">Source</label>
            <select
              value={filters.sourceId ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, sourceId: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All sources</option>
              {sourceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-style block mb-1">Display prices in</label>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}
              className={inputCls}
            >
              <option value="original">Original currency</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="label-style block mb-1">Approved</label>
            <select
              value={filters.approved === undefined ? "" : filters.approved ? "yes" : "no"}
              onChange={(e) => {
                const v = e.target.value;
                setFilters((f) => ({ ...f, approved: v === "" ? undefined : v === "yes" }));
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="label-style block mb-1">Updated from</label>
            <input
              type="date"
              value={filters.importedAfter ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, importedAfter: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Updated to</label>
            <input
              type="date"
              value={filters.importedBefore ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, importedBefore: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-1">
            <label className="label-style block mb-1">Title search</label>
            <input
              type="text"
              value={filters.titleSearch ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, titleSearch: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="Search title"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Price min</label>
            <input
              type="number"
              value={filters.priceMin ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Price max</label>
            <input
              type="number"
              value={filters.priceMax ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Island</label>
            <input
              type="text"
              value={filters.island ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, island: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="e.g. Sal"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">City</label>
            <input
              type="text"
              value={filters.city ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, city: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Beds min</label>
            <input
              type="number"
              min={0}
              value={filters.bedrooms ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Baths min</label>
            <input
              type="number"
              min={0}
              value={filters.bathrooms ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Area min (m²)</label>
            <input
              type="number"
              min={0}
              value={filters.areaMin ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, areaMin: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="label-style block mb-1">Area max (m²)</label>
            <input
              type="number"
              min={0}
              value={filters.areaMax ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, areaMax: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-muted-foreground text-sm mb-4">Loading…</p>}

      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {LISTINGS_COLUMNS.map(({ key, label }) =>
                    key === "photo" || key === "grade" || key === "action" ? (
                      <th key={key} className="text-left py-2 px-3 label-style">
                        {label}
                      </th>
                    ) : (
                      <th key={key} className="text-left py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="label-style w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {label}
                          {sortBy === key && (
                            <span className="text-foreground" aria-hidden>
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {result.data.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setDetailLoading(true);
                      getListingById(l.id).then((full) => {
                        setDetailLoading(false);
                        if (full) setDetailListing(full);
                      });
                    }}
                  >
                    <td className="py-2 px-3 w-14">
                      {l.images.length > 0 ? (
                        <img
                          src={l.images[0]}
                          alt=""
                          className="w-12 h-9 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-foreground max-w-[220px] truncate">
                      {l.title || "[No title]"}
                    </td>
                    <td className="py-2 px-3 text-foreground font-medium">
                      {formatPrice(l.price, l.currency, displayCurrency)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{l.island ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.city ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.bedrooms ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.bathrooms ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {l.area_sqm != null ? Math.round(l.area_sqm) + " m²" : "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{l.sourceName}</td>
                    <td className="py-2 px-3">
                      {gradeBySourceId.get(l.sourceId) ? (
                        <GradeBadge grade={gradeBySourceId.get(l.sourceId)!} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDetailLoading(true);
                          getListingById(l.id).then((full) => {
                            setDetailLoading(false);
                            if (full) setDetailListing(full);
                          });
                        }}
                        className="border border-foreground px-2 py-1 text-xs font-mono hover:bg-foreground hover:text-background transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-foreground px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground hover:text-background transition-colors"
            >
              Previous
            </button>
            <span className="text-muted-foreground text-sm tabular-nums">
              Page {page} of {totalPages} · {result.totalCount.toLocaleString()} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-foreground px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground hover:text-background transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center text-background font-mono">
          Loading listing…
        </div>
      )}
    </div>
  );
}

// ============================================
// SOURCES — All sources per country / market
// ============================================

function SourcesView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDashboardStats(), getMarketIds()]).then(([s, m]) => {
      if (!cancelled) {
        setStats(s);
        setMarkets(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-12 text-muted-foreground font-mono">
        Loading sources…
      </div>
    );
  }

  const marketNameById = new Map(markets.map((m) => [m.id, m.name]));
  const byMarket = new Map<string, SourceQualityRow[]>();
  for (const r of stats.sourceRows) {
    const m = r.marketId;
    if (!byMarket.has(m)) byMarket.set(m, []);
    byMarket.get(m)!.push(r);
  }
  const marketIds = [...byMarket.keys()].sort((a, b) => {
    const nameA = marketNameById.get(a) ?? a;
    const nameB = marketNameById.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Sources
        </h2>
        <p className="label-style mb-6">
          All sources by country / market. Listings count, approval, image and price coverage, grade.
        </p>
      </section>

      {marketIds.map((marketId) => {
        const rows = byMarket.get(marketId)!;
        const marketName = marketNameById.get(marketId) ?? marketId;
        const totalListings = rows.reduce((acc, r) => acc + Number(r.listing_count), 0);
        return (
          <section key={marketId} className="border border-foreground brutalist-shadow-sm overflow-hidden">
            <div className="bg-muted border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground">
                {marketName} ({marketId})
              </h3>
              <span className="label-style tabular-nums">
                {rows.length} source{rows.length !== 1 ? "s" : ""} · {totalListings.toLocaleString()} listings
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2 px-3 label-style">Source</th>
                    <th className="text-right py-2 px-3 label-style">Listings</th>
                    <th className="text-right py-2 px-3 label-style">Approved %</th>
                    <th className="text-right py-2 px-3 label-style">With image %</th>
                    <th className="text-right py-2 px-3 label-style">With price %</th>
                    <th className="text-left py-2 px-3 label-style">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .sort((a, b) => Number(b.listing_count) - Number(a.listing_count))
                    .map((r) => (
                      <tr key={r.source_id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{r.sourceName}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                          {Number(r.listing_count).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.approved_pct}%</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.with_image_pct}%</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.with_price_pct}%</td>
                        <td className="py-2 px-3">
                          <GradeBadge grade={r.grade} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {marketIds.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No source data. Ensure Supabase RPC <code className="bg-muted px-1">get_source_quality_stats</code> exists.
        </p>
      )}
    </div>
  );
}

// ============================================
// STATS — Developer-focused metrics & red flags
// ============================================

function StatsView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [latestSync, setLatestSync] = useState<LatestSyncLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDashboardStats(), getLatestSyncLog()]).then(([s, log]) => {
      if (!cancelled) {
        setStats(s);
        setLatestSync(log ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-12 text-muted-foreground font-mono">
        Loading stats…
      </div>
    );
  }

  const rows = stats.sourceRows;
  const approvedPct = stats.totalListings > 0 ? (100 * stats.approvedCount) / stats.totalListings : 0;
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  rows.forEach((r) => {
    gradeCounts[r.grade]++;
  });

  const syncAt = latestSync?.at ? new Date(latestSync.at).getTime() : null;
  const syncAgeMinutes = syncAt ? (Date.now() - syncAt) / (60 * 1000) : null;
  const syncStale = syncAgeMinutes != null && syncAgeMinutes > SYNC_STALE_MINUTES;
  const syncMissing = !latestSync?.at;

  const noImages = rows.filter((r) => r.with_image_pct < 10);
  const noPrice = rows.filter((r) => r.with_price_pct < 10);
  const lowApproved = rows.filter((r) => r.approved_pct < 50);
  const gradeD = rows.filter((r) => r.grade === "D");
  const gradeC = rows.filter((r) => r.grade === "C");
  const byMarket = new Map<string, { listings: number; sources: number; approvedSum: number; worstGrade: number }>();
  rows.forEach((r) => {
    const m = r.marketId;
    if (!byMarket.has(m)) byMarket.set(m, { listings: 0, sources: 0, approvedSum: 0, worstGrade: 4 });
    const g = byMarket.get(m)!;
    g.listings += Number(r.listing_count);
    g.sources += 1;
    g.approvedSum += (r.approved_pct / 100) * Number(r.listing_count);
    const gradeNum = { A: 4, B: 3, C: 2, D: 1 }[r.grade];
    if (gradeNum < g.worstGrade) g.worstGrade = gradeNum;
  });
  const singleSourceMarkets = [...byMarket.entries()].filter(([, v]) => v.sources === 1).map(([k]) => k);

  const totalWithImage = rows.reduce((acc, r) => acc + (r.with_image_pct / 100) * Number(r.listing_count), 0);
  const totalWithPrice = rows.reduce((acc, r) => acc + (r.with_price_pct / 100) * Number(r.listing_count), 0);
  const globalImagePct = stats.totalListings > 0 ? (100 * totalWithImage) / stats.totalListings : 0;
  const globalPricePct = stats.totalListings > 0 ? (100 * totalWithPrice) / stats.totalListings : 0;

  const worstImage = rows.length ? rows.reduce((a, b) => (a.with_image_pct <= b.with_image_pct ? a : b)) : null;
  const worstPrice = rows.length ? rows.reduce((a, b) => (a.with_price_pct <= b.with_price_pct ? a : b)) : null;
  const bestApproved = rows.length ? rows.reduce((a, b) => (a.approved_pct >= b.approved_pct ? a : b)) : null;

  const flagCount =
    (syncStale ? 1 : 0) +
    (syncMissing ? 1 : 0) +
    gradeD.length +
    (noImages.length ? 1 : 0) +
    (noPrice.length ? 1 : 0) +
    (singleSourceMarkets.length ? 1 : 0);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Stats
        </h2>
        <p className="label-style mb-6">
          Developer-focused metrics and red flags
        </p>
      </section>

      {/* Pulse & sync */}
      <section className="border border-foreground brutalist-shadow-sm p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Pulse
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="label-style mb-1">Last sync</div>
            <div className="font-mono text-foreground">
              {latestSync?.at
                ? new Date(latestSync.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </div>
            {syncMissing && (
              <p className="text-amber text-xs mt-1 font-mono">⚠ No sync report (serve cv_ingest_report.json for timestamp)</p>
            )}
            {syncStale && syncAt && (
              <p className="text-amber text-xs mt-1 font-mono">
                ⚠ Stale: {Math.round(syncAgeMinutes! / (60 * 24))} days ago
              </p>
            )}
          </div>
          <div>
            <div className="label-style mb-1">Overall approval rate</div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${approvedPct >= 70 ? "text-green" : approvedPct >= 40 ? "text-amber" : "text-red"}`}>
              {approvedPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="label-style mb-1">Red-flag count</div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${flagCount === 0 ? "text-green" : flagCount <= 3 ? "text-amber" : "text-red"}`}>
              {flagCount}
            </div>
          </div>
        </div>
      </section>

      {/* Red flags */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Red flags & warnings
        </h3>
        <div className="space-y-3">
          {syncMissing && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Sync</span> — No ingest report loaded. Last sync time unknown.
            </div>
          )}
          {syncStale && !syncMissing && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Stale sync</span> — Last sync &gt; 3 days ago. Consider re-running the pipeline.
            </div>
          )}
          {gradeD.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">Grade D</span> — {gradeD.length} source(s): {gradeD.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {gradeC.length > 0 && gradeC.length <= 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Grade C</span> — {gradeC.length} source(s): {gradeC.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {gradeC.length > 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Grade C</span> — {gradeC.length} sources (review source quality table)
            </div>
          )}
          {noImages.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">&lt;10% with image</span> — {noImages.length} source(s): {noImages.slice(0, 5).map((r) => r.sourceName).join(", ")}
              {noImages.length > 5 && ` +${noImages.length - 5} more`}
            </div>
          )}
          {noPrice.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">&lt;10% with price</span> — {noPrice.length} source(s): {noPrice.slice(0, 5).map((r) => r.sourceName).join(", ")}
              {noPrice.length > 5 && ` +${noPrice.length - 5} more`}
            </div>
          )}
          {lowApproved.length > 0 && lowApproved.length <= 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">&lt;50% approved</span> — {lowApproved.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {singleSourceMarkets.length > 0 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Single-source market</span> — {singleSourceMarkets.join(", ")}. No redundancy if source fails.
            </div>
          )}
          {flagCount === 0 && (
            <div className="border-l-4 border-green bg-green/10 p-3 font-mono text-sm text-green">
              No red flags or warnings.
            </div>
          )}
        </div>
      </section>

      {/* Grade distribution */}
      <section className="border border-border p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Grade distribution
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {(["A", "B", "C", "D"] as const).map((g) => (
            <div key={g} className="flex flex-col items-center gap-1">
              <div
                className={`w-14 font-mono text-2xl font-bold tabular-nums ${
                  g === "A" ? "text-green" : g === "B" ? "text-green/80" : g === "C" ? "text-amber" : "text-red"
                }`}
              >
                {gradeCounts[g] ?? 0}
              </div>
              <div
                className={`w-14 border border-foreground ${
                  g === "A" ? "bg-green" : g === "B" ? "bg-green/70" : g === "C" ? "bg-amber" : "bg-red"
                }`}
                style={{ height: `${Math.max(20, (gradeCounts[g] ?? 0) * 16)}px` }}
              />
              <span className="label-style">Grade {g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* By market */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          By market
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 label-style">Market</th>
                <th className="text-right py-2 px-3 label-style">Listings</th>
                <th className="text-right py-2 px-3 label-style">Sources</th>
                <th className="text-right py-2 px-3 label-style">Approved %</th>
                <th className="text-left py-2 px-3 label-style">Worst grade</th>
              </tr>
            </thead>
            <tbody>
              {[...byMarket.entries()]
                .sort((a, b) => b[1].listings - a[1].listings)
                .map(([marketId, v]) => {
                  const avgApproved = v.listings > 0 ? (100 * v.approvedSum) / v.listings : 0;
                  const worstGrade = ["D", "C", "B", "A"][v.worstGrade - 1] as "A" | "B" | "C" | "D";
                  return (
                    <tr key={marketId} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{marketId.toUpperCase()}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{v.listings.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{v.sources}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{avgApproved.toFixed(1)}%</td>
                      <td className="py-2 px-3">
                        <GradeBadge grade={worstGrade} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data quality snapshot */}
      <section className="border border-border p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Data quality snapshot
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="label-style mb-1">Listings with image</div>
            <div className="font-mono text-xl font-bold tabular-nums">{globalImagePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Listings with price</div>
            <div className="font-mono text-xl font-bold tabular-nums">{globalPricePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Approved (visible)</div>
            <div className="font-mono text-xl font-bold tabular-nums">{approvedPct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Total listings</div>
            <div className="font-mono text-xl font-bold tabular-nums">{stats.totalListings.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* Outliers */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Outliers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-sm">
          {bestApproved && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Best approval rate</span>
              <span className="text-foreground font-medium">{bestApproved.sourceName}</span>
              <span className="text-green ml-2">{bestApproved.approved_pct.toFixed(1)}%</span>
            </div>
          )}
          {worstImage && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Lowest image coverage</span>
              <span className="text-foreground font-medium">{worstImage.sourceName}</span>
              <span className="text-red ml-2">{worstImage.with_image_pct.toFixed(1)}%</span>
            </div>
          )}
          {worstPrice && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Lowest price coverage</span>
              <span className="text-foreground font-medium">{worstPrice.sourceName}</span>
              <span className="text-red ml-2">{worstPrice.with_price_pct.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================
// MARKET OVERVIEW (legacy – kept for optional use)
// ============================================

function MarketOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const markets = getMarkets();
  return (
    <div>
      <h1 style={{ color: "#e8e8e8", marginBottom: 4 }}>AFRICA PROPERTY INDEX</h1>
      <p style={{ color: "#555", fontSize: 13, marginTop: 0 }}>
        Pan-African Real Estate Index
      </p>
      <hr style={{ borderColor: "#222" }} />
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 700 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            {["Market", "Status", "Sources", "Listings", ""].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  color: "#888",
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr
              key={m.id}
              style={{ borderBottom: "1px solid #1a1a2e", cursor: "pointer" }}
              onClick={() => onSelect(m.id)}
            >
              <td style={{ padding: "12px 14px", color: "#e8e8e8", fontWeight: 500 }}>
                {m.name}
              </td>
              <td style={{ padding: "12px 14px" }}>
                <StatusBadge status={m.status} />
              </td>
              <td style={{ padding: "12px 14px", color: "#bbb" }}>{m.sources.length}</td>
              <td style={{ padding: "12px 14px", color: "#bbb" }}>{m.listings.length}</td>
              <td style={{ padding: "12px 14px" }}>
                <button
                  onClick={() => onSelect(m.id)}
                  style={{
                    background: "#0f3460",
                    color: "#7ec8e3",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// SOURCE TABLE
// ============================================

function SourceTable({ sources }: { sources: Source[] }) {
  return (
    <div>
      <h3 style={{ color: "#e8e8e8" }}>Sources ({sources.length})</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            {["Name", "Status", "Scrapes", "Repairs", "Error"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  color: "#888",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1a1a2e" }}>
              <td style={{ padding: "8px 12px", color: "#ccc", fontSize: 13 }}>{s.name}</td>
              <td style={{ padding: "8px 12px" }}>
                <StatusBadge status={s.state.status} />
              </td>
              <td style={{ padding: "8px 12px", color: "#bbb", fontSize: 13 }}>
                {s.state.scrapeAttempts}
              </td>
              <td style={{ padding: "8px 12px", color: "#bbb", fontSize: 13 }}>
                {s.state.repairAttempts}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  color: s.state.lastError ? "#ef4444" : "#555",
                  fontSize: 12,
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <div>{s.state.lastError || "-"}</div>
                {s.state.pauseReason && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    pause: {s.state.pauseReason}
                  </div>
                )}
                {s.state.pauseDetail && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.pauseDetail}
                  </div>
                )}
                {s.state.consecutiveFailureCount && s.state.consecutiveFailureCount > 0 && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.consecutiveFailureCount} consecutive parser failure{s.state.consecutiveFailureCount === 1 ? "" : "s"}
                  </div>
                )}
                {s.state.debugErrors && s.state.debugErrors.length > 0 && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.debugErrors.length} debug error{s.state.debugErrors.length === 1 ? "" : "s"}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// FILTERS
// ============================================

export interface FilterState {
  keyword: string;
  priceMin: string;
  priceMax: string;
  island: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  areaMin: string;
  areaMax: string;
  sourceId: string;
  priceOnRequest: boolean;
}

const defaultFilters: FilterState = {
  keyword: "",
  priceMin: "",
  priceMax: "",
  island: "",
  propertyType: "",
  bedrooms: "",
  bathrooms: "",
  areaMin: "",
  areaMax: "",
  sourceId: "",
  priceOnRequest: false,
};

function applyFilters(listings: Listing[], filters: FilterState): Listing[] {
  return listings.filter((l) => {
    if (filters.keyword.trim()) {
      const k = filters.keyword.toLowerCase();
      const text = [l.title, l.description, l.location].filter(Boolean).join(" ").toLowerCase();
      if (!text.includes(k)) return false;
    }
    if (filters.priceMin) {
      const min = Number(filters.priceMin);
      if (l.price == null || l.price < min) return false;
    }
    if (filters.priceMax) {
      const max = Number(filters.priceMax);
      if (l.price == null || l.price > max) return false;
    }
    if (filters.priceOnRequest && l.price != null) return false;
    if (filters.island && (l.island || "").toLowerCase() !== filters.island.toLowerCase()) return false;
    if (filters.propertyType && (l.property_type || "") !== filters.propertyType) return false;
    if (filters.bedrooms) {
      const b = Number(filters.bedrooms);
      if (l.bedrooms == null || l.bedrooms < b) return false;
    }
    if (filters.bathrooms) {
      const b = Number(filters.bathrooms);
      if (l.bathrooms == null || l.bathrooms < b) return false;
    }
    if (filters.areaMin) {
      const a = Number(filters.areaMin);
      if (l.area_sqm == null || l.area_sqm < a) return false;
    }
    if (filters.areaMax) {
      const a = Number(filters.areaMax);
      if (l.area_sqm == null || l.area_sqm > a) return false;
    }
    if (filters.sourceId && l.sourceId !== filters.sourceId) return false;
    return true;
  });
}

const PAGE_SIZE = 24;

function FilterBar({
  filters,
  setFilters,
  listings,
  sources,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  listings: Listing[];
  sources: Source[];
}) {
  const islands = Array.from(new Set(listings.map((l) => l.island).filter(Boolean))) as string[];
  const propertyTypes = Array.from(new Set(listings.map((l) => l.property_type).filter(Boolean))) as string[];

  return (
    <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, marginBottom: 20 }}>
      <h4 style={{ color: "#e8e8e8", marginTop: 0, marginBottom: 12 }}>Filters</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <input
          type="text"
          placeholder="Keywords..."
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Price min"
          value={filters.priceMin}
          onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Price max"
          value={filters.priceMax}
          onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
          style={inputStyle}
        />
        <select
          value={filters.island}
          onChange={(e) => setFilters({ ...filters, island: e.target.value })}
          style={inputStyle}
        >
          <option value="">All islands</option>
          {islands.sort().map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select
          value={filters.propertyType}
          onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
          style={inputStyle}
        >
          <option value="">All types</option>
          {propertyTypes.sort().map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.bedrooms}
          onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
          style={inputStyle}
        >
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>{n}+</option>
          ))}
        </select>
        <select
          value={filters.bathrooms}
          onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
          style={inputStyle}
        >
          <option value="">Any baths</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={String(n)}>{n}+</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Area min m²"
          value={filters.areaMin}
          onChange={(e) => setFilters({ ...filters, areaMin: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Area max m²"
          value={filters.areaMax}
          onChange={(e) => setFilters({ ...filters, areaMax: e.target.value })}
          style={inputStyle}
        />
        <select
          value={filters.sourceId}
          onChange={(e) => setFilters({ ...filters, sourceId: e.target.value })}
          style={inputStyle}
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#bbb", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={filters.priceOnRequest}
            onChange={(e) => setFilters({ ...filters, priceOnRequest: e.target.checked })}
          />
          Price on request
        </label>
      </div>
      <button
        onClick={() => setFilters(defaultFilters)}
        style={{
          marginTop: 12,
          background: "#333",
          color: "#ccc",
          border: "none",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Clear filters
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0f0f1a",
  border: "1px solid #333",
  color: "#e8e8e8",
  padding: "8px 10px",
  borderRadius: 6,
  fontSize: 13,
};

// ============================================
// LISTING DETAIL (all DB data + visit link)
// ============================================

function ListingDetail({
  listing,
  onBack,
  displayCurrency = "original",
}: {
  listing: Listing;
  onBack: () => void;
  displayCurrency?: DisplayCurrency;
}) {
  const facts: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: "Type", value: listing.property_type },
    { label: "Source ref", value: listing.source_ref },
    { label: "Bedrooms", value: listing.bedrooms },
    { label: "Bathrooms", value: listing.bathrooms },
    { label: "Area (m²)", value: listing.area_sqm != null ? Math.round(listing.area_sqm) : null },
    { label: "Land (m²)", value: listing.land_area_sqm != null ? Math.round(listing.land_area_sqm) : null },
    { label: "Island", value: listing.island },
    { label: "City", value: listing.city },
    { label: "Status", value: listing.status },
    { label: "Approved", value: listing.approved != null ? (listing.approved ? "Yes" : "No") : null },
    { label: "Price period", value: listing.price_period },
    { label: "Project", value: listing.project_flag != null ? (listing.project_flag ? "Yes" : "No") : null },
    { label: "Project start price", value: listing.project_start_price },
  ].filter((x) => x.value != null && x.value !== "");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="border border-foreground px-4 py-2 text-sm font-mono text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          ← Back to list
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-foreground">
            {formatPrice(listing.price, listing.currency, displayCurrency)}
          </span>
          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest no-underline hover:bg-foreground hover:text-background transition-colors"
            >
              View original listing ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="min-w-0 max-w-full">
          <div className="w-full max-w-[560px] aspect-[560/360] overflow-hidden rounded-lg">
            <ImageGallery images={listing.images} width={560} height={360} responsive />
          </div>
          <h2 className="font-sans font-black text-xl uppercase tracking-tight text-foreground mt-4">
            {listing.title || "[No title]"}
          </h2>
          {listing.location && (
            <p className="text-muted-foreground text-sm mt-1">
              📍 {listing.location}
            </p>
          )}
          {facts.length > 0 && (
            <div className="bg-muted border border-border p-4 mt-4">
              <h4 className="label-style mt-0 mb-2">Key facts</h4>
              <dl className="m-0 text-sm text-foreground font-mono">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-2 mb-1">
                    <dt className="m-0 min-w-[100px]">{f.label}:</dt>
                    <dd className="m-0">{String(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mt-4">
              <h4 className="label-style">Amenities</h4>
              <p className="text-foreground text-sm font-mono">{listing.amenities.join(", ")}</p>
            </div>
          )}
          {listing.violations && listing.violations.length > 0 && (
            <div className="mt-4">
              <h4 className="label-style text-amber">Violations</h4>
              <p className="text-foreground text-sm font-mono">{listing.violations.join(", ")}</p>
            </div>
          )}
        </div>
        <div>
          <div className="bg-muted border border-border p-4">
            <h4 className="label-style mt-0 mb-2">Description</h4>
            <p className="text-foreground text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description."}
            </p>
          </div>
          <div className="mt-4 text-muted-foreground text-xs font-mono">
            <p className="m-1"><strong>Source:</strong> {listing.sourceName}</p>
            <p className="m-1"><strong>ID:</strong> {listing.id}</p>
          </div>
          <div className="bg-muted border border-border p-3 mt-4 text-muted-foreground text-xs font-mono">
            This listing is aggregated from an external source. Africa Property Index does not verify accuracy or facilitate transactions.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LISTINGS GRID (paginated, clickable)
// ============================================

function ListingsGrid({
  listings,
  page,
  setPage,
  onSelectListing,
}: {
  listings: Listing[];
  page: number;
  setPage: (p: number) => void;
  onSelectListing: (l: Listing) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const slice = listings.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <h3 style={{ color: "#e8e8e8" }}>
        Listings ({listings.length})
        {totalPages > 1 && ` – Page ${page} of ${totalPages}`}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {slice.map((l) => (
          <ListingCard key={l.id} listing={l} onClick={() => onSelectListing(l)} />
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ ...inputStyle, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ color: "#888" }}>{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ ...inputStyle, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MARKET DETAIL (filters + grid + detail)
// ============================================

function MarketDetail({
  marketId,
  onBack,
}: {
  marketId: string;
  onBack: () => void;
}) {
  const market = getMarket(marketId);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  if (!market) {
    return (
      <div>
        <p style={{ color: "#e8e8e8" }}>Market not found: {marketId}</p>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  const filtered = applyFilters(market.listings, filters);
  if (selectedListing) {
    return (
      <div>
        <ListingDetail
          listing={selectedListing}
          onBack={() => setSelectedListing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "1px solid #333",
            color: "#888",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Back
        </button>
        <h1 style={{ color: "#e8e8e8", margin: 0 }}>{market.name}</h1>
        <StatusBadge status={market.status} />
      </div>
      <hr style={{ borderColor: "#222" }} />
      <SourceTable sources={market.sources} />
      <hr style={{ borderColor: "#222", margin: "24px 0" }} />
      <FilterBar
        filters={filters}
        setFilters={(f) => { setFilters(f); setPage(1); }}
        listings={market.listings}
        sources={market.sources}
      />
      <ListingsGrid
        listings={filtered}
        page={page}
        setPage={setPage}
        onSelectListing={setSelectedListing}
      />
    </div>
  );
}

// ============================================
// APP (Dashboard | Listings)
// ============================================

type Tab = "dashboard" | "listings" | "sources" | "stats";

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <header className="border-b border-border pb-4 mb-8">
        <h1 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Africa Property Index
        </h1>
        <p className="label-style mt-0">
          Pan-African Real Estate Index — Admin
        </p>
        <nav className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setTab("dashboard")}
            className={
              "border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors " +
              (tab === "dashboard"
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background")
            }
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab("listings")}
            className={
              "border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors " +
              (tab === "listings"
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background")
            }
          >
            Listings
          </button>
          <button
            onClick={() => setTab("sources")}
            className={
              "border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors " +
              (tab === "sources"
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background")
            }
          >
            Sources
          </button>
          <button
            onClick={() => setTab("stats")}
            className={
              "border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors " +
              (tab === "stats"
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background")
            }
          >
            Stats
          </button>
        </nav>
      </header>

      {tab === "dashboard" && <DashboardView />}
      {tab === "listings" && <ListingsTabView />}
      {tab === "sources" && <SourcesView />}
      {tab === "stats" && <StatsView />}
    </div>
  );
}

// ============================================
// AUTH GATE — Protected by default outside local dev unless explicitly disabled
// ============================================

const ADMIN_PROTECTED =
  import.meta.env.VITE_ADMIN_PROTECTED === "true" ||
  (!import.meta.env.DEV && import.meta.env.VITE_ADMIN_PROTECTED !== "false");

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="border border-foreground brutalist-shadow-sm p-8 max-w-sm w-full bg-muted">
        <h1 className="font-sans font-black text-xl uppercase tracking-tight text-foreground mb-2">
          Admin login
        </h1>
        <p className="label-style mb-6">
          Internal dashboard - enter password
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-background border border-foreground text-foreground px-4 py-3 font-mono mb-4"
            autoFocus
          />
          {error && (
            <p className="text-red text-sm font-mono mb-4">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-foreground px-4 py-3 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "login">("loading");

  useEffect(() => {
    if (!ADMIN_PROTECTED) {
      setStatus("ok");
      return;
    }
    fetch("/api/auth", { method: "GET", credentials: "include" })
      .then((r) => {
        setStatus(r.ok ? "ok" : "login");
      })
      .catch(() => setStatus("login"));
  }, []);

  if (!ADMIN_PROTECTED) return <>{children}</>;
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-muted-foreground">
        Checking…
      </div>
    );
  }
  if (status === "login") {
    return <LoginScreen onSuccess={() => setStatus("ok")} />;
  }
  return <>{children}</>;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AuthGate>
      <App />
    </AuthGate>
  );
}
