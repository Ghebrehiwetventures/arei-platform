import { useState } from "react";
import { applyListingPatch, reviewListing } from "../data";
import type { CuratedListing, ReviewVerdict } from "../types";

interface Props {
  selectedIds: Set<string>;
  rows: CuratedListing[];
  onClear: () => void;
  onAfterMutation: () => Promise<void>;
  onVerdictProduced: (id: string, v: ReviewVerdict) => void;
}

type Mode = "idle" | "reviewing" | "confirm-publish" | "confirm-hide";

export function BulkActionBar({ selectedIds, rows, onClear, onAfterMutation, onVerdictProduced }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const livePublishedCount = selectedRows.filter((r) => r.publish_status === "published").length;

  async function runReviewAll() {
    setMode("reviewing");
    setCancelRequested(false);
    setProgress({ done: 0, total: selectedRows.length });
    setError(null);
    for (let i = 0; i < selectedRows.length; i++) {
      if (cancelRequested) break;
      const r = selectedRows[i];
      try {
        const result = await reviewListing(r.id);
        onVerdictProduced(r.id, result.verdict);
      } catch (e) {
        setError((e instanceof Error ? e.message : String(e)) + ` (on ${r.id})`);
      }
      setProgress({ done: i + 1, total: selectedRows.length });
    }
    await onAfterMutation();
    setMode("idle");
    setProgress(null);
  }

  async function applyAll(publishStatus: "published" | "hidden") {
    setMode("reviewing");
    setProgress({ done: 0, total: selectedRows.length });
    setError(null);
    for (let i = 0; i < selectedRows.length; i++) {
      const r = selectedRows[i];
      if (publishStatus === "published" && r.publish_status === "published") {
        setProgress({ done: i + 1, total: selectedRows.length });
        continue;
      }
      try {
        await applyListingPatch(r.id, {}, publishStatus);
      } catch (e) {
        setError((e instanceof Error ? e.message : String(e)) + ` (on ${r.id})`);
      }
      setProgress({ done: i + 1, total: selectedRows.length });
    }
    await onAfterMutation();
    onClear();
    setMode("idle");
    setProgress(null);
  }

  if (selectedIds.size === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-strong bg-surface-3 p-3 flex items-center gap-3 text-xs">
      <span className="font-medium">{selectedIds.size} selected</span>

      {mode === "idle" && (
        <>
          <button onClick={runReviewAll} className="px-3 py-1.5 rounded border border-border-strong hover:bg-surface-2">
            Review all
          </button>
          <button onClick={() => setMode("confirm-publish")} className="px-3 py-1.5 rounded bg-green-muted text-green border border-border-strong hover:opacity-80">
            Publish
          </button>
          <button onClick={() => setMode("confirm-hide")} className="px-3 py-1.5 rounded bg-red-muted text-red border border-border-strong hover:opacity-80">
            Hide
          </button>
          <button onClick={onClear} className="underline ml-auto">clear</button>
        </>
      )}

      {mode === "reviewing" && progress && (
        <>
          <span className="text-foreground-muted">{progress.done} / {progress.total}</span>
          <div className="flex-1 h-1 bg-surface-2 rounded overflow-hidden">
            <div className="h-full bg-sage-deep" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
          <button onClick={() => setCancelRequested(true)} className="underline">cancel</button>
        </>
      )}

      {mode === "confirm-publish" && (
        <div className="flex items-center gap-3">
          <span>Publish {selectedIds.size} rows? Already-published rows are skipped.</span>
          <button onClick={() => applyAll("published")} className="px-3 py-1.5 rounded bg-green-muted text-green border border-border-strong">confirm</button>
          <button onClick={() => setMode("idle")} className="underline">cancel</button>
        </div>
      )}

      {mode === "confirm-hide" && (
        <div className="flex items-center gap-3">
          {livePublishedCount > 0 ? (
            <span className="text-red">⚠ {livePublishedCount} of these are LIVE — hiding them is a production change.</span>
          ) : (
            <span>Hide {selectedIds.size} rows?</span>
          )}
          <button onClick={() => applyAll("hidden")} className="px-3 py-1.5 rounded bg-red-muted text-red border border-border-strong">confirm</button>
          <button onClick={() => setMode("idle")} className="underline">cancel</button>
        </div>
      )}

      {error && <span className="text-red ml-2">{error}</span>}
    </div>
  );
}
