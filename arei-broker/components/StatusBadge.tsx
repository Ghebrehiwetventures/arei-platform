import type { LeadStatus, PilotPublishStatus } from "../types";

const PUBLISH_STATUS_LABELS: Record<PilotPublishStatus, string> = {
  draft: "Draft",
  ready_for_review: "For Review",
  published: "Published",
  rejected: "Not Published",
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  viewing_booked: "Viewing Booked",
  negotiating: "Negotiating",
  lost: "Lost",
  closed: "Closed",
};

interface BadgeProps {
  className?: string;
}

interface PublishStatusBadgeProps extends BadgeProps {
  status: PilotPublishStatus;
}

interface LeadStatusBadgeProps extends BadgeProps {
  status: LeadStatus;
}

export function PublishStatusBadge({ status, className = "" }: PublishStatusBadgeProps) {
  let style: React.CSSProperties;

  switch (status) {
    case "draft":
      style = {
        background: "var(--color-surface-3)",
        color: "var(--color-foreground-muted)",
      };
      break;
    case "ready_for_review":
      style = {
        background: "var(--color-amber-muted)",
        color: "var(--color-amber)",
      };
      break;
    case "published":
      style = {
        background: "var(--color-green-muted)",
        color: "var(--color-green)",
      };
      break;
    case "rejected":
      style = {
        background: "var(--color-red-muted)",
        color: "var(--color-red)",
      };
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 ${className}`}
      style={{
        ...style,
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderRadius: "2px",
      }}
    >
      {PUBLISH_STATUS_LABELS[status]}
    </span>
  );
}

export function LeadStatusBadge({ status, className = "" }: LeadStatusBadgeProps) {
  let style: React.CSSProperties;

  switch (status) {
    case "new":
      style = {
        background: "var(--color-accent-muted)",
        color: "var(--color-deep-green)",
      };
      break;
    case "contacted":
      style = { background: "#dbeafe", color: "#1e40af" };
      break;
    case "viewing_booked":
      style = {
        background: "var(--color-deep-green-muted)",
        color: "var(--color-deep-green)",
      };
      break;
    case "negotiating":
      style = {
        background: "var(--color-amber-muted)",
        color: "var(--color-amber)",
      };
      break;
    case "lost":
      style = {
        background: "var(--color-surface-3)",
        color: "var(--color-foreground-muted)",
      };
      break;
    case "closed":
      style = {
        background: "var(--color-green-muted)",
        color: "var(--color-green)",
      };
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 ${className}`}
      style={{
        ...style,
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderRadius: "2px",
      }}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
