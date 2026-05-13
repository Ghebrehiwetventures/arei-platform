import { useEffect, useState, useCallback } from "react";
import { useAgency } from "../app";
import { getLeads, getBrokerListings, updateLead } from "../brokerData";
import LeadDetail from "../components/LeadDetail";
import type { Lead, LeadStatus, BrokerListing } from "../types";

// ── Pipeline stages ───────────────────────────────────────────────────────────

interface Stage {
  value: LeadStatus | "all";
  label: string;
}

const STAGES: Stage[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing_booked", label: "Viewing" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

const STATUS_COLORS: Record<LeadStatus, { bg: string; fg: string }> = {
  new: { bg: "var(--color-foreground)", fg: "var(--color-surface-1)" },
  contacted: { bg: "var(--color-accent-muted)", fg: "var(--color-deep-green)" },
  viewing_booked: { bg: "var(--color-accent-muted)", fg: "var(--color-deep-green)" },
  negotiating: { bg: "var(--color-amber-muted)", fg: "var(--color-amber)" },
  closed: { bg: "var(--color-green-muted)", fg: "var(--color-green)" },
  lost: { bg: "var(--color-surface-3)", fg: "var(--color-foreground-muted)" },
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  viewing_booked: "Viewing",
  negotiating: "Negotiating",
  closed: "Closed",
  lost: "Lost",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function isOverdue(followUpDate: string | null): boolean {
  if (!followUpDate) return false;
  return new Date(followUpDate) < new Date();
}

function formatFollowUp(followUpDate: string | null): string | null {
  if (!followUpDate) return null;
  const d = new Date(followUpDate);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: LeadStatus }) {
  const { bg, fg } = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-block",
        background: bg,
        color: fg,
        fontFamily: "var(--font-mono)",
        fontSize: "9px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "2px 6px",
        borderRadius: "2px",
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  listingTitle?: string;
  onClick: () => void;
}

function LeadCard({ lead, listingTitle, onClick }: LeadCardProps) {
  const overdue = isOverdue(lead.follow_up_date);
  const followUp = formatFollowUp(lead.follow_up_date);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      style={{
        display: "block",
        padding: "14px 16px",
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        borderRadius: "2px",
        cursor: "pointer",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Name */}
          <p
            className="font-medium text-sm leading-snug"
            style={{ color: "var(--color-foreground)" }}
          >
            {lead.buyer_name || "Anonymous"}
          </p>

          {/* Listing */}
          {listingTitle && (
            <p
              className="mt-0.5 truncate"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--color-foreground-muted)",
                letterSpacing: "0.02em",
              }}
            >
              {listingTitle}
            </p>
          )}

          {/* Message */}
          {lead.message && (
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{
                color: "var(--color-foreground-subtle)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {lead.message}
            </p>
          )}

          {/* Follow-up */}
          {followUp && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "9px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: overdue ? "var(--color-red)" : "var(--color-foreground-subtle)",
                }}
              >
                Follow-up {followUp}
                {overdue && " — Overdue"}
              </span>
            </div>
          )}
        </div>

        {/* Right: status + date */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusPill status={lead.status} />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              color: "var(--color-foreground-subtle)",
            }}
          >
            {relativeDate(lead.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────

interface TableRowProps {
  lead: Lead;
  listingTitle?: string;
  onClick: () => void;
}

function TableRow({ lead, listingTitle, onClick }: TableRowProps) {
  const overdue = isOverdue(lead.follow_up_date);
  const followUp = formatFollowUp(lead.follow_up_date);

  return (
    <tr
      onClick={onClick}
      style={{
        borderBottom: "1px solid var(--color-border)",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background =
          "var(--color-surface-2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
      }}
    >
      {/* Name + message */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <p
          className="font-medium text-sm"
          style={{ color: "var(--color-foreground)" }}
        >
          {lead.buyer_name || "Anonymous"}
        </p>
        {lead.message && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{
              color: "var(--color-foreground-subtle)",
              maxWidth: "260px",
            }}
          >
            {lead.message}
          </p>
        )}
      </td>

      {/* Listing */}
      <td
        style={{
          padding: "12px 16px",
          verticalAlign: "middle",
          maxWidth: "160px",
        }}
      >
        {listingTitle ? (
          <span
            className="truncate block"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-foreground-muted)",
              letterSpacing: "0.02em",
            }}
          >
            {listingTitle}
          </span>
        ) : (
          <span style={{ color: "var(--color-foreground-subtle)", fontSize: "12px" }}>—</span>
        )}
      </td>

      {/* Status */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <StatusPill status={lead.status} />
      </td>

      {/* Follow-up */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        {followUp ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: overdue ? "var(--color-red)" : "var(--color-foreground-muted)",
              letterSpacing: "0.02em",
            }}
          >
            {followUp}
            {overdue && (
              <span
                style={{
                  marginLeft: "6px",
                  background: "var(--color-red-muted)",
                  color: "var(--color-red)",
                  fontSize: "9px",
                  padding: "1px 4px",
                  borderRadius: "2px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Overdue
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: "var(--color-foreground-subtle)", fontSize: "12px" }}>—</span>
        )}
      </td>

      {/* Date */}
      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-foreground-subtle)",
          }}
        >
          {relativeDate(lead.created_at)}
        </span>
      </td>
    </tr>
  );
}

// ── Lead detail modal ─────────────────────────────────────────────────────────

interface LeadModalProps {
  lead: Lead;
  listingTitle?: string;
  onUpdate: (updated: Lead) => void;
  onClose: () => void;
}

function LeadModal({ lead, listingTitle, onUpdate, onClose }: LeadModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-sm max-h-[85vh] overflow-y-auto"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderTopLeftRadius: "4px",
          borderTopRightRadius: "4px",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 sticky top-0"
          style={{
            background: "var(--color-surface-2)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-foreground-muted)",
            }}
          >
            Lead detail
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              color: "var(--color-foreground-muted)",
              fontSize: "14px",
              lineHeight: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <LeadDetail lead={lead} listingTitle={listingTitle} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ── InboxPage ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { agency } = useAgency();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [listings, setListings] = useState<BrokerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  const listingTitle = useCallback(
    (listingId: string | null): string | undefined => {
      if (!listingId) return undefined;
      return listings.find((l) => l.id === listingId)?.title;
    },
    [listings]
  );

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);
  const newCount = leads.filter((l) => l.status === "new").length;

  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Leads
        </h1>
        {newCount > 0 && (
          <span
            className="inline-flex items-center px-2 py-0.5"
            style={{
              background: "var(--color-foreground)",
              color: "var(--color-surface-1)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              borderRadius: "2px",
              letterSpacing: "0.03em",
            }}
          >
            {newCount} new
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-1 mb-4 overflow-x-auto pb-px"
        style={{ scrollbarWidth: "none" }}
      >
        {STAGES.map((stage) => {
          const count =
            stage.value === "all"
              ? leads.length
              : leads.filter((l) => l.status === stage.value).length;
          const active = filter === stage.value;
          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => setFilter(stage.value)}
              style={{
                flexShrink: 0,
                padding: "5px 10px",
                background: active
                  ? "var(--color-foreground)"
                  : "var(--color-surface-1)",
                color: active
                  ? "var(--color-surface-1)"
                  : "var(--color-foreground-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: "2px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: "pointer",
                transition: "background 0.1s, color 0.1s",
                whiteSpace: "nowrap",
              }}
            >
              {stage.label}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: "5px",
                    opacity: active ? 0.7 : 0.5,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {leads.length === 0 ? (
        <div
          className="rounded p-8 text-center"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            No leads yet. Leads appear here when buyers contact you through your listings or agency
            page.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded p-8 text-center"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            No leads in this stage.
          </p>
        </div>
      ) : (
        <>
          {/* ── Desktop table (sm+) ── */}
          <div
            className="hidden sm:block"
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
              borderRadius: "2px",
            }}
          >
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                  }}
                >
                  {["Buyer", "Listing", "Status", "Follow-up", "Added"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 16px",
                        textAlign: "left",
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--color-foreground-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    lead={lead}
                    listingTitle={listingTitle(lead.listing_id)}
                    onClick={() => setSelectedLead(lead)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list (< sm) ── */}
          <div className="sm:hidden flex flex-col gap-2">
            {filtered.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                listingTitle={listingTitle(lead.listing_id)}
                onClick={() => setSelectedLead(lead)}
              />
            ))}
          </div>
        </>
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          listingTitle={listingTitle(selectedLead.listing_id)}
          onUpdate={handleUpdate}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
