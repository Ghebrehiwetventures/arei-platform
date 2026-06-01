import { useCallback, useEffect, useState } from "react";
import { getCurationStats, getCuratedListings } from "../data";
import type { CuratedListing, CurationFilters, CurationStats, ReviewVerdict } from "../types";
import { DashboardStrip } from "./DashboardStrip";
import { FilterBar } from "./FilterBar";
import { InventoryTable } from "./InventoryTable";
import { ListingDrawer } from "./ListingDrawer";

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

  const onToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allCurrentlySelected = listings.every((l) => prev.has(l.id));
      if (allCurrentlySelected) return new Set();
      const next = new Set(prev);
      for (const l of listings) next.add(l.id);
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

      <InventoryTable
        rows={listings}
        loading={loadingList}
        selectedIds={selectedIds}
        onToggleSelect={onRowSelectToggle}
        onToggleSelectAll={onToggleSelectAll}
        onOpenRow={setOpenId}
      />

      {openId && (
        <ListingDrawer
          id={openId}
          onClose={() => setOpenId(null)}
          onApplied={async () => { await Promise.all([reloadList(), reloadStats()]); }}
          ephemeralVerdict={ephemeralVerdicts[openId]}
          onVerdictProduced={(id, v) => setEphemeralVerdicts((prev) => ({ ...prev, [id]: v }))}
        />
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
