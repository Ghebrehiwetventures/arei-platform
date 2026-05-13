import { LeadStatusBadge } from "./StatusBadge";
import type { Lead } from "../types";

interface LeadCardProps {
  lead: Lead;
  listingTitle?: string;
  selected?: boolean;
  onClick: () => void;
}

function relativeDate(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function isOverdue(followUpDate: string | null): boolean {
  if (!followUpDate) return false;
  return new Date(followUpDate) < new Date();
}

export default function LeadCard({ lead, listingTitle, selected = false, onClick }: LeadCardProps) {
  const buyerName = lead.buyer_name || "Anonymous";
  const messagePreview = lead.message ? lead.message.slice(0, 80) + (lead.message.length > 80 ? "…" : "") : null;
  const overdue = isOverdue(lead.follow_up_date);

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition-colors"
      style={{
        background: selected ? "var(--color-accent-muted)" : "var(--color-surface-1)",
        borderBottom: "1px solid var(--color-border)",
        borderLeft: selected ? "3px solid var(--color-deep-green)" : "3px solid transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm" style={{ color: "var(--color-foreground)" }}>
          {buyerName}
        </span>
        <LeadStatusBadge status={lead.status} />
      </div>

      {listingTitle && (
        <p
          className="mt-0.5 text-xs truncate"
          style={{ color: "var(--color-foreground-muted)" }}
        >
          {listingTitle}
        </p>
      )}

      {messagePreview && (
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "var(--color-foreground-subtle)" }}
        >
          {messagePreview}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
          {relativeDate(lead.created_at)}
        </span>
        {overdue && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: "var(--color-red-muted)", color: "var(--color-red)" }}
          >
            Follow up overdue
          </span>
        )}
      </div>
    </button>
  );
}
