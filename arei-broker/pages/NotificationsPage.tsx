import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useNotifications,
  ageBucket,
  relativeTime,
  type Notification,
  type NotificationType,
} from "../notificationsData";

// ── Visual mapping (mirrors the Nav dropdown) ────────────────────────────────

const TYPE_DOT: Record<NotificationType, string> = {
  lead: "var(--color-foreground)",
  overdue: "var(--color-red)",
  listing: "var(--color-green)",
  viewing: "var(--color-accent)",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  lead: "Lead",
  overdue: "Overdue",
  listing: "Listing",
  viewing: "Viewing",
};

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterKey = "all" | "unread" | NotificationType;

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "lead", label: "Leads" },
  { value: "overdue", label: "Overdue" },
  { value: "viewing", label: "Viewings" },
  { value: "listing", label: "Listings" },
];

// ── Section group label ──────────────────────────────────────────────────────

const GROUP_LABEL: Record<ReturnType<typeof ageBucket>, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "Earlier this week",
  earlier: "Earlier",
};

// ── Row ───────────────────────────────────────────────────────────────────────

interface RowProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationRow({ notification, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: notification.read ? "transparent" : "var(--color-accent-muted)",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      {/* Type dot */}
      <div
        style={{
          flexShrink: 0,
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: notification.read
            ? "var(--color-border-strong)"
            : TYPE_DOT[notification.type],
          marginTop: "6px",
        }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="text-sm font-medium leading-snug"
            style={{ color: "var(--color-foreground)" }}
          >
            {notification.title}
          </p>
          <span
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-foreground-subtle)",
            }}
          >
            {relativeTime(notification.createdAt)}
          </span>
        </div>
        <p
          className="text-sm mt-0.5 leading-relaxed"
          style={{ color: "var(--color-foreground-muted)" }}
        >
          {notification.body}
        </p>
        <div className="mt-1.5">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-foreground-subtle)",
            }}
          >
            {TYPE_LABEL[notification.type]}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  // Group by age bucket
  const grouped: Record<string, Notification[]> = {};
  for (const n of filtered) {
    const key = ageBucket(n.createdAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(n);
  }
  const order: (keyof typeof GROUP_LABEL)[] = ["today", "yesterday", "this_week", "earlier"];

  const filterCount = (f: FilterKey): number => {
    if (f === "all") return notifications.length;
    if (f === "unread") return unreadCount;
    return notifications.filter((n) => n.type === f).length;
  };

  function handleRowClick(n: Notification) {
    markRead(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Notifications
        </h1>
        {unreadCount > 0 && (
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
            {unreadCount} unread
          </span>
        )}
        <div className="flex-1" />
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--color-foreground-muted)",
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "2px",
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-1 mb-4 overflow-x-auto pb-px"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const count = filterCount(f.value);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
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
                whiteSpace: "nowrap",
              }}
            >
              {f.label}
              {count > 0 && (
                <span style={{ marginLeft: "5px", opacity: active ? 0.7 : 0.5 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="p-8 text-center"
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "2px",
          }}
        >
          <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
            {filter === "unread"
              ? "No unread notifications. You're all caught up."
              : "No notifications in this view."}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          {order
            .filter((key) => grouped[key]?.length)
            .map((key, groupIdx, arr) => (
              <div key={key}>
                <div
                  style={{
                    padding: "10px 16px",
                    background: "var(--color-surface-2)",
                    borderBottom: "1px solid var(--color-border)",
                    borderTop: groupIdx > 0 ? "1px solid var(--color-border)" : undefined,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-foreground-muted)",
                    fontWeight: 500,
                  }}
                >
                  {GROUP_LABEL[key]}
                </div>
                {grouped[key].map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      borderBottom:
                        i === grouped[key].length - 1 && groupIdx === arr.length - 1
                          ? "none"
                          : undefined,
                    }}
                  >
                    <NotificationRow
                      notification={n}
                      onClick={() => handleRowClick(n)}
                    />
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      {/* Footer link to settings */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => navigate("/profile")}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-foreground-subtle)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          Notification settings →
        </button>
      </div>
    </div>
  );
}
