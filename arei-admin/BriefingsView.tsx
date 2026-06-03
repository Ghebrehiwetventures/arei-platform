// =============================================================================
// BriefingsView.tsx — admin authoring for market briefings (PR B)
//
// A thin editorial layer over market_report_snapshots. Editors write the prose
// (headline, executive summary, 3-5 key takeaways, commentary, methodology) and
// pin the edition to a PUBLISHED snapshot date. No numbers are entered by hand —
// the public page reads them from the pinned snapshot. Draft → Published →
// back-to-Draft lifecycle; public pages only ever show published editions.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabaseAuth } from "./supabase";
import {
  getBriefingsAdmin,
  getPublishedSnapshotDates,
  createBriefing,
  updateBriefing,
  setBriefingStatus,
  type AdminBriefingRow,
  type BriefingDraftInput,
} from "./data";

const INPUT_CLS =
  "w-full bg-surface-1 border border-border text-foreground text-sm px-3 py-1.5 rounded " +
  "focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-foreground-subtle";

const MIN_TAKEAWAYS = 3;
const MAX_TAKEAWAYS = 5;

// ── Local publish validation ─────────────────────────────────────────────────
// Mirrors validateBriefingForPublish() in arei-sdk/src/briefing.ts (canonical,
// unit-tested). Duplicated here because the admin app does not depend on the SDK.
function validateForPublish(d: BriefingDraftInput): string[] {
  const errors: string[] = [];
  const blank = (v: string | null) => !v || v.trim().length === 0;
  if (blank(d.title)) errors.push("Title is required.");
  if (blank(d.period)) errors.push("Period label is required.");
  if (blank(d.slug)) errors.push("Slug is required.");
  if (blank(d.snapshot_date)) errors.push("A snapshot date must be pinned.");
  if (blank(d.executive_summary)) errors.push("Executive summary is required.");
  if (blank(d.commentary)) errors.push("Commentary is required.");
  const t = (d.key_takeaways ?? []).map((x) => x.trim()).filter(Boolean);
  if (t.length < MIN_TAKEAWAYS || t.length > MAX_TAKEAWAYS) {
    errors.push(`Provide between ${MIN_TAKEAWAYS} and ${MAX_TAKEAWAYS} key takeaways (have ${t.length}).`);
  }
  return errors;
}

function slugify(period: string): string {
  return period.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function emptyDraft(): BriefingDraftInput {
  return {
    slug: "",
    period: "",
    snapshot_date: "",
    title: "",
    executive_summary: "",
    key_takeaways: ["", "", ""],
    commentary: "",
    methodology_note: "",
  };
}

function toDraft(row: AdminBriefingRow): BriefingDraftInput {
  return {
    slug: row.slug,
    period: row.period,
    snapshot_date: row.snapshot_date,
    title: row.title,
    executive_summary: row.executive_summary ?? "",
    key_takeaways: row.key_takeaways && row.key_takeaways.length > 0 ? row.key_takeaways : ["", "", ""],
    commentary: row.commentary ?? "",
    methodology_note: row.methodology_note ?? "",
  };
}

function StatusBadge({ status }: { status: AdminBriefingRow["status"] }) {
  const map: Record<AdminBriefingRow["status"], string> = {
    draft: "bg-foreground-subtle/10 text-foreground-muted",
    published: "bg-green/10 text-green",
    archived: "bg-[#C44A3A]/10 text-[#C44A3A]",
  };
  return (
    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${map[status]}`}>
      {status}
    </span>
  );
}

export function BriefingsView() {
  const [rows, setRows] = useState<AdminBriefingRow[]>([]);
  const [snapshotDates, setSnapshotDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; draft: BriefingDraftInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [r, d] = await Promise.all([getBriefingsAdmin(), getPublishedSnapshotDates()]);
    setRows(r);
    setSnapshotDates(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const startCreate = () => {
    setErrors([]);
    setNotice(null);
    setEditing({ id: null, draft: emptyDraft() });
  };
  const startEdit = (row: AdminBriefingRow) => {
    setErrors([]);
    setNotice(null);
    setEditing({ id: row.id, draft: toDraft(row) });
  };
  const cancel = () => {
    setEditing(null);
    setErrors([]);
  };

  const patch = (p: Partial<BriefingDraftInput>) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e));

  const setTakeaway = (i: number, v: string) =>
    setEditing((e) => {
      if (!e) return e;
      const next = [...(e.draft.key_takeaways ?? [])];
      next[i] = v;
      return { ...e, draft: { ...e.draft, key_takeaways: next } };
    });
  const addTakeaway = () =>
    setEditing((e) =>
      e ? { ...e, draft: { ...e.draft, key_takeaways: [...(e.draft.key_takeaways ?? []), ""] } } : e,
    );
  const removeTakeaway = (i: number) =>
    setEditing((e) =>
      e
        ? { ...e, draft: { ...e.draft, key_takeaways: (e.draft.key_takeaways ?? []).filter((_, j) => j !== i) } }
        : e,
    );

  // Strip empty takeaways before persisting.
  function cleanDraft(d: BriefingDraftInput): BriefingDraftInput {
    const takeaways = (d.key_takeaways ?? []).map((x) => x.trim()).filter(Boolean);
    return {
      ...d,
      slug: d.slug.trim() || slugify(d.period),
      key_takeaways: takeaways.length > 0 ? takeaways : null,
      executive_summary: d.executive_summary?.trim() || null,
      commentary: d.commentary?.trim() || null,
      methodology_note: d.methodology_note?.trim() || null,
    };
  }

  const saveDraft = async () => {
    if (!editing) return;
    const draft = cleanDraft(editing.draft);
    if (!draft.title.trim() || !draft.period.trim() || !draft.snapshot_date) {
      setErrors(["Title, period, and a pinned snapshot date are required to save a draft."]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      if (editing.id) {
        await updateBriefing(editing.id, draft);
        setNotice("Draft saved.");
      } else {
        const created = await createBriefing(draft);
        setEditing({ id: created.id, draft: toDraft(created) });
        setNotice("Draft created.");
      }
      await reload();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed."]);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!editing) return;
    const draft = cleanDraft(editing.draft);
    const problems = validateForPublish(draft);
    if (!snapshotDates.includes(draft.snapshot_date)) {
      problems.push("No published snapshot exists for the pinned date — publish that snapshot first.");
    }
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      // Persist latest edits, then flip status.
      let id = editing.id;
      if (id) {
        await updateBriefing(id, draft);
      } else {
        const created = await createBriefing(draft);
        id = created.id;
      }
      const { data } = await supabaseAuth.auth.getSession();
      const email = data.session?.user?.email ?? "admin";
      await setBriefingStatus(id!, "published", email);
      setNotice("Edition published — now live.");
      setEditing(null);
      await reload();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Publish failed."]);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (row: AdminBriefingRow, status: AdminBriefingRow["status"]) => {
    setBusy(true);
    try {
      const { data } = await supabaseAuth.auth.getSession();
      const email = data.session?.user?.email ?? "admin";
      await setBriefingStatus(row.id, status, email);
      await reload();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Status change failed."]);
    } finally {
      setBusy(false);
    }
  };

  // ── Editor ─────────────────────────────────────────────────────────────────
  if (editing) {
    const d = editing.draft;
    const noSnapshots = snapshotDates.length === 0;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-semibold text-foreground font-mono">
            {editing.id ? "Edit briefing" : "New briefing"}
          </h1>
          <button onClick={cancel} className="text-sm text-foreground-muted hover:text-foreground">
            ← Back to list
          </button>
        </div>

        {noSnapshots && (
          <div className="mb-4 text-[12px] text-[#C44A3A] bg-[#C44A3A]/10 border border-[#C44A3A]/20 rounded px-3 py-2">
            No published market snapshot exists yet. You can save a draft, but you cannot pin a date or
            publish until a snapshot is published.
          </div>
        )}

        {errors.length > 0 && (
          <ul className="mb-4 text-[12px] text-[#C44A3A] bg-[#C44A3A]/10 border border-[#C44A3A]/20 rounded px-3 py-2 list-disc list-inside space-y-0.5">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        {notice && (
          <div className="mb-4 text-[12px] text-green bg-green/10 border border-green/20 rounded px-3 py-2">
            {notice}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Period label</label>
              <input
                className={INPUT_CLS}
                value={d.period}
                placeholder="May 2026"
                onChange={(e) => {
                  const period = e.target.value;
                  patch({ period, slug: editing.id ? d.slug : slugify(period) });
                }}
              />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Slug (URL)</label>
              <input className={INPUT_CLS} value={d.slug} placeholder="2026-05"
                onChange={(e) => patch({ slug: e.target.value })} disabled={!!editing.id} />
            </div>
            <div>
              <label className="text-[11px] text-foreground-subtle block mb-1">Snapshot date</label>
              <select className={`${INPUT_CLS} h-[34px]`} value={d.snapshot_date}
                onChange={(e) => patch({ snapshot_date: e.target.value })}>
                <option value="">— pick a published snapshot —</option>
                {snapshotDates.map((sd) => <option key={sd} value={sd}>{sd}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Headline</label>
            <input className={INPUT_CLS} value={d.title}
              placeholder="Cape Verde Listing Index — May 2026"
              onChange={(e) => patch({ title: e.target.value })} />
          </div>

          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Executive summary</label>
            <textarea className={`${INPUT_CLS} resize-y`} rows={3} value={d.executive_summary ?? ""}
              placeholder="2-3 sentence key takeaway…"
              onChange={(e) => patch({ executive_summary: e.target.value })} />
          </div>

          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">
              Key takeaways <span className="text-foreground-subtle">({MIN_TAKEAWAYS}-{MAX_TAKEAWAYS})</span>
            </label>
            <div className="space-y-2">
              {(d.key_takeaways ?? []).map((t, i) => (
                <div key={i} className="flex gap-2">
                  <input className={INPUT_CLS} value={t} placeholder={`Takeaway ${i + 1}`}
                    onChange={(e) => setTakeaway(i, e.target.value)} />
                  <button onClick={() => removeTakeaway(i)}
                    className="shrink-0 px-2 text-foreground-subtle hover:text-[#C44A3A]" aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
            {(d.key_takeaways ?? []).length < MAX_TAKEAWAYS && (
              <button onClick={addTakeaway} className="mt-2 text-[12px] text-accent hover:underline">
                + Add takeaway
              </button>
            )}
          </div>

          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Commentary</label>
            <textarea className={`${INPUT_CLS} resize-y`} rows={6} value={d.commentary ?? ""}
              placeholder="2-3 paragraphs of editorial context. Blank lines separate paragraphs."
              onChange={(e) => patch({ commentary: e.target.value })} />
          </div>

          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">
              Methodology note <span className="text-foreground-subtle">(optional — defaults to standard disclosure)</span>
            </label>
            <textarea className={`${INPUT_CLS} resize-y`} rows={3} value={d.methodology_note ?? ""}
              placeholder="Leave blank to use the standard methodology disclosure."
              onChange={(e) => patch({ methodology_note: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={saveDraft} disabled={busy}
              className="px-4 py-2 text-sm font-medium border border-border rounded text-foreground hover:bg-surface-2 disabled:opacity-50">
              {busy ? "Saving…" : "Save draft"}
            </button>
            <button onClick={publish} disabled={busy || noSnapshots}
              className="px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:opacity-90 disabled:opacity-50">
              {busy ? "Working…" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-foreground font-mono">Briefings</h1>
          <p className="text-[12px] text-foreground-subtle mt-1">
            Monthly Cape Verde Listing Index editions. Public pages show published editions only.
          </p>
        </div>
        <button onClick={startCreate}
          className="px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:opacity-90">
          + New briefing
        </button>
      </div>

      {errors.length > 0 && (
        <ul className="mb-4 text-[12px] text-[#C44A3A] bg-[#C44A3A]/10 border border-[#C44A3A]/20 rounded px-3 py-2 list-disc list-inside">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {notice && (
        <div className="mb-4 text-[12px] text-green bg-green/10 border border-green/20 rounded px-3 py-2">{notice}</div>
      )}

      {loading ? (
        <div className="text-sm text-foreground-muted py-12 text-center">Loading editions…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded">
          <div className="text-sm text-foreground font-medium">No briefings yet</div>
          <p className="text-[12px] text-foreground-subtle mt-1">
            Create your first edition. It stays a draft until you publish it.
          </p>
        </div>
      ) : (
        <table className="w-full data-table">
          <thead>
            <tr>
              {["Period", "Title", "Status", "Snapshot", "Published", ""].map((h) => (
                <th key={h} className="text-left py-2 px-3 text-[11px] uppercase tracking-wide text-foreground-subtle font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2.5 px-3 text-sm text-foreground font-mono">{r.period}</td>
                <td className="py-2.5 px-3 text-sm text-foreground-muted">{r.title}</td>
                <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                <td className="py-2.5 px-3 text-sm text-foreground-muted font-mono tabular-nums">{r.snapshot_date}</td>
                <td className="py-2.5 px-3 text-sm text-foreground-subtle font-mono tabular-nums">
                  {r.published_at ? r.published_at.slice(0, 10) : "—"}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(r)} className="text-[12px] text-accent hover:underline mr-3">Edit</button>
                  {r.status === "published" ? (
                    <button onClick={() => changeStatus(r, "draft")} disabled={busy}
                      className="text-[12px] text-foreground-muted hover:text-foreground disabled:opacity-50">Unpublish</button>
                  ) : (
                    <button onClick={() => changeStatus(r, "archived")} disabled={busy || r.status === "archived"}
                      className="text-[12px] text-foreground-muted hover:text-foreground disabled:opacity-30">Archive</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
