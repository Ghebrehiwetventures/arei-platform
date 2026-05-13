import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgency } from "../app";
import { getBrokerListings, getLeads } from "../brokerData";
import ListingForm from "../components/ListingForm";
import ShareSheet from "../components/ShareSheet";
import { PublishStatusBadge } from "../components/StatusBadge";
import type { BrokerListing, Lead, PilotPublishStatus } from "../types";

type FilterTab = "all" | PilotPublishStatus;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "ready_for_review", label: "For Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Not Published" },
];

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "Price on request";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ListingsPage() {
  const { agency } = useAgency();
  const navigate = useNavigate();
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [shareTarget, setShareTarget] = useState<BrokerListing | null>(null);

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

  // Lead count per listing
  const leadCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.listing_id) map[l.listing_id] = (map[l.listing_id] ?? 0) + 1;
    });
    return map;
  }, [leads]);

  // Filter counts
  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: listings.length,
      draft: 0,
      ready_for_review: 0,
      published: 0,
      rejected: 0,
    };
    listings.forEach((l) => {
      counts[l.publish_status]++;
    });
    return counts;
  }, [listings]);

  const filtered =
    activeTab === "all" ? listings : listings.filter((l) => l.publish_status === activeTab);

  const agencySlug = agency?.agency_name.toLowerCase().replace(/\s+/g, "-") ?? "";

  function handleCreated(listing: BrokerListing) {
    setListings((prev) => [listing, ...prev]);
    setShowCreateForm(false);
    navigate(`/listings/${listing.id}`);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Listings
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 text-sm font-medium rounded"
          style={{
            background: "var(--color-deep-green)",
            color: "var(--color-deep-green-foreground)",
          }}
        >
          + Add listing
        </button>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-1 mb-4 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0.625rem" }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              background:
                activeTab === tab.value ? "var(--color-deep-green)" : "transparent",
              color:
                activeTab === tab.value
                  ? "var(--color-deep-green-foreground)"
                  : "var(--color-foreground-muted)",
            }}
          >
            {tab.label}
            {tabCounts[tab.value] > 0 && (
              <span
                className="ml-1.5 text-xs"
                style={{
                  opacity: activeTab === tab.value ? 0.8 : 0.6,
                }}
              >
                ({tabCounts[tab.value]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      ) : listings.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm mb-3" style={{ color: "var(--color-foreground-muted)" }}>
            No listings yet. Add your first listing to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium rounded"
            style={{
              background: "var(--color-deep-green)",
              color: "var(--color-deep-green-foreground)",
            }}
          >
            + Add listing
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm py-2" style={{ color: "var(--color-foreground-muted)" }}>
          No listings match this filter.
        </p>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {filtered.map((listing, i) => {
            const leadCount = leadCountMap[listing.id] ?? 0;
            const location = [listing.island, listing.city].filter(Boolean).join(", ");
            const firstImage = listing.image_urls?.[0] ?? null;

            return (
              <div
                key={listing.id}
                className="flex items-center gap-3 px-3 py-3 sm:px-4"
                style={{
                  background: "var(--color-surface-1)",
                  borderBottom:
                    i < filtered.length - 1 ? "1px solid var(--color-border)" : undefined,
                }}
              >
                {/* Thumbnail — tappable */}
                <button
                  type="button"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                  className="flex-shrink-0"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  {firstImage ? (
                    <img
                      src={firstImage}
                      alt=""
                      className="w-12 h-12 object-cover rounded"
                      style={{ border: "1px solid var(--color-border)" }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded flex items-center justify-center text-xs"
                      style={{
                        background: "var(--color-surface-3)",
                        color: "var(--color-foreground-subtle)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      –
                    </div>
                  )}
                </button>

                {/* Main info — tappable */}
                <button
                  type="button"
                  onClick={() => navigate(`/listings/${listing.id}`)}
                  className="flex-1 min-w-0 text-left py-0.5"
                >
                  <p
                    className="font-medium text-sm leading-snug truncate"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {listing.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--color-deep-green)" }}
                    >
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                    {location && (
                      <>
                        <span style={{ color: "var(--color-border-strong, var(--color-border))" }}>
                          ·
                        </span>
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--color-foreground-muted)" }}
                        >
                          {location}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <PublishStatusBadge status={listing.publish_status} />
                    {leadCount > 0 && (
                      <span
                        className="text-xs"
                        style={{ color: "var(--color-foreground-subtle)" }}
                      >
                        {leadCount} lead{leadCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-foreground-subtle)" }}
                    >
                      {relativeDate(listing.updated_at)}
                    </span>
                  </div>
                </button>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareTarget(listing);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-foreground-muted)",
                    }}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/listings/${listing.id}`)}
                    className="px-2.5 py-1.5 text-xs rounded"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-foreground-muted)",
                    }}
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && agency && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-16 px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateForm(false);
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
              onSave={handleCreated}
              onCancel={() => setShowCreateForm(false)}
              mode="create"
            />
          </div>
        </div>
      )}

      {/* Share sheet */}
      {shareTarget && (
        <ShareSheet
          listing={shareTarget}
          agencySlug={agencySlug}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
