import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { getMarkets, getMarket } from "./data";
import { Market, Source, Listing, SourceStatus } from "./types";

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
// LISTING CARD
// ============================================

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div
      style={{
        background: "#16213e",
        borderRadius: 12,
        overflow: "hidden",
        width: 280,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        transition: "transform 0.15s, box-shadow 0.15s",
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
// MARKET OVERVIEW
// ============================================

function MarketOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const markets = getMarkets();
  return (
    <div>
      <h1 style={{ color: "#e8e8e8", marginBottom: 4 }}>Morabesa</h1>
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
// LISTINGS GRID
// ============================================

function ListingsGrid({ listings }: { listings: Listing[] }) {
  return (
    <div>
      <h3 style={{ color: "#e8e8e8" }}>Listings ({listings.length})</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MARKET DETAIL
// ============================================

function MarketDetail({
  marketId,
  onBack,
}: {
  marketId: string;
  onBack: () => void;
}) {
  const market = getMarket(marketId);
  if (!market) {
    return (
      <div>
        <p style={{ color: "#e8e8e8" }}>Market not found: {marketId}</p>
        <button onClick={onBack}>Back</button>
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
      <ListingsGrid listings={market.listings} />
    </div>
  );
}

// ============================================
// APP
// ============================================

function App() {
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  if (selectedMarket) {
    return (
      <MarketDetail
        marketId={selectedMarket}
        onBack={() => setSelectedMarket(null)}
      />
    );
  }

  return <MarketOverview onSelect={setSelectedMarket} />;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
