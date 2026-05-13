/**
 * Agency Console — V0 admin view.
 *
 * Two-layer model:
 *   - Agency profile (broker-safe): name, website, contact, claimed status, data partner status
 *   - Internal relationship (admin-only): outreach status, priority, lead quality, notes, follow-up date
 *
 * Future direction:
 *   This view is the foundation for a broker-facing product where agencies can:
 *   - Claim their profile and verify their listings
 *   - Fix missing data (sqm, bedrooms, bathrooms, photos)
 *   - See their listing visibility and data quality score
 *   - Submit data feeds to improve index coverage
 *   - Receive data quality recommendations
 *
 *   When building that external layer, expose ONLY the Agency profile columns.
 *   The agency_relationships table and internal_notes must NEVER be exposed to
 *   broker-facing APIs, views, or client queries.
 *
 * See docs/03-product/agency-console-v0.md for full context.
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  AgencyWithRelationship,
  Agency,
  AgencyRelationship,
  AgencyClaimedStatus,
  AgencyDataPartnerStatus,
  AgencyRelationshipStatus,
  AgencyPriority,
  AgencyLeadQuality,
} from "./types";
import {
  getAgenciesWithRelationships,
  createAgency,
  updateAgency,
  upsertAgencyRelationship,
  type AgencyInsert,
  type AgencyUpdate,
  type RelationshipUpsert,
} from "./agencyData";

// ── Label maps ───────────────────────────────────────────────────────────────

const CLAIMED_STATUS_LABELS: Record<AgencyClaimedStatus, string> = {
  unclaimed: "Unclaimed",
  invited: "Invited",
  claimed: "Claimed",
  verified: "Verified",
};

const DATA_PARTNER_LABELS: Record<AgencyDataPartnerStatus, string> = {
  none: "None",
  interested: "Interested",
  active: "Active",
  paused: "Paused",
};

const RELATIONSHIP_STATUS_LABELS: Record<AgencyRelationshipStatus, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  replied: "Replied",
  meeting_booked: "Meeting booked",
  onboarded: "Onboarded",
  rejected: "Rejected",
  dormant: "Dormant",
};

const PRIORITY_LABELS: Record<AgencyPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const LEAD_QUALITY_LABELS: Record<AgencyLeadQuality, string> = {
  unknown: "Unknown",
  strong: "Strong",
  average: "Average",
  weak: "Weak",
};

// ── Badge components ─────────────────────────────────────────────────────────

function ClaimedStatusBadge({ status }: { status: AgencyClaimedStatus }) {
  const cls: Record<AgencyClaimedStatus, string> = {
    unclaimed: "bg-surface-3 text-foreground-muted",
    invited: "bg-amber-muted text-amber",
    claimed: "bg-green-muted text-green",
    verified: "bg-green-muted text-green",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${cls[status]}`}>
      {CLAIMED_STATUS_LABELS[status]}
    </span>
  );
}

function DataPartnerBadge({ status }: { status: AgencyDataPartnerStatus }) {
  const cls: Record<AgencyDataPartnerStatus, string> = {
    none: "bg-surface-3 text-foreground-muted",
    interested: "bg-amber-muted text-amber",
    active: "bg-green-muted text-green",
    paused: "bg-surface-3 text-foreground-muted",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${cls[status]}`}>
      {DATA_PARTNER_LABELS[status]}
    </span>
  );
}

function RelationshipStatusBadge({ status }: { status: AgencyRelationshipStatus | undefined }) {
  if (!status) return <span className="text-foreground-subtle text-[11px]">—</span>;
  const cls: Record<AgencyRelationshipStatus, string> = {
    not_contacted: "bg-surface-3 text-foreground-muted",
    contacted: "bg-amber-muted text-amber",
    replied: "bg-amber-muted text-amber",
    meeting_booked: "bg-green-muted text-green",
    onboarded: "bg-green-muted text-green",
    rejected: "bg-red-muted text-red",
    dormant: "bg-surface-3 text-foreground-muted",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${cls[status]}`}>
      {RELATIONSHIP_STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: AgencyPriority | undefined }) {
  if (!priority) return <span className="text-foreground-subtle text-[11px]">—</span>;
  const cls: Record<AgencyPriority, string> = {
    high: "bg-red-muted text-red",
    medium: "bg-amber-muted text-amber",
    low: "bg-surface-3 text-foreground-muted",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${cls[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Agency form modal ─────────────────────────────────────────────────────────

interface AgencyFormValues {
  agency_name: string;
  public_display_name: string;
  market_code: string;
  website: string;
  email: string;
  phone: string;
  whatsapp: string;
  source_ids_raw: string; // comma-separated, converted to array on save
  claimed_status: AgencyClaimedStatus;
  data_partner_status: AgencyDataPartnerStatus;
  description: string;
}

function emptyAgencyForm(): AgencyFormValues {
  return {
    agency_name: "",
    public_display_name: "",
    market_code: "cv",
    website: "",
    email: "",
    phone: "",
    whatsapp: "",
    source_ids_raw: "",
    claimed_status: "unclaimed",
    data_partner_status: "none",
    description: "",
  };
}

function agencyToForm(a: Agency): AgencyFormValues {
  return {
    agency_name: a.agency_name,
    public_display_name: a.public_display_name ?? "",
    market_code: a.market_code,
    website: a.website ?? "",
    email: a.email ?? "",
    phone: a.phone ?? "",
    whatsapp: a.whatsapp ?? "",
    source_ids_raw: a.source_ids.join(", "),
    claimed_status: a.claimed_status,
    data_partner_status: a.data_partner_status,
    description: a.description ?? "",
  };
}

function formToInsert(f: AgencyFormValues): AgencyInsert {
  return {
    agency_name: f.agency_name.trim(),
    public_display_name: f.public_display_name.trim() || null,
    contact_person: null,
    market_code: f.market_code.trim() || "cv",
    website: f.website.trim() || null,
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    whatsapp: f.whatsapp.trim() || null,
    logo_url: null,
    source_ids: f.source_ids_raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    claimed_status: f.claimed_status,
    data_partner_status: f.data_partner_status,
    description: f.description.trim() || null,
  };
}

function AgencyFormModal({
  agency,
  onSave,
  onClose,
}: {
  agency: Agency | null;
  onSave: (a: Agency) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<AgencyFormValues>(
    agency ? agencyToForm(agency) : emptyAgencyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof AgencyFormValues, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agency_name.trim()) {
      setError("Agency name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = formToInsert(form);
      const saved = agency
        ? await updateAgency(agency.id, payload as AgencyUpdate)
        : await createAgency(payload);
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="surface-1 rounded-lg border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 surface-1">
          <h2 className="text-[15px] font-semibold font-mono text-foreground">
            {agency ? "Edit agency" : "New agency"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red bg-red-muted px-3 py-2 rounded">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">Agency name *</label>
              <input
                type="text"
                value={form.agency_name}
                onChange={(e) => set("agency_name", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                placeholder="e.g. Sol Properties CV"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">Public display name</label>
              <input
                type="text"
                value={form.public_display_name}
                onChange={(e) => set("public_display_name", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                placeholder="Name shown to public (if different)"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Market</label>
              <input
                type="text"
                value={form.market_code}
                onChange={(e) => set("market_code", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">WhatsApp</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Claimed status</label>
              <select
                value={form.claimed_status}
                onChange={(e) => set("claimed_status", e.target.value as AgencyClaimedStatus)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              >
                {(Object.keys(CLAIMED_STATUS_LABELS) as AgencyClaimedStatus[]).map((k) => (
                  <option key={k} value={k}>{CLAIMED_STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Data partner status</label>
              <select
                value={form.data_partner_status}
                onChange={(e) => set("data_partner_status", e.target.value as AgencyDataPartnerStatus)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              >
                {(Object.keys(DATA_PARTNER_LABELS) as AgencyDataPartnerStatus[]).map((k) => (
                  <option key={k} value={k}>{DATA_PARTNER_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">
                Linked source IDs
                <span className="ml-1 text-foreground-subtle font-normal">(comma-separated, e.g. cv_solprop, cv_solprop2)</span>
              </label>
              <input
                type="text"
                value={form.source_ids_raw}
                onChange={(e) => set("source_ids_raw", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded font-mono"
                placeholder="cv_source1, cv_source2"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none"
                placeholder="Short public-facing description"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
              {saving ? "Saving…" : agency ? "Save changes" : "Create agency"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Relationship form modal ───────────────────────────────────────────────────

interface RelFormValues {
  relationship_status: AgencyRelationshipStatus;
  priority: AgencyPriority;
  lead_quality: AgencyLeadQuality;
  relationship_owner: string;
  last_contacted_at: string;
  next_follow_up_at: string;
  internal_notes: string;
}

function emptyRelForm(): RelFormValues {
  return {
    relationship_status: "not_contacted",
    priority: "medium",
    lead_quality: "unknown",
    relationship_owner: "",
    last_contacted_at: "",
    next_follow_up_at: "",
    internal_notes: "",
  };
}

function relToForm(r: AgencyRelationship): RelFormValues {
  return {
    relationship_status: r.relationship_status,
    priority: r.priority,
    lead_quality: r.lead_quality,
    relationship_owner: r.relationship_owner ?? "",
    last_contacted_at: r.last_contacted_at ? r.last_contacted_at.slice(0, 10) : "",
    next_follow_up_at: r.next_follow_up_at ? r.next_follow_up_at.slice(0, 10) : "",
    internal_notes: r.internal_notes ?? "",
  };
}

function RelationshipModal({
  agency,
  relationship,
  onSave,
  onClose,
}: {
  agency: Agency;
  relationship: AgencyRelationship | null;
  onSave: (r: AgencyRelationship) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RelFormValues>(
    relationship ? relToForm(relationship) : emptyRelForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof RelFormValues, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: RelationshipUpsert = {
        agency_id: agency.id,
        relationship_status: form.relationship_status,
        priority: form.priority,
        lead_quality: form.lead_quality,
        relationship_owner: form.relationship_owner.trim() || null,
        last_contacted_at: form.last_contacted_at || null,
        next_follow_up_at: form.next_follow_up_at || null,
        internal_notes: form.internal_notes.trim() || null,
      };
      const saved = await upsertAgencyRelationship(payload);
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="surface-1 rounded-lg border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 surface-1">
          <div>
            <h2 className="text-[15px] font-semibold font-mono text-foreground">Relationship details</h2>
            <p className="text-[11px] text-foreground-subtle mt-0.5">{agency.agency_name} · Internal only</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted hover:text-foreground transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red bg-red-muted px-3 py-2 rounded">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Relationship status</label>
              <select
                value={form.relationship_status}
                onChange={(e) => set("relationship_status", e.target.value as AgencyRelationshipStatus)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              >
                {(Object.keys(RELATIONSHIP_STATUS_LABELS) as AgencyRelationshipStatus[]).map((k) => (
                  <option key={k} value={k}>{RELATIONSHIP_STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as AgencyPriority)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              >
                {(Object.keys(PRIORITY_LABELS) as AgencyPriority[]).map((k) => (
                  <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Lead quality</label>
              <select
                value={form.lead_quality}
                onChange={(e) => set("lead_quality", e.target.value as AgencyLeadQuality)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              >
                {(Object.keys(LEAD_QUALITY_LABELS) as AgencyLeadQuality[]).map((k) => (
                  <option key={k} value={k}>{LEAD_QUALITY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Relationship owner</label>
              <input
                type="text"
                value={form.relationship_owner}
                onChange={(e) => set("relationship_owner", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                placeholder="e.g. Founder"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Last contacted</label>
              <input
                type="date"
                value={form.last_contacted_at}
                onChange={(e) => set("last_contacted_at", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Next follow-up</label>
              <input
                type="date"
                value={form.next_follow_up_at}
                onChange={(e) => set("next_follow_up_at", e.target.value)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">
                Internal notes
                <span className="ml-1 text-red text-[10px]">· Never shown to agencies</span>
              </label>
              <textarea
                value={form.internal_notes}
                onChange={(e) => set("internal_notes", e.target.value)}
                rows={4}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-y"
                placeholder="Internal context, outreach notes, agency background…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
              {saving ? "Saving…" : "Save relationship"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Agency detail row (expanded) ──────────────────────────────────────────────

function AgencyDetailPanel({
  agency,
  onEditAgency,
  onEditRelationship,
}: {
  agency: AgencyWithRelationship;
  onEditAgency: () => void;
  onEditRelationship: () => void;
}) {
  const rel = agency.relationship;

  return (
    <div className="px-4 pb-5 pt-3 border-t border-border bg-surface-2/40">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Agency profile ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Agency profile</span>
            <button
              type="button"
              onClick={onEditAgency}
              className="text-[11px] text-accent hover:underline font-mono"
            >
              Edit profile
            </button>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {agency.website && (
              <>
                <dt className="text-foreground-subtle text-[11px]">Website</dt>
                <dd className="text-foreground truncate">
                  <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-[12px]">
                    {agency.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </>
            )}
            {agency.email && (
              <>
                <dt className="text-foreground-subtle text-[11px]">Email</dt>
                <dd className="text-foreground text-[12px]">{agency.email}</dd>
              </>
            )}
            {agency.phone && (
              <>
                <dt className="text-foreground-subtle text-[11px]">Phone</dt>
                <dd className="text-foreground text-[12px]">{agency.phone}</dd>
              </>
            )}
            {agency.whatsapp && (
              <>
                <dt className="text-foreground-subtle text-[11px]">WhatsApp</dt>
                <dd className="text-foreground text-[12px]">{agency.whatsapp}</dd>
              </>
            )}
            <dt className="text-foreground-subtle text-[11px]">Market</dt>
            <dd className="text-foreground font-mono text-[12px] uppercase">{agency.market_code}</dd>
            <dt className="text-foreground-subtle text-[11px]">Added</dt>
            <dd className="text-foreground text-[12px]">{formatDate(agency.created_at)}</dd>
          </dl>

          {/* Source IDs */}
          {agency.source_ids.length > 0 && (
            <div>
              <div className="text-[11px] text-foreground-subtle mb-1">Linked sources</div>
              <div className="flex flex-wrap gap-1">
                {agency.source_ids.map((sid) => (
                  <span key={sid} className="bg-surface-3 text-foreground-muted text-[11px] font-mono px-2 py-0.5 rounded">
                    {sid}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Data quality placeholder */}
          <div className="border border-border border-dashed rounded p-3">
            <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider mb-1">
              Data quality
            </div>
            {agency.source_ids.length > 0 ? (
              <p className="text-[11px] text-foreground-muted">
                {/* TODO: join with get_source_quality_stats() RPC to show per-source
                    listing count, image coverage, price coverage, sqm coverage, and health grade.
                    See arei-admin/data.ts getDashboardStats() for the existing query pattern. */}
                Quality data available for linked sources — wire up to source health RPC.
              </p>
            ) : (
              <p className="text-[11px] text-foreground-muted">No sources linked yet.</p>
            )}
          </div>

          {agency.description && (
            <div>
              <div className="text-[11px] text-foreground-subtle mb-1">Description</div>
              <p className="text-[12px] text-foreground leading-relaxed">{agency.description}</p>
            </div>
          )}
        </div>

        {/* ── Internal relationship ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">
              Relationship
              <span className="ml-1.5 text-[10px] text-red normal-case font-normal">· Internal only</span>
            </span>
            <button
              type="button"
              onClick={onEditRelationship}
              className="text-[11px] text-accent hover:underline font-mono"
            >
              {rel ? "Edit" : "Add details"}
            </button>
          </div>

          {rel ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-foreground-subtle text-[11px]">Status</dt>
                <dd><RelationshipStatusBadge status={rel.relationship_status} /></dd>
                <dt className="text-foreground-subtle text-[11px]">Priority</dt>
                <dd><PriorityBadge priority={rel.priority} /></dd>
                <dt className="text-foreground-subtle text-[11px]">Lead quality</dt>
                <dd className="text-foreground text-[12px]">{LEAD_QUALITY_LABELS[rel.lead_quality]}</dd>
                {rel.relationship_owner && (
                  <>
                    <dt className="text-foreground-subtle text-[11px]">Owner</dt>
                    <dd className="text-foreground text-[12px]">{rel.relationship_owner}</dd>
                  </>
                )}
                <dt className="text-foreground-subtle text-[11px]">Last contacted</dt>
                <dd className="text-foreground text-[12px]">{formatDate(rel.last_contacted_at)}</dd>
                <dt className="text-foreground-subtle text-[11px]">Next follow-up</dt>
                <dd className="text-foreground text-[12px]">{formatDate(rel.next_follow_up_at)}</dd>
              </dl>

              {rel.internal_notes && (
                <div>
                  <div className="text-[11px] text-foreground-subtle mb-1">Notes</div>
                  <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap bg-surface-3/60 rounded px-3 py-2">
                    {rel.internal_notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="border border-border border-dashed rounded p-4 text-center">
              <p className="text-[12px] text-foreground-muted mb-2">No relationship record yet.</p>
              <button
                type="button"
                onClick={onEditRelationship}
                className="text-[11px] text-accent hover:underline font-mono"
              >
                Add relationship details →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

type ClaimedFilter = AgencyClaimedStatus | "all";
type DataPartnerFilter = AgencyDataPartnerStatus | "all";
type RelStatusFilter = AgencyRelationshipStatus | "all";
type PriorityFilter = AgencyPriority | "all";

export function AgencyConsoleView() {
  const [agencies, setAgencies] = useState<AgencyWithRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [claimedFilter, setClaimedFilter] = useState<ClaimedFilter>("all");
  const [partnerFilter, setPartnerFilter] = useState<DataPartnerFilter>("all");
  const [relStatusFilter, setRelStatusFilter] = useState<RelStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Modals
  const [agencyModal, setAgencyModal] = useState<{ open: boolean; agency: Agency | null }>({
    open: false,
    agency: null,
  });
  const [relModal, setRelModal] = useState<{ open: boolean; agency: Agency | null; rel: AgencyRelationship | null }>({
    open: false,
    agency: null,
    rel: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getAgenciesWithRelationships();
      setAgencies(rows);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load agencies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter logic
  const filtered = agencies.filter((a) => {
    if (claimedFilter !== "all" && a.claimed_status !== claimedFilter) return false;
    if (partnerFilter !== "all" && a.data_partner_status !== partnerFilter) return false;
    if (relStatusFilter !== "all" && a.relationship?.relationship_status !== relStatusFilter) return false;
    if (priorityFilter !== "all" && a.relationship?.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = a.agency_name.toLowerCase().includes(q);
      const webMatch = (a.website ?? "").toLowerCase().includes(q);
      const sourceMatch = a.source_ids.some((s) => s.toLowerCase().includes(q));
      if (!nameMatch && !webMatch && !sourceMatch) return false;
    }
    return true;
  });

  // Summary counts
  const totalCount = agencies.length;
  const activePartners = agencies.filter((a) => a.data_partner_status === "active").length;
  const claimedCount = agencies.filter((a) => a.claimed_status === "claimed" || a.claimed_status === "verified").length;
  const dueFollowUp = agencies.filter((a) => {
    const d = a.relationship?.next_follow_up_at;
    if (!d) return false;
    return new Date(d) <= new Date();
  }).length;

  const handleAgencySaved = (saved: Agency) => {
    setAgencies((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [{ ...saved, relationship: null }, ...prev];
    });
    setAgencyModal({ open: false, agency: null });
  };

  const handleRelSaved = (saved: AgencyRelationship) => {
    setAgencies((prev) =>
      prev.map((a) => (a.id === saved.agency_id ? { ...a, relationship: saved } : a))
    );
    setRelModal({ open: false, agency: null, rel: null });
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground font-mono">
            Agency Relationships
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Manage agency relationships, data partnerships, and listing source links.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAgencyModal({ open: true, agency: null })}
          className="px-5 py-2.5 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all"
        >
          + New agency
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-1 rounded p-4 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Total agencies</div>
          <div className="text-2xl font-bold tabular-nums font-mono">{totalCount}</div>
        </div>
        <div className="surface-1 rounded p-4 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Active partners</div>
          <div className="text-2xl font-bold tabular-nums font-mono text-green">{activePartners}</div>
        </div>
        <div className="surface-1 rounded p-4 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Claimed</div>
          <div className="text-2xl font-bold tabular-nums font-mono">{claimedCount}</div>
        </div>
        <div className="surface-1 rounded p-4 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Follow-up due</div>
          <div className={`text-2xl font-bold tabular-nums font-mono ${dueFollowUp > 0 ? "text-amber" : ""}`}>{dueFollowUp}</div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] text-foreground-subtle block mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Agency name, website, or source ID…"
            className="w-full bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
          />
        </div>
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Claimed status</label>
          <select
            value={claimedFilter}
            onChange={(e) => setClaimedFilter(e.target.value as ClaimedFilter)}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
          >
            <option value="all">All</option>
            {(Object.keys(CLAIMED_STATUS_LABELS) as AgencyClaimedStatus[]).map((k) => (
              <option key={k} value={k}>{CLAIMED_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Data partner</label>
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value as DataPartnerFilter)}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
          >
            <option value="all">All</option>
            {(Object.keys(DATA_PARTNER_LABELS) as AgencyDataPartnerStatus[]).map((k) => (
              <option key={k} value={k}>{DATA_PARTNER_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Relationship</label>
          <select
            value={relStatusFilter}
            onChange={(e) => setRelStatusFilter(e.target.value as RelStatusFilter)}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
          >
            <option value="all">All</option>
            {(Object.keys(RELATIONSHIP_STATUS_LABELS) as AgencyRelationshipStatus[]).map((k) => (
              <option key={k} value={k}>{RELATIONSHIP_STATUS_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
          >
            <option value="all">All</option>
            {(Object.keys(PRIORITY_LABELS) as AgencyPriority[]).map((k) => (
              <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading && <p className="text-foreground-muted text-sm py-8">Loading agencies…</p>}
      {loadError && <p className="text-red text-sm py-4">{loadError}</p>}

      {!loading && agencies.length === 0 && (
        <div className="surface-1 rounded border border-border border-dashed p-14 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-accent text-lg">◉</span>
          </div>
          <h3 className="text-base font-semibold text-foreground font-mono mb-1.5">No agencies yet</h3>
          <p className="text-sm text-foreground-muted max-w-sm mx-auto leading-relaxed">
            Add agencies to begin tracking data partnerships and listing source relationships.
          </p>
          <button
            type="button"
            onClick={() => setAgencyModal({ open: true, agency: null })}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all"
          >
            + New agency
          </button>
        </div>
      )}

      {!loading && agencies.length > 0 && (
        <div className="surface-1 rounded border border-border overflow-x-auto">
          <table className="w-full min-w-[900px] data-table">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider w-8" />
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Agency</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Website</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Sources</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Claimed</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Partner</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Relationship</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Priority</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Last contact</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Follow-up</th>
                <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-foreground-muted">
                    No agencies match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((agency) => {
                const rel = agency.relationship;
                const isExpanded = expandedIds.has(agency.id);
                const followUpDate = rel?.next_follow_up_at;
                const followUpDue = followUpDate && new Date(followUpDate) <= new Date();
                return (
                  <React.Fragment key={agency.id}>
                    <tr
                      className={"border-b border-border last:border-0 hover:bg-surface-2/60 transition-colors cursor-pointer " + (isExpanded ? "bg-surface-2/40" : "")}
                      onClick={() => toggleExpand(agency.id)}
                    >
                      {/* Expand chevron */}
                      <td className="px-4 py-3 text-foreground-subtle text-xs">
                        <span className={"transition-transform duration-150 inline-block " + (isExpanded ? "rotate-90" : "")}>▶</span>
                      </td>
                      {/* Agency name */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-foreground">{agency.agency_name}</div>
                        {agency.public_display_name && agency.public_display_name !== agency.agency_name && (
                          <div className="text-[11px] text-foreground-subtle">{agency.public_display_name}</div>
                        )}
                      </td>
                      {/* Website */}
                      <td className="px-4 py-3 text-[12px] text-foreground-muted max-w-[160px] truncate">
                        {agency.website ? (
                          <a
                            href={agency.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-accent hover:underline"
                          >
                            {agency.website.replace(/^https?:\/\//, "")}
                          </a>
                        ) : "—"}
                      </td>
                      {/* Sources */}
                      <td className="px-4 py-3">
                        {agency.source_ids.length > 0 ? (
                          <span className="text-[11px] font-mono text-foreground-muted">
                            {agency.source_ids.length === 1
                              ? agency.source_ids[0]
                              : `${agency.source_ids.length} sources`}
                          </span>
                        ) : (
                          <span className="text-foreground-subtle text-[11px]">—</span>
                        )}
                      </td>
                      {/* Claimed status */}
                      <td className="px-4 py-3">
                        <ClaimedStatusBadge status={agency.claimed_status} />
                      </td>
                      {/* Data partner */}
                      <td className="px-4 py-3">
                        <DataPartnerBadge status={agency.data_partner_status} />
                      </td>
                      {/* Relationship status */}
                      <td className="px-4 py-3">
                        <RelationshipStatusBadge status={rel?.relationship_status} />
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PriorityBadge priority={rel?.priority} />
                      </td>
                      {/* Last contacted */}
                      <td className="px-4 py-3 text-[12px] text-foreground-muted whitespace-nowrap">
                        {formatDate(rel?.last_contacted_at)}
                      </td>
                      {/* Next follow-up */}
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                        <span className={followUpDue ? "text-amber font-medium" : "text-foreground-muted"}>
                          {formatDate(followUpDate)}
                        </span>
                      </td>
                      {/* Notes preview */}
                      <td className="px-4 py-3 max-w-[180px]">
                        {rel?.internal_notes ? (
                          <span className="text-[11px] text-foreground-subtle truncate block">
                            {rel.internal_notes.slice(0, 60)}{rel.internal_notes.length > 60 ? "…" : ""}
                          </span>
                        ) : (
                          <span className="text-foreground-subtle text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${agency.id}-detail`} className="border-b border-border">
                        <td colSpan={11} className="p-0">
                          <AgencyDetailPanel
                            agency={agency}
                            onEditAgency={() => {
                              setAgencyModal({ open: true, agency });
                            }}
                            onEditRelationship={() => {
                              setRelModal({ open: true, agency, rel: agency.relationship });
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {agencyModal.open && (
        <AgencyFormModal
          agency={agencyModal.agency}
          onSave={handleAgencySaved}
          onClose={() => setAgencyModal({ open: false, agency: null })}
        />
      )}
      {relModal.open && relModal.agency && (
        <RelationshipModal
          agency={relModal.agency}
          relationship={relModal.rel}
          onSave={handleRelSaved}
          onClose={() => setRelModal({ open: false, agency: null, rel: null })}
        />
      )}
    </div>
  );
}
