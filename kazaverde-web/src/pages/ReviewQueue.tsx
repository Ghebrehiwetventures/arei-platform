import { useEffect, useMemo, useState } from "react";
import "./ReviewQueue.css";

type ReviewStatus = "needs_review" | "published" | "hidden";
type StatusFilter = ReviewStatus | "all";

interface ReviewListing {
  id: string;
  title: string | null;
  island: string | null;
  city: string | null;
  price: number | null;
  currency: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  image_urls: string[] | null;
  source_id: string;
  source_url: string | null;
  publish_status: ReviewStatus;
  first_seen_at: string | null;
  last_verified_at: string | null;
  updated_at: string | null;
  has_ai_description: boolean;
}

interface SourceSummary {
  source_id: string;
  publish_status: ReviewStatus;
  count: number;
}

interface ReviewResponse {
  data: ReviewListing[];
  total: number;
  limit: number;
  sources: SourceSummary[];
  error?: string;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "needs_review", label: "Needs review" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
  { value: "all", label: "All statuses" },
];

function formatMoney(value: number | null, currency: string | null): string {
  if (value == null) return "No price";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function sourceLabel(sourceId: string): string {
  return sourceId.replace(/^cv_/, "").replace(/_/g, " ");
}

function missingFields(row: ReviewListing): string[] {
  const fields = [];
  if (row.price == null) fields.push("price");
  if (row.bedrooms == null && row.property_type !== "land") fields.push("beds");
  if (row.bathrooms == null && row.property_type !== "land") fields.push("baths");
  if (row.area_sqm == null) fields.push("area");
  if (!row.image_urls?.length) fields.push("images");
  if (!row.has_ai_description) fields.push("AI text");
  return fields;
}

export default function ReviewQueue() {
  const [status, setStatus] = useState<StatusFilter>("needs_review");
  const [sourceId, setSourceId] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ReviewListing[]>([]);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("status", status);
      if (sourceId) params.set("sourceId", sourceId);
      params.set("limit", "300");

      try {
        const res = await fetch(`/__kv-review/listings?${params.toString()}`);
        const json = await res.json() as ReviewResponse;
        if (!res.ok) throw new Error(json.error || "Could not load review queue.");
        if (cancelled) return;
        setRows(json.data);
        setSources(json.sources);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(err instanceof Error ? err.message : "Could not load review queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [status, sourceId, refreshKey]);

  const sourceOptions = useMemo(() => {
    const totals = new Map<string, number>();
    for (const source of sources) {
      totals.set(source.source_id, (totals.get(source.source_id) ?? 0) + source.count);
    }
    return Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sources]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const source of sources) {
      if (sourceId && source.source_id !== sourceId) continue;
      counts[source.publish_status] = (counts[source.publish_status] ?? 0) + source.count;
      counts.all += source.count;
    }
    return counts;
  }, [sources, sourceId]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.id,
        row.title,
        row.source_id,
        row.island,
        row.city,
        row.property_type,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, query]);

  const missingTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of visibleRows) {
      for (const field of missingFields(row)) {
        totals.set(field, (totals.get(field) ?? 0) + 1);
      }
    }
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [visibleRows]);

  return (
    <main className="kv-review">
      <header className="kv-review-head">
        <div>
          <p className="kv-review-kicker">Curated feed</p>
          <h1>Review queue</h1>
          <p>Filter KazaVerde curated listings by source and publication status before promoting them to the public feed.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((n) => n + 1)}>
          Refresh
        </button>
      </header>

      <section className="kv-review-toolbar" aria-label="Review filters">
        <label>
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({statusCounts[option.value] ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Source</span>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">All sources</option>
            {sourceOptions.map(([id, count]) => (
              <option key={id} value={id}>
                {sourceLabel(id)} ({count})
              </option>
            ))}
          </select>
        </label>
        <label className="kv-review-search">
          <span>Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, source, island, ID"
          />
        </label>
      </section>

      <section className="kv-review-stats" aria-label="Review summary">
        <div>
          <span>Showing</span>
          <strong>{visibleRows.length}</strong>
        </div>
        <div>
          <span>Selected status</span>
          <strong>{statusCounts[status] ?? rows.length}</strong>
        </div>
        <div>
          <span>Sources</span>
          <strong>{sourceOptions.length}</strong>
        </div>
        <div>
          <span>Top gaps</span>
          <strong>{missingTotals.slice(0, 3).map(([field, count]) => `${field} ${count}`).join(" · ") || "None"}</strong>
        </div>
      </section>

      {error ? (
        <div className="kv-review-empty">
          <strong>Review data unavailable</strong>
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="kv-review-empty">Loading review queue…</div>
      ) : visibleRows.length === 0 ? (
        <div className="kv-review-empty">No listings match the current filters.</div>
      ) : (
        <div className="kv-review-table-wrap">
          <table className="kv-review-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Source</th>
                <th>Status</th>
                <th>Price</th>
                <th>Facts</th>
                <th>Gaps</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const gaps = missingFields(row);
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="kv-review-listing">
                        {row.image_urls?.[0] ? <img src={row.image_urls[0]} alt="" /> : <div className="kv-review-noimg" />}
                        <div>
                          <strong>{row.title || row.id}</strong>
                          <span>{[row.city, row.island, row.property_type].filter(Boolean).join(" · ") || row.id}</span>
                          <code>{row.id}</code>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="kv-review-source">
                        <span>{sourceLabel(row.source_id)}</span>
                        <code>{row.source_id}</code>
                        {row.source_url && (
                          <a href={row.source_url} target="_blank" rel="noreferrer">
                            Open source
                          </a>
                        )}
                      </div>
                    </td>
                    <td><span className={`kv-review-status is-${row.publish_status}`}>{row.publish_status.replace("_", " ")}</span></td>
                    <td>{formatMoney(row.price, row.currency)}</td>
                    <td>
                      <div className="kv-review-facts">
                        <span>{row.bedrooms ?? "-"} bd</span>
                        <span>{row.bathrooms ?? "-"} ba</span>
                        <span>{row.area_sqm != null ? `${Math.round(row.area_sqm)} sqm` : "- sqm"}</span>
                        <span>{row.image_urls?.length ?? 0} img</span>
                      </div>
                    </td>
                    <td>
                      <div className="kv-review-gaps">
                        {gaps.length ? gaps.map((gap) => <span key={gap}>{gap}</span>) : <span className="is-clean">clear</span>}
                      </div>
                    </td>
                    <td>{formatDate(row.updated_at || row.last_verified_at || row.first_seen_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
