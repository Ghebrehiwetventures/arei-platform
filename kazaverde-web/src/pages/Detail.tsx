import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import type { ListingDetail as ListingDetailType } from "arei-sdk";
import { formatPrice, formatLocation, formatSourceLabel } from "../lib/format";
import { looksItalian, stripHtml, translateItalianToEnglish } from "../lib/translation";
import NotFound from "./NotFound";
import "./Detail.css";

/** Collapse WP size variants (-1024x768.jpg) into one image per base filename, keeping the largest. */
function dedupeWpImages(urls: string[]): string[] {
  const unique = [...new Set(urls)];
  const groups = new Map<string, { url: string; area: number; order: number }>();
  for (let i = 0; i < unique.length; i++) {
    const url = unique[i];
    const base = url.replace(/-\d{2,5}x\d{2,5}(\.\w+)$/, "$1");
    const m = url.match(/-(\d{2,5})x(\d{2,5})\.\w+$/);
    const area = m ? Number(m[1]) * Number(m[2]) : Infinity;
    const existing = groups.get(base);
    if (!existing) {
      groups.set(base, { url, area, order: i });
    } else if (area > existing.area) {
      groups.set(base, { url, area, order: existing.order });
    }
  }
  return Array.from(groups.values())
    .sort((a, b) => a.order - b.order)
    .map((g) => g.url);
}

function toTitleCase(str: string): string {
  if (str !== str.toUpperCase()) return str;
  return str.toLowerCase().replace(/(?:^|\s|[-/])\S/g, (c) => c.toUpperCase());
}

/** Capitalize first letter, rest lowercase. Use for short enums like "apartment" -> "Apartment". */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ListingDetailType | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);

  const displayTitle = detail ? toTitleCase(detail.title) : "Property";

  useDocumentMeta(
    detail ? displayTitle : error ? "Property not found" : "Property",
    detail
      ? `${displayTitle} in ${detail.city ? `${detail.city}, ` : ""}${detail.island}, Cape Verde.`
      : "Property listing in Cape Verde",
    images[0] ? { image: images[0] } : undefined
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    arei
      .getListing(id)
      .then((d) => {
        if (cancelled) return;
        if (!d) {
          setError("Property not found.");
          setDetail(null);
          return;
        }
        setDetail(d);
        setImages(dedupeWpImages(d.image_urls ?? []));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load property.");
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Italian → English translation
  useEffect(() => {
    let cancelled = false;
    const source = detail?.description_html
      ? stripHtml(detail.description_html)
      : detail?.description ?? "";
    if (!source || !looksItalian(source)) {
      setTranslatedDescription(null);
      return () => {
        cancelled = true;
      };
    }
    translateItalianToEnglish(source).then((t) => {
      if (!cancelled) setTranslatedDescription(t);
    });
    return () => {
      cancelled = true;
    };
  }, [detail?.description, detail?.description_html]);

  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    setGalleryIndex(0);
  }, [detail?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxOpen) {
        setLightboxOpen(false);
        return;
      }
      if (!hasMultipleImages) return;
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultipleImages, images.length, lightboxOpen]);

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [lightboxOpen]);

  const touchStartX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > 50) goPrev();
    else if (delta < -50) goNext();
  };

  const goPrev = () => setGalleryIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setGalleryIndex((i) => (i >= images.length - 1 ? 0 : i + 1));

  if (loading) {
    return (
      <div className="kv-d">
        <div className="kv-d-topbar">
          <button type="button" className="kv-d-back" onClick={() => navigate("/")}>← Back to listings</button>
        </div>
        <div className="kv-empty"><strong>Loading…</strong></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <NotFound
        title="Property not found"
        message="This listing may have been removed or the link is no longer valid."
      />
    );
  }

  const specs: { value: string; label: string }[] = [];
  if (detail.property_type) specs.push({ value: capitalize(detail.property_type), label: "Type" });
  if (detail.bedrooms != null) specs.push({ value: detail.bedrooms === 0 ? "Studio" : String(detail.bedrooms), label: "Bedrooms" });
  if (detail.bathrooms != null && detail.bathrooms > 0) specs.push({ value: String(detail.bathrooms), label: "Bathrooms" });
  if (detail.land_area_sqm) specs.push({ value: `${detail.land_area_sqm.toLocaleString()}`, label: "m² Land" });
  if (detail.property_size_sqm) specs.push({ value: `${detail.property_size_sqm.toLocaleString()}`, label: "m² Property" });

  const mainImageStyle: React.CSSProperties =
    images.length > 0
      ? { backgroundImage: `url(${images[galleryIndex]})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" };

  return (
    <div className="kv-d">
      <div className="kv-d-topbar">
        <button type="button" className="kv-d-back" onClick={() => navigate("/")}>
          ← Back to listings
        </button>
      </div>

      {/* Gallery */}
      <div
        className="kv-d-hero"
        onClick={() => images.length > 0 && setLightboxOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="kv-d-hero-img" style={mainImageStyle} />
        {detail.is_new && <span className="kv-d-flag">New</span>}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="kv-d-arrow kv-d-arrow-prev"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="kv-d-arrow kv-d-arrow-next"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next image"
            >
              ›
            </button>
            <div className="kv-d-counter">
              {galleryIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="kv-d-body">
        <div className="kv-d-main">
          <div className="kv-d-topline">
            <span>{detail.property_type ? capitalize(detail.property_type) : ""}</span>
            <span className="kv-d-loc">{formatLocation(detail.city, detail.island)}, Cape Verde</span>
          </div>

          <h1 className="kv-d-title">{displayTitle}</h1>

          <div className="kv-d-price">{formatPrice(detail.price, detail.currency)}</div>

          {specs.length > 0 && (
            <div className="kv-d-specs">
              {specs.map((s) => (
                <div className="kv-d-spec" key={s.label}>
                  <div className="kv-d-spec-v">{s.value}</div>
                  <div className="kv-d-spec-l">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="kv-d-desc">
            <div className="kv-d-h3">About this property</div>
            {translatedDescription ? (
              <p>{translatedDescription}</p>
            ) : detail.description_html ? (
              <div
                className="kv-d-html"
                dangerouslySetInnerHTML={{ __html: detail.description_html }}
              />
            ) : detail.description ? (
              <p>{detail.description}</p>
            ) : (
              <p>
                This property is located in {formatLocation(detail.city, detail.island)}, Cape Verde.
              </p>
            )}
          </div>

          <div className="kv-d-provenance">
            <span>
              Sourced from <b>{formatSourceLabel(detail.source_id)}</b>
            </span>
            {detail.last_seen_at && (
              <span>
                Last checked{" "}
                {new Date(detail.last_seen_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="kv-d-side">
          <div className="kv-d-side-card">
            <div className="kv-d-side-label">Interested in this property?</div>
            <div className="kv-d-side-price">{formatPrice(detail.price, detail.currency)}</div>
            {detail.price && detail.currency === "EUR" && (
              <div className="kv-d-side-cve">
                Approx. {(detail.price * 110.265).toLocaleString("en-US", { maximumFractionDigits: 0 })} CVE
              </div>
            )}
            <div className="kv-d-side-source">Listed by {formatSourceLabel(detail.source_id)}</div>
            {detail.source_url && (
              <a
                className="kv-d-side-cta"
                href={detail.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on source →
              </a>
            )}
            <p className="kv-d-side-note">
              KazaVerde doesn't sell properties. We index public listings from local agents and link you back to the original source.
            </p>
          </div>
        </aside>
      </div>

      {lightboxOpen &&
        images.length > 0 &&
        createPortal(
          <div
            className="kv-d-lb"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button className="kv-d-lb-close" onClick={() => setLightboxOpen(false)} aria-label="Close">
              ×
            </button>
            {hasMultipleImages && (
              <>
                <button
                  className="kv-d-lb-arrow kv-d-lb-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="kv-d-lb-arrow kv-d-lb-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
            <img
              className="kv-d-lb-img"
              src={images[galleryIndex]}
              alt={`Photo ${galleryIndex + 1} of ${images.length}`}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="kv-d-lb-counter">
              {galleryIndex + 1} / {images.length}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
