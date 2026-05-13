import type { BrokerAgency } from "../types";

interface AgencyProfileCardProps {
  agency: BrokerAgency;
  compact?: boolean;
}

export default function AgencyProfileCard({ agency, compact = false }: AgencyProfileCardProps) {
  const displayName = agency.public_display_name || agency.agency_name;

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base truncate" style={{ color: "var(--color-foreground)" }}>
              {displayName}
            </h3>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: "var(--color-accent-muted)",
                color: "var(--color-deep-green)",
              }}
            >
              Pilot Partner
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide"
              style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-muted)" }}
            >
              {agency.market_code}
            </span>
          </div>

          {agency.description && !compact && (
            <p className="mt-1 text-sm" style={{ color: "var(--color-foreground-muted)" }}>
              {agency.description}
            </p>
          )}
        </div>

        {agency.logo_url && (
          <img
            src={agency.logo_url}
            alt={displayName}
            className="w-12 h-12 rounded object-contain flex-shrink-0"
            style={{ border: "1px solid var(--color-border)" }}
          />
        )}
      </div>

      {!compact && (
        <div
          className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {agency.contact_person && (
            <div className="flex gap-2">
              <span style={{ color: "var(--color-foreground-subtle)" }}>Contact</span>
              <span style={{ color: "var(--color-foreground)" }}>{agency.contact_person}</span>
            </div>
          )}
          {agency.email && (
            <div className="flex gap-2">
              <span style={{ color: "var(--color-foreground-subtle)" }}>Email</span>
              <a
                href={`mailto:${agency.email}`}
                className="hover:underline"
                style={{ color: "var(--color-deep-green)" }}
              >
                {agency.email}
              </a>
            </div>
          )}
          {agency.phone && (
            <div className="flex gap-2">
              <span style={{ color: "var(--color-foreground-subtle)" }}>Phone</span>
              <span style={{ color: "var(--color-foreground)" }}>{agency.phone}</span>
            </div>
          )}
          {agency.whatsapp && (
            <div className="flex gap-2">
              <span style={{ color: "var(--color-foreground-subtle)" }}>WhatsApp</span>
              <span style={{ color: "var(--color-foreground)" }}>{agency.whatsapp}</span>
            </div>
          )}
          {agency.website && (
            <div className="flex gap-2">
              <span style={{ color: "var(--color-foreground-subtle)" }}>Website</span>
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate"
                style={{ color: "var(--color-deep-green)" }}
              >
                {agency.website}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
