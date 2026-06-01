import { useEffect, useMemo, useState } from "react";
import {
  applyListingPatch,
  getCuratedNeedsReviewList,
  reviewListing,
} from "./data";
import type { CuratedListing, ReviewVerdict, SuggestedPatch } from "./types";

export function CuratedReviewView() {
  const [items, setItems] = useState<CuratedListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setItems(await getCuratedNeedsReviewList());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      <aside className="col-span-4 border border-border-strong rounded">
        <header className="px-3 py-2 border-b border-border-strong flex items-center justify-between">
          <span className="text-sm font-medium">needs_review ({items.length})</span>
          <button onClick={reload} className="text-xs underline">refresh</button>
        </header>
        {loading && <div className="p-3 text-xs text-foreground-muted">loading…</div>}
        {error && <div className="p-3 text-xs text-red">{error}</div>}
        <ul className="max-h-[70vh] overflow-y-auto">
          {items.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => setSelectedId(l.id)}
                className={
                  "w-full text-left px-3 py-2 border-b border-border-strong text-xs " +
                  (l.id === selectedId ? "bg-surface-3" : "hover:bg-surface-2")
                }
              >
                <div className="font-mono text-foreground-muted">{l.source_id_primary} · {l.island}</div>
                <div className="font-medium truncate">{l.title}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="col-span-8">
        {selected
          ? <CuratedDetail listing={selected} onApplied={reload} />
          : <div className="text-sm text-foreground-muted p-6">Select a listing on the left.</div>}
      </section>
    </div>
  );
}

function CuratedDetail({ listing, onApplied }: { listing: CuratedListing; onApplied: () => void }) {
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setVerdict(null);
    setError(null);
    setAcceptedKeys(new Set());
  }, [listing.id]);

  async function runReview() {
    setReviewing(true);
    setError(null);
    try {
      const r = await reviewListing(listing.id);
      setVerdict(r.verdict);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  }

  function toggleKey(k: string) {
    setAcceptedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }

  async function apply(publishStatus?: "published" | "hidden") {
    if (!verdict) return;
    const subset: SuggestedPatch = {};
    for (const k of acceptedKeys) {
      (subset as Record<string, unknown>)[k] = (verdict.suggested_patch as Record<string, unknown>)[k];
    }
    setApplying(true);
    setError(null);
    try {
      await applyListingPatch(listing.id, subset, publishStatus);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  const patchEntries = verdict ? Object.entries(verdict.suggested_patch) : [];

  return (
    <div className="border border-border-strong rounded p-4 space-y-4">
      <header className="space-y-1">
        <div className="text-xs font-mono text-foreground-muted">{listing.id}</div>
        <h2 className="text-lg font-semibold">{listing.title}</h2>
        {listing.source_url_primary && (
          <a href={listing.source_url_primary} target="_blank" rel="noopener noreferrer"
             className="text-xs underline">view source ↗</a>
        )}
      </header>

      <dl className="grid grid-cols-4 gap-2 text-xs">
        <Field label="island" value={listing.island} />
        <Field label="city" value={listing.city} />
        <Field label="type" value={listing.property_type} />
        <Field label="status" value={listing.publish_status} />
        <Field label="bedrooms" value={listing.bedrooms} />
        <Field label="bathrooms" value={listing.bathrooms} />
        <Field label="price" value={listing.price} />
        <Field label="images" value={listing.image_urls.length} />
        <Field label="sqm" value={listing.property_size_sqm} />
        <Field label="land sqm" value={listing.land_area_sqm} />
      </dl>

      {listing.description && (
        <details className="text-xs">
          <summary className="cursor-pointer text-foreground-muted">description</summary>
          <pre className="whitespace-pre-wrap mt-2">
            {listing.description.slice(0, 1200)}
            {listing.description.length > 1200 ? "…" : ""}
          </pre>
        </details>
      )}

      <div className="flex gap-2 items-center">
        <button
          onClick={runReview}
          disabled={reviewing}
          className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
        >
          {reviewing ? "Reviewing…" : "Review"}
        </button>
        {error && <span className="text-xs text-red">{error}</span>}
      </div>

      {verdict && (
        <div className="border-t border-border-strong pt-3 space-y-3">
          <div className="flex items-center gap-3">
            <VerdictPill verdict={verdict.verdict} />
            <span className="text-xs text-foreground-muted">
              confidence {(verdict.confidence * 100).toFixed(0)}%
            </span>
            {verdict.hide_reason && (
              <span className="text-xs text-foreground-muted italic">{verdict.hide_reason}</span>
            )}
          </div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>

          {patchEntries.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Suggested patch</div>
              <table className="text-xs w-full">
                <thead className="text-foreground-muted">
                  <tr><th></th><th className="text-left">field</th><th className="text-left">current</th><th className="text-left">suggested</th></tr>
                </thead>
                <tbody>
                  {patchEntries.map(([k, v]) => (
                    <tr key={k} className="border-t border-border-strong">
                      <td className="py-1"><input type="checkbox" checked={acceptedKeys.has(k)} onChange={() => toggleKey(k)} /></td>
                      <td className="font-mono">{k}</td>
                      <td>{String((listing as Record<string, unknown>)[k] ?? "—")}</td>
                      <td>{String(v ?? "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => apply()}
              disabled={applying || acceptedKeys.size === 0}
              className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
            >
              Apply selected
            </button>
            <button
              onClick={() => apply("published")}
              disabled={applying}
              className="px-3 py-1.5 text-sm rounded bg-green-muted text-green border border-border-strong hover:opacity-80 disabled:opacity-50"
            >
              Apply + Publish
            </button>
            <button
              onClick={() => apply("hidden")}
              disabled={applying}
              className="px-3 py-1.5 text-sm rounded bg-red-muted text-red border border-border-strong hover:opacity-80 disabled:opacity-50"
            >
              Hide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="text-foreground-muted">{label}</div>
      <div className="font-mono">{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: "publish" | "hold" | "hide" }) {
  const styles = {
    publish: "bg-green-muted text-green",
    hold:    "bg-amber-muted text-amber",
    hide:    "bg-red-muted   text-red",
  } as const;
  return <span className={`px-2 py-0.5 text-xs rounded border border-border-strong ${styles[verdict]}`}>{verdict}</span>;
}
