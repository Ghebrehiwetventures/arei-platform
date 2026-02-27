import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import type { ListingCard } from "arei-sdk";
import type { DemoListing } from "../lib/demo-data";
import "./Listings.css";

const PRICE_BUCKETS = [
  { label: "Any Price", value: "" },
  { label: "Under €100K", value: "under_100k" },
  { label: "€100K – €250K", value: "100k_250k" },
  { label: "€250K – €500K", value: "250k_500k" },
  { label: "€500K+", value: "over_500k" },
];

const ISLANDS = [
  { name: "Sal" },
  { name: "Boa Vista" },
  { name: "Santiago" },
];

const PAGE_SIZE = 12;

function cardToDemoListing(card: ListingCard): DemoListing {
  return {
    id: card.id,
    title: card.title,
    island: card.island,
    city: card.city,
    price: card.price,
    currency: card.currency ?? "",
    image_urls: card.image_url ? [card.image_url] : [],
    bedrooms: card.bedrooms,
    bathrooms: card.bathrooms,
    property_type: card.property_type,
    land_area_sqm: card.land_area_sqm,
    first_seen_at: card.first_seen_at,
    source_id: card.source_id,
    source_url: "",
    last_seen_at: null,
    _bg: "linear-gradient(145deg,#5B8A72,#1A4A32)",
  };
}

export default function Listings() {
  useDocumentMeta("All Properties", "Browse all property listings in Cape Verde. Every island, every listing, one index.");
  const [searchParams] = useSearchParams();
  const initialIsland = searchParams.get("island") || "";
  const [island, setIsland] = useState(initialIsland);
  const [priceBucket, setPriceBucket] = useState("");
  const [page, setPage] = useState(1);
  const [listings, setListings] = useState<DemoListing[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [island, priceBucket]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await arei.getListings({
          page,
          pageSize: PAGE_SIZE,
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
  }, [page, island, priceBucket]);

  const from = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  if (loading) return <div>Loading properties...</div>;

  if (error) {
    return (
      <div className="lh anim-fu delay-1" style={{ padding: "2rem", maxWidth: 560 }}>
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
      <div className="lh anim-fu delay-1">
        <h1>All <em>Properties</em></h1>
        <p>{total} listings across {ISLANDS.length} islands, aggregated from 9 agency sources.</p>
      </div>

      <div className="fb anim-fu delay-2">
        <select className="fs" value={island} onChange={(e) => setIsland(e.target.value)}>
          <option value="">All Islands</option>
          {ISLANDS.map((i) => (
            <option key={i.name} value={i.name}>{i.name}</option>
          ))}
        </select>
        <select className="fs" value={priceBucket} onChange={(e) => setPriceBucket(e.target.value)}>
          {PRICE_BUCKETS.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
        <div className="fsp" />
        <span className="rc">Showing {from}–{to} of {total}</span>
      </div>

      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
        {listings.map((l, i) => (
          <PropertyCard key={l.id} listing={l} index={i} />
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
          <span className="rc">Showing {from}–{to} of {total}</span>
          <div className="pn">
            <button
              type="button"
              className="pnn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="pnn on" style={{ cursor: "default" }}>{page} / {totalPages}</span>
            <button
              type="button"
              className="pnn"
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
