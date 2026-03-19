import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import type { DemoListing } from "../lib/demo-data";
import { cardToDemoListing } from "../lib/transforms";
import "./Listings.css";

const PRICE_BUCKETS = [
  { label: "Any Price", value: "" },
  { label: "Under €100K", value: "under_100k" },
  { label: "€100K – €250K", value: "100k_250k" },
  { label: "€250K – €500K", value: "250k_500k" },
  { label: "€500K+", value: "over_500k" },
];

const PAGE_SIZES = [24, 48, 96];
const DEFAULT_PAGE_SIZE = 24;

type ViewMode = "grid" | "list";

export default function Listings() {
  useDocumentMeta("All Properties", "Browse KazaVerde's read-only index of Cape Verde property listings by island and price range.");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIsland = searchParams.get("island") || "";
  const initialPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const [island, setIsland] = useState(initialIsland);
  const [priceBucket, setPriceBucket] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [listings, setListings] = useState<DemoListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [islands, setIslands] = useState<{ island: string; count: number }[]>([]);

  useEffect(() => {
    arei.getIslandOptions().then(setIslands).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [island, priceBucket, pageSize]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (page === 1) next.delete("page");
    else next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [page]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await arei.getListings({
          page,
          pageSize,
          island: island || undefined,
          priceBucket: priceBucket ? (priceBucket as "under_100k" | "100k_250k" | "250k_500k" | "over_500k") : undefined,
        });
        setListings(result.data.map(cardToDemoListing));
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (e) {
        setListings([]);
        setTotal(0);
        setTotalPages(0);
        setError(e instanceof Error ? e.message : "Kunde inte ladda listor.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, pageSize, island, priceBucket]);

  const from = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);

  if (loading) return <div>Loading properties...</div>;

  if (error) {
    return (
      <div className="lh" style={{ padding: "2rem", maxWidth: 560 }}>
        <h1>All <em>Properties</em></h1>
        <div style={{ marginTop: 16, padding: 16, background: "#fef2f2", borderRadius: 8, color: "#991b1b" }}>
          <strong>Kunde inte ladda listor</strong>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13, opacity: 0.9 }}>
            Kontrollera att <code>.env</code> innehåller VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY, och att Supabase-projektet är tillgängligt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lh">
        <h1>All <em>Properties</em></h1>
        <p>{total} source-linked listings across {islands.length || "multiple"} islands in KazaVerde's read-only index.</p>
      </div>

      <div className="fb">
        <select className="fs" value={island} onChange={(e) => setIsland(e.target.value)}>
          <option value="">All Islands</option>
          {islands.map((i) => (
            <option key={i.island} value={i.island}>{i.island} ({i.count})</option>
          ))}
        </select>
        <select className="fs" value={priceBucket} onChange={(e) => setPriceBucket(e.target.value)}>
          {PRICE_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <div className="fsp" />
        <div className="view-toggle">
          <button
            type="button"
            className={viewMode === "grid" ? "on" : ""}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            title="Grid view"
          >
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "on" : ""}
            onClick={() => setViewMode("list")}
            aria-label="List view"
            title="List view"
          >
            <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <select className="fs fs-sm hide-mobile" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>Show {s}</option>
          ))}
        </select>
        <span className="rc hide-mobile">Showing {from}–{to} of {total}</span>
      </div>

      <div className={viewMode === "list" ? "list-view" : "grid-3"} style={viewMode === "grid" ? { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 } : undefined}>
        {listings.map((l) => (
          <PropertyCard key={l.id} listing={l} viewMode={viewMode} />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="empty-state">
          <h3>No properties match your filters</h3>
          <p>Try adjusting your search criteria.</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="pg">
          <div className="pn">
            <button
              type="button"
              className="pnn bo"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="pnn on" style={{ cursor: "default" }}>{page} / {totalPages}</span>
            <button
              type="button"
              className="pnn bp"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        </div>
      )}

      <NewsletterCta />
    </>
  );
}
