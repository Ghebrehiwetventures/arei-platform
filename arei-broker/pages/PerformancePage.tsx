import { useEffect, useState } from "react";
import { useAgency } from "../app";
import { getLeads, getBrokerListings } from "../brokerData";
import type { Lead, BrokerListing } from "../types";

interface ListingLeadCount {
  listing: BrokerListing;
  count: number;
}

function StatTile({ label }: { label: string }) {
  return (
    <div
      className="rounded-lg p-4"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        opacity: 0.6,
      }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: "var(--color-foreground-muted)" }}>
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: "var(--color-foreground-subtle)" }}
        >
          —
        </span>
        <span
          className="text-xs mb-1 px-1.5 py-0.5 rounded"
          style={{ background: "var(--color-surface-3)", color: "var(--color-foreground-subtle)" }}
        >
          Coming soon
        </span>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { agency } = useAgency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    Promise.all([getLeads(agency.id), getBrokerListings(agency.id)])
      .then(([l, lst]) => {
        setLeads(l);
        setListings(lst);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group leads by listing_id
  const leadsPerListing: ListingLeadCount[] = listings
    .map((listing) => ({
      listing,
      count: leads.filter((l) => l.listing_id === listing.id).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Performance
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-foreground-muted)" }}>
          Analytics coming soon. Here's a preview of what you'll see.
        </p>
      </div>

      {/* Placeholder stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Listing views this month" />
        <StatTile label="Leads received this month" />
        <StatTile label="WhatsApp clicks" />
        <StatTile label="Contact button clicks" />
      </div>

      {/* Real leads-per-listing summary */}
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-foreground)" }}>
          Leads by listing
        </h2>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
        ) : leadsPerListing.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            No lead activity yet.
          </p>
        ) : (
          <div className="space-y-2">
            {leadsPerListing.map(({ listing, count }) => (
              <div key={listing.id} className="flex items-center justify-between gap-3">
                <p className="text-sm truncate flex-1" style={{ color: "var(--color-foreground)" }}>
                  {listing.title}
                </p>
                <span
                  className="text-xs font-mono font-medium px-2 py-0.5 rounded flex-shrink-0"
                  style={{ background: "var(--color-accent-muted)", color: "var(--color-deep-green)" }}
                >
                  {count} lead{count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
