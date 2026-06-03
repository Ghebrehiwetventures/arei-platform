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
  const neutral = "border-border bg-surface-1 text-foreground-muted";
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

// ── Single card ──────────────────────────────────────────────────────────────

function PulseCardItem({
  card,
  onResolve,
}: {
  card: PulseCard;
  onResolve: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PulseCardFeedback | null>(card.feedback);

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
    <article className="surface-1 rounded border border-border p-4 flex flex-col gap-3">
      {/* Header: category + priority + owner */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            "text-[10px] font-mono font-medium px-2 py-0.5 rounded uppercase tracking-wider border " +
            categoryClasses(card.category)
          }
        >
          {CATEGORY_LABELS[card.category] ?? card.category}
        </span>
        <span className={"text-[11px] font-mono " + priorityTone(card.priority)}>
          P{card.priority}
        </span>
        {card.owner_suggestion && (
          <span className="text-[11px] text-foreground-subtle">
            → {card.owner_suggestion}
          </span>
        )}
        {card.source_type === "web" || card.source_type === "mixed" ? (
          <span className="text-[10px] font-mono text-foreground-subtle uppercase">web</span>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug">{card.title}</h3>

      {/* Signal + why + action */}
      <div className="space-y-2 text-[13px] leading-relaxed">
        <p className="text-foreground-muted">{card.signal_summary}</p>
        <p>
          <span className="text-foreground-subtle font-mono text-[11px] uppercase tracking-wide">Why it matters · </span>
          <span className="text-foreground-muted">{card.why_it_matters}</span>
        </p>
        <p>
          <span className="text-foreground-subtle font-mono text-[11px] uppercase tracking-wide">Do next · </span>
          <span className="text-foreground">{card.recommended_action}</span>
        </p>
      </div>

      {/* Evidence */}
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

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => vote("up")}
            aria-pressed={feedback === "up"}
            className={
              "text-xs px-2 py-1 rounded transition-colors " +
              (feedback === "up"
                ? "text-[#2D4A42] dark:text-[#8ECFBF]"
                : "text-foreground-subtle hover:text-foreground-muted")
            }
          >
            ▲ Useful
          </button>
          <button
            onClick={() => vote("down")}
            aria-pressed={feedback === "down"}
            className={
              "text-xs px-2 py-1 rounded transition-colors " +
              (feedback === "down"
                ? "text-[#C44A3A]"
                : "text-foreground-subtle hover:text-foreground-muted")
            }
          >
            ▼ Not useful
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => resolve("dismissed")}
            className="text-xs px-2.5 py-1 rounded border border-border text-foreground-muted hover:text-foreground disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            disabled={busy}
            onClick={() => resolve("done")}
            className="text-xs px-2.5 py-1 rounded border border-[#8ECFBF]/40 bg-[#8ECFBF]/10 text-[#2D4A42] dark:text-[#8ECFBF] hover:bg-[#8ECFBF]/20 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </article>
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
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cards.map((card) => (
            <PulseCardItem key={card.id} card={card} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </section>
  );
}
