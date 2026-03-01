import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import { arei } from "../lib/arei";
import type { ListingDetail as ListingDetailType, ListingCard } from "arei-sdk";
import type { DemoListing } from "../lib/demo-data";
import { cardToDemoListing } from "../lib/transforms";
import { formatPrice, formatLocation, formatBedrooms, formatBathrooms } from "../lib/format";
import NotFound from "./NotFound";
import MortgageCalculator from "../components/MortgageCalculator";
import MarketContext from "../components/MarketContext";
import "./Detail.css";

const PLACEHOLDER_BG = "linear-gradient(145deg,#5B8A72,#1A4A32)";
const LAND_TYPES = /land|plot|terrain|lote/i;

/** Convert ALL CAPS titles to Title Case */
function toTitleCase(str: string): string {
  if (str !== str.toUpperCase()) return str;
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (c) => c.toUpperCase());
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<DemoListing | null>(null);
  const [detailRaw, setDetailRaw] = useState<ListingDetailType | null>(null);
  const [similar, setSimilar] = useState<DemoListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
          property_size_sqm: detail.property_size_sqm,
          description: detail.description ?? null,
          first_seen_at: detail.first_seen_at,
          source_id: detail.source_id,
          source_url: detail.source_url,
          last_seen_at: detail.last_seen_at,
          is_new: detail.is_new,
          _bg: PLACEHOLDER_BG,
        };
        setListing(demo);
        setDetailRaw(detail);
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

  /* Keyboard navigation for gallery — must be before any early returns */
  const images = listing?.image_urls ?? [];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setGalleryIndex(0);
  }, [listing?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxOpen) { setLightboxOpen(false); return; }
      if (!hasMultipleImages) return;
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultipleImages, images.length, lightboxOpen]);

  /* Lock body scroll when lightbox is open */
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [lightboxOpen]);

  /* Fetch similar listings when detail is ready */
  useEffect(() => {
    if (!detailRaw) { setSimilar([]); return; }
    let cancelled = false;
    arei
      .getSimilarListings({ listing: detailRaw, limit: 4 })
      .then((cards: ListingCard[]) => {
        if (!cancelled) setSimilar(cards.map(cardToDemoListing));
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => { cancelled = true; };
  }, [detailRaw]);

  /* Similar properties carousel scroll — hooks must be before early returns */
  const simRef = useRef<HTMLDivElement>(null);
  const [simCanPrev, setSimCanPrev] = useState(false);
  const [simCanNext, setSimCanNext] = useState(false);

  const updateSimArrows = useCallback(() => {
    const el = simRef.current;
    if (!el) return;
    setSimCanPrev(el.scrollLeft > 4);
    setSimCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = simRef.current;
    if (!el) return;
    updateSimArrows();
    el.addEventListener("scroll", updateSimArrows, { passive: true });
    window.addEventListener("resize", updateSimArrows);
    return () => {
      el.removeEventListener("scroll", updateSimArrows);
      window.removeEventListener("resize", updateSimArrows);
    };
  }, [similar, updateSimArrows]);

  const scrollSim = (dir: -1 | 1) => {
    const el = simRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  /* Touch swipe ref — must be before early returns */
  const touchStartX = useRef(0);

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
      <NotFound
        title="Property not found"
        message="This listing may have been removed or the link is no longer valid. Browse our latest properties to find something similar."
      />
    );
  }

  const displayTitle = toTitleCase(listing.title);

  const specs: { value: string; label: string }[] = [];
  if (listing.property_type) specs.push({ value: listing.property_type, label: "Type" });
  const bed = formatBedrooms(listing.bedrooms);
  if (bed) specs.push({ value: listing.bedrooms === 0 ? "Studio" : String(listing.bedrooms), label: bed === "Studio" ? "Type" : "Bedrooms" });
  if (listing.bathrooms && listing.bathrooms > 0) specs.push({ value: String(listing.bathrooms), label: "Bathrooms" });
  if (listing.land_area_sqm) {
    specs.push({ value: `${listing.land_area_sqm.toLocaleString()}`, label: "m² Land" });
  }

  const mainImageStyle: React.CSSProperties =
    images.length > 0
      ? { backgroundImage: `url(${images[galleryIndex]})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: listing._bg };

  const goPrev = () => setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  /* Touch swipe handlers for gallery + lightbox */
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) goPrev();
    else if (delta < -50) goNext();
  };

  return (
    <>
      <a className="db" onClick={() => navigate("/listings")}>
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to listings
      </a>

      <div className="dhi anim-fu delay-1" onClick={() => images.length > 0 && setLightboxOpen(true)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="ph" style={mainImageStyle} />
        {listing.is_new && <span className="dhi-badge dhi-new">NEW</span>}
        {listing.property_type && <span className="dhi-badge dhi-type">{listing.property_type.toUpperCase()}</span>}
        {listing.price && (
          <span className="dhi-badge dhi-price">{formatPrice(listing.price, listing.currency)}</span>
        )}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="dg-arrow dg-arrow-prev"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              className="dg-arrow dg-arrow-next"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label="Next image"
            >
              <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="dg-counter">{galleryIndex + 1} / {images.length}</div>
            {images.length <= 8 && (
              <div className="dg-thumbs">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`dg-thumb${i === galleryIndex ? " on" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                    style={{ backgroundImage: `url(${url})` }}
                    aria-label={`View image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="dg anim-fu delay-2">
        <div>
          <h1 className="dt">{displayTitle}</h1>
          <div className="dl">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {formatLocation(listing.city, listing.island)}, Cape Verde
          </div>

          {/* Mobile-only: price + CTA visible early */}
          {listing.price && (
            <div className="dm-price-bar">
              <div>
                <div className="dm-price">{formatPrice(listing.price, listing.currency)}</div>
                {listing.currency === "EUR" && (
                  <div className="dm-price-cve">
                    Approx. {(listing.price * 110.265).toLocaleString("en-US", { maximumFractionDigits: 0 })} CVE
                  </div>
                )}
              </div>
              {listing.source_url && (
                <a className="dm-cta" href={listing.source_url} target="_blank" rel="noopener noreferrer">
                  VIEW ON SOURCE
                </a>
              )}
            </div>
          )}

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
            {listing.description ? (
              <p>{listing.description}</p>
            ) : (
              <p>
                This property is located in {formatLocation(listing.city, listing.island)}, Cape Verde.
                {listing.property_type ? ` Listed as ${listing.property_type.toLowerCase()}.` : ""}
                {listing.land_area_sqm ? ` Land area: ${listing.land_area_sqm.toLocaleString()} m².` : ""}
              </p>
            )}
            <p className="dd-source">
              Sourced from <strong>{listing.source_id}</strong>. Information is extracted from
              the public listing and may not reflect the current state.
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
            {listing.source_url && (
              <a className="boc" href={listing.source_url} target="_blank" rel="noopener noreferrer">
                CONTACT AGENT
              </a>
            )}
          </div>
        </aside>
      </div>

      {listing.price &&
        !LAND_TYPES.test(listing.property_type ?? "") &&
        !LAND_TYPES.test(listing.title ?? "") && (
        <MortgageCalculator price={listing.price} />
      )}

      <MarketContext island={listing.island} price={listing.price} />

      {similar.length > 0 && (
        <section className="dsim">
          <div className="dsim-header">
            <h2 className="dsim-h">Similar <em>Properties</em></h2>
            <div className="dsim-nav">
              <button
                type="button"
                className={`dsim-arrow${simCanPrev ? "" : " dsim-arrow-off"}`}
                onClick={() => scrollSim(-1)}
                aria-label="Scroll left"
              >
                <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button
                type="button"
                className={`dsim-arrow${simCanNext ? "" : " dsim-arrow-off"}`}
                onClick={() => scrollSim(1)}
                aria-label="Scroll right"
              >
                <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
          <div className="dsim-grid" ref={simRef}>
            {similar.map((s) => (
              <PropertyCard key={s.id} listing={s} />
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && images.length > 0 && createPortal(
        <div className="lb-overlay" onClick={() => setLightboxOpen(false)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button className="lb-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
            <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
          {hasMultipleImages && (
            <>
              <button className="lb-arrow lb-prev" onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous image">
                <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button className="lb-arrow lb-next" onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next image">
                <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </>
          )}
          <img
            className="lb-img"
            src={images[galleryIndex]}
            alt={`Photo ${galleryIndex + 1} of ${images.length}`}
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && images.length <= 12 && (
            <div className="lb-thumbstrip" onClick={(e) => e.stopPropagation()}>
              {images.map((url, i) => (
                <button
                  key={i}
                  className={`lb-th${i === galleryIndex ? " on" : ""}`}
                  onClick={() => setGalleryIndex(i)}
                  style={{ backgroundImage: `url(${url})` }}
                  aria-label={`View image ${i + 1}`}
                />
              ))}
            </div>
          )}
          <div className="lb-counter">{galleryIndex + 1} / {images.length}</div>
        </div>,
        document.body
      )}
    </>
  );
}
