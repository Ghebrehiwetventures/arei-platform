import { useNavigate } from "react-router-dom";
import type { DemoListing } from "../lib/demo-data";
import { formatPrice, formatLocation, formatBedrooms, formatBathrooms, isNewListing } from "../lib/format";
import "./PropertyCard.css";

interface Props {
  listing: DemoListing;
  index?: number;
}

export default function PropertyCard({ listing, index = 0 }: Props) {
  const navigate = useNavigate();
  const isNew = isNewListing(listing.first_seen_at);

  const specs: string[] = [];
  const bed = formatBedrooms(listing.bedrooms);
  if (bed) specs.push(bed);
  const bath = formatBathrooms(listing.bathrooms);
  if (bath) specs.push(bath);
  if (listing.property_type === "Land" && listing.land_area_sqm) {
    specs.push(`${listing.land_area_sqm} m²`);
  }

  const heroStyle: React.CSSProperties = listing.image_urls.length > 0
    ? { backgroundImage: `url(${listing.image_urls[0]})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: listing._bg };

  return (
    <article
      className="pc anim-ci"
      style={{ animationDelay: `${0.3 + index * 0.07}s` }}
      onClick={() => navigate(`/listing/${listing.id}`)}
    >
      <div className="pci">
        <div className="ph" style={heroStyle} />
        {isNew && <span className="tg tg-n">NEW</span>}
        <div className="pr">{formatPrice(listing.price, listing.currency)}</div>
      </div>
      <div className="pcb">
        <div className="pcl">
          {listing.property_type && (
            <div className="pc-type">{listing.property_type}</div>
          )}
          <div className="pct">{listing.title}</div>
          <div className="pca">{formatLocation(listing.city, listing.island)}</div>
          {specs.length > 0 && (
            <div className="pcs">
              {specs.map((s, i) => <span key={i}>{s}</span>)}
            </div>
          )}
        </div>
        <div className="ca">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>
    </article>
  );
}
