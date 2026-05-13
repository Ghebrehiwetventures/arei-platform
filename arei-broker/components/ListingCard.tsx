import { PublishStatusBadge } from "./StatusBadge";
import { computeListingHints } from "../brokerData";
import type { BrokerListing } from "../types";

interface ListingCardProps {
  listing: BrokerListing;
  onClick: () => void;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ListingCard({ listing, onClick }: ListingCardProps) {
  const firstImage = listing.image_urls?.[0] ?? null;
  const location = [listing.island, listing.city].filter(Boolean).join(", ");

  const hints = computeListingHints(listing);
  const failedRequired = hints.filter((h) => h.severity === "required" && !h.passed);
  const needsAttention = failedRequired.length > 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg overflow-hidden transition-colors"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
      }}
    >
      {/* Thumbnail */}
      {firstImage ? (
        <div className="w-full h-36 overflow-hidden">
          <img
            src={firstImage}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="w-full h-36 flex items-center justify-center text-xs"
          style={{
            background: "var(--color-surface-3)",
            color: "var(--color-foreground-subtle)",
          }}
        >
          No photos
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug line-clamp-2" style={{ color: "var(--color-foreground)" }}>
            {listing.title}
          </p>
          <PublishStatusBadge status={listing.publish_status} />
        </div>

        {location && (
          <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
            {location}
          </p>
        )}

        <p className="text-sm font-medium" style={{ color: "var(--color-deep-green)" }}>
          {formatPrice(listing.price, listing.currency)}
        </p>

        {/* Specs chips */}
        <div className="flex flex-wrap gap-1">
          {listing.bedrooms != null && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-muted)" }}
            >
              {listing.bedrooms} bed
            </span>
          )}
          {listing.bathrooms != null && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-muted)" }}
            >
              {listing.bathrooms} bath
            </span>
          )}
          {listing.property_size_sqm != null && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-muted)" }}
            >
              {listing.property_size_sqm} m²
            </span>
          )}
          {needsAttention && (
            <span
              className="px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: "var(--color-amber-muted)", color: "var(--color-amber)" }}
            >
              Needs attention
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
