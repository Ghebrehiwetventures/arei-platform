import { Link, NavLink } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Today", end: true },
  { to: "/leads", label: "Leads" },
  { to: "/listings", label: "Listings" },
  { to: "/website", label: "Website" },
];

function GearIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Nav() {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span
              className="font-mono font-bold text-sm tracking-tight"
              style={{ color: "var(--color-deep-green)" }}
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
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
              style={{
                background: "var(--color-accent-muted)",
                color: "var(--color-deep-green)",
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
                        color: "var(--color-deep-green)",
                        fontWeight: 600,
                        borderBottom: "2px solid var(--color-deep-green)",
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

          {/* Gear → profile settings */}
          <Link
            to="/profile"
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ color: "var(--color-foreground-muted)" }}
            aria-label="Profile settings"
          >
            <GearIcon />
          </Link>
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
                    ? "var(--color-deep-green)"
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
