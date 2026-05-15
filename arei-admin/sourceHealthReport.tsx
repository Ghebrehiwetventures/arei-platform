/**
 * Source Health Report — visual derivation of the same data already exposed
 * by the Sources CSV export. Pure helpers + React components + a
 * self-contained HTML export string (with built-in print styles).
 *
 * No new data fetching, no schema changes — operates entirely on the
 * SourceQualityRow shape already populated by getDashboardStats().
 */

import React from "react";
import { SourceQualityRow } from "./types";

const STALE_DAYS = 30;

function daysSince(ts?: string | null): number {
  if (!ts) return Infinity;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function freshnessLabel(ts?: string | null): string {
  const d = daysSince(ts);
  if (!Number.isFinite(d)) return "No updates";
  if (d <= 0) return "Today";
  if (d === 1) return "1d ago";
  if (d < STALE_DAYS) return `${d}d ago`;
  return `Stale (${d}d)`;
}

export interface SourceIssue {
  code: string;
  label: string;
  severity: "blocker" | "warn";
}

export function deriveIssues(r: SourceQualityRow): SourceIssue[] {
  const issues: SourceIssue[] = [];
  const approved = Number(r.approved_count);
  const listing = Number(r.listing_count);
  const d = daysSince(r.last_updated_at);
  if (approved > 0 && r.public_feed_count_n === 0)
    issues.push({ code: "no_feed", label: "Ingest-approved, 0 live feed", severity: "blocker" });
  if (approved > 0 && r.trust_passed_count_n === 0)
    issues.push({ code: "no_trust", label: "0 trust passed", severity: "blocker" });
  if (approved > 0 && r.indexable_count_n === 0)
    issues.push({ code: "no_indexable", label: "0 indexable", severity: "blocker" });
  if (d >= STALE_DAYS)
    issues.push({ code: "stale", label: Number.isFinite(d) ? `Stale ${d}d` : "No updates", severity: "warn" });
  if (listing >= 10 && r.with_sqm_pct < 30)
    issues.push({ code: "low_sqm", label: `Sqm coverage ${r.with_sqm_pct}%`, severity: "warn" });
  if (listing >= 10 && r.with_beds_pct < 30)
    issues.push({ code: "low_beds", label: `Beds coverage ${r.with_beds_pct}%`, severity: "warn" });
  if (listing >= 10 && r.with_baths_pct < 30)
    issues.push({ code: "low_baths", label: `Baths coverage ${r.with_baths_pct}%`, severity: "warn" });
  if (approved >= 20 && r.feed_conversion_pct < 25)
    issues.push({ code: "low_conversion", label: `Ingest→feed ratio ${Math.round(r.feed_conversion_pct)}%`, severity: "warn" });
  return issues;
}

export function mainIssueLabel(r: SourceQualityRow): string {
  const issues = deriveIssues(r);
  if (issues.length === 0) return "—";
  const blocker = issues.find((i) => i.severity === "blocker");
  return (blocker ?? issues[0]).label;
}

export type StatusTone = "good" | "warn" | "bad";
export function statusFor(r: SourceQualityRow): { label: string; tone: StatusTone } {
  const issues = deriveIssues(r);
  const blocker = issues.find((i) => i.severity === "blocker");
  if (blocker) return { label: "Blocked", tone: "bad" };
  const stale = issues.find((i) => i.code === "stale");
  if (stale) return { label: "Stale", tone: "bad" };
  if (issues.length > 0) return { label: "Needs attention", tone: "warn" };
  return { label: "Performing well", tone: "good" };
}

/** Higher score => higher priority. Weights blockers above coverage gaps so
 *  approved-but-no-feed beats a low-sqm warning even on a small source. */
export function priorityScore(r: SourceQualityRow): number {
  const approved = Number(r.approved_count);
  const listing = Number(r.listing_count);
  const d = daysSince(r.last_updated_at);
  let s = 0;
  if (approved > 0 && r.public_feed_count_n === 0) s += 1000 + approved;
  if (approved > 0 && r.trust_passed_count_n === 0) s += 800 + approved;
  if (approved > 0 && r.indexable_count_n === 0) s += 600 + approved;
  if (d >= STALE_DAYS) s += 200 + (Number.isFinite(d) ? Math.min(d, 365) : 365);
  if (listing >= 10 && r.with_sqm_pct === 0) s += 150 + Math.floor(listing / 10);
  if (listing >= 10 && r.with_sqm_pct < 30) s += 50;
  if (listing >= 10 && r.with_beds_pct < 30) s += 40;
  if (listing >= 10 && r.with_baths_pct < 30) s += 40;
  if (approved >= 20 && r.feed_conversion_pct < 25) s += 100;
  return s;
}

export type ActionImpact = "High" | "Medium" | "Low";

export interface PriorityAction {
  title: string;
  problem: string;
  why: string;
  checkNext: string;
  impact: ActionImpact;
}

/** Plain-language action description for the top issue on this source. Picks
 *  the highest-severity problem and turns it into Problem / Why / Check /
 *  Impact text that a non-technical operator can act on. */
export function buildPriorityAction(r: SourceQualityRow): PriorityAction | null {
  const approved = Number(r.approved_count);
  const listing = Number(r.listing_count);
  const d = daysSince(r.last_updated_at);
  const conv = Math.round(r.feed_conversion_pct);
  const days = Number.isFinite(d) ? `${d}d` : "an unknown time";

  // Blockers first — most impactful problems an operator can fix.
  if (approved > 0 && r.public_feed_count_n === 0) {
    return {
      title: r.sourceName,
      problem: `${approved.toLocaleString()} pipeline-approved listings, but 0 are in the live feed.`,
      why: "We may have usable inventory that buyers cannot see.",
      checkNext: "Trust gate, indexable flag, and live feed eligibility.",
      impact: "High",
    };
  }
  if (approved > 0 && r.trust_passed_count_n === 0) {
    return {
      title: r.sourceName,
      problem: `${approved.toLocaleString()} pipeline-approved listings, but none pass the trust gate.`,
      why: "Listings are being rejected by the trust checks before they can reach the live feed.",
      checkNext: "Trust-rule logs for this source; look for a systemic field-validation failure.",
      impact: "High",
    };
  }
  if (approved > 0 && r.indexable_count_n === 0) {
    return {
      title: r.sourceName,
      problem: `${approved.toLocaleString()} pipeline-approved listings, but none are indexable.`,
      why: "Listings exist but are invisible to search and feeds, so they cannot be discovered.",
      checkNext: "Indexable rules and per-listing exclusions for this source.",
      impact: "High",
    };
  }
  if (d >= STALE_DAYS) {
    return {
      title: r.sourceName,
      problem: `Source has not been updated in ${days} (>= ${STALE_DAYS}d).`,
      why: "Stale sources show outdated listings; buyers may see sold/withdrawn properties.",
      checkNext: "Scraper schedule and last successful run for this source.",
      impact: listing >= 50 ? "High" : "Medium",
    };
  }
  if (approved >= 20 && r.feed_conversion_pct < 25) {
    return {
      title: r.sourceName,
      problem: `${approved.toLocaleString()} pipeline-approved listings, but only ${conv}% reach the live feed.`,
      why: "Most pipeline-approved inventory from this source is being filtered out before the live feed.",
      checkNext: "Why pipeline-approved listings are being dropped — indexable rules and trust thresholds.",
      impact: "Medium",
    };
  }
  if (listing >= 10 && r.with_sqm_pct < 30) {
    return {
      title: r.sourceName,
      problem: `Only ${r.with_sqm_pct}% of listings have square-meter data (over ${listing.toLocaleString()} listings).`,
      why: "Missing area data limits filtering and reduces buyer confidence.",
      checkNext: "Parser for this source — is the area field being extracted?",
      impact: "Low",
    };
  }
  if (listing >= 10 && r.with_beds_pct < 30) {
    return {
      title: r.sourceName,
      problem: `Only ${r.with_beds_pct}% of listings have bedroom counts.`,
      why: "Missing bedroom data limits filtering for property buyers.",
      checkNext: "Parser for this source — bedrooms field selector.",
      impact: "Low",
    };
  }
  if (listing >= 10 && r.with_baths_pct < 30) {
    return {
      title: r.sourceName,
      problem: `Only ${r.with_baths_pct}% of listings have bathroom counts.`,
      why: "Missing bathroom data limits filtering for property buyers.",
      checkNext: "Parser for this source — bathrooms field selector.",
      impact: "Low",
    };
  }
  return null;
}

/** Technical one-line summary — kept for the verbose detail table /
 *  diagnostics, NOT used in the action-first report. */
export function prioritySummary(r: SourceQualityRow): string {
  const approved = Number(r.approved_count);
  const listing = Number(r.listing_count);
  const d = daysSince(r.last_updated_at);
  const parts: string[] = [];
  if (approved > 0) parts.push(`${approved} pipeline-approved`);
  else parts.push(`${listing} listings`);
  if (approved > 0 && r.public_feed_count_n === 0) parts.push("0 live feed");
  if (approved > 0 && r.trust_passed_count_n === 0) parts.push("0 trust passed");
  if (approved > 0 && r.indexable_count_n === 0) parts.push("0 indexable");
  if (d >= STALE_DAYS && Number.isFinite(d)) parts.push(`stale ${d}d`);
  if (listing >= 10 && r.with_sqm_pct < 30) parts.push(`${r.with_sqm_pct}% sqm`);
  if (listing >= 10 && r.with_beds_pct < 30) parts.push(`${r.with_beds_pct}% beds`);
  if (listing >= 10 && r.with_baths_pct < 30) parts.push(`${r.with_baths_pct}% baths`);
  if (approved >= 20 && r.feed_conversion_pct < 25) parts.push(`${Math.round(r.feed_conversion_pct)}% ingest→feed`);
  return parts.join(", ");
}

export interface ReportSummary {
  totalListings: number;
  publicFeed: number;
  feedConversionPct: number;
  sourceCount: number;
  gradeDist: Record<"A" | "B" | "C" | "D", number>;
  staleCount: number;
  approvedNoFeedCount: number;
  checks: { discovered: number; approved: number; indexable: number; trustPassed: number; publicFeed: number };
}

// ───────── Snapshot storage (localStorage, one per day per market) ─────────

export interface SourceSnapshot {
  date: string; // YYYY-MM-DD
  marketId: string;
  totalListings: number;
  publicFeed: number;
  feedConversionPct: number;
  sourceCount: number;
  staleCount: number;
  approvedNoFeedCount: number;
  gradeDist: Record<"A" | "B" | "C" | "D", number>;
  abPct: number; // (A+B) / total sources * 100
}

const snapshotKey = (marketId: string) => `arei_snapshots_v1_${marketId}`;

export function loadSnapshots(marketId: string): SourceSnapshot[] {
  try {
    const raw = localStorage.getItem(snapshotKey(marketId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnapshot(snap: SourceSnapshot): void {
  try {
    const existing = loadSnapshots(snap.marketId).filter((s) => s.date !== snap.date);
    const updated = [...existing, snap].slice(-90);
    localStorage.setItem(snapshotKey(snap.marketId), JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function summarize(rows: SourceQualityRow[]): ReportSummary {
  const gradeDist: Record<"A" | "B" | "C" | "D", number> = { A: 0, B: 0, C: 0, D: 0 };
  let totalListings = 0, publicFeed = 0, approved = 0, indexable = 0, trustPassed = 0;
  let staleCount = 0, approvedNoFeedCount = 0;
  for (const r of rows) {
    gradeDist[r.grade]++;
    totalListings += Number(r.listing_count);
    publicFeed += r.public_feed_count_n;
    approved += Number(r.approved_count);
    indexable += r.indexable_count_n;
    trustPassed += r.trust_passed_count_n;
    if (daysSince(r.last_updated_at) >= STALE_DAYS) staleCount++;
    if (Number(r.approved_count) > 0 && r.public_feed_count_n === 0) approvedNoFeedCount++;
  }
  const feedConversionPct = approved > 0 ? Math.round((publicFeed / approved) * 100) : 0;
  return {
    totalListings,
    publicFeed,
    feedConversionPct,
    sourceCount: rows.length,
    gradeDist,
    staleCount,
    approvedNoFeedCount,
    checks: { discovered: totalListings, approved, indexable, trustPassed, publicFeed },
  };
}

// ───────── React components ─────────

function Sparkline({ data, tone }: { data: number[]; tone?: StatusTone }) {
  if (data.length < 2) return null;
  const w = 64, h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const tx = (i: number) => 2 + (i / (data.length - 1)) * (w - 4);
  const ty = (v: number) => (h - 3) - ((v - min) / rng) * (h - 5);
  const pts = data.map((v, i) => `${tx(i)},${ty(v)}`).join(" ");
  const lx = tx(data.length - 1);
  const ly = ty(data[data.length - 1]);
  const stroke = tone === "bad" ? "#ef4444" : tone === "warn" ? "#f59e0b" : tone === "good" ? "#22c55e" : "#6b7280";
  return (
    <svg width={w} height={h} className="mt-2 opacity-75">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={stroke} />
    </svg>
  );
}

function StatCard({ label, value, hint, tone, sparkData }: { label: string; value: React.ReactNode; hint?: string; tone?: StatusTone; sparkData?: number[] }) {
  const toneText = tone === "bad" ? "text-red" : tone === "warn" ? "text-amber" : tone === "good" ? "text-green" : "text-foreground";
  return (
    <div className="surface-1 border border-border rounded p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-foreground-subtle font-mono font-medium">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums font-mono ${toneText}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-foreground-muted">{hint}</div>}
      {sparkData && sparkData.length >= 2 && <Sparkline data={sparkData} tone={tone} />}
    </div>
  );
}

function TrendChart({
  label,
  data,
  format,
  toneFor,
}: {
  label: string;
  data: Array<{ date: string; value: number }>;
  format: (v: number) => string;
  toneFor?: (v: number) => StatusTone;
}) {
  if (data.length < 2) {
    return (
      <div className="surface-1 border border-border rounded p-4 shadow-sm flex flex-col justify-between min-h-[130px]">
        <div className="text-[10px] uppercase tracking-wider text-foreground-subtle font-mono font-medium">{label}</div>
        <div>
          <div className="text-xs text-foreground-muted">Collecting data…</div>
          <div className="text-[10px] text-foreground-subtle mt-1">Check back tomorrow</div>
        </div>
      </div>
    );
  }
  const W = 200, H = 72;
  const pl = 2, pr = 2, pt = 6, pb = 6;
  const iw = W - pl - pr, ih = H - pt - pb;
  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rng = maxV - minV || 1;
  const tx = (i: number) => pl + (i / (data.length - 1)) * iw;
  const ty = (v: number) => pt + (1 - (v - minV) / rng) * ih;
  const pts = data.map((d, i) => `${tx(i)},${ty(d.value)}`).join(" ");
  const lastVal = data[data.length - 1].value;
  const firstVal = data[0].value;
  const delta = lastVal - firstVal;
  const tone = toneFor?.(lastVal);
  const stroke = tone === "bad" ? "#ef4444" : tone === "warn" ? "#f59e0b" : tone === "good" ? "#22c55e" : "currentColor";
  const deltaClass = delta > 0 ? "text-green" : delta < 0 ? "text-red" : "text-foreground-muted";
  const deltaStr = (delta > 0 ? "+" : "") + format(delta);
  return (
    <div className="surface-1 border border-border rounded p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wider text-foreground-subtle font-mono font-medium">{label}</div>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span className="text-xl font-semibold font-mono tabular-nums" style={{ color: stroke }}>{format(lastVal)}</span>
        <span className={`text-[11px] font-mono tabular-nums ${deltaClass}`}>{deltaStr}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1" style={{ height: H }}>
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={tx(data.length - 1)} cy={ty(lastVal)} r="3" fill={stroke} />
      </svg>
      <div className="flex justify-between text-[10px] text-foreground-subtle font-mono mt-0.5">
        <span>{data[0].date.slice(5)}</span>
        <span>{data[data.length - 1].date.slice(5)}</span>
      </div>
    </div>
  );
}

type TrendRange = 7 | 30 | 60 | 90;

function TrendsSection({ snapshots }: { snapshots: SourceSnapshot[] }) {
  const [range, setRange] = React.useState<TrendRange>(7);
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const window = sorted.filter((s) => s.date >= cutoffStr);

  return (
    <section className="surface-1 border border-border rounded p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Trends</h2>
          <p className="text-xs text-foreground-muted mt-0.5">Pipeline quality over time — one snapshot per day this page is visited</p>
        </div>
        <div className="flex gap-1">
          {([7, 30, 60, 90] as TrendRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors ${
                range === r
                  ? "bg-foreground text-background"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-3 border border-border"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrendChart
          label="Live feed"
          data={window.map((s) => ({ date: s.date, value: s.publicFeed }))}
          format={(v) => Math.round(v).toLocaleString()}
          toneFor={(v) => (v > 200 ? "good" : v > 100 ? "warn" : "bad")}
        />
        <TrendChart
          label="Ingest→feed ratio"
          data={window.map((s) => ({ date: s.date, value: s.feedConversionPct }))}
          format={(v) => `${Math.round(v)}%`}
          toneFor={(v) => (v >= 50 ? "good" : v >= 25 ? "warn" : "bad")}
        />
        <TrendChart
          label="A/B grade sources"
          data={window.map((s) => ({ date: s.date, value: s.abPct }))}
          format={(v) => `${Math.round(v)}%`}
          toneFor={(v) => (v >= 50 ? "good" : v >= 25 ? "warn" : "bad")}
        />
        <TrendChart
          label="Stale sources"
          data={window.map((s) => ({ date: s.date, value: s.staleCount }))}
          format={(v) => String(Math.round(v))}
          toneFor={(v) => (v === 0 ? "good" : v <= 2 ? "warn" : "bad")}
        />
      </div>
      {snapshots.length < 2 && (
        <p className="text-[11px] text-foreground-subtle mt-3 border-t border-border pt-3">
          Visit this page on different days — charts will fill in automatically as data accumulates.
        </p>
      )}
    </section>
  );
}

function pct(n: number, of: number): number {
  return of > 0 ? Math.round((n / of) * 100) : 0;
}

function EligibilityCheck({ label, value, total }: { label: string; value: number; total: number }) {
  const widthPct = total > 0 ? Math.max(2, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="tabular-nums font-mono text-xs text-foreground-muted">
          {value.toLocaleString()} <span className="text-foreground-subtle">({pct(value, total)}% of discovered)</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded bg-surface-2 overflow-hidden">
        <div className="h-full bg-foreground/70" style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

function GradeBar({ dist }: { dist: Record<"A" | "B" | "C" | "D", number> }) {
  const total = dist.A + dist.B + dist.C + dist.D;
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? (
      <div className={`flex items-center justify-center text-[11px] font-semibold ${cls}`} style={{ width: `${(n / total) * 100}%` }} title={`${label}: ${n}`}>
        {n}
      </div>
    ) : null;
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded border border-border">
        {seg(dist.A, "bg-green-muted text-green", "A")}
        {seg(dist.B, "bg-green-muted/60 text-green", "B")}
        {seg(dist.C, "bg-amber-muted text-amber", "C")}
        {seg(dist.D, "bg-red-muted text-red", "D")}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] text-foreground-muted">
        <div>A · {dist.A}</div><div>B · {dist.B}</div><div>C · {dist.C}</div><div>D · {dist.D}</div>
      </div>
    </div>
  );
}

export function CoveragePill({ label, value }: { label: string; value: number }) {
  const tone = value < 30 ? "bg-red-muted text-red" : value < 60 ? "bg-amber-muted text-amber" : "bg-green-muted text-green";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tabular-nums ${tone}`}>
      {label} {value}%
    </span>
  );
}

function StatusChip({ s }: { s: { label: string; tone: StatusTone } }) {
  const cls = s.tone === "good" ? "bg-green-muted text-green" : s.tone === "warn" ? "bg-amber-muted text-amber" : "bg-red-muted text-red";
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${cls}`}>{s.label}</span>;
}

function GradePill({ grade }: { grade: "A" | "B" | "C" | "D" }) {
  const cls = grade === "A" || grade === "B" ? "bg-green-muted text-green" : grade === "C" ? "bg-amber-muted text-amber" : "bg-red-muted text-red";
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-mono font-bold ${cls}`}>{grade}</span>;
}

export function SourceHealthReport({ rows, marketLabel, snapshots = [] }: { rows: SourceQualityRow[]; marketLabel: string; snapshots?: SourceSnapshot[] }) {
  if (rows.length === 0) return null;
  // Stubs (cv_source_*) are real DB rows but represent test/placeholder
  // sources, not production publishers. They are excluded from every primary
  // aggregate so they cannot pollute the working report; they are surfaced
  // in a small dedicated footer below.
  const productionRows = rows.filter((r) => !r.isStub);
  const stubRows = rows.filter((r) => r.isStub);
  const summary = summarize(productionRows);
  const issueBuckets = {
    noFeed: productionRows.filter((r) => Number(r.approved_count) > 0 && r.public_feed_count_n === 0),
    noTrust: productionRows.filter((r) => Number(r.approved_count) > 0 && r.trust_passed_count_n === 0),
    noIndexable: productionRows.filter((r) => Number(r.approved_count) > 0 && r.indexable_count_n === 0),
    stale: productionRows.filter((r) => daysSince(r.last_updated_at) >= STALE_DAYS),
    lowSqm: productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_sqm_pct < 30),
    lowBeds: productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_beds_pct < 30),
    lowBaths: productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_baths_pct < 30),
    lowConv: productionRows.filter((r) => Number(r.approved_count) >= 20 && r.feed_conversion_pct < 25),
  };
  const priorities = [...productionRows]
    .map((r) => ({ r, score: priorityScore(r) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const priorityActions = priorities
    .map((p) => buildPriorityAction(p.r))
    .filter((a): a is PriorityAction => a !== null);
  // Top 6 sources needing action — sorted by priority score, then listings.
  // Stubs excluded so a placeholder source cannot occupy a card slot.
  const topSourcesNeedingAction = [...productionRows]
    .sort((a, b) => {
      const sa = priorityScore(a), sb = priorityScore(b);
      if (sa !== sb) return sb - sa;
      return Number(b.listing_count) - Number(a.listing_count);
    })
    .slice(0, 6);

  const issueRow = (label: string, items: SourceQualityRow[]) =>
    items.length > 0 ? (
      <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border last:border-0">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-foreground-muted tabular-nums font-mono">
          {items.length} · {items.slice(0, 3).map((r) => r.sourceName).join(", ")}{items.length > 3 ? `, +${items.length - 3}` : ""}
        </span>
      </div>
    ) : null;

  const sortedSnaps = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const spark14 = <T,>(fn: (s: SourceSnapshot) => T) => sortedSnaps.slice(-14).map(fn) as number[];

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Executive summary — {marketLabel}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Raw pipeline inventory" value={summary.totalListings.toLocaleString()} sparkData={spark14((s) => s.totalListings)} />
          <StatCard label="Live feed" value={summary.publicFeed.toLocaleString()} sparkData={spark14((s) => s.publicFeed)} />
          <StatCard
            label="Ingest→feed ratio"
            value={`${summary.feedConversionPct}%`}
            hint="live feed ÷ pipeline-approved"
            tone={summary.feedConversionPct < 25 ? "bad" : summary.feedConversionPct < 50 ? "warn" : "good"}
            sparkData={spark14((s) => s.feedConversionPct)}
          />
          <StatCard label="Sources" value={summary.sourceCount} sparkData={spark14((s) => s.sourceCount)} />
          <StatCard
            label="Stale sources"
            value={summary.staleCount}
            hint={`≥ ${STALE_DAYS}d since update`}
            tone={summary.staleCount > 0 ? "warn" : "good"}
            sparkData={spark14((s) => s.staleCount)}
          />
          <StatCard
            label="Pipeline-approved, 0 live feed"
            value={summary.approvedNoFeedCount}
            hint="pipeline-approved but not in live feed"
            tone={summary.approvedNoFeedCount > 0 ? "bad" : "good"}
            sparkData={spark14((s) => s.approvedNoFeedCount)}
          />
          <div className="surface-1 border border-border rounded p-4 shadow-sm col-span-2">
            <div className="text-[11px] uppercase tracking-wider text-foreground-subtle font-medium mb-2">Grade distribution</div>
            <GradeBar dist={summary.gradeDist} />
          </div>
        </div>
      </section>

      <TrendsSection snapshots={snapshots} />

      <section className="surface-1 border border-border rounded p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-1">Eligibility checks</h2>
        <p className="text-xs text-foreground-muted mb-3">Independent flags — each is a separate boolean on the listing, not a subset of the previous.</p>
        <div className="space-y-3">
          <EligibilityCheck label="Pipeline-approved" value={summary.checks.approved} total={summary.checks.discovered} />
          <EligibilityCheck label="Indexable" value={summary.checks.indexable} total={summary.checks.discovered} />
          <EligibilityCheck label="Trust passed" value={summary.checks.trustPassed} total={summary.checks.discovered} />
          <EligibilityCheck label="Live feed" value={summary.checks.publicFeed} total={summary.checks.discovered} />
        </div>
      </section>

      {/* ── Priority actions — moved up so it's the first thing after the
          summary/funnel. Plain-language Problem/Why/Check/Impact for each. ── */}
      <section className="surface-1 border border-border rounded p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">Priority actions</h2>
        {priorityActions.length === 0 ? (
          <div className="text-sm text-foreground-muted">No high-priority issues for this market.</div>
        ) : (
          <ol className="space-y-3">
            {priorityActions.map((a, i) => (
              <li key={priorities[i].r.source_id} className="border border-border rounded p-3.5">
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <div className="text-sm">
                    <span className="text-foreground-subtle font-mono mr-2">Priority {i + 1}</span>
                    <span className="font-semibold text-foreground">{a.title}</span>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
                    a.impact === "High" ? "bg-red-muted text-red" : a.impact === "Medium" ? "bg-amber-muted text-amber" : "bg-surface-3 text-foreground-muted"
                  }`}>Impact: {a.impact}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div><div className="text-foreground-subtle uppercase tracking-wider text-[10px] mb-0.5">Problem</div><div className="text-foreground">{a.problem}</div></div>
                  <div><div className="text-foreground-subtle uppercase tracking-wider text-[10px] mb-0.5">Why it matters</div><div className="text-foreground-muted">{a.why}</div></div>
                  <div><div className="text-foreground-subtle uppercase tracking-wider text-[10px] mb-0.5">Check next</div><div className="text-foreground-muted">{a.checkNext}</div></div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Top issues — secondary, technical summary kept for completeness. ── */}
      <section>
        <details className="surface-1 border border-border rounded shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-xs font-medium text-foreground-muted hover:text-foreground select-none">
            Top issues to address — technical summary
          </summary>
          <div className="px-4 pb-3">
            {issueRow("Ingest-approved, 0 live feed", issueBuckets.noFeed)}
            {issueRow("Ingest-approved, 0 trust passed", issueBuckets.noTrust)}
            {issueRow("Ingest-approved, 0 indexable", issueBuckets.noIndexable)}
            {issueRow(`Stale (≥ ${STALE_DAYS}d)`, issueBuckets.stale)}
            {issueRow("Sqm coverage < 30%", issueBuckets.lowSqm)}
            {issueRow("Beds coverage < 30%", issueBuckets.lowBeds)}
            {issueRow("Baths coverage < 30%", issueBuckets.lowBaths)}
            {issueRow("Ingest→feed ratio < 25%", issueBuckets.lowConv)}
            {Object.values(issueBuckets).every((b) => b.length === 0) && (
              <div className="text-sm text-foreground-muted py-2">No issues detected.</div>
            )}
          </div>
        </details>
      </section>

      {/* ── Top sources needing action — limited to 6, sorted by priority. ── */}
      <section>
        <div className="flex items-baseline justify-between mb-3 gap-3">
          <h2 className="text-sm font-semibold text-foreground">Top sources needing action</h2>
          <span className="text-xs text-foreground-subtle">showing {topSourcesNeedingAction.length} of {rows.length} sources</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {topSourcesNeedingAction.map((r) => {
            const s = statusFor(r);
            const feedConv = Math.round(r.feed_conversion_pct);
            return (
              <div key={r.source_id} className="surface-1 border border-border rounded p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{r.sourceName}</div>
                    <div className="text-[11px] text-foreground-subtle truncate">{freshnessLabel(r.last_updated_at)}</div>
                  </div>
                  <GradePill grade={r.grade} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-foreground-subtle text-[10px] uppercase tracking-wider">Listings</div><div className="font-mono tabular-nums">{Number(r.listing_count).toLocaleString()}</div></div>
                  <div><div className="text-foreground-subtle text-[10px] uppercase tracking-wider">Live feed</div><div className="font-mono tabular-nums">{r.public_feed_count_n.toLocaleString()}</div></div>
                  <div><div className="text-foreground-subtle text-[10px] uppercase tracking-wider">Pipeline→feed</div><div className={`font-mono tabular-nums ${feedConv < 25 ? "text-red" : feedConv < 50 ? "text-amber" : "text-green"}`}>{feedConv}%</div></div>
                </div>
                <div className="mt-2.5 text-[11px] text-foreground-subtle">
                  Coverage — sqm {r.with_sqm_pct}% · beds {r.with_beds_pct}% · baths {r.with_baths_pct}%
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-foreground truncate flex-1" title={mainIssueLabel(r)}>{mainIssueLabel(r)}</span>
                  <StatusChip s={s} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {stubRows.length > 0 && (
        <section className="surface-1 border border-border border-dashed rounded p-4">
          <div className="flex items-baseline justify-between mb-2 gap-3">
            <h2 className="text-sm font-semibold text-foreground-muted">Test / stub sources</h2>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-3 text-foreground-subtle font-medium">excluded from aggregates</span>
          </div>
          <p className="text-xs text-foreground-subtle mb-3">
            Declared as <code className="font-mono">type: stub</code> in <code className="font-mono">markets/{marketLabel.toLowerCase() === "cape verde" ? "cv" : "*"}/sources.yml</code> and excluded from the public feed by migration 010. Not counted in summary, funnel, priority actions, or top sources.
          </p>
          <ul className="space-y-1.5">
            {stubRows.map((r) => (
              <li key={r.source_id} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-foreground">{r.sourceName} <span className="text-foreground-subtle font-mono">· {r.source_id}</span></span>
                <span className="text-foreground-muted tabular-nums font-mono">{Number(r.listing_count).toLocaleString()} listings · {r.public_feed_count_n.toLocaleString()} feed</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ───────── HTML export (self-contained, with print styles) ─────────

function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function buildReportHtml(rows: SourceQualityRow[], marketLabel: string, marketNameById: Map<string, string>): string {
  const generated = new Date().toISOString();
  // Stubs excluded from aggregates (see SourceHealthReport for rationale).
  const productionRows = rows.filter((r) => !r.isStub);
  const stubRows = rows.filter((r) => r.isStub);
  const summary = summarize(productionRows);
  const priorities = [...productionRows]
    .map((r) => ({ r, score: priorityScore(r) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const allSorted = [...productionRows].sort((a, b) => priorityScore(b) - priorityScore(a) || Number(b.listing_count) - Number(a.listing_count));
  const topSourcesNeedingAction = allSorted.slice(0, 6);
  const priorityActions = priorities
    .map((p) => buildPriorityAction(p.r))
    .filter((a): a is PriorityAction => a !== null);
  const buckets: Array<[string, SourceQualityRow[]]> = [
    ["Approved but 0 public feed", productionRows.filter((r) => Number(r.approved_count) > 0 && r.public_feed_count_n === 0)],
    ["Approved but 0 trust passed", productionRows.filter((r) => Number(r.approved_count) > 0 && r.trust_passed_count_n === 0)],
    ["Approved but 0 indexable", productionRows.filter((r) => Number(r.approved_count) > 0 && r.indexable_count_n === 0)],
    [`Stale (≥ ${STALE_DAYS}d)`, productionRows.filter((r) => daysSince(r.last_updated_at) >= STALE_DAYS)],
    ["Sqm coverage < 30%", productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_sqm_pct < 30)],
    ["Beds coverage < 30%", productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_beds_pct < 30)],
    ["Baths coverage < 30%", productionRows.filter((r) => Number(r.listing_count) >= 10 && r.with_baths_pct < 30)],
    ["Feed conversion < 25%", productionRows.filter((r) => Number(r.approved_count) >= 20 && r.feed_conversion_pct < 25)],
  ];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "IBM Plex Sans", -apple-system, system-ui, sans-serif; background: #f7f6f2; color: #111110; -webkit-font-smoothing: antialiased; font-size: 13px; line-height: 1.5; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 48px; }
    h1 { font-size: 20px; margin: 0 0 4px; font-weight: 600; letter-spacing: -0.01em; }
    h2 { font-size: 13px; margin: 0 0 12px; font-weight: 600; letter-spacing: 0.01em; }
    .muted { color: #6b7280; }
    .sub { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    section { background: #fff; border: 1px solid #dddbd5; border-radius: 4px; padding: 16px; margin-top: 16px; }
    .grid { display: grid; gap: 12px; }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .card { background: #fff; border: 1px solid #dddbd5; border-radius: 4px; padding: 12px; }
    .num { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 4px; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .pill { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; font-family: "IBM Plex Mono", ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.04em; }
    .good { background: rgba(46,125,82,0.09); color: #2e7d52; }
    .warn { background: rgba(146,96,10,0.09); color: #92600a; }
    .bad { background: rgba(185,28,28,0.07); color: #b91c1c; }
    .bar { height: 6px; background: #f2f1ed; border-radius: 2px; overflow: hidden; margin-top: 6px; }
    .bar > div { height: 100%; background: #111110; }
    .grades { display: flex; height: 22px; border: 1px solid #dddbd5; border-radius: 3px; overflow: hidden; }
    .grades > div { display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .gA, .gB { background: rgba(46,125,82,0.12); color: #2e7d52; }
    .gC { background: rgba(146,96,10,0.12); color: #92600a; }
    .gD { background: rgba(185,28,28,0.09); color: #b91c1c; }
    .row { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; border-bottom: 1px solid #dddbd5; }
    .row:last-child { border-bottom: 0; }
    .src-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .src-card { border: 1px solid #dddbd5; border-radius: 4px; padding: 12px; background: #fff; }
    .src-card .head { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .src-card .name { font-weight: 600; font-size: 13px; }
    .src-card .id { color: #9ca3af; font-size: 11px; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .src-card .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 10px; font-size: 12px; }
    .src-card .stats .lbl { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .src-card .stats .val { font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .grade-pill { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 3px; font-size: 11px; font-weight: 700; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #dddbd5; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; font-weight: 500; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    td.n { text-align: right; font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    ol.actions { padding-left: 0; list-style: none; margin: 0; }
    ol.actions li { border: 1px solid #dddbd5; border-radius: 4px; padding: 12px 14px; margin-bottom: 10px; background: #fff; }
    ol.actions .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; }
    ol.actions .rank { color: #9ca3af; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px; margin-right: 8px; }
    ol.actions .name { font-weight: 600; font-size: 14px; }
    ol.actions .impact { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 3px; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    ol.actions .body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 12px; }
    ol.actions .body .lbl { color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; font-family: "IBM Plex Mono", ui-monospace, monospace; }
    .topissues-toggle summary { cursor: pointer; padding: 10px 14px; color: #6b7280; font-size: 12px; font-weight: 500; user-select: none; }
    .topissues-toggle[open] summary { border-bottom: 1px solid #dddbd5; margin-bottom: 8px; }
    .header-actions { display: flex; justify-content: space-between; align-items: baseline; }

    @media print {
      body { background: #fff; }
      .wrap { max-width: none; padding: 0 12mm; }
      section { box-shadow: none; page-break-inside: avoid; }
      .src-cards { grid-template-columns: repeat(2, 1fr); }
      h2 { page-break-after: avoid; }
      ol.actions li { page-break-inside: avoid; }
      .page-break { page-break-before: always; }
      .topissues-toggle { display: none; }
      @page { margin: 12mm; }
      .no-print { display: none; }
    }
  `;

  const fcv = summary.feedConversionPct;
  const fcvCls = fcv < 25 ? "bad" : fcv < 50 ? "warn" : "good";

  const eligibilityCheck = (label: string, v: number) => {
    const total = summary.checks.discovered;
    const widthPct = total > 0 ? Math.max(2, Math.round((v / total) * 100)) : 0;
    const ofTotal = total > 0 ? Math.round((v / total) * 100) : 0;
    return `<div style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px"><span style="font-weight:600">${esc(label)}</span><span class="muted">${v.toLocaleString()} <span style="color:#9ca3af">(${ofTotal}% of discovered)</span></span></div>
      <div class="bar"><div style="width:${widthPct}%"></div></div>
    </div>`;
  };

  const gd = summary.gradeDist;
  const gTotal = gd.A + gd.B + gd.C + gd.D || 1;
  const gradesBar = `<div class="grades">${
    [["A", gd.A, "gA"], ["B", gd.B, "gB"], ["C", gd.C, "gC"], ["D", gd.D, "gD"]]
      .filter(([, n]) => (n as number) > 0)
      .map(([, n, cls]) => `<div class="${cls}" style="width:${((n as number) / gTotal) * 100}%">${n}</div>`)
      .join("")
  }</div>`;

  const issueRows = buckets
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => {
      const names = items.slice(0, 3).map((r) => esc(r.sourceName)).join(", ");
      const more = items.length > 3 ? `, +${items.length - 3}` : "";
      return `<div class="row"><span>${esc(label)}</span><span class="muted" style="font-family:'IBM Plex Mono',ui-monospace,monospace">${items.length} · ${names}${more}</span></div>`;
    })
    .join("") || `<div class="muted">No issues detected.</div>`;

  const sourceCards = topSourcesNeedingAction
    .map((r) => {
      const s = statusFor(r);
      const conv = Math.round(r.feed_conversion_pct);
      const convCls = conv < 25 ? "bad" : conv < 50 ? "warn" : "good";
      const gradeCls = r.grade === "A" || r.grade === "B" ? "good" : r.grade === "C" ? "warn" : "bad";
      return `<div class="src-card">
        <div class="head">
          <div>
            <div class="name">${esc(r.sourceName)}</div>
            <div class="muted" style="font-size:11px">${esc(freshnessLabel(r.last_updated_at))}</div>
          </div>
          <span class="grade-pill ${gradeCls}">${esc(r.grade)}</span>
        </div>
        <div class="stats">
          <div><div class="lbl">Listings</div><div class="val">${Number(r.listing_count).toLocaleString()}</div></div>
          <div><div class="lbl">Public feed</div><div class="val">${r.public_feed_count_n.toLocaleString()}</div></div>
          <div><div class="lbl">Conversion</div><div class="val ${convCls}" style="background:transparent;padding:0">${conv}%</div></div>
        </div>
        <div class="muted" style="font-size:11px;margin-top:8px">
          Coverage — sqm ${r.with_sqm_pct}% · beds ${r.with_beds_pct}% · baths ${r.with_baths_pct}%
        </div>
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:12px;color:#111113">${esc(mainIssueLabel(r))}</span>
          <span class="pill ${s.tone}">${esc(s.label)}</span>
        </div>
      </div>`;
    })
    .join("");

  const tableRows = [...allSorted, ...stubRows]
    .map((r) => {
      const marketId = r.marketId;
      const marketName = marketNameById.get(marketId) ?? marketId;
      const stubTag = r.isStub ? ` <span class="pill" style="background:#eae9e4;color:#6b7280;margin-left:6px">Stub</span>` : "";
      return `<tr${r.isStub ? ' style="opacity:0.6"' : ""}>
        <td>${esc(r.sourceName)}${stubTag}</td>
        <td>${esc(marketName)}</td>
        <td class="n">${Number(r.listing_count).toLocaleString()}</td>
        <td class="n">${r.public_feed_count_n.toLocaleString()}</td>
        <td class="n">${Number(r.approved_count).toLocaleString()}</td>
        <td class="n">${r.indexable_count_n.toLocaleString()}</td>
        <td class="n">${r.trust_passed_count_n.toLocaleString()}</td>
        <td class="n">${r.with_sqm_pct}%</td>
        <td class="n">${r.with_beds_pct}%</td>
        <td class="n">${r.with_baths_pct}%</td>
        <td>${esc(freshnessLabel(r.last_updated_at))}</td>
        <td><span class="grade-pill ${r.grade === "A" || r.grade === "B" ? "good" : r.grade === "C" ? "warn" : "bad"}">${esc(r.grade)}</span></td>
      </tr>`;
    })
    .join("");

  const impactClass = (impact: ActionImpact) => impact === "High" ? "bad" : impact === "Medium" ? "warn" : "good";
  const priorityActionsHtml = priorityActions.length === 0
    ? `<div class="muted">No high-priority issues for this market.</div>`
    : `<ol class="actions">${priorityActions
        .map((a, i) => `<li>
            <div class="head">
              <div><span class="rank">Priority ${i + 1}</span><span class="name">${esc(a.title)}</span></div>
              <span class="impact ${impactClass(a.impact)}">Impact: ${esc(a.impact)}</span>
            </div>
            <div class="body">
              <div><div class="lbl">Problem</div><div>${esc(a.problem)}</div></div>
              <div><div class="lbl">Why it matters</div><div class="muted">${esc(a.why)}</div></div>
              <div><div class="lbl">Check next</div><div class="muted">${esc(a.checkNext)}</div></div>
            </div>
          </li>`)
        .join("")}</ol>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>AREI — Source Health Report (${esc(marketLabel)}) — ${esc(generated.slice(0, 10))}</title>
<style>${styles}</style>
</head>
<body>
<div class="wrap">
  <div class="header-actions">
    <div style="display:flex;align-items:center;gap:12px">
      <!-- Inline copy of docs/brand/assets/d-layers-mark.svg — must stay in sync with canonical asset and arei-admin/app.tsx DLayersMark -->
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" stroke="#111110" stroke-width="1.4" stroke-linecap="square">
        <rect x="3"   y="3"   width="14" height="14" />
        <rect x="6.5" y="6.5" width="14" height="14" />
        <rect x="10"  y="10"  width="9"  height="9"  fill="#111110" stroke="none" />
      </svg>
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:'IBM Plex Mono',ui-monospace,monospace;margin-bottom:2px">AREI · Source Health Report</div>
        <h1>${esc(marketLabel)}</h1>
        <div class="muted">Generated ${esc(generated)}</div>
      </div>
    </div>
    <button class="no-print" onclick="window.print()" style="padding:6px 12px;border:1px solid #dddbd5;background:#fff;border-radius:3px;cursor:pointer;font-size:12px;font-family:'IBM Plex Mono',ui-monospace,monospace">Print / Save PDF</button>
  </div>

  <section>
    <h2>Executive summary</h2>
    <div class="grid grid-4">
      <div class="card"><div class="sub">Total listings</div><div class="num">${summary.totalListings.toLocaleString()}</div></div>
      <div class="card"><div class="sub">Public feed</div><div class="num">${summary.publicFeed.toLocaleString()}</div></div>
      <div class="card"><div class="sub">Feed conversion</div><div class="num ${fcvCls}" style="background:transparent;padding:0">${fcv}%</div><div class="muted" style="font-size:11px">public feed ÷ approved</div></div>
      <div class="card"><div class="sub">Sources</div><div class="num">${summary.sourceCount}</div></div>
      <div class="card"><div class="sub">Stale sources</div><div class="num ${summary.staleCount > 0 ? "warn" : "good"}" style="background:transparent;padding:0">${summary.staleCount}</div><div class="muted" style="font-size:11px">≥ ${STALE_DAYS}d since update</div></div>
      <div class="card"><div class="sub">Approved, 0 feed</div><div class="num ${summary.approvedNoFeedCount > 0 ? "bad" : "good"}" style="background:transparent;padding:0">${summary.approvedNoFeedCount}</div><div class="muted" style="font-size:11px">approved but never public</div></div>
      <div class="card" style="grid-column: span 2"><div class="sub">Grade distribution</div><div style="margin-top:8px">${gradesBar}</div><div class="muted" style="font-size:11px;margin-top:6px">A · ${gd.A}  ·  B · ${gd.B}  ·  C · ${gd.C}  ·  D · ${gd.D}</div></div>
    </div>
  </section>

  <section>
    <h2>Eligibility checks</h2>
    <p class="muted" style="font-size:11px;margin:0 0 8px">Independent flags — each is a separate boolean on the listing, not a subset of the previous.</p>
    ${eligibilityCheck("Approved", summary.checks.approved)}
    ${eligibilityCheck("Indexable", summary.checks.indexable)}
    ${eligibilityCheck("Trust passed", summary.checks.trustPassed)}
    ${eligibilityCheck("Public feed", summary.checks.publicFeed)}
  </section>

  <section>
    <h2>Priority actions</h2>
    ${priorityActionsHtml}
  </section>

  <section class="topissues-toggle">
    <details>
      <summary>Top issues to address — technical summary</summary>
      ${issueRows}
    </details>
  </section>

  <section>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:8px">
      <h2 style="margin:0">Top sources needing action</h2>
      <span class="muted" style="font-size:11px">showing ${topSourcesNeedingAction.length} of ${rows.length} sources</span>
    </div>
    <div class="src-cards">${sourceCards}</div>
  </section>

  ${stubRows.length > 0 ? `<section style="border-style:dashed">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:6px">
      <h2 style="margin:0;color:#6b7280">Test / stub sources</h2>
      <span class="pill" style="background:#f5f5f7;color:#6b7280">excluded from aggregates</span>
    </div>
    <p class="muted" style="font-size:11px;margin:0 0 8px">Declared as <code>type: stub</code> in <code>markets/${esc(marketLabel.toLowerCase() === "cape verde" ? "cv" : "*")}/sources.yml</code>; not counted in summary, eligibility checks, priority actions, or top sources.</p>
    <ul style="margin:0;padding-left:18px;font-size:12px;color:#6b7280">
      ${stubRows.map((r) => `<li><strong style="color:#111113">${esc(r.sourceName)}</strong> <span style="font-family:'IBM Plex Mono',ui-monospace,monospace;color:#9ca3af">· ${esc(r.source_id)}</span> — ${Number(r.listing_count).toLocaleString()} listings · ${r.public_feed_count_n.toLocaleString()} feed</li>`).join("")}
    </ul>
  </section>` : ""}

  <section class="page-break">
    <h2>Source detail table</h2>
    <table>
      <thead><tr>
        <th>Source</th><th>Market</th><th style="text-align:right">Listings</th><th style="text-align:right">Public feed</th><th style="text-align:right">Approved</th><th style="text-align:right">Indexable</th><th style="text-align:right">Trust passed</th><th style="text-align:right">Sqm %</th><th style="text-align:right">Beds %</th><th style="text-align:right">Baths %</th><th>Freshness</th><th>Grade</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>
</div>
</body>
</html>`;
}
