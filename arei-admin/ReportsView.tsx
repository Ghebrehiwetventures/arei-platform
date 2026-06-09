import { Fragment, useMemo, useState } from "react";
import {
  conversionVerdict,
  getMarketingCampaignResults,
  intentVerdict,
  summarizeMarketingReport,
  trafficVerdict,
  type MarketingCampaignWithMetrics,
} from "./marketingPerformance";

export type ReportsTab = "reports" | "reports-marketing";

function formatSek(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("sv-SE").format(value);
}

function formatRate(value: number | null): string {
  if (value === null) return "Not tracked yet";
  return new Intl.NumberFormat("sv-SE", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateRange(row: MarketingCampaignWithMetrics): string {
  const start = new Date(row.startDate);
  const end = new Date(row.endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "-";
  const formatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
  return `${formatter.format(start)}-${formatter.format(end)}`;
}

function trackedNumber(value: number | null): string {
  return value === null ? "Not tracked yet" : formatNumber(value);
}

function verdictLabels(row: MarketingCampaignWithMetrics): string[] {
  return [
    trafficVerdict(row.metrics.costPerWebsiteVisit),
    intentVerdict(row),
    conversionVerdict(row),
  ].filter((label): label is string => Boolean(label));
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border border-border rounded-lg bg-surface-1 p-4">
      <div className="text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tracking-tight text-foreground tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-xs text-foreground-muted">{detail}</div>}
    </div>
  );
}

function VerdictPill({ label }: { label: string }) {
  const tone =
    label === "Excellent traffic" || label === "Strong intent signal"
      ? "bg-green-muted text-green"
      : label === "Good traffic"
        ? "bg-accent-muted text-deep-green"
        : label === "Expensive traffic" || label === "Weak conversion signal"
          ? "bg-amber-muted text-amber"
          : "bg-surface-3 text-foreground-muted";

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone}`}>
      {label}
    </span>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-xs text-foreground-muted">{label}</span>
      <span className="text-xs font-medium text-foreground tabular-nums text-right">{value}</span>
    </div>
  );
}

export function ReportsLandingView({ onNavigate }: { onNavigate: (tab: ReportsTab) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">Reports</div>
        <h1 className="mt-2 text-[24px] font-bold tracking-tight text-foreground font-mono">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
          Internal reporting for comparing marketing spend, traffic, and later registration attribution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate("reports-marketing")}
          className="border border-border rounded-lg bg-surface-1 p-5 text-left hover:bg-surface-2 transition-colors"
        >
          <div className="text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">Marketing</div>
          <div className="mt-2 text-lg font-semibold text-foreground">Marketing Performance</div>
          <div className="mt-2 text-sm text-foreground-muted">
            Compare Instagram and Meta campaign results by spend, website visits, engagement, and follow signals.
          </div>
        </button>
      </div>
    </div>
  );
}

export function MarketingPerformanceReportView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rows = useMemo(() => getMarketingCampaignResults(), []);
  const summary = useMemo(() => summarizeMarketingReport(rows), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">Reports</div>
          <h1 className="mt-2 text-[24px] font-bold tracking-tight text-foreground font-mono">
            Marketing Performance
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-foreground-muted">
            Manual v1 report for paid campaign comparison. Meta Ads API import, CSV import, UTM tracking,
            registrations, saved objects, search alerts, and monthly exports can be added later.
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded border border-border bg-surface-1 px-3 py-1.5 text-xs text-foreground-muted">
          Source: manual seed data
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg bg-surface-1 p-8 text-center text-sm text-foreground-muted">
          No marketing reports yet. Add campaign results manually or connect a data source later.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <SummaryCard label="Total spend" value={formatSek(summary.totalSpendSek)} />
            <SummaryCard label="Website visits" value={formatNumber(summary.totalWebsiteVisits)} />
            <SummaryCard label="Avg. cost / website visit" value={formatSek(summary.averageCostPerWebsiteVisit)} />
            <SummaryCard label="Link clicks" value={formatNumber(summary.totalLinkClicks)} detail="Missing rows are excluded" />
            <SummaryCard label="Follows" value={formatNumber(summary.totalFollows)} />
            <SummaryCard
              label="Best cost / visit"
              value={summary.bestByCostPerWebsiteVisit?.campaignName ?? "-"}
              detail={summary.bestByCostPerWebsiteVisit
                ? formatSek(summary.bestByCostPerWebsiteVisit.metrics.costPerWebsiteVisit)
                : undefined}
            />
          </div>

          <div className="border border-border rounded-lg bg-surface-1 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Campaign comparison</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1040px] w-full text-sm">
                <thead className="bg-surface-2 text-[11px] font-mono uppercase tracking-widest text-foreground-subtle">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium min-w-[180px]">Campaign</th>
                    <th className="px-3 py-3 text-left font-medium">Dates</th>
                    <th className="px-3 py-3 text-right font-medium">Spend</th>
                    <th className="px-3 py-3 text-right font-medium">Views</th>
                    <th className="px-3 py-3 text-right font-medium">Reach</th>
                    <th className="px-3 py-3 text-right font-medium">Link clicks</th>
                    <th className="px-3 py-3 text-right font-medium">Website visits</th>
                    <th className="px-3 py-3 text-right font-medium">Cost / visit</th>
                    <th className="px-3 py-3 text-right font-medium">Saves</th>
                    <th className="px-3 py-3 text-right font-medium">Shares</th>
                    <th className="px-3 py-3 text-right font-medium">Follows</th>
                    <th className="px-4 py-3 text-left font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr className="border-t border-border hover:bg-surface-2">
                          <td className="px-4 py-3 min-w-[180px]">
                            <button
                              onClick={() => setExpandedId(expanded ? null : row.id)}
                              className="text-left font-medium text-foreground hover:text-deep-green"
                            >
                              {row.campaignName}
                              <span className="ml-2 text-[11px] text-foreground-subtle">{expanded ? "Hide" : "Details"}</span>
                            </button>
                            <div className="text-xs text-foreground-muted">{row.platform}</div>
                          </td>
                          <td className="px-3 py-3 text-foreground-muted whitespace-nowrap">{formatDateRange(row)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatSek(row.spendSek)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.views)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.reach)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.linkClicks)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.websiteVisits)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-medium">{formatSek(row.metrics.costPerWebsiteVisit)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.saves)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.shares)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatNumber(row.follows)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {verdictLabels(row).map((label) => <VerdictPill key={label} label={label} />)}
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-t border-border bg-surface-2">
                            <td colSpan={12} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-lg border border-border bg-surface-1 p-4">
                                  <h3 className="text-xs font-mono uppercase tracking-widest text-foreground-subtle">Traffic</h3>
                                  <div className="mt-2">
                                    <MetricLine label="Cost per link click" value={formatSek(row.metrics.costPerLinkClick)} />
                                    <MetricLine label="Link click -> website visit" value={formatRate(row.metrics.linkClickToWebsiteVisitRate)} />
                                    <MetricLine label="Website visit rate from reach" value={formatRate(row.metrics.websiteVisitRateFromReach)} />
                                    <MetricLine label="External link taps" value={formatNumber(row.externalLinkTaps)} />
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-1 p-4">
                                  <h3 className="text-xs font-mono uppercase tracking-widest text-foreground-subtle">Engagement</h3>
                                  <div className="mt-2">
                                    <MetricLine label="Likes and reactions" value={formatNumber(row.likesAndReactions)} />
                                    <MetricLine label="Comments" value={formatNumber(row.comments)} />
                                    <MetricLine label="Engagement total" value={formatNumber(row.metrics.engagementTotal)} />
                                    <MetricLine label="Engagement rate from reach" value={formatRate(row.metrics.engagementRateFromReach)} />
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-1 p-4">
                                  <h3 className="text-xs font-mono uppercase tracking-widest text-foreground-subtle">Business outcomes</h3>
                                  <div className="mt-2">
                                    <MetricLine label="Profile visits" value={formatNumber(row.profileVisits)} />
                                    <MetricLine label="Follow rate from profile visits" value={formatRate(row.metrics.followRateFromProfileVisits)} />
                                    <MetricLine label="Registrations" value={trackedNumber(row.registrations)} />
                                    <MetricLine label="Saved objects" value={trackedNumber(row.savedObjects)} />
                                    <MetricLine label="Search alerts created" value={trackedNumber(row.searchAlertsCreated)} />
                                    <MetricLine label="Cost per registration" value={row.metrics.costPerRegistration === null ? "Not tracked yet" : formatSek(row.metrics.costPerRegistration)} />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 text-xs text-foreground-muted">
                                Source: {row.source ?? "manual"}{row.note ? ` - ${row.note}` : ""}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
