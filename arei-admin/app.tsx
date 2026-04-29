import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  getMarkets,
  getMarket,
  getDashboardStats,
  getLatestSyncLog,
  getListings,
  getListingById,
  getMarketIds,
  getContentDrafts,
  generateContentDrafts,
  updateContentDraftStatus,
  type ListingsFilters,
  type ListingsSortKey,
  type LatestSyncLog,
} from "./data";

const SYNC_STALE_MINUTES = 24 * 60 * 3; // 3 days
const SOURCE_STALE_DAYS = 30;

// The only market currently in production. Other markets present in the
// database (gh, ke, ng, zm, bw…) are test pipeline / legacy and must not
// dominate operational health signals.
const ACTIVE_MARKET_ID = "cv";
const ACTIVE_MARKET_LABEL = "Cape Verde";

function isActiveMarket(marketId: string): boolean {
  return marketId === ACTIVE_MARKET_ID;
}

/** Cap a list of names for display, returning "A, B, C +N more". */
function formatSourceList(names: string[], cap = 5): string {
  if (names.length <= cap) return names.join(", ");
  return `${names.slice(0, cap).join(", ")} +${names.length - cap} more`;
}

/** RFC-4180-ish CSV value escape: quote fields containing comma, quote, or
 *  newline; double up internal quotes. */
function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Trigger a client-side download of `text` as `filename`. */
function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatFreshness(ts: string | null | undefined): { label: string; days: number | null; stale: boolean; missing: boolean } {
  if (!ts) return { label: "No updates", days: null, stale: true, missing: true };
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return { label: "No updates", days: null, stale: true, missing: true };
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  const stale = days >= SOURCE_STALE_DAYS;
  let label: string;
  if (days <= 0) label = "Today";
  else if (days === 1) label = "1d ago";
  else if (days < SOURCE_STALE_DAYS) label = `${days}d ago`;
  else label = `Stale (${days}d)`;
  return { label, days, stale, missing: false };
}

// ============================================
// THEME TOGGLE — respects system preference, persists to localStorage
// ============================================

function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("arei-theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("arei-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, () => setDark((d) => !d)] as const;
}
import { Market, Source, Listing, SourceStatus, DashboardStats, SourceQualityRow, ContentDraft, ContentDraftStatus } from "./types";
import { supabaseAuth } from "./supabase";

// ============================================
// IMAGE GALLERY — arrows on hover, dot navigation
// ============================================

function ImageGallery({
  images,
  width,
  height,
  responsive = false,
}: {
  images: string[];
  width: number;
  height: number;
  responsive?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  const sizeStyle = responsive
    ? { width: "100%", height: "100%" }
    : { width, height };

  if (images.length === 0) {
    return (
      <div
        style={{
          ...sizeStyle,
          background: "var(--color-surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-foreground-subtle)",
          fontSize: 12,
          borderRadius: "8px 8px 0 0",
        }}
      >
        No image
      </div>
    );
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + images.length) % images.length);
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % images.length);
  };

  const showArrows = hovered && images.length > 1;

  const arrowBase: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 18,
    lineHeight: "32px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: showArrows ? 1 : 0,
    transition: "opacity 0.2s",
    zIndex: 2,
    padding: 0,
  };

  return (
    <div
      style={{
        position: "relative",
        ...sizeStyle,
        borderRadius: "8px 8px 0 0",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={images[idx]}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
        }}
      />

      {/* Left arrow */}
      {images.length > 1 && (
        <button onClick={prev} style={{ ...arrowBase, left: 6 }}>
          &#8249;
        </button>
      )}

      {/* Right arrow */}
      {images.length > 1 && (
        <button onClick={next} style={{ ...arrowBase, right: 6 }}>
          &#8250;
        </button>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 5,
            alignItems: "center",
            zIndex: 2,
          }}
        >
          {images.slice(0, 7).map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIdx(i);
              }}
              style={{
                width: i === idx ? 8 : 6,
                height: i === idx ? 8 : 6,
                borderRadius: "50%",
                border: "none",
                background: i === idx ? "#fff" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.15s",
              }}
            />
          ))}
          {images.length > 7 && (
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 10,
                lineHeight: "8px",
              }}
            >
              +{images.length - 7}
            </span>
          )}
        </div>
      )}

      {/* Image counter badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 11,
          padding: "2px 7px",
          borderRadius: 10,
          zIndex: 2,
        }}
      >
        {idx + 1}/{images.length}
      </div>
    </div>
  );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: SourceStatus }) {
  const classes: Record<string, string> = {
    OK: "bg-green-muted text-green",
    PARTIAL_OK: "bg-amber-muted text-amber",
    BROKEN_SOURCE: "bg-red-muted text-red",
    UNSCRAPABLE: "bg-red-muted text-red",
    PAUSED_BY_SYSTEM: "bg-amber-muted text-amber",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-md ${classes[status] ?? "bg-surface-3 text-foreground-muted"}`}>
      {status}
    </span>
  );
}

function RunPhaseBadge({ latestSync }: { latestSync: LatestSyncLog }) {
  const isFinal = latestSync.isFinal === true || latestSync.runPhase === "final_post_enrichment";
  const classes = isFinal
    ? "bg-green-muted text-green"
    : "bg-amber-muted text-amber";

  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-md ${classes}`}>
      {latestSync.phaseLabel}
    </span>
  );
}

// ============================================
// PRICE FORMATTER + CURRENCY CONVERSION
// ============================================

/** Approximate rate to 1 USD (e.g. 1 KES = 0.0077 USD). Used when no API. */
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  KES: 0.0077,
  GHS: 0.065,
  NGN: 0.00062,
  ZAR: 0.055,
  TZS: 0.00039,
  UGX: 0.00026,
  XOF: 0.0016,
  XAF: 0.0016,
};

function toUsd(amount: number, currency?: string): number {
  const c = (currency || "USD").toUpperCase();
  const rate = RATES_TO_USD[c] ?? RATES_TO_USD[c.slice(0, 3)];
  if (rate != null) return amount * rate;
  return amount; // assume USD if unknown
}

type DisplayCurrency = "original" | "USD" | "EUR";

function formatPrice(
  price?: number,
  currency?: string,
  displayCurrency?: DisplayCurrency
): string {
  if (price === undefined) return "No price";
  const c = currency || "EUR";
  if (displayCurrency === "USD" || displayCurrency === "EUR") {
    const usd = toUsd(price, c);
    const displayAmount = displayCurrency === "EUR" ? usd / (RATES_TO_USD.EUR ?? 1) : usd;
    const symbol = displayCurrency === "EUR" ? "€" : "$";
    return symbol + " " + Math.round(displayAmount).toLocaleString() + " " + displayCurrency;
  }
  const formatted = price.toLocaleString();
  if (c === "EUR") return formatted + " EUR";
  return c + " " + formatted;
}

// ============================================
// GRADE BADGE (A/B/C/D)
// ============================================

function GradeBadge({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const classes: Record<string, string> = {
    A: "bg-green-muted text-green",
    B: "bg-green-muted text-green",
    C: "bg-amber-muted text-amber",
    D: "bg-red-muted text-red",
  };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-6 text-xs font-semibold rounded-md ${classes[grade] ?? "bg-surface-3 text-foreground-muted"}`}>
      {grade}
    </span>
  );
}

function DraftStatusBadge({ status }: { status: ContentDraftStatus }) {
  const labels: Record<ContentDraftStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision",
  };
  const classes: Record<ContentDraftStatus, string> = {
    pending: "bg-amber-muted text-amber",
    approved: "bg-green-muted text-green",
    rejected: "bg-red-muted text-red",
    revision_requested: "bg-surface-3 text-foreground-muted",
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-[11px] font-medium rounded-md ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function AgentsApprovalsView() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ContentDraftStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "content_draft">("content_draft");

  useEffect(() => {
    let cancelled = false;
    getContentDrafts().then((items) => {
      if (!cancelled) {
        setDrafts(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const next = await generateContentDrafts();
      setDrafts(next);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (draftId: string, status: ContentDraftStatus) => {
    const note =
      status === "revision_requested"
        ? window.prompt("What should be revised before this draft can be approved?", "") ?? ""
        : "";
    const next = await updateContentDraftStatus(draftId, status, note);
    setDrafts(next);
  };

  const filteredDrafts = drafts.filter((draft) => {
    if (typeFilter !== "all" && typeFilter !== "content_draft") return false;
    if (statusFilter !== "all" && draft.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = drafts.filter((draft) => draft.status === "pending").length;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Content Drafts
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Review and approve AI-generated content before publishing. Nothing is published automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2.5 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-all disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate drafts"}
        </button>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="surface-1 rounded-xl p-5 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-3">Total drafts</div>
          <div className="text-3xl font-bold tabular-nums tracking-tight">{drafts.length}</div>
        </div>
        <div className="surface-1 rounded-xl p-5 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-3">Pending</div>
          <div className="text-3xl font-bold text-amber tabular-nums tracking-tight">{pendingCount}</div>
        </div>
        <div className="surface-1 rounded-xl p-5 border border-border shadow-sm">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-3">Publishing</div>
          <div className="text-sm font-medium text-foreground-muted mt-1">Manual only</div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Queue</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | "content_draft")}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded-lg"
          >
            <option value="content_draft">Content drafts</option>
            <option value="all">All items</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-foreground-subtle block mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContentDraftStatus | "all")}
            className="bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded-lg"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision_requested">Revision requested</option>
          </select>
        </div>
      </div>

      {/* ── Draft list ──────────────────────────────────────────── */}
      {loading && <p className="text-foreground-muted text-sm py-8">Loading drafts…</p>}

      {!loading && filteredDrafts.length === 0 && (
        <div className="surface-1 rounded-xl border border-border border-dashed p-14 text-center">
          <div className="w-12 h-12 rounded-full bg-accent-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-accent text-lg">◉</span>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">No drafts yet</h3>
          <p className="text-sm text-foreground-muted max-w-sm mx-auto leading-relaxed">
            Generate drafts to pull candidates from live listings. Each draft goes through review before anything is published.
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-5 px-5 py-2.5 text-sm font-medium rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate drafts"}
          </button>
        </div>
      )}

      <div className="surface-1 rounded-xl border border-border overflow-hidden divide-y divide-border">
        {filteredDrafts.map((draft) => {
          const isExpanded = expandedIds.has(draft.id);
          return (
            <article key={draft.id}>
              {/* ── Compact row ── */}
              <button
                type="button"
                onClick={() => toggleExpand(draft.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
              >
                {/* Thumbnail */}
                {draft.selectedImage ? (
                  <img
                    src={draft.selectedImage}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0 text-foreground-subtle text-xs">
                    —
                  </div>
                )}

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{draft.listingTitle}</div>
                  <div className="text-[11px] text-foreground-subtle mt-0.5">
                    <span className="capitalize">{draft.suggestedChannel}</span>
                    <span className="mx-1.5">·</span>
                    {new Date(draft.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Status badge */}
                <DraftStatusBadge status={draft.status} />

                {/* Chevron */}
                <span className={"text-foreground-subtle text-xs transition-transform duration-150 " + (isExpanded ? "rotate-180" : "")}>
                  ▼
                </span>
              </button>

              {/* ── Expanded details ── */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border bg-surface-2/50">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-foreground-subtle mb-1">Caption</div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap m-0">
                          {draft.suggestedCaption}
                        </p>
                      </div>
                      <div>
                        <div className="text-[11px] text-foreground-subtle mb-1">Hashtags</div>
                        <p className="text-sm text-foreground-muted m-0 font-mono">
                          {draft.suggestedHashtags.map((tag) => `#${tag}`).join(" ")}
                        </p>
                      </div>
                      {draft.statusNote && (
                        <div className="rounded-md p-3 bg-amber-muted">
                          <div className="text-[11px] text-amber mb-1">Revision note</div>
                          <p className="text-sm text-foreground whitespace-pre-wrap m-0">{draft.statusNote}</p>
                        </div>
                      )}
                    </div>

                    {/* Larger image preview */}
                    {draft.selectedImage && (
                      <div className="w-full lg:w-[240px] flex-shrink-0">
                        <img
                          src={draft.selectedImage}
                          alt={draft.listingTitle}
                          className="w-full rounded-lg object-cover max-h-[200px]"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(draft.id, "approved")}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-muted text-green hover:bg-green hover:text-primary-foreground transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(draft.id, "rejected")}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-muted text-red hover:bg-red hover:text-primary-foreground transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(draft.id, "revision_requested")}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors"
                    >
                      Request revision
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD VIEW — Data health + Sync + Source quality
// ============================================

/** Optional GitHub Actions URL for "Latest sync logs" link. Set in env or leave empty. */
const GITHUB_ACTIONS_URL = import.meta.env.VITE_GITHUB_ACTIONS_URL ?? "";

type SourceQualitySortKey = "sourceName" | "marketId" | "listing_count" | "approved_pct" | "with_image_pct" | "with_price_pct" | "grade";

function FlagGroup({ tone, title, message }: { tone: "bad" | "warn" | "muted"; title: string; message: string }) {
  const cls =
    tone === "bad"
      ? "bg-red-muted"
      : tone === "warn"
        ? "bg-amber-muted"
        : "bg-surface-2";
  const titleCls =
    tone === "bad" ? "text-red font-medium" : tone === "warn" ? "text-amber font-medium" : "text-foreground-subtle font-medium";
  return (
    <div className={`rounded-lg p-3 text-sm ${cls}`}>
      <div className={titleCls}>{title}</div>
      <div className="text-foreground-muted mt-0.5">{message}</div>
    </div>
  );
}

function SourceHealthStat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const toneClass =
    tone === "bad"
      ? "text-red"
      : tone === "warn"
        ? "text-amber"
        : tone === "good"
          ? "text-green"
          : "text-foreground";
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-1.5">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums font-mono ${toneClass}`}>{value}</div>
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [latestSync, setLatestSync] = useState<LatestSyncLog | null>(null);
  const [exportingRunReport, setExportingRunReport] = useState(false);
  const [sortKey, setSortKey] = useState<SourceQualitySortKey>("listing_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    getDashboardStats().then((s) => {
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLatestSyncLog().then((log) => {
      if (!cancelled && log) setLatestSync(log);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-foreground-muted text-sm">
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-sm">
        <p className="text-foreground mb-1">Failed to load dashboard</p>
        <p className="text-foreground-muted">Ensure Supabase RPC <code className="font-mono text-foreground-muted">get_source_quality_stats</code> exists.</p>
      </div>
    );
  }

  const approvedPct = stats.totalListings > 0 ? Math.round((100 * stats.approvedCount) / stats.totalListings) : 0;

  // ── Source Health (active market only) ─────────────────────────────────────
  // Only Cape Verde is in production. Counting non-active markets here would
  // swamp the operator with test-pipeline noise.
  const healthRows = stats.sourceRows.filter((r) => isActiveMarket(r.marketId));
  const totalSources = healthRows.length;
  const freshSources = healthRows.filter((r) => {
    const f = formatFreshness(r.last_updated_at);
    return !f.missing && !f.stale;
  }).length;
  const staleSourcesCount = healthRows.filter((r) => formatFreshness(r.last_updated_at).stale && !formatFreshness(r.last_updated_at).missing).length;
  const missingSqmSources = healthRows.filter((r) => Number(r.listing_count) > 0 && Number(r.with_sqm_count ?? 0) === 0).length;
  const approvedNoFeedSources = healthRows.filter((r) => Number(r.approved_count) > 0 && r.public_feed_count_n === 0).length;
  const approvedNoTrustSources = healthRows.filter((r) => Number(r.approved_count) > 0 && r.trust_passed_count_n === 0).length;
  const approvedNoIndexableSources = healthRows.filter((r) => Number(r.approved_count) > 0 && r.indexable_count_n === 0).length;
  const lowFeedConvSources = healthRows.filter((r) => Number(r.approved_count) >= 20 && r.public_feed_count_n > 0 && r.feed_conversion_pct < 25).length;

  // CV-only worst/best for the top "Needs attention" / "Performing well" cards.
  // Non-CV sources stay visible in the Sources tab and the all-markets table
  // below, but must not appear in the operator's first-screen attention cards.
  const cvWorst = healthRows.filter((r) => r.grade === "D" || r.grade === "C").slice(0, 5);
  const cvBest = healthRows.filter((r) => r.grade === "A" || r.grade === "B").slice(0, 5);

  // Active-market status pill — bound to operational issues, not the legacy
  // approved% composite. "Good" only if no critical CV issue exists.
  const cvHasCriticalIssue =
    approvedNoFeedSources > 0 ||
    approvedNoTrustSources > 0 ||
    approvedNoIndexableSources > 0 ||
    staleSourcesCount > 0;
  const cvStatusLabel = cvHasCriticalIssue ? "Needs attention" : "Good";

  // Top 3 issues to highlight, in priority order
  type HealthIssue = { label: string; count: number; tone: "bad" | "warn" };
  const allIssues: HealthIssue[] = [
    { label: "approved → 0 public feed", count: approvedNoFeedSources, tone: "bad" },
    { label: "approved → 0 trust pass", count: approvedNoTrustSources, tone: "bad" },
    { label: "stale (>30d)", count: staleSourcesCount, tone: "warn" },
    { label: "0% sqm coverage", count: missingSqmSources, tone: "warn" },
    { label: "low feed conversion (<25%)", count: lowFeedConvSources, tone: "warn" },
  ];
  const topIssues = allIssues.filter((i) => i.count > 0).slice(0, 3);

  const gradeOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
  const sortedSourceRows = [...stats.sourceRows].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1;
    if (sortKey === "sourceName" || sortKey === "marketId") {
      const va = String(a[sortKey] ?? "");
      const vb = String(b[sortKey] ?? "");
      return mult * va.localeCompare(vb);
    }
    if (sortKey === "grade") {
      return mult * (gradeOrder[a.grade] - gradeOrder[b.grade]);
    }
    const va = Number(a[sortKey]);
    const vb = Number(b[sortKey]);
    return mult * (va - vb);
  });

  const handleSort = (key: SourceQualitySortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "sourceName" || key === "marketId" ? "asc" : "desc");
    }
  };

  const handleExportRunReport = async () => {
    setExportingRunReport(true);
    try {
      const res = await fetch("/cv_ingest_report.json");
      if (!res.ok) throw new Error("Report not found");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv_ingest_report_${latestSync?.at ? new Date(latestSync.at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.warn("[Dashboard] Could not export run report");
    } finally {
      setExportingRunReport(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Data quality overview and source health
        </p>
      </div>

      {/* ── Cape Verde health pill ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs text-foreground-muted">{ACTIVE_MARKET_LABEL} health:</span>
        <span
          className={
            "text-xs font-medium px-2.5 py-1 rounded-md " +
            (cvHasCriticalIssue ? "bg-amber-muted text-amber" : "bg-green-muted text-green")
          }
        >
          {cvStatusLabel}
        </span>
        <span className="text-xs text-foreground-subtle">
          other markets are test pipeline · see Sources tab
        </span>
      </div>

      {/* ── Cape Verde source health (PRIMARY) ──────────────────── */}
      <section className="surface-1 rounded-xl border border-border p-5">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h2 className="text-base font-semibold text-foreground">{ACTIVE_MARKET_LABEL} source health</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <SourceHealthStat label={`${ACTIVE_MARKET_LABEL} sources`} value={totalSources} />
          <SourceHealthStat label="Fresh (≤30d)" value={freshSources} tone={totalSources > 0 && freshSources === totalSources ? "good" : undefined} />
          <SourceHealthStat label="Stale (>30d)" value={staleSourcesCount} tone={staleSourcesCount > 0 ? "warn" : "good"} />
          <SourceHealthStat label="Missing sqm" value={missingSqmSources} tone={missingSqmSources > 0 ? "warn" : "good"} />
          <SourceHealthStat label="Approved · 0 feed" value={approvedNoFeedSources} tone={approvedNoFeedSources > 0 ? "bad" : "good"} />
          <SourceHealthStat label="Low feed conv" value={lowFeedConvSources} tone={lowFeedConvSources > 0 ? "warn" : "good"} />
        </div>
        {topIssues.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Top issues to address</div>
            <ol className="space-y-1 text-sm">
              {topIssues.map((iss, i) => (
                <li key={iss.label} className="flex gap-2 items-baseline">
                  <span className="text-foreground-subtle tabular-nums">{i + 1}.</span>
                  <span className={iss.tone === "bad" ? "text-red font-medium" : "text-amber font-medium"}>
                    {iss.count}
                  </span>
                  <span className="text-foreground-muted">{iss.label}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {(cvWorst.length > 0 || cvBest.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cvWorst.length > 0 && (
            <div className="rounded-lg p-4 border border-border bg-amber-muted">
              <div className="text-xs font-medium text-amber mb-2">Needs attention · {ACTIVE_MARKET_LABEL}</div>
              <p className="text-sm text-foreground">
                {cvWorst.map((r) => r.sourceName).join(", ")}
              </p>
            </div>
          )}
          {cvBest.length > 0 && (
            <div className="rounded-lg p-4 border border-border bg-green-muted">
              <div className="text-xs font-medium text-green mb-2">Performing well · {ACTIVE_MARKET_LABEL}</div>
              <p className="text-sm text-foreground">
                {cvBest.map((r) => r.sourceName).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Latest sync ─────────────────────────────────────────── */}
      {(() => {
        // Fallback to source-row timestamps when the ingest report file is
        // not served. Active-market rows are preferred so the operator sees
        // Cape Verde freshness even when other markets have older runs.
        const tsValues = (rows: SourceQualityRow[]): number[] =>
          rows
            .map((r) => (r.last_updated_at ? new Date(r.last_updated_at).getTime() : NaN))
            .filter((t) => Number.isFinite(t));
        const activeTs = tsValues(stats.sourceRows.filter((r) => isActiveMarket(r.marketId)));
        const allTs = tsValues(stats.sourceRows);
        const fallbackMs = activeTs.length > 0 ? Math.max(...activeTs) : allTs.length > 0 ? Math.max(...allTs) : null;
        const fallbackSourceLabel = activeTs.length > 0 ? ACTIVE_MARKET_LABEL : "all sources";
        const fallbackIso = fallbackMs != null ? new Date(fallbackMs).toISOString() : null;
        const fallbackFresh = fallbackIso ? formatFreshness(fallbackIso) : null;
        const hasAnySync = !!latestSync?.at || fallbackMs != null;
        return (
      <section className="surface-1 rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Latest sync</h2>
          {latestSync && <RunPhaseBadge latestSync={latestSync} />}
        </div>
        <div className="text-sm text-foreground-muted mb-3">
          {latestSync?.at ? (
            <>
              {new Date(latestSync.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              <span className="text-foreground-subtle ml-2">
                {latestSync.marketName}: {latestSync.totalListings} total, {latestSync.visibleCount} visible
              </span>
            </>
          ) : fallbackMs != null ? (
            <>
              <span className="text-foreground">{fallbackFresh!.label}</span>
              <span className="text-foreground-subtle ml-2">
                {new Date(fallbackMs).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </>
          ) : (
            "No sync data"
          )}
        </div>
        {!latestSync?.at && fallbackMs != null && (
          <p className="text-xs text-foreground-subtle mb-3">
            Based on latest {fallbackSourceLabel} source update.
          </p>
        )}
        {!hasAnySync && (
          <p className="text-xs text-foreground-subtle mb-3">
            Serve <code className="font-mono text-foreground-muted">cv_ingest_report.json</code> to see sync timestamps.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportRunReport}
            disabled={exportingRunReport || !latestSync}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-40"
          >
            {exportingRunReport ? "Exporting…" : "Export report"}
          </button>
          {GITHUB_ACTIONS_URL && (
            <a
              href={GITHUB_ACTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors no-underline"
            >
              GitHub Actions
            </a>
          )}
        </div>
      </section>
        );
      })()}

      {/* ── All markets · including test pipeline ───────────────── */}
      <section>
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h2 className="text-base font-semibold text-foreground">All markets</h2>
          <span className="text-xs text-foreground-subtle">including test pipeline</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="surface-1 rounded-xl p-4 border border-border shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Total listings</div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">{stats.totalListings.toLocaleString()}</div>
          </div>
          <div className="surface-1 rounded-xl p-4 border border-border shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Approved</div>
            <div className="text-2xl font-bold text-green tabular-nums tracking-tight">{stats.approvedCount.toLocaleString()}</div>
            <div className="text-xs text-foreground-subtle mt-1 tabular-nums">{approvedPct}% rate</div>
          </div>
          <div className="surface-1 rounded-xl p-4 border border-border shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Sources</div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">{stats.sourceCount}</div>
          </div>
          <div className="surface-1 rounded-xl p-4 border border-border shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle mb-2">Markets</div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">{stats.marketCount}</div>
          </div>
        </div>
        <h2 className="text-base font-semibold text-foreground mb-4">Source quality · all markets</h2>
        <div className="surface-1 rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] data-table data-table-id-narrow">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {(
                    [
                      { key: "sourceName" as const, label: "Source" },
                      { key: "marketId" as const, label: "Market" },
                      { key: "listing_count" as const, label: "Count" },
                      { key: "approved_pct" as const, label: "Approved %" },
                      { key: "with_image_pct" as const, label: "Image %" },
                      { key: "with_price_pct" as const, label: "Price %" },
                      { key: "grade" as const, label: "Health" },
                    ] as const
                  ).map(({ key, label }) => (
                    <th key={key} className="text-left py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="text-[11px] uppercase tracking-wider text-foreground-subtle font-medium w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {label}
                        <span className={sortKey === key ? "text-foreground" : "invisible"} aria-hidden>
                          {sortKey === key && sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedSourceRows.map((r: SourceQualityRow) => (
                  <tr key={r.source_id} className="border-b border-border last:border-0 hover:bg-surface-3/50 transition-colors">
                    <td className="py-2.5 px-3 text-sm font-medium text-foreground">{r.sourceName}</td>
                    <td className="py-2.5 px-3 text-sm text-foreground-muted">{r.marketId}</td>
                    <td className="py-2.5 px-3 text-sm text-foreground-muted tabular-nums font-mono">
                      {Number(r.listing_count).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-sm text-foreground-muted tabular-nums font-mono">{r.approved_pct}%</td>
                    <td className="py-2.5 px-3 text-sm text-foreground-muted tabular-nums font-mono">{r.with_image_pct}%</td>
                    <td className="py-2.5 px-3 text-sm text-foreground-muted tabular-nums font-mono">{r.with_price_pct}%</td>
                    <td className="py-2.5 px-3">
                      <GradeBadge grade={r.grade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {stats.sourceRows.length === 0 && (
          <div className="surface-1 rounded-xl border border-border border-dashed p-12 text-center mt-4">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
              <span className="text-foreground-subtle text-sm">⬡</span>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No source data available</p>
            <p className="text-xs text-foreground-muted">
              Run the SQL in <code className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded">docs/supabase_rpc.sql</code> in Supabase.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================
// LISTING CARD
// ============================================

function ListingCard({
  listing,
  onClick,
}: {
  listing: Listing;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="surface-1 rounded-xl overflow-hidden w-[280px] border border-border cursor-pointer transition-all hover:border-border-strong hover:translate-y-[-1px]"
    >
      <ImageGallery images={listing.images} width={280} height={190} />

      <div className="p-3.5">
        {listing.property_type && (
          <span className="inline-block bg-accent-muted text-accent text-[10px] font-medium px-2 py-0.5 rounded">
            {listing.property_type}
          </span>
        )}

        <div className="text-sm font-medium text-foreground mt-1.5 truncate leading-tight">
          {listing.title || "[No title]"}
        </div>

        {listing.location && (
          <div className="text-foreground-muted text-xs mt-0.5">{listing.location}</div>
        )}

        <div className="text-accent text-lg font-semibold mt-2 font-mono tabular-nums">
          {formatPrice(listing.price, listing.currency)}
        </div>

        <div className="flex gap-3 mt-2 text-foreground-muted text-xs">
          {listing.bedrooms != null && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms != null && <span>{listing.bathrooms} bath</span>}
          {listing.area_sqm != null && (
            <span>{Math.round(listing.area_sqm)} m&sup2;</span>
          )}
          {!listing.bedrooms && !listing.bathrooms && !listing.area_sqm && (
            <span className="text-foreground-subtle">No specs</span>
          )}
        </div>

        <div className="text-foreground-subtle text-[11px] mt-2 pt-2 border-t border-border">
          {listing.sourceName}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LISTINGS TAB (server-side pagination + table + detail)
// ============================================

const LISTINGS_PAGE_SIZE = 50;
const EXPORT_ALL_MAX = 5000;

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function listingsToCsv(listings: Listing[]): string {
  const headers = [
    "id",
    "title",
    "price",
    "currency",
    "island",
    "city",
    "bedrooms",
    "bathrooms",
    "area_sqm",
    "source",
    "source_id",
    "approved",
    "source_url",
    "image_url",
  ];
  const rows = listings.map((l) =>
    [
      l.id,
      l.title ?? "",
      l.price ?? "",
      l.currency ?? "",
      l.island ?? "",
      l.city ?? "",
      l.bedrooms ?? "",
      l.bathrooms ?? "",
      l.area_sqm != null ? Math.round(l.area_sqm) : "",
      l.sourceName ?? "",
      l.sourceId ?? "",
      l.approved != null ? (l.approved ? "yes" : "no") : "",
      l.sourceUrl ?? "",
      l.images?.[0] ?? "",
    ].map(escapeCsvCell).join(",")
  );
  return [headers.join(","), ...rows].join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const LISTINGS_COLUMNS: { key: ListingsSortKey | "photo" | "grade" | "action"; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "title", label: "Title" },
  { key: "price", label: "Price" },
  { key: "island", label: "Island" },
  { key: "city", label: "City" },
  { key: "bedrooms", label: "Beds" },
  { key: "bathrooms", label: "Baths" },
  { key: "property_size_sqm", label: "Area" },
  { key: "source_id", label: "Source" },
  { key: "grade", label: "Health" },
  { key: "action", label: "" },
];

function ListingsTabView() {
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [marketId, setMarketId] = useState("all");
  const [sourceOptions, setSourceOptions] = useState<{ id: string; name: string }[]>([]);
  const [gradeBySourceId, setGradeBySourceId] = useState<Map<string, "A" | "B" | "C" | "D">>(new Map());
  const [filters, setFilters] = useState<ListingsFilters>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ListingsSortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [result, setResult] = useState<{ data: Listing[]; totalCount: number }>({ data: [], totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("original");

  useEffect(() => {
    getMarketIds().then(setMarkets);
  }, []);

  useEffect(() => {
    getDashboardStats().then((s) => {
      const opts =
        marketId && marketId !== "all"
          ? s.sourceRows.filter((r) => r.marketId === marketId).map((r) => ({ id: r.source_id, name: r.sourceName }))
          : s.sourceRows.map((r) => ({ id: r.source_id, name: r.sourceName }));
      setSourceOptions(opts);
      setGradeBySourceId(new Map(s.sourceRows.map((r) => [r.source_id, r.grade])));
    });
  }, [marketId]);

  useEffect(() => {
    setLoading(true);
    getListings(marketId, page, LISTINGS_PAGE_SIZE, filters, sortBy, sortDir)
      .then((r) => {
        setResult(r);
        setLoading(false);
      })
      .catch(() => {
        setResult({ data: [], totalCount: 0 });
        setLoading(false);
      });
  }, [marketId, page, filters, sortBy, sortDir]);

  const handleSort = (key: ListingsSortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleExportPage = () => {
    setExportOpen(false);
    const csv = listingsToCsv(result.data);
    downloadCsv(csv, `listings-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAll = async () => {
    setExportOpen(false);
    setExporting(true);
    try {
      const { data } = await getListings(
        marketId,
        1,
        EXPORT_ALL_MAX,
        filters,
        sortBy,
        sortDir
      );
      const csv = listingsToCsv(data);
      downloadCsv(
        csv,
        `listings-export-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(result.totalCount / LISTINGS_PAGE_SIZE));

  if (detailListing) {
    return (
      <div>
        <ListingDetail
          listing={detailListing}
          onBack={() => setDetailListing(null)}
          displayCurrency={displayCurrency}
        />
      </div>
    );
  }

  const inputCls = "bg-surface-1 border border-border text-foreground px-3 py-1.5 text-sm rounded-lg w-full";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Listings
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            Browse and filter across all markets
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors"
          >
            Clear filters
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-40"
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] surface-1 border border-border rounded-xl py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportPage}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 transition-colors rounded-lg"
                  >
                    This page (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 transition-colors rounded-lg"
                  >
                    All matching, max {EXPORT_ALL_MAX.toLocaleString()} (CSV)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="surface-1 rounded-xl border border-border p-4 mb-6">
        <div className="text-[11px] text-foreground-subtle uppercase tracking-wider mb-3">Filters</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Market</label>
            <select
              value={marketId}
              onChange={(e) => {
                setMarketId(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="all">All markets</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Source</label>
            <select
              value={filters.sourceId ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, sourceId: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All sources</option>
              {sourceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Display prices in</label>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as DisplayCurrency)}
              className={inputCls}
            >
              <option value="original">Original currency</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Approved</label>
            <select
              value={filters.approved === undefined ? "" : filters.approved ? "yes" : "no"}
              onChange={(e) => {
                const v = e.target.value;
                setFilters((f) => ({ ...f, approved: v === "" ? undefined : v === "yes" }));
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            {filters.approved === false && (
              <p className="text-[11px] text-amber mt-1 leading-snug">
                Unapproved listings are currently hidden by admin permissions, so this filter may return 0 results.
              </p>
            )}
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Updated from</label>
            <input
              type="date"
              value={filters.importedAfter ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, importedAfter: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Updated to</label>
            <input
              type="date"
              value={filters.importedBefore ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, importedBefore: e.target.value || undefined }));
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-1">
            <label className="text-[11px] text-foreground-subtle block mb-1">Title search</label>
            <input
              type="text"
              value={filters.titleSearch ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, titleSearch: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="Search title"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Price min</label>
            <input
              type="number"
              value={filters.priceMin ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Price max</label>
            <input
              type="number"
              value={filters.priceMax ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Island</label>
            <input
              type="text"
              value={filters.island ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, island: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="e.g. Sal"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">City</label>
            <input
              type="text"
              value={filters.city ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, city: e.target.value || undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Beds min</label>
            <input
              type="number"
              min={0}
              value={filters.bedrooms ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, bedrooms: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Baths min</label>
            <input
              type="number"
              min={0}
              value={filters.bathrooms ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, bathrooms: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Area min (m²)</label>
            <input
              type="number"
              min={0}
              value={filters.areaMin ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, areaMin: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[11px] text-foreground-subtle block mb-1">Area max (m²)</label>
            <input
              type="number"
              min={0}
              value={filters.areaMax ?? ""}
              onChange={(e) => {
                setFilters((f) => ({ ...f, areaMax: e.target.value ? Number(e.target.value) : undefined }));
                setPage(1);
              }}
              placeholder="—"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-foreground-muted text-sm py-8">Loading listings…</p>}

      {!loading && (
        <>
          <div className="surface-1 rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] data-table">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    {LISTINGS_COLUMNS.map(({ key, label }) =>
                      key === "photo" || key === "grade" || key === "action" ? (
                        <th key={key} className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">
                          {label}
                        </th>
                      ) : (
                        <th key={key} className="text-left py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleSort(key)}
                            className="text-[11px] uppercase tracking-wider text-foreground-subtle font-medium w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            {label}
                            <span className={sortBy === key ? "text-foreground" : "invisible"} aria-hidden>
                              {sortBy === key && sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          </button>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border last:border-0 cursor-pointer hover:bg-surface-3/50 transition-colors"
                      onClick={() => {
                        setDetailLoading(true);
                        getListingById(l.id).then((full) => {
                          setDetailLoading(false);
                          if (full) setDetailListing(full);
                        });
                      }}
                    >
                      <td className="py-2 px-3 w-14">
                        {l.images.length > 0 ? (
                          <img
                            src={l.images[0]}
                            alt=""
                            className="w-12 h-9 object-cover rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-foreground-subtle text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm text-foreground max-w-[220px] truncate">
                        {l.title || "[No title]"}
                      </td>
                      <td className="py-2 px-3 text-sm text-foreground font-medium font-mono tabular-nums">
                        {formatPrice(l.price, l.currency, displayCurrency)}
                      </td>
                      <td className="py-2 px-3 text-sm text-foreground-muted">{l.island ?? "—"}</td>
                      <td className="py-2 px-3 text-sm text-foreground-muted">{l.city ?? "—"}</td>
                      <td className="py-2 px-3 text-sm text-foreground-muted tabular-nums">{l.bedrooms ?? "—"}</td>
                      <td className="py-2 px-3 text-sm text-foreground-muted tabular-nums">{l.bathrooms ?? "—"}</td>
                      <td className="py-2 px-3 text-sm text-foreground-muted font-mono tabular-nums">
                        {l.area_sqm != null ? Math.round(l.area_sqm) + " m²" : "—"}
                      </td>
                      <td className="py-2 px-3 text-xs text-foreground-muted">{l.sourceName}</td>
                      <td className="py-2 px-3">
                        {gradeBySourceId.get(l.sourceId) ? (
                          <GradeBadge grade={gradeBySourceId.get(l.sourceId)!} />
                        ) : (
                          <span className="text-foreground-subtle text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setDetailLoading(true);
                            getListingById(l.id).then((full) => {
                              setDetailLoading(false);
                              if (full) setDetailListing(full);
                            });
                          }}
                          className="px-2 py-1 text-xs font-medium rounded border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-foreground-muted text-xs tabular-nums">
              Page {page} of {totalPages} · {result.totalCount.toLocaleString()} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="surface-1 rounded-xl p-6 border border-border text-sm text-foreground-muted">
            Loading listing…
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SOURCES — All sources per country / market
// ============================================

function SourceSortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SourcesSortKey;
  currentKey: SourcesSortKey;
  currentDir: SortDir;
  onSort: (k: SourcesSortKey) => void;
  align?: "left" | "right";
}) {
  const active = currentKey === sortKey;
  return (
    <th className={`py-2.5 px-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`text-[11px] uppercase tracking-wider text-foreground-subtle font-medium w-full flex items-center gap-1 hover:text-foreground transition-colors ${align === "right" ? "justify-end" : ""}`}
      >
        {label}
        <span className={active ? "text-foreground" : "invisible"} aria-hidden>
          {active && currentDir === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}

type SourcesSortKey =
  | "listing_count"
  | "public_feed_count_n"
  | "approved_count"
  | "indexable_count_n"
  | "trust_passed_count_n"
  | "with_sqm_pct"
  | "with_beds_pct"
  | "with_baths_pct"
  | "last_updated_at"
  | "grade";

type SortDir = "asc" | "desc";

const GRADE_RANK: Record<"A" | "B" | "C" | "D", number> = { A: 1, B: 2, C: 3, D: 4 };

/** Extract a sortable scalar for a row + key. Null/undefined for missing. */
function sourceSortValue(r: SourceQualityRow, key: SourcesSortKey): number | null {
  switch (key) {
    case "last_updated_at":
      if (!r.last_updated_at) return null;
      const t = new Date(r.last_updated_at).getTime();
      return Number.isFinite(t) ? t : null;
    case "grade":
      return r.grade ? GRADE_RANK[r.grade] : null;
    default: {
      const v = (r as unknown as Record<SourcesSortKey, unknown>)[key];
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    }
  }
}

/** Compare two values; missing always last regardless of direction. */
function compareSortValues(a: number | null, b: number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function SourcesView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SourcesSortKey>("listing_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = (key: SourcesSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numeric/date columns default to desc on first click; grade defaults
      // to asc so A appears first.
      setSortDir(key === "grade" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDashboardStats(), getMarketIds()]).then(([s, m]) => {
      if (!cancelled) {
        setStats(s);
        setMarkets(m);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-12 text-foreground-muted text-sm">
        Loading sources…
      </div>
    );
  }

  const marketNameById = new Map(markets.map((m) => [m.id, m.name]));
  const byMarket = new Map<string, SourceQualityRow[]>();
  for (const r of stats.sourceRows) {
    const m = r.marketId;
    if (!byMarket.has(m)) byMarket.set(m, []);
    byMarket.get(m)!.push(r);
  }
  // Put the active market first; remaining markets sorted by name. Test
  // pipeline markets stay visible but visually subordinate.
  const marketIds = [...byMarket.keys()].sort((a, b) => {
    if (isActiveMarket(a) && !isActiveMarket(b)) return -1;
    if (!isActiveMarket(a) && isActiveMarket(b)) return 1;
    const nameA = marketNameById.get(a) ?? a;
    const nameB = marketNameById.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  const handleExportCsv = () => {
    const header = [
      "market_id",
      "market_name",
      "source_id",
      "source_name",
      "listing_count",
      "public_feed_count",
      "approved_count",
      "indexable_count",
      "trust_passed_count",
      "sqm_pct",
      "beds_pct",
      "baths_pct",
      "freshness_label",
      "last_updated_at",
      "grade",
    ];
    const lines: string[] = [header.join(",")];
    // Iterate market groups in display order (CV first, then test pipeline)
    // and apply the active sort within each group so the CSV matches what
    // the operator sees on screen.
    for (const marketId of marketIds) {
      const groupRows = [...byMarket.get(marketId)!].sort((a, b) =>
        compareSortValues(sourceSortValue(a, sortKey), sourceSortValue(b, sortKey), sortDir)
      );
      const marketName = marketNameById.get(marketId) ?? marketId;
      for (const r of groupRows) {
        const fresh = formatFreshness(r.last_updated_at);
        lines.push(
          [
            csvEscape(marketId),
            csvEscape(marketName),
            csvEscape(r.source_id),
            csvEscape(r.sourceName),
            csvEscape(Number(r.listing_count)),
            csvEscape(r.public_feed_count_n),
            csvEscape(Number(r.approved_count)),
            csvEscape(r.indexable_count_n),
            csvEscape(r.trust_passed_count_n),
            csvEscape(r.with_sqm_pct),
            csvEscape(r.with_beds_pct),
            csvEscape(r.with_baths_pct),
            csvEscape(fresh.label),
            csvEscape(r.last_updated_at ?? ""),
            csvEscape(r.grade),
          ].join(",")
        );
      }
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`arei-source-health-${date}.csv`, lines.join("\r\n") + "\r\n");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Sources
          </h1>
          <p className="text-sm text-foreground-muted mt-1">
            All sources grouped by market
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={stats.sourceRows.length === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {marketIds.map((marketId) => {
        const rows = byMarket.get(marketId)!;
        const marketName = marketNameById.get(marketId) ?? marketId;
        const totalListings = rows.reduce((acc, r) => acc + Number(r.listing_count), 0);
        const isActive = isActiveMarket(marketId);
        return (
          <section key={marketId} className={`surface-1 rounded-xl border border-border overflow-hidden shadow-sm ${isActive ? "" : "opacity-80"}`}>
            <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {marketName}
                </h3>
                {isActive ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-muted text-green font-medium">active</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-3 text-foreground-subtle font-medium">test pipeline</span>
                )}
              </div>
              <span className="text-xs text-foreground-muted tabular-nums">
                {rows.length} source{rows.length !== 1 ? "s" : ""} · {totalListings.toLocaleString()} listings
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] data-table data-table-id-narrow">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Source</th>
                    <SourceSortHeader label="Listings" sortKey="listing_count" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Public feed" sortKey="public_feed_count_n" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Approved" sortKey="approved_count" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Indexable" sortKey="indexable_count_n" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Trust passed" sortKey="trust_passed_count_n" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Sqm %" sortKey="with_sqm_pct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Beds %" sortKey="with_beds_pct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Baths %" sortKey="with_baths_pct" currentKey={sortKey} currentDir={sortDir} onSort={onSort} align="right" />
                    <SourceSortHeader label="Freshness" sortKey="last_updated_at" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                    <SourceSortHeader label="Health" sortKey="grade" currentKey={sortKey} currentDir={sortDir} onSort={onSort} />
                  </tr>
                </thead>
                <tbody>
                  {[...rows]
                    .sort((a, b) => compareSortValues(sourceSortValue(a, sortKey), sourceSortValue(b, sortKey), sortDir))
                    .map((r) => {
                      const fresh = formatFreshness(r.last_updated_at);
                      const freshClass = fresh.missing
                        ? "text-foreground-subtle"
                        : fresh.stale
                          ? "text-red"
                          : fresh.days != null && fresh.days >= 14
                            ? "text-amber"
                            : "text-foreground-muted";
                      const approvedN = Number(r.approved_count);
                      const trustClass = approvedN > 0 && r.trust_passed_count_n === 0 ? "text-red" : "text-foreground-muted";
                      const indexableClass = approvedN > 0 && r.indexable_count_n === 0 ? "text-red" : "text-foreground-muted";
                      const sqmClass = Number(r.listing_count) >= 10 && Number(r.with_sqm_count ?? 0) === 0 ? "text-red" : "text-foreground-muted";
                      return (
                      <tr key={r.source_id} className="border-b border-border last:border-0 hover:bg-surface-3/50 transition-colors">
                        <td className="py-2.5 px-3 text-sm font-medium text-foreground">{r.sourceName}</td>
                        <td className="py-2.5 px-3 text-right text-sm text-foreground-muted tabular-nums font-mono">
                          {Number(r.listing_count).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm text-foreground-muted tabular-nums font-mono">{r.public_feed_count_n.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-sm text-foreground-muted tabular-nums font-mono">{approvedN.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-right text-sm tabular-nums font-mono ${indexableClass}`}>{r.indexable_count_n.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-right text-sm tabular-nums font-mono ${trustClass}`}>{r.trust_passed_count_n.toLocaleString()}</td>
                        <td className={`py-2.5 px-3 text-right text-sm tabular-nums font-mono ${sqmClass}`}>{r.with_sqm_pct}%</td>
                        <td className="py-2.5 px-3 text-right text-sm text-foreground-muted tabular-nums font-mono">{r.with_beds_pct}%</td>
                        <td className="py-2.5 px-3 text-right text-sm text-foreground-muted tabular-nums font-mono">{r.with_baths_pct}%</td>
                        <td
                          className={`py-2.5 px-3 text-sm tabular-nums font-mono whitespace-nowrap ${freshClass}`}
                          title={r.last_updated_at ?? "No timestamp from RPC"}
                        >
                          {fresh.label}
                        </td>
                        <td className="py-2.5 px-3">
                          <GradeBadge grade={r.grade} />
                        </td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {marketIds.length === 0 && (
        <div className="surface-1 rounded-xl border border-border border-dashed p-14 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <span className="text-foreground-subtle text-lg">⬡</span>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">No source data</h3>
          <p className="text-sm text-foreground-muted max-w-sm mx-auto leading-relaxed">
            Run <code className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded text-foreground-muted">get_source_quality_stats</code> RPC in Supabase to populate this view.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// STATS — Developer-focused metrics & red flags
// ============================================

function StatsView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [latestSync, setLatestSync] = useState<LatestSyncLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDashboardStats(), getLatestSyncLog()]).then(([s, log]) => {
      if (!cancelled) {
        setStats(s);
        setLatestSync(log ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="py-12 text-foreground-muted text-sm">
        Loading stats…
      </div>
    );
  }

  const rows = stats.sourceRows;
  const approvedPct = stats.totalListings > 0 ? (100 * stats.approvedCount) / stats.totalListings : 0;
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  rows.forEach((r) => {
    gradeCounts[r.grade]++;
  });

  const syncAt = latestSync?.at ? new Date(latestSync.at).getTime() : null;
  const syncAgeMinutes = syncAt ? (Date.now() - syncAt) / (60 * 1000) : null;
  const syncStale = syncAgeMinutes != null && syncAgeMinutes > SYNC_STALE_MINUTES;
  const syncMissing = !latestSync?.at;

  const noImages = rows.filter((r) => r.with_image_pct < 10);
  const noPrice = rows.filter((r) => r.with_price_pct < 10);
  const gradeD = rows.filter((r) => r.grade === "D");
  const gradeC = rows.filter((r) => r.grade === "C");

  // Operational red flags are scoped to the active market only. Issues from
  // test-pipeline markets would otherwise drown out the real signal.
  const activeRows = rows.filter((r) => isActiveMarket(r.marketId));
  const inactiveRows = rows.filter((r) => !isActiveMarket(r.marketId));
  const cvStale = activeRows.filter((r) => formatFreshness(r.last_updated_at).stale && !formatFreshness(r.last_updated_at).missing);
  const cvMissingFreshness = activeRows.filter((r) => formatFreshness(r.last_updated_at).missing);
  const cvApprovedNoFeed = activeRows.filter((r) => Number(r.approved_count) > 0 && r.public_feed_count_n === 0);
  const cvApprovedNoTrust = activeRows.filter((r) => Number(r.approved_count) > 0 && r.trust_passed_count_n === 0);
  const cvApprovedNoIndexable = activeRows.filter((r) => Number(r.approved_count) > 0 && r.indexable_count_n === 0);
  const cvListingsNoApproved = activeRows.filter((r) => Number(r.listing_count) >= 10 && Number(r.approved_count) === 0);
  const cvListingsNoSqm = activeRows.filter((r) => Number(r.listing_count) >= 10 && Number(r.with_sqm_count ?? 0) === 0);
  const cvLowFeedConv = activeRows.filter((r) => Number(r.approved_count) >= 20 && r.public_feed_count_n > 0 && r.feed_conversion_pct < 25);

  // Aggregate non-active markets into a single muted note rather than per-source rows.
  const inactiveSourcesWithIssues = inactiveRows.filter(
    (r) =>
      Number(r.approved_count) > 0 && (r.public_feed_count_n === 0 || r.trust_passed_count_n === 0)
  ).length;
  const byMarket = new Map<string, { listings: number; sources: number; approvedSum: number; worstGrade: number }>();
  rows.forEach((r) => {
    const m = r.marketId;
    if (!byMarket.has(m)) byMarket.set(m, { listings: 0, sources: 0, approvedSum: 0, worstGrade: 4 });
    const g = byMarket.get(m)!;
    g.listings += Number(r.listing_count);
    g.sources += 1;
    g.approvedSum += (r.approved_pct / 100) * Number(r.listing_count);
    const gradeNum = { A: 4, B: 3, C: 2, D: 1 }[r.grade];
    if (gradeNum < g.worstGrade) g.worstGrade = gradeNum;
  });

  const totalWithImage = rows.reduce((acc, r) => acc + (r.with_image_pct / 100) * Number(r.listing_count), 0);
  const totalWithPrice = rows.reduce((acc, r) => acc + (r.with_price_pct / 100) * Number(r.listing_count), 0);
  const globalImagePct = stats.totalListings > 0 ? (100 * totalWithImage) / stats.totalListings : 0;
  const globalPricePct = stats.totalListings > 0 ? (100 * totalWithPrice) / stats.totalListings : 0;

  const worstImage = rows.length ? rows.reduce((a, b) => (a.with_image_pct <= b.with_image_pct ? a : b)) : null;
  const worstPrice = rows.length ? rows.reduce((a, b) => (a.with_price_pct <= b.with_price_pct ? a : b)) : null;
  const bestApproved = rows.length ? rows.reduce((a, b) => (a.approved_pct >= b.approved_pct ? a : b)) : null;

  // Red-flag count is an active-market operations signal. Each grouped issue
  // counts once (not once per affected source) so the badge stays bounded
  // and meaningful even when many sources share the same pathology.
  const flagCount =
    (syncStale ? 1 : 0) +
    (syncMissing ? 1 : 0) +
    (cvApprovedNoFeed.length > 0 ? 1 : 0) +
    (cvApprovedNoTrust.length > 0 ? 1 : 0) +
    (cvApprovedNoIndexable.length > 0 ? 1 : 0) +
    (cvListingsNoApproved.length > 0 ? 1 : 0) +
    (cvListingsNoSqm.length > 0 ? 1 : 0) +
    (cvLowFeedConv.length > 0 ? 1 : 0) +
    (cvStale.length > 0 ? 1 : 0) +
    (cvMissingFreshness.length > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          Stats
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Metrics and red flags
        </p>
      </div>

      {/* Pulse */}
      <section className="surface-1 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Pulse</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-foreground-muted mb-1">Last sync</div>
            <div className="text-sm text-foreground font-mono">
              {latestSync?.at
                ? new Date(latestSync.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </div>
            {latestSync && (
              <div className="mt-2"><RunPhaseBadge latestSync={latestSync} /></div>
            )}
            {syncMissing && (
              <p className="text-amber text-xs mt-1">No sync report available</p>
            )}
            {syncStale && syncAt && (
              <p className="text-amber text-xs mt-1">
                Stale: {Math.round(syncAgeMinutes! / (60 * 24))} days ago
              </p>
            )}
          </div>
          <div>
            <div className="text-xs text-foreground-muted mb-1">Approval rate</div>
            <div className={`text-2xl font-semibold tabular-nums font-mono ${approvedPct >= 70 ? "text-green" : approvedPct >= 40 ? "text-amber" : "text-red"}`}>
              {approvedPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-foreground-muted mb-1">Red flags</div>
            <div className={`text-2xl font-semibold tabular-nums font-mono ${flagCount === 0 ? "text-green" : flagCount <= 3 ? "text-amber" : "text-red"}`}>
              {flagCount}
            </div>
          </div>
        </div>
      </section>

      {/* Red flags — active market only */}
      <section>
        <div className="flex items-baseline justify-between mb-3 gap-3">
          <h2 className="text-base font-semibold text-foreground">{ACTIVE_MARKET_LABEL} operational issues</h2>
          <span className="text-xs text-foreground-subtle">grouped by issue type</span>
        </div>
        <div className="space-y-2">
          {syncMissing && (
            <FlagGroup tone="warn" title="Sync" message="No ingest report loaded" />
          )}
          {syncStale && !syncMissing && (
            <FlagGroup tone="warn" title="Stale sync" message="Last sync > 3 days ago" />
          )}
          {cvApprovedNoFeed.length > 0 && (
            <FlagGroup
              tone="bad"
              title={`${cvApprovedNoFeed.length} ${ACTIVE_MARKET_LABEL} source${cvApprovedNoFeed.length === 1 ? "" : "s"}: approved but none reach public feed`}
              message={formatSourceList(cvApprovedNoFeed.map((r) => r.sourceName))}
            />
          )}
          {cvApprovedNoTrust.length > 0 && (
            <FlagGroup
              tone="bad"
              title={`${cvApprovedNoTrust.length} ${ACTIVE_MARKET_LABEL} source${cvApprovedNoTrust.length === 1 ? "" : "s"}: approved but none pass trust gate`}
              message={formatSourceList(cvApprovedNoTrust.map((r) => r.sourceName))}
            />
          )}
          {cvApprovedNoIndexable.length > 0 && (
            <FlagGroup
              tone="bad"
              title={`${cvApprovedNoIndexable.length} ${ACTIVE_MARKET_LABEL} source${cvApprovedNoIndexable.length === 1 ? "" : "s"}: approved but none indexable`}
              message={formatSourceList(cvApprovedNoIndexable.map((r) => r.sourceName))}
            />
          )}
          {cvListingsNoApproved.length > 0 && (
            <FlagGroup
              tone="bad"
              title={`${cvListingsNoApproved.length} ${ACTIVE_MARKET_LABEL} source${cvListingsNoApproved.length === 1 ? "" : "s"}: listings but 0 approved`}
              message={cvListingsNoApproved
                .slice(0, 5)
                .map((r) => `${r.sourceName} (${Number(r.listing_count).toLocaleString()})`)
                .join(", ") + (cvListingsNoApproved.length > 5 ? ` +${cvListingsNoApproved.length - 5} more` : "")}
            />
          )}
          {cvStale.length > 0 && (
            <FlagGroup
              tone="warn"
              title={`${cvStale.length} ${ACTIVE_MARKET_LABEL} source${cvStale.length === 1 ? "" : "s"} stale (>${SOURCE_STALE_DAYS}d)`}
              message={cvStale
                .slice(0, 5)
                .map((r) => {
                  const days = formatFreshness(r.last_updated_at).days;
                  return `${r.sourceName}${days != null ? ` (${days}d)` : ""}`;
                })
                .join(", ") + (cvStale.length > 5 ? ` +${cvStale.length - 5} more` : "")}
            />
          )}
          {cvListingsNoSqm.length > 0 && (
            <FlagGroup
              tone="warn"
              title={`${cvListingsNoSqm.length} ${ACTIVE_MARKET_LABEL} source${cvListingsNoSqm.length === 1 ? "" : "s"} missing sqm coverage`}
              message={cvListingsNoSqm
                .slice(0, 5)
                .map((r) => `${r.sourceName} (${Number(r.listing_count).toLocaleString()} listings, 0% sqm)`)
                .join(", ") + (cvListingsNoSqm.length > 5 ? ` +${cvListingsNoSqm.length - 5} more` : "")}
            />
          )}
          {cvLowFeedConv.length > 0 && (
            <FlagGroup
              tone="warn"
              title={`${cvLowFeedConv.length} ${ACTIVE_MARKET_LABEL} source${cvLowFeedConv.length === 1 ? "" : "s"} with low feed conversion (<25%)`}
              message={cvLowFeedConv
                .slice(0, 5)
                .map((r) => `${r.sourceName} (${r.public_feed_count_n}/${Number(r.approved_count)} = ${r.feed_conversion_pct}%)`)
                .join(", ") + (cvLowFeedConv.length > 5 ? ` +${cvLowFeedConv.length - 5} more` : "")}
            />
          )}
          {cvMissingFreshness.length > 0 && (
            <FlagGroup
              tone="muted"
              title={`${cvMissingFreshness.length} ${ACTIVE_MARKET_LABEL} source${cvMissingFreshness.length === 1 ? "" : "s"} missing last_updated_at`}
              message="RPC may need to be re-run"
            />
          )}
          {inactiveSourcesWithIssues > 0 && (
            <FlagGroup
              tone="muted"
              title={`Test pipeline markets: ${inactiveSourcesWithIssues} additional issue${inactiveSourcesWithIssues === 1 ? "" : "s"}`}
              message="Non-active markets (Ghana, Kenya, Nigeria, Zambia, Botswana) — see Sources tab for detail"
            />
          )}
          {flagCount === 0 && (
            <div className="rounded-lg p-3 bg-green-muted text-sm text-green">
              No active-market operational issues.
            </div>
          )}
        </div>
        {(gradeD.length > 0 || gradeC.length > 0 || noImages.length > 0 || noPrice.length > 0) && (
          <div className="mt-4 pt-3 border-t border-border text-xs text-foreground-subtle">
            Health across all markets: {gradeD.length} D, {gradeC.length} C; {noImages.length} sources &lt;10% images, {noPrice.length} sources &lt;10% prices.
          </div>
        )}
      </section>

      {/* Health distribution */}
      <section className="surface-1 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Health distribution</h2>
        <div className="flex flex-wrap gap-6 items-end">
          {(["A", "B", "C", "D"] as const).map((g) => (
            <div key={g} className="flex flex-col items-center gap-1.5">
              <div className="text-lg font-semibold tabular-nums font-mono">
                {gradeCounts[g] ?? 0}
              </div>
              <div
                className={`w-12 rounded ${
                  g === "A" ? "bg-green" : g === "B" ? "bg-green/70" : g === "C" ? "bg-amber" : "bg-red"
                }`}
                style={{ height: `${Math.max(16, (gradeCounts[g] ?? 0) * 14)}px` }}
              />
              <span className="text-[11px] text-foreground-subtle">{g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* By market */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">By market</h2>
        <div className="surface-1 rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Market</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Listings</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Sources</th>
                  <th className="text-right py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Approved</th>
                  <th className="text-left py-2.5 px-3 text-[11px] uppercase tracking-wider text-foreground-subtle font-medium">Worst</th>
                </tr>
              </thead>
              <tbody>
                {[...byMarket.entries()]
                  .sort((a, b) => b[1].listings - a[1].listings)
                  .map(([marketId, v]) => {
                    const avgApproved = v.listings > 0 ? (100 * v.approvedSum) / v.listings : 0;
                    const worstGrade = ["D", "C", "B", "A"][v.worstGrade - 1] as "A" | "B" | "C" | "D";
                    return (
                      <tr key={marketId} className="border-b border-border last:border-0 hover:bg-surface-3/50 transition-colors">
                        <td className="py-2.5 px-3 text-sm font-medium">{marketId.toUpperCase()}</td>
                        <td className="py-2.5 px-3 text-right text-sm tabular-nums font-mono">{v.listings.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-sm tabular-nums font-mono">{v.sources}</td>
                        <td className="py-2.5 px-3 text-right text-sm tabular-nums font-mono">{avgApproved.toFixed(1)}%</td>
                        <td className="py-2.5 px-3">
                          <GradeBadge grade={worstGrade} />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Data quality snapshot */}
      <section className="surface-1 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">Data quality</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-foreground-muted mb-1">With image</div>
            <div className="text-xl font-semibold tabular-nums font-mono">{globalImagePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-foreground-muted mb-1">With price</div>
            <div className="text-xl font-semibold tabular-nums font-mono">{globalPricePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-foreground-muted mb-1">Approved</div>
            <div className="text-xl font-semibold tabular-nums font-mono">{approvedPct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-foreground-muted mb-1">Total</div>
            <div className="text-xl font-semibold tabular-nums font-mono">{stats.totalListings.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* Outliers */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Outliers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {bestApproved && (
            <div className="surface-1 rounded-xl border border-border p-4">
              <div className="text-xs text-foreground-muted mb-1">Best approval</div>
              <div className="text-sm font-medium text-foreground">{bestApproved.sourceName}</div>
              <div className="text-green text-sm font-mono mt-0.5">{bestApproved.approved_pct.toFixed(1)}%</div>
            </div>
          )}
          {worstImage && (
            <div className="surface-1 rounded-xl border border-border p-4">
              <div className="text-xs text-foreground-muted mb-1">Lowest images</div>
              <div className="text-sm font-medium text-foreground">{worstImage.sourceName}</div>
              <div className="text-red text-sm font-mono mt-0.5">{worstImage.with_image_pct.toFixed(1)}%</div>
            </div>
          )}
          {worstPrice && (
            <div className="surface-1 rounded-xl border border-border p-4">
              <div className="text-xs text-foreground-muted mb-1">Lowest prices</div>
              <div className="text-sm font-medium text-foreground">{worstPrice.sourceName}</div>
              <div className="text-red text-sm font-mono mt-0.5">{worstPrice.with_price_pct.toFixed(1)}%</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================
// MARKET OVERVIEW (legacy – kept for optional use)
// ============================================

function MarketOverview({ onSelect }: { onSelect: (id: string) => void }) {
  const markets = getMarkets();
  return (
    <div>
      <h1 className="text-foreground mb-1">AREI Admin</h1>
      <p className="text-foreground-subtle text-[13px] mt-0">
        Pan-African Real Estate Index
      </p>
      <hr className="border-border" />
      <div className="overflow-x-auto">
      <table className="border-collapse w-full max-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            {["Market", "Status", "Sources", "Listings", ""].map((h) => (
              <th
                key={h}
                className="text-left px-3.5 py-2.5 text-foreground-muted text-[11px] font-medium uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr
              key={m.id}
              className="border-b border-muted cursor-pointer hover:bg-surface-1 transition-colors"
              onClick={() => onSelect(m.id)}
            >
              <td className="px-3.5 py-3 text-foreground font-medium">
                {m.name}
              </td>
              <td className="px-3.5 py-3">
                <StatusBadge status={m.status} />
              </td>
              <td className="px-3.5 py-3 text-foreground-muted">{m.sources.length}</td>
              <td className="px-3.5 py-3 text-foreground-muted">{m.listings.length}</td>
              <td className="px-3.5 py-3">
                <button
                  onClick={() => onSelect(m.id)}
                  className="bg-surface-3 text-accent px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border-0 hover:bg-surface-2 transition-colors"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ============================================
// SOURCE TABLE
// ============================================

function SourceTable({ sources }: { sources: Source[] }) {
  return (
    <div>
      <h3 className="text-foreground">Sources ({sources.length})</h3>
      <div className="overflow-x-auto">
      <table className="border-collapse w-full">
        <thead>
          <tr className="border-b border-border">
            {["Name", "Status", "Scrapes", "Repairs", "Error"].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-foreground-muted text-[11px] uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} className="border-b border-muted">
              <td className="px-3 py-2 text-foreground text-[13px]">{s.name}</td>
              <td className="px-3 py-2">
                <StatusBadge status={s.state.status} />
              </td>
              <td className="px-3 py-2 text-foreground-muted text-[13px]">
                {s.state.scrapeAttempts}
              </td>
              <td className="px-3 py-2 text-foreground-muted text-[13px]">
                {s.state.repairAttempts}
              </td>
              <td
                className={`px-3 py-2 text-[12px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap ${s.state.lastError ? "text-red" : "text-foreground-subtle"}`}
              >
                <div>{s.state.lastError || "-"}</div>
                {s.state.pauseReason && (
                  <div className="text-amber text-[11px] mt-1">
                    pause: {s.state.pauseReason}
                  </div>
                )}
                {s.state.pauseDetail && (
                  <div className="text-amber text-[11px] mt-1">
                    {s.state.pauseDetail}
                  </div>
                )}
                {s.state.lastErrorClass && (
                  <div className="text-amber text-[11px] mt-1">
                    class: {s.state.lastErrorClass}
                  </div>
                )}
                {s.state.lastSeenAt && (
                  <div className="text-foreground-muted text-[11px] mt-1">
                    seen: {s.state.lastSeenAt}
                  </div>
                )}
                {s.state.consecutiveFailureCount && s.state.consecutiveFailureCount > 0 && (
                  <div className="text-amber text-[11px] mt-1">
                    {s.state.consecutiveFailureCount} consecutive parser failure{s.state.consecutiveFailureCount === 1 ? "" : "s"}
                  </div>
                )}
                {s.state.debugErrors && s.state.debugErrors.length > 0 && (
                  <div className="text-amber text-[11px] mt-1">
                    {s.state.debugErrors.length} debug error{s.state.debugErrors.length === 1 ? "" : "s"}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ============================================
// FILTERS
// ============================================

export interface FilterState {
  keyword: string;
  priceMin: string;
  priceMax: string;
  island: string;
  propertyType: string;
  bedrooms: string;
  bathrooms: string;
  areaMin: string;
  areaMax: string;
  sourceId: string;
  priceOnRequest: boolean;
}

const defaultFilters: FilterState = {
  keyword: "",
  priceMin: "",
  priceMax: "",
  island: "",
  propertyType: "",
  bedrooms: "",
  bathrooms: "",
  areaMin: "",
  areaMax: "",
  sourceId: "",
  priceOnRequest: false,
};

function applyFilters(listings: Listing[], filters: FilterState): Listing[] {
  return listings.filter((l) => {
    if (filters.keyword.trim()) {
      const k = filters.keyword.toLowerCase();
      const text = [l.title, l.description, l.location].filter(Boolean).join(" ").toLowerCase();
      if (!text.includes(k)) return false;
    }
    if (filters.priceMin) {
      const min = Number(filters.priceMin);
      if (l.price == null || l.price < min) return false;
    }
    if (filters.priceMax) {
      const max = Number(filters.priceMax);
      if (l.price == null || l.price > max) return false;
    }
    if (filters.priceOnRequest && l.price != null) return false;
    if (filters.island && (l.island || "").toLowerCase() !== filters.island.toLowerCase()) return false;
    if (filters.propertyType && (l.property_type || "") !== filters.propertyType) return false;
    if (filters.bedrooms) {
      const b = Number(filters.bedrooms);
      if (l.bedrooms == null || l.bedrooms < b) return false;
    }
    if (filters.bathrooms) {
      const b = Number(filters.bathrooms);
      if (l.bathrooms == null || l.bathrooms < b) return false;
    }
    if (filters.areaMin) {
      const a = Number(filters.areaMin);
      if (l.area_sqm == null || l.area_sqm < a) return false;
    }
    if (filters.areaMax) {
      const a = Number(filters.areaMax);
      if (l.area_sqm == null || l.area_sqm > a) return false;
    }
    if (filters.sourceId && l.sourceId !== filters.sourceId) return false;
    return true;
  });
}

const PAGE_SIZE = 24;

function FilterBar({
  filters,
  setFilters,
  listings,
  sources,
}: {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  listings: Listing[];
  sources: Source[];
}) {
  const islands = Array.from(new Set(listings.map((l) => l.island).filter(Boolean))) as string[];
  const propertyTypes = Array.from(new Set(listings.map((l) => l.property_type).filter(Boolean))) as string[];

  return (
    <div style={{ background: "#16161a", padding: 16, borderRadius: 8, marginBottom: 20 }}>
      <h4 style={{ color: "#ececef", marginTop: 0, marginBottom: 12 }}>Filters</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <input
          type="text"
          placeholder="Keywords..."
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Price min"
          value={filters.priceMin}
          onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Price max"
          value={filters.priceMax}
          onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
          style={inputStyle}
        />
        <select
          value={filters.island}
          onChange={(e) => setFilters({ ...filters, island: e.target.value })}
          style={inputStyle}
        >
          <option value="">All islands</option>
          {islands.sort().map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select
          value={filters.propertyType}
          onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
          style={inputStyle}
        >
          <option value="">All types</option>
          {propertyTypes.sort().map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.bedrooms}
          onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
          style={inputStyle}
        >
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>{n}+</option>
          ))}
        </select>
        <select
          value={filters.bathrooms}
          onChange={(e) => setFilters({ ...filters, bathrooms: e.target.value })}
          style={inputStyle}
        >
          <option value="">Any baths</option>
          {[1, 2, 3].map((n) => (
            <option key={n} value={String(n)}>{n}+</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Area min m²"
          value={filters.areaMin}
          onChange={(e) => setFilters({ ...filters, areaMin: e.target.value })}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Area max m²"
          value={filters.areaMax}
          onChange={(e) => setFilters({ ...filters, areaMax: e.target.value })}
          style={inputStyle}
        />
        <select
          value={filters.sourceId}
          onChange={(e) => setFilters({ ...filters, sourceId: e.target.value })}
          style={inputStyle}
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#8b8b96", fontSize: 13 }}>
          <input
            type="checkbox"
            checked={filters.priceOnRequest}
            onChange={(e) => setFilters({ ...filters, priceOnRequest: e.target.checked })}
          />
          Price on request
        </label>
      </div>
      <button
        onClick={() => setFilters(defaultFilters)}
        style={{
          marginTop: 12,
          background: "#1c1c22",
          color: "#ececef",
          border: "none",
          padding: "6px 14px",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
        }}
      >
        Clear filters
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#16161a",
  border: "1px solid #1e1e24",
  color: "#ececef",
  padding: "6px 10px",
  borderRadius: 6,
  fontSize: 13,
};

// ============================================
// LISTING DETAIL (all DB data + visit link)
// ============================================

function ListingDetail({
  listing,
  onBack,
  displayCurrency = "original",
}: {
  listing: Listing;
  onBack: () => void;
  displayCurrency?: DisplayCurrency;
}) {
  const facts: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: "Type", value: listing.property_type },
    { label: "Source ref", value: listing.source_ref },
    { label: "Bedrooms", value: listing.bedrooms },
    { label: "Bathrooms", value: listing.bathrooms },
    { label: "Area (m²)", value: listing.area_sqm != null ? Math.round(listing.area_sqm) : null },
    { label: "Land (m²)", value: listing.land_area_sqm != null ? Math.round(listing.land_area_sqm) : null },
    { label: "Island", value: listing.island },
    { label: "City", value: listing.city },
    { label: "Status", value: listing.status },
    { label: "Approved", value: listing.approved != null ? (listing.approved ? "Yes" : "No") : null },
    { label: "Price period", value: listing.price_period },
    { label: "Project", value: listing.project_flag != null ? (listing.project_flag ? "Yes" : "No") : null },
    { label: "Project start price", value: listing.project_start_price },
  ].filter((x) => x.value != null && x.value !== "");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-foreground font-mono tabular-nums">
            {formatPrice(listing.price, listing.currency, displayCurrency)}
          </span>
          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border-strong text-foreground-muted hover:text-foreground hover:bg-surface-3 transition-colors no-underline"
            >
              View original ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="min-w-0 max-w-full">
          <div className="w-full max-w-[560px] aspect-[560/360] overflow-hidden rounded-lg">
            <ImageGallery images={listing.images} width={560} height={360} responsive />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground mt-4">
            {listing.title || "[No title]"}
          </h2>
          {listing.location && (
            <p className="text-foreground-muted text-sm mt-1">{listing.location}</p>
          )}
          {facts.length > 0 && (
            <div className="surface-1 rounded-xl border border-border p-4 mt-4">
              <h4 className="text-xs text-foreground-subtle mb-3">Key facts</h4>
              <dl className="m-0 text-sm text-foreground">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-2 mb-1.5">
                    <dt className="m-0 min-w-[100px] text-foreground-muted">{f.label}</dt>
                    <dd className="m-0 font-mono">{String(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs text-foreground-subtle mb-1">Amenities</h4>
              <p className="text-foreground text-sm">{listing.amenities.join(", ")}</p>
            </div>
          )}
          {listing.violations && listing.violations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs text-amber mb-1">Violations</h4>
              <p className="text-foreground text-sm">{listing.violations.join(", ")}</p>
            </div>
          )}
        </div>
        <div>
          <div className="surface-1 rounded-xl border border-border p-4">
            <h4 className="text-xs text-foreground-subtle mb-2">Description</h4>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description."}
            </p>
          </div>
          <div className="mt-4 text-foreground-subtle text-xs">
            <p className="m-1"><span className="text-foreground-muted">Source:</span> {listing.sourceName}</p>
            <p className="m-1"><span className="text-foreground-muted">ID:</span> <span className="font-mono">{listing.id}</span></p>
          </div>
          <div className="surface-1 rounded-xl border border-border p-3 mt-4 text-foreground-subtle text-xs">
            Aggregated from an external source. AREI does not verify accuracy or facilitate transactions.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LISTINGS GRID (paginated, clickable)
// ============================================

function ListingsGrid({
  listings,
  page,
  setPage,
  onSelectListing,
}: {
  listings: Listing[];
  page: number;
  setPage: (p: number) => void;
  onSelectListing: (l: Listing) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const slice = listings.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <h3 style={{ color: "#ececef" }}>
        Listings ({listings.length})
        {totalPages > 1 && ` – Page ${page} of ${totalPages}`}
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {slice.map((l) => (
          <ListingCard key={l.id} listing={l} onClick={() => onSelectListing(l)} />
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, alignItems: "center" }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ ...inputStyle, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ color: "#8b8b96" }}>{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={{ ...inputStyle, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MARKET DETAIL (filters + grid + detail)
// ============================================

function MarketDetail({
  marketId,
  onBack,
}: {
  marketId: string;
  onBack: () => void;
}) {
  const market = getMarket(marketId);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  if (!market) {
    return (
      <div>
        <p style={{ color: "#ececef" }}>Market not found: {marketId}</p>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  const filtered = applyFilters(market.listings, filters);
  if (selectedListing) {
    return (
      <div>
        <ListingDetail
          listing={selectedListing}
          onBack={() => setSelectedListing(null)}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "1px solid #1e1e24",
            color: "#8b8b96",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Back
        </button>
        <h1 style={{ color: "#ececef", margin: 0 }}>{market.name}</h1>
        <StatusBadge status={market.status} />
      </div>
      <hr style={{ borderColor: "#1e1e24" }} />
      <SourceTable sources={market.sources} />
      <hr style={{ borderColor: "#1e1e24", margin: "24px 0" }} />
      <FilterBar
        filters={filters}
        setFilters={(f) => { setFilters(f); setPage(1); }}
        listings={market.listings}
        sources={market.sources}
      />
      <ListingsGrid
        listings={filtered}
        page={page}
        setPage={setPage}
        onSelectListing={setSelectedListing}
      />
    </div>
  );
}

// ============================================
// APP (Dashboard | Listings)
// ============================================

type Tab = "dashboard" | "listings" | "sources" | "stats" | "agents";

const NAV_ITEMS: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "◈" },
  { key: "listings", label: "Listings", icon: "▤" },
  { key: "sources", label: "Sources", icon: "⬡" },
  { key: "stats", label: "Stats", icon: "◫" },
  { key: "agents", label: "Agents", icon: "◉" },
];

function App({ onSignOut }: { onSignOut?: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dark, toggleTheme] = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when resizing up to desktop
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = () => { if (mq.matches) setSidebarOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const selectTab = (key: Tab) => {
    setTab(key);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ── Mobile backdrop ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────── */}
      <aside className={
        "sidebar fixed md:sticky top-0 z-40 md:z-auto h-dvh md:h-screen " +
        "transition-transform duration-200 ease-out md:transition-none " +
        (sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0")
      }>
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center text-sm font-bold text-primary-foreground">
              A
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground tracking-tight leading-none">
                AREI
              </div>
              <div className="text-[11px] text-foreground-muted mt-0.5">
                Admin Console
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto md:hidden p-1 text-foreground-muted hover:text-foreground"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-3 mb-2">
          <div className="text-[10px] uppercase tracking-wider text-foreground-subtle font-medium px-2 mb-1.5">
            Main menu
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
              className={
                "w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 " +
                (tab === key
                  ? "bg-surface-2 text-foreground"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-2")
              }
            >
              <span className="text-base leading-none opacity-50">{icon}</span>
              {label}
              {key === "agents" && (
                <span className="ml-auto text-[10px] font-medium bg-green-muted text-green px-1.5 py-0.5 rounded-md">
                  NEW
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 mt-auto space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150"
          >
            <span className="text-base leading-none opacity-50">{dark ? "☀" : "☾"}</span>
            {dark ? "Light mode" : "Dark mode"}
          </button>
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all duration-150"
            >
              <span className="text-base leading-none opacity-50">↩</span>
              Sign out
            </button>
          )}
          <div className="rounded-lg px-3 py-3 border border-border">
            <div className="text-[11px] text-foreground-subtle mb-0.5">AREI Admin</div>
            <div className="text-[11px] text-foreground-muted">Pan-African Real Estate</div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-background">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-background border-b border-border md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 text-foreground-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-foreground tracking-tight">AREI</span>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 py-5 md:px-8 md:py-8">
          {tab === "dashboard" && <DashboardView />}
          {tab === "listings" && <ListingsTabView />}
          {tab === "sources" && <SourcesView />}
          {tab === "stats" && <StatsView />}
          {tab === "agents" && <AgentsApprovalsView />}
        </div>
      </main>
    </div>
  );
}

// ============================================
// AUTH GATE — Supabase Auth with admin_users check
// ============================================

const ADMIN_PROTECTED =
  import.meta.env.VITE_ADMIN_PROTECTED === "true" ||
  (!import.meta.env.DEV && import.meta.env.VITE_ADMIN_PROTECTED !== "false");

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr || !data.user) {
        setError(signInErr?.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      // Verify user is in admin_users
      const { data: adminRow, error: adminErr } = await supabaseAuth
        .from("admin_users")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (adminErr || !adminRow) {
        await supabaseAuth.auth.signOut();
        setError("You are not authorized to access this panel");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center text-sm font-bold text-primary-foreground">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight">AREI</span>
        </div>
        <div className="surface-1 rounded-xl p-7 border border-border">
          <h1 className="text-lg font-semibold text-foreground mb-1 text-center">
            Sign in to Admin
          </h1>
          <p className="text-sm text-foreground-muted mb-6 text-center">
            Enter your credentials to continue
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-background border border-border text-foreground px-4 py-2.5 text-sm rounded-lg focus:border-foreground-subtle focus:outline-none transition-colors"
              autoFocus
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-background border border-border text-foreground px-4 py-2.5 text-sm rounded-lg focus:border-foreground-subtle focus:outline-none transition-colors"
              autoComplete="current-password"
            />
            {error && (
              <p className="text-red text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-foreground text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AuthGate() {
  const [status, setStatus] = useState<"loading" | "ok" | "login">("loading");

  useEffect(() => {
    if (!ADMIN_PROTECTED) {
      setStatus("ok");
      return;
    }

    // Check existing session
    supabaseAuth.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setStatus("login");
        return;
      }
      // Verify user is still in admin_users
      const { data: adminRow } = await supabaseAuth
        .from("admin_users")
        .select("role")
        .eq("user_id", session.user.id)
        .single();
      setStatus(adminRow ? "ok" : "login");
    });

    // Listen for auth changes (sign-out, token refresh, etc.)
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) setStatus("login");
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabaseAuth.auth.signOut();
    setStatus("login");
  };

  if (!ADMIN_PROTECTED) return <App />;
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground-muted text-sm">
        Checking access…
      </div>
    );
  }
  if (status === "login") {
    return <LoginScreen onSuccess={() => setStatus("ok")} />;
  }
  return <App onSignOut={handleSignOut} />;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<AuthGate />);
}
