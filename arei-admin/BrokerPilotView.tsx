/**
 * Broker Pilot Workspace — V0.1
 *
 * A demo-ready surface for broker meetings. Simulates the broker-facing product
 * without requiring broker authentication.
 *
 * Demo script:
 *   "Here is your agency profile.
 *    Here is how we add one of your listings.
 *    Here is the quality check before it goes live.
 *    Here is how it will appear on AREI.
 *    Once we approve it, it can be published."
 *
 * What this is NOT:
 *   - A public-facing site
 *   - A broker login portal
 *   - A production content management system
 *
 * Internal notes (reviewer_notes, reviewed_by) are never rendered in any
 * component designed to become broker-facing. They are marked with
 * "admin-only" in the code.
 *
 * See docs/03-product/broker-pilot-workspace-v0.md
 */

import React, { useState, useEffect, useCallback } from "react";
import type { Agency, PilotListing, PilotPublishStatus, PilotQualityCheck } from "./types";
import {
  getPilotAgencies,
  getPilotListings,
  createPilotListing,
  updatePilotListing,
  setPilotListingStatus,
  computePilotQualityChecks,
  isReadyForReview,
  type PilotListingInsert,
} from "./pilotData";

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtPrice(price: number | null | undefined, currency?: string | null): string {
  if (price == null) return "Price on request";
  const sym = currency === "EUR" ? "€" : (currency ?? "");
  return `${sym} ${price.toLocaleString()}`;
}

function fmtLocation(island: string | null | undefined, city: string | null | undefined): string {
  return [city, island].filter(Boolean).join(", ") || "Location not set";
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PilotPublishStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  published: "Published",
  rejected: "Rejected",
};

const STATUS_CLASSES: Record<PilotPublishStatus, string> = {
  draft: "bg-surface-3 text-foreground-muted",
  ready_for_review: "bg-amber-muted text-amber",
  published: "bg-green-muted text-green",
  rejected: "bg-red-muted text-red",
};

function PublishStatusBadge({ status }: { status: PilotPublishStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ── Quality check indicator ───────────────────────────────────────────────────

function QualityChecklist({ checks }: { checks: PilotQualityCheck[] }) {
  const required = checks.filter((c) => c.severity === "required");
  const recommended = checks.filter((c) => c.severity === "recommended");

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider mb-2">
          Required to publish
        </div>
        <ul className="space-y-1">
          {required.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <span className={`mt-0.5 text-[12px] font-mono ${c.passed ? "text-green" : "text-red"}`}>
                {c.passed ? "✓" : "✗"}
              </span>
              <div>
                <span className={`text-[12px] ${c.passed ? "text-foreground" : "text-foreground"}`}>
                  {c.label}
                </span>
                {!c.passed && c.detail && (
                  <p className="text-[11px] text-foreground-muted mt-0.5">{c.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider mb-2">
          Recommended
        </div>
        <ul className="space-y-1">
          {recommended.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <span className={`mt-0.5 text-[12px] font-mono ${c.passed ? "text-green" : "text-amber"}`}>
                {c.passed ? "✓" : "△"}
              </span>
              <div>
                <span className="text-[12px] text-foreground">{c.label}</span>
                {!c.passed && c.detail && (
                  <p className="text-[11px] text-foreground-muted mt-0.5">{c.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Public listing preview ────────────────────────────────────────────────────
// Styled to resemble how the listing would appear on the AREI public surface.
// This is a demo component — not the actual kazaverde-web card.

function PublicListingPreview({
  listing,
  agencyName,
}: {
  listing: Pick<
    PilotListing,
    | "title"
    | "price"
    | "currency"
    | "island"
    | "city"
    | "bedrooms"
    | "bathrooms"
    | "property_size_sqm"
    | "description"
    | "image_urls"
    | "property_type"
  >;
  agencyName: string;
}) {
  const heroImage = listing.image_urls[0];
  const specs: string[] = [];
  if (listing.bedrooms != null) specs.push(`${listing.bedrooms} bed`);
  if (listing.bathrooms != null) specs.push(`${listing.bathrooms} bath`);
  if (listing.property_size_sqm != null) specs.push(`${listing.property_size_sqm} m²`);

  return (
    <div className="border border-border rounded-lg overflow-hidden max-w-sm mx-auto shadow-sm">
      {/* Hero image */}
      <div className="aspect-[4/3] bg-surface-3 relative overflow-hidden">
        {heroImage ? (
          <img
            src={heroImage}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground-subtle text-sm font-mono">
            No photo
          </div>
        )}
        {/* Photo count */}
        {listing.image_urls.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono">
            1 / {listing.image_urls.length}
          </span>
        )}
        {/* Preview label */}
        <span className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-mono px-2 py-0.5 rounded uppercase tracking-wider">
          Preview
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 bg-white dark:bg-surface-1">
        {/* Price */}
        <div className="text-xl font-bold text-foreground mb-1 font-mono">
          {fmtPrice(listing.price, listing.currency)}
        </div>

        {/* Spec row */}
        {specs.length > 0 && (
          <div className="flex gap-2 mb-2">
            {specs.map((s) => (
              <span
                key={s}
                className="text-[11px] font-mono bg-surface-2 text-foreground-muted px-2 py-0.5 rounded"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <div className="text-[13px] font-semibold text-foreground leading-snug mb-1">
          {listing.title || <span className="text-foreground-subtle italic">No title</span>}
        </div>

        {/* Location */}
        <div className="text-[11px] text-foreground-muted mb-2">
          {fmtLocation(listing.island, listing.city)}
        </div>

        {/* Description preview */}
        {listing.description && (
          <p className="text-[11px] text-foreground-muted leading-relaxed line-clamp-3 mb-2">
            {listing.description}
          </p>
        )}

        {/* Agency attribution */}
        <div className="pt-2 border-t border-border text-[10px] text-foreground-subtle font-mono uppercase tracking-wider">
          {agencyName} · AREI Index
        </div>
      </div>
    </div>
  );
}

// ── Listing intake form ───────────────────────────────────────────────────────

type FormValues = {
  title: string;
  price: string;
  currency: string;
  property_type: string;
  island: string;
  city: string;
  bedrooms: string;
  bathrooms: string;
  property_size_sqm: string;
  description: string;
  image_urls_raw: string; // newline-separated URLs
  source_url: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

function emptyForm(agency: Agency): FormValues {
  return {
    title: "",
    price: "",
    currency: "EUR",
    property_type: "",
    island: "",
    city: "",
    bedrooms: "",
    bathrooms: "",
    property_size_sqm: "",
    description: "",
    image_urls_raw: "",
    source_url: "",
    contact_name: agency.contact_person ?? "",
    contact_email: agency.email ?? "",
    contact_phone: agency.phone ?? agency.whatsapp ?? "",
  };
}

function listingToForm(l: PilotListing): FormValues {
  return {
    title: l.title,
    price: l.price?.toString() ?? "",
    currency: l.currency,
    property_type: l.property_type ?? "",
    island: l.island ?? "",
    city: l.city ?? "",
    bedrooms: l.bedrooms?.toString() ?? "",
    bathrooms: l.bathrooms?.toString() ?? "",
    property_size_sqm: l.property_size_sqm?.toString() ?? "",
    description: l.description ?? "",
    image_urls_raw: l.image_urls.join("\n"),
    source_url: l.source_url ?? "",
    contact_name: l.contact_name ?? "",
    contact_email: l.contact_email ?? "",
    contact_phone: l.contact_phone ?? "",
  };
}

function formToPayload(f: FormValues, agencyId: string, marketCode: string): PilotListingInsert {
  return {
    agency_id: agencyId,
    market_code: marketCode,
    title: f.title.trim(),
    price: f.price ? Number(f.price) : null,
    currency: f.currency || "EUR",
    property_type: f.property_type.trim() || null,
    island: f.island.trim() || null,
    city: f.city.trim() || null,
    bedrooms: f.bedrooms ? Number(f.bedrooms) : null,
    bathrooms: f.bathrooms ? Number(f.bathrooms) : null,
    property_size_sqm: f.property_size_sqm ? Number(f.property_size_sqm) : null,
    description: f.description.trim() || null,
    image_urls: f.image_urls_raw
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http")),
    source_url: f.source_url.trim() || null,
    contact_name: f.contact_name.trim() || null,
    contact_email: f.contact_email.trim() || null,
    contact_phone: f.contact_phone.trim() || null,
    publish_status: "draft",
  };
}

function IntakeFormModal({
  agency,
  listing,
  onSaved,
  onClose,
}: {
  agency: Agency;
  listing: PilotListing | null;
  onSaved: (l: PilotListing) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormValues>(
    listing ? listingToForm(listing) : emptyForm(agency)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormValues, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // Live quality checks from current form values
  const liveChecks = computePilotQualityChecks({
    title: form.title,
    price: form.price ? Number(form.price) : null,
    description: form.description,
    image_urls: form.image_urls_raw.split("\n").map((u) => u.trim()).filter((u) => u.startsWith("http")),
    island: form.island || null,
    city: form.city || null,
    property_size_sqm: form.property_size_sqm ? Number(form.property_size_sqm) : null,
    contact_email: form.contact_email || null,
    contact_phone: form.contact_phone || null,
  });

  const allRequired = liveChecks.filter((c) => c.severity === "required").every((c) => c.passed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(form, agency.id, agency.market_code);
      const saved = listing
        ? await updatePilotListing(listing.id, payload)
        : await createPilotListing(payload);
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/60 overflow-y-auto">
      <div className="surface-1 rounded-lg border border-border shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 surface-1 z-10">
          <div>
            <h2 className="text-[15px] font-semibold font-mono text-foreground">
              {listing ? "Edit listing" : "Add pilot listing"}
            </h2>
            <p className="text-[11px] text-foreground-subtle mt-0.5">
              {agency.agency_name} · Pilot Workspace
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted hover:text-foreground transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* ── Left: fields ── */}
            <div className="px-5 py-4 space-y-4">
              {error && <p className="text-sm text-red bg-red-muted px-3 py-2 rounded">{error}</p>}

              <div>
                <label className="text-[11px] text-foreground-subtle block mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  placeholder="e.g. 3-bedroom villa with ocean views in Sal Rei"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Price</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                    placeholder="e.g. 145000"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Property type</label>
                  <input
                    type="text"
                    value={form.property_type}
                    onChange={(e) => set("property_type", e.target.value)}
                    placeholder="Villa, Apartment…"
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Island</label>
                  <input
                    type="text"
                    value={form.island}
                    onChange={(e) => set("island", e.target.value)}
                    placeholder="Boa Vista…"
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">City / area</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Sal Rei…"
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => set("bedrooms", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => set("bathrooms", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">sqm</label>
                  <input
                    type="number"
                    value={form.property_size_sqm}
                    onChange={(e) => set("property_size_sqm", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-foreground-subtle block mb-1">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe the property for buyers…"
                  className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none"
                />
                <div className="text-[10px] text-foreground-subtle mt-0.5 text-right">
                  {form.description.length} chars
                </div>
              </div>

              <div>
                <label className="text-[11px] text-foreground-subtle block mb-1">
                  Photo URLs
                  <span className="ml-1 font-normal text-foreground-subtle">(one per line, https://…)</span>
                </label>
                <textarea
                  rows={3}
                  value={form.image_urls_raw}
                  onChange={(e) => set("image_urls_raw", e.target.value)}
                  placeholder={"https://example.com/photo1.jpg\nhttps://example.com/photo2.jpg"}
                  className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none font-mono text-[11px]"
                />
                <div className="text-[10px] text-foreground-subtle mt-0.5">
                  {form.image_urls_raw.split("\n").filter((u) => u.trim().startsWith("http")).length} valid URL{form.image_urls_raw.split("\n").filter((u) => u.trim().startsWith("http")).length !== 1 ? "s" : ""} detected
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Contact name</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => set("contact_name", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Contact email</label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => set("contact_email", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Contact phone</label>
                  <input
                    type="text"
                    value={form.contact_phone}
                    onChange={(e) => set("contact_phone", e.target.value)}
                    className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-foreground-subtle block mb-1">Source URL (optional)</label>
                <input
                  type="text"
                  value={form.source_url}
                  onChange={(e) => set("source_url", e.target.value)}
                  placeholder="https://youragency.com/listing/123"
                  className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                />
              </div>
            </div>

            {/* ── Right: live quality checklist + mini preview ── */}
            <div className="px-4 py-4 space-y-5">
              <div>
                <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider mb-3">
                  Quality checklist
                </div>
                <QualityChecklist checks={liveChecks} />
              </div>

              {allRequired && (
                <div className="p-2 rounded bg-green-muted text-green text-[11px] font-mono font-medium text-center">
                  ✓ Ready for review
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-surface-2/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? "Saving…" : listing ? "Save changes" : "Save listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Listing detail panel (expanded row) ───────────────────────────────────────

function ListingDetailPanel({
  listing,
  agency,
  onEdit,
  onStatusChange,
}: {
  listing: PilotListing;
  agency: Agency;
  onEdit: () => void;
  onStatusChange: (updated: PilotListing) => void;
}) {
  const checks = computePilotQualityChecks({
    title: listing.title,
    price: listing.price,
    description: listing.description,
    image_urls: listing.image_urls,
    island: listing.island,
    city: listing.city,
    property_size_sqm: listing.property_size_sqm,
    contact_email: listing.contact_email,
    contact_phone: listing.contact_phone,
  });
  const ready = isReadyForReview(listing);

  const [reviewerNotes, setReviewerNotes] = useState(listing.reviewer_notes ?? "");
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (status: PilotPublishStatus) => {
    setUpdating(true);
    try {
      const updated = await setPilotListingStatus(listing.id, status, {
        reviewer_notes: reviewerNotes.trim() || undefined,
      });
      onStatusChange(updated);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-4 border-t border-border bg-surface-2/30">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Col 1: Quality checklist ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">
              Quality checklist
            </span>
            <button
              type="button"
              onClick={onEdit}
              className="text-[11px] text-accent hover:underline font-mono"
            >
              Edit listing
            </button>
          </div>
          <QualityChecklist checks={checks} />

          {/* Status controls */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">
              Publish status
            </div>
            <div className="flex flex-wrap gap-2">
              {listing.publish_status === "draft" && (
                <button
                  type="button"
                  disabled={!ready || updating}
                  onClick={() => handleStatus("ready_for_review")}
                  title={!ready ? "Complete required fields first" : undefined}
                  className="px-3 py-1.5 text-[11px] font-mono rounded border border-amber text-amber hover:bg-amber-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark ready for review
                </button>
              )}
              {listing.publish_status === "ready_for_review" && (
                <>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatus("published")}
                    className="px-3 py-1.5 text-[11px] font-mono rounded border border-green text-green hover:bg-green-muted transition-colors disabled:opacity-40"
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatus("rejected")}
                    className="px-3 py-1.5 text-[11px] font-mono rounded border border-red text-red hover:bg-red-muted transition-colors disabled:opacity-40"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleStatus("draft")}
                    className="px-3 py-1.5 text-[11px] font-mono rounded border border-border text-foreground-muted hover:bg-surface-2 transition-colors disabled:opacity-40"
                  >
                    Return to draft
                  </button>
                </>
              )}
              {(listing.publish_status === "published" || listing.publish_status === "rejected") && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatus("draft")}
                  className="px-3 py-1.5 text-[11px] font-mono rounded border border-border text-foreground-muted hover:bg-surface-2 transition-colors disabled:opacity-40"
                >
                  Return to draft
                </button>
              )}
            </div>

            {/* Admin-only reviewer notes */}
            <div>
              <label className="text-[10px] text-foreground-subtle block mb-1">
                Reviewer notes <span className="text-red text-[9px]">· Admin only, not visible to broker</span>
              </label>
              <textarea
                rows={2}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Internal notes on this listing…"
                className="w-full bg-surface-1 border border-border text-foreground px-3 py-1.5 text-[11px] rounded resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Col 2: Listing data summary ── */}
        <div className="space-y-3">
          <span className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">
            Listing data
          </span>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
            <dt className="text-foreground-subtle">Price</dt>
            <dd className="text-foreground font-mono">{fmtPrice(listing.price, listing.currency)}</dd>
            <dt className="text-foreground-subtle">Type</dt>
            <dd className="text-foreground">{listing.property_type ?? "—"}</dd>
            <dt className="text-foreground-subtle">Location</dt>
            <dd className="text-foreground">{fmtLocation(listing.island, listing.city)}</dd>
            <dt className="text-foreground-subtle">Bedrooms</dt>
            <dd className="text-foreground">{listing.bedrooms ?? "—"}</dd>
            <dt className="text-foreground-subtle">Bathrooms</dt>
            <dd className="text-foreground">{listing.bathrooms ?? "—"}</dd>
            <dt className="text-foreground-subtle">sqm</dt>
            <dd className="text-foreground">{listing.property_size_sqm ?? "—"}</dd>
            <dt className="text-foreground-subtle">Photos</dt>
            <dd className="text-foreground">{listing.image_urls.length}</dd>
            <dt className="text-foreground-subtle">Contact</dt>
            <dd className="text-foreground text-[11px] break-all">
              {listing.contact_name ?? listing.contact_email ?? listing.contact_phone ?? "—"}
            </dd>
          </dl>
          {listing.description && (
            <div>
              <dt className="text-[11px] text-foreground-subtle mb-1">Description</dt>
              <p className="text-[12px] text-foreground leading-relaxed line-clamp-4">
                {listing.description}
              </p>
            </div>
          )}
        </div>

        {/* ── Col 3: Public preview ── */}
        <div className="space-y-3">
          <span className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">
            Public preview
          </span>
          <PublicListingPreview
            listing={listing}
            agencyName={agency.public_display_name ?? agency.agency_name}
          />
        </div>
      </div>
    </div>
  );
}

// ── Agency profile card ───────────────────────────────────────────────────────
// Broker-safe: no CRM fields, no internal notes, no relationship status.

function AgencyProfileCard({ agency }: { agency: Agency }) {
  return (
    <div className="surface-1 rounded-lg border border-border p-5">
      <div className="flex items-start gap-4">
        {/* Logo or placeholder */}
        {agency.logo_url ? (
          <img
            src={agency.logo_url}
            alt={agency.agency_name}
            className="w-14 h-14 rounded-lg object-contain border border-border bg-surface-2 flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 text-foreground-subtle text-xl font-mono font-bold border border-border">
            {agency.agency_name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-foreground">
            {agency.public_display_name ?? agency.agency_name}
          </div>
          {agency.public_display_name && agency.public_display_name !== agency.agency_name && (
            <div className="text-[11px] text-foreground-subtle font-mono">{agency.agency_name}</div>
          )}
          <div className="text-[11px] text-foreground-subtle font-mono uppercase tracking-wider mt-0.5">
            {agency.market_code === "cv" ? "Cape Verde" : agency.market_code}
          </div>
        </div>
      </div>

      {agency.description && (
        <p className="text-[12px] text-foreground-muted leading-relaxed mt-3">{agency.description}</p>
      )}

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        {agency.contact_person && (
          <>
            <dt className="text-foreground-subtle">Contact</dt>
            <dd className="text-foreground">{agency.contact_person}</dd>
          </>
        )}
        {agency.email && (
          <>
            <dt className="text-foreground-subtle">Email</dt>
            <dd className="text-foreground truncate">{agency.email}</dd>
          </>
        )}
        {agency.phone && (
          <>
            <dt className="text-foreground-subtle">Phone</dt>
            <dd className="text-foreground">{agency.phone}</dd>
          </>
        )}
        {agency.whatsapp && (
          <>
            <dt className="text-foreground-subtle">WhatsApp</dt>
            <dd className="text-foreground">{agency.whatsapp}</dd>
          </>
        )}
        {agency.website && (
          <>
            <dt className="text-foreground-subtle">Website</dt>
            <dd>
              <a
                href={agency.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline text-[12px]"
              >
                {agency.website.replace(/^https?:\/\//, "")}
              </a>
            </dd>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function BrokerPilotView() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [listings, setListings] = useState<PilotListing[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ open: boolean; listing: PilotListing | null }>({
    open: false,
    listing: null,
  });

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId) ?? null;

  // Load agencies
  useEffect(() => {
    getPilotAgencies().then((rows) => {
      setAgencies(rows);
      if (rows.length > 0) setSelectedAgencyId(rows[0].id);
      setLoadingAgencies(false);
    });
  }, []);

  // Load pilot listings when agency changes
  const loadListings = useCallback(async (agencyId: string) => {
    setLoadingListings(true);
    try {
      const rows = await getPilotListings(agencyId);
      setListings(rows);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgencyId) {
      loadListings(selectedAgencyId);
      setExpandedId(null);
    }
  }, [selectedAgencyId, loadListings]);

  const handleSaved = (l: PilotListing) => {
    setListings((prev) => {
      const idx = prev.findIndex((p) => p.id === l.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = l;
        return next;
      }
      return [l, ...prev];
    });
    setFormModal({ open: false, listing: null });
    setExpandedId(l.id);
  };

  const handleStatusChange = (updated: PilotListing) => {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  // Summary counts
  const draftCount = listings.filter((l) => l.publish_status === "draft").length;
  const readyCount = listings.filter((l) => l.publish_status === "ready_for_review").length;
  const publishedCount = listings.filter((l) => l.publish_status === "published").length;

  if (loadingAgencies) {
    return <p className="text-sm text-foreground-muted py-8">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Legacy banner ── */}
      {/* This is a legacy internal preview. New broker product work should happen in arei-broker. */}
      <div className="bg-amber-muted/60 border border-amber/40 rounded px-4 py-2 flex items-center gap-3">
        <span className="text-amber text-[11px] font-mono font-semibold uppercase tracking-wider">
          Legacy
        </span>
        <span className="text-[11px] text-foreground-muted">
          Legacy internal preview. The real broker-facing product lives in arei-broker. Use this only for historical testing and internal comparison.
        </span>
      </div>

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground font-mono">
            Legacy Broker Preview
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Agency profile · Listing intake · Quality check · Public preview
          </p>
        </div>
        {selectedAgency && (
          <button
            type="button"
            onClick={() => setFormModal({ open: true, listing: null })}
            className="px-5 py-2.5 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all"
          >
            + Add listing
          </button>
        )}
      </div>

      {agencies.length === 0 ? (
        <div className="surface-1 rounded border border-border border-dashed p-12 text-center">
          <h3 className="text-base font-semibold font-mono text-foreground mb-1">No agencies yet</h3>
          <p className="text-sm text-foreground-muted max-w-sm mx-auto">
            Create an agency in the Agency Console tab first, then return here to add pilot listings.
          </p>
        </div>
      ) : (
        <>
          {/* ── Agency selector ── */}
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Agency</label>
            <select
              value={selectedAgencyId}
              onChange={(e) => setSelectedAgencyId(e.target.value)}
              className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded min-w-[240px]"
            >
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>{a.agency_name}</option>
              ))}
            </select>
          </div>

          {selectedAgency && (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
              {/* ── Agency profile ── */}
              <div className="space-y-4">
                <AgencyProfileCard agency={selectedAgency} />
                {/* Pilot stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="surface-1 rounded p-3 border border-border text-center">
                    <div className="text-[10px] text-foreground-subtle uppercase tracking-wide mb-1">Draft</div>
                    <div className="text-lg font-bold font-mono">{draftCount}</div>
                  </div>
                  <div className="surface-1 rounded p-3 border border-border text-center">
                    <div className="text-[10px] text-amber uppercase tracking-wide mb-1">For review</div>
                    <div className="text-lg font-bold font-mono text-amber">{readyCount}</div>
                  </div>
                  <div className="surface-1 rounded p-3 border border-border text-center">
                    <div className="text-[10px] text-green uppercase tracking-wide mb-1">Published</div>
                    <div className="text-lg font-bold font-mono text-green">{publishedCount}</div>
                  </div>
                </div>
              </div>

              {/* ── Pilot listings ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold font-mono text-foreground">
                    Pilot listings
                    <span className="ml-2 text-foreground-subtle text-[11px] font-normal">{listings.length} total</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormModal({ open: true, listing: null })}
                    className="text-[11px] text-accent hover:underline font-mono"
                  >
                    + Add listing
                  </button>
                </div>

                {loadingListings && (
                  <p className="text-sm text-foreground-muted py-4">Loading listings…</p>
                )}

                {!loadingListings && listings.length === 0 && (
                  <div className="surface-1 rounded border border-border border-dashed p-10 text-center">
                    <h3 className="text-[13px] font-semibold font-mono text-foreground mb-1">No pilot listings yet</h3>
                    <p className="text-[12px] text-foreground-muted mb-3">
                      Add a listing to demonstrate the intake and quality workflow.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormModal({ open: true, listing: null })}
                      className="px-4 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all"
                    >
                      + Add first listing
                    </button>
                  </div>
                )}

                {!loadingListings && listings.length > 0 && (
                  <div className="surface-1 rounded border border-border overflow-hidden">
                    {listings.map((listing) => {
                      const checks = computePilotQualityChecks(listing);
                      const failedRequired = checks.filter((c) => c.severity === "required" && !c.passed);
                      const failedRec = checks.filter((c) => c.severity === "recommended" && !c.passed);
                      const isExpanded = expandedId === listing.id;

                      return (
                        <React.Fragment key={listing.id}>
                          <div
                            className={"border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors cursor-pointer " + (isExpanded ? "bg-surface-2/30" : "")}
                            onClick={() => setExpandedId((id) => id === listing.id ? null : listing.id)}
                          >
                            <div className="px-4 py-3 flex items-center gap-3">
                              {/* Expand */}
                              <span className={"text-foreground-subtle text-xs transition-transform duration-150 flex-shrink-0 " + (isExpanded ? "rotate-90" : "")}>▶</span>

                              {/* Thumbnail */}
                              {listing.image_urls[0] ? (
                                <img
                                  src={listing.image_urls[0]}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-surface-3 flex-shrink-0 flex items-center justify-center text-foreground-subtle text-[10px] font-mono">
                                  —
                                </div>
                              )}

                              {/* Title + meta */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{listing.title}</div>
                                <div className="text-[11px] text-foreground-subtle mt-0.5 flex gap-2 flex-wrap">
                                  <span>{fmtPrice(listing.price, listing.currency)}</span>
                                  {fmtLocation(listing.island, listing.city) !== "Location not set" && (
                                    <span>· {fmtLocation(listing.island, listing.city)}</span>
                                  )}
                                </div>
                              </div>

                              {/* Issue summary */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {failedRequired.length > 0 && (
                                  <span className="text-[10px] bg-red-muted text-red px-1.5 py-0.5 rounded font-mono">
                                    {failedRequired.length} required
                                  </span>
                                )}
                                {failedRec.length > 0 && failedRequired.length === 0 && (
                                  <span className="text-[10px] bg-amber-muted text-amber px-1.5 py-0.5 rounded font-mono">
                                    {failedRec.length} recommended
                                  </span>
                                )}
                                {failedRequired.length === 0 && failedRec.length === 0 && (
                                  <span className="text-[10px] text-green font-mono">✓</span>
                                )}
                              </div>

                              {/* Status */}
                              <PublishStatusBadge status={listing.publish_status} />
                            </div>
                          </div>

                          {isExpanded && (
                            <ListingDetailPanel
                              listing={listing}
                              agency={selectedAgency}
                              onEdit={() => setFormModal({ open: true, listing })}
                              onStatusChange={handleStatusChange}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Form modal ── */}
      {formModal.open && selectedAgency && (
        <IntakeFormModal
          agency={selectedAgency}
          listing={formModal.listing}
          onSaved={handleSaved}
          onClose={() => setFormModal({ open: false, listing: null })}
        />
      )}
    </div>
  );
}
