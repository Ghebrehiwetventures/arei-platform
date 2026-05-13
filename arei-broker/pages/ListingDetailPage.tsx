import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBrokerListing, submitListingForReview, computeListingHints, isReadyForReview } from "../brokerData";
import { PublishStatusBadge } from "../components/StatusBadge";
import ListingForm from "../components/ListingForm";
import ShareSheet from "../components/ShareSheet";
import { useAgency } from "../app";
import type { BrokerListing } from "../types";

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agency } = useAgency();
  const [listing, setListing] = useState<BrokerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getBrokerListing(id)
      .then(setListing)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmitForReview() {
    if (!listing) return;
    setSubmitting(true);
    try {
      const updated = await submitListingForReview(listing.id);
      setListing(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-red)" }}>Listing not found.</p>
      </div>
    );
  }

  const hints = computeListingHints(listing);
  const failedRequired = hints.filter((h) => h.severity === "required" && !h.passed);
  const failedRecommended = hints.filter((h) => h.severity === "recommended" && !h.passed);
  const hasFailedHints = failedRequired.length > 0 || failedRecommended.length > 0;
  const ready = isReadyForReview(listing);

  const agencySlug = agency?.agency_name.toLowerCase().replace(/\s+/g, "-") ?? "";
  const contactPhone = listing?.contact_phone ?? agency?.phone ?? null;
  const waNumber = (contactPhone ?? "").replace(/\D/g, "");
  const waMessage = encodeURIComponent(
    `Hi, I saw your listing for "${listing?.title ?? ""}" — is it still available?`
  );

  return (
    <div
      className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-36 sm:pb-24"
    >
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/listings")}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-foreground-muted)",
        }}
      >
        ← Listings
      </button>

      {editing ? (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
        >
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
            Edit listing
          </h2>
          <ListingForm
            agencyId={listing.agency_id}
            marketCode={listing.market_code}
            initial={listing}
            onSave={(updated) => {
              setListing(updated);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            mode="edit"
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div
            className="rounded-lg p-5"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>
                {listing.title}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PublishStatusBadge status={listing.publish_status} />
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="px-3 py-1"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground-muted)",
                    background: "var(--color-surface-2)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    borderRadius: "2px",
                  }}
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Photos */}
            {listing.image_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                {listing.image_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="h-32 w-auto rounded object-cover flex-shrink-0"
                    style={{ border: "1px solid var(--color-border)" }}
                  />
                ))}
              </div>
            )}

            {/* Details */}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt style={{ color: "var(--color-foreground-subtle)" }}>Price</dt>
                <dd className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  {formatPrice(listing.price, listing.currency)}
                </dd>
              </div>
              {listing.property_type && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>Type</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.property_type}</dd>
                </div>
              )}
              {listing.island && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>Island</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.island}</dd>
                </div>
              )}
              {listing.city && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>City</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.city}</dd>
                </div>
              )}
              {listing.bedrooms != null && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>Bedrooms</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.bedrooms}</dd>
                </div>
              )}
              {listing.bathrooms != null && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>Bathrooms</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.bathrooms}</dd>
                </div>
              )}
              {listing.property_size_sqm != null && (
                <div>
                  <dt style={{ color: "var(--color-foreground-subtle)" }}>Size</dt>
                  <dd style={{ color: "var(--color-foreground)" }}>{listing.property_size_sqm} m²</dd>
                </div>
              )}
            </dl>

            {listing.description && (
              <div className="mt-4">
                <p
                  className="mb-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-foreground-muted)",
                  }}
                >
                  Description
                </p>
                <p className="text-sm" style={{ color: "var(--color-foreground)" }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* Contact */}
            {(listing.contact_name || listing.contact_email || listing.contact_phone) && (
              <div
                className="mt-4 pt-4"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <p
                  className="mb-1"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-foreground-muted)",
                  }}
                >
                  Contact
                </p>
                <div className="text-sm space-y-0.5">
                  {listing.contact_name && (
                    <p style={{ color: "var(--color-foreground)" }}>{listing.contact_name}</p>
                  )}
                  {listing.contact_email && (
                    <p style={{ color: "var(--color-foreground-muted)" }}>{listing.contact_email}</p>
                  )}
                  {listing.contact_phone && (
                    <p style={{ color: "var(--color-foreground-muted)" }}>{listing.contact_phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Listing tips — only if there are failures */}
          {hasFailedHints && (
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                Listing tips
              </p>
              {failedRequired.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: "var(--color-foreground-muted)" }}>
                    Needs attention
                  </p>
                  {failedRequired.map((h) => (
                    <p key={h.id} className="text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
                      • {h.detail ?? h.label}
                    </p>
                  ))}
                </div>
              )}
              {failedRecommended.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium" style={{ color: "var(--color-foreground-muted)" }}>
                    Optional improvements
                  </p>
                  {failedRecommended.map((h) => (
                    <p key={h.id} className="text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
                      • {h.detail ?? h.label}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status actions */}
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <p
              className="mb-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-foreground-muted)",
              }}
            >
              Publication status
            </p>
            {listing.publish_status === "draft" && ready && (
              <div className="flex items-center gap-3">
                <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
                  Your listing looks good — ready to submit.
                </p>
                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="px-4 py-1.5 text-sm font-medium"
                  style={{
                    background: "var(--color-foreground)",
                    color: "var(--color-surface-1)",
                    opacity: submitting ? 0.6 : 1,
                    borderRadius: "2px",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit for review"}
                </button>
              </div>
            )}
            {listing.publish_status === "draft" && !ready && (
              <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
                Complete the required fields above before submitting for review.
              </p>
            )}
            {listing.publish_status === "ready_for_review" && (
              <p className="text-sm" style={{ color: "var(--color-amber)" }}>
                Submitted for review — AREI will review and publish shortly.
              </p>
            )}
            {listing.publish_status === "published" && (
              <p className="text-sm font-medium" style={{ color: "var(--color-green)" }}>
                Published — This listing is live on the AREI index.
              </p>
            )}
            {listing.publish_status === "rejected" && (
              <p className="text-sm" style={{ color: "var(--color-red)" }}>
                Not published — Please contact AREI for more information.
              </p>
            )}
          </div>

          {/* Public preview */}
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                Preview
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: "var(--color-surface-3)", color: "var(--color-foreground-subtle)" }}
              >
                Preview only
              </span>
            </div>
            <div
              className="rounded p-3 flex gap-3"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
              }}
            >
              {listing.image_urls[0] ? (
                <img
                  src={listing.image_urls[0]}
                  alt={listing.title}
                  className="w-20 h-16 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div
                  className="w-20 h-16 rounded flex-shrink-0 flex items-center justify-center text-xs"
                  style={{ background: "var(--color-surface-3)", color: "var(--color-foreground-subtle)" }}
                >
                  No photo
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                  {listing.title}
                </p>
                {(listing.island || listing.city) && (
                  <p className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>
                    {[listing.island, listing.city].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="text-sm font-medium mt-1" style={{ color: "var(--color-deep-green)" }}>
                  {formatPrice(listing.price, listing.currency)}
                </p>
                <div className="flex gap-2 mt-1 text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
                  {listing.bedrooms != null && <span>{listing.bedrooms} bed</span>}
                  {listing.bathrooms != null && <span>{listing.bathrooms} bath</span>}
                  {listing.property_size_sqm != null && <span>{listing.property_size_sqm} m²</span>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Sticky bottom CTA bar ──────────────────────────────────────────────── */}
      {!editing && listing && (
        <div
          className="fixed left-0 right-0 z-20 flex items-center gap-2 px-4 py-3 bottom-14 sm:bottom-0"
          style={{
            background: "var(--color-surface-1)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {/* WhatsApp — primary */}
          {waNumber ? (
            <a
              href={`https://wa.me/${waNumber}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center py-2.5 text-sm font-semibold"
              style={{ background: "#25D366", color: "#ffffff", borderRadius: "2px" }}
            >
              WhatsApp
            </a>
          ) : (
            <div
              className="flex-1 flex items-center justify-center py-2.5 text-sm"
              style={{
                background: "var(--color-surface-3)",
                color: "var(--color-foreground-subtle)",
                borderRadius: "2px",
              }}
            >
              No contact phone
            </div>
          )}

          {/* Call */}
          {contactPhone && (
            <a
              href={`tel:${contactPhone}`}
              className="flex items-center justify-center px-4 py-2.5 text-sm font-medium"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground-muted)",
                borderRadius: "2px",
              }}
            >
              Call
            </a>
          )}

          {/* Share */}
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex items-center justify-center px-4 py-2.5 rounded text-sm font-medium"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground-muted)",
            }}
          >
            Share
          </button>
        </div>
      )}

      {/* Share sheet */}
      {showShare && listing && (
        <ShareSheet
          listing={listing}
          agencySlug={agencySlug}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
