/**
 * Agency Data Console — V0
 *
 * The data acquisition product. Complements the Agency Console CRM.
 *
 * This view shows AREI admins:
 *   1. Per-agency listing quality dashboard
 *   2. Listing quality table with missing-field detection and data quality scores
 *   3. Correction submission panel per listing
 *   4. Review queue for submitted broker corrections
 *
 * Future direction:
 *   This view is designed to become a broker-facing product. When broker auth
 *   is added, agencies will log in and see only their own listings, submit
 *   corrections directly, and track the status of their submissions.
 *
 *   Internal admin state (reviewer_notes, CRM fields) must NEVER appear in the
 *   broker-facing version of this view.
 *
 * See docs/03-product/agency-data-console-v0.md
 */

import React, { useState, useEffect, useCallback } from "react";
import type {
  Agency,
  ListingQualityRow,
  AgencyListingSubmission,
  SubmissionPayload,
  SubmissionType,
  IssueType,
  AvailabilityStatus,
} from "./types";
import { supabase } from "./supabase";
import {
  getAgencyListingQuality,
  getPendingSubmissions,
  createSubmission,
  reviewSubmission,
  writeAgencyQualitySnapshot,
} from "./agencyDataConsole";

// ── Label/display maps ────────────────────────────────────────────────────────

const ISSUE_LABELS: Record<IssueType, string> = {
  missing_price: "Missing price",
  missing_sqm: "Missing sqm",
  missing_bedrooms: "Missing bedrooms",
  missing_bathrooms: "Missing bathrooms",
  missing_location: "Missing location",
  missing_photos: "Missing photos",
  weak_description: "Weak description",
  stale_listing: "Stale listing",
  possible_duplicate: "Possible duplicate",
  broken_image: "Broken image",
  suspicious_price: "Suspicious price",
};

const ISSUE_SEVERITY: Record<IssueType, "high" | "medium" | "low"> = {
  missing_price: "high",
  missing_photos: "high",
  missing_sqm: "medium",
  missing_bedrooms: "medium",
  missing_bathrooms: "medium",
  missing_location: "medium",
  weak_description: "low",
  stale_listing: "medium",
  possible_duplicate: "medium",
  broken_image: "high",
  suspicious_price: "medium",
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: "Available",
  sold: "Sold",
  reserved: "Reserved",
  rented: "Rented",
  duplicate: "Duplicate",
  removed: "Removed",
  unknown: "Unknown",
};

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  new_listing: "New listing",
  update_existing: "Update",
  availability_update: "Availability",
  duplicate_report: "Duplicate report",
  removal_request: "Removal request",
};

// ── Utility ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(price: number | null | undefined, currency?: string): string {
  if (price == null) return "—";
  return (currency === "EUR" ? "€" : (currency ?? "")) + " " + price.toLocaleString();
}

// ── Quality score badge ───────────────────────────────────────────────────────

function QualityScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-green-muted text-green"
      : score >= 50
      ? "bg-amber-muted text-amber"
      : "bg-red-muted text-red";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-6 text-xs font-mono font-semibold rounded ${cls}`}>
      {score}
    </span>
  );
}

// ── Issue chip ────────────────────────────────────────────────────────────────

function IssueChip({ issue }: { issue: IssueType }) {
  const sev = ISSUE_SEVERITY[issue];
  const cls =
    sev === "high"
      ? "bg-red-muted text-red"
      : sev === "medium"
      ? "bg-amber-muted text-amber"
      : "bg-surface-3 text-foreground-muted";
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono rounded ${cls}`}>
      {ISSUE_LABELS[issue]}
    </span>
  );
}

// ── Submission status badge ───────────────────────────────────────────────────

function SubmissionStatusBadge({ status }: { status: AgencyListingSubmission["status"] | undefined }) {
  if (!status) return null;
  const cls: Record<string, string> = {
    draft: "bg-surface-3 text-foreground-muted",
    submitted: "bg-amber-muted text-amber",
    under_review: "bg-amber-muted text-amber",
    approved: "bg-green-muted text-green",
    rejected: "bg-red-muted text-red",
    needs_more_info: "bg-surface-3 text-foreground-muted",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Needs review",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
    needs_more_info: "Needs info",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono font-medium rounded ${cls[status] ?? "bg-surface-3 text-foreground-muted"}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Correction panel — for one listing ───────────────────────────────────────

interface CorrectionPanelProps {
  listing: ListingQualityRow;
  agencyId: string;
  onSubmitted: (submission: AgencyListingSubmission) => void;
  onClose: () => void;
}

function CorrectionPanel({ listing, agencyId, onSubmitted, onClose }: CorrectionPanelProps) {
  const [submissionType, setSubmissionType] = useState<SubmissionType>("update_existing");
  const [availability, setAvailability] = useState<AvailabilityStatus>("available");
  const [fields, setFields] = useState<SubmissionPayload>({});
  const [agencyNote, setAgencyNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof SubmissionPayload>(k: K, v: SubmissionPayload[K]) =>
    setFields((f) => ({ ...f, [k]: v }));

  const hasExistingSubmission = !!listing.pending_submission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let payload: SubmissionPayload = { ...fields, agency_note: agencyNote.trim() || null };
      if (submissionType === "availability_update") {
        payload = { availability_status: availability, agency_note: agencyNote.trim() || null };
      }
      const sub = await createSubmission({
        agency_id: agencyId,
        listing_id: listing.id,
        submission_type: submissionType,
        payload,
      });
      onSubmitted(sub);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-border bg-surface-2/50 px-4 pb-5 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold font-mono text-foreground">Improve listing data</h3>
          <p className="text-[11px] text-foreground-subtle mt-0.5">
            Proposed changes are submitted for AREI review before publication.
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-foreground-muted hover:text-foreground transition-colors">
          ✕
        </button>
      </div>

      {hasExistingSubmission && (
        <div className="mb-4 p-3 border border-border rounded bg-surface-1 text-[12px]">
          <span className="text-foreground-subtle">Pending submission: </span>
          <SubmissionStatusBadge status={listing.pending_submission!.status} />
          <span className="text-foreground-subtle ml-2">
            {SUBMISSION_TYPE_LABELS[listing.pending_submission!.submission_type]} ·{" "}
            {formatDate(listing.pending_submission!.submitted_at)}
          </span>
        </div>
      )}

      {/* Current data summary */}
      <div className="mb-4 p-3 border border-border rounded bg-surface-1">
        <div className="text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider mb-2">Current AREI data</div>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-[12px]">
          <dt className="text-foreground-subtle">Price</dt>
          <dd className="col-span-2 text-foreground">{formatCurrency(listing.price, listing.currency)}</dd>
          <dt className="text-foreground-subtle">Bedrooms</dt>
          <dd className="col-span-2 text-foreground">{listing.bedrooms ?? "—"}</dd>
          <dt className="text-foreground-subtle">Bathrooms</dt>
          <dd className="col-span-2 text-foreground">{listing.bathrooms ?? "—"}</dd>
          <dt className="text-foreground-subtle">sqm</dt>
          <dd className="col-span-2 text-foreground">{listing.property_size_sqm ?? "—"}</dd>
          <dt className="text-foreground-subtle">Location</dt>
          <dd className="col-span-2 text-foreground">{[listing.city, listing.island].filter(Boolean).join(", ") || "—"}</dd>
          <dt className="text-foreground-subtle">Photos</dt>
          <dd className="col-span-2 text-foreground">{listing.image_urls.length} image{listing.image_urls.length !== 1 ? "s" : ""}</dd>
        </dl>
        {listing.issues.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {listing.issues.map((i) => <IssueChip key={i} issue={i} />)}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-red bg-red-muted px-3 py-2 rounded">{error}</p>}

        {/* Submission type selector */}
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Correction type</label>
          <div className="flex flex-wrap gap-2">
            {(["update_existing", "availability_update", "duplicate_report", "removal_request"] as SubmissionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSubmissionType(t)}
                className={
                  "px-3 py-1.5 text-[11px] font-mono rounded border transition-colors " +
                  (submissionType === t
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border text-foreground-muted hover:text-foreground hover:bg-surface-2")
                }
              >
                {SUBMISSION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Availability update */}
        {submissionType === "availability_update" && (
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">New availability status</label>
            <div className="flex flex-wrap gap-2">
              {(["available", "sold", "reserved", "rented", "duplicate", "removed"] as AvailabilityStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAvailability(s)}
                  className={
                    "px-3 py-1.5 text-[11px] font-mono rounded border transition-colors " +
                    (availability === s
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-foreground-muted hover:text-foreground hover:bg-surface-2")
                  }
                >
                  {AVAILABILITY_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Field corrections for update_existing */}
        {submissionType === "update_existing" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Price</label>
              <input
                type="number"
                placeholder={listing.price?.toString() ?? "Missing"}
                value={fields.price ?? ""}
                onChange={(e) => setField("price", e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">sqm</label>
              <input
                type="number"
                placeholder={listing.property_size_sqm?.toString() ?? "Missing"}
                value={fields.property_size_sqm ?? ""}
                onChange={(e) => setField("property_size_sqm", e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Bedrooms</label>
              <input
                type="number"
                placeholder={listing.bedrooms?.toString() ?? "Missing"}
                value={fields.bedrooms ?? ""}
                onChange={(e) => setField("bedrooms", e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Bathrooms</label>
              <input
                type="number"
                placeholder={listing.bathrooms?.toString() ?? "Missing"}
                value={fields.bathrooms ?? ""}
                onChange={(e) => setField("bathrooms", e.target.value ? Number(e.target.value) : null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Island</label>
              <input
                type="text"
                placeholder={listing.island ?? "Missing"}
                value={fields.island ?? ""}
                onChange={(e) => setField("island", e.target.value || null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">City / area</label>
              <input
                type="text"
                placeholder={listing.city ?? "Missing"}
                value={fields.city ?? ""}
                onChange={(e) => setField("city", e.target.value || null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Property type</label>
              <input
                type="text"
                placeholder={listing.property_type ?? "e.g. Villa, Apartment"}
                value={fields.property_type ?? ""}
                onChange={(e) => setField("property_type", e.target.value || null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-foreground-subtle block mb-1">Description</label>
              <textarea
                rows={3}
                placeholder={listing.description?.slice(0, 60) ?? "Missing description"}
                value={fields.description ?? ""}
                onChange={(e) => setField("description", e.target.value || null)}
                className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none"
              />
            </div>
          </div>
        )}

        {/* Duplicate report */}
        {submissionType === "duplicate_report" && (
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Original listing ID (if known)</label>
            <input
              type="text"
              placeholder="e.g. abc123"
              value={fields.duplicate_of_id ?? ""}
              onChange={(e) => setField("duplicate_of_id", e.target.value || null)}
              className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded font-mono"
            />
          </div>
        )}

        {/* Agency note — always visible */}
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Note to AREI</label>
          <textarea
            rows={2}
            placeholder="Explain your correction or provide context…"
            value={agencyNote}
            onChange={(e) => setAgencyNote(e.target.value)}
            className="w-full bg-surface-2 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 text-sm font-medium rounded bg-accent text-accent-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit correction"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Listing quality table row ─────────────────────────────────────────────────

function ListingQualityTableRow({
  row,
  agencyId,
  expanded,
  onToggle,
  onSubmitted,
}: {
  row: ListingQualityRow;
  agencyId: string;
  expanded: boolean;
  onToggle: () => void;
  onSubmitted: (s: AgencyListingSubmission) => void;
}) {
  const highIssues = row.issues.filter((i) => ISSUE_SEVERITY[i] === "high");
  const medIssues = row.issues.filter((i) => ISSUE_SEVERITY[i] === "medium");
  const displayIssues = [...highIssues, ...medIssues].slice(0, 3);
  const remainder = row.issues.length - displayIssues.length;

  return (
    <>
      <tr
        className={"border-b border-border last:border-0 hover:bg-surface-2/60 transition-colors cursor-pointer " + (expanded ? "bg-surface-2/40" : "")}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-foreground-subtle text-xs">
          <span className={"transition-transform duration-150 inline-block " + (expanded ? "rotate-90" : "")}>▶</span>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-foreground max-w-[220px] truncate">
            {row.title ?? <span className="text-foreground-subtle italic">No title</span>}
          </div>
          <div className="text-[10px] text-foreground-subtle font-mono mt-0.5">{row.source_id}</div>
        </td>
        <td className="px-4 py-3 text-[12px] text-foreground whitespace-nowrap">
          {formatCurrency(row.price, row.currency)}
        </td>
        <td className="px-4 py-3 text-[12px] text-foreground-muted whitespace-nowrap">
          {[row.island, row.city].filter(Boolean).join(", ") || "—"}
        </td>
        <td className="px-4 py-3">
          <QualityScoreBadge score={row.quality_score} />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {displayIssues.map((i) => <IssueChip key={i} issue={i} />)}
            {remainder > 0 && (
              <span className="text-[10px] text-foreground-muted">+{remainder}</span>
            )}
            {row.issues.length === 0 && (
              <span className="text-[11px] text-green font-mono">✓ Clean</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {row.pending_submission ? (
            <SubmissionStatusBadge status={row.pending_submission.status} />
          ) : (
            <span className="text-foreground-subtle text-[11px]">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-[12px] text-foreground-muted whitespace-nowrap">
          {formatDate(row.updated_at)}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="text-[11px] text-accent hover:underline font-mono whitespace-nowrap"
          >
            {expanded ? "Close" : "Improve data →"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border">
          <td colSpan={9} className="p-0">
            <CorrectionPanel
              listing={row}
              agencyId={agencyId}
              onSubmitted={(s) => onSubmitted(s)}
              onClose={onToggle}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Review queue ──────────────────────────────────────────────────────────────

function ReviewQueue({
  agencyFilter,
  agencies,
}: {
  agencyFilter: string | null;
  agencies: Agency[];
}) {
  const [submissions, setSubmissions] = useState<AgencyListingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  const agencyById = new Map(agencies.map((a) => [a.id, a]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getPendingSubmissions();
      setSubmissions(
        agencyFilter ? rows.filter((s) => s.agency_id === agencyFilter) : rows
      );
    } finally {
      setLoading(false);
    }
  }, [agencyFilter]);

  useEffect(() => { load(); }, [load]);

  const handle = async (
    id: string,
    status: "approved" | "rejected" | "needs_more_info" | "under_review"
  ) => {
    setReviewing(id);
    try {
      const updated = await reviewSubmission(id, status, reviewerNotes[id]);
      setSubmissions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } finally {
      setReviewing(null);
    }
  };

  if (loading) return <p className="text-sm text-foreground-muted py-8">Loading submissions…</p>;

  if (submissions.length === 0) {
    return (
      <div className="surface-1 rounded border border-border border-dashed p-12 text-center">
        <h3 className="text-base font-semibold text-foreground font-mono mb-1">No pending submissions</h3>
        <p className="text-sm text-foreground-muted">All broker corrections have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((sub) => {
        const agency = agencyById.get(sub.agency_id);
        const payload = sub.payload as SubmissionPayload;
        const changedFields = Object.entries(payload).filter(
          ([k, v]) => k !== "agency_note" && v !== null && v !== undefined
        );
        return (
          <div key={sub.id} className="surface-1 rounded border border-border overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3 bg-surface-2/30">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {agency?.agency_name ?? sub.agency_id}
                </span>
                <span className="mx-2 text-foreground-subtle">·</span>
                <span className="text-[12px] text-foreground-muted">
                  {SUBMISSION_TYPE_LABELS[sub.submission_type]}
                </span>
                {sub.listing_id && (
                  <>
                    <span className="mx-2 text-foreground-subtle">·</span>
                    <span className="text-[11px] font-mono text-foreground-subtle">
                      {sub.listing_id.slice(0, 12)}…
                    </span>
                  </>
                )}
              </div>
              <SubmissionStatusBadge status={sub.status} />
              <span className="text-[11px] text-foreground-subtle">{formatDate(sub.submitted_at)}</span>
            </div>

            {/* Proposed changes */}
            <div className="px-4 py-3">
              {payload.agency_note && (
                <div className="mb-3 p-2 bg-surface-2 rounded text-[12px] text-foreground italic">
                  "{payload.agency_note}"
                </div>
              )}
              {changedFields.length > 0 && (
                <div>
                  <div className="text-[11px] text-foreground-subtle mb-2 font-mono uppercase tracking-wider">
                    Proposed changes
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
                    {changedFields.map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt className="text-foreground-subtle capitalize">{k.replace(/_/g, " ")}</dt>
                        <dd className="text-foreground font-mono">
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {/* Review actions */}
            <div className="px-4 py-3 border-t border-border bg-surface-2/20 space-y-2">
              <div>
                <label className="text-[11px] text-foreground-subtle block mb-1">
                  Reviewer notes <span className="font-normal">(internal, never shown to agency)</span>
                </label>
                <textarea
                  rows={2}
                  value={reviewerNotes[sub.id] ?? ""}
                  onChange={(e) => setReviewerNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
                  placeholder="Add notes before approving or rejecting…"
                  className="w-full bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded resize-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={reviewing === sub.id}
                  onClick={() => handle(sub.id, "approved")}
                  className="px-4 py-1.5 text-sm font-medium rounded bg-green-muted text-green hover:opacity-80 transition-all disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={reviewing === sub.id}
                  onClick={() => handle(sub.id, "needs_more_info")}
                  className="px-4 py-1.5 text-sm font-medium rounded bg-amber-muted text-amber hover:opacity-80 transition-all disabled:opacity-50"
                >
                  Needs more info
                </button>
                <button
                  type="button"
                  disabled={reviewing === sub.id}
                  onClick={() => handle(sub.id, "rejected")}
                  className="px-4 py-1.5 text-sm font-medium rounded bg-red-muted text-red hover:opacity-80 transition-all disabled:opacity-50"
                >
                  Reject
                </button>
                {sub.status === "submitted" && (
                  <button
                    type="button"
                    disabled={reviewing === sub.id}
                    onClick={() => handle(sub.id, "under_review")}
                    className="px-4 py-1.5 text-sm font-medium rounded border border-border text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
                  >
                    Mark under review
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

type ActiveTab = "listings" | "review";

export function AgencyDataConsoleView() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("listings");
  const [listingRows, setListingRows] = useState<ListingQualityRow[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(true);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<"all" | "issues">("all");
  const [search, setSearch] = useState("");

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId) ?? null;

  // Load agencies
  useEffect(() => {
    supabase
      .from("agencies")
      .select("id,agency_name,source_ids,market_code,claimed_status,data_partner_status,updated_at")
      .order("agency_name")
      .then(({ data, error }) => {
        if (!error && data) {
          const rows = data as Agency[];
          setAgencies(rows);
          if (rows.length > 0) setSelectedAgencyId(rows[0].id);
        }
        setLoadingAgencies(false);
      });
  }, []);

  // Load listings for selected agency
  const loadListings = useCallback(async (agency: Agency) => {
    if (agency.source_ids.length === 0) {
      setListingRows([]);
      setLoadingListings(false);
      return;
    }
    setLoadingListings(true);
    setListingError(null);
    try {
      const rows = await getAgencyListingQuality(agency);
      setListingRows(rows);
      // Write quality snapshot (best-effort, don't block UI)
      const openSubs = rows.filter((r) => r.pending_submission).length;
      writeAgencyQualitySnapshot(agency, rows, openSubs).catch(() => {/* non-critical */});
    } catch (err: unknown) {
      setListingError(err instanceof Error ? err.message : "Failed to load listings.");
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgency) {
      loadListings(selectedAgency);
      setExpandedListingId(null);
    }
  }, [selectedAgency, loadListings]);

  // Submission callback
  const handleSubmitted = (s: AgencyListingSubmission) => {
    setListingRows((prev) =>
      prev.map((r) => (r.id === s.listing_id ? { ...r, pending_submission: s } : r))
    );
    setExpandedListingId(null);
  };

  // Filtered/sorted listing rows
  const filteredRows = listingRows.filter((r) => {
    if (qualityFilter === "issues" && r.issues.length === 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(r.title ?? "").toLowerCase().includes(q) &&
        !r.source_id.toLowerCase().includes(q) &&
        !(r.id ?? "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }).sort((a, b) => a.quality_score - b.quality_score); // lowest quality first

  // Quality stats for overview
  const totalListings = listingRows.length;
  const avgScore =
    totalListings > 0
      ? Math.round(listingRows.reduce((s, r) => s + r.quality_score, 0) / totalListings)
      : 0;
  const withIssues = listingRows.filter((r) => r.issues.length > 0).length;
  const openSubmissions = listingRows.filter((r) => r.pending_submission).length;

  // Count of specific critical issues
  const missingPrice = listingRows.filter((r) => r.issues.includes("missing_price")).length;
  const missingPhotos = listingRows.filter((r) => r.issues.includes("missing_photos")).length;
  const missingSqm = listingRows.filter((r) => r.issues.includes("missing_sqm")).length;
  const stale = listingRows.filter((r) => r.issues.includes("stale_listing")).length;

  if (loadingAgencies) {
    return <p className="text-sm text-foreground-muted py-8">Loading agencies…</p>;
  }

  return (
    <div className="space-y-6">
      <div
        className="text-[12px] text-amber bg-amber-muted border border-amber/30 px-3 py-2 rounded"
        role="status"
      >
        <span className="font-semibold">Source data frozen as of 2026-06-11.</span>{" "}
        The legacy <code className="font-mono">public.listings</code> feed is no longer
        updated — these quality numbers are historical. Live inventory now lives in{" "}
        <code className="font-mono">kv_curated.listings</code>.
      </div>
      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground font-mono">
            Agency Listing Quality
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Review listing quality, identify missing data, and manage agency data contributions.
          </p>
        </div>
      </div>

      {/* ── Agency selector ── */}
      {agencies.length === 0 ? (
        <div className="surface-1 rounded border border-border border-dashed p-10 text-center">
          <h3 className="text-base font-semibold font-mono text-foreground mb-1">No agencies yet</h3>
          <p className="text-sm text-foreground-muted">
            Add agencies in Agency Relationships first, then link source IDs to see listing quality here.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Selected agency</label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded min-w-[220px]"
              >
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>{a.agency_name}</option>
                ))}
              </select>
            </div>
            {selectedAgency && (
              <div className="text-[11px] text-foreground-subtle font-mono mt-4">
                {selectedAgency.source_ids.length === 0 ? (
                  <span className="text-amber">No sources linked — add source IDs in Agency Relationships</span>
                ) : (
                  <>Sources: {selectedAgency.source_ids.map((s) => (
                    <span key={s} className="bg-surface-3 px-1.5 py-0.5 rounded mr-1">{s}</span>
                  ))}</>
                )}
              </div>
            )}
          </div>

          {/* ── Quality overview cards ── */}
          {selectedAgency && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="surface-1 rounded p-3 border border-border shadow-sm col-span-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Listings</div>
                <div className="text-2xl font-bold tabular-nums font-mono">{totalListings}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm col-span-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Avg quality score</div>
                <div className={`text-2xl font-bold tabular-nums font-mono ${avgScore >= 80 ? "text-green" : avgScore >= 50 ? "text-amber" : "text-red"}`}>
                  {totalListings > 0 ? avgScore : "—"}
                </div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm col-span-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Listings with issues</div>
                <div className={`text-2xl font-bold tabular-nums font-mono ${withIssues > 0 ? "text-amber" : "text-green"}`}>{withIssues}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm col-span-2">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Open submissions</div>
                <div className="text-2xl font-bold tabular-nums font-mono">{openSubmissions}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">No price</div>
                <div className={`text-xl font-bold tabular-nums font-mono ${missingPrice > 0 ? "text-red" : ""}`}>{missingPrice}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">No photos</div>
                <div className={`text-xl font-bold tabular-nums font-mono ${missingPhotos > 0 ? "text-red" : ""}`}>{missingPhotos}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">No sqm</div>
                <div className={`text-xl font-bold tabular-nums font-mono ${missingSqm > 0 ? "text-amber" : ""}`}>{missingSqm}</div>
              </div>
              <div className="surface-1 rounded p-3 border border-border shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Stale</div>
                <div className={`text-xl font-bold tabular-nums font-mono ${stale > 0 ? "text-amber" : ""}`}>{stale}</div>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div className="flex gap-1 border-b border-border">
            {(["listings", "review"] as ActiveTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                className={
                  "px-4 py-2 text-[12px] font-mono font-medium border-b-2 -mb-px transition-colors " +
                  (activeTab === t
                    ? "border-accent text-foreground"
                    : "border-transparent text-foreground-muted hover:text-foreground")
                }
              >
                {t === "listings" ? "Listing quality" : "Review queue"}
                {t === "review" && openSubmissions > 0 && (
                  <span className="ml-2 bg-amber-muted text-amber text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                    {openSubmissions}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Listing quality tab ── */}
          {activeTab === "listings" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[11px] text-foreground-subtle block mb-1">Search listings</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Title, source ID, or listing ID…"
                    className="w-full bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-subtle block mb-1">Show</label>
                  <select
                    value={qualityFilter}
                    onChange={(e) => setQualityFilter(e.target.value as "all" | "issues")}
                    className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded"
                  >
                    <option value="all">All listings</option>
                    <option value="issues">Listings with issues only</option>
                  </select>
                </div>
              </div>

              {listingError && <p className="text-red text-sm">{listingError}</p>}

              {loadingListings && <p className="text-sm text-foreground-muted py-8">Loading listings…</p>}

              {!loadingListings && selectedAgency && selectedAgency.source_ids.length === 0 && (
                <div className="surface-1 rounded border border-border border-dashed p-10 text-center">
                  <h3 className="text-base font-semibold font-mono text-foreground mb-1">No sources linked</h3>
                  <p className="text-sm text-foreground-muted">
                    Link source IDs to this agency in Agency Relationships to see listing quality here.
                  </p>
                </div>
              )}

              {!loadingListings && selectedAgency && selectedAgency.source_ids.length > 0 && filteredRows.length === 0 && (
                <div className="surface-1 rounded border border-border border-dashed p-10 text-center">
                  <p className="text-sm text-foreground-muted">No listings match the current filter.</p>
                </div>
              )}

              {!loadingListings && filteredRows.length > 0 && (
                <div className="surface-1 rounded border border-border overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="px-4 py-2.5 w-8" />
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Listing</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Location</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Score</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Missing fields</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Submission</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Last updated</th>
                        <th className="px-4 py-2.5 text-[11px] font-mono font-semibold text-foreground-subtle uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <ListingQualityTableRow
                          key={row.id}
                          row={row}
                          agencyId={selectedAgencyId}
                          expanded={expandedListingId === row.id}
                          onToggle={() => setExpandedListingId((id) => id === row.id ? null : row.id)}
                          onSubmitted={handleSubmitted}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Review queue tab ── */}
          {activeTab === "review" && (
            <ReviewQueue
              agencyFilter={selectedAgencyId || null}
              agencies={agencies}
            />
          )}
        </>
      )}
    </div>
  );
}
