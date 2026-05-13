import { useState } from "react";
import { useAgency } from "../app";
import { updateBrokerAgency } from "../brokerData";
import type { BrokerAgency } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

type SettingsTab = "profile" | "connections" | "notifications" | "team" | "billing";

// ── Integration definitions ───────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "connected" | "available" | "soon";
  logoChar: string;
  logoColor: string;
}

const INTEGRATIONS: Integration[] = [
  // Communication
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync lead emails directly into Listo. Auto-tag by listing and lead stage.",
    category: "Communication",
    status: "soon",
    logoChar: "G",
    logoColor: "#EA4335",
  },
  {
    id: "whatsapp_business",
    name: "WhatsApp Business",
    description: "Route WhatsApp enquiries to the right agent and auto-log them as leads.",
    category: "Communication",
    status: "soon",
    logoChar: "W",
    logoColor: "#25D366",
  },
  // Calendar
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync viewings and follow-up reminders with Google Calendar. Two-way.",
    category: "Calendar",
    status: "soon",
    logoChar: "C",
    logoColor: "#4285F4",
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Sync with Microsoft 365 / Outlook for teams on the Microsoft stack.",
    category: "Calendar",
    status: "soon",
    logoChar: "O",
    logoColor: "#0072C6",
  },
  // Property portals
  {
    id: "idealista",
    name: "Idealista",
    description: "Publish listings directly to Idealista and import leads automatically.",
    category: "Property portals",
    status: "soon",
    logoChar: "I",
    logoColor: "#E8401C",
  },
  {
    id: "olx",
    name: "OLX",
    description: "Sync listings with OLX Cape Verde and other OLX markets.",
    category: "Property portals",
    status: "soon",
    logoChar: "O",
    logoColor: "#6E2EFF",
  },
  {
    id: "rightmove",
    name: "Rightmove",
    description: "Reach UK buyers via Rightmove — auto-publish and import leads.",
    category: "Property portals",
    status: "soon",
    logoChar: "R",
    logoColor: "#00DEB6",
  },
  {
    id: "expat",
    name: "Expat.com",
    description: "Connect with international buyers searching for properties abroad.",
    category: "Property portals",
    status: "soon",
    logoChar: "E",
    logoColor: "#1A5EA8",
  },
  {
    id: "propertyfinder",
    name: "Property Finder",
    description: "Publish to Property Finder for buyers in the Middle East and Africa.",
    category: "Property portals",
    status: "soon",
    logoChar: "P",
    logoColor: "#00A550",
  },
  // CRM
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Two-way lead sync with HubSpot CRM. Keep your pipeline in one place.",
    category: "CRM",
    status: "soon",
    logoChar: "H",
    logoColor: "#FF7A59",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Mirror your Listo kanban to Pipedrive and back.",
    category: "CRM",
    status: "soon",
    logoChar: "P",
    logoColor: "#1A1F36",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Enterprise-grade CRM sync for larger agencies.",
    category: "CRM",
    status: "soon",
    logoChar: "S",
    logoColor: "#00A1E0",
  },
  // Documents
  {
    id: "docusign",
    name: "DocuSign",
    description: "Send offer letters and contracts for e-signature directly from a lead.",
    category: "Documents & legal",
    status: "soon",
    logoChar: "D",
    logoColor: "#FFCC00",
  },
  {
    id: "adobe_sign",
    name: "Adobe Acrobat Sign",
    description: "E-signature and PDF workflows for offers and mandates.",
    category: "Documents & legal",
    status: "soon",
    logoChar: "A",
    logoColor: "#FF0000",
  },
  // Automation
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect Listo to 7,000+ apps without code. Build custom automations.",
    category: "Automation",
    status: "soon",
    logoChar: "Z",
    logoColor: "#FF4A00",
  },
  {
    id: "make",
    name: "Make",
    description: "Advanced visual workflow builder — trigger actions from any Listo event.",
    category: "Automation",
    status: "soon",
    logoChar: "M",
    logoColor: "#6D00CC",
  },
  // Payments
  {
    id: "stripe",
    name: "Stripe",
    description: "Collect reservation deposits and holding fees directly from buyers.",
    category: "Payments",
    status: "soon",
    logoChar: "S",
    logoColor: "#635BFF",
  },
];

const INTEGRATION_CATEGORIES = Array.from(new Set(INTEGRATIONS.map((i) => i.category)));

// ── Notification settings ─────────────────────────────────────────────────────

interface NotifSetting {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

const NOTIF_SETTINGS: NotifSetting[] = [
  {
    id: "new_lead",
    label: "New lead received",
    description: "Notify immediately when a buyer enquires through a listing or your agency page.",
    defaultOn: true,
  },
  {
    id: "follow_up_due",
    label: "Follow-up reminders",
    description: "Daily digest of leads with follow-up dates due today or overdue.",
    defaultOn: true,
  },
  {
    id: "listing_approved",
    label: "Listing published",
    description: "Notify when AREI approves and publishes one of your listings.",
    defaultOn: true,
  },
  {
    id: "listing_rejected",
    label: "Listing needs changes",
    description: "Notify when a listing is returned for revision before it can be published.",
    defaultOn: true,
  },
  {
    id: "weekly_summary",
    label: "Weekly summary",
    description: "Monday briefing: new leads this week, upcoming viewings, listing performance.",
    defaultOn: false,
  },
  {
    id: "viewing_reminder",
    label: "Viewing reminders",
    description: "24h and 1h reminder before a scheduled viewing.",
    defaultOn: true,
  },
  {
    id: "pulse_digest",
    label: "Listo Pulse digest",
    description: "Morning email with your AI-suggested actions for the day.",
    defaultOn: false,
  },
];

// ── Shared label style ────────────────────────────────────────────────────────

const monoLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--color-foreground-muted)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  color: "var(--color-foreground)",
  fontSize: "0.875rem",
  borderRadius: "2px",
};

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block" style={monoLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        border: "none",
        background: on ? "var(--color-foreground)" : "var(--color-border-strong)",
        position: "relative",
        flexShrink: 0,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "18px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

// ── Integration card ──────────────────────────────────────────────────────────

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      {/* Logo */}
      <div
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center font-bold text-sm"
        style={{
          background: integration.logoColor + "18",
          color: integration.logoColor,
          borderRadius: "2px",
          border: `1px solid ${integration.logoColor}30`,
          fontFamily: "var(--font-mono)",
        }}
      >
        {integration.logoChar}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
          {integration.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          {integration.description}
        </p>
      </div>

      {/* Status / action */}
      {integration.status === "connected" ? (
        <span
          className="flex-shrink-0 px-2 py-1"
          style={{
            ...monoLabel,
            color: "var(--color-green)",
            background: "var(--color-green-muted)",
            borderRadius: "2px",
            fontSize: "9px",
          }}
        >
          Connected
        </span>
      ) : integration.status === "available" ? (
        <button
          type="button"
          className="flex-shrink-0 px-3 py-1.5"
          style={{
            ...monoLabel,
            color: "var(--color-foreground)",
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "2px",
            cursor: "pointer",
          }}
        >
          Connect
        </button>
      ) : (
        <span
          className="flex-shrink-0 px-2 py-1"
          style={{
            ...monoLabel,
            color: "var(--color-foreground-subtle)",
            background: "var(--color-surface-3)",
            borderRadius: "2px",
            fontSize: "9px",
          }}
        >
          Soon
        </span>
      )}
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { agency, setAgency } = useAgency();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<
    Partial<
      Pick<
        BrokerAgency,
        | "public_display_name"
        | "contact_person"
        | "email"
        | "phone"
        | "whatsapp"
        | "description"
        | "logo_url"
        | "website"
      >
    >
  >({
    public_display_name: agency?.public_display_name ?? "",
    contact_person: agency?.contact_person ?? "",
    email: agency?.email ?? "",
    phone: agency?.phone ?? "",
    whatsapp: agency?.whatsapp ?? "",
    description: agency?.description ?? "",
    logo_url: agency?.logo_url ?? "",
    website: agency?.website ?? "",
  });

  if (!agency) return null;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value || null }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBrokerAgency(agency!.id, {
        public_display_name: form.public_display_name ?? null,
        contact_person: form.contact_person ?? null,
        email: form.email ?? null,
        phone: form.phone ?? null,
        whatsapp: form.whatsapp ?? null,
        description: form.description ?? null,
        logo_url: form.logo_url ?? null,
        website: form.website ?? null,
      });
      setAgency(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
          Agency profile
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          This information is shown on your public agency page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Public display name">
          <input
            type="text"
            value={form.public_display_name ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("public_display_name", e.target.value)
            }
            style={inputStyle}
            placeholder={agency.agency_name}
          />
        </Field>

        <Field label="Description">
          <textarea
            rows={3}
            value={form.description ?? ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              set("description", e.target.value)
            }
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Tell buyers about your agency…"
          />
        </Field>

        <Field label="Contact person">
          <input
            type="text"
            value={form.contact_person ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("contact_person", e.target.value)
            }
            style={inputStyle}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("email", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("phone", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              type="tel"
              value={form.whatsapp ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("whatsapp", e.target.value)
              }
              style={inputStyle}
              placeholder="+238 xxx xxxx"
            />
          </Field>
        </div>

        <Field label="Website">
          <input
            type="url"
            value={form.website ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("website", e.target.value)}
            style={inputStyle}
            placeholder="https://…"
          />
        </Field>

        <Field label="Logo URL">
          <input
            type="url"
            value={form.logo_url ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("logo_url", e.target.value)
            }
            style={inputStyle}
            placeholder="https://…/logo.png"
          />
        </Field>

        {error && (
          <p className="text-xs" style={{ color: "var(--color-red)" }}>
            {error}
          </p>
        )}
        {saved && (
          <p className="text-xs" style={{ color: "var(--color-green)" }}>
            Profile saved.
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium transition-opacity"
            style={{
              background: "var(--color-foreground)",
              color: "var(--color-surface-1)",
              opacity: saving ? 0.6 : 1,
              borderRadius: "2px",
            }}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Connections tab ───────────────────────────────────────────────────────────

function ConnectionsTab() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
          Connections
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          Connect Listo to the tools you already use. All integrations are two-way unless noted.
        </p>
      </div>

      {INTEGRATION_CATEGORIES.map((category) => (
        <div key={category}>
          <p className="mb-1" style={monoLabel}>
            {category}
          </p>
          <div
            style={{
              background: "var(--color-surface-1)",
              border: "1px solid var(--color-border)",
              borderRadius: "2px",
              padding: "0 1rem",
            }}
          >
            {INTEGRATIONS.filter((i) => i.category === category).map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
        Don't see an integration you need?{" "}
        <a
          href="mailto:pilot@arei.io"
          style={{ color: "var(--color-deep-green)", textDecoration: "underline" }}
        >
          Let us know
        </a>{" "}
        and we'll prioritise it.
      </p>
    </div>
  );
}

// ── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [settings, setSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIF_SETTINGS.map((s) => [s.id, s.defaultOn]))
  );

  function toggle(id: string) {
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
          Notifications
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          Choose when Listo contacts you. Email delivery — push notifications coming soon.
        </p>
      </div>

      <div
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderRadius: "2px",
        }}
      >
        {NOTIF_SETTINGS.map((s, i) => (
          <div
            key={s.id}
            className="flex items-start gap-4 px-4 py-4"
            style={{
              borderBottom:
                i < NOTIF_SETTINGS.length - 1 ? "1px solid var(--color-border)" : undefined,
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                {s.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                {s.description}
              </p>
            </div>
            <Toggle on={settings[s.id]} onChange={() => toggle(s.id)} />
          </div>
        ))}
      </div>

      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: "2px",
        }}
      >
        <span style={{ ...monoLabel, fontSize: "9px" }}>Notification email</span>
        <span className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
          Sent to your agency profile email
        </span>
      </div>
    </div>
  );
}

// ── Team tab ──────────────────────────────────────────────────────────────────

function TeamTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
          Team
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          Invite agents and assign listings or leads.
        </p>
      </div>

      <div
        className="p-6 text-center"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderRadius: "2px",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--color-foreground-muted)" }}>
          Multi-agent support coming soon
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--color-foreground-subtle)" }}>
          Invite team members, assign leads, and track individual agent performance.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 px-4 py-2 text-sm"
          style={{
            ...monoLabel,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "2px",
            opacity: 0.6,
            cursor: "default",
          }}
        >
          Invite agent
        </button>
      </div>

      <div className="space-y-2">
        <p style={monoLabel}>Planned features</p>
        {[
          "Per-agent lead assignment and routing",
          "Shared kanban with agent filters",
          "Commission tracking per deal",
          "Agent performance dashboard",
          "Role-based access (admin / agent / viewer)",
        ].map((f) => (
          <div
            key={f}
            className="flex items-center gap-2 text-sm"
            style={{ color: "var(--color-foreground-muted)" }}
          >
            <span style={{ color: "var(--color-border-strong)" }}>·</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Billing tab ───────────────────────────────────────────────────────────────

function BillingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-foreground)" }}>
          Billing
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          Your current plan and future pricing.
        </p>
      </div>

      {/* Current plan */}
      <div
        className="p-5"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border)",
          borderRadius: "2px",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            Pilot plan
          </span>
          <span
            className="px-2 py-0.5"
            style={{
              ...monoLabel,
              fontSize: "9px",
              background: "var(--color-accent-muted)",
              color: "var(--color-deep-green)",
              borderRadius: "2px",
            }}
          >
            Active
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--color-foreground-muted)" }}>
          You are a founding pilot partner. Access to all features is free during the pilot phase.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--color-foreground-subtle)" }}>
          Pilot ends when public pricing launches — you'll get advance notice and a founding-partner
          discount.
        </p>
      </div>

      {/* Upcoming tiers */}
      <div>
        <p className="mb-3" style={monoLabel}>
          Planned pricing tiers
        </p>
        <div className="space-y-2">
          {[
            {
              name: "Starter",
              price: "€49 / month",
              desc: "1 agent · up to 20 active listings · core integrations",
            },
            {
              name: "Agency",
              price: "€149 / month",
              desc: "Up to 5 agents · unlimited listings · all integrations · Listo Pulse",
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "Large agencies · dedicated onboarding · SLA · white-label option",
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className="px-4 py-3 flex items-start gap-4"
              style={{
                background: "var(--color-surface-1)",
                border: "1px solid var(--color-border)",
                borderRadius: "2px",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                  {tier.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
                  {tier.desc}
                </p>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--color-foreground-muted)",
                  flexShrink: 0,
                }}
              >
                {tier.price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────

interface SidebarItemProps {
  label: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
}

function SidebarItem({ label, active, badge, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-2 flex items-center justify-between"
      style={{
        background: active ? "var(--color-surface-3)" : "transparent",
        color: active ? "var(--color-foreground)" : "var(--color-foreground-muted)",
        fontWeight: active ? 500 : 400,
        fontSize: "14px",
        borderRadius: "2px",
        borderLeft: active ? "2px solid var(--color-foreground)" : "2px solid transparent",
      }}
    >
      {label}
      {badge && (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--color-foreground-subtle)",
            background: "var(--color-surface-3)",
            padding: "1px 5px",
            borderRadius: "2px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────

const TABS: { id: SettingsTab; label: string; badge?: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "connections", label: "Connections" },
  { id: "notifications", label: "Notifications" },
  { id: "team", label: "Team", badge: "soon" },
  { id: "billing", label: "Billing" },
];

export default function ProfilePage() {
  const { agency } = useAgency();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  if (!agency) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>No agency loaded.</p>
      </div>
    );
  }

  const displayName = agency.public_display_name || agency.agency_name;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      {/* Page heading */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-foreground-muted)" }}>
          {displayName}
          <span
            className="ml-2 px-1.5 py-0.5"
            style={{
              ...monoLabel,
              fontSize: "9px",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "2px",
            }}
          >
            {agency.market_code}
          </span>
        </p>
      </div>

      {/* Mobile tab bar */}
      <div
        className="flex gap-1 mb-5 sm:hidden overflow-x-auto pb-1"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex-shrink-0 px-3 py-1.5"
            style={{
              ...monoLabel,
              fontSize: "9px",
              background: activeTab === tab.id ? "var(--color-foreground)" : "transparent",
              color:
                activeTab === tab.id ? "var(--color-surface-1)" : "var(--color-foreground-muted)",
              borderRadius: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex gap-8">
        {/* Sidebar — desktop only */}
        <div className="hidden sm:flex flex-col gap-0.5 flex-shrink-0" style={{ width: "160px" }}>
          {TABS.map((tab) => (
            <SidebarItem
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              badge={tab.badge}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "connections" && <ConnectionsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "team" && <TeamTab />}
          {activeTab === "billing" && <BillingTab />}
        </div>
      </div>
    </div>
  );
}
