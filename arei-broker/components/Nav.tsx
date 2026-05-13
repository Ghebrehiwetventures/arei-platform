import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useState, useRef, useEffect } from "react";

const NAV_LINKS = [
  { to: "/", label: "Today", end: true },
  { to: "/leads", label: "Leads" },
  { to: "/listings", label: "Listings" },
  { to: "/website", label: "Website" },
];

// ── Mock notifications ────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "lead" | "overdue" | "listing" | "viewing";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFS: Notification[] = [
  {
    id: "n1",
    type: "lead",
    title: "New lead",
    body: "João Silva enquired about Casa da Luz",
    time: "10 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "overdue",
    title: "Follow-up overdue",
    body: "Maria Santos — was due yesterday",
    time: "1h ago",
    read: false,
  },
  {
    id: "n3",
    type: "viewing",
    title: "Viewing confirmed",
    body: "Apt 3B, Mindelo — tomorrow 10:00",
    time: "3h ago",
    read: true,
  },
  {
    id: "n4",
    type: "listing",
    title: "Listing approved",
    body: "Moradia T3, São Vicente is now live",
    time: "Yesterday",
    read: true,
  },
];

const TYPE_DOT: Record<Notification["type"], string> = {
  lead: "var(--color-foreground)",
  overdue: "var(--color-red)",
  listing: "var(--color-green)",
  viewing: "var(--color-accent)",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ── Notification panel ────────────────────────────────────────────────────────

interface NotifPanelProps {
  notifs: Notification[];
  onMarkAllRead: () => void;
  onClose: () => void;
}

function NotifPanel({ notifs, onMarkAllRead, onClose }: NotifPanelProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "320px",
        background: "var(--color-surface-1)",
        border: "1px solid var(--color-border)",
        borderRadius: "2px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        zIndex: 200,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
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
          Notifications
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "9px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-foreground-subtle)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              color: "var(--color-foreground-muted)",
              fontSize: "13px",
              lineHeight: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Close notifications"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Items */}
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {notifs.length === 0 ? (
          <div
            className="px-4 py-8 text-center"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--color-foreground-subtle)",
              letterSpacing: "0.04em",
            }}
          >
            All caught up
          </div>
        ) : (
          notifs.map((n, i) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "12px 16px",
                borderBottom:
                  i < notifs.length - 1 ? "1px solid var(--color-border)" : "none",
                background: n.read ? "transparent" : "var(--color-accent-muted)",
                transition: "background 0.1s",
              }}
            >
              {/* Type dot */}
              <div
                style={{
                  flexShrink: 0,
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: n.read
                    ? "var(--color-border-strong)"
                    : TYPE_DOT[n.type],
                  marginTop: "5px",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className="text-sm font-medium leading-snug"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {n.title}
                  </p>
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "var(--color-foreground-subtle)",
                    }}
                  >
                    {n.time}
                  </span>
                </div>
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: "var(--color-foreground-muted)" }}
                >
                  {n.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
          padding: "8px 16px",
        }}
      >
        <Link
          to="/profile"
          onClick={onClose}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-foreground-subtle)",
          }}
        >
          Notification settings →
        </Link>
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export default function Nav() {
  const { theme, toggle } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(MOCK_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-30"
        style={{
          background: "var(--color-surface-1)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--color-foreground)",
              }}
            >
              Listo
            </span>
            <span
              className="hidden sm:inline text-xs"
              style={{ color: "var(--color-foreground-subtle)" }}
            >
              by AREI
            </span>
            <span
              className="inline-flex items-center px-1.5 py-0.5"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-foreground-muted)",
                border: "1px solid var(--color-border)",
                borderRadius: "2px",
              }}
            >
              Pilot
            </span>
          </div>

          {/* Nav links — desktop only */}
          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="px-3 py-1.5 text-sm transition-colors"
                style={({ isActive }) =>
                  isActive
                    ? {
                        color: "var(--color-foreground)",
                        fontWeight: 600,
                        borderBottom: "2px solid var(--color-foreground)",
                        borderRadius: 0,
                        paddingBottom: "calc(0.375rem - 2px)",
                      }
                    : { color: "var(--color-foreground-muted)" }
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Right cluster: dark toggle + bell + profile */}
          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggle}
              className="flex items-center justify-center w-9 h-9 transition-colors"
              style={{ color: "var(--color-foreground-muted)", borderRadius: "2px" }}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="flex items-center justify-center w-9 h-9 transition-colors"
                style={{
                  color: notifOpen
                    ? "var(--color-foreground)"
                    : "var(--color-foreground-muted)",
                  borderRadius: "2px",
                  position: "relative",
                }}
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "7px",
                      right: "6px",
                      width: "7px",
                      height: "7px",
                      background: "var(--color-foreground)",
                      borderRadius: "50%",
                      border: "1.5px solid var(--color-surface-1)",
                    }}
                  />
                )}
              </button>

              {notifOpen && (
                <NotifPanel
                  notifs={notifs}
                  onMarkAllRead={markAllRead}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>

            {/* Settings */}
            <Link
              to="/profile"
              className="flex items-center justify-center w-9 h-9 transition-colors"
              style={{ color: "var(--color-foreground-muted)", borderRadius: "2px" }}
              aria-label="Profile settings"
            >
              <GearIcon />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Bottom tab bar — mobile only ──────────────────────────────────────── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 flex"
        style={{
          background: "var(--color-surface-1)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className="flex-1 flex flex-col items-center justify-center py-3"
          >
            {({ isActive }) => (
              <span
                style={{
                  fontSize: "11px",
                  lineHeight: 1.2,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive
                    ? "var(--color-foreground)"
                    : "var(--color-foreground-subtle)",
                  textAlign: "center",
                  display: "block",
                }}
              >
                {link.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
