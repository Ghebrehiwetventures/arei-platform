// =============================================================================
// FeaturedView.tsx — admin-curated homepage featured listings
// Pick up to 4 listings per ISO week; save as draft or publish.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  getListings,
  getFeaturedSelections,
  saveFeaturedSelection,
  setFeaturedStatus,
  deleteFeaturedSelection,
  toIsoWeek,
  isoWeekToMonday,
  type FeaturedSelectionRow,
} from "./data";

// ── Minimal listing type for this view ────────────────────────────────────────
interface ListingSnippet {
  id: string;
  title: string;
  island: string | null;
  city: string | null;
  price: number | null;
  currency: string | null;
  property_type: string | null;
  image_url: string | null;
  source_id: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSnippet(l: any): ListingSnippet {
  return {
    id: l.id,
    title: l.title ?? "",
    island: l.island ?? null,
    city: l.city ?? null,
    price: l.price ?? null,
    currency: l.currency ?? null,
    property_type: l.property_type ?? null,
    image_url: Array.isArray(l.image_urls) ? (l.image_urls[0] ?? null) : null,
    source_id: l.source_id ?? "",
  };
}

function fmtPrice(price: number | null, currency: string | null): string {
  if (!price) return "—";
  const c = currency ?? "EUR";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(price);
}

function fmtWeekLabel(isoWeek: string): string {
  const monday = isoWeekToMonday(isoWeek);
  return monday.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function weekOffset(isoWeek: string, delta: number): string {
  const monday = isoWeekToMonday(isoWeek);
  monday.setDate(monday.getDate() + delta * 7);
  return toIsoWeek(monday);
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({
  index,
  listing,
  active,
  onActivate,
  onRemove,
}: {
  index: number;
  listing: ListingSnippet | null;
  active: boolean;
  onActivate: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
        active
          ? "border-[#8ECFBF] ring-1 ring-[#8ECFBF]/40"
          : "border-border hover:border-[#8ECFBF]/50"
      }`}
      onClick={onActivate}
    >
      {/* slot number */}
      <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-xs font-mono px-1.5 py-0.5 rounded">
        {index + 1}
      </div>

      {listing ? (
        <>
          {/* thumbnail */}
          <div className="h-28 bg-surface-1 overflow-hidden">
            {listing.image_url ? (
              <img src={listing.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-foreground-subtle text-xs">No image</div>
            )}
          </div>
          {/* meta */}
          <div className="p-2.5">
            <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug mb-1">{listing.title}</div>
            <div className="text-xs text-foreground-muted">
              {[listing.island, listing.city].filter(Boolean).join(", ")}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-mono tabular-nums text-[#8ECFBF]">
                {fmtPrice(listing.price, listing.currency)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-foreground-subtle">
                {listing.property_type ?? "—"}
              </span>
            </div>
          </div>
          {/* remove */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute top-2 right-2 bg-black/60 hover:bg-[#C44A3A]/80 text-white rounded p-0.5 transition-colors"
            title="Remove from slot"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </>
      ) : (
        <div className="h-28 flex flex-col items-center justify-center text-foreground-subtle text-sm gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="text-xs">Empty slot</span>
        </div>
      )}
      {active && (
        <div className="px-2.5 pb-2 pt-0 text-[10px] text-[#8ECFBF] font-medium uppercase tracking-wide">
          Click a listing below to fill →
        </div>
      )}
    </div>
  );
}

// ── Listing search row ────────────────────────────────────────────────────────

function ListingRow({
  listing,
  pinnedSlot,
  activeSlot,
  onPin,
}: {
  listing: ListingSnippet;
  pinnedSlot: number | null; // which slot this listing is already in, or null
  activeSlot: number | null;
  onPin: (slotIndex: number) => void;
}) {
  const isPinned = pinnedSlot !== null;

  return (
    <tr className="border-b border-border hover:bg-surface-1 transition-colors">
      <td className="py-2 px-3 w-10">
        {listing.image_url ? (
          <img src={listing.image_url} alt="" className="w-8 h-8 object-cover rounded" />
        ) : (
          <div className="w-8 h-8 bg-surface-1 rounded" />
        )}
      </td>
      <td className="py-2 px-3 text-sm text-foreground max-w-[280px]">
        <div className="line-clamp-1">{listing.title}</div>
        <div className="text-xs text-foreground-muted">{[listing.island, listing.city].filter(Boolean).join(", ")}</div>
      </td>
      <td className="py-2 px-3 text-xs text-foreground-muted">{listing.property_type ?? "—"}</td>
      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right">
        {fmtPrice(listing.price, listing.currency)}
      </td>
      <td className="py-2 px-3 text-xs text-foreground-subtle">{listing.source_id}</td>
      <td className="py-2 px-3 text-right">
        {isPinned ? (
          <span className="inline-flex items-center gap-1 text-[10px] bg-[#8ECFBF]/10 text-[#8ECFBF] border border-[#8ECFBF]/30 px-2 py-0.5 rounded font-medium uppercase tracking-wide">
            Slot {pinnedSlot! + 1}
          </span>
        ) : activeSlot !== null ? (
          <button
            onClick={() => onPin(activeSlot)}
            className="text-[10px] bg-[#8ECFBF] text-[#0A0A0A] px-2.5 py-1 rounded font-medium hover:bg-[#2D4A42] hover:text-white transition-colors uppercase tracking-wide"
          >
            Pin to slot {activeSlot + 1}
          </button>
        ) : (
          <span className="text-[10px] text-foreground-subtle">Select slot first</span>
        )}
      </td>
    </tr>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function FeaturedView() {
  const [currentWeek, setCurrentWeek] = useState(() => toIsoWeek());
  const [selections, setSelections] = useState<FeaturedSelectionRow[]>([]);
  const [slots, setSlots] = useState<(ListingSnippet | null)[]>([null, null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Search state
  const [searchTitle, setSearchTitle] = useState("");
  const [searchIsland, setSearchIsland] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchResults, setSearchResults] = useState<ListingSnippet[]>([]);
  const [searching, setSearching] = useState(false);

  // Load all selections
  const loadSelections = useCallback(async () => {
    const rows = await getFeaturedSelections();
    setSelections(rows);
  }, []);

  useEffect(() => { loadSelections(); }, [loadSelections]);

  // When week changes, populate slots from saved selection (if any)
  useEffect(() => {
    const row = selections.find((s) => s.iso_week === currentWeek) ?? null;
    if (row && row.listing_ids.length > 0) {
      getListings("cv", 1, 500, {}).then((res) => {
        const byId = new Map(res.data.map((l) => [l.id, l]));
        const filled: (ListingSnippet | null)[] = [null, null, null, null];
        row.listing_ids.forEach((id, i) => {
          if (i > 3) return;
          const l = byId.get(id);
          if (l) {
            filled[i] = toSnippet(l);
          }
        });
        setSlots(filled);
      });
    } else {
      setSlots([null, null, null, null]);
    }
  }, [currentWeek, selections]);

  // Search listings
  const runSearch = useCallback(async () => {
    setSearching(true);
    try {
      const filters: Record<string, unknown> = {};
      if (searchIsland) filters.island = searchIsland;
      if (searchTitle.trim()) filters.titleSearch = searchTitle.trim();

      const res = await getListings("cv", 1, 100, filters as any);

      let results = res.data;
      // Client-side property type filter (not in ListingsFilters)
      if (searchType) {
        results = results.filter(
          (l: any) => l.property_type?.toLowerCase() === searchType.toLowerCase()
        );
      }

      setSearchResults(results.map((l: any) => toSnippet(l)));
    } finally {
      setSearching(false);
    }
  }, [searchTitle, searchIsland, searchType]);

  useEffect(() => { runSearch(); }, []); // initial load

  const handlePin = (listingId: string, slotIndex: number) => {
    const listing = searchResults.find((l) => l.id === listingId);
    if (!listing) return;
    const next = [...slots];
    next[slotIndex] = listing;
    setSlots(next);
    setActiveSlot(null);
  };

  const handleRemoveSlot = (slotIndex: number) => {
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
  };

  const handleSave = async (status: "draft" | "published") => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const ids = slots.filter(Boolean).map((l) => l!.id);
      await saveFeaturedSelection(currentWeek, ids, status);
      setSaveOk(true);
      await loadSelections();
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete selection for ${currentWeek}?`)) return;
    await deleteFeaturedSelection(currentWeek);
    setSlots([null, null, null, null]);
    await loadSelections();
  };

  const currentSelection = selections.find((s) => s.iso_week === currentWeek) ?? null;
  const filledCount = slots.filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-1">Homepage</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Featured listings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Curate the four listings shown in "Four listings worth a closer look" on the homepage.
          If no selection is published for the current week, the homepage falls back to its automatic picker.
        </p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentWeek((w) => weekOffset(w, -1))}
          className="p-1.5 border border-border rounded hover:border-[#8ECFBF]/50 text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="text-sm font-mono text-foreground">
          <span className="text-foreground-subtle mr-1">{currentWeek}</span>
          Week of {fmtWeekLabel(currentWeek)}
          {currentWeek === toIsoWeek() && (
            <span className="ml-2 text-[10px] uppercase tracking-wide bg-[#8ECFBF]/10 text-[#8ECFBF] border border-[#8ECFBF]/30 px-1.5 py-0.5 rounded font-medium">
              Current
            </span>
          )}
        </div>
        <button
          onClick={() => setCurrentWeek((w) => weekOffset(w, 1))}
          className="p-1.5 border border-border rounded hover:border-[#8ECFBF]/50 text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentWeek(toIsoWeek())}
          className="text-xs text-foreground-subtle hover:text-foreground underline underline-offset-2 transition-colors ml-1"
        >
          Today
        </button>

        {/* status badge */}
        {currentSelection && (
          <span
            className={`ml-auto text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border ${
              currentSelection.status === "published"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {currentSelection.status}
          </span>
        )}
      </div>

      {/* 4 Slots */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-3">
          Slots — {filledCount}/4 filled
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {slots.map((listing, i) => (
            <SlotCard
              key={i}
              index={i}
              listing={listing}
              active={activeSlot === i}
              onActivate={() => setActiveSlot(activeSlot === i ? null : i)}
              onRemove={() => handleRemoveSlot(i)}
            />
          ))}
        </div>
      </div>

      {/* Save actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleSave("draft")}
          disabled={saving || filledCount === 0}
          className="px-4 py-2 text-sm border border-border rounded hover:border-foreground-muted text-foreground-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save as draft
        </button>
        <button
          onClick={() => handleSave("published")}
          disabled={saving || filledCount === 0}
          className="px-4 py-2 text-sm bg-[#8ECFBF] text-[#0A0A0A] font-medium rounded hover:bg-[#2D4A42] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Publish"}
        </button>
        {currentSelection && (
          <button
            onClick={handleDelete}
            className="ml-auto text-xs text-[#C44A3A] hover:underline"
          >
            Delete selection
          </button>
        )}
        {saveOk && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
        {saveError && <span className="text-xs text-[#C44A3A]">{saveError}</span>}
      </div>

      {currentSelection?.note && (
        <div className="text-xs text-foreground-muted border border-border rounded px-3 py-2">
          <span className="text-foreground-subtle uppercase tracking-wide mr-1">Note:</span>
          {currentSelection.note}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Listing search/picker */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-3">
          Browse listings
          {activeSlot !== null && (
            <span className="ml-2 normal-case tracking-normal text-[#8ECFBF]">
              — pinning to slot {activeSlot + 1}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="Search title or city…"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="border border-border rounded px-3 py-1.5 text-sm bg-surface-1 text-foreground placeholder-foreground-subtle focus:outline-none focus:border-[#8ECFBF]/50 w-64"
          />
          <select
            value={searchIsland}
            onChange={(e) => setSearchIsland(e.target.value)}
            className="border border-border rounded px-3 py-1.5 text-sm bg-surface-1 text-foreground focus:outline-none focus:border-[#8ECFBF]/50"
          >
            <option value="">All islands</option>
            <option value="SAL">Sal</option>
            <option value="SANTIAGO">Santiago</option>
            <option value="BOA VISTA">Boa Vista</option>
            <option value="SÃO VICENTE">São Vicente</option>
            <option value="SANTO ANTÃO">Santo Antão</option>
            <option value="FOGO">Fogo</option>
            <option value="MAIO">Maio</option>
            <option value="BRAVA">Brava</option>
          </select>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="border border-border rounded px-3 py-1.5 text-sm bg-surface-1 text-foreground focus:outline-none focus:border-[#8ECFBF]/50"
          >
            <option value="">All types</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="house">House</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
          </select>
          <button
            onClick={runSearch}
            className="px-3 py-1.5 text-sm bg-[#8ECFBF] text-[#0A0A0A] font-medium rounded hover:bg-[#2D4A42] hover:text-white transition-colors"
          >
            Search
          </button>
        </div>

        {/* Results table */}
        <div className="border border-border rounded overflow-hidden">
          {searching ? (
            <div className="py-10 text-center text-sm text-foreground-subtle">Loading…</div>
          ) : searchResults.length === 0 ? (
            <div className="py-10 text-center text-sm text-foreground-subtle">No listings found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-1">
                    <th className="py-2 px-3 w-10" />
                    <th className="py-2 px-3 text-left text-xs font-medium text-foreground-subtle uppercase tracking-wide">Listing</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-foreground-subtle uppercase tracking-wide">Type</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-foreground-subtle uppercase tracking-wide">Price</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-foreground-subtle uppercase tracking-wide">Source</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {searchResults.slice(0, 50).map((listing) => {
                    const pinnedSlot = slots.findIndex((s) => s?.id === listing.id);
                    return (
                      <ListingRow
                        key={listing.id}
                        listing={listing}
                        pinnedSlot={pinnedSlot >= 0 ? pinnedSlot : null}
                        activeSlot={activeSlot}
                        onPin={(slotIdx) => handlePin(listing.id, slotIdx)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {searchResults.length > 50 && (
          <div className="text-xs text-foreground-subtle mt-2">
            Showing 50 of {searchResults.length}. Refine your search to narrow results.
          </div>
        )}
      </div>

      {/* Recent history */}
      {selections.length > 0 && (
        <div>
          <div className="border-t border-border mb-5" />
          <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-3">Recent selections</div>
          <div className="space-y-1.5">
            {selections.map((sel) => (
              <div
                key={sel.id}
                className={`flex items-center gap-3 text-sm px-3 py-2 rounded border cursor-pointer transition-colors ${
                  sel.iso_week === currentWeek
                    ? "border-[#8ECFBF]/40 bg-[#8ECFBF]/5"
                    : "border-border hover:border-border-muted hover:bg-surface-1"
                }`}
                onClick={() => setCurrentWeek(sel.iso_week)}
              >
                <span className="font-mono text-xs text-foreground-subtle w-20 shrink-0">{sel.iso_week}</span>
                <span className="text-foreground-muted text-xs">{fmtWeekLabel(sel.iso_week)}</span>
                <span className="text-xs text-foreground-subtle">{sel.listing_ids.length} listing{sel.listing_ids.length !== 1 ? "s" : ""}</span>
                <span
                  className={`ml-auto text-[10px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded ${
                    sel.status === "published"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {sel.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
