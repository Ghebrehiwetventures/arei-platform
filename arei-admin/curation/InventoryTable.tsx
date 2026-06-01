import type { CuratedListing } from "../types";

interface Props {
  rows: CuratedListing[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenRow: (id: string) => void;
}

function fmtPrice(p: number | null, ccy: string | null): string {
  if (p == null) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(p) + (ccy ? " " + ccy : "");
}

function statusPill(status: CuratedListing["publish_status"]) {
  const cls =
    status === "published"   ? "bg-green-muted text-green"
    : status === "needs_review" ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-2 py-0.5 text-[10px] rounded ${cls}`}>{status}</span>;
}

function lastReviewPill(r: CuratedListing["last_review"]) {
  if (!r) return null;
  const cls =
    r.verdict === "publish" ? "bg-green-muted text-green"
    : r.verdict === "hold"  ? "bg-amber-muted text-amber"
    : "bg-red-muted text-red";
  return <span className={`px-1.5 py-0.5 text-[9px] rounded ${cls}`} title={`reviewed ${new Date(r.created_at).toLocaleString()}`}>{r.verdict}</span>;
}

function NullableNum({ value }: { value: number | null }) {
  if (value == null) return <span className="text-red">—</span>;
  return <span>{value}</span>;
}

export function InventoryTable({ rows, loading, selectedIds, onToggleSelect, onToggleSelectAll, onOpenRow }: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  return (
    <section className="border border-border-strong rounded overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-surface-2 text-foreground-muted">
          <tr>
            <th className="px-2 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} /></th>
            <th className="px-2 py-2 w-12 text-left">img</th>
            <th className="px-2 py-2 w-24 text-left">status</th>
            <th className="px-2 py-2 text-left">title</th>
            <th className="px-2 py-2 text-left w-40">source</th>
            <th className="px-2 py-2 text-left w-40">island · city</th>
            <th className="px-2 py-2 text-left w-28">type</th>
            <th className="px-2 py-2 text-right w-24">price</th>
            <th className="px-2 py-2 text-right w-24">b/b/m²</th>
            <th className="px-2 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 && (
            <tr><td colSpan={10} className="px-2 py-6 text-center text-foreground-muted">loading…</td></tr>
          )}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={10} className="px-2 py-6 text-center text-foreground-muted">no rows match the current filters</td></tr>
          )}
          {rows.map((l) => {
            const sel = selectedIds.has(l.id);
            return (
              <tr key={l.id} className={"border-t border-border-strong " + (sel ? "bg-surface-2" : "hover:bg-surface-2")}>
                <td className="px-2 py-2 align-top">
                  <input type="checkbox" checked={sel} onChange={() => onToggleSelect(l.id)} onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-2 py-2 align-top">
                  {l.image_urls[0]
                    ? <img src={l.image_urls[0]} alt="" className="w-10 h-7 object-cover rounded" loading="lazy" />
                    : <div className="w-10 h-7 bg-surface-3 rounded" />}
                </td>
                <td className="px-2 py-2 align-top">
                  <div>{statusPill(l.publish_status)}</div>
                  <div className="mt-0.5">{lastReviewPill(l.last_review)}</div>
                </td>
                <td className="px-2 py-2 align-top cursor-pointer" onClick={() => onOpenRow(l.id)}>
                  <div className="font-medium truncate max-w-[36ch]" title={l.title}>{l.title}</div>
                  <div className="text-[10px] text-foreground-muted font-mono">{l.id}</div>
                </td>
                <td className="px-2 py-2 align-top text-foreground-muted">{l.source_id_primary}</td>
                <td className="px-2 py-2 align-top">{l.island}{l.city ? ` · ${l.city}` : ""}</td>
                <td className="px-2 py-2 align-top">{l.property_type ?? <span className="text-red">—</span>}</td>
                <td className="px-2 py-2 align-top text-right tabular-nums">{fmtPrice(l.price, l.currency)}</td>
                <td className="px-2 py-2 align-top text-right tabular-nums">
                  <NullableNum value={l.bedrooms} />/
                  <NullableNum value={l.bathrooms} />/
                  <NullableNum value={l.property_size_sqm} />
                </td>
                <td className="px-2 py-2 align-top">
                  <button onClick={() => onOpenRow(l.id)} className="text-xs underline">↗</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
