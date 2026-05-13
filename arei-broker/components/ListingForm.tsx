import { useState } from "react";
import { createBrokerListing, updateBrokerListing, computeListingHints } from "../brokerData";
import type { BrokerListing } from "../types";

interface ListingFormProps {
  agencyId: string;
  marketCode: string;
  initial?: Partial<BrokerListing>;
  onSave: (listing: BrokerListing) => void;
  onCancel: () => void;
  mode: "create" | "edit";
}

const PROPERTY_TYPES = ["Villa", "Apartment", "Land", "Commercial", "Other"];
const CURRENCIES = ["EUR", "USD", "CVE"];
const CAPE_VERDE_ISLANDS = [
  "Santiago",
  "Sal",
  "São Vicente",
  "Boavista",
  "Fogo",
  "Santo Antão",
  "São Nicolau",
  "Maio",
  "Brava",
  "Other",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.625rem",
  background: "var(--color-surface-1)",
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

export default function ListingForm({
  agencyId,
  marketCode,
  initial = {},
  onSave,
  onCancel,
  mode,
}: ListingFormProps) {
  const [form, setForm] = useState<Partial<BrokerListing>>({
    agency_id: agencyId,
    market_code: marketCode,
    currency: "EUR",
    publish_status: "draft",
    image_urls: [],
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof BrokerListing>(key: K, value: BrokerListing[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhotoUrls(raw: string) {
    const urls = raw
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    set("image_urls", urls);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let saved: BrokerListing;
      if (mode === "create") {
        saved = await createBrokerListing({
          agency_id: agencyId,
          market_code: marketCode,
          title: form.title ?? "",
          price: form.price ?? null,
          currency: form.currency ?? "EUR",
          property_type: form.property_type ?? null,
          island: form.island ?? null,
          city: form.city ?? null,
          bedrooms: form.bedrooms ?? null,
          bathrooms: form.bathrooms ?? null,
          property_size_sqm: form.property_size_sqm ?? null,
          description: form.description ?? null,
          image_urls: form.image_urls ?? [],
          source_url: null,
          contact_name: form.contact_name ?? null,
          contact_email: form.contact_email ?? null,
          contact_phone: form.contact_phone ?? null,
          publish_status: "draft",
        });
      } else {
        if (!initial.id) throw new Error("Missing listing id for edit");
        saved = await updateBrokerListing(initial.id, {
          title: form.title,
          price: form.price,
          currency: form.currency,
          property_type: form.property_type,
          island: form.island,
          city: form.city,
          bedrooms: form.bedrooms,
          bathrooms: form.bathrooms,
          property_size_sqm: form.property_size_sqm,
          description: form.description,
          image_urls: form.image_urls,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
        });
      }
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hints = computeListingHints(form);
  const failedHints = hints.filter((h) => !h.passed);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title *">
        <input
          type="text"
          required
          value={form.title ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("title", e.target.value)}
          style={inputStyle}
          placeholder="e.g. 3-bedroom villa with ocean views"
        />
      </Field>

      <Field label="Property type">
        <select
          value={form.property_type ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            set("property_type", e.target.value || null)
          }
          style={inputStyle}
        >
          <option value="">Select type…</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Price">
            <input
              type="number"
              min={0}
              value={form.price ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                set("price", e.target.value ? Number(e.target.value) : null)
              }
              style={inputStyle}
              placeholder="e.g. 250000"
            />
          </Field>
        </div>
        <div style={{ width: "7rem" }}>
          <Field label="Currency">
            <select
              value={form.currency ?? "EUR"}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set("currency", e.target.value)}
              style={inputStyle}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Field label="Island">
        <select
          value={form.island ?? ""}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            set("island", e.target.value || null)
          }
          style={inputStyle}
        >
          <option value="">Select island…</option>
          {CAPE_VERDE_ISLANDS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </Field>

      <Field label="City / area">
        <input
          type="text"
          value={form.city ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set("city", e.target.value || null)
          }
          style={inputStyle}
          placeholder="e.g. Mindelo"
        />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Bedrooms">
          <input
            type="number"
            min={0}
            value={form.bedrooms ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("bedrooms", e.target.value ? Number(e.target.value) : null)
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Bathrooms">
          <input
            type="number"
            min={0}
            value={form.bathrooms ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("bathrooms", e.target.value ? Number(e.target.value) : null)
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Size (m²)">
          <input
            type="number"
            min={0}
            value={form.property_size_sqm ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("property_size_sqm", e.target.value ? Number(e.target.value) : null)
            }
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          rows={4}
          value={form.description ?? ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            set("description", e.target.value || null)
          }
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Describe the property for buyers…"
        />
      </Field>

      <Field label="Photo URLs (one per line)">
        <textarea
          rows={3}
          value={(form.image_urls ?? []).join("\n")}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handlePhotoUrls(e.target.value)
          }
          style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}
          placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
        />
      </Field>

      <Field label="Contact name">
        <input
          type="text"
          value={form.contact_name ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set("contact_name", e.target.value || null)
          }
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact email">
          <input
            type="email"
            value={form.contact_email ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("contact_email", e.target.value || null)
            }
            style={inputStyle}
          />
        </Field>
        <Field label="Contact phone">
          <input
            type="tel"
            value={form.contact_phone ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("contact_phone", e.target.value || null)
            }
            style={inputStyle}
          />
        </Field>
      </div>

      {/* Quality hints — subtle, helper only */}
      {failedHints.length > 0 && (
        <div
          className="rounded p-3 space-y-1"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--color-foreground-muted)" }}>
            Listing tips
          </p>
          {failedHints.slice(0, 4).map((h) => (
            <p key={h.id} className="text-xs" style={{ color: "var(--color-foreground-subtle)" }}>
              • {h.detail ?? h.label}
            </p>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--color-red)" }}>
          {error}
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
          {saving ? "Saving…" : mode === "create" ? "Save listing" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm"
          style={{
            border: "1px solid var(--color-border)",
            color: "var(--color-foreground-muted)",
            background: "var(--color-surface-1)",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
