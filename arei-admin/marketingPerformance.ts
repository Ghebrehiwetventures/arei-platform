export type MarketingReportSource = "manual" | "meta_api" | "screenshot_import" | "csv";

export interface MarketingCampaignResult {
  id: string;
  campaignName: string;
  platform: "Instagram" | "Facebook" | "Meta" | string;
  startDate: string;
  endDate: string;
  spendSek: number;
  views: number | null;
  reach: number | null;
  linkClicks: number | null;
  websiteVisits: number | null;
  likesAndReactions: number | null;
  saves: number | null;
  shares: number | null;
  comments: number | null;
  profileVisits: number | null;
  follows: number | null;
  externalLinkTaps: number | null;
  registrations: number | null;
  savedObjects: number | null;
  searchAlertsCreated: number | null;
  note?: string;
  source?: MarketingReportSource;
}

export interface MarketingCampaignMetrics {
  costPerWebsiteVisit: number | null;
  costPerLinkClick: number | null;
  linkClickToWebsiteVisitRate: number | null;
  websiteVisitRateFromReach: number | null;
  followRateFromProfileVisits: number | null;
  engagementTotal: number;
  engagementRateFromReach: number | null;
  costPerRegistration: number | null;
}

export interface MarketingCampaignWithMetrics extends MarketingCampaignResult {
  metrics: MarketingCampaignMetrics;
}

export interface MarketingReportSummary {
  totalSpendSek: number;
  totalWebsiteVisits: number;
  averageCostPerWebsiteVisit: number | null;
  totalLinkClicks: number;
  totalFollows: number;
  bestByCostPerWebsiteVisit: MarketingCampaignWithMetrics | null;
}

function safeDivide(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return numerator / denominator;
}

function metricNumber(value: number | null | undefined): number {
  return value ?? 0;
}

export function calculateMarketingMetrics(row: MarketingCampaignResult): MarketingCampaignMetrics {
  const engagementTotal =
    metricNumber(row.likesAndReactions) +
    metricNumber(row.saves) +
    metricNumber(row.shares) +
    metricNumber(row.comments);

  return {
    costPerWebsiteVisit: safeDivide(row.spendSek, row.websiteVisits),
    costPerLinkClick: safeDivide(row.spendSek, row.linkClicks),
    linkClickToWebsiteVisitRate: safeDivide(row.websiteVisits, row.linkClicks),
    websiteVisitRateFromReach: safeDivide(row.websiteVisits, row.reach),
    followRateFromProfileVisits: safeDivide(row.follows, row.profileVisits),
    engagementTotal,
    engagementRateFromReach: safeDivide(engagementTotal, row.reach),
    costPerRegistration: safeDivide(row.spendSek, row.registrations),
  };
}

export function withMarketingMetrics(rows: MarketingCampaignResult[]): MarketingCampaignWithMetrics[] {
  return rows.map((row) => ({
    ...row,
    metrics: calculateMarketingMetrics(row),
  }));
}

export function summarizeMarketingReport(rows: MarketingCampaignWithMetrics[]): MarketingReportSummary {
  const totalSpendSek = rows.reduce((sum, row) => sum + row.spendSek, 0);
  const totalWebsiteVisits = rows.reduce((sum, row) => sum + metricNumber(row.websiteVisits), 0);
  const totalLinkClicks = rows.reduce((sum, row) => sum + metricNumber(row.linkClicks), 0);
  const totalFollows = rows.reduce((sum, row) => sum + metricNumber(row.follows), 0);

  const candidates = rows.filter((row) => row.metrics.costPerWebsiteVisit !== null);
  const bestByCostPerWebsiteVisit = candidates.length > 0
    ? candidates.reduce((best, row) =>
        (row.metrics.costPerWebsiteVisit ?? Number.POSITIVE_INFINITY) <
        (best.metrics.costPerWebsiteVisit ?? Number.POSITIVE_INFINITY)
          ? row
          : best,
      )
    : null;

  return {
    totalSpendSek,
    totalWebsiteVisits,
    averageCostPerWebsiteVisit: safeDivide(totalSpendSek, totalWebsiteVisits),
    totalLinkClicks,
    totalFollows,
    bestByCostPerWebsiteVisit,
  };
}

export function trafficVerdict(costPerWebsiteVisit: number | null): "Excellent traffic" | "Good traffic" | "Expensive traffic" | "Missing traffic data" {
  if (costPerWebsiteVisit === null) return "Missing traffic data";
  if (costPerWebsiteVisit < 1) return "Excellent traffic";
  if (costPerWebsiteVisit <= 2) return "Good traffic";
  return "Expensive traffic";
}

export function intentVerdict(row: MarketingCampaignWithMetrics): string | null {
  const savesAndShares = metricNumber(row.saves) + metricNumber(row.shares);
  const intentRate = safeDivide(savesAndShares, row.reach);
  if (intentRate !== null && intentRate >= 0.0005) return "Strong intent signal";
  return null;
}

export function conversionVerdict(row: MarketingCampaignWithMetrics): string | null {
  const followRate = row.metrics.followRateFromProfileVisits;
  if (followRate !== null && followRate < 0.05) return "Weak conversion signal";
  if (row.registrations === 0) return "Weak conversion signal";
  return null;
}

export const marketingCampaignResults: MarketingCampaignResult[] = [
  {
    id: "instagram-ad-1",
    campaignName: "Instagram Ad 1",
    platform: "Instagram",
    startDate: "2026-05-31",
    endDate: "2026-06-06",
    spendSek: 1289.41,
    views: 176191,
    reach: 56477,
    linkClicks: 1795,
    websiteVisits: 1477,
    likesAndReactions: 239,
    saves: 16,
    shares: 17,
    comments: 4,
    profileVisits: 283,
    follows: 16,
    externalLinkTaps: 4,
    registrations: null,
    savedObjects: null,
    searchAlertsCreated: null,
    note: "Manual seed row from current Instagram ad result screenshot.",
    source: "manual",
  },
  {
    id: "instagram-ad-2",
    campaignName: "Instagram Ad 2",
    platform: "Instagram",
    startDate: "2026-05-31",
    endDate: "2026-06-06",
    spendSek: 1289.4,
    views: 181262,
    reach: 49177,
    linkClicks: null,
    websiteVisits: 1405,
    likesAndReactions: 238,
    saves: 24,
    shares: 15,
    comments: 2,
    profileVisits: 335,
    follows: 19,
    externalLinkTaps: 4,
    registrations: null,
    savedObjects: null,
    searchAlertsCreated: null,
    note: "Manual seed row from current Instagram ad result screenshot. Link clicks were not available.",
    source: "manual",
  },
];

export function getMarketingCampaignResults(): MarketingCampaignWithMetrics[] {
  return withMarketingMetrics(marketingCampaignResults);
}
