import type { CurationFilters, CurationStats } from "../types";

interface Props {
  stats: CurationStats | null;
  loading: boolean;
  onApplyFilter: (filters: CurationFilters) => void;
  currentFilters: CurationFilters;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DashboardStrip({ stats, loading, onApplyFilter, currentFilters }: Props) {
  const liveActive    = currentFilters.status === "published" && !currentFilters.first_seen_after && !currentFilters.flagged_hide;
  const needsActive   = currentFilters.status === "needs_review" && !currentFilters.first_seen_after && !currentFilters.flagged_hide;
  const newActive     = !!currentFilters.first_seen_after;
  const flaggedActive = !!currentFilters.flagged_hide;

  const tile = (border: string, label: string, value: string | number, detail: string, onClick: () => void, isActive: boolean) => (
    <button
      onClick={onClick}
      className={
        `text-left bg-surface-2 border rounded p-3 hover:bg-surface-3 transition-colors ` +
        (isActive ? "ring-1 ring-sage " : "") +
        border
      }
    >
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{loading && stats == null ? "…" : value}</div>
      <div className="text-[10px] text-foreground-muted mt-1">{detail}</div>
    </button>
  );

  return (
    <section className="grid grid-cols-4 gap-2">
      {tile(
        "border-border-strong",
        "Live feed",
        stats?.live ?? "—",
        "public.v1_feed_cv (published)",
        () => onApplyFilter({ status: "published" }),
        liveActive,
      )}
      {tile(
        "border-amber",
        "Needs review",
        stats?.needs_review ?? "—",
        stats ? `${stats.needs_review_older_than_14d} aged >14d` : "",
        () => onApplyFilter({ status: "needs_review" }),
        needsActive,
      )}
      {tile(
        "border-border-strong",
        "New this week",
        stats?.new_this_week ?? "—",
        "first_seen_at ≥ 7d ago",
        () => onApplyFilter({ status: "all", first_seen_after: isoDaysAgo(7) }),
        newActive,
      )}
      {tile(
        "border-red",
        "Agent flagged",
        stats?.agent_flagged ?? "—",
        "last verdict = hide, not yet hidden",
        () => onApplyFilter({ status: "all", flagged_hide: true }),
        flaggedActive,
      )}
    </section>
  );
}
