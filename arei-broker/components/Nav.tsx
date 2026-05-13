import { NavLink } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Inbox", end: true },
  { to: "/listings", label: "Listings" },
  { to: "/website", label: "Website" },
  { to: "/performance", label: "Performance" },
  { to: "/profile", label: "Profile" },
];

export default function Nav() {
  return (
    <nav
      style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-1)" }}
      className="sticky top-0 z-30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span
            className="font-mono font-bold text-base tracking-tight"
            style={{ color: "var(--color-deep-green)" }}
          >
            AREI
          </span>
          <span
            className="text-sm font-normal"
            style={{ color: "var(--color-foreground-muted)" }}
          >
            Listings &amp; Leads
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

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  "px-3 py-1.5 text-sm transition-colors",
                  isActive ? "font-medium" : "hover:bg-surface-2 rounded",
                ].join(" ")
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      color: "var(--color-deep-green)",
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
      </div>
    </nav>
  );
}
