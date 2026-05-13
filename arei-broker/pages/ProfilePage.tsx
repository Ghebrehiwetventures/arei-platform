import { useState } from "react";
import { useAgency } from "../app";
import { updateBrokerAgency } from "../brokerData";
import type { BrokerAgency } from "../types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border)",
  color: "var(--color-foreground)",
  fontSize: "0.875rem",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium" style={{ color: "var(--color-foreground-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { agency, setAgency } = useAgency();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — initialize from context
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

  if (!agency) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <p style={{ color: "var(--color-foreground-muted)" }}>No agency loaded.</p>
      </div>
    );
  }

  const displayName = agency.public_display_name || agency.agency_name;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value || null }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBrokerAgency(agency.id, {
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>
          {displayName}
        </h1>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
          style={{
            background: "var(--color-accent-muted)",
            color: "var(--color-deep-green)",
          }}
        >
          Pilot partner
        </span>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide"
          style={{ background: "var(--color-surface-2)", color: "var(--color-foreground-muted)" }}
        >
          {agency.market_code}
        </span>
      </div>

      {/* Edit form */}
      <div
        className="rounded-lg p-5"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
      >
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("email", e.target.value)
              }
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  set("phone", e.target.value)
                }
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("website", e.target.value)
              }
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium transition-opacity"
              style={{
                background: "var(--color-deep-green)",
                color: "var(--color-deep-green-foreground)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
