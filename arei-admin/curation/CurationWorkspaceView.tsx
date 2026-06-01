import { useCallback, useEffect, useRef, useState } from "react";
import { getCurationStats, getCuratedListings } from "../data";
import type { CuratedListing, CurationFilters, CurationStats, ReviewVerdict } from "../types";
import { DashboardStrip } from "./DashboardStrip";
import { FilterBar } from "./FilterBar";
import { InventoryTable } from "./InventoryTable";
import { ListingDrawer } from "./ListingDrawer";
import { BulkActionBar } from "./BulkActionBar";

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

  // Per-call sequence token. A response only wins if it was the most recently
  // dispatched; otherwise a slow older request can clobber a newer one.
  const listReqIdRef = useRef(0);
  const reloadList = useCallback(async () => {
    const reqId = ++listReqIdRef.current;
    setLoadingList(true);
    try {
      const { items, totalCount } = await getCuratedListings(filters);
      if (reqId !== listReqIdRef.current) return;
      setListings(items);
      setTotalCount(totalCount);
    } catch (e) {
      if (reqId !== listReqIdRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (reqId === listReqIdRef.current) setLoadingList(false);
    }
  }, [filters]);

  const applyFilters = useCallback((next: CurationFilters) => {
    setFilters(next);
    // Selection is by id and survives across filter changes only by accident;
    // hiding the selected rows behind a new filter would silently no-op bulk
    // actions. Force the operator to reselect after every filter change.
    setSelectedIds(new Set());
  }, []);

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
        onApplyFilter={applyFilters}
      />


      <FilterBar
        filters={filters}
        totalCount={totalCount}
        loading={loadingList}
        listings={listings}
        onChange={applyFilters}
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

      <BulkActionBar
        selectedIds={selectedIds}
        rows={listings}
        onClear={() => setSelectedIds(new Set())}
        onAfterMutation={async () => { await Promise.all([reloadList(), reloadStats()]); }}
        onVerdictProduced={(id, v) => setEphemeralVerdicts((prev) => ({ ...prev, [id]: v }))}
      />
    </div>
  );
}
