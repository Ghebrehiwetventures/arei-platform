import { useEffect, useState, useCallback } from "react";
import {
  PulseCard,
  PulseCategory,
  PulseCardFeedback,
  getLatestPulseCards,
  setPulseCardStatus,
  setPulseCardFeedback,
} from "./data";

// ── Category presentation ────────────────────────────────────────────────────
// Executive taxonomy only. No listing/parser/source-health categories.

const CATEGORY_LABELS: Record<PulseCategory, string> = {
  strategy: "Strategy",
  operations: "Operations",
  technical_execution: "Technical execution",
  data_quality_risk: "Data quality risk",
  sales: "Sales",
  partnerships: "Partnerships",
  market_expansion: "Market expansion",
  events: "Events",
  competitors: "Competitors",
  content_pr: "Content / PR",
  fundraising: "Fundraising",
};

// Brand-aligned: sage / sage-deep family + coral for risk. No arbitrary hues.
function categoryClasses(cat: PulseCategory): string {
  const risk = "border-[#C44A3A]/30 bg-[#C44A3A]/10 text-[#C44A3A]";
  const sage = "border-[#8ECFBF]/30 bg-[#8ECFBF]/10 text-[#2D4A42] dark:text-[#8ECFBF]";
  const neutral = "border-border bg-surface-2 text-foreground-muted";
  const map: Record<PulseCategory, string> = {
    strategy: sage,
    operations: neutral,
    technical_execution: neutral,
    data_quality_risk: risk,
    sales: sage,
    partnerships: sage,
    market_expansion: sage,
    events: neutral,
    competitors: risk,
    content_pr: neutral,
    fundraising: sage,
  };
  return map[cat] ?? neutral;
}

function priorityTone(priority: number): string {
  if (priority >= 75) return "text-[#C44A3A]";
  if (priority >= 50) return "text-amber";
  return "text-foreground-muted";
}

// ── Single row (collapsible) ─────────────────────────────────────────────────

function PulseCardRow({
  card,
  onResolve,
}: {
  card: PulseCard;
  onResolve: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PulseCardFeedback | null>(card.feedback);
  const [expanded, setExpanded] = useState(false);

  const resolve = useCallback(
    async (status: "done" | "dismissed") => {
      setBusy(true);
      try {
        await setPulseCardStatus(card.id, status);
        onResolve(card.id);
      } catch (err) {
        console.error("[Pulse] resolve failed:", err);
        setBusy(false);
      }
    },
    [card.id, onResolve]
  );

  const vote = useCallback(
    async (value: PulseCardFeedback) => {
      const next = feedback === value ? null : value;
      setFeedback(next);
      try {
        await setPulseCardFeedback(card.id, next);
      } catch (err) {
        console.error("[Pulse] feedback failed:", err);
        setFeedback(feedback); // revert
      }
    },
    [card.id, feedback]
  );

  return (
    <li className="px-3">
      {/* Summary row — click the left region to expand; actions stay live. */}
      <div className="flex items-center gap-2 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
        >
          <span className="shrink-0 w-3 text-[10px] text-foreground-subtle">{expanded ? "▾" : "▸"}</span>
          <span
            className={
              "shrink-0 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded uppercase tracking-wider border " +
              categoryClasses(card.category)
            }
          >
            {CATEGORY_LABELS[card.category] ?? card.category}
          </span>
          <span className={"shrink-0 text-[11px] font-mono " + priorityTone(card.priority)}>
            P{card.priority}
          </span>
          <span className="truncate text-sm font-medium text-foreground">{card.title}</span>
          {card.owner_suggestion && (
            <span className="shrink-0 hidden sm:inline text-[11px] text-foreground-subtle">
              → {card.owner_suggestion}
            </span>
          )}
        </button>

        {/* Actions — always visible. */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => vote("up")}
            aria-pressed={feedback === "up"}
            title="Useful"
            className={
              "text-xs px-1.5 py-1 rounded transition-colors " +
              (feedback === "up"
                ? "text-[#2D4A42] dark:text-[#8ECFBF]"
                : "text-foreground-subtle hover:text-foreground-muted")
            }
          >
            ▲
          </button>
          <button
            onClick={() => vote("down")}
            aria-pressed={feedback === "down"}
            title="Not useful"
            className={
              "text-xs px-1.5 py-1 rounded transition-colors " +
              (feedback === "down"
                ? "text-[#C44A3A]"
                : "text-foreground-subtle hover:text-foreground-muted")
            }
          >
            ▼
          </button>
          <button
            disabled={busy}
            onClick={() => resolve("dismissed")}
            className="text-xs px-2 py-1 rounded border border-border text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            disabled={busy}
            onClick={() => resolve("done")}
            className="text-xs px-2 py-1 rounded border border-[#8ECFBF]/40 bg-[#8ECFBF]/10 text-[#2D4A42] dark:text-[#8ECFBF] hover:bg-[#8ECFBF]/20 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>

      {/* Expanded detail. */}
      {expanded && (
        <div className="pb-3 pl-[1.4rem] pr-1 space-y-2 text-[13px] leading-relaxed">
          <p className="text-foreground-muted">{card.signal_summary}</p>
          <p>
            <span className="text-foreground-subtle font-mono text-[11px] uppercase tracking-wide">Why it matters · </span>
            <span className="text-foreground-muted">{card.why_it_matters}</span>
          </p>
          <p>
            <span className="text-foreground-subtle font-mono text-[11px] uppercase tracking-wide">Do next · </span>
            <span className="text-foreground">{card.recommended_action}</span>
          </p>
          {card.evidence.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.evidence.map((e, i) => (
                <span
                  key={i}
                  title={e.detail ?? e.ref ?? ""}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-foreground-subtle"
                >
                  {e.label}
                </span>
              ))}
              {card.source_url && (
                <a
                  href={card.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-[#2D4A42] dark:text-[#8ECFBF] hover:underline"
                >
                  source ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────

export function AREIPulsePanel() {
  const [cards, setCards] = useState<PulseCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLatestPulseCards().then((c) => {
      if (!cancelled) setCards(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResolve = useCallback((id: string) => {
    setCards((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }, []);

  // Loading: render nothing rather than a skeleton (panel sits atop dashboard).
  if (cards === null) return null;

  const digestDate = cards[0]?.digest_date;

  return (
    <section className="surface-1 rounded border border-border p-5">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-foreground font-mono">AREI Pulse</h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            What AREI should care about right now, and what to do next.
          </p>
        </div>
        {digestDate && (
          <span className="text-[11px] font-mono text-foreground-subtle">{digestDate}</span>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-foreground-muted py-2">
          No executive signals to surface today. Pulse stays quiet when there's nothing material.
        </p>
      ) : (
        <ul className="rounded border border-border divide-y divide-border bg-surface-1">
          {cards.map((card) => (
            <PulseCardRow key={card.id} card={card} onResolve={handleResolve} />
          ))}
        </ul>
      )}
    </section>
  );
}
