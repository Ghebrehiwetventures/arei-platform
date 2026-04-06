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
  createContentDraftFromListing,
  getPublishItems,
  createOrOpenPublishItemFromDraft,
  updatePublishItemSetup,
  updatePublishItemStatus,
  getAgentV1Selections,
  getAgentMapRows,
  updateContentDraftStatus,
  type ListingsFilters,
  type ListingsSortKey,
  type LatestSyncLog,
} from "./data";

const SYNC_STALE_MINUTES = 24 * 60 * 3; // 3 days
import { Market, Source, Listing, SourceStatus, DashboardStats, SourceQualityRow, ContentDraft, ContentDraftStatus, ListingSelection, AgentMapCategory, AgentMapPriority, AgentMapRow, AgentMapStatus, AgentMapStrategicImportance, PublishChannel, PublishItem, PublishItemStatus } from "./types";

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
          background: "#eef2f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#697386",
          fontSize: 13,
          borderRadius: "8px 8px 0 0",
        }}
      >
        NO IMAGE
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
    background: "rgba(255,255,255,0.88)",
    color: "#141826",
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
          background: "rgba(20,24,38,0.72)",
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
    OK: "bg-green text-primary-foreground",
    PARTIAL_OK: "bg-amber text-foreground",
    BROKEN_SOURCE: "bg-red text-primary-foreground",
    UNSCRAPABLE: "bg-red text-primary-foreground",
    PAUSED_BY_SYSTEM: "bg-amber text-foreground",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${classes[status] ?? "bg-muted-foreground text-background"}`}>
      {status}
    </span>
  );
}

function RunPhaseBadge({ latestSync }: { latestSync: LatestSyncLog }) {
  const isFinal = latestSync.isFinal === true || latestSync.runPhase === "final_post_enrichment";
  const classes = isFinal
    ? "bg-green/15 text-green border-green"
    : "bg-amber/15 text-amber border-amber";

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes}`}>
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
    A: "bg-green text-primary-foreground",
    B: "bg-green/80 text-primary-foreground",
    C: "bg-amber text-foreground",
    D: "bg-red text-primary-foreground",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-sm font-bold ${classes[grade] ?? "bg-muted-foreground text-background"}`}>
      {grade}
    </span>
  );
}

function DraftStatusBadge({ status }: { status: ContentDraftStatus }) {
  const labels: Record<ContentDraftStatus, string> = {
    pending: "In approval queue",
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision requested",
  };
  const classes: Record<ContentDraftStatus, string> = {
    pending: "bg-amber/15 text-amber border-amber",
    approved: "bg-green/15 text-green border-green",
    rejected: "bg-red/15 text-red border-red",
    revision_requested: "bg-muted text-foreground border-foreground",
  };

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function WorkflowFeedbackBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="app-surface-subtle border border-green/20 bg-green/10 text-green p-4">
      <div className="section-kicker mb-1">Workflow update</div>
      <p className="text-sm m-0 leading-relaxed">{message}</p>
    </div>
  );
}

function AgentMapStatusBadge({ status }: { status: AgentMapStatus }) {
  const classes: Record<AgentMapStatus, string> = {
    human_only: "bg-muted text-foreground border-foreground",
    human_plus_ai: "bg-amber/15 text-amber border-amber",
    candidate_for_agent: "bg-blue-500/15 text-blue-300 border-blue-400",
    in_progress: "bg-green/15 text-green border-green",
    live: "bg-green/20 text-green border-green",
    parked: "bg-red/10 text-red border-red",
  };

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function AgentMapPriorityBadge({ priority }: { priority: AgentMapPriority }) {
  const classes: Record<AgentMapPriority, string> = {
    now: "bg-red/10 text-red border-red",
    next: "bg-amber/15 text-amber border-amber",
    later: "bg-muted text-foreground border-foreground",
  };

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes[priority]}`}>
      {priority}
    </span>
  );
}

function AgentMapImportanceBadge({ importance }: { importance: AgentMapStrategicImportance }) {
  const classes: Record<AgentMapStrategicImportance, string> = {
    critical: "bg-red/10 text-red border-red",
    high: "bg-amber/15 text-amber border-amber",
    medium: "bg-muted text-foreground border-foreground",
  };

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes[importance]}`}>
      {importance}
    </span>
  );
}

const AGENT_MAP_CATEGORY_ORDER: AgentMapCategory[] = [
  "Sales / Revenue",
  "Data / Source Ops",
  "Editorial / Content",
  "SEO / Market Intelligence",
  "Distribution / Growth",
  "Founder / Decision Support",
];

function AgentMapView() {
  const [rows, setRows] = useState<AgentMapRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getAgentMapRows().then((items) => {
      if (!cancelled) {
        setRows(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalRows = rows.length;
  const salesRows = rows.filter((row) => row.category === "Sales / Revenue").length;
  const nowRows = rows.filter((row) => row.priority === "now").length;
  const criticalRows = rows.filter((row) => row.strategicImportance === "critical").length;

  const groupedRows = AGENT_MAP_CATEGORY_ORDER.map((category) => ({
    category,
    rows: rows
      .filter((row) => row.category === category)
      .sort((a, b) => {
        const priorityOrder = { now: 0, next: 1, later: 2 };
        const importanceOrder = { critical: 0, high: 1, medium: 2 };
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          importanceOrder[a.strategicImportance] - importanceOrder[b.strategicImportance] ||
          a.function.localeCompare(b.function)
        );
      }),
  })).filter((group) => group.rows.length > 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker mb-2">Agents / Map</div>
          <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
            Agent Map
          </h2>
          <p className="section-note">
            Manual planning surface for business functions, candidate agent roles, and what matters now. This is for visibility and prioritization, not execution orchestration.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="app-metric-card">
          <div className="label-style mb-1">Functions mapped</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{totalRows}</div>
        </div>
        <div className="app-metric-card">
          <div className="label-style mb-1">Sales / Revenue</div>
          <div className="text-2xl font-bold text-red tabular-nums">{salesRows}</div>
        </div>
        <div className="app-metric-card">
          <div className="label-style mb-1">Priority now</div>
          <div className="text-2xl font-bold text-amber tabular-nums">{nowRows}</div>
        </div>
        <div className="app-metric-card">
          <div className="label-style mb-1">Strategic critical</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{criticalRows}</div>
        </div>
      </div>

      <div className="app-surface-subtle p-4">
        <div className="label-style mb-2">How to read this</div>
        <p className="text-sm font-mono text-foreground leading-relaxed m-0">
          `status` shows whether the work stays human, is human-guided with AI, or is a future candidate for agentization. `priority` is now / next / later. `strategic importance` is the forcing function for planning, with Sales / Revenue shown explicitly so roadmap work does not drift into content-only interventions.
        </p>
      </div>

      {loading && <p className="text-muted-foreground text-sm font-mono">Loading agent map…</p>}

      <div className="space-y-5">
        {groupedRows.map((group) => (
          <section key={group.category} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="label-style">{group.category}</div>
                <div className="text-xs font-mono text-muted-foreground">{group.rows.length} mapped functions</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {group.rows.map((row) => (
                <article key={row.id} className="detail-panel p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="label-style mb-1">{row.function}</div>
                      <h3 className="font-sans font-bold text-lg tracking-tight text-foreground">
                        {row.candidateAgent}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono mt-1 mb-0">
                        Owner: {row.currentOwner}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <AgentMapPriorityBadge priority={row.priority} />
                      <AgentMapImportanceBadge importance={row.strategicImportance} />
                      <AgentMapStatusBadge status={row.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <div className="label-style mb-1">Required inputs</div>
                      <ul className="space-y-1 text-sm text-foreground font-mono m-0 pl-5">
                        {row.requiredInputs.map((input) => (
                          <li key={input}>{input}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="label-style mb-1">Expected outputs</div>
                      <ul className="space-y-1 text-sm text-foreground font-mono m-0 pl-5">
                        {row.expectedOutputs.map((output) => (
                          <li key={output}>{output}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <div className="label-style mb-1">Notes</div>
                    <p className="text-sm text-foreground font-mono leading-relaxed m-0 whitespace-pre-wrap">
                      {row.notes}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

type AgentsSubnav = "workflow" | "eval" | "map";
type WorkflowStage = "select" | "draft" | "approve" | "publish";

function PublishStatusBadge({ status }: { status: PublishItemStatus }) {
  const classes: Record<PublishItemStatus, string> = {
    ready_to_publish: "bg-amber/15 text-amber border-amber",
    scheduled: "bg-blue-500/15 text-blue-300 border-blue-400",
    published: "bg-green/15 text-green border-green",
    failed: "bg-red/15 text-red border-red",
    cancelled: "bg-muted text-foreground border-foreground",
  };
  const labels: Record<PublishItemStatus, string> = {
    ready_to_publish: "Ready to publish",
    scheduled: "Scheduled",
    published: "Published",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <span className={`inline-block border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

function isUsefulSelectorWarning(warning: string): boolean {
  return !/freshness signal weak/i.test(warning);
}

function getSelectionContextLabel(selection: ListingSelection): string | null {
  const haystack = `${selection.sourceName} ${selection.sourceUrl ?? ""} ${selection.title}`.toLowerCase();
  if (haystack.includes("kazaverde")) {
    return "This listing appears to be tied to KazaVerde context in the current dataset.";
  }
  return null;
}

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function SelectorEvalView() {
  const metrics = [
    ["Top-k precision", "Share of top-ranked eval items labeled strong_candidate."],
    ["Top-k accept rate", "Share of top-ranked eval items labeled strong_candidate or maybe."],
    ["Reject leakage", "Reject-labeled items appearing in the top set."],
    ["Weak leakage", "Weak or reject items appearing in the top set."],
    ["Theme agreement", "How often selector theme matches labeled preferred theme."],
    ["Angle usefulness", "How often the suggested angle falls inside acceptable angle labels."],
    ["Diversity sanity", "Simple repetition check across source, island, and family."],
  ] as const;

  return (
    <section className="space-y-6">
      <div>
        <div className="section-kicker mb-2">Agents / Selector Eval</div>
        <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
          Selector Eval
        </h2>
        <p className="section-note">
          Manual eval loop for Agent V1. Use the checked-in seed set and runner script to verify selector quality before more tuning.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="detail-panel p-4 space-y-4">
          <div>
            <div className="label-style mb-1">Run locally</div>
            <code className="block bg-muted border border-border px-3 py-3 text-sm font-mono text-foreground whitespace-pre-wrap">
              npx tsx scripts/eval_agent_v1_selector.ts
            </code>
          </div>
          <div>
            <div className="label-style mb-1">Eval set</div>
            <p className="text-sm font-mono text-foreground m-0 break-all">
              arei-admin/evals/agent_v1_eval_set.cv.json
            </p>
          </div>
          <div>
            <div className="label-style mb-1">Operating note</div>
            <p className="text-sm font-mono text-foreground m-0 break-all">
              docs/06-go-to-market/agent-v1-eval-loop.md
            </p>
          </div>
        </div>

        <div className="detail-panel p-4">
          <div className="label-style mb-2">What this checks</div>
          <div className="space-y-3">
            {metrics.map(([label, note]) => (
              <div key={label}>
                <div className="text-sm font-semibold tracking-tight text-foreground">{label}</div>
                <p className="text-sm font-mono text-muted-foreground m-0">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentsWorkflowView() {
  const [subnav, setSubnav] = useState<AgentsSubnav>("workflow");
  const [stage, setStage] = useState<WorkflowStage>("select");
  const [selections, setSelections] = useState<ListingSelection[]>([]);
  const [selectorLoading, setSelectorLoading] = useState(true);
  const [selectorRunning, setSelectorRunning] = useState(false);
  const [activeSelectionId, setActiveSelectionId] = useState<string | null>(null);
  const [creatingDraftForListingId, setCreatingDraftForListingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [publishItems, setPublishItems] = useState<PublishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishLoading, setPublishLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const [activePublishId, setActivePublishId] = useState<string | null>(null);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<ContentDraftStatus | "all">("pending");
  const [publishStatusFilter, setPublishStatusFilter] = useState<PublishItemStatus | "all">("ready_to_publish");
  const [workflowFeedback, setWorkflowFeedback] = useState<string | null>(null);
  const [publishSaving, setPublishSaving] = useState(false);
  const [duplicatePublishWarning, setDuplicatePublishWarning] = useState<string | null>(null);
  const [manualPostedMode, setManualPostedMode] = useState(false);
  const [manualPostedPublishedAt, setManualPostedPublishedAt] = useState("");
  const [manualPostedUrl, setManualPostedUrl] = useState("");
  const [manualPostedError, setManualPostedError] = useState<string | null>(null);
  const [publishFormChannel, setPublishFormChannel] = useState<PublishChannel>("instagram");
  const [publishFormMode, setPublishFormMode] = useState<"publish_now" | "schedule_later">("publish_now");
  const [publishFormScheduledFor, setPublishFormScheduledFor] = useState("");
  const [publishFormOperatorNotes, setPublishFormOperatorNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    getAgentV1Selections().then((items) => {
      if (!cancelled) {
        setSelections(items);
        setSelectorLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    getPublishItems().then((items) => {
      if (!cancelled) {
        setPublishItems(items);
        setPublishLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeSelectionId && selections[0]) {
      setActiveSelectionId(selections[0].listingId);
    }
  }, [activeSelectionId, selections]);

  useEffect(() => {
    if (!activeDraftId && drafts[0]) {
      setActiveDraftId(drafts[0].id);
    }
  }, [activeDraftId, drafts]);

  useEffect(() => {
    if (!activeApprovalId && drafts[0]) {
      setActiveApprovalId(drafts[0].id);
    }
  }, [activeApprovalId, drafts]);

  useEffect(() => {
    if (!activePublishId && publishItems[0]) {
      setActivePublishId(publishItems[0].id);
    }
  }, [activePublishId, publishItems]);

  useEffect(() => {
    const activeItem = publishItems.find((item) => item.id === activePublishId) || publishItems[0];
    if (!activeItem) return;
    setPublishFormChannel(activeItem.channel);
    setPublishFormMode(activeItem.publishMode);
    setPublishFormScheduledFor(activeItem.scheduledFor ? activeItem.scheduledFor.slice(0, 16) : "");
    setPublishFormOperatorNotes(activeItem.operatorNotes ?? "");
    setDuplicatePublishWarning(null);
    setManualPostedMode(false);
    setManualPostedError(null);
  }, [activePublishId, publishItems]);

  const handleRunSelector = async () => {
    setSelectorRunning(true);
    try {
      const next = await getAgentV1Selections();
      setSelections(next);
      if (next[0]) setActiveSelectionId(next[0].listingId);
    } finally {
      setSelectorRunning(false);
      setSelectorLoading(false);
    }
  };

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

  const handleSendToDraft = async (listingId: string) => {
    setCreatingDraftForListingId(listingId);
    try {
      const next = await createContentDraftFromListing(listingId);
      setDrafts(next);
      const linkedDraft = next.find((draft) => draft.sourceListingId === listingId) || next[0];
      if (linkedDraft) {
        setActiveDraftId(linkedDraft.id);
      }
      setSubnav("workflow");
      setStage("draft");
      setLoading(false);
      setWorkflowFeedback("Listing sent to Draft. Review the prepared copy, then move it into the approval queue.");
    } finally {
      setCreatingDraftForListingId(null);
    }
  };

  const handleMarkReadyForApproval = async (draftId: string) => {
    const next = await updateContentDraftStatus(draftId, "pending");
    setDrafts(next);
    setActiveApprovalId(draftId);
    setStage("approve");
    setWorkflowFeedback("Draft moved to Approve. It is now in the approval queue for human review.");
  };

  const handleStatusUpdate = async (draftId: string, status: ContentDraftStatus) => {
    const note =
      status === "revision_requested"
        ? window.prompt("What should be revised before this draft can be approved?", "") ?? ""
        : "";
    const next = await updateContentDraftStatus(draftId, status, note);
    setDrafts(next);
    const feedbackByStatus: Record<ContentDraftStatus, string> = {
      pending: "Draft returned to the approval queue.",
      approved: "Draft approved. Publish remains intentionally out of scope for Phase 1.",
      rejected: "Draft rejected. It will not move forward in this workflow stage.",
      revision_requested: "Revision requested. The draft now needs updates before it can be approved.",
    };
    setWorkflowFeedback(feedbackByStatus[status]);
  };

  const handleSendToPublish = async (draftId: string) => {
    setPublishSaving(true);
    setDuplicatePublishWarning(null);
    try {
      const result = await createOrOpenPublishItemFromDraft(draftId);
      setPublishItems(result.items);
      setActivePublishId(result.activeItemId);
      setStage("publish");
      setWorkflowFeedback(
        result.created
          ? "Approved draft sent to Publish. Complete the manual publish setup in the next stage."
          : "Existing publish item opened for this approved draft and initial channel."
      );
      setPublishLoading(false);
    } finally {
      setPublishSaving(false);
    }
  };

  const handlePublishSetupSave = async (item: PublishItem, updates: { channel: PublishChannel; publishMode: "publish_now" | "schedule_later"; scheduledFor: string; operatorNotes: string }) => {
    setPublishSaving(true);
    setDuplicatePublishWarning(null);
    try {
      const result = await updatePublishItemSetup(item.id, {
        channel: updates.channel,
        publishMode: updates.publishMode,
        scheduledFor: updates.publishMode === "schedule_later" ? updates.scheduledFor || null : null,
        operatorNotes: updates.operatorNotes || null,
      });

      if (result.duplicateBlocked) {
        setDuplicatePublishWarning("A publish item already exists for this draft and channel. Choose a different channel or open the existing item.");
        return;
      }

      setPublishItems(result.items);
      setWorkflowFeedback(
        updates.publishMode === "schedule_later"
          ? "Publish item scheduled for later. Manual posting still happens outside admin."
          : "Publish setup saved. This item remains ready for manual posting."
      );
    } finally {
      setPublishSaving(false);
    }
  };

  const handlePublishStatusAction = async (itemId: string, status: PublishItemStatus) => {
    setPublishSaving(true);
    try {
      const next = await updatePublishItemStatus(itemId, status);
      setPublishItems(next);
      const feedback: Record<Exclude<PublishItemStatus, "published">, string> = {
        ready_to_publish: "Publish item returned to ready state.",
        scheduled: "Publish item scheduled for later.",
        failed: "Publish item marked as failed.",
        cancelled: "Publish item cancelled.",
      };
      setWorkflowFeedback(feedback[status as Exclude<PublishItemStatus, "published">] ?? "Publish item updated.");
    } finally {
      setPublishSaving(false);
    }
  };

  const handleOpenManualPosted = (item: PublishItem) => {
    setManualPostedMode(true);
    setManualPostedPublishedAt(item.publishedAt ? item.publishedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setManualPostedUrl(item.postUrl ?? "");
    setManualPostedError(null);
  };

  const handleConfirmManualPosted = async (item: PublishItem) => {
    if (!manualPostedPublishedAt.trim()) {
      setManualPostedError("Published date and time is required.");
      return;
    }
    if (!manualPostedUrl.trim()) {
      setManualPostedError("Post URL is required.");
      return;
    }
    if (!isLikelyUrl(manualPostedUrl.trim())) {
      setManualPostedError("Post URL must be a valid http or https URL.");
      return;
    }

    setPublishSaving(true);
    try {
      const next = await updatePublishItemStatus(item.id, "published", {
        publishedAt: new Date(manualPostedPublishedAt).toISOString(),
        postUrl: manualPostedUrl.trim(),
        operatorNotes: item.operatorNotes ?? null,
      });
      setPublishItems(next);
      setManualPostedMode(false);
      setManualPostedError(null);
      setWorkflowFeedback("Publish item marked as manually posted.");
    } finally {
      setPublishSaving(false);
    }
  };

  const pendingCount = drafts.filter((draft) => draft.status === "pending").length;
  const draftStageDrafts = drafts.filter((draft) => draft.status === "pending" || draft.status === "revision_requested");
  const approvalDrafts = drafts.filter((draft) => (approvalStatusFilter === "all" ? true : draft.status === approvalStatusFilter));
  const filteredPublishItems = publishItems.filter((item) => (publishStatusFilter === "all" ? true : item.status === publishStatusFilter));
  const activeSelection = selections.find((selection) => selection.listingId === activeSelectionId) || selections[0];
  const activeDraft = draftStageDrafts.find((draft) => draft.id === activeDraftId) || draftStageDrafts[0] || drafts[0];
  const activeApprovalDraft = approvalDrafts.find((draft) => draft.id === activeApprovalId) || approvalDrafts[0];
  const activePublishItem = filteredPublishItems.find((item) => item.id === activePublishId) || filteredPublishItems[0];
  const usefulWarnings = activeSelection ? activeSelection.warnings.filter(isUsefulSelectorWarning) : [];
  const selectionContextLabel = activeSelection ? getSelectionContextLabel(activeSelection) : null;

  const renderWorkflowStage = () => {
    if (stage === "select") {
      return (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Workflow / Select</div>
              <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
                Select Listings
              </h2>
              <p className="section-note">
                Review ranked candidates, inspect the evidence, and decide what should move into drafting. Evidence comes first. Score stays secondary.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunSelector}
              disabled={selectorRunning}
              className="app-button app-button-primary disabled:opacity-50"
            >
              {selectorRunning ? "Running…" : "Run selector"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-metric-card">
              <div className="label-style mb-1">Candidates</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{selections.length}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Current theme</div>
              <div className="text-2xl font-bold text-amber tabular-nums">{activeSelection?.selectionTheme ?? "n/a"}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Next step</div>
              <div className="text-lg font-bold text-foreground">Send to Draft</div>
              <div className="text-xs text-muted-foreground mt-1">Selection only. Publishing remains out of scope.</div>
            </div>
          </div>

          {selectorLoading && <p className="text-muted-foreground text-sm">Running selector…</p>}
          {!selectorLoading && selections.length === 0 && (
            <div className="border border-border p-6 bg-muted text-sm text-muted-foreground">
              No listings cleared the current Agent V1 threshold. That is an acceptable outcome for this selector.
            </div>
          )}

          {selections.length > 0 && activeSelection && (
            <div className="workflow-layout">
              <aside className="queue-panel">
                <div className="label-style mb-3">Candidate queue</div>
                <div className="space-y-2">
                  {selections.map((selection) => {
                    const isActive = selection.listingId === activeSelection.listingId;
                    return (
                      <button
                        key={selection.listingId}
                        type="button"
                        onClick={() => setActiveSelectionId(selection.listingId)}
                        className={`queue-item ${isActive ? "is-active" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="label-style mb-1">#{selection.rank} · {selection.selectionTheme}</div>
                            <div className="text-sm font-semibold tracking-tight text-foreground line-clamp-2">{selection.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">{selection.locationLabel}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold tabular-nums text-foreground">{selection.totalScore}</div>
                            <div className="text-[11px] text-muted-foreground">{selection.sourceName}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="space-y-5">
                <div className="detail-panel">
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_360px] gap-0">
                    <div className="p-5 space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="label-style mb-1">Rank #{activeSelection.rank} · {activeSelection.selectionTheme}</div>
                          <h3 className="font-sans font-bold text-xl tracking-tight text-foreground">{activeSelection.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeSelection.locationLabel} · {activeSelection.sourceName} · {activeSelection.listingId}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendToDraft(activeSelection.listingId)}
                            disabled={creatingDraftForListingId === activeSelection.listingId}
                            className="app-button app-button-primary disabled:opacity-50"
                          >
                            {creatingDraftForListingId === activeSelection.listingId ? "Sending…" : "Send to Draft"}
                          </button>
                        </div>
                      </div>

                    <div style={{ height: 420 }}>
                      <ImageGallery images={[activeSelection.selectedImage]} width={900} height={420} responsive />
                    </div>

                    <div className="app-surface-subtle p-3">
                      <div className="label-style mb-1">Image review note</div>
                      <p className="text-sm text-foreground m-0 leading-relaxed">
                        This stage currently shows the selected lead image for review, not the full source gallery.
                      </p>
                    </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
                        <div className="space-y-4">
                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-2">Evidence</div>
                            <ul className="space-y-2 text-sm text-foreground m-0 pl-5 leading-relaxed">
                              {activeSelection.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-2">Suggested angle</div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap m-0">
                              {activeSelection.contentAngle}
                            </p>
                          </div>

                          {usefulWarnings.length > 0 && (
                            <div className="app-surface-subtle p-4">
                              <div className="label-style mb-2">Review cautions</div>
                              <ul className="space-y-2 text-sm text-foreground m-0 pl-5 leading-relaxed">
                                {usefulWarnings.map((warning) => (
                                  <li key={warning}>{warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-1">Price</div>
                            <div className="text-base font-bold text-foreground">{activeSelection.priceLabel || "No clear price"}</div>
                          </div>
                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-1">Source</div>
                            {activeSelection.sourceUrl ? (
                              <a href={activeSelection.sourceUrl} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                                Open source listing
                              </a>
                            ) : (
                              <div className="text-sm text-muted-foreground">No source link</div>
                            )}
                          </div>
                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-1">Ranking input</div>
                            <div className="text-sm text-foreground">Theme: {activeSelection.selectionTheme}</div>
                            <div className="text-xl font-bold text-foreground tabular-nums mt-2">{activeSelection.totalScore}</div>
                            <div className="text-xs text-muted-foreground mt-1">Score stays secondary to visible evidence.</div>
                          </div>
                          {selectionContextLabel && (
                            <div className="app-surface-subtle p-4">
                              <div className="label-style mb-1">KazaVerde context</div>
                              <p className="text-sm text-foreground m-0 leading-relaxed">{selectionContextLabel}</p>
                            </div>
                          )}
                          <div className="app-surface-subtle p-4">
                            <div className="label-style mb-2">Score breakdown</div>
                            <div className="space-y-2">
                              {activeSelection.scoreBreakdown.map((part) => (
                                <div key={part.key}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span>{part.label}</span>
                                    <span>{part.score}/{part.maxScore}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 mb-0 leading-relaxed">{part.note}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <aside className="border-l border-border bg-[#f8fafc] p-6 space-y-4">
                      <div>
                        <div className="label-style mb-1">Workflow step</div>
                        <div className="text-base font-bold text-foreground">Select</div>
                        <p className="text-sm text-muted-foreground m-0 mt-1 leading-relaxed">
                          Review evidence first, then decide whether to send this listing into drafting.
                        </p>
                      </div>
                      <div>
                        <div className="label-style mb-1">Current actions</div>
                        <p className="text-sm text-foreground m-0 leading-relaxed">
                          Send to Draft is active. Hold and reject decisions are intentionally deferred in this phase.
                        </p>
                      </div>
                      <div>
                        <div className="label-style mb-1">Deferred</div>
                        <p className="text-sm text-muted-foreground m-0 leading-relaxed">
                          Publish, measurement, and learning remain out of this phase.
                        </p>
                      </div>
                    </aside>
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>
      );
    }

    if (stage === "draft") {
      return (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Workflow / Draft</div>
              <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
                Draft Content
              </h2>
              <p className="section-note">
                Prepare short, factual drafts quickly. Use this stage to move selected listings into approval, not to perfect creative writing.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="app-button app-button-primary disabled:opacity-50"
            >
              {generating ? "Generating…" : "Generate content drafts"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-metric-card">
              <div className="label-style mb-1">Draft stage items</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{draftStageDrafts.length}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">In approval queue</div>
              <div className="text-2xl font-bold text-amber tabular-nums">{pendingCount}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Next step</div>
              <div className="text-lg font-bold text-foreground">Move to Approve</div>
              <div className="text-xs text-muted-foreground mt-1">Approval remains human gated.</div>
            </div>
          </div>

          {loading && <p className="text-muted-foreground text-sm">Loading drafts…</p>}
          {!loading && draftStageDrafts.length === 0 && (
            <div className="border border-border p-6 bg-muted text-sm text-muted-foreground">
              No drafts in the Draft stage. Send a listing to Draft from Select or generate a fresh batch.
            </div>
          )}

          {draftStageDrafts.length > 0 && (
            <div className="workflow-layout">
              <aside className="queue-panel">
                <div className="label-style mb-3">Draft queue</div>
                <div className="space-y-2">
                  {draftStageDrafts.map((draft) => {
                    const isActive = draft.id === activeDraft?.id;
                    return (
                      <button
                        key={draft.id}
                        type="button"
                        onClick={() => setActiveDraftId(draft.id)}
                        className={`queue-item ${isActive ? "is-active" : ""}`}
                      >
                        <div className="label-style mb-1">{draft.status === "revision_requested" ? "Needs revision in Draft" : "Draft ready for review"}</div>
                        <div className="text-sm font-semibold tracking-tight text-foreground line-clamp-2">{draft.listingTitle}</div>
                        <div className="text-xs text-muted-foreground mt-1">{draft.suggestedChannel} · {new Date(draft.createdAt).toLocaleDateString()}</div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {activeDraft && (
                <section className="detail-panel">
                  <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
                    <div className="bg-muted min-h-[260px]">
                      {activeDraft.selectedImage ? (
                        <img
                          src={activeDraft.selectedImage}
                          alt={activeDraft.listingTitle}
                          className="w-full h-full min-h-[260px] object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-full min-h-[260px] flex items-center justify-center text-muted-foreground text-sm font-mono">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="label-style mb-1">Draft stage item</div>
                          <h3 className="font-sans font-bold text-lg tracking-tight text-foreground">{activeDraft.listingTitle}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Listing {activeDraft.sourceListingId} · Created {new Date(activeDraft.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <DraftStatusBadge status={activeDraft.status} />
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
                        <div className="space-y-4">
                          <div>
                            <div className="label-style mb-1">Prepared copy</div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap m-0">
                              {activeDraft.suggestedCaption}
                            </p>
                          </div>
                          <div>
                            <div className="label-style mb-1">Suggested hashtags</div>
                            <p className="text-sm text-foreground m-0 leading-relaxed">
                              {activeDraft.suggestedHashtags.map((tag) => `#${tag}`).join(" ")}
                            </p>
                          </div>
                          {activeDraft.statusNote && (
                            <div>
                              <div className="label-style mb-1">Revision note</div>
                              <p className="text-sm text-foreground whitespace-pre-wrap m-0 leading-relaxed">
                                {activeDraft.statusNote}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Suggested channel</div>
                            <div className="text-base font-bold text-foreground uppercase">{activeDraft.suggestedChannel}</div>
                          </div>
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Workflow step</div>
                            <p className="text-sm text-foreground m-0 leading-relaxed">
                              Review the draft, then move it into the approval queue when it is ready for human approval.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="app-action-row">
                        <button
                          type="button"
                          onClick={() => handleMarkReadyForApproval(activeDraft.id)}
                          disabled={activeDraft.status === "pending" || activeDraft.status === "approved"}
                          className="app-button app-button-primary disabled:opacity-50"
                        >
                          {activeDraft.status === "pending" ? "Already in approval queue" : "Move to Approve"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      );
    }

    if (stage === "publish") {
      return (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="section-kicker mb-2">Workflow / Publish</div>
              <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
                Publish Queue
              </h2>
              <p className="section-note">
                Prepare approved drafts for manual publishing. Freeze approved content, choose a channel, and track manual publish state. No channel integrations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-metric-card">
              <div className="label-style mb-1">Publish items</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{filteredPublishItems.length}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Ready to publish</div>
              <div className="text-2xl font-bold text-amber tabular-nums">{publishItems.filter((item) => item.status === "ready_to_publish").length}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Manual only</div>
              <div className="text-lg font-bold text-foreground">No autoposting</div>
              <div className="text-xs text-muted-foreground mt-1">Use this stage to prepare and record manual posting.</div>
            </div>
          </div>

          <section className="app-surface-subtle p-4">
            <div className="label-style mb-3">Publish filters</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-style block mb-1">Status</label>
                <select
                  value={publishStatusFilter}
                  onChange={(e) => setPublishStatusFilter(e.target.value as PublishItemStatus | "all")}
                  className="app-input font-mono"
                >
                  <option value="ready_to_publish">Ready to publish</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="all">All statuses</option>
                </select>
              </div>
            </div>
          </section>

          {publishLoading && <p className="text-muted-foreground text-sm">Loading publish queue…</p>}
          {!publishLoading && filteredPublishItems.length === 0 && (
            <div className="border border-border p-6 bg-muted text-sm text-muted-foreground">
              No publish items match the current filter. Send an approved draft to Publish from Approve.
            </div>
          )}

          {filteredPublishItems.length > 0 && activePublishItem && (
            <div className="workflow-layout">
              <aside className="queue-panel">
                <div className="label-style mb-3">Publish queue</div>
                <div className="space-y-2">
                  {filteredPublishItems.map((item) => {
                    const isActive = item.id === activePublishItem.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActivePublishId(item.id)}
                        className={`queue-item ${isActive ? "is-active" : ""}`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-bold uppercase tracking-wide text-foreground line-clamp-2">{item.channel} · {item.contentDraftId}</div>
                            <PublishStatusBadge status={item.status} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                            {item.scheduledFor ? ` · ${new Date(item.scheduledFor).toLocaleString()}` : ""}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="detail-panel">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
                  <div className="bg-muted min-h-[260px]">
                    {activePublishItem.selectedImageUrl ? (
                      <img
                        src={activePublishItem.selectedImageUrl}
                        alt={activePublishItem.contentDraftId}
                        className="w-full h-full min-h-[260px] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-full min-h-[260px] flex items-center justify-center text-muted-foreground text-sm font-mono">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="label-style mb-1">Publish setup</div>
                        <h3 className="font-sans font-bold text-lg tracking-tight text-foreground">{activePublishItem.contentDraftId}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Listing {activePublishItem.sourceListingId}</p>
                      </div>
                      <PublishStatusBadge status={activePublishItem.status} />
                    </div>

                    {duplicatePublishWarning && (
                      <div className="app-surface-subtle border border-red/20 bg-red/10 text-red p-3">
                        <div className="label-style mb-1">Duplicate blocked</div>
                        <p className="text-sm m-0 leading-relaxed">{duplicatePublishWarning}</p>
                      </div>
                    )}

                    <div className="app-surface-subtle p-3">
                      <div className="label-style mb-1">Publish rule</div>
                      <p className="text-sm text-muted-foreground m-0 leading-relaxed">
                        Each approved draft can have one publish item per channel. Change channel here only if you want this exact item to own that channel.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
                      <div className="space-y-4">
                        <div>
                          <div className="label-style mb-1">Frozen final copy</div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap m-0">
                            {activePublishItem.finalCopy}
                          </p>
                        </div>

                        {manualPostedMode && (
                          <div className="app-surface-subtle p-4 space-y-3">
                            <div className="label-style mb-1">Confirm manual posting</div>
                            <div>
                              <label className="label-style block mb-1">Published at</label>
                              <input
                                type="datetime-local"
                                value={manualPostedPublishedAt}
                                onChange={(e) => setManualPostedPublishedAt(e.target.value)}
                                className="app-input font-mono"
                              />
                            </div>
                            <div>
                              <label className="label-style block mb-1">Post URL</label>
                              <input
                                type="url"
                                value={manualPostedUrl}
                                onChange={(e) => setManualPostedUrl(e.target.value)}
                                className="app-input font-mono"
                                placeholder="https://..."
                              />
                            </div>
                            {manualPostedError && <p className="text-sm text-red m-0">{manualPostedError}</p>}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfirmManualPosted(activePublishItem)}
                                disabled={publishSaving}
                                className="app-button app-button-success disabled:opacity-50"
                              >
                                {publishSaving ? "Saving…" : "Confirm manually posted"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setManualPostedMode(false);
                                  setManualPostedError(null);
                                }}
                                className="app-button"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="label-style block mb-1">Channel</label>
                          <select
                            value={publishFormChannel}
                            onChange={(e) => setPublishFormChannel(e.target.value as PublishChannel)}
                            disabled={activePublishItem.status === "published" || activePublishItem.status === "failed" || activePublishItem.status === "cancelled"}
                            className="app-input font-mono disabled:opacity-60"
                          >
                            <option value="instagram">instagram</option>
                            <option value="facebook">facebook</option>
                            <option value="linkedin">linkedin</option>
                            <option value="blog">blog</option>
                            <option value="other">other</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-style block mb-1">Publish mode</label>
                          <select
                            value={publishFormMode}
                            onChange={(e) => setPublishFormMode(e.target.value as "publish_now" | "schedule_later")}
                            disabled={activePublishItem.status === "published" || activePublishItem.status === "failed" || activePublishItem.status === "cancelled"}
                            className="app-input font-mono disabled:opacity-60"
                          >
                            <option value="publish_now">publish_now</option>
                            <option value="schedule_later">schedule_later</option>
                          </select>
                        </div>
                        {publishFormMode === "schedule_later" && (
                          <div>
                            <label className="label-style block mb-1">Scheduled for</label>
                            <input
                              type="datetime-local"
                              value={publishFormScheduledFor}
                              onChange={(e) => setPublishFormScheduledFor(e.target.value)}
                              disabled={activePublishItem.status === "published" || activePublishItem.status === "failed" || activePublishItem.status === "cancelled"}
                              className="app-input font-mono disabled:opacity-60"
                            />
                          </div>
                        )}
                        <div>
                          <label className="label-style block mb-1">Operator notes</label>
                          <textarea
                            value={publishFormOperatorNotes}
                            onChange={(e) => setPublishFormOperatorNotes(e.target.value)}
                            disabled={activePublishItem.status === "published" || activePublishItem.status === "failed" || activePublishItem.status === "cancelled"}
                            className="app-input font-mono min-h-[100px] disabled:opacity-60"
                          />
                        </div>
                        {activePublishItem.publishedAt && (
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Published at</div>
                            <div className="text-sm text-foreground">{new Date(activePublishItem.publishedAt).toLocaleString()}</div>
                          </div>
                        )}
                        {activePublishItem.postUrl && (
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Post URL</div>
                            <a href={activePublishItem.postUrl} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                              {activePublishItem.postUrl}
                            </a>
                          </div>
                        )}
                        {activePublishItem.status === "published" && (
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Read-only state</div>
                            <p className="text-sm text-muted-foreground m-0 leading-relaxed">
                              This item is locked because manual posting has been recorded.
                            </p>
                          </div>
                        )}
                        {activePublishItem.status === "failed" && (
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Read-only state</div>
                            <p className="text-sm text-muted-foreground m-0 leading-relaxed">
                              This item is locked after being marked as failed. Create a new path later only if the publishing decision changes.
                            </p>
                          </div>
                        )}
                        {activePublishItem.status === "cancelled" && (
                          <div className="app-surface-subtle p-3">
                            <div className="label-style mb-1">Read-only state</div>
                            <p className="text-sm text-muted-foreground m-0 leading-relaxed">
                              This item is locked after cancellation. Reopen the workflow from Approve if publishing should resume later.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="app-action-row mt-5">
                      <button
                        type="button"
                        onClick={() =>
                          handlePublishSetupSave(activePublishItem, {
                            channel: publishFormChannel,
                            publishMode: publishFormMode,
                            scheduledFor: publishFormScheduledFor,
                            operatorNotes: publishFormOperatorNotes,
                          })
                        }
                        disabled={
                          publishSaving ||
                          activePublishItem.status === "published" ||
                          activePublishItem.status === "failed" ||
                          activePublishItem.status === "cancelled" ||
                          (publishFormMode === "schedule_later" && !publishFormScheduledFor)
                        }
                        className="app-button disabled:opacity-50"
                      >
                        {publishSaving ? "Saving…" : "Save publish setup"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activePublishItem.status === "ready_to_publish" || activePublishItem.status === "scheduled") {
                            handleOpenManualPosted(activePublishItem);
                          }
                        }}
                        disabled={!(activePublishItem.status === "ready_to_publish" || activePublishItem.status === "scheduled")}
                        className={`app-button ${
                          activePublishItem.status === "scheduled" ? "app-button-success" : "app-button-primary"
                        } disabled:opacity-50`}
                      >
                        {activePublishItem.status === "scheduled" ? "Mark manually posted" : "Record manual publish now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishStatusAction(activePublishItem.id, "failed")}
                        disabled={publishSaving || !(activePublishItem.status === "ready_to_publish" || activePublishItem.status === "scheduled")}
                        className="app-button app-button-danger disabled:opacity-50"
                      >
                        Mark failed
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishStatusAction(activePublishItem.id, "cancelled")}
                        disabled={publishSaving || !(activePublishItem.status === "ready_to_publish" || activePublishItem.status === "scheduled")}
                        className="app-button disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </section>
      );
    }

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-kicker mb-2">Workflow / Approve</div>
            <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
              Approve Drafts
            </h2>
            <p className="section-note">
              Human gate before any publish step. Review the draft, asset, and revision note, then approve, request revision, or reject.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="app-metric-card">
              <div className="label-style mb-1">Approval queue</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">{approvalDrafts.length}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">In approval queue</div>
              <div className="text-2xl font-bold text-amber tabular-nums">{pendingCount}</div>
            </div>
            <div className="app-metric-card">
              <div className="label-style mb-1">Next step</div>
              <div className="text-lg font-bold text-foreground">Approve, then send to Publish</div>
              <div className="text-xs text-muted-foreground mt-1">Publish setup is manual. No posting integrations.</div>
            </div>
        </div>

        <section className="app-surface-subtle p-4">
          <div className="label-style mb-3">Approval filters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-style block mb-1">Status</label>
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value as ContentDraftStatus | "all")}
                className="app-input font-mono"
              >
                <option value="pending">In approval queue</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revision_requested">Revision requested</option>
                <option value="all">All statuses</option>
              </select>
            </div>
          </div>
        </section>

        {loading && <p className="text-muted-foreground text-sm">Loading approvals…</p>}
        {!loading && approvalDrafts.length === 0 && (
          <div className="border border-border p-6 bg-muted text-sm text-muted-foreground">
            No drafts match the current approval filter.
          </div>
        )}

        {approvalDrafts.length > 0 && activeApprovalDraft && (
          <div className="workflow-layout">
            <aside className="queue-panel">
              <div className="label-style mb-3">Approval queue</div>
              <div className="space-y-2">
                {approvalDrafts.map((draft) => {
                  const isActive = draft.id === activeApprovalDraft.id;
                  return (
                    <button
                      key={draft.id}
                      type="button"
                      onClick={() => setActiveApprovalId(draft.id)}
                      className={`queue-item ${isActive ? "is-active" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold tracking-tight text-foreground line-clamp-2">{draft.listingTitle}</div>
                          <div className="text-xs text-muted-foreground mt-1">{new Date(draft.createdAt).toLocaleDateString()}</div>
                        </div>
                        <DraftStatusBadge status={draft.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="detail-panel">
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
                <div className="bg-muted min-h-[260px]">
                  {activeApprovalDraft.selectedImage ? (
                    <img
                      src={activeApprovalDraft.selectedImage}
                      alt={activeApprovalDraft.listingTitle}
                      className="w-full h-full min-h-[260px] object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-full min-h-[260px] flex items-center justify-center text-muted-foreground text-sm font-mono">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="label-style mb-1">Approval review</div>
                      <h3 className="font-sans font-bold text-lg tracking-tight text-foreground">{activeApprovalDraft.listingTitle}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Listing {activeApprovalDraft.sourceListingId}</p>
                    </div>
                    <DraftStatusBadge status={activeApprovalDraft.status} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-5">
                    <div className="space-y-4">
                      <div>
                        <div className="label-style mb-1">Final draft copy</div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap m-0">
                          {activeApprovalDraft.suggestedCaption}
                        </p>
                      </div>
                      <div>
                        <div className="label-style mb-1">Suggested hashtags</div>
                        <p className="text-sm text-foreground m-0 leading-relaxed">
                          {activeApprovalDraft.suggestedHashtags.map((tag) => `#${tag}`).join(" ")}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="app-surface-subtle p-3">
                        <div className="label-style mb-1">Suggested channel</div>
                        <div className="text-base font-bold text-foreground uppercase">{activeApprovalDraft.suggestedChannel}</div>
                      </div>
                      {activeApprovalDraft.statusNote && (
                        <div className="app-surface-subtle p-3">
                          <div className="label-style mb-1">Revision note</div>
                          <p className="text-sm text-foreground whitespace-pre-wrap m-0 leading-relaxed">
                            {activeApprovalDraft.statusNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="app-action-row mt-5">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(activeApprovalDraft.id, "approved")}
                      className="app-button app-button-success"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(activeApprovalDraft.id, "rejected")}
                      className="app-button app-button-danger"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(activeApprovalDraft.id, "revision_requested")}
                      className="app-button"
                    >
                      Request revision
                    </button>
                    {activeApprovalDraft.status === "approved" && (
                      <button
                        type="button"
                        onClick={() => handleSendToPublish(activeApprovalDraft.id)}
                        disabled={publishSaving}
                        className="app-button app-button-primary disabled:opacity-50"
                      >
                        {publishSaving ? "Opening…" : "Send to Publish"}
                      </button>
                    )}
                    {activeApprovalDraft.status !== "approved" && (
                      <button
                        type="button"
                        disabled
                        className="app-button app-button-primary disabled:opacity-50"
                      >
                        Send to Publish
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div>
          <div className="section-kicker mb-2">Agents</div>
          <h2 className="font-sans font-black text-2xl sm:text-3xl tracking-tight text-foreground mb-1">
            Operator Workflow
          </h2>
          <p className="section-note">
            Use the workflow stages to move listings from selection into drafts and human approval. Eval and Agent Map stay visible as separate support surfaces.
          </p>
        </div>

        <WorkflowFeedbackBanner message={workflowFeedback} />

        <div className="app-subnav">
          {([
            ["workflow", "Workflow"],
            ["eval", "Selector Eval"],
            ["map", "Agent Map"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSubnav(value);
                setWorkflowFeedback(null);
              }}
              className={`app-subnav-button ${subnav === value ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        {subnav === "workflow" && (
          <div className="app-subnav">
            {([
              ["select", "Select"],
              ["draft", "Draft"],
              ["approve", "Approve"],
              ["publish", "Publish"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStage(value);
                  setWorkflowFeedback(null);
                }}
                className={`app-subnav-button ${stage === value ? "is-active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>

      {subnav === "workflow" && renderWorkflowStage()}
      {subnav === "eval" && <SelectorEvalView />}
      {subnav === "map" && <AgentMapView />}
    </div>
  );
}

// ============================================
// DASHBOARD VIEW — Data health + Sync + Source quality
// ============================================

/** Optional GitHub Actions URL for "Latest sync logs" link. Set in env or leave empty. */
const GITHUB_ACTIONS_URL = import.meta.env.VITE_GITHUB_ACTIONS_URL ?? "";

type SourceQualitySortKey = "sourceName" | "marketId" | "listing_count" | "approved_pct" | "with_image_pct" | "with_price_pct" | "grade";

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
      <div className="py-12 text-muted-foreground font-mono">
        Loading dashboard…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-foreground font-mono">
        Failed to load dashboard. Ensure Supabase RPC <code className="bg-muted px-1">get_source_quality_stats</code> exists (see docs/supabase_rpc.sql).
      </div>
    );
  }

  const worst = stats.sourceRows.filter((r) => r.grade === "D" || r.grade === "C").slice(0, 5);
  const best = stats.sourceRows.filter((r) => r.grade === "A" || r.grade === "B").slice(-5).reverse();
  const approvedPct = stats.totalListings > 0 ? Math.round((100 * stats.approvedCount) / stats.totalListings) : 0;
  const healthLabel = approvedPct >= 70 ? "Good" : approvedPct >= 40 ? "Acceptable" : "Needs attention";

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
    <div className="space-y-10">
      {/* ── Data health ───────────────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Data health
        </h2>
        <p className="label-style mb-6">
          Overview of data quality and sources
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Total listings</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">
              {stats.totalListings.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Approved (visible)</div>
            <div className="text-2xl font-bold text-green tabular-nums">
              {stats.approvedCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Sources</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{stats.sourceCount}</div>
          </div>
          <div className="bg-muted border border-foreground brutalist-shadow-sm p-4">
            <div className="label-style mb-1">Markets</div>
            <div className="text-2xl font-bold text-foreground tabular-nums">{stats.marketCount}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center mb-2">
          <span className="label-style">Overall health status:</span>
          <span
            className={
              approvedPct >= 70
                ? "bg-green text-primary-foreground px-3 py-1 text-sm font-bold uppercase"
                : approvedPct >= 40
                  ? "bg-amber text-foreground px-3 py-1 text-sm font-bold uppercase"
                  : "bg-red text-primary-foreground px-3 py-1 text-sm font-bold uppercase"
            }
          >
            {healthLabel}
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            ({approvedPct}% approved)
          </span>
        </div>

        {/* Need attention / Performing well */}
        {(worst.length > 0 || best.length > 0) && (
          <div className="flex flex-wrap gap-4 mt-4">
            {worst.length > 0 && (
              <div className="flex-1 min-w-[200px] border border-foreground brutalist-shadow-sm p-4 bg-amber/10">
                <div className="label-style text-amber mb-2">Needs attention</div>
                <p className="text-foreground text-sm font-mono">
                  {worst.map((r) => r.sourceName).join(", ")}
                </p>
              </div>
            )}
            {best.length > 0 && (
              <div className="flex-1 min-w-[200px] border border-foreground brutalist-shadow-sm p-4 bg-green/10">
                <div className="label-style text-green mb-2">Performing well</div>
                <p className="text-foreground text-sm font-mono">
                  {best.map((r) => r.sourceName).join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Latest sync logs ───────────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground mb-1">
          Latest sync logs
        </h2>
        <p className="label-style mb-4">
          Latest runs and sync status
        </p>
        <div className="border border-foreground brutalist-shadow-sm p-4 bg-muted">
          <p className="text-muted-foreground text-sm mb-2">
            Last synced:{" "}
            <span className="text-foreground font-mono">
              {latestSync?.at
                ? new Date(latestSync.at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
            {latestSync && (
              <span className="text-muted-foreground text-xs ml-2">
                ({latestSync.marketName}: {latestSync.totalListings} total, {latestSync.visibleCount} visible)
              </span>
            )}
          </p>
          {latestSync && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <RunPhaseBadge latestSync={latestSync} />
              {latestSync.runPhase && (
                <span className="text-muted-foreground text-xs font-mono">
                  {latestSync.runPhase}
                </span>
              )}
            </div>
          )}
          {!latestSync && (
            <p className="text-muted-foreground text-xs mb-2">
              Runs are logged in CI/CD. Serve the app with <code className="bg-background px-1">artifacts/cv_ingest_report.json</code> in place to see last sync from the report.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={handleExportRunReport}
              disabled={exportingRunReport || !latestSync}
              className="border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingRunReport ? "Exporting…" : "Export run report (JSON)"}
            </button>
            {GITHUB_ACTIONS_URL && (
              <a
                href={GITHUB_ACTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors"
              >
                Open GitHub Actions →
              </a>
            )}
          </div>
          {!GITHUB_ACTIONS_URL && (
            <p className="text-muted-foreground text-xs mt-2">
              Set <code className="bg-background px-1">VITE_GITHUB_ACTIONS_URL</code> to link to run history.
            </p>
          )}
        </div>
      </section>

      {/* ── Source quality table ───────────────────────────────────── */}
      <section>
        <h2 className="font-sans font-black text-xl sm:text-2xl uppercase tracking-tight text-foreground mb-1">
          Source quality
        </h2>
        <p className="label-style mb-4">
          Per source: count, approved %, images, prices, grade
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                {(
                  [
                    { key: "sourceName" as const, label: "Source" },
                    { key: "marketId" as const, label: "Market" },
                    { key: "listing_count" as const, label: "Count" },
                    { key: "approved_pct" as const, label: "Approved %" },
                    { key: "with_image_pct" as const, label: "With image %" },
                    { key: "with_price_pct" as const, label: "With price %" },
                    { key: "grade" as const, label: "Grade" },
                  ] as const
                ).map(({ key, label }) => (
                  <th key={key} className="text-left py-2 px-3">
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="label-style w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {label}
                      {sortKey === key && (
                        <span className="text-foreground" aria-hidden>
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedSourceRows.map((r: SourceQualityRow) => (
                <tr key={r.source_id} className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3 font-medium text-foreground">{r.sourceName}</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.marketId}</td>
                  <td className="py-2 px-3 text-muted-foreground tabular-nums">
                    {Number(r.listing_count).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{r.approved_pct}%</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.with_image_pct}%</td>
                  <td className="py-2 px-3 text-muted-foreground">{r.with_price_pct}%</td>
                  <td className="py-2 px-3">
                    <GradeBadge grade={r.grade} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {stats.sourceRows.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">
            No source data. Run the SQL in <code className="bg-muted px-1">docs/supabase_rpc.sql</code> in Supabase.
          </p>
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
      style={{
        background: "#16213e",
        borderRadius: 12,
        overflow: "hidden",
        width: 280,
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
        transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
      }}
    >
      <ImageGallery images={listing.images} width={280} height={190} />

      <div style={{ padding: "12px 14px" }}>
        {/* Property type badge */}
        {listing.property_type && (
          <span
            style={{
              background: "#0f3460",
              color: "#7ec8e3",
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              textTransform: "uppercase",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {listing.property_type}
          </span>
        )}

        {/* Title */}
        <div
          style={{
            color: "#e8e8e8",
            fontWeight: 600,
            fontSize: 14,
            marginTop: 6,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {listing.title || "[No title]"}
        </div>

        {/* Location */}
        {listing.location && (
          <div style={{ color: "#888", fontSize: 12, marginTop: 2 }}>
            {listing.location}
          </div>
        )}

        {/* Price */}
        <div
          style={{
            color: "#7ec8e3",
            fontSize: 18,
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {formatPrice(listing.price, listing.currency)}
        </div>

        {/* Specs row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
            color: "#999",
            fontSize: 12,
          }}
        >
          {listing.bedrooms != null && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms != null && <span>{listing.bathrooms} bath</span>}
          {listing.area_sqm != null && (
            <span>{Math.round(listing.area_sqm)} m&sup2;</span>
          )}
          {!listing.bedrooms && !listing.bathrooms && !listing.area_sqm && (
            <span style={{ color: "#555" }}>No specs</span>
          )}
        </div>

        {/* Source */}
        <div
          style={{
            color: "#555",
            fontSize: 11,
            marginTop: 8,
            borderTop: "1px solid #1a1a3e",
            paddingTop: 8,
          }}
        >
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
  { key: "grade", label: "Grade" },
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

  const inputCls = "bg-background border border-foreground text-foreground px-3 py-2 text-sm font-mono w-full";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
            Listings
          </h2>
          <p className="label-style">
            Browse by market. Server-side pagination.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
            className="border border-foreground px-4 py-2 text-sm font-mono hover:bg-foreground hover:text-background transition-colors"
          >
            Clear filters
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting}
              className="border border-foreground px-4 py-2 text-sm font-mono hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "Export report"}
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[220px] border border-foreground bg-background py-1">
                  <button
                    type="button"
                    onClick={handleExportPage}
                    className="block w-full px-4 py-2 text-left text-sm font-mono hover:bg-muted"
                  >
                    This page (CSV)
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="block w-full px-4 py-2 text-left text-sm font-mono hover:bg-muted"
                  >
                    All matching, max {EXPORT_ALL_MAX.toLocaleString()} (CSV)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border border-border bg-muted/30 p-4 mb-6">
        <div className="label-style mb-3">Filters</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="label-style block mb-1">Market</label>
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
            <label className="label-style block mb-1">Source</label>
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
            <label className="label-style block mb-1">Display prices in</label>
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
            <label className="label-style block mb-1">Approved</label>
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
          </div>
          <div>
            <label className="label-style block mb-1">Updated from</label>
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
            <label className="label-style block mb-1">Updated to</label>
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
            <label className="label-style block mb-1">Title search</label>
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
            <label className="label-style block mb-1">Price min</label>
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
            <label className="label-style block mb-1">Price max</label>
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
            <label className="label-style block mb-1">Island</label>
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
            <label className="label-style block mb-1">City</label>
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
            <label className="label-style block mb-1">Beds min</label>
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
            <label className="label-style block mb-1">Baths min</label>
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
            <label className="label-style block mb-1">Area min (m²)</label>
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
            <label className="label-style block mb-1">Area max (m²)</label>
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

      {loading && <p className="text-muted-foreground text-sm mb-4">Loading…</p>}

      {!loading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {LISTINGS_COLUMNS.map(({ key, label }) =>
                    key === "photo" || key === "grade" || key === "action" ? (
                      <th key={key} className="text-left py-2 px-3 label-style">
                        {label}
                      </th>
                    ) : (
                      <th key={key} className="text-left py-2 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort(key)}
                          className="label-style w-full text-left flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {label}
                          {sortBy === key && (
                            <span className="text-foreground" aria-hidden>
                              {sortDir === "asc" ? "↑" : "↓"}
                            </span>
                          )}
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
                    className="border-b border-border cursor-pointer hover:bg-muted/50"
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
                          className="w-12 h-9 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-foreground max-w-[220px] truncate">
                      {l.title || "[No title]"}
                    </td>
                    <td className="py-2 px-3 text-foreground font-medium">
                      {formatPrice(l.price, l.currency, displayCurrency)}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{l.island ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.city ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.bedrooms ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.bathrooms ?? "—"}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {l.area_sqm != null ? Math.round(l.area_sqm) + " m²" : "—"}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground text-sm">{l.sourceName}</td>
                    <td className="py-2 px-3">
                      {gradeBySourceId.get(l.sourceId) ? (
                        <GradeBadge grade={gradeBySourceId.get(l.sourceId)!} />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
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
                        className="border border-foreground px-2 py-1 text-xs font-mono hover:bg-foreground hover:text-background transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-foreground px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground hover:text-background transition-colors"
            >
              Previous
            </button>
            <span className="text-muted-foreground text-sm tabular-nums">
              Page {page} of {totalPages} · {result.totalCount.toLocaleString()} total
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-foreground px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foreground hover:text-background transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}

      {detailLoading && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center text-background font-mono">
          Loading listing…
        </div>
      )}
    </div>
  );
}

// ============================================
// SOURCES — All sources per country / market
// ============================================

function SourcesView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="py-12 text-muted-foreground font-mono">
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
  const marketIds = [...byMarket.keys()].sort((a, b) => {
    const nameA = marketNameById.get(a) ?? a;
    const nameB = marketNameById.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Sources
        </h2>
        <p className="label-style mb-6">
          All sources by country / market. Listings count, approval, image and price coverage, grade.
        </p>
      </section>

      {marketIds.map((marketId) => {
        const rows = byMarket.get(marketId)!;
        const marketName = marketNameById.get(marketId) ?? marketId;
        const totalListings = rows.reduce((acc, r) => acc + Number(r.listing_count), 0);
        return (
          <section key={marketId} className="border border-foreground brutalist-shadow-sm overflow-hidden">
            <div className="bg-muted border-b border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground">
                {marketName} ({marketId})
              </h3>
              <span className="label-style tabular-nums">
                {rows.length} source{rows.length !== 1 ? "s" : ""} · {totalListings.toLocaleString()} listings
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-2 px-3 label-style">Source</th>
                    <th className="text-right py-2 px-3 label-style">Listings</th>
                    <th className="text-right py-2 px-3 label-style">Approved %</th>
                    <th className="text-right py-2 px-3 label-style">With image %</th>
                    <th className="text-right py-2 px-3 label-style">With price %</th>
                    <th className="text-left py-2 px-3 label-style">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .sort((a, b) => Number(b.listing_count) - Number(a.listing_count))
                    .map((r) => (
                      <tr key={r.source_id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-foreground">{r.sourceName}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                          {Number(r.listing_count).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.approved_pct}%</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.with_image_pct}%</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{r.with_price_pct}%</td>
                        <td className="py-2 px-3">
                          <GradeBadge grade={r.grade} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {marketIds.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No source data. Ensure Supabase RPC <code className="bg-muted px-1">get_source_quality_stats</code> exists.
        </p>
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
      <div className="py-12 text-muted-foreground font-mono">
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
  const lowApproved = rows.filter((r) => r.approved_pct < 50);
  const gradeD = rows.filter((r) => r.grade === "D");
  const gradeC = rows.filter((r) => r.grade === "C");
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
  const singleSourceMarkets = [...byMarket.entries()].filter(([, v]) => v.sources === 1).map(([k]) => k);

  const totalWithImage = rows.reduce((acc, r) => acc + (r.with_image_pct / 100) * Number(r.listing_count), 0);
  const totalWithPrice = rows.reduce((acc, r) => acc + (r.with_price_pct / 100) * Number(r.listing_count), 0);
  const globalImagePct = stats.totalListings > 0 ? (100 * totalWithImage) / stats.totalListings : 0;
  const globalPricePct = stats.totalListings > 0 ? (100 * totalWithPrice) / stats.totalListings : 0;

  const worstImage = rows.length ? rows.reduce((a, b) => (a.with_image_pct <= b.with_image_pct ? a : b)) : null;
  const worstPrice = rows.length ? rows.reduce((a, b) => (a.with_price_pct <= b.with_price_pct ? a : b)) : null;
  const bestApproved = rows.length ? rows.reduce((a, b) => (a.approved_pct >= b.approved_pct ? a : b)) : null;

  const flagCount =
    (syncStale ? 1 : 0) +
    (syncMissing ? 1 : 0) +
    gradeD.length +
    (noImages.length ? 1 : 0) +
    (noPrice.length ? 1 : 0) +
    (singleSourceMarkets.length ? 1 : 0);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-sans font-black text-2xl sm:text-3xl uppercase tracking-tight text-foreground mb-1">
          Stats
        </h2>
        <p className="label-style mb-6">
          Developer-focused metrics and red flags
        </p>
      </section>

      {/* Pulse & sync */}
      <section className="border border-foreground brutalist-shadow-sm p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Pulse
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="label-style mb-1">Last sync</div>
            <div className="font-mono text-foreground">
              {latestSync?.at
                ? new Date(latestSync.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </div>
            {latestSync && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <RunPhaseBadge latestSync={latestSync} />
                {latestSync.runPhase && (
                  <span className="text-muted-foreground text-xs font-mono">
                    {latestSync.runPhase}
                  </span>
                )}
              </div>
            )}
            {syncMissing && (
              <p className="text-amber text-xs mt-1 font-mono">⚠ No sync report (serve cv_ingest_report.json for timestamp)</p>
            )}
            {syncStale && syncAt && (
              <p className="text-amber text-xs mt-1 font-mono">
                ⚠ Stale: {Math.round(syncAgeMinutes! / (60 * 24))} days ago
              </p>
            )}
          </div>
          <div>
            <div className="label-style mb-1">Overall approval rate</div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${approvedPct >= 70 ? "text-green" : approvedPct >= 40 ? "text-amber" : "text-red"}`}>
              {approvedPct.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="label-style mb-1">Red-flag count</div>
            <div className={`font-mono text-2xl font-bold tabular-nums ${flagCount === 0 ? "text-green" : flagCount <= 3 ? "text-amber" : "text-red"}`}>
              {flagCount}
            </div>
          </div>
        </div>
      </section>

      {/* Red flags */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Red flags & warnings
        </h3>
        <div className="space-y-3">
          {syncMissing && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Sync</span> — No ingest report loaded. Last sync time unknown.
            </div>
          )}
          {syncStale && !syncMissing && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Stale sync</span> — Last sync &gt; 3 days ago. Consider re-running the pipeline.
            </div>
          )}
          {gradeD.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">Grade D</span> — {gradeD.length} source(s): {gradeD.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {gradeC.length > 0 && gradeC.length <= 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Grade C</span> — {gradeC.length} source(s): {gradeC.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {gradeC.length > 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Grade C</span> — {gradeC.length} sources (review source quality table)
            </div>
          )}
          {noImages.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">&lt;10% with image</span> — {noImages.length} source(s): {noImages.slice(0, 5).map((r) => r.sourceName).join(", ")}
              {noImages.length > 5 && ` +${noImages.length - 5} more`}
            </div>
          )}
          {noPrice.length > 0 && (
            <div className="border-l-4 border-red bg-red/10 p-3 font-mono text-sm">
              <span className="text-red font-bold">&lt;10% with price</span> — {noPrice.length} source(s): {noPrice.slice(0, 5).map((r) => r.sourceName).join(", ")}
              {noPrice.length > 5 && ` +${noPrice.length - 5} more`}
            </div>
          )}
          {lowApproved.length > 0 && lowApproved.length <= 5 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">&lt;50% approved</span> — {lowApproved.map((r) => r.sourceName).join(", ")}
            </div>
          )}
          {singleSourceMarkets.length > 0 && (
            <div className="border-l-4 border-amber bg-amber/10 p-3 font-mono text-sm">
              <span className="text-amber font-bold">Single-source market</span> — {singleSourceMarkets.join(", ")}. No redundancy if source fails.
            </div>
          )}
          {flagCount === 0 && (
            <div className="border-l-4 border-green bg-green/10 p-3 font-mono text-sm text-green">
              No red flags or warnings.
            </div>
          )}
        </div>
      </section>

      {/* Grade distribution */}
      <section className="border border-border p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Grade distribution
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {(["A", "B", "C", "D"] as const).map((g) => (
            <div key={g} className="flex flex-col items-center gap-1">
              <div
                className={`w-14 font-mono text-2xl font-bold tabular-nums ${
                  g === "A" ? "text-green" : g === "B" ? "text-green/80" : g === "C" ? "text-amber" : "text-red"
                }`}
              >
                {gradeCounts[g] ?? 0}
              </div>
              <div
                className={`w-14 border border-foreground ${
                  g === "A" ? "bg-green" : g === "B" ? "bg-green/70" : g === "C" ? "bg-amber" : "bg-red"
                }`}
                style={{ height: `${Math.max(20, (gradeCounts[g] ?? 0) * 16)}px` }}
              />
              <span className="label-style">Grade {g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* By market */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          By market
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 label-style">Market</th>
                <th className="text-right py-2 px-3 label-style">Listings</th>
                <th className="text-right py-2 px-3 label-style">Sources</th>
                <th className="text-right py-2 px-3 label-style">Approved %</th>
                <th className="text-left py-2 px-3 label-style">Worst grade</th>
              </tr>
            </thead>
            <tbody>
              {[...byMarket.entries()]
                .sort((a, b) => b[1].listings - a[1].listings)
                .map(([marketId, v]) => {
                  const avgApproved = v.listings > 0 ? (100 * v.approvedSum) / v.listings : 0;
                  const worstGrade = ["D", "C", "B", "A"][v.worstGrade - 1] as "A" | "B" | "C" | "D";
                  return (
                    <tr key={marketId} className="border-b border-border hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{marketId.toUpperCase()}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{v.listings.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{v.sources}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{avgApproved.toFixed(1)}%</td>
                      <td className="py-2 px-3">
                        <GradeBadge grade={worstGrade} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data quality snapshot */}
      <section className="border border-border p-6 bg-muted">
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Data quality snapshot
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="label-style mb-1">Listings with image</div>
            <div className="font-mono text-xl font-bold tabular-nums">{globalImagePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Listings with price</div>
            <div className="font-mono text-xl font-bold tabular-nums">{globalPricePct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Approved (visible)</div>
            <div className="font-mono text-xl font-bold tabular-nums">{approvedPct.toFixed(1)}%</div>
          </div>
          <div>
            <div className="label-style mb-1">Total listings</div>
            <div className="font-mono text-xl font-bold tabular-nums">{stats.totalListings.toLocaleString()}</div>
          </div>
        </div>
      </section>

      {/* Outliers */}
      <section>
        <h3 className="font-sans font-bold text-lg uppercase tracking-tight text-foreground mb-4">
          Outliers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-sm">
          {bestApproved && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Best approval rate</span>
              <span className="text-foreground font-medium">{bestApproved.sourceName}</span>
              <span className="text-green ml-2">{bestApproved.approved_pct.toFixed(1)}%</span>
            </div>
          )}
          {worstImage && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Lowest image coverage</span>
              <span className="text-foreground font-medium">{worstImage.sourceName}</span>
              <span className="text-red ml-2">{worstImage.with_image_pct.toFixed(1)}%</span>
            </div>
          )}
          {worstPrice && (
            <div className="border border-border p-3 bg-muted">
              <span className="label-style block mb-1">Lowest price coverage</span>
              <span className="text-foreground font-medium">{worstPrice.sourceName}</span>
              <span className="text-red ml-2">{worstPrice.with_price_pct.toFixed(1)}%</span>
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
      <h1 style={{ color: "#e8e8e8", marginBottom: 4 }}>AFRICA PROPERTY INDEX</h1>
      <p style={{ color: "#555", fontSize: 13, marginTop: 0 }}>
        Pan-African Real Estate Index
      </p>
      <hr style={{ borderColor: "#222" }} />
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 700 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            {["Market", "Status", "Sources", "Listings", ""].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  color: "#888",
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
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
              style={{ borderBottom: "1px solid #1a1a2e", cursor: "pointer" }}
              onClick={() => onSelect(m.id)}
            >
              <td style={{ padding: "12px 14px", color: "#e8e8e8", fontWeight: 500 }}>
                {m.name}
              </td>
              <td style={{ padding: "12px 14px" }}>
                <StatusBadge status={m.status} />
              </td>
              <td style={{ padding: "12px 14px", color: "#bbb" }}>{m.sources.length}</td>
              <td style={{ padding: "12px 14px", color: "#bbb" }}>{m.listings.length}</td>
              <td style={{ padding: "12px 14px" }}>
                <button
                  onClick={() => onSelect(m.id)}
                  style={{
                    background: "#0f3460",
                    color: "#7ec8e3",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// SOURCE TABLE
// ============================================

function SourceTable({ sources }: { sources: Source[] }) {
  return (
    <div>
      <h3 style={{ color: "#e8e8e8" }}>Sources ({sources.length})</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            {["Name", "Status", "Scrapes", "Repairs", "Error"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  color: "#888",
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1a1a2e" }}>
              <td style={{ padding: "8px 12px", color: "#ccc", fontSize: 13 }}>{s.name}</td>
              <td style={{ padding: "8px 12px" }}>
                <StatusBadge status={s.state.status} />
              </td>
              <td style={{ padding: "8px 12px", color: "#bbb", fontSize: 13 }}>
                {s.state.scrapeAttempts}
              </td>
              <td style={{ padding: "8px 12px", color: "#bbb", fontSize: 13 }}>
                {s.state.repairAttempts}
              </td>
              <td
                style={{
                  padding: "8px 12px",
                  color: s.state.lastError ? "#ef4444" : "#555",
                  fontSize: 12,
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <div>{s.state.lastError || "-"}</div>
                {s.state.pauseReason && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    pause: {s.state.pauseReason}
                  </div>
                )}
                {s.state.pauseDetail && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.pauseDetail}
                  </div>
                )}
                {s.state.lastErrorClass && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    class: {s.state.lastErrorClass}
                  </div>
                )}
                {s.state.lastSeenAt && (
                  <div style={{ color: "#888", fontSize: 11, marginTop: 4 }}>
                    seen: {s.state.lastSeenAt}
                  </div>
                )}
                {s.state.consecutiveFailureCount && s.state.consecutiveFailureCount > 0 && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.consecutiveFailureCount} consecutive parser failure{s.state.consecutiveFailureCount === 1 ? "" : "s"}
                  </div>
                )}
                {s.state.debugErrors && s.state.debugErrors.length > 0 && (
                  <div style={{ color: "#f59e0b", fontSize: 11, marginTop: 4 }}>
                    {s.state.debugErrors.length} debug error{s.state.debugErrors.length === 1 ? "" : "s"}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, marginBottom: 20 }}>
      <h4 style={{ color: "#e8e8e8", marginTop: 0, marginBottom: 12 }}>Filters</h4>
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#bbb", fontSize: 13 }}>
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
          background: "#333",
          color: "#ccc",
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
  background: "#0f0f1a",
  border: "1px solid #333",
  color: "#e8e8e8",
  padding: "8px 10px",
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
          className="border border-foreground px-4 py-2 text-sm font-mono text-foreground hover:bg-foreground hover:text-background transition-colors"
        >
          ← Back to list
        </button>
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold text-foreground">
            {formatPrice(listing.price, listing.currency, displayCurrency)}
          </span>
          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-foreground px-4 py-2 text-sm font-mono uppercase tracking-widest no-underline hover:bg-foreground hover:text-background transition-colors"
            >
              View original listing ↗
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="min-w-0 max-w-full">
          <div className="w-full max-w-[560px] aspect-[560/360] overflow-hidden rounded-lg">
            <ImageGallery images={listing.images} width={560} height={360} responsive />
          </div>
          <h2 className="font-sans font-black text-xl uppercase tracking-tight text-foreground mt-4">
            {listing.title || "[No title]"}
          </h2>
          {listing.location && (
            <p className="text-muted-foreground text-sm mt-1">
              📍 {listing.location}
            </p>
          )}
          {facts.length > 0 && (
            <div className="bg-muted border border-border p-4 mt-4">
              <h4 className="label-style mt-0 mb-2">Key facts</h4>
              <dl className="m-0 text-sm text-foreground font-mono">
                {facts.map((f) => (
                  <div key={f.label} className="flex gap-2 mb-1">
                    <dt className="m-0 min-w-[100px]">{f.label}:</dt>
                    <dd className="m-0">{String(f.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="mt-4">
              <h4 className="label-style">Amenities</h4>
              <p className="text-foreground text-sm font-mono">{listing.amenities.join(", ")}</p>
            </div>
          )}
          {listing.violations && listing.violations.length > 0 && (
            <div className="mt-4">
              <h4 className="label-style text-amber">Violations</h4>
              <p className="text-foreground text-sm font-mono">{listing.violations.join(", ")}</p>
            </div>
          )}
        </div>
        <div>
          <div className="bg-muted border border-border p-4">
            <h4 className="label-style mt-0 mb-2">Description</h4>
            <p className="text-foreground text-sm font-mono leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description."}
            </p>
          </div>
          <div className="mt-4 text-muted-foreground text-xs font-mono">
            <p className="m-1"><strong>Source:</strong> {listing.sourceName}</p>
            <p className="m-1"><strong>ID:</strong> {listing.id}</p>
          </div>
          <div className="bg-muted border border-border p-3 mt-4 text-muted-foreground text-xs font-mono">
            This listing is aggregated from an external source. Africa Property Index does not verify accuracy or facilitate transactions.
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
      <h3 style={{ color: "#e8e8e8" }}>
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
            onClick={() => setPage((p) => p - 1)}
            style={{ ...inputStyle, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span style={{ color: "#888" }}>{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
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
        <p style={{ color: "#e8e8e8" }}>Market not found: {marketId}</p>
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
            border: "1px solid #333",
            color: "#888",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Back
        </button>
        <h1 style={{ color: "#e8e8e8", margin: 0 }}>{market.name}</h1>
        <StatusBadge status={market.status} />
      </div>
      <hr style={{ borderColor: "#222" }} />
      <SourceTable sources={market.sources} />
      <hr style={{ borderColor: "#222", margin: "24px 0" }} />
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

function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: Array<{ value: Tab; label: string; note: string }> = [
    { value: "dashboard", label: "Dashboard", note: "Platform pulse" },
    { value: "listings", label: "Listings", note: "Universe review" },
    { value: "sources", label: "Sources", note: "Source health" },
    { value: "stats", label: "Stats", note: "Ops metrics" },
    { value: "agents", label: "Agents", note: "Workflow" },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="section-kicker mb-2">AREI Admin</div>
          <h1 className="font-sans text-[28px] leading-none font-black tracking-tight text-foreground m-0">
            Africa Property Index
          </h1>
          <p className="section-note mt-3 mb-0">
            Internal operations workspace for listings, sources, and workflow review.
          </p>
        </div>

        <nav className="admin-sidebar-nav">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`admin-sidebar-link ${tab === item.value ? "is-active" : ""}`}
            >
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-xs font-mono text-muted-foreground mt-1">{item.note}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto app-surface-subtle p-4">
          <div className="section-kicker mb-1">Workspace</div>
          <div className="text-sm font-semibold text-foreground">Daily operations</div>
          <p className="text-sm text-muted-foreground leading-relaxed m-0 mt-2">
            Desktop-first internal admin for selection, approvals, and source oversight.
          </p>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div className="section-kicker mb-1">Current area</div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">
              {tabs.find((item) => item.value === tab)?.label}
            </div>
          </div>
          <div className="text-right">
            <div className="section-kicker mb-1">Product</div>
            <div className="text-sm font-mono text-muted-foreground">Pan-African real estate operations</div>
          </div>
        </header>

        <div className="admin-content">
          {tab === "dashboard" && <DashboardView />}
          {tab === "listings" && <ListingsTabView />}
          {tab === "sources" && <SourcesView />}
          {tab === "stats" && <StatsView />}
          {tab === "agents" && <AgentsWorkflowView />}
        </div>
      </main>
    </div>
  );
}

// ============================================
// AUTH GATE — Protected by default outside local dev unless explicitly disabled
// ============================================

const ADMIN_PROTECTED =
  import.meta.env.VITE_ADMIN_PROTECTED === "true" ||
  (!import.meta.env.DEV && import.meta.env.VITE_ADMIN_PROTECTED !== "false");

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="border border-foreground brutalist-shadow-sm p-8 max-w-sm w-full bg-muted">
        <h1 className="font-sans font-black text-xl uppercase tracking-tight text-foreground mb-2">
          Admin login
        </h1>
        <p className="label-style mb-6">
          Internal dashboard - enter password
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-background border border-foreground text-foreground px-4 py-3 font-mono mb-4"
            autoFocus
          />
          {error && (
            <p className="text-red text-sm font-mono mb-4">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full border border-foreground px-4 py-3 text-sm font-mono uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "login">("loading");

  useEffect(() => {
    if (!ADMIN_PROTECTED) {
      setStatus("ok");
      return;
    }
    fetch("/api/auth", { method: "GET", credentials: "include" })
      .then((r) => {
        setStatus(r.ok ? "ok" : "login");
      })
      .catch(() => setStatus("login"));
  }, []);

  if (!ADMIN_PROTECTED) return <>{children}</>;
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-muted-foreground">
        Checking…
      </div>
    );
  }
  if (status === "login") {
    return <LoginScreen onSuccess={() => setStatus("ok")} />;
  }
  return <>{children}</>;
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <AuthGate>
      <App />
    </AuthGate>
  );
}
