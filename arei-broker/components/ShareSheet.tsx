import { useState } from "react";
import type { BrokerListing } from "../types";

interface ShareSheetProps {
  listing: BrokerListing;
  agencySlug: string;
  onClose: () => void;
}

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ShareSheet({ listing, agencySlug, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

  // Construct buyer link (property pack URL — conceptual, routes TBD)
  const listingSlug = listing.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const buyerLink = `https://listo.arei.io/${agencySlug}/${listingSlug}`;

  const waText = [
    `Hi! I'd like to share a property with you:`,
    ``,
    `*${listing.title}*`,
    listing.price ? formatPrice(listing.price, listing.currency) : null,
    [listing.island, listing.city].filter(Boolean).join(", ") || null,
    ``,
    `Full details: ${buyerLink}`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buyerLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  }

  const firstImage = listing.image_urls?.[0] ?? null;
  const location = [listing.island, listing.city].filter(Boolean).join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5 space-y-4"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
              Share property pack
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
              Send one link instead of scattered photos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-sm"
            style={{
              background: "var(--color-surface-3)",
              color: "var(--color-foreground-muted)",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Preview card */}
        <div
          className="rounded-lg overflow-hidden flex gap-3 p-3"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
          }}
        >
          {firstImage ? (
            <img
              src={firstImage}
              alt={listing.title}
              className="w-16 h-16 object-cover rounded flex-shrink-0"
              style={{ border: "1px solid var(--color-border)" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded flex-shrink-0 flex items-center justify-center text-xs"
              style={{
                background: "var(--color-surface-3)",
                color: "var(--color-foreground-subtle)",
                border: "1px solid var(--color-border)",
              }}
            >
              No photo
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="font-medium text-sm leading-snug truncate"
              style={{ color: "var(--color-foreground)" }}
            >
              {listing.title}
            </p>
            {location && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                {location}
              </p>
            )}
            <p className="text-sm font-medium mt-1" style={{ color: "var(--color-deep-green)" }}>
              {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
        </div>

        {/* Link preview */}
        <div
          className="rounded px-3 py-2 text-xs font-mono truncate"
          style={{
            background: "var(--color-surface-3)",
            color: "var(--color-foreground-muted)",
            border: "1px solid var(--color-border)",
          }}
        >
          {buyerLink}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3 text-sm font-medium rounded flex items-center justify-center gap-2"
            style={{
              background: copied ? "var(--color-green-muted)" : "var(--color-surface-2)",
              color: copied ? "var(--color-green)" : "var(--color-foreground)",
              border: `1px solid ${copied ? "transparent" : "var(--color-border)"}`,
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ Buyer link copied!" : "Copy buyer link"}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 text-sm font-medium rounded flex items-center justify-center gap-2"
            style={{
              background: "#25D366",
              color: "#ffffff",
            }}
          >
            Share via WhatsApp
          </a>
        </div>

        {/* Coming soon footnote */}
        <p className="text-xs text-center" style={{ color: "var(--color-foreground-subtle)" }}>
          Property pack links will include your photos, description, and contact details.
          <br />
          Documents and videos — coming soon.
        </p>
      </div>
    </div>
  );
}
