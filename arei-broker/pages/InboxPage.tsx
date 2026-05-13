import { useEffect, useState } from "react";
import { useAgency } from "../app";
import { getLeads, getBrokerListings } from "../brokerData";
import LeadCard from "../components/LeadCard";
import LeadDetail from "../components/LeadDetail";
import type { Lead, LeadStatus, BrokerListing } from "../types";

const STATUS_FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing_booked", label: "Viewing Booked" },
  { value: "negotiating", label: "Negotiating" },
  { value: "lost", label: "Lost" },
  { value: "closed", label: "Closed" },
];

export default function InboxPage() {
  const { agency } = useAgency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    if (!agency) return;
    setLoading(true);
    Promise.all([getLeads(agency.id), getBrokerListings(agency.id)])
      .then(([l, lst]) => {
        setLeads(l);
        setListings(lst);
        if (l.length > 0 && !selectedId) setSelectedId(l[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [agency?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function listingTitle(listingId: string | null): string | undefined {
    if (!listingId) return undefined;
    return listings.find((l) => l.id === listingId)?.title;
  }

  const filtered =
    statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);

  const newCount = leads.filter((l) => l.status === "new").length;
  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
        Inbox{newCount > 0 ? ` (${newCount} new)` : ""}
      </h1>

      {loading ? (
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      ) : leads.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            No leads yet. Leads will appear here when buyers contact you through your listings or
            agency page.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden flex"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-1)",
            minHeight: "60vh",
          }}
        >
          {/* Left panel */}
          <div
            style={{
              width: "320px",
              minWidth: "320px",
              borderRight: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Filter bar */}
            <div
              className="px-3 py-2 flex gap-1 flex-wrap"
              style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-2)" }}
            >
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className="px-2 py-0.5 rounded text-xs transition-colors"
                  style={{
                    background:
                      statusFilter === f.value ? "var(--color-deep-green)" : "transparent",
                    color:
                      statusFilter === f.value
                        ? "var(--color-deep-green-foreground)"
                        : "var(--color-foreground-muted)",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lead list */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {filtered.length === 0 ? (
                <p
                  className="p-4 text-xs text-center"
                  style={{ color: "var(--color-foreground-subtle)" }}
                >
                  No leads for this filter.
                </p>
              ) : (
                filtered.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    listingTitle={listingTitle(lead.listing_id)}
                    selected={selectedId === lead.id}
                    onClick={() => setSelectedId(lead.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {selectedLead ? (
              <LeadDetail
                lead={selectedLead}
                listingTitle={listingTitle(selectedLead.listing_id)}
                onUpdate={handleUpdate}
              />
            ) : (
              <div
                className="h-full flex items-center justify-center"
                style={{ color: "var(--color-foreground-subtle)" }}
              >
                <p className="text-sm">Select a lead to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
