import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSaved } from "../hooks/useSaved";
import type { DemoListing } from "../lib/demo-data";
import { formatPrice, formatLocation, formatBedrooms, formatBathrooms, isNewListing } from "../lib/format";
import "./PropertyCard.css";

interface Props {
  listing: DemoListing;
  index?: number;
  viewMode?: "grid" | "list";
}

export default function PropertyCard({ listing, index = 0, viewMode = "grid" }: Props) {
  const navigate = useNavigate();
  const { toggle, isSaved } = useSaved();
  const isNew = isNewListing(listing.first_seen_at);
  const saved = isSaved(listing.id);
  const [imageIndex, setImageIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchAxis = useRef<"x" | "y" | null>(null);
  const suppressClickRef = useRef(false);

  const LAND_TYPES = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;
  const LAND_TITLE = /\b(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)\b/i;
  const isLand = LAND_TYPES.test(listing.property_type ?? "") || LAND_TITLE.test(listing.title ?? "");
  const specs: string[] = [];
  if (!isLand) {
    const bed = formatBedrooms(listing.bedrooms);
    if (bed) specs.push(bed);
    const bath = formatBathrooms(listing.bathrooms);
    if (bath) specs.push(bath);
  }
  if (isLand && listing.land_area_sqm) {
    specs.push(`${listing.land_area_sqm} m²`);
  }

  useEffect(() => {
    setImageIndex(0);
  }, [listing.id]);

  useEffect(() => {
    if (listing.image_urls.length < 2) return;

    const preloaders = listing.image_urls.map((url) => {
      const img = new Image();
      img.src = url;
      return img;
    });

    return () => {
      preloaders.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [listing.image_urls]);

  const hasMultipleImages = listing.image_urls.length > 1;

  const heroStyle: React.CSSProperties = listing.image_urls.length > 0
    ? { backgroundImage: `url(${listing.image_urls[imageIndex]})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: listing._bg };

  const isList = viewMode === "list";

  const handleCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    navigate(`/listing/${listing.id}`);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchAxis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    if (!touchAxis.current) {
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) return;
      touchAxis.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }

    if (touchAxis.current === "x") {
      suppressClickRef.current = true;
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const isHorizontalSwipe = touchAxis.current === "x" && Math.abs(deltaX) >= 42 && Math.abs(deltaX) > Math.abs(deltaY);
    touchAxis.current = null;
    if (!isHorizontalSwipe) return;

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 300);
    setImageIndex((current) => {
      if (deltaX > 0) {
        return current <= 0 ? listing.image_urls.length - 1 : current - 1;
      }
      return current >= listing.image_urls.length - 1 ? 0 : current + 1;
    });
  };

  return (
    <article
      className={`pc${isList ? " pc-list" : ""}`}
      onClick={handleCardClick}
    >
      <div className="pci" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="ph" style={heroStyle} />
        <button
          type="button"
          className={`pc-save${saved ? " is-saved" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(listing.id);
          }}
          aria-label={saved ? `Remove ${listing.title} from saved properties` : `Save ${listing.title} to saved properties`}
          aria-pressed={saved}
          title={saved ? "Saved" : "Save"}
        >
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        {isNew && <span className="tg tg-n">NEW</span>}
        {!isList && <div className="pr">{formatPrice(listing.price, listing.currency)}</div>}
      </div>
      <div className="pcb">
        <div className="pcl">
          {listing.property_type && (
            <div className="pc-type">{listing.property_type}</div>
          )}
          <div className="pct">{listing.title}</div>
          <div className="pca">{formatLocation(listing.city, listing.island)}</div>
          {!isList && <div className="pc-gprice">{formatPrice(listing.price, listing.currency)}</div>}
          {specs.length > 0 && (
            <div className="pcs">
              {specs.map((s, i) => <span key={i}>{s}</span>)}
            </div>
          )}
          {isList && <div className="pc-lprice">{formatPrice(listing.price, listing.currency)}</div>}
        </div>
        {!isList && (
          <div className="ca">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        )}
      </div>
    </article>
  );
}
