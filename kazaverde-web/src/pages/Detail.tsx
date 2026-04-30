import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useSaved } from "../hooks/useSaved";
import { arei } from "../lib/arei";
import type {
  ListingDetail as ListingDetailType,
  ListingCard,
  IslandContext,
} from "arei-sdk";
import {
  formatPrice,
  formatLocation,
  formatSourceLabel,
  formatMedian,
  formatPricePerSqm,
} from "../lib/format";
// Italian-runtime-translation helper removed: descriptions are now
// pre-translated and rewritten in AREI voice via the backend backfill
// (Claude Sonnet 4.6, see scripts/backfill_ai_descriptions.ts) and
// stored in listings.ai_descriptions.en. The frontend just reads that
// field instead of translating client-side.
import { calcMortgage, type MortgageInput } from "../lib/calcMortgage";
import NotFound from "./NotFound";
import "./Detail.css";

const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://kazaverde.com");

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

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "recently";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function fmtShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase() +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Friendly "Today, 06:14" / "Yesterday, 14:22" / "12 Apr, 09:30" for
 *  the inline verified strip — feels alive vs raw timestamps. */
function fmtVerifiedTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3_600_000;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 24 && now.getDate() === d.getDate()) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + `, ${time}`;
}

/** "48 days ago" / "2 days ago" — for first-seen freshness. */
function fmtDaysAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Format square metres as hectares. Cape Verde plot sizes range from
 *  ~14 m² (urban infill) up to multi-hectare rural land, so a fixed
 *  decimal count either rounds tiny plots to "0.00" (reads as empty)
 *  or wastes precision on large ones. Pick the format from the value. */
function fmtHectares(sqm: number): string {
  const ha = sqm / 10_000;
  if (ha >= 10) return ha.toLocaleString("en", { maximumFractionDigits: 0 });
  if (ha >= 1) return ha.toLocaleString("en", { maximumFractionDigits: 1 });
  if (ha >= 0.01) return ha.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "<0.01";
}

/** Number of whole days since `iso` (clamped to 0). Used for "Days on index". */
function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

/** ±N% string for "vs median" cell. Returns null when the comparison
 *  isn't meaningful — e.g. land priced against an overall house median
 *  produces 1000%+ noise; bail out and let the row be hidden. */
function priceVsMedian(price: number | null, median: number | null): { pct: number; label: string } | null {
  if (price == null || median == null || median <= 0) return null;
  const pct = Math.round(((price - median) / median) * 100);
  // Above this band the comparison is almost certainly cross-category
  // (land vs house, hotel vs apartment) — better to hide than to lie.
  if (Math.abs(pct) > 200) return null;
  if (pct === 0) return { pct: 0, label: "On median" };
  const sign = pct > 0 ? "+" : "−";
  return { pct, label: `${sign}${Math.abs(pct)}%` };
}

/** "gabetti.cv" from a full URL — used in the source-panel link label. */
function hostFromUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function truncateSeoText(value: string, maxLength = 155): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  const suffix = "...";
  const limit = maxLength - suffix.length;
  const slice = compact.slice(0, limit + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cutAt = lastSpace >= 90 ? lastSpace : limit;
  return `${compact.slice(0, cutAt).trim()}${suffix}`;
}

function buildListingCanonicalUrl(id: string): string {
  return new URL(`/listing/${id}`, SITE_URL).toString();
}

function buildListingMetaDescription(detail: ListingDetailType, title: string): string {
  const location = `${detail.city ? `${detail.city}, ` : ""}${detail.island}, Cape Verde`;
  const parts = [`${title} in ${location}.`];

  if (detail.price) {
    parts.push(`Asking price ${formatPrice(detail.price, detail.currency)}.`);
  }

  if (detail.property_type) {
    parts.push(`Source-linked ${detail.property_type.toLowerCase()} listing on KazaVerde.`);
  } else {
    parts.push("Source-linked property listing on KazaVerde.");
  }

  return truncateSeoText(parts.join(" "));
}

/** Extract a short slug from source_id (e.g. "cv_gabetticasecapoverde:CV-TER339" → "TCV") */
/* Map our free-form property_type onto schema.org Residence subtypes.
   Falls back to "Residence" when nothing matches — still valid per the
   schema and Google ignores rather than rejects. */
function mapResidenceType(propertyType: string | null | undefined): string {
  const t = (propertyType || "").toLowerCase();
  if (/apart|flat|condo/.test(t)) return "Apartment";
  if (/villa|house|moradia|casa|chalet/.test(t)) return "House";
  if (/single.?family/.test(t)) return "SingleFamilyResidence";
  if (/land|plot|terreno|parcela|terrain|lot/.test(t)) return "Place";
  return "Residence";
}

function sourceSlug(sourceId: string): string {
  const before = sourceId.split(":")[0] || sourceId;
  // Take letters from after first underscore, uppercased, first 3-4 chars
  const after = before.split("_").slice(1).join("");
  if (after) return after.slice(0, 3).toUpperCase();
  return before.slice(0, 3).toUpperCase();
}

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toggle, isSaved } = useSaved();

  const [detail, setDetail] = useState<ListingDetailType | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [similar, setSimilar] = useState<ListingCard[]>([]);
  const [marketCtx, setMarketCtx] = useState<IslandContext | null>(null);

  const displayTitle = detail ? toTitleCase(detail.title) : "Property";
  const listingCanonicalUrl = detail ? buildListingCanonicalUrl(detail.id) : undefined;

  useDocumentMeta(
    detail ? displayTitle : error ? "Property not found" : "Property",
    detail
      ? buildListingMetaDescription(detail, displayTitle)
      : "Property listing in Cape Verde",
    detail
      ? { image: images[0], url: listingCanonicalUrl }
      : images[0]
        ? { image: images[0] }
        : undefined
  );

  /* JSON-LD RealEstateListing — gives Google the structured data needed for
     property rich results. Injected as a single <script> tag in the head and
     replaced (not duplicated) on each detail load. The mainEntity type maps
     the listing's property_type onto the closest schema.org Residence type
     so Google can categorize correctly. */
  useEffect(() => {
    if (!detail) return;
    const SCRIPT_ID = "kv-jsonld-listing";
    document.getElementById(SCRIPT_ID)?.remove();
    const url = buildListingCanonicalUrl(detail.id);
    const residenceType = mapResidenceType(detail.property_type);
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: displayTitle,
      url,
      description: detail.description?.slice(0, 500) || displayTitle,
      datePosted: detail.first_seen_at ?? detail.last_seen_at ?? undefined,
      image: images.length > 0 ? images.slice(0, 6) : undefined,
      mainEntity: {
        "@type": residenceType,
        address: {
          "@type": "PostalAddress",
          addressLocality: detail.city || undefined,
          addressRegion: detail.island,
          addressCountry: "CV",
        },
        numberOfRooms: detail.bedrooms ?? undefined,
        numberOfBathroomsTotal: detail.bathrooms ?? undefined,
        floorSize: detail.property_size_sqm
          ? { "@type": "QuantitativeValue", value: detail.property_size_sqm, unitCode: "MTK" }
          : undefined,
      },
      offers: detail.price
        ? {
            "@type": "Offer",
            price: detail.price,
            priceCurrency: detail.currency || "EUR",
            availability: "https://schema.org/InStock",
            url,
          }
        : undefined,
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [detail, images, displayTitle]);

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

  // (Removed: client-side Italian → English runtime translation. The
  // backend now generates English AREI-voice prose via the v1.2 backfill
  // and stores it in listings.ai_descriptions.en. The description block
  // below reads that field directly.)

  // Similar properties — fetch up to 9 so user can scroll through.
  // minResults: 3 so the SDK keeps broadening its fallback chain (price
  // ±30%, then type-only, then island-only) until at least 3 cards are
  // available. Otherwise sparse niches (e.g. type "property" with a
  // narrow price band) bottom out at 2 and the UI hides the section.
  useEffect(() => {
    if (!detail) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    arei
      .getSimilarListings({ listing: detail, limit: 9, minResults: 3 })
      .then((cards) => {
        if (!cancelled) setSimilar(cards);
      })
      .catch(() => {
        if (!cancelled) setSimilar([]);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  // Market context
  useEffect(() => {
    if (!detail) {
      setMarketCtx(null);
      return;
    }
    let cancelled = false;
    arei
      .getIslandContext(detail.island, detail.price)
      .then((c) => {
        if (!cancelled) setMarketCtx(c);
      })
      .catch(() => {
        if (!cancelled) setMarketCtx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.island, detail?.price]);

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
          <button type="button" className="kv-d-back" onClick={() => navigate("/")}>← All listings</button>
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

  const interiorArea = detail.property_size_sqm;
  const landArea = detail.land_area_sqm;
  const effectiveArea = interiorArea || landArea;
  const pricePerSqm =
    detail.price && effectiveArea ? Math.round(detail.price / effectiveArea) : null;

  const isLand = (detail.property_type || "").toLowerCase() === "land";

  // Build facts strip: Type / Bedrooms / Bathrooms / Interior / Price per m²
  // For land: Type / Land / Price per m² (bed/bath omitted as "—")
  const typeLabel = detail.property_type ? capitalize(detail.property_type) : "—";

  return (
    <div className="kv-d">
      {/* Breadcrumb: Listings / Island / City — no internal id, the page
          title carries the listing identity. Listings + Island both link
          back into the index; city stays plain text since the index does
          not yet support a city-level filter. */}
      <div className="kv-d-crumb">
        <Link to="/listings">Listings</Link>
        <span className="kv-d-crumb-sep">/</span>
        <Link to={`/listings?island=${encodeURIComponent(detail.island)}`}>{detail.island}</Link>
        {detail.city && (
          <>
            <span className="kv-d-crumb-sep">/</span>
            <span className="kv-d-crumb-cur">{detail.city}</span>
          </>
        )}
      </div>

      {/* Top meta rail: 3-row grid — eyebrow / title+price / subline+€per-m². */}
      <header className="kv-d-top">
        <div className="kv-d-top-grid">
          <div className="kv-d-eyebrow">
            <span className={`kv-d-tag${detail.is_new ? " kv-d-tag-new" : ""}`}>
              {detail.is_new ? "New" : "Indexed"}
            </span>
            {detail.property_type && <b>{typeLabel}</b>}
            <span className="kv-d-eyebrow-dot" aria-hidden="true" />
            <span>{formatLocation(detail.city, detail.island)}</span>
            {/* Source name intentionally omitted here — already shown
                on the sidebar CTA button and the Original Source panel. */}
          </div>
          <h1 className="kv-d-title">{displayTitle}</h1>
          <div className="kv-d-price-block">
            <div className="kv-d-price">{formatPrice(detail.price, detail.currency)}</div>
          </div>
          <div className="kv-d-subline">
            {!isLand && detail.bedrooms != null && (
              <>
                <b>{detail.bedrooms === 0 ? "Studio" : detail.bedrooms}</b> bed
              </>
            )}
            {!isLand && detail.bathrooms != null && detail.bathrooms > 0 && (
              <>
                {" · "}
                <b>{detail.bathrooms}</b> bath
              </>
            )}
            {effectiveArea != null && (
              <>
                {" · "}
                <b>{effectiveArea.toLocaleString()}</b> m²
              </>
            )}
          </div>
          {/* Always rendered to reserve vertical space; empty when €/m² unknown.
              Format mirrors listing-v1.html .ppm: bold value + " per m²". */}
          <div className="kv-d-price-cve">
            {pricePerSqm ? <><b>€{pricePerSqm.toLocaleString()}</b> per m²</> : ""}
          </div>
        </div>

        {/* Verified strip — freshness signal inline with the header per
            cv-listing.html. Reads as "this is current data" instead of
            burying first/last-seen in the sidebar. */}
        <div className="kv-d-verified">
          <span className="kv-d-verified-dot" aria-hidden="true" />
          <span className="kv-d-verified-lbl">Last verified</span>
          <span className="kv-d-verified-val">{fmtVerifiedTime(detail.last_seen_at)}</span>
          {detail.first_seen_at && (
            <>
              <span className="kv-d-verified-sep" aria-hidden="true">·</span>
              <span className="kv-d-verified-val">Indexed {fmtDaysAgo(detail.first_seen_at)}</span>
            </>
          )}
        </div>
      </header>

      {/* Gallery — mosaic if ≥5 images, else single hero */}
      {images.length >= 5 ? (
        <GalleryMosaic
          images={images}
          isNew={detail.is_new}
          onOpen={(i) => {
            setGalleryIndex(i);
            setLightboxOpen(true);
          }}
        />
      ) : (
        <div
          className="kv-d-hero"
          onClick={() => images.length > 0 && setLightboxOpen(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="kv-d-hero-img"
            style={
              images.length > 0
                ? {
                    backgroundImage: `url(${images[galleryIndex]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { background: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" }
            }
          />
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
      )}

      {/* Facts strip — editorial grid between black rules. For land we
          drop bed/bath (always blank) and show plot-relevant data points
          instead, so the row never reads as half-empty. */}
      <div className="kv-d-facts">
        <div className="kv-d-fact">
          <div className="kv-d-fact-k">Type</div>
          <div className="kv-d-fact-v">{typeLabel}</div>
        </div>
        {isLand ? (
          <>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Plot area</div>
              <div className="kv-d-fact-v">
                {landArea != null ? (
                  <>
                    {landArea.toLocaleString()}
                    <small>m²</small>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">In hectares</div>
              <div className="kv-d-fact-v">
                {landArea != null ? (
                  <>
                    {fmtHectares(landArea)}
                    <small>ha</small>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Price / m²</div>
              <div className="kv-d-fact-v">{pricePerSqm ? `€${pricePerSqm.toLocaleString()}` : "—"}</div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Location</div>
              <div className="kv-d-fact-v">{detail.city || detail.island}</div>
            </div>
          </>
        ) : (
          <>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Bedrooms</div>
              <div className="kv-d-fact-v">
                {detail.bedrooms == null
                  ? "—"
                  : detail.bedrooms === 0
                    ? "Studio"
                    : detail.bedrooms}
              </div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Bathrooms</div>
              <div className="kv-d-fact-v">
                {detail.bathrooms == null || detail.bathrooms === 0 ? "—" : detail.bathrooms}
              </div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Interior</div>
              <div className="kv-d-fact-v">
                {effectiveArea != null ? (
                  <>
                    {effectiveArea.toLocaleString()}
                    <small>m²</small>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div className="kv-d-fact">
              <div className="kv-d-fact-k">Price / m²</div>
              <div className="kv-d-fact-v">{pricePerSqm ? `€${pricePerSqm.toLocaleString()}` : "—"}</div>
            </div>
          </>
        )}
      </div>

      {/* Main 2-col: description + INDEX RECORD sidebar */}
      <div className="kv-d-main">
        <div>
          {/* Description block.
              Primary source: listings.ai_descriptions.en.text (Sonnet 4.6,
              prompt v1.2 — see scripts/backfill_ai_descriptions.ts).
              Fallback: description_html / description from the source feed
              (only ~12% of listings — those excluded from backfill scope by
              the LENGTH > 500 filter). The AI badge + caption are gated on
              actual AI text being present so we never claim AI-rewrite over
              raw scraped source. Source agent stays credited in the sidebar. */}
          <div className="kv-d-block">
            <div className="kv-d-block-head">
              <h2 className="kv-d-block-h">Description</h2>
              {detail.ai_descriptions?.en?.text && (
                <span
                  className="kv-d-ai-badge"
                  title="Rewritten with AI to normalize tone and remove sales language. Source attribution unchanged — see Original source panel."
                >
                  <span className="kv-d-ai-dot" aria-hidden="true" />
                  AI · Rewritten
                </span>
              )}
            </div>
            {detail.ai_descriptions?.en?.text ? (
              <p>{detail.ai_descriptions.en.text}</p>
            ) : detail.description_html ? (
              <div className="kv-d-html" dangerouslySetInnerHTML={{ __html: detail.description_html }} />
            ) : detail.description ? (
              <p>{detail.description}</p>
            ) : (
              <p>
                This property is located in {formatLocation(detail.city, detail.island)}, Cape Verde.
              </p>
            )}
            {detail.ai_descriptions?.en?.text && (
              <p className="kv-d-ai-caption">
                Description rewritten with AI for clarity — original source attribution unchanged.
              </p>
            )}
          </div>

          {/* Property details — vertical k/v table mirroring cv-listing
              reference. Each row is the same .kv-d-meta-row primitive
              used by the sidebar Index Record (no new visual idiom).
              Only rows with real data render — and the whole section
              hides itself if fewer than 4 fields are available, so the
              card never reads as a half-empty stub for sparse listings.
              Fields beyond beds/baths/areas (year built, condition,
              parking, …) light up automatically once the ingestion
              pipeline starts extracting them. */}
          {(() => {
            const rows: { k: string; v: React.ReactNode }[] = [];
            if (detail.property_type) rows.push({ k: "Type", v: typeLabel });
            if (!isLand && detail.bedrooms != null) {
              rows.push({ k: "Bedrooms", v: detail.bedrooms === 0 ? "Studio" : detail.bedrooms });
            }
            if (!isLand && detail.bathrooms != null && detail.bathrooms > 0) {
              rows.push({ k: "Bathrooms", v: detail.bathrooms });
            }
            if (detail.property_size_sqm != null) {
              rows.push({ k: "Living area", v: <>{detail.property_size_sqm.toLocaleString()} m²</> });
            }
            if (detail.land_area_sqm != null) {
              rows.push({ k: "Plot area", v: <>{detail.land_area_sqm.toLocaleString()} m²</> });
            }
            if (detail.city) {
              rows.push({ k: "Location", v: formatLocation(detail.city, detail.island) });
            }
            if (rows.length < 4) return null;
            return (
              <div className="kv-d-table-block">
                <div className="kv-d-table-eyebrow">Property details</div>
                <div className="kv-d-table">
                  {rows.map((r) => (
                    <div className="kv-d-table-row" key={r.k}>
                      <div className="kv-d-table-k">{r.k}</div>
                      <div className="kv-d-table-v">{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Map placeholder — location context without geocoding.
              Matches the cv-listing.html Location section pattern. */}
          <div className="kv-d-map-block">
            <div className="kv-d-table-eyebrow">Location</div>
            <div className="kv-d-map-placeholder">
              <div className="kv-d-map-pin" aria-hidden="true">⊙</div>
              <div className="kv-d-map-location">
                {[detail.city, detail.island].filter(Boolean).join(", ")}
              </div>
              <span className="kv-pill">Map coming soon</span>
            </div>
          </div>

        </div>

        {/* Buyer-facing sidebar — three stacked panels mirroring the
            cv-listing reference rhythm:
              1. ACT   — Listing summary (price + specs + CTAs, strong border)
              2. KNOW  — Index record (k/v data rows, soft border)
              3. TRUST — Original source (attribution + disclaimer, soft border)
            Visual hierarchy: Panel 1 carries the action and gets the
            strong black hairline; Panels 2/3 use the softer rule so the
            row reads as a sequence, not three competing boxes. */}
        <aside className="kv-d-aside">
          {/* Panel 1 — Listing summary. Same border weight (--kv-rule)
              as the meta table and source panel below; only the surface
              changes (white / transparent / off-white) so the column
              reads as one harmonised stack instead of three competing
              card treatments. cv-listing.html .s-panel pattern. */}
          <div className="kv-d-card">
            <div className="kv-d-card-h">
              <span>Listing summary</span>
            </div>
            <div className="kv-d-card-body">
              {detail.price && (
                <div className="kv-d-card-price-block">
                  <div className="kv-d-card-price">
                    {formatPrice(detail.price, detail.currency)}
                  </div>
                  <div className="kv-d-card-subline">
                    {pricePerSqm != null && (
                      <>
                        <b>€{pricePerSqm.toLocaleString()}</b>/m²
                        <span className="kv-d-card-subline-sep"> · </span>
                      </>
                    )}
                    <span>Asking price</span>
                  </div>
                </div>
              )}

              {((!isLand && (detail.bedrooms != null || detail.bathrooms != null)) ||
                detail.property_size_sqm != null ||
                detail.land_area_sqm != null) && (
                <div className="kv-d-spec-row">
                  {!isLand && detail.bedrooms != null && (
                    <span className="kv-d-spec-token">
                      <b>{detail.bedrooms === 0 ? "Studio" : detail.bedrooms}</b> {detail.bedrooms === 1 ? "bed" : "beds"}
                    </span>
                  )}
                  {!isLand && detail.bathrooms != null && detail.bathrooms > 0 && (
                    <span className="kv-d-spec-token">
                      <b>{detail.bathrooms}</b> {detail.bathrooms === 1 ? "bath" : "baths"}
                    </span>
                  )}
                  {(detail.property_size_sqm ?? detail.land_area_sqm) != null && (
                    <span className="kv-d-spec-token">
                      <b>{detail.property_size_sqm ?? detail.land_area_sqm}</b> m²
                    </span>
                  )}
                </div>
              )}

              {detail.source_url && (
                <a
                  className="kv-d-btn-primary"
                  href={detail.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>View on {formatSourceLabel(detail.source_id)}</span>
                  <span aria-hidden="true">→</span>
                </a>
              )}
              <button
                type="button"
                className={`kv-d-btn-ghost${isSaved(detail.id) ? " is-saved" : ""}`}
                onClick={() => toggle(detail.id)}
                aria-pressed={isSaved(detail.id)}
              >
                <span>{isSaved(detail.id) ? "✓ Saved to shortlist" : "Save to shortlist"}</span>
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>

          {/* Panel 2 — Status table. Same border weight as Panel 1 + 3,
              transparent surface. cv-listing.html .s-meta pattern: a
              clean tabular grid (1fr 1fr per row) with no eyebrow
              header — the data IS the section. */}
          {(() => {
            const days = daysSince(detail.first_seen_at);
            const vsMed = priceVsMedian(detail.price, marketCtx?.medianPrice ?? null);
            return (
              <div className="kv-d-meta-table">
                <div className="kv-d-meta-table-row">
                  <div className="kv-d-meta-table-k">Status</div>
                  <div className="kv-d-meta-table-v">Active</div>
                </div>
                <div className="kv-d-meta-table-row">
                  <div className="kv-d-meta-table-k">First indexed</div>
                  <div className="kv-d-meta-table-v">{fmtShortDate(detail.first_seen_at)}</div>
                </div>
                <div className="kv-d-meta-table-row">
                  <div className="kv-d-meta-table-k">Days on index</div>
                  <div className="kv-d-meta-table-v">{days} {days === 1 ? "day" : "days"}</div>
                </div>
                <div className="kv-d-meta-table-row">
                  <div className="kv-d-meta-table-k">Last verified</div>
                  <div className="kv-d-meta-table-v">{fmtDateTime(detail.last_seen_at)}</div>
                </div>
                {marketCtx?.medianPrice != null && (
                  <div className="kv-d-meta-table-row">
                    <div className="kv-d-meta-table-k">{detail.island} median</div>
                    <div className="kv-d-meta-table-v">{formatMedian(marketCtx.medianPrice)}</div>
                  </div>
                )}
                {vsMed && (
                  <div className="kv-d-meta-table-row">
                    <div className="kv-d-meta-table-k">vs median</div>
                    <div className={`kv-d-meta-table-v${vsMed.pct < 0 ? " is-lower" : vsMed.pct > 0 ? " is-higher" : ""}`}>
                      {vsMed.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Panel 3 — Original source (trust + disclaimer) */}
          <div className="kv-d-card kv-d-card-soft kv-d-source">
            <div className="kv-d-source-lbl">Original source</div>
            <div className="kv-d-source-name">{formatSourceLabel(detail.source_id)}</div>
            {detail.source_url && (
              <a
                className="kv-d-source-link"
                href={detail.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {hostFromUrl(detail.source_url) || "source"} →
              </a>
            )}
            <p className="kv-d-source-disc">
              This index reproduces public listing data only. We have no affiliation with the
              source agent or the seller. Contact the agent directly for viewings, offers, and
              legal advice — or see our <Link to="/blog">buying guide</Link> for the basics.
            </p>
            <p className="kv-d-source-disc">
              Explore more: <Link to="/listings">all Cape Verde listings</Link>,{" "}
              <Link to={`/listings?island=${encodeURIComponent(detail.island)}`}>
                {detail.island} listings
              </Link>,{" "}
              <Link to="/market">market data</Link>, or{" "}
              <Link to="/about">how KazaVerde works</Link>.
            </p>
          </div>
        </aside>
      </div>

      {/* Monthly Cost */}
      {detail.price && !isLand && <KvMortgage price={detail.price} />}

      {/* Market Context */}
      {marketCtx && <KvMarketContext ctx={marketCtx} island={detail.island} />}

      {/* Similar Properties — minimum 3 cards or hide. A 1- or 2-card
          row breaks the editorial grid (last column reads as missing,
          not as a curated short row). Better to drop the section than
          ship a sparse "Similar" rail. */}
      {similar.length >= 3 && <KvSimilar cards={similar} />}

      {/* Mobile sticky CTA — visible <768px, mirrors aside's primary
          action so the View-on-source link is one tap away while
          scrolling. Uses position: fixed at viewport bottom. */}
      {detail.source_url && (
        <div className="kv-d-mcta" role="region" aria-label="Listing actions">
          <div className="kv-d-mcta-info">
            {detail.price && (
              <div className="kv-d-mcta-price">{formatPrice(detail.price, detail.currency)}</div>
            )}
            <div className="kv-d-mcta-source">via {formatSourceLabel(detail.source_id)}</div>
          </div>
          <a
            className="kv-d-mcta-btn"
            href={detail.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View <span aria-hidden="true">→</span>
          </a>
        </div>
      )}

      {/* Lightbox */}
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

/* ─────────────────────────────────────────────────────────
   Gallery mosaic — 2fr 1fr 1fr with primary spanning 2 rows
──────────────────────────────────────────────────────────── */

function GalleryMosaic({
  images,
  isNew,
  onOpen,
}: {
  images: string[];
  isNew: boolean;
  onOpen: (index: number) => void;
}) {
  // Show 5 tiles: primary (idx 0) + 4 smaller tiles
  const tiles = images.slice(0, 5);
  const extraCount = Math.max(0, images.length - 5);

  return (
    <div className="kv-d-gallery">
      {tiles.map((url, i) => {
        const isPrimary = i === 0;
        const isLast = i === tiles.length - 1;
        return (
          <div
            key={url + i}
            className={`kv-d-gtile${isPrimary ? " kv-d-gtile-primary" : ""}`}
            style={{ backgroundImage: `url(${url})` }}
            onClick={() => onOpen(i)}
            role="button"
            tabIndex={0}
          >
            {isPrimary && isNew && <span className="kv-d-g-flag">New</span>}
            {isPrimary && !isNew && <span className="kv-d-g-flag">Primary</span>}
            {isLast && extraCount > 0 && (
              <span className="kv-d-g-count">+{extraCount} images</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Monthly Cost Estimate
──────────────────────────────────────────────────────────── */

function fmtEur(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function parseNum(raw: string, allowDecimal = false): number {
  const cleaned = allowDecimal
    ? raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    : raw.replace(/[^0-9]/g, "");
  return cleaned === "" ? 0 : Number(cleaned);
}

function KvMortgage({ price }: { price: number }) {
  const [input, setInput] = useState<MortgageInput>({
    totalAmount: price,
    downPaymentPct: 20,
    interestRate: 4.5,
    loanTermYears: 25,
    propertyTaxPct: 0.3,
    insuranceAnnual: 600,
    hoaMonthly: 0,
    maintenanceMonthly: 50,
    utilitiesMonthly: 0,
  });

  const [rawInterestRate, setRawInterestRate] = useState(String(input.interestRate));
  /* Mobile-only: collapses property tax + carrying costs (insurance, HOA,
     maintenance, utilities) behind a Show more toggle. Defaults are sane,
     so the typical reader can submit-by-skip. The toggle button hides
     itself on desktop where space is no constraint and all fields show. */
  const [showAdvanced, setShowAdvanced] = useState(false);
  const set = <K extends keyof MortgageInput>(key: K, val: MortgageInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calcMortgage(input), [input]);

  const totalInterest = Math.max(0, result.monthlyMortgage * input.loanTermYears * 12 - result.loanAmount);
  const totalCost = result.downPayment + result.loanAmount + totalInterest;

  const rows: { label: string; value: number }[] = [
    { label: "Loan payment", value: result.monthlyMortgage },
    { label: "Property tax", value: result.monthlyTax },
    { label: "Insurance", value: result.monthlyInsurance },
    { label: "Condo fee", value: result.monthlyHoa },
    { label: "Maintenance", value: result.monthlyMaintenance },
    { label: "Utilities", value: result.monthlyUtilities },
  ].filter((r) => r.value > 0);

  return (
    <section className="kv-d-section">
      <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Estimate</div>
          <h2 className="kv-d-h2">Monthly cost</h2>
        </div>
      </div>

      <div className="kv-d-mc">
        <div className="kv-d-mc-inputs">
          {/* Loan terms — primary inputs */}
          <div className="kv-d-mc-field kv-d-mc-field-wide">
            <label>Property price</label>
            <input
              type="text"
              inputMode="numeric"
              value={input.totalAmount || ""}
              onChange={(e) => set("totalAmount", parseNum(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Deposit ({input.downPaymentPct}%)</label>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={input.downPaymentPct}
              onChange={(e) => set("downPaymentPct", Number(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Loan term ({input.loanTermYears}y)</label>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={input.loanTermYears}
              onChange={(e) => set("loanTermYears", Number(e.target.value))}
            />
          </div>
          <div className="kv-d-mc-field">
            <label>Interest rate (%)</label>
            <input
              type="text"
              inputMode="decimal"
              value={rawInterestRate}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                setRawInterestRate(raw);
                const n = raw === "" || raw === "." ? 0 : Number(raw);
                if (!isNaN(n)) set("interestRate", Math.min(15, n));
              }}
            />
          </div>
          {/* Advanced fields — wrapped in a display:contents group so they
              still flow into the parent grid on desktop. On mobile, the
              wrapper is hidden until the reader opens the toggle below. */}
          <div className="kv-d-mc-advanced" data-open={showAdvanced ? "true" : "false"}>
            <div className="kv-d-mc-field">
              <label>Property tax (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={input.propertyTaxPct}
                onChange={(e) => set("propertyTaxPct", parseNum(e.target.value, true))}
              />
            </div>
            <div className="kv-d-mc-field">
              <label>Insurance (€/yr)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.insuranceAnnual || ""}
                onChange={(e) => set("insuranceAnnual", parseNum(e.target.value))}
              />
            </div>
            <div className="kv-d-mc-field">
              <label>Condo fee (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.hoaMonthly || ""}
                onChange={(e) => set("hoaMonthly", parseNum(e.target.value))}
              />
            </div>
            <div className="kv-d-mc-field">
              <label>Maintenance (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.maintenanceMonthly || ""}
                onChange={(e) => set("maintenanceMonthly", parseNum(e.target.value))}
              />
            </div>
            <div className="kv-d-mc-field">
              <label>Utilities (€/mo)</label>
              <input
                type="text"
                inputMode="numeric"
                value={input.utilitiesMonthly || ""}
                onChange={(e) => set("utilitiesMonthly", parseNum(e.target.value))}
              />
            </div>
          </div>
          <button
            type="button"
            className="kv-d-mc-advanced-toggle"
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
          >
            <span>{showAdvanced ? "Hide advanced costs" : "Show advanced costs"}</span>
            <span aria-hidden="true">{showAdvanced ? "−" : "+"}</span>
          </button>
        </div>

        <div className="kv-d-mc-result">
          <div className="kv-d-mc-hero">
            <div className="kv-d-mc-hero-label">Estimated monthly</div>
            <div className="kv-d-mc-hero-value">{fmtEur(result.totalMonthly, 0)}</div>
            <div className="kv-d-mc-hero-sub">per month</div>
          </div>
          <div className="kv-d-mc-table">
            {rows.map((r) => (
              <div className="kv-d-mc-row" key={r.label}>
                <span>{r.label}</span>
                <span className="kv-d-mc-val">{fmtEur(r.value, 0)}</span>
              </div>
            ))}
          </div>
          <div className="kv-d-mc-summary">
            <div className="kv-d-mc-summary-row">
              <span>Deposit</span>
              <span>{fmtEur(result.downPayment, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Loan amount</span>
              <span>{fmtEur(result.loanAmount, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Total interest</span>
              <span>{fmtEur(totalInterest, 0)}</span>
            </div>
            <div className="kv-d-mc-summary-row">
              <span>Total cost ({input.loanTermYears}y)</span>
              <span>{fmtEur(totalCost, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="kv-d-disclaimer">
        Illustrative estimate for planning purposes. Not financial advice — rates and taxes vary.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Market Context
──────────────────────────────────────────────────────────── */

function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

function KvMarketContext({ ctx, island }: { ctx: IslandContext; island: string }) {
  const cards: {
    value: string;
    label: string;
    note?: string;
    percentile?: number;
  }[] = [];

  if (ctx.medianPrice !== null) {
    cards.push({
      value: formatMedian(ctx.medianPrice),
      label: `${island} median`,
      note: `${ctx.activeListings} priced listings`,
    });
  }
  if (ctx.medianPricePerSqm !== null) {
    cards.push({
      value: formatPricePerSqm(ctx.medianPricePerSqm),
      label: "Median €/m²",
      note: `${ctx.nSqmListings} with size data`,
    });
  }
  if (ctx.pricePercentile !== null) {
    cards.push({
      value: ordinal(ctx.pricePercentile),
      label: "Price percentile",
      note: ctx.pricePercentile >= 50 ? "Above island median" : "Below island median",
      percentile: ctx.pricePercentile,
    });
  }
  if (ctx.lastUpdated) {
    cards.push({
      value: new Date(ctx.lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      label: "Last seen",
      note: "Latest tracked update",
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="kv-d-section">
      <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Context</div>
          <h2 className="kv-d-h2">Market context</h2>
        </div>
      </div>

      <div className={`kv-d-mctx-grid kv-d-mctx-${cards.length}`}>
        {cards.map((c) => (
          <div className="kv-d-mctx-card" key={c.label}>
            <div className="kv-d-mctx-value">{c.value}</div>
            <div className="kv-d-mctx-label">{c.label}</div>
            {c.percentile != null && (
              <div className="kv-d-mctx-bar">
                <div className="kv-d-mctx-bar-track">
                  <div className="kv-d-mctx-bar-dot" style={{ left: `${c.percentile}%` }} />
                </div>
                <div className="kv-d-mctx-bar-labels">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}
            {c.note && <div className="kv-d-mctx-note">{c.note}</div>}
          </div>
        ))}
      </div>

      <p className="kv-d-disclaimer">
        Asking price data from public listings. Not financial advice.{" "}
        <Link to="/market">View Cape Verde market data</Link>.
      </p>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────
   Similar Properties — horizontal scroll carousel
──────────────────────────────────────────────────────────── */

function KvSimilar({ cards }: { cards: ListingCard[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [cards]);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    // Use the actual rendered card width + gap so the scroll lands one
    // card over on every viewport. Hard-coding 380px overshot on mobile
    // (cards are ~85vw there) and made the next card disappear left.
    const firstCard = el.querySelector<HTMLElement>(".kv-d-sim-card");
    const step = firstCard ? firstCard.offsetWidth + 20 : 380;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="kv-d-section kv-d-section-tinted">
      <div className="kv-d-section-inner">
        <div className="kv-d-section-head">
        <div>
          <div className="kv-d-ey">Comparable</div>
          <h2 className="kv-d-h2">Similar properties</h2>
        </div>
        <div className="kv-d-sim-nav">
          <button
            type="button"
            className={`kv-d-sim-arrow${canPrev ? "" : " kv-d-sim-arrow-off"}`}
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            disabled={!canPrev}
          >
            ‹
          </button>
          <button
            type="button"
            className={`kv-d-sim-arrow${canNext ? "" : " kv-d-sim-arrow-off"}`}
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            disabled={!canNext}
          >
            ›
          </button>
        </div>
      </div>

      <div className="kv-d-sim-scroll" ref={ref}>
        {cards.map((l) => {
          const loc = [l.city, l.island].filter(Boolean).join(", ");
          const imgUrl = l.image_urls?.[0] || l.image_url;
          const bg: React.CSSProperties = imgUrl
            ? { backgroundImage: `url("${imgUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundImage: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" };
          return (
            <Link key={l.id} to={`/listing/${l.id}`} className="kv-d-sim-card">
              <div className="kv-d-sim-img" style={bg}>
                {l.is_new && <span className="kv-d-sim-flag">New</span>}
              </div>
              <div className="kv-d-sim-body">
                <div className="kv-d-sim-top">
                  <span>{l.property_type ? capitalize(l.property_type) : ""}</span>
                  {loc && <span className="kv-d-sim-loc">{loc}</span>}
                </div>
                <div className="kv-d-sim-price">{formatPrice(l.price, l.currency)}</div>
                <div className="kv-d-sim-title">{toTitleCase(l.title)}</div>
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </section>
  );
}
