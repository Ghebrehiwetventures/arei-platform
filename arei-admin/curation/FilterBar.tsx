import { useMemo, useState } from "react";
import type { CurationFilters, CuratedListing } from "../types";

const CV_ISLANDS = [
  "Boa Vista", "Brava", "Fogo", "Maio", "Sal",
  "Santiago", "Santo Antão", "São Nicolau", "São Vicente",
];

interface Props {
  filters: CurationFilters;
  totalCount: number;
  listings: CuratedListing[];
  onChange: (next: CurationFilters) => void;
}

export function FilterBar({ filters, totalCount, listings, onChange }: Props) {
  const [q, setQ] = useState(filters.q ?? "");
  const sourceIds = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) set.add(l.source_id_primary);
    return Array.from(set).sort();
  }, [listings]);

  function update(delta: Partial<CurationFilters>) {
    onChange({ ...filters, ...delta });
  }

  function clearAll() {
    setQ("");
    onChange({ status: "all" });
  }

  function statusChip(value: NonNullable<CurationFilters["status"]>, label: string) {
    const active = filters.status === value || (value === "all" && !filters.status);
    return (
      <button
        onClick={() => update({ status: value, first_seen_after: undefined, flagged_hide: undefined })}
        className={
          "px-3 py-1 rounded-full text-xs border " +
          (active ? "bg-sage-deep text-white border-sage-deep" : "border-border-strong hover:bg-surface-3")
        }
      >
        {label}
      </button>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {statusChip("all", "All")}
        {statusChip("needs_review", "Needs review")}
        {statusChip("published", "Live")}
        {statusChip("hidden", "Hidden")}

        <select
          value={filters.source_id ?? ""}
          onChange={(e) => update({ source_id: e.target.value || undefined })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent"
        >
          <option value="">source: any</option>
          {sourceIds.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.island ?? ""}
          onChange={(e) => update({ island: e.target.value || undefined })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent"
        >
          <option value="">island: any</option>
          {CV_ISLANDS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>

        <input
          type="number"
          placeholder="min €"
          value={filters.price_min ?? ""}
          onChange={(e) => update({ price_min: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-24"
        />
        <input
          type="number"
          placeholder="max €"
          value={filters.price_max ?? ""}
          onChange={(e) => update({ price_max: e.target.value === "" ? undefined : Number(e.target.value) })}
          className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-24"
        />

        <form
          onSubmit={(e) => { e.preventDefault(); update({ q: q || undefined }); }}
          className="flex items-center gap-1"
        >
          <input
            type="search"
            placeholder="search title or id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="text-xs border border-border-strong rounded px-2 py-1 bg-transparent w-48"
          />
        </form>

        <button onClick={clearAll} className="text-xs underline ml-1">clear</button>
        <span className="ml-auto text-xs text-foreground-muted">{totalCount} results</span>
      </div>
    </section>
  );
}
