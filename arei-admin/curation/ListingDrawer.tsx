import { useEffect, useRef, useState } from "react";
import {
  applyListingPatch,
  deepReviewListing,
  getCuratedListing,
  getListingReviewHistory,
  reviewListing,
} from "../data";
import type {
  CuratedListing, MissingFieldEntry, RecoveredGap, ReviewLogRow, ReviewVerdict, SuggestedPatch, UnmappedField,
} from "../types";

interface Props {
  id: string;
  onClose: () => void;
  onApplied: () => void;
  ephemeralVerdict?: ReviewVerdict;
  onVerdictProduced: (id: string, v: ReviewVerdict) => void;
}

export function ListingDrawer({ id, onClose, onApplied, ephemeralVerdict, onVerdictProduced }: Props) {
  const [listing, setListing] = useState<CuratedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<ReviewVerdict | null>(ephemeralVerdict ?? null);
  const [reviewing, setReviewing] = useState(false);
  const [deepReviewing, setDeepReviewing] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(
    new Set(ephemeralVerdict ? Object.keys(ephemeralVerdict.suggested_patch) : [])
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ReviewLogRow[] | null>(null);

  // Read the latest ephemeralVerdict inside effects without subscribing the
  // effect to it (which would re-fire on every parent verdict-map mutation).
  const ephemeralRef = useRef(ephemeralVerdict);
  ephemeralRef.current = ephemeralVerdict;

  // When the drawer switches to a different listing (parent kept the drawer
  // open and changed `openId`), reset the verdict pane. Seeded from the
  // ephemeral verdict for the new id, if one exists.
  useEffect(() => {
    const seed = ephemeralRef.current ?? null;
    setVerdict(seed);
    setAcceptedKeys(new Set(seed ? Object.keys(seed.suggested_patch) : []));
    setSourceId(null);
  }, [id]);

  // Keyed on `id` only. `ephemeralVerdict` changes every time the parent's
  // verdict map mutates (incl. from this drawer's own Run Review); re-running
  // the effect on that would re-fetch the listing and flash the panel.
  useEffect(() => {
    let cancelled = false;
    setListing(null); setLoading(true); setError(null);
    setHistory(null); setHistoryOpen(false);
    (async () => {
      try {
        const l = await getCuratedListing(id);
        if (!cancelled) setListing(l);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function runReview() {
    setReviewing(true); setError(null);
    try {
      const r = await reviewListing(id);
      setVerdict(r.verdict);
      setSourceId(null);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
      onVerdictProduced(id, r.verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  }

  async function runDeepReview() {
    setDeepReviewing(true); setError(null);
    try {
      const r = await deepReviewListing(id);
      setVerdict(r.verdict);
      setSourceId(r.source_id ?? null);
      setAcceptedKeys(new Set(Object.keys(r.verdict.suggested_patch)));
      onVerdictProduced(id, r.verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeepReviewing(false);
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
    if (!verdict || !listing) return;
    const subset: SuggestedPatch = {};
    for (const k of acceptedKeys) {
      (subset as Record<string, unknown>)[k] = (verdict.suggested_patch as Record<string, unknown>)[k];
    }
    const gaps: RecoveredGap[] = [];
    if (sourceId) {
      for (const e of verdict.missing_field_report ?? []) {
        if (e.status === "scraper_missed" && acceptedKeys.has(e.field)) {
          gaps.push({
            field: e.field,
            source_id: sourceId,
            value: e.found_value ?? null,
            evidence: e.evidence,
            model: "claude-sonnet-4-6",
          });
        }
      }
    }
    setApplying(true); setError(null);
    try {
      await applyListingPatch(listing.id, subset, publishStatus, gaps);
      onApplied();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    if (history == null) {
      try { setHistory(await getListingReviewHistory(id)); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    }
  }

  const patchEntries = verdict ? Object.entries(verdict.suggested_patch) : [];

  return (
    <aside className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-border-strong p-4 overflow-y-auto z-30">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-xs underline">close</button>
        {listing?.source_url_primary && (
          <a href={listing.source_url_primary} target="_blank" rel="noopener noreferrer" className="text-xs underline">view source ↗</a>
        )}
      </div>

      {loading && <div className="mt-3 text-xs text-foreground-muted">loading…</div>}
      {error && <div className="mt-3 text-xs text-red">{error}</div>}

      {listing && (
        <>
          <div className="mt-3 text-[10px] font-mono text-foreground-muted">{listing.id}</div>
          <h2 className="text-base font-semibold">{listing.title}</h2>

          {listing.image_urls.length > 0 && (
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {listing.image_urls.slice(0, 8).map((u, i) => (
                <img key={i} src={u} alt="" className="w-20 h-14 object-cover rounded" loading="lazy" />
              ))}
              {listing.image_urls.length > 8 && (
                <div className="self-center text-xs text-foreground-muted">+{listing.image_urls.length - 8}</div>
              )}
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Row label="island" value={listing.island} />
            <Row label="city" value={listing.city} />
            <Row label="type" value={listing.property_type} />
            <Row label="status" value={listing.publish_status} />
            <Row label="price" value={listing.price} />
            <Row label="bedrooms" value={listing.bedrooms} highlightNull />
            <Row label="bathrooms" value={listing.bathrooms} highlightNull />
            <Row label="sqm" value={listing.property_size_sqm} highlightNull />
            <Row label="land sqm" value={listing.land_area_sqm} />
            <Row label="images" value={listing.image_urls.length} />
          </dl>

          {listing.description && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-foreground-muted">description</summary>
              <pre className="whitespace-pre-wrap mt-2 text-[11px]">
                {listing.description.slice(0, 1500)}{listing.description.length > 1500 ? "…" : ""}
              </pre>
            </details>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={runReview}
              disabled={reviewing || deepReviewing}
              className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
            >
              {reviewing ? "Reviewing…" : verdict ? "Re-review" : "Run review"}
            </button>
            <button
              onClick={runDeepReview}
              disabled={deepReviewing || reviewing}
              className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
            >
              {deepReviewing ? "Deep reviewing…" : "Deep review"}
            </button>
          </div>

          {verdict && (
            <div className="mt-3 border-t border-border-strong pt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Verdict v={verdict.verdict} />
                <span className="text-foreground-muted">confidence {(verdict.confidence * 100).toFixed(0)}%</span>
                {verdict.hide_reason && <span className="text-foreground-muted italic">{verdict.hide_reason}</span>}
              </div>
              <ul className="list-disc pl-5 text-xs space-y-1">
                {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>

              {verdict.fetch_status && verdict.fetch_status !== "ok" && (
                <div className="text-[11px] text-amber">
                  source page {verdict.fetch_status === "failed" ? "could not be fetched" : "was not fetched"} — diagnosis is from stored data only
                </div>
              )}

              {verdict.missing_field_report && verdict.missing_field_report.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">Field gaps</div>
                  <table className="text-xs w-full">
                    <thead className="text-foreground-muted">
                      <tr><th className="text-left">field</th><th className="text-left">diagnosis</th><th className="text-left">value / evidence</th></tr>
                    </thead>
                    <tbody>
                      {verdict.missing_field_report.map((e: MissingFieldEntry) => (
                        <tr key={e.field} className="border-t border-border-strong align-top">
                          <td className="font-mono py-1">{e.field}</td>
                          <td><GapStatus status={e.status} /></td>
                          <td>
                            {e.status === "scraper_missed"
                              ? <span><span className="font-mono">{String(e.found_value ?? "—")}</span>{e.evidence ? <span className="text-foreground-muted italic"> — {e.evidence}</span> : null}</span>
                              : <span className="text-foreground-muted">{e.evidence ?? (e.status === "absent_at_source" ? "not stated at source" : "could not determine")}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sourceId && verdict.missing_field_report.some((e) => e.status === "scraper_missed") && (
                    <div className="text-[11px] text-foreground-muted mt-1">
                      Accept a scraper-missed field below and Apply — it patches the row and logs the scraper gap.
                    </div>
                  )}
                </div>
              )}

              {verdict.unmapped_fields && verdict.unmapped_fields.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">No column for these</div>
                  <ul className="text-xs space-y-1">
                    {verdict.unmapped_fields.map((u: UnmappedField) => (
                      <li key={u.label} className="border-t border-border-strong pt-1">
                        <span className="font-mono">{u.label}</span>: {u.value}
                        <span className="text-foreground-muted"> → consider <span className="font-mono">{u.suggested_column}</span> ({u.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {patchEntries.length > 0 && (
                <div>
                  <div className="text-xs font-medium mt-2 mb-1">Suggested patch</div>
                  <table className="text-xs w-full">
                    <thead className="text-foreground-muted">
                      <tr><th /><th className="text-left">field</th><th className="text-left">current</th><th className="text-left">suggested</th></tr>
                    </thead>
                    <tbody>
                      {patchEntries.map(([k, v]) => (
                        <tr key={k} className="border-t border-border-strong">
                          <td className="py-1"><input type="checkbox" checked={acceptedKeys.has(k)} onChange={() => toggleKey(k)} /></td>
                          <td className="font-mono">{k}</td>
                          <td>{String((listing as unknown as Record<string, unknown>)[k] ?? "—")}</td>
                          <td>{String(v ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => apply()}
                  disabled={applying || acceptedKeys.size === 0}
                  className="px-3 py-1.5 text-sm rounded border border-border-strong hover:bg-surface-3 disabled:opacity-50"
                >Apply selected</button>
                <button
                  onClick={() => apply("published")}
                  disabled={applying}
                  className="px-3 py-1.5 text-sm rounded bg-green-muted text-green border border-border-strong hover:opacity-80 disabled:opacity-50"
                >Apply + Publish</button>
                <button
                  onClick={() => apply("hidden")}
                  disabled={applying}
                  className="px-3 py-1.5 text-sm rounded bg-red-muted text-red border border-border-strong hover:opacity-80 disabled:opacity-50"
                >Hide</button>
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-border-strong pt-3">
            {!historyOpen ? (
              <button onClick={openHistory} className="text-xs underline">show review history</button>
            ) : (
              <>
                <div className="text-xs font-medium mb-2">Review history</div>
                {history == null && <div className="text-xs text-foreground-muted">loading…</div>}
                {history && history.length === 0 && <div className="text-xs text-foreground-muted">no past reviews</div>}
                {history && history.map((h) => (
                  <div key={h.id} className="border-t border-border-strong py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Verdict v={h.verdict} />
                      <span className="text-foreground-muted">{(h.confidence * 100).toFixed(0)}%</span>
                      <span className="text-foreground-muted ml-auto">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    {h.reasons.length > 0 && (
                      <ul className="list-disc pl-5 mt-1 text-foreground-muted">
                        {h.reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

function Row({ label, value, highlightNull }: { label: string; value: unknown; highlightNull?: boolean }) {
  const isNull = value == null || value === "";
  return (
    <>
      <dt className="text-foreground-muted">{label}</dt>
      <dd className={"font-mono " + (isNull && highlightNull ? "text-red" : "")}>{isNull ? "—" : String(value)}</dd>
    </>
  );
}

function Verdict({ v }: { v: "publish" | "hold" | "hide" }) {
  const cls =
    v === "publish" ? "bg-green-muted text-green"
    : v === "hold"  ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-2 py-0.5 text-[10px] rounded border border-border-strong ${cls}`}>{v}</span>;
}

function GapStatus({ status }: { status: "scraper_missed" | "absent_at_source" | "uncertain" }) {
  const map = {
    scraper_missed: { cls: "bg-amber-muted text-amber", label: "scraper missed" },
    absent_at_source: { cls: "bg-surface-3 text-foreground-muted", label: "absent at source" },
    uncertain: { cls: "bg-surface-3 text-foreground-muted", label: "uncertain" },
  } as const;
  const { cls, label } = map[status];
  return <span className={`px-2 py-0.5 text-[10px] rounded border border-border-strong ${cls}`}>{label}</span>;
}
