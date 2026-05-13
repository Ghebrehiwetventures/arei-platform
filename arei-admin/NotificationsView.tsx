import { useEffect, useState, useCallback } from "react";
import {
  AdminNotification,
  NotificationSeverity,
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./data";

// ── Utilities ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Severity dot ───────────────────────────────────────────────────────────

function SeverityDot({ severity }: { severity: NotificationSeverity }) {
  const styles: Record<NotificationSeverity, string> = {
    info:     "bg-surface-3 border border-border",
    warning:  "bg-amber-muted border border-amber/30",
    critical: "bg-[#C44A3A]/15 border border-[#C44A3A]/30",
  };
  return (
    <span
      className={"inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1.5 " + styles[severity]}
      aria-label={severity}
    />
  );
}

// ── Severity label ─────────────────────────────────────────────────────────

function SeverityLabel({ severity }: { severity: NotificationSeverity }) {
  if (severity === "info") return null;
  const styles: Record<NotificationSeverity, string> = {
    info:     "",
    warning:  "bg-amber-muted text-amber",
    critical: "bg-[#C44A3A]/10 text-[#C44A3A]",
  };
  return (
    <span className={"text-[9px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded " + styles[severity]}>
      {severity}
    </span>
  );
}

// ── Single notification row ────────────────────────────────────────────────

function NotificationRow({
  n,
  onRead,
}: {
  n: AdminNotification;
  onRead: (id: string) => void;
}) {
  const [marking, setMarking] = useState(false);
  const unread = n.read_at === null;

  const handleMarkRead = async () => {
    if (!unread || marking) return;
    setMarking(true);
    try {
      await markNotificationRead(n.id);
      onRead(n.id);
    } catch (err) {
      console.error("[Notifications] markNotificationRead failed:", err);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      className={
        "flex gap-3 px-4 py-3 border-b border-border transition-colors duration-100 " +
        (unread ? "bg-background" : "bg-surface-1 opacity-70")
      }
    >
      <SeverityDot severity={n.severity} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={"text-[13px] font-mono leading-snug " + (unread ? "text-foreground font-medium" : "text-foreground-muted font-normal")}>
              {n.title}
            </span>
            <SeverityLabel severity={n.severity} />
          </div>
          <span className="text-[11px] font-mono text-foreground-subtle flex-shrink-0 mt-0.5">
            {timeAgo(n.created_at)}
          </span>
        </div>

        {n.body && (
          <p className="mt-0.5 text-[12px] font-mono text-foreground-muted leading-relaxed">
            {n.body}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-[10px] font-mono text-foreground-subtle uppercase tracking-wider">
            {n.event_type}
          </span>
          {unread && (
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="text-[10px] font-mono text-foreground-subtle hover:text-foreground-muted transition-colors duration-100 disabled:opacity-40"
            >
              {marking ? "marking…" : "mark read"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────

interface NotificationsViewProps {
  onCountChange?: (unreadCount: number) => void;
}

export function NotificationsView({ onCountChange }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAdminNotifications();
      setNotifications(rows);
      const count = rows.filter((n) => n.read_at === null).length;
      onCountChange?.(count);
    } catch (err) {
      setError("Failed to load notifications.");
      console.error("[Notifications] load error:", err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      );
      const count = updated.filter((n) => n.read_at === null).length;
      onCountChange?.(count);
      return updated;
    });
  }, [onCountChange]);

  const handleMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n))
      );
      onCountChange?.(0);
    } catch (err) {
      console.error("[Notifications] markAll failed:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold font-mono text-foreground tracking-tight">
            Notifications
          </h1>
          {!loading && (
            <p className="text-[12px] font-mono text-foreground-muted mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread · ${notifications.length} total`
                : notifications.length === 0
                ? "No notifications yet"
                : `All read · ${notifications.length} total`}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="text-[11px] font-mono text-foreground-muted hover:text-foreground transition-colors duration-100 disabled:opacity-40 border border-border rounded px-2.5 py-1.5"
          >
            {markingAll ? "Marking all read…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="text-[12px] font-mono text-foreground-muted py-8 text-center">
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="text-[12px] font-mono text-[#C44A3A] py-4">
          {error}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-[13px] font-mono text-foreground-muted">No notifications yet.</p>
          <p className="text-[11px] font-mono text-foreground-subtle mt-1">
            Events from ingestion runs and system actions will appear here.
          </p>
        </div>
      )}

      {/* ── List ── */}
      {!loading && !error && notifications.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          {notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onRead={handleRead} />
          ))}
        </div>
      )}

      {/* ── Refresh ── */}
      {!loading && !error && notifications.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={load}
            className="text-[11px] font-mono text-foreground-subtle hover:text-foreground-muted transition-colors duration-100"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
