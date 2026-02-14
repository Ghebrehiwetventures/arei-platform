import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  getMarkets,
  getMarket,
  getDashboardStats,
  getListings,
  getListingById,
  getMarketIds,
  type ListingsFilters,
} from "./data";
import { Market, Source, Listing, SourceStatus, DashboardStats, SourceQualityRow } from "./types";

// ============================================
// IMAGE GALLERY — arrows on hover, dot navigation
// ============================================

function ImageGallery({
  images,
  width,
  height,
}: {
  images: string[];
  width: number;
  height: number;
}) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  if (images.length === 0) {
    return (
      <div
        style={{
          width,
          height,
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
        width,
        height,
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={images[idx]}
        alt=""
        style={{ width, height, objectFit: "cover", display: "block" }}
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
  const colors: Record<string, string> = {
    OK: "#22c55e",
    PARTIAL_OK: "#eab308",
    BROKEN_SOURCE: "#ef4444",
    UNSCRAPABLE: "#ef4444",
    PAUSED_BY_SYSTEM: "#f97316",
  };
  return (
    <span
      style={{
        background: colors[status] || "#888",
        color: "#fff",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

// ============================================
// PRICE FORMATTER
// ============================================

function formatPrice(price?: number, currency?: string): string {
  if (price === undefined) return "No price";
  const c = currency || "EUR";
  const formatted = price.toLocaleString();
  if (c === "EUR") return formatted + " EUR";
  return c + " " + formatted;
}

// ============================================
// GRADE BADGE (A/B/C/D)
// ============================================

function GradeBadge({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const colors: Record<string, string> = {
    A: "#22c55e",
    B: "#84cc16",
    C: "#eab308",
    D: "#ef4444",
  };
  return (
    <span
      style={{
        background: colors[grade] || "#666",
        color: "#fff",
        padding: "2px 10px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {grade}
    </span>
  );
}

// ============================================
// DASHBOARD VIEW (KPIs + source quality table)
// ============================================

function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div style={{ padding: 24, color: "#888" }}>
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 24, color: "#e8e8e8" }}>
        Failed to load dashboard. Ensure Supabase RPC <code>get_source_quality_stats</code> exists (see docs/supabase_rpc.sql).
      </div>
    );
  }

  const worst = stats.sourceRows.filter((r) => r.grade === "D" || r.grade === "C").slice(0, 5);
  const best = stats.sourceRows.filter((r) => r.grade === "A" || r.grade === "B").slice(-5).reverse();

  return (
    <div>
      <h2 style={{ color: "#e8e8e8", marginBottom: 16 }}>Dashboard</h2>
      <p style={{ color: "#555", fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Source quality and where we are winning or failing.
      </p>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8 }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Total listings</div>
          <div style={{ color: "#e8e8e8", fontSize: 24, fontWeight: 700 }}>
            {stats.totalListings.toLocaleString()}
          </div>
        </div>
        <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8 }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Approved (visible)</div>
          <div style={{ color: "#22c55e", fontSize: 24, fontWeight: 700 }}>
            {stats.approvedCount.toLocaleString()}
          </div>
        </div>
        <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8 }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Sources</div>
          <div style={{ color: "#e8e8e8", fontSize: 24, fontWeight: 700 }}>{stats.sourceCount}</div>
        </div>
        <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8 }}>
          <div style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>Markets</div>
          <div style={{ color: "#e8e8e8", fontSize: 24, fontWeight: 700 }}>{stats.marketCount}</div>
        </div>
      </div>

      {/* Need attention / Performing well */}
      {(worst.length > 0 || best.length > 0) && (
        <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
          {worst.length > 0 && (
            <div style={{ background: "#2a1a1a", padding: 12, borderRadius: 8, flex: "1 1 200px" }}>
              <div style={{ color: "#eab308", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Need attention
              </div>
              <div style={{ color: "#bbb", fontSize: 13 }}>
                {worst.map((r) => r.sourceName).join(", ")}
              </div>
            </div>
          )}
          {best.length > 0 && (
            <div style={{ background: "#1a2a1a", padding: 12, borderRadius: 8, flex: "1 1 200px" }}>
              <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Performing well
              </div>
              <div style={{ color: "#bbb", fontSize: 13 }}>
                {best.map((r) => r.sourceName).join(", ")}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source quality table */}
      <h3 style={{ color: "#e8e8e8", marginBottom: 12 }}>Source quality</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333" }}>
              {["Source", "Market", "Listings", "Approved %", "With image %", "With price %", "Grade"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      color: "#888",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {stats.sourceRows.map((r: SourceQualityRow) => (
              <tr key={r.source_id} style={{ borderBottom: "1px solid #1a1a2e" }}>
                <td style={{ padding: "10px 12px", color: "#e8e8e8", fontWeight: 500 }}>
                  {r.sourceName}
                </td>
                <td style={{ padding: "10px 12px", color: "#aaa" }}>{r.marketId}</td>
                <td style={{ padding: "10px 12px", color: "#bbb" }}>
                  {Number(r.listing_count).toLocaleString()}
                </td>
                <td style={{ padding: "10px 12px", color: "#bbb" }}>{r.approved_pct}%</td>
                <td style={{ padding: "10px 12px", color: "#bbb" }}>{r.with_image_pct}%</td>
                <td style={{ padding: "10px 12px", color: "#bbb" }}>{r.with_price_pct}%</td>
                <td style={{ padding: "10px 12px" }}>
                  <GradeBadge grade={r.grade} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stats.sourceRows.length === 0 && (
        <p style={{ color: "#666" }}>
          No source data. Run the SQL in <code>docs/supabase_rpc.sql</code> in Supabase to create the RPC.
        </p>
      )}
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

function ListingsTabView() {
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [marketId, setMarketId] = useState("");
  const [sourceOptions, setSourceOptions] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<ListingsFilters>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: Listing[]; totalCount: number }>({ data: [], totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getMarketIds().then(setMarkets);
  }, []);

  useEffect(() => {
    if (!marketId) {
      setSourceOptions([]);
      return;
    }
    getDashboardStats().then((s) => {
      const opts = s.sourceRows
        .filter((r) => r.marketId === marketId)
        .map((r) => ({ id: r.source_id, name: r.sourceName }));
      setSourceOptions(opts);
    });
  }, [marketId]);

  useEffect(() => {
    if (!marketId) {
      setResult({ data: [], totalCount: 0 });
      return;
    }
    setLoading(true);
    getListings(marketId, page, LISTINGS_PAGE_SIZE, filters)
      .then((r) => {
        setResult(r);
        setLoading(false);
      })
      .catch(() => {
        setResult({ data: [], totalCount: 0 });
        setLoading(false);
      });
  }, [marketId, page, filters]);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / LISTINGS_PAGE_SIZE));

  if (detailListing) {
    return (
      <div>
        <ListingDetail listing={detailListing} onBack={() => setDetailListing(null)} />
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: "#e8e8e8", marginBottom: 16 }}>Listings</h2>
      <p style={{ color: "#555", fontSize: 13, marginTop: -8, marginBottom: 20 }}>
        Browse by market. Server-side pagination.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label style={{ color: "#888", fontSize: 13 }}>
          Market
          <select
            value={marketId}
            onChange={(e) => {
              setMarketId(e.target.value);
              setPage(1);
            }}
            style={{ ...inputStyle, marginLeft: 8, minWidth: 160 }}
          >
            <option value="">Select market</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>
        </label>
        <label style={{ color: "#888", fontSize: 13 }}>
          Price min
          <input
            type="number"
            value={filters.priceMin ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : undefined }));
              setPage(1);
            }}
            style={{ ...inputStyle, marginLeft: 8, width: 100 }}
          />
        </label>
        <label style={{ color: "#888", fontSize: 13 }}>
          Price max
          <input
            type="number"
            value={filters.priceMax ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }));
              setPage(1);
            }}
            style={{ ...inputStyle, marginLeft: 8, width: 100 }}
          />
        </label>
        <label style={{ color: "#888", fontSize: 13 }}>
          Island
          <input
            type="text"
            value={filters.island ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, island: e.target.value || undefined }));
              setPage(1);
            }}
            placeholder="e.g. Sal"
            style={{ ...inputStyle, marginLeft: 8, width: 100 }}
          />
        </label>
        <label style={{ color: "#888", fontSize: 13 }}>
          Source
          <select
            value={filters.sourceId ?? ""}
            onChange={(e) => {
              setFilters((f) => ({ ...f, sourceId: e.target.value || undefined }));
              setPage(1);
            }}
            style={{ ...inputStyle, marginLeft: 8, minWidth: 140 }}
          >
            <option value="">All</option>
            {sourceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            setFilters({});
            setPage(1);
          }}
          style={{
            background: "#333",
            color: "#ccc",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Clear filters
        </button>
      </div>

      {!marketId && (
        <p style={{ color: "#666" }}>Select a market to load listings.</p>
      )}

      {marketId && loading && <p style={{ color: "#888" }}>Loading…</p>}

      {marketId && !loading && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  {["", "Title", "Price", "Island", "City", "Beds", "Baths", "Area", "Source", ""].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          color: "#888",
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {result.data.map((l) => (
                  <tr
                    key={l.id}
                    style={{
                      borderBottom: "1px solid #1a1a2e",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setDetailLoading(true);
                      getListingById(l.id).then((full) => {
                        setDetailLoading(false);
                        if (full) setDetailListing(full);
                      });
                    }}
                  >
                    <td style={{ padding: "8px 10px", width: 60 }}>
                      {l.images.length > 0 ? (
                        <img
                          src={l.images[0]}
                          alt=""
                          style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span style={{ color: "#555", fontSize: 11 }}>No img</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#e8e8e8", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.title || "[No title]"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#7ec8e3" }}>
                      {formatPrice(l.price, l.currency)}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#bbb" }}>{l.island ?? "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#bbb" }}>{l.city ?? "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#bbb" }}>{l.bedrooms ?? "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#bbb" }}>{l.bathrooms ?? "—"}</td>
                    <td style={{ padding: "8px 10px", color: "#bbb" }}>
                      {l.area_sqm != null ? Math.round(l.area_sqm) + " m²" : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#aaa", fontSize: 12 }}>{l.sourceName}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setDetailLoading(true);
                          getListingById(l.id).then((full) => {
                            setDetailLoading(false);
                            if (full) setDetailListing(full);
                          });
                        }}
                        style={{
                          background: "#0f3460",
                          color: "#7ec8e3",
                          border: "none",
                          padding: "4px 10px",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 11,
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ ...inputStyle, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              Previous
            </button>
            <span style={{ color: "#888" }}>
              Page {page} of {totalPages} · {result.totalCount.toLocaleString()} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ ...inputStyle, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </>
      )}

      {detailLoading && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          Loading listing…
        </div>
      )}
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
                {s.state.lastError || "-"}
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
}: {
  listing: Listing;
  onBack: () => void;
}) {
  const facts: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: "Type", value: listing.property_type },
    { label: "Bedrooms", value: listing.bedrooms },
    { label: "Bathrooms", value: listing.bathrooms },
    { label: "Area (m²)", value: listing.area_sqm != null ? Math.round(listing.area_sqm) : null },
    { label: "Land (m²)", value: listing.land_area_sqm != null ? Math.round(listing.land_area_sqm) : null },
    { label: "Island", value: listing.island },
    { label: "City", value: listing.city },
    { label: "Status", value: listing.status },
    { label: "Approved", value: listing.approved != null ? (listing.approved ? "Yes" : "No") : null },
    { label: "Price period", value: listing.price_period },
  ].filter((x) => x.value != null && x.value !== "");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
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
          ← Back to listings
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#7ec8e3", fontSize: 22, fontWeight: 700 }}>
            {formatPrice(listing.price, listing.currency)}
          </span>
          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#0f3460",
                color: "#7ec8e3",
                padding: "8px 16px",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              View original listing ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 1200 }}>
        <div>
          <ImageGallery images={listing.images} width={560} height={360} />
          <h2 style={{ color: "#e8e8e8", marginTop: 16 }}>{listing.title || "[No title]"}</h2>
          {listing.location && (
            <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
              📍 {listing.location}
            </p>
          )}
          {facts.length > 0 && (
            <div style={{ background: "#1a1a2e", padding: 14, borderRadius: 8, marginTop: 16 }}>
              <h4 style={{ color: "#ccc", marginTop: 0 }}>Key facts</h4>
              <dl style={{ margin: 0, color: "#bbb", fontSize: 13 }}>
                {facts.map((f) => (
                  <div key={f.label} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <dt style={{ margin: 0, minWidth: 100 }}>{f.label}:</dt>
                    <dd style={{ margin: 0 }}>{String(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ color: "#ccc" }}>Amenities</h4>
              <p style={{ color: "#bbb", fontSize: 13 }}>{listing.amenities.join(", ")}</p>
            </div>
          )}
          {listing.violations && listing.violations.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ color: "#eab308" }}>Violations</h4>
              <p style={{ color: "#bbb", fontSize: 13 }}>{listing.violations.join(", ")}</p>
            </div>
          )}
        </div>
        <div>
          <div style={{ background: "#1a1a2e", padding: 14, borderRadius: 8 }}>
            <h4 style={{ color: "#ccc", marginTop: 0 }}>Description</h4>
            <p style={{ color: "#bbb", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {listing.description || "No description."}
            </p>
          </div>
          <div style={{ marginTop: 16, color: "#666", fontSize: 12 }}>
            <p style={{ margin: "4px 0" }}><strong>Source:</strong> {listing.sourceName}</p>
            <p style={{ margin: "4px 0" }}><strong>ID:</strong> {listing.id}</p>
          </div>
          <div style={{ background: "#111", padding: 12, borderRadius: 6, marginTop: 16, color: "#666", fontSize: 12 }}>
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

type Tab = "dashboard" | "listings";

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div>
      <header style={{ borderBottom: "1px solid #222", paddingBottom: 12, marginBottom: 20 }}>
        <h1 style={{ color: "#e8e8e8", marginBottom: 4 }}>AFRICA PROPERTY INDEX</h1>
        <p style={{ color: "#555", fontSize: 13, marginTop: 0 }}>
          Pan-African Real Estate Index · Admin
        </p>
        <nav style={{ display: "flex", gap: 16, marginTop: 12 }}>
          <button
            onClick={() => setTab("dashboard")}
            style={{
              background: tab === "dashboard" ? "#0f3460" : "transparent",
              color: tab === "dashboard" ? "#7ec8e3" : "#888",
              border: "1px solid #333",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === "dashboard" ? 600 : 400,
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab("listings")}
            style={{
              background: tab === "listings" ? "#0f3460" : "transparent",
              color: tab === "listings" ? "#7ec8e3" : "#888",
              border: "1px solid #333",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: tab === "listings" ? 600 : 400,
            }}
          >
            Listings
          </button>
        </nav>
      </header>

      {tab === "dashboard" && <DashboardView />}
      {tab === "listings" && <ListingsTabView />}
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
