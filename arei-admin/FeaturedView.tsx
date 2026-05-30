// =============================================================================
// FeaturedView.tsx — admin-curated homepage featured listings
// Queries v1_feed_cv directly for full listing data (images, property_type).
// UX: slot buttons inline per listing row — no pre-selection step needed.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import {
  getFeaturedSelections,
  saveFeaturedSelection,
  deleteFeaturedSelection,
  toIsoWeek,
  isoWeekToMonday,
  type FeaturedSelectionRow,
} from "./data";

// ── Types ─────────────────────────────────────────────────────────────────────

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
    image_url: Array.isArray(l.image_urls) && l.image_urls.length > 0
      ? l.image_urls[0]
      : typeof l.image_urls === "string"
        ? l.image_urls
        : null,
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

/** Pick 4 diverse listings: prefer unique island + unique source, then fill. */
function pickRandom(pool: ListingSnippet[]): ListingSnippet[] {
  const withImage = pool.filter((l) => l.image_url && l.price);
  const picked: ListingSnippet[] = [];
  const seenIslands = new Set<string>();
  const seenSources = new Set<string>();

  // Shuffle first so repeated clicks give different results
  const shuffled = [...withImage].sort(() => Math.random() - 0.5);

  // Pass 1: unique island + unique source
  for (const c of shuffled) {
    if (picked.length >= 4) break;
    if (c.island && !seenIslands.has(c.island) && c.source_id && !seenSources.has(c.source_id)) {
      picked.push(c);
      if (c.island) seenIslands.add(c.island);
      if (c.source_id) seenSources.add(c.source_id);
    }
  }
  // Pass 2: unique island
  for (const c of shuffled) {
    if (picked.length >= 4) break;
    if (!picked.includes(c) && c.island && !seenIslands.has(c.island)) {
      picked.push(c);
      if (c.island) seenIslands.add(c.island);
    }
  }
  // Pass 3: anything left
  for (const c of shuffled) {
    if (picked.length >= 4) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

function weekOffset(isoWeek: string, delta: number): string {
  const monday = isoWeekToMonday(isoWeek);
  monday.setDate(monday.getDate() + delta * 7);
  return toIsoWeek(monday);
}

async function fetchFromFeed(filters: {
  island?: string;
  titleSearch?: string;
  propertyType?: string;
  ids?: string[];
}): Promise<ListingSnippet[]> {
  let q = supabase
    .from("v1_feed_cv")
    .select("id,title,island,city,price,currency,property_type,image_urls,source_id")
    .order("first_seen_at", { ascending: false });

  if (filters.ids && filters.ids.length > 0) {
    q = q.in("id", filters.ids);
  } else {
    q = q.limit(120);
    if (filters.island) q = q.eq("island", filters.island);
    if (filters.titleSearch) q = q.ilike("title", `%${filters.titleSearch}%`);
    if (filters.propertyType) q = q.ilike("property_type", filters.propertyType);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[FeaturedView] fetchFromFeed error:", error.message);
    return [];
  }
  return (data ?? []).map(toSnippet);
}

// ── Slot strip ────────────────────────────────────────────────────────────────

function SlotStrip({
  slots,
  onRemove,
}: {
  slots: (ListingSnippet | null)[];
  onRemove: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {slots.map((listing, i) => (
        <div
          key={i}
          className={`relative border rounded-lg overflow-hidden ${
            listing ? "border-border" : "border-dashed border-border"
          }`}
        >
          {/* slot number badge */}
          <div className="absolute top-2 left-2 z-10 bg-black/70 text-white text-xs font-mono px-1.5 py-0.5 rounded">
            {i + 1}
          </div>

          {listing ? (
            <>
              <div className="h-24 bg-surface-1 overflow-hidden">
                {listing.image_url ? (
                  <img
                    src={listing.image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground-subtle">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium text-foreground line-clamp-2 leading-snug mb-0.5">{listing.title}</div>
                <div className="text-xs text-foreground-muted">{[listing.island, listing.city].filter(Boolean).join(", ")}</div>
                <div className="mt-1 text-xs font-mono text-[#8ECFBF] tabular-nums">{fmtPrice(listing.price, listing.currency)}</div>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="absolute top-2 right-2 bg-black/60 hover:bg-[#C44A3A]/80 text-white rounded p-0.5 transition-colors"
                title="Remove"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </>
          ) : (
            <div className="h-24 flex flex-col items-center justify-center text-foreground-subtle text-xs gap-1 px-2 text-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Empty
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Listing search row ────────────────────────────────────────────────────────

function ListingRow({
  listing,
  slots,
  onPin,
}: {
  listing: ListingSnippet;
  slots: (ListingSnippet | null)[];
  onPin: (listingId: string, slotIndex: number) => void;
}) {
  const currentSlot = slots.findIndex((s) => s?.id === listing.id);

  return (
    <tr className="border-b border-border hover:bg-surface-1 transition-colors">
      {/* Thumbnail */}
      <td className="py-2 px-3 w-12">
        <div className="w-10 h-10 rounded overflow-hidden bg-surface-1 shrink-0">
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-foreground-subtle">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          )}
        </div>
      </td>

      {/* Title + location */}
      <td className="py-2 px-3 text-sm">
        <div className="font-medium text-foreground line-clamp-1">{listing.title}</div>
        <div className="text-xs text-foreground-muted">
          {[listing.island, listing.city].filter(Boolean).join(", ")}
        </div>
      </td>

      {/* Type */}
      <td className="py-2 px-3 text-xs text-foreground-muted capitalize w-28">
        {listing.property_type ?? "—"}
      </td>

      {/* Price */}
      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right w-28">
        {fmtPrice(listing.price, listing.currency)}
      </td>

      {/* Slot buttons — always visible, 1 2 3 4 */}
      <td className="py-2 px-3 text-right w-44">
        <div className="flex items-center justify-end gap-1">
          {[0, 1, 2, 3].map((i) => {
            const isThisSlot = currentSlot === i;
            const slotOccupied = slots[i] !== null && !isThisSlot;
            return (
              <button
                key={i}
                onClick={() => onPin(listing.id, i)}
                title={slotOccupied ? `Replace slot ${i + 1}` : `Add to slot ${i + 1}`}
                className={`w-7 h-7 rounded text-xs font-mono font-medium transition-colors ${
                  isThisSlot
                    ? "bg-[#8ECFBF] text-[#0A0A0A]"
                    : slotOccupied
                      ? "border border-border text-foreground-subtle hover:border-[#C44A3A]/60 hover:text-[#C44A3A]"
                      : "border border-border text-foreground-muted hover:border-[#8ECFBF]/60 hover:text-[#8ECFBF]"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function FeaturedView() {
  const [currentWeek, setCurrentWeek] = useState(() => toIsoWeek());
  const [selections, setSelections] = useState<FeaturedSelectionRow[]>([]);
  const [slots, setSlots] = useState<(ListingSnippet | null)[]>([null, null, null, null]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  // Search state
  const [searchTitle, setSearchTitle] = useState("");
  const [searchIsland, setSearchIsland] = useState("");
  const [searchType, setSearchType] = useState("");
  const [searchResults, setSearchResults] = useState<ListingSnippet[]>([]);
  const [searching, setSearching] = useState(false);

  // Load saved selections
  const loadSelections = useCallback(async () => {
    const rows = await getFeaturedSelections();
    setSelections(rows);
  }, []);

  useEffect(() => { loadSelections(); }, [loadSelections]);

  // When week or selections change, populate slots
  useEffect(() => {
    const row = selections.find((s) => s.iso_week === currentWeek) ?? null;
    if (row && row.listing_ids.length > 0) {
      fetchFromFeed({ ids: row.listing_ids }).then((snippets) => {
        const byId = new Map(snippets.map((s) => [s.id, s]));
        const filled: (ListingSnippet | null)[] = [null, null, null, null];
        row.listing_ids.forEach((id, i) => {
          if (i < 4) filled[i] = byId.get(id) ?? null;
        });
        setSlots(filled);
      });
    } else {
      setSlots([null, null, null, null]);
    }
  }, [currentWeek, selections]);

  // Initial search load
  const runSearch = useCallback(async () => {
    setSearching(true);
    try {
      const results = await fetchFromFeed({
        island: searchIsland || undefined,
        titleSearch: searchTitle.trim() || undefined,
        propertyType: searchType || undefined,
      });
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  }, [searchTitle, searchIsland, searchType]);

  useEffect(() => { runSearch(); }, []); // initial load

  const handlePin = (listingId: string, slotIndex: number) => {
    const listing = searchResults.find((l) => l.id === listingId)
      ?? slots.find((s) => s?.id === listingId) ?? null;
    if (!listing) return;
    const next = [...slots];
    // If already in another slot, clear that one
    const prev = next.findIndex((s) => s?.id === listingId);
    if (prev >= 0 && prev !== slotIndex) next[prev] = null;
    next[slotIndex] = listing;
    setSlots(next);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-1">Homepage</div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Featured listings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Curate the four listings shown in "Four listings worth a closer look."
          Falls back to the automatic picker if nothing is published for the current week.
        </p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setCurrentWeek((w) => weekOffset(w, -1))}
          className="p-1.5 border border-border rounded hover:border-[#8ECFBF]/50 text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="text-sm font-mono text-foreground">
          <span className="text-foreground-subtle mr-1">{currentWeek}</span>
          Week of {fmtWeekLabel(currentWeek)}
          {currentWeek === toIsoWeek() && (
            <span className="ml-2 text-[10px] uppercase tracking-wide bg-[#8ECFBF]/10 text-[#8ECFBF] border border-[#8ECFBF]/30 px-1.5 py-0.5 rounded font-medium">Current</span>
          )}
        </div>
        <button
          onClick={() => setCurrentWeek((w) => weekOffset(w, 1))}
          className="p-1.5 border border-border rounded hover:border-[#8ECFBF]/50 text-foreground-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        <button
          onClick={() => setCurrentWeek(toIsoWeek())}
          className="text-xs text-foreground-subtle hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Today
        </button>

        {currentSelection && (
          <span className={`ml-auto text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded border ${
            currentSelection.status === "published"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}>
            {currentSelection.status}
          </span>
        )}
      </div>

      {/* Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono">
            Slots — {filledCount}/4 filled
          </div>
          <button
            onClick={() => {
              const picks = pickRandom(searchResults.length > 0 ? searchResults : []);
              if (picks.length === 0) return;
              setSlots([
                picks[0] ?? null,
                picks[1] ?? null,
                picks[2] ?? null,
                picks[3] ?? null,
              ]);
            }}
            disabled={searchResults.length === 0}
            title="Pick 4 random listings from current results"
            className="flex items-center gap-1.5 text-xs border border-border rounded px-2.5 py-1 text-foreground-muted hover:text-foreground hover:border-[#8ECFBF]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
            </svg>
            Random
          </button>
        </div>
        <SlotStrip slots={slots} onRemove={handleRemoveSlot} />
      </div>

      {/* Actions */}
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
          <button onClick={handleDelete} className="ml-auto text-xs text-[#C44A3A] hover:underline">
            Delete selection
          </button>
        )}
        {saveOk && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
        {saveError && <span className="text-xs text-[#C44A3A]">{saveError}</span>}
      </div>

      <div className="border-t border-border" />

      {/* Search */}
      <div>
        <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-3">
          Browse listings — click a slot number to assign
        </div>

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
                    <th className="py-2 px-3 w-12" />
                    <th className="py-2 px-3 text-left text-xs font-medium text-foreground-subtle uppercase tracking-wide">Listing</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-foreground-subtle uppercase tracking-wide w-28">Type</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-foreground-subtle uppercase tracking-wide w-28">Price</th>
                    <th className="py-2 px-3 text-right text-xs font-medium text-foreground-subtle uppercase tracking-wide w-44">Slot</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.slice(0, 60).map((listing) => (
                    <ListingRow
                      key={listing.id}
                      listing={listing}
                      slots={slots}
                      onPin={handlePin}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {searchResults.length > 60 && (
          <div className="text-xs text-foreground-subtle mt-2">
            Showing 60 of {searchResults.length} — use filters to narrow down.
          </div>
        )}
      </div>

      {/* History */}
      {selections.length > 0 && (
        <div>
          <div className="border-t border-border mb-5" />
          <div className="text-xs uppercase tracking-widest text-foreground-subtle font-mono mb-3">Recent selections</div>
          <div className="space-y-1.5">
            {selections.map((sel) => (
              <div
                key={sel.id}
                onClick={() => setCurrentWeek(sel.iso_week)}
                className={`flex items-center gap-3 text-sm px-3 py-2 rounded border cursor-pointer transition-colors ${
                  sel.iso_week === currentWeek
                    ? "border-[#8ECFBF]/40 bg-[#8ECFBF]/5"
                    : "border-border hover:bg-surface-1"
                }`}
              >
                <span className="font-mono text-xs text-foreground-subtle w-20 shrink-0">{sel.iso_week}</span>
                <span className="text-foreground-muted text-xs">{fmtWeekLabel(sel.iso_week)}</span>
                <span className="text-xs text-foreground-subtle">{sel.listing_ids.length} listings</span>
                <span className={`ml-auto text-[10px] font-medium uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  sel.status === "published" ? "text-emerald-400" : "text-amber-400"
                }`}>
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
