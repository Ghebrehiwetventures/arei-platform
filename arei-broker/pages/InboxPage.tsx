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
  { value: "viewing_booked", label: "Viewing" },
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
  // Mobile: show "list" or "detail" view (desktop always shows both side-by-side)
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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

  // Count per status for filter pills
  function statusCount(value: LeadStatus | "all"): number {
    if (value === "all") return leads.length;
    return leads.filter((l) => l.status === value).length;
  }
  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  function handleSelectLead(id: string) {
    setSelectedId(id);
    setMobileView("detail");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
        Leads{newCount > 0 ? (
          <span
            className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold"
            style={{ background: "var(--color-deep-green)", color: "var(--color-deep-green-foreground)" }}
          >
            {newCount} new
          </span>
        ) : null}
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
          className="rounded-lg overflow-hidden sm:flex"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface-1)",
            minHeight: "60vh",
          }}
        >
          {/* ── Lead list panel ── */}
          {/* Mobile: full-width when mobileView==="list", hidden when mobileView==="detail" */}
          {/* Desktop (sm+): always visible, fixed 320px width */}
          <div
            className={`${mobileView === "detail" ? "hidden sm:flex" : "flex"} flex-col sm:w-80`}
            style={{ borderRight: "1px solid var(--color-border)" }}
          >
            {/* Filter bar */}
            <div
              className="px-3 py-2 flex gap-1 flex-wrap"
              style={{
                borderBottom: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
              }}
            >
              {STATUS_FILTERS.map((f) => {
                const count = statusCount(f.value);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatusFilter(f.value)}
                    className="px-2.5 py-1 rounded text-xs transition-colors"
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
                    {count > 0 && (
                      <span className="ml-1" style={{ opacity: 0.75 }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
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
                    onClick={() => handleSelectLead(lead.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Lead detail panel ── */}
          {/* Mobile: full-width when mobileView==="detail", hidden when mobileView==="list" */}
          {/* Desktop (sm+): always visible, takes remaining flex space */}
          <div
            className={`${mobileView === "list" ? "hidden sm:flex" : "flex"} flex-col flex-1`}
            style={{ overflowY: "auto" }}
          >
            {/* Back button — mobile only */}
            <button
              type="button"
              className="sm:hidden w-full text-left px-4 py-3 text-sm flex-shrink-0"
              style={{
                borderBottom: "1px solid var(--color-border)",
                color: "var(--color-foreground-muted)",
                background: "var(--color-surface-2)",
              }}
              onClick={() => setMobileView("list")}
            >
              ← All leads
            </button>

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
