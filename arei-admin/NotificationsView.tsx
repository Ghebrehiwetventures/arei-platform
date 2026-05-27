import { useEffect, useState, useCallback } from "react";
import { supabaseAuth } from "./supabase";
import {
  AdminNotification,
  AdminSignalDigest,
  AdminSignalEvent,
  AdminSignalMetric,
  AdminSignalTone,
  NotificationSeverity,
  getAdminSignalDigest,
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

function formatCount(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

function toneClasses(tone: AdminSignalTone): string {
  const styles: Record<AdminSignalTone, string> = {
    ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    info: "border-border bg-surface-1 text-foreground-muted",
    warning: "border-amber/30 bg-amber-muted text-amber",
    critical: "border-[#C44A3A]/30 bg-[#C44A3A]/10 text-[#C44A3A]",
  };
  return styles[tone];
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MarketingSummary {
  posts7d: number;
  pending: number;
  failed: number;
  latestPosts: Array<{
    id: string;
    listing_id: string;
    permalink: string | null;
    image_urls: string[];
    published_at: string;
  }>;
  latestQueue: Array<{
    id: string;
    listing_id: string;
    listing_title: string | null;
    scheduled_at: string;
    status: "pending" | "published" | "failed";
    permalink: string | null;
    error_message: string | null;
    image_urls: string[];
  }>;
}

async function getMarketingSummary(): Promise<MarketingSummary | null> {
  try {
    const headers: Record<string, string> = {
      ...(await authHeaders()) as Record<string, string>,
      "Content-Type": "application/json",
    };
    const res = await fetch("/api/social-listing", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "summary" }),
    });
    if (!res.ok) {
      console.warn("[Notifications] marketing summary failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("[Notifications] marketing summary unavailable:", err);
    return null;
  }
}

function mergeMarketingDigest(digest: AdminSignalDigest, marketing: MarketingSummary | null): AdminSignalDigest {
  if (!marketing) return digest;

  const latestPost = marketing.latestPosts[0];
  const latestQueue = marketing.latestQueue[0];
  const queueTone: AdminSignalTone = marketing.failed > 0 ? "critical" : marketing.pending > 0 ? "warning" : "ok";
  const marketingMetric: AdminSignalMetric = {
    key: "instagram",
    label: "Instagram",
    value: formatCount(marketing.posts7d),
    detail: `${marketing.pending} queued · ${marketing.failed} failed${latestPost ? ` · latest ${timeAgo(latestPost.published_at)}` : ""}`,
    tone: marketing.failed > 0 ? "critical" : marketing.posts7d > 0 ? "ok" : "info",
  };
  const queueMetric: AdminSignalMetric = {
    key: "marketing-queue",
    label: "Marketing queue",
    value: marketing.failed > 0 ? `${marketing.failed} failed` : `${marketing.pending} pending`,
    detail: latestQueue ? `${latestQueue.status} · ${timeAgo(latestQueue.scheduled_at)}` : "No queued work",
    tone: queueTone,
  };

  const events: AdminSignalEvent[] = [
    ...digest.events,
    ...marketing.latestPosts.map((post) => ({
      id: `instagram-post-${post.id}`,
      category: "Instagram published",
      title: post.listing_id,
      body: `${post.image_urls?.length ?? 0} images`,
      at: post.published_at,
      tone: "ok" as AdminSignalTone,
      href: post.permalink ?? undefined,
    })),
    ...marketing.latestQueue
      .filter((item) => item.status !== "published")
      .map((item) => ({
        id: `marketing-queue-${item.id}`,
        category: item.status === "failed" ? "Instagram failed" : "Instagram scheduled",
        title: item.listing_title || item.listing_id,
        body: item.error_message || `${item.image_urls?.length ?? 0} images`,
        at: item.scheduled_at,
        tone: item.status === "failed" ? "critical" as AdminSignalTone : "warning" as AdminSignalTone,
        href: item.permalink ?? undefined,
      })),
  ];

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    ...digest,
    metrics: [marketingMetric, queueMetric, ...digest.metrics],
    events: events.slice(0, 14),
  };
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

function SignalMetricCard({ metric }: { metric: AdminSignalMetric }) {
  return (
    <div className="border border-border rounded-lg bg-surface-1 p-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
          {metric.label}
        </span>
        <span className={"w-2 h-2 rounded-full border flex-shrink-0 " + toneClasses(metric.tone)} />
      </div>
      <div className="mt-2 text-[22px] font-mono font-semibold text-foreground leading-none truncate">
        {metric.value}
      </div>
      <div className="mt-2 text-[11px] font-mono text-foreground-muted leading-snug">
        {metric.detail}
      </div>
    </div>
  );
}

function SignalEventRow({ event }: { event: AdminSignalEvent }) {
  const content = (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <span className={"inline-block w-2 h-2 rounded-full border flex-shrink-0 mt-1.5 " + toneClasses(event.tone)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle truncate">
              {event.category}
            </div>
            <div className="mt-0.5 text-[13px] font-mono text-foreground leading-snug truncate">
              {event.title}
            </div>
          </div>
          <span className="text-[11px] font-mono text-foreground-subtle flex-shrink-0">
            {timeAgo(event.at)}
          </span>
        </div>
        {event.body && (
          <p className="mt-0.5 text-[12px] font-mono text-foreground-muted leading-relaxed truncate">
            {event.body}
          </p>
        )}
      </div>
    </div>
  );

  if (!event.href) return content;
  return (
    <a href={event.href} target="_blank" rel="noreferrer" className="block hover:bg-surface-2 transition-colors duration-100">
      {content}
    </a>
  );
}

function SignalDigestPanel({ digest }: { digest: AdminSignalDigest | null }) {
  if (!digest) {
    return (
      <div className="border border-border rounded-lg bg-surface-1 p-4">
        <p className="text-sm font-mono text-foreground-muted">Operational signals are loading.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-mono uppercase tracking-wider text-foreground-muted">
            Operations
          </h2>
          <p className="text-[11px] font-mono text-foreground-subtle mt-1">
            Listings, data health, articles and marketing output.
          </p>
        </div>
        <span className="text-[11px] font-mono text-foreground-subtle">
          {timeAgo(digest.generatedAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {digest.metrics.map((metric) => (
          <SignalMetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-surface-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-subtle">
            Relevant activity
          </span>
        </div>
        {digest.events.length > 0 ? (
          digest.events.map((event) => <SignalEventRow key={event.id} event={event} />)
        ) : (
          <div className="px-4 py-6 text-[12px] font-mono text-foreground-muted">
            No recent cross-system activity found.
          </div>
        )}
      </div>
    </section>
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

        <div className="mt-1.5 flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-foreground-subtle uppercase tracking-wider truncate">
            {n.event_type}
          </span>
          {unread && (
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="flex-shrink-0 text-[10px] font-mono text-foreground-subtle hover:text-foreground-muted transition-colors duration-100 disabled:opacity-40"
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
  const [digest, setDigest] = useState<AdminSignalDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, baseDigest, marketing] = await Promise.all([
        getAdminNotifications(),
        getAdminSignalDigest(),
        getMarketingSummary(),
      ]);
      setNotifications(rows);
      setDigest(mergeMarketingDigest(baseDigest, marketing));
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
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground font-mono">
            Notifications
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            {loading
              ? "Loading…"
              : unreadCount > 0
              ? `${unreadCount} unread · ${notifications.length} total`
              : notifications.length === 0
              ? "System events will appear here."
              : `All read · ${notifications.length} total`}
          </p>
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
      {!loading && error && (
        <div className="text-sm font-mono text-[#C44A3A]">{error}</div>
      )}

      {!loading && !error && <SignalDigestPanel digest={digest} />}

      {!loading && !error && notifications.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm font-mono text-foreground-muted">No notifications yet.</p>
          <p className="text-xs font-mono text-foreground-subtle mt-1">
            Ingestion runs, source errors, and other system events will appear here.
          </p>
        </div>
      )}

      {/* ── List ── */}
      {!loading && !error && notifications.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-[13px] font-mono uppercase tracking-wider text-foreground-muted">
              Event log
            </h2>
            <p className="text-[11px] font-mono text-foreground-subtle mt-1">
              Script-generated notifications and unread state.
            </p>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            {notifications.map((n) => (
              <NotificationRow key={n.id} n={n} onRead={handleRead} />
            ))}
          </div>
        </section>
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
