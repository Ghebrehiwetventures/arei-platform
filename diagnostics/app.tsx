import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { getMarkets, getMarket } from "./data";
import { Market, Source, Listing, SourceStatus } from "./types";

function StatusBadge({ status }: { status: SourceStatus }) {
  return <span>[{status}]</span>;
}

function MissingFieldWarning({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return <span style={{ color: "red" }}> ⚠ MISSING: {fields.join(", ")}</span>;
}

function MarketOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const markets = getMarkets();
  return (
    <div>
      <h1>Diagnostic UI - Market Overview</h1>
      <p style={{ color: "gray" }}>READ-ONLY | INTERNAL USE ONLY | NOT PRODUCT UI</p>
      <hr />
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Market</th>
            <th>Status</th>
            <th>Sources</th>
            <th>Listings</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td><StatusBadge status={m.status} /></td>
              <td>{m.sources.length}</td>
              <td>{m.listings.length}</td>
              <td>
                <button onClick={() => onSelect(m.id)}>View Details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourceTable({ sources }: { sources: Source[] }) {
  return (
    <div>
      <h3>Sources</h3>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Status</th>
            <th>Scrape Attempts</th>
            <th>Repair Attempts</th>
            <th>Last Error</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td><StatusBadge status={s.state.status} /></td>
              <td>{s.state.scrapeAttempts}</td>
              <td>{s.state.repairAttempts}</td>
              <td style={{ color: s.state.lastError ? "red" : "inherit" }}>
                {s.state.lastError || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const missing: string[] = [];
  if (!listing.title) missing.push("title");
  if (listing.price === undefined) missing.push("price");
  if (!listing.imageUrl) missing.push("image");

  return (
    <div style={{ border: "1px solid #ccc", padding: 8, margin: 8, width: 200 }}>
      {listing.imageUrl ? (
        <img src={listing.imageUrl} alt="" style={{ width: 150, height: 100, objectFit: "cover" }} />
      ) : (
        <div style={{ width: 150, height: 100, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center" }}>
          NO IMAGE
        </div>
      )}
      <div><strong>{listing.title || "[NO TITLE]"}</strong></div>
      <div>Price: {listing.price !== undefined ? listing.price : "[NO PRICE]"}</div>
      <div style={{ fontSize: 12, color: "#666" }}>
        {listing.description ? listing.description.slice(0, 50) : "[NO DESCRIPTION]"}
      </div>
      <div style={{ fontSize: 11 }}>Source: {listing.sourceName}</div>
      <MissingFieldWarning fields={missing} />
    </div>
  );
}

function ListingsGrid({ listings }: { listings: Listing[] }) {
  return (
    <div>
      <h3>Raw Listings ({listings.length})</h3>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}

function MarketDetail({ marketId, onBack }: { marketId: string; onBack: () => void }) {
  const market = getMarket(marketId);
  if (!market) {
    return (
      <div>
        <p>Market not found: {marketId}</p>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Market: {market.name}</h1>
      <p style={{ color: "gray" }}>READ-ONLY | INTERNAL USE ONLY | NOT PRODUCT UI</p>
      <p>Status: <StatusBadge status={market.status} /></p>
      <button onClick={onBack}>Back to Overview</button>
      <hr />
      <SourceTable sources={market.sources} />
      <hr />
      <ListingsGrid listings={market.listings} />
    </div>
  );
}

function App() {
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  if (selectedMarket) {
    return <MarketDetail marketId={selectedMarket} onBack={() => setSelectedMarket(null)} />;
  }

  return <MarketOverview onSelect={setSelectedMarket} />;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
