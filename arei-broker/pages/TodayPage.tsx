import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgency } from "../app";
import { getBrokerListings, getLeads } from "../brokerData";
import ListingForm from "../components/ListingForm";
import type { BrokerListing, Lead } from "../types";

function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(isoDate).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function isFollowUpDue(lead: Lead): boolean {
  if (!lead.follow_up_date) return false;
  return new Date(lead.follow_up_date) <= new Date();
}

interface SectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
}

function Section({ title, count, children }: SectionProps) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-foreground-muted)" }}
        >
          {title}
        </h2>
        {count != null && count > 0 && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: "var(--color-deep-green)",
              color: "var(--color-deep-green-foreground)",
              minWidth: "1.25rem",
              textAlign: "center",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function TodayPage() {
  const { agency } = useAgency();
  const navigate = useNavigate();
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddListing, setShowAddListing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    Promise.all([getBrokerListings(agency.id), getLeads(agency.id)])
      .then(([lst, lds]) => {
        setListings(lst);
        setLeads(lds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const newLeads = leads.filter((l) => l.status === "new");
  const followUps = leads.filter((l) => l.status !== "new" && isFollowUpDue(l));
  const attentionListings = listings.filter(
    (l) => l.publish_status === "draft" || l.publish_status === "rejected"
  );

  const agencySlug = agency?.agency_name.toLowerCase().replace(/\s+/g, "-") ?? "";
  const agencyLink = `https://listo.arei.io/${agencySlug}`;

  function handleCopyLink() {
    navigator.clipboard
      .writeText(agencyLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(console.error);
  }

  function listingTitle(listingId: string | null): string | undefined {
    if (!listingId) return undefined;
    return listings.find((l) => l.id === listingId)?.title;
  }

  const dateLabel = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      </div>
    );
  }

  const allClear = newLeads.length === 0 && followUps.length === 0 && attentionListings.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-7">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Today
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          {dateLabel}
        </p>
      </div>

      {/* New leads */}
      <Section title="New leads" count={newLeads.length}>
        {newLeads.length === 0 ? (
          <p className="text-sm py-2" style={{ color: "var(--color-foreground-subtle)" }}>
            No new leads yet.
          </p>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {newLeads.slice(0, 5).map((lead, i) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => navigate("/leads")}
                className="w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors"
                style={{
                  background: "var(--color-surface-1)",
                  borderBottom:
                    i < Math.min(newLeads.length, 5) - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                {/* Status dot */}
                <div
                  className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full"
                  style={{ background: "var(--color-deep-green)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-medium text-sm"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {lead.buyer_name || "Anonymous"}
                    </span>
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "var(--color-foreground-subtle)" }}
                    >
                      {relativeDate(lead.created_at)}
                    </span>
                  </div>
                  {listingTitle(lead.listing_id) && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--color-foreground-muted)" }}
                    >
                      {listingTitle(lead.listing_id)}
                    </p>
                  )}
                  {lead.message && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "var(--color-foreground-subtle)" }}
                    >
                      {lead.message}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {newLeads.length > 5 && (
              <button
                type="button"
                onClick={() => navigate("/leads")}
                className="w-full text-center px-4 py-3 text-sm"
                style={{
                  background: "var(--color-surface-2)",
                  color: "var(--color-foreground-muted)",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                View all {newLeads.length} new leads →
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Follow-ups due */}
      {followUps.length > 0 && (
        <Section title="Follow-ups due" count={followUps.length}>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {followUps.slice(0, 4).map((lead, i) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => navigate("/leads")}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                style={{
                  background: "var(--color-surface-1)",
                  borderBottom:
                    i < Math.min(followUps.length, 4) - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm" style={{ color: "var(--color-foreground)" }}>
                    {lead.buyer_name || "Anonymous"}
                  </span>
                  {lead.follow_up_date && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-red)" }}>
                      Follow-up{" "}
                      {new Date(lead.follow_up_date) < new Date() ? "overdue" : "due today"}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs px-2 py-1 rounded flex-shrink-0"
                  style={{
                    background: "var(--color-red-muted)",
                    color: "var(--color-red)",
                  }}
                >
                  Due
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Listings needing attention */}
      {attentionListings.length > 0 && (
        <Section title="Listings needing attention" count={attentionListings.length}>
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {attentionListings.slice(0, 4).map((listing, i) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => navigate(`/listings/${listing.id}`)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                style={{
                  background: "var(--color-surface-1)",
                  borderBottom:
                    i < Math.min(attentionListings.length, 4) - 1
                      ? "1px solid var(--color-border)"
                      : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span
                    className="font-medium text-sm truncate block"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {listing.title}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                    {listing.publish_status === "rejected"
                      ? "Not published — contact AREI for details"
                      : "Draft — complete and submit for review"}
                  </p>
                </div>
                <span
                  className="text-xs flex-shrink-0 px-2 py-0.5 rounded font-medium"
                  style={{
                    background:
                      listing.publish_status === "rejected"
                        ? "var(--color-red-muted)"
                        : "var(--color-surface-3)",
                    color:
                      listing.publish_status === "rejected"
                        ? "var(--color-red)"
                        : "var(--color-foreground-muted)",
                  }}
                >
                  {listing.publish_status === "rejected" ? "Not published" : "Draft"}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* All clear state */}
      {allClear && (
        <div
          className="rounded-lg px-5 py-6 text-center"
          style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
            All clear
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-foreground-muted)" }}>
            No new leads or items needing attention.
          </p>
        </div>
      )}

      {/* Quick actions */}
      <Section title="Quick actions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setShowAddListing(true)}
            className="px-4 py-3.5 text-sm font-medium text-left rounded-lg"
            style={{
              background: "var(--color-deep-green)",
              color: "var(--color-deep-green-foreground)",
            }}
          >
            + Add listing
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-3.5 text-sm text-left rounded-lg transition-colors"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
              color: copied ? "var(--color-green)" : "var(--color-foreground-muted)",
            }}
          >
            {copied ? "✓ Link copied!" : "Copy agency page link"}
          </button>
          {agency?.whatsapp && (
            <a
              href={`https://wa.me/${agency.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3.5 text-sm text-left rounded-lg"
              style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground-muted)",
                display: "block",
              }}
            >
              Open WhatsApp
            </a>
          )}
        </div>
      </Section>

      {/* Viewings placeholder */}
      <div
        className="rounded-lg px-4 py-3.5 flex items-center justify-between gap-3"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-foreground-muted)" }}>
            Viewings
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-subtle)" }}>
            Schedule and track property viewings from leads
          </p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded flex-shrink-0"
          style={{
            background: "var(--color-surface-3)",
            color: "var(--color-foreground-subtle)",
          }}
        >
          Coming soon
        </span>
      </div>

      {/* Add listing modal */}
      {showAddListing && agency && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddListing(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-lg p-4 sm:p-6 max-h-[90vh] sm:max-h-[80vh] overflow-y-auto"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ color: "var(--color-foreground)" }}
            >
              Add listing
            </h2>
            <ListingForm
              agencyId={agency.id}
              marketCode={agency.market_code}
              onSave={(listing) => {
                setListings((prev) => [listing, ...prev]);
                setShowAddListing(false);
                navigate(`/listings/${listing.id}`);
              }}
              onCancel={() => setShowAddListing(false)}
              mode="create"
            />
          </div>
        </div>
      )}
    </div>
  );
}
