import { useState } from "react";
import { updateLead } from "../brokerData";
import { LeadStatusBadge } from "./StatusBadge";
import type { Lead, LeadStatus } from "../types";

interface LeadDetailProps {
  lead: Lead;
  listingTitle?: string;
  onUpdate: (updated: Lead) => void;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "viewing_booked", label: "Viewing Booked" },
  { value: "negotiating", label: "Negotiating" },
  { value: "lost", label: "Lost" },
  { value: "closed", label: "Closed" },
];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  color: "var(--color-foreground)",
  fontSize: "0.875rem",
};

export default function LeadDetail({ lead, listingTitle, onUpdate }: LeadDetailProps) {
  const [followUpDate, setFollowUpDate] = useState(lead.follow_up_date ?? "");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const buyerName = lead.buyer_name || "Anonymous";

  // Build WhatsApp pre-fill message
  const waMessage = encodeURIComponent(
    `Hello ${buyerName}, thank you for your enquiry${listingTitle ? ` about ${listingTitle}` : ""}. I would be happy to help you with more information.`
  );
  const waNumber = (lead.buyer_whatsapp ?? lead.buyer_phone ?? "").replace(/\D/g, "");

  async function handleStatusChange(status: LeadStatus) {
    setSavingStatus(true);
    try {
      const updated = await updateLead(lead.id, { status });
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSaveFollowUp() {
    setSavingFollowUp(true);
    try {
      const updated = await updateLead(lead.id, {
        follow_up_date: followUpDate || null,
      });
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const updated = await updateLead(lead.id, { notes: notes || null });
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  }

  function handleCopyContact() {
    const parts = [buyerName, lead.buyer_phone, lead.buyer_whatsapp].filter(Boolean);
    navigator.clipboard.writeText(parts.join("\n")).catch(console.error);
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base" style={{ color: "var(--color-foreground)" }}>
            {buyerName}
          </h3>
          {listingTitle && (
            <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
              Re: {listingTitle}
            </p>
          )}
        </div>
        <LeadStatusBadge status={lead.status} />
      </div>

      {/* Contact details */}
      <div
        className="rounded-lg p-3 space-y-1.5 text-sm"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
      >
        {lead.buyer_email && (
          <div className="flex gap-2">
            <span style={{ color: "var(--color-foreground-subtle)", minWidth: "5rem" }}>Email</span>
            <a href={`mailto:${lead.buyer_email}`} style={{ color: "var(--color-deep-green)" }} className="hover:underline">
              {lead.buyer_email}
            </a>
          </div>
        )}
        {lead.buyer_phone && (
          <div className="flex gap-2">
            <span style={{ color: "var(--color-foreground-subtle)", minWidth: "5rem" }}>Phone</span>
            <span style={{ color: "var(--color-foreground)" }}>{lead.buyer_phone}</span>
          </div>
        )}
        {lead.buyer_whatsapp && (
          <div className="flex gap-2">
            <span style={{ color: "var(--color-foreground-subtle)", minWidth: "5rem" }}>WhatsApp</span>
            <span style={{ color: "var(--color-foreground)" }}>{lead.buyer_whatsapp}</span>
          </div>
        )}
      </div>

      {/* Message */}
      {lead.message && (
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-foreground-muted)" }}>
            Message
          </p>
          <p className="text-sm" style={{ color: "var(--color-foreground)" }}>
            {lead.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
            style={{
              background: "var(--color-green-muted)",
              color: "var(--color-green)",
              border: "1px solid rgba(46,125,82,0.2)",
            }}
          >
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={handleCopyContact}
          className="px-3 py-1.5 rounded text-sm"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground-muted)",
          }}
        >
          Copy contact details
        </button>
      </div>

      {/* Status change */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: "var(--color-foreground-muted)" }}>
          Update status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={savingStatus || lead.status === opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className="px-2.5 py-1 rounded text-xs transition-opacity"
              style={{
                background:
                  lead.status === opt.value
                    ? "var(--color-deep-green)"
                    : "var(--color-surface-2)",
                color:
                  lead.status === opt.value
                    ? "var(--color-deep-green-foreground)"
                    : "var(--color-foreground-muted)",
                border: "1px solid var(--color-border)",
                opacity: savingStatus ? 0.6 : 1,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Follow-up date */}
      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-muted)" }}>
          Follow-up date
        </p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={followUpDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFollowUpDate(e.target.value)}
            style={{ ...fieldStyle, width: "auto" }}
          />
          <button
            type="button"
            onClick={handleSaveFollowUp}
            disabled={savingFollowUp}
            className="px-3 py-1.5 rounded text-sm"
            style={{
              background: "var(--color-surface-3)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground-muted)",
              opacity: savingFollowUp ? 0.6 : 1,
            }}
          >
            {savingFollowUp ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-foreground-muted)" }}>
          Notes
        </p>
        <textarea
          rows={3}
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical" }}
          placeholder="Add private notes about this lead…"
        />
        <button
          type="button"
          onClick={handleSaveNotes}
          disabled={savingNotes}
          className="mt-2 px-3 py-1.5 rounded text-sm"
          style={{
            background: "var(--color-surface-3)",
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground-muted)",
            opacity: savingNotes ? 0.6 : 1,
          }}
        >
          {savingNotes ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
