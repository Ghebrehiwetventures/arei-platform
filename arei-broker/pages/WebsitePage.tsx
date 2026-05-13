import { useEffect, useState } from "react";
import { useAgency } from "../app";
import { getBrokerListings } from "../brokerData";
import type { BrokerListing } from "../types";

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function WebsitePage() {
  const { agency } = useAgency();
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    getBrokerListings(agency.id)
      .then((all) => setListings(all.filter((l) => l.publish_status === "published")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!agency) return null;

  const displayName = agency.public_display_name || agency.agency_name;
  const agencySlug = agency.agency_name.toLowerCase().replace(/\s+/g, "-");
  const waNumber = (agency.whatsapp ?? "").replace(/\D/g, "");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
        Your Agency Page
      </h1>

      {/* URL banner */}
      <div
        className="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
        style={{ background: "var(--color-accent-muted)", border: "1px solid rgba(142,207,191,0.3)" }}
      >
        <div className="text-sm">
          <span style={{ color: "var(--color-foreground-muted)" }}>Your agency page URL will be: </span>
          <span className="font-mono font-medium" style={{ color: "var(--color-deep-green)" }}>
            listo.arei.io/{agencySlug}
          </span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-subtle)" }}
        >
          Shareable link coming soon
        </span>
      </div>

      {/* Preview watermark label */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ background: "var(--color-surface-3)", color: "var(--color-foreground-muted)" }}
        >
          Preview only — this is not the live page
        </span>
      </div>

      {/* Agency profile section */}
      <div
        className="rounded-lg p-5"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start gap-4">
          {/* Logo */}
          {agency.logo_url ? (
            <img
              src={agency.logo_url}
              alt={displayName}
              className="w-16 h-16 rounded object-contain flex-shrink-0"
              style={{ border: "1px solid var(--color-border)" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold"
              style={{
                background: "var(--color-deep-green-muted)",
                color: "var(--color-deep-green)",
                border: "1px solid var(--color-border)",
              }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
              {displayName}
            </h2>
            {agency.description && (
              <p className="mt-1 text-sm" style={{ color: "var(--color-foreground-muted)" }}>
                {agency.description}
              </p>
            )}

            {/* Contact buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              {agency.email && (
                <a
                  href={`mailto:${agency.email}`}
                  className="inline-flex items-center px-3 py-1.5 rounded text-sm"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground-muted)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  Email us
                </a>
              )}
              {agency.phone && (
                <a
                  href={`tel:${agency.phone}`}
                  className="inline-flex items-center px-3 py-1.5 rounded text-sm"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground-muted)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  {agency.phone}
                </a>
              )}
              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
                  style={{
                    background: "var(--color-green-muted)",
                    color: "var(--color-green)",
                    border: "1px solid rgba(46,125,82,0.2)",
                  }}
                >
                  Contact us on WhatsApp
                </a>
              )}
              {agency.website && (
                <a
                  href={agency.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded text-sm"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground-muted)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active listings */}
      <div>
        <h3 className="text-base font-semibold mb-3" style={{ color: "var(--color-foreground)" }}>
          Active Listings
        </h3>
        {loading ? (
          <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
        ) : listings.length === 0 ? (
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
              No published listings yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="rounded-lg overflow-hidden"
                style={{
                  background: "var(--color-surface-1)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {listing.image_urls[0] ? (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={listing.image_urls[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className="h-32 flex items-center justify-center text-xs"
                    style={{
                      background: "var(--color-surface-3)",
                      color: "var(--color-foreground-subtle)",
                    }}
                  >
                    No photo
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                    {listing.title}
                  </p>
                  {(listing.island || listing.city) && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                      {[listing.island, listing.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="text-sm font-medium mt-1" style={{ color: "var(--color-deep-green)" }}>
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
