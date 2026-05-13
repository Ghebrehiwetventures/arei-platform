import { useEffect, useState, useCallback } from "react";
import { useAgency } from "../app";
import { getLeads, getBrokerListings, updateLead } from "../brokerData";
import LeadDetail from "../components/LeadDetail";
import type { Lead, LeadStatus, BrokerListing } from "../types";

// ── Pipeline columns — ordered left → right ───────────────────────────────────

interface PipelineCol {
  value: LeadStatus;
  label: string;
}

const PIPELINE: PipelineCol[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing_booked", label: "Viewing" },
  { value: "negotiating", label: "Negotiating" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

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

// ── Kanban card ───────────────────────────────────────────────────────────────

interface KanbanCardProps {
  lead: Lead;
  listingTitle?: string;
  onClick: () => void;
  onDragStart: () => void;
  isDragging: boolean;
}

function KanbanCard({ lead, listingTitle, onClick, onDragStart, isDragging }: KanbanCardProps) {
  const overdue = isOverdue(lead.follow_up_date);
  const buyerName = lead.buyer_name || "Anonymous";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onClick={onClick}
      className="p-3 space-y-1.5 select-none"
      style={{
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        borderRadius: "2px",
        opacity: isDragging ? 0.45 : 1,
        cursor: "grab",
        transition: "opacity 0.1s",
      }}
    >
      {/* Name */}
      <p className="font-medium text-sm leading-snug" style={{ color: "var(--color-foreground)" }}>
        {buyerName}
      </p>

      {/* Listing */}
      {listingTitle && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-foreground-muted)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {listingTitle}
        </p>
      )}

      {/* Message preview */}
      {lead.message && (
        <p
          className="text-xs leading-relaxed"
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

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-foreground-subtle)",
          }}
        >
          {relativeDate(lead.created_at)}
        </span>
        {overdue && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-red)",
              background: "var(--color-red-muted)",
              padding: "1px 4px",
              borderRadius: "2px",
            }}
          >
            Overdue
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban column ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  col: PipelineCol;
  leads: Lead[];
  onDrop: (status: LeadStatus) => void;
  onCardClick: (lead: Lead) => void;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  listingTitle: (id: string | null) => string | undefined;
}

function KanbanColumn({
  col,
  leads,
  onDrop,
  onCardClick,
  draggingId,
  onDragStart,
  listingTitle,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div className="flex-shrink-0 flex flex-col" style={{ width: "240px" }}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-foreground-muted)",
            fontWeight: 500,
          }}
        >
          {col.label}
        </span>
        {leads.length > 0 && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-foreground-subtle)",
            }}
          >
            {leads.length}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 flex flex-col gap-2 p-2"
        style={{
          background: isOver ? "var(--color-accent-muted)" : "var(--color-surface-2)",
          border: `1px solid ${isOver ? "var(--color-accent)" : "var(--color-border)"}`,
          borderRadius: "2px",
          minHeight: "220px",
          transition: "background 0.1s, border-color 0.1s",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsOver(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          onDrop(col.value);
        }}
      >
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            listingTitle={listingTitle(lead.listing_id)}
            onClick={() => onCardClick(lead)}
            onDragStart={() => onDragStart(lead.id)}
            isDragging={draggingId === lead.id}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ fontSize: "18px", opacity: 0.2 }}>—</span>
          </div>
        )}
      </div>
    </div>
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
      style={{ background: "rgba(0,0,0,0.5)" }}
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
        {/* Modal header */}
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
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

  const leadsInCol = useCallback(
    (status: LeadStatus) => leads.filter((l) => l.status === status),
    [leads]
  );

  async function handleDrop(toStatus: LeadStatus) {
    if (!draggingId) return;
    const lead = leads.find((l) => l.id === draggingId);
    if (!lead || lead.status === toStatus) {
      setDraggingId(null);
      return;
    }
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggingId ? { ...l, status: toStatus } : l))
    );
    setDraggingId(null);
    try {
      await updateLead(draggingId, { status: toStatus });
    } catch (err) {
      console.error(err);
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l))
      );
    }
  }

  function handleUpdate(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  const newCount = leads.filter((l) => l.status === "new").length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 max-w-4xl mx-auto">
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
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-foreground-subtle)",
            letterSpacing: "0.04em",
          }}
        >
          Drag cards to move between stages
        </span>
      </div>

      {leads.length === 0 ? (
        <div
          className="max-w-4xl mx-auto rounded p-8 text-center"
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
      ) : (
        /* Kanban board — horizontally scrollable */
        <div
          className="flex gap-3 overflow-x-auto pb-6"
          style={{ minHeight: "60vh" }}
          onDragEnd={() => setDraggingId(null)}
        >
          {PIPELINE.map((col) => (
            <KanbanColumn
              key={col.value}
              col={col}
              leads={leadsInCol(col.value)}
              onDrop={handleDrop}
              onCardClick={setSelectedLead}
              draggingId={draggingId}
              onDragStart={setDraggingId}
              listingTitle={listingTitle}
            />
          ))}
          {/* Right spacer so last column has breathing room */}
          <div className="flex-shrink-0 w-1" />
        </div>
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
