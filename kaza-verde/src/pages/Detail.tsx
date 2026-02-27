import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import type { DemoListing } from "../lib/demo-data";
import { formatPrice, formatLocation, formatBedrooms, formatBathrooms } from "../lib/format";
import "./Detail.css";

const PLACEHOLDER_BG = "linear-gradient(145deg,#5B8A72,#1A4A32)";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<DemoListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentMeta(
    listing?.title ?? (error ? "Property not found" : "Property"),
    listing ? `Property in ${listing.island}${listing.city ? `, ${listing.city}` : ""}. Cape Verde real estate.` : "Property listing in Cape Verde",
    listing?.image_urls?.[0] ? { image: listing.image_urls[0] } : undefined
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    arei
      .getListing(id)
      .then((detail) => {
        if (cancelled) return;
        if (!detail) {
          setError("Property not found.");
          setListing(null);
          return;
        }
        const demo: DemoListing = {
          id: detail.id,
          title: detail.title,
          island: detail.island,
          city: detail.city,
          price: detail.price,
          currency: detail.currency ?? "",
          image_urls: detail.image_urls ?? [],
          bedrooms: detail.bedrooms,
          bathrooms: detail.bathrooms,
          property_type: detail.property_type,
          land_area_sqm: detail.land_area_sqm,
          first_seen_at: detail.first_seen_at,
          source_id: detail.source_id,
          source_url: detail.source_url,
          last_seen_at: detail.last_seen_at,
          _bg: PLACEHOLDER_BG,
        };
        setListing(demo);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load property.");
          setListing(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <>
        <a className="db" onClick={() => navigate("/listings")}>
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to listings
        </a>
        <div style={{ padding: "3rem", textAlign: "center" }}>Loading property…</div>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <a className="db" onClick={() => navigate("/listings")}>
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to listings
        </a>
        <div style={{ padding: "2rem", maxWidth: 560 }}>
          <h1>Property not found</h1>
          <p style={{ color: "#991b1b", marginTop: 8 }}>{error}</p>
        </div>
      </>
    );
  }

  const specs: { value: string; label: string }[] = [];
  const bed = formatBedrooms(listing.bedrooms);
  if (bed) specs.push({ value: listing.bedrooms === 0 ? "Studio" : String(listing.bedrooms), label: bed === "Studio" ? "Type" : "Bedrooms" });
  if (listing.bathrooms && listing.bathrooms > 0) specs.push({ value: String(listing.bathrooms), label: "Bathrooms" });
  if (listing.property_type === "Land" && listing.land_area_sqm) {
    specs.push({ value: String(listing.land_area_sqm), label: "m² Land" });
  }

  const heroStyle: React.CSSProperties = listing.image_urls.length > 0
    ? { backgroundImage: `url(${listing.image_urls[0]})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: listing._bg };

  return (
    <>
      <a className="db" onClick={() => navigate("/listings")}>
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to listings
      </a>

      <div className="dhi anim-fu delay-1">
        <div className="ph" style={heroStyle} />
        <div className="pb">{formatPrice(listing.price, listing.currency)}</div>
      </div>

      <div className="dg anim-fu delay-2">
        <div>
          <h1 className="dt">{listing.title}</h1>
          <div className="dl">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {formatLocation(listing.city, listing.island)}, Cape Verde
          </div>

          {specs.length > 0 && (
            <div className="dsg">
              {specs.map((s) => (
                <div className="sb" key={s.label}>
                  <div className="v">{s.value}</div>
                  <div className="l">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="dd">
            <h3>About this property</h3>
            <p>
              This listing is sourced from <strong>{listing.source_id}</strong> and links
              directly to the original page. All information shown is extracted from the
              public listing and may not reflect the current state of the property.
            </p>
            {listing.last_seen_at && (
              <p className="last-checked">
                Last checked: {new Date(listing.last_seen_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <aside className="ds">
          <div className="cc">
            <h4>Interested in this property?</h4>
            <div className="src">Listed by {listing.source_id}</div>
            <div className="dp">{formatPrice(listing.price, listing.currency)}</div>
            {listing.price && listing.currency === "EUR" && (
              <div className="dpn">
                Approx. {(listing.price * 110.265).toLocaleString("en-US", { maximumFractionDigits: 0 })} CVE
              </div>
            )}
            {listing.source_url && (
              <a className="bp" style={{ width: "100%", textAlign: "center", padding: 14, borderRadius: 10, fontSize: "0.82rem", marginBottom: 10, display: "block" }} href={listing.source_url} target="_blank" rel="noopener noreferrer">
                VIEW ON SOURCE
              </a>
            )}
            <button className="boc">CONTACT AGENT</button>
          </div>
        </aside>
      </div>
    </>
  );
}
