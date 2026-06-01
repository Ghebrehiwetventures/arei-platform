import { useCallback, useEffect, useState } from "react";
import { getCurationStats, getCuratedListings } from "../data";
import type { CuratedListing, CurationFilters, CurationStats, ReviewVerdict } from "../types";
import { DashboardStrip } from "./DashboardStrip";
import { FilterBar } from "./FilterBar";

export function CurationWorkspaceView() {
  const [filters, setFilters] = useState<CurationFilters>({ status: "needs_review" });
  const [listings, setListings] = useState<CuratedListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [ephemeralVerdicts, setEphemeralVerdicts] = useState<Record<string, ReviewVerdict>>({});
  const [loadingList, setLoadingList] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStats = useCallback(async () => {
    setLoadingStats(true);
    try { setStats(await getCurationStats()); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingStats(false); }
  }, []);

  const reloadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const { items, totalCount } = await getCuratedListings(filters);
      setListings(items);
      setTotalCount(totalCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }, [filters]);

  useEffect(() => { void reloadStats(); }, [reloadStats]);
  useEffect(() => { void reloadList(); }, [reloadList]);

  const onRowSelectToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4">
      {error && <div className="text-xs text-red">{error}</div>}

      <DashboardStrip
        stats={stats}
        loading={loadingStats}
        currentFilters={filters}
        onApplyFilter={(f) => setFilters(f)}
      />


      <FilterBar
        filters={filters}
        totalCount={totalCount}
        listings={listings}
        onChange={setFilters}
      />

      <section className="border border-border-strong rounded p-3 text-xs">
        Table placeholder · {loadingList ? "loading…" : `${listings.length} of ${totalCount} rows`}
        <ul className="mt-2 space-y-1">
          {listings.slice(0, 10).map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selectedIds.has(l.id)} onChange={() => onRowSelectToggle(l.id)} />
              <button className="underline" onClick={() => setOpenId(l.id)}>{l.id}</button>
              <span className="text-foreground-muted">· {l.publish_status} · {l.title.slice(0, 60)}</span>
              {l.last_review && <span className="text-foreground-muted">[last: {l.last_review.verdict}]</span>}
            </li>
          ))}
        </ul>
      </section>

      {openId && (
        <aside className="fixed right-0 top-0 h-full w-[420px] bg-surface-2 border-l border-border-strong p-4 overflow-y-auto z-30">
          <button className="text-xs underline" onClick={() => setOpenId(null)}>close</button>
          <div className="text-xs mt-2">Drawer placeholder for {openId}</div>
        </aside>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-surface-3 border-t border-border-strong text-xs z-20">
          BulkActionBar placeholder · {selectedIds.size} selected
          <button className="ml-2 underline" onClick={() => setSelectedIds(new Set())}>clear</button>
        </div>
      )}

      {/* keep ephemeralVerdicts for sub-components added in later tasks */}
      <div className="hidden">{Object.keys(ephemeralVerdicts).length}</div>
    </div>
  );
}
