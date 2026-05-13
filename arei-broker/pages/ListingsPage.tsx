import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgency } from "../app";
import { getBrokerListings } from "../brokerData";
import ListingCard from "../components/ListingCard";
import ListingForm from "../components/ListingForm";
import type { BrokerListing, PilotPublishStatus } from "../types";

type FilterTab = "all" | PilotPublishStatus | "sold_inactive";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "ready_for_review", label: "For Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Not Published" },
];

export default function ListingsPage() {
  const { agency } = useAgency();
  const navigate = useNavigate();
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    getBrokerListings(agency.id)
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    activeTab === "all"
      ? listings
      : listings.filter((l) => l.publish_status === activeTab);

  function handleCreated(listing: BrokerListing) {
    setListings((prev) => [listing, ...prev]);
    setShowCreateForm(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Your Listings
        </h1>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 text-sm font-medium"
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
        className="flex gap-1 mb-5 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              background: activeTab === tab.value ? "var(--color-deep-green)" : "transparent",
              color:
                activeTab === tab.value
                  ? "var(--color-deep-green-foreground)"
                  : "var(--color-foreground-muted)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      ) : listings.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm mb-3" style={{ color: "var(--color-foreground-muted)" }}>
            No listings yet. Add your first listing to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--color-deep-green)",
              color: "var(--color-deep-green-foreground)",
            }}
          >
            + Add listing
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
          No listings match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => navigate(`/listings/${listing.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showCreateForm && agency && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateForm(false);
          }}
        >
          <div
            className="w-full max-w-xl rounded-lg p-6 max-h-[80vh] overflow-y-auto"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
            }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
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
    </div>
  );
}
