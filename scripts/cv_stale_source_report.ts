import * as fs from "fs";
import * as path from "path";
import yaml from "js-yaml";
import {
  CV_MARKET,
  formatCountTable,
  writeArtifactPair,
  withClient,
} from "./lib/cvOps";

const STALE_DAYS = 14;

type SourceLifecycle = "IN" | "OBSERVE" | "DROP" | "UNKNOWN";
type SourceTier = "active" | "monitor" | "deprecated" | "unknown";
type FailureReason =
  | "crawl_failure"
  | "parser_breakage"
  | "dedup_canonicalization_issue"
  | "source_inventory_stale"
  | "thin_feed"
  | "unknown";
type RecommendedAction =
  | "investigate_crawl"
  | "investigate_parser"
  | "investigate_dedup"
  | "monitor_only"
  | "retire_source";
type Priority = "P1" | "P2" | "P3" | "P4";
type OperationalCategory = "active_source_problem" | "legacy_only_tail" | "drop_source_tail";

interface SourceConfigLite {
  id: string;
  name: string;
  lifecycleOverride?: SourceLifecycle;
  sourceTier?: Exclude<SourceTier, "unknown">;
  fetch_method?: string;
  url?: string;
}

interface RawSourceRow {
  source_id: string;
  total_listings: number;
  stale_listings: number;
  stale_share_pct: string | number;
  newly_stale_count: string | number | null;
  reactivated_count: string | number | null;
  last_seen_max: string | null;
  seen_in_latest_run: number;
  latest_run_started_at: string | null;
  latest_fetched_count: number | null;
  latest_public_count: number | null;
  latest_quality_score: string | number | null;
  latest_base_quality_score: string | number | null;
  price_completeness: string | number | null;
  location_completeness: string | number | null;
  image_validity_rate: string | number | null;
  duplicate_rate: string | number | null;
  previous_fetched_count: number | null;
  previous_public_count: number | null;
  stale_never_seen_again: number;
  stale_seen_before: number;
  canonicalized_duplicates: number;
  canonical_count: number;
  latest_non_public_count: number;
  dominant_latest_review_reason: string | null;
  dominant_latest_review_reason_count: number | null;
}

interface SourceStaleAssessment {
  sourceId: string;
  sourceName: string;
  lifecycle: SourceLifecycle;
  sourceTier: SourceTier;
  fetchMethod: string | null;
  totalListings: number;
  staleListings: number;
  staleSharePct: number;
  latestRunStartedAt: string | null;
  latestFetchedCount: number | null;
  latestPublicCount: number | null;
  previousFetchedCount: number | null;
  previousPublicCount: number | null;
  seenInLatestRun: number;
  lastSeenMax: string | null;
  newlyStaleCount: number;
  reactivatedCount: number;
  latestQualityScore: number | null;
  latestBaseQualityScore: number | null;
  priceCompleteness: number | null;
  locationCompleteness: number | null;
  imageValidityRate: number | null;
  duplicateRate: number | null;
  canonicalizedDuplicates: number;
  canonicalCount: number;
  latestNonPublicCount: number;
  dominantLatestReviewReason: string | null;
  dominantLatestReviewReasonCount: number;
  staleNeverSeenAgain: number;
  staleSeenBefore: number;
  failureReason: FailureReason;
  operationalCategory: OperationalCategory;
  evidence: string;
  recommendedAction: RecommendedAction;
  priority: Priority;
  impactRankScore: number;
}

interface StaleSourceReport {
  market: string;
  generatedAt: string;
  definition: {
    staleThresholdDays: number;
    staleListingRule: string;
    sourceStaleShareFormula: string;
    impactRankingRule: string;
  };
  latestRunStartedAt: string | null;
  leaderboard: SourceStaleAssessment[];
  topContributorsByImpact: SourceStaleAssessment[];
  causeBuckets: Array<{
    cause: FailureReason;
    sourceCount: number;
    staleListings: number;
  }>;
  focusedDiagnostics: SourceStaleAssessment[];
  recommendations: Array<{
    priority: Priority;
    sourceId: string;
    sourceName: string;
    sourceTier: SourceTier;
    operationalCategory: OperationalCategory;
    staleSharePct: number;
    qualityScore: number | null;
    failureReason: FailureReason;
    evidence: string;
    recommendedAction: RecommendedAction;
  }>;
  adminSurfaceAssessment: {
    warranted: boolean;
    rationale: string;
  };
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function loadCvSourceConfig(): Map<string, SourceConfigLite> {
  const raw = fs.readFileSync(path.resolve(__dirname, "../markets/cv/sources.yml"), "utf8");
  const parsed = yaml.load(raw) as { sources?: SourceConfigLite[] } | undefined;
  const map = new Map<string, SourceConfigLite>();
  for (const source of parsed?.sources ?? []) {
    map.set(source.id, source);
  }
  return map;
}

function classify(row: RawSourceRow, source: SourceConfigLite | undefined): {
  failureReason: FailureReason;
  operationalCategory: OperationalCategory;
  evidence: string;
  recommendedAction: RecommendedAction;
  priority: Priority;
} {
  const lifecycle = source?.lifecycleOverride ?? "UNKNOWN";
  const sourceTier = source?.sourceTier ?? "unknown";
  const staleShare = toNumber(row.stale_share_pct) ?? 0;
  const latestFetched = row.latest_fetched_count;
  const latestPublic = row.latest_public_count;
  const previousPublic = row.previous_public_count;
  const seenInLatestRun = row.seen_in_latest_run ?? 0;
  const baseQuality = toNumber(row.latest_base_quality_score);
  const quality = toNumber(row.latest_quality_score);
  const price = toNumber(row.price_completeness);
  const location = toNumber(row.location_completeness);
  const image = toNumber(row.image_validity_rate);
  const duplicateRate = toNumber(row.duplicate_rate) ?? 0;
  const canonicalizedDuplicates = Number(row.canonicalized_duplicates ?? 0);
  const canonicalCount = Number(row.canonical_count ?? 0);
  const staleNeverSeenAgain = Number(row.stale_never_seen_again ?? 0);
  const staleSeenBefore = Number(row.stale_seen_before ?? 0);
  const latestNonPublic = Number(row.latest_non_public_count ?? 0);
  const dominantReason = row.dominant_latest_review_reason;
  const dominantReasonCount = Number(row.dominant_latest_review_reason_count ?? 0);
  const thinFeed =
    latestFetched != null &&
    latestFetched <= 10 &&
    staleShare >= 50 &&
    dominantReason !== "SOLD_OR_RESERVED";
  const mostlyLegacyTail =
    Number(row.stale_listings ?? 0) > 0 &&
    staleNeverSeenAgain / Number(row.stale_listings) >= 0.75;
  const priority: Priority =
    source?.id === "cv_oceanproperty24"
      ? "P1"
      : source?.id === "cv_cabohouseproperty" || source?.id === "cv_homescasaverde"
        ? "P2"
        : source?.id === "cv_terracaboverde"
          ? "P3"
          : sourceTier === "monitor"
            ? "P3"
            : sourceTier === "active"
              ? "P4"
              : "P4";

  if (lifecycle === "DROP" || sourceTier === "deprecated") {
    return {
      failureReason: "source_inventory_stale",
      operationalCategory: "drop_source_tail",
      evidence: "No latest run metrics and source is deprecated/DROP, so remaining stale rows are historical inventory only.",
      recommendedAction: "retire_source",
      priority: "P4",
    };
  }

  if (lifecycle === "OBSERVE" && latestFetched == null) {
    return {
      failureReason: "crawl_failure",
      operationalCategory: "active_source_problem",
      evidence: "Source is in OBSERVE and has no latest source_run_metrics, which points to a crawl-path failure rather than current inventory churn.",
      recommendedAction: "investigate_crawl",
      priority,
    };
  }

  if (latestFetched == null || seenInLatestRun === 0) {
    return {
      failureReason: "crawl_failure",
      operationalCategory: "active_source_problem",
      evidence: "No current-run fetch/update signal is present even though stale inventory remains.",
      recommendedAction: "investigate_crawl",
      priority,
    };
  }

  if (
    (duplicateRate >= 10 || canonicalizedDuplicates >= 3) &&
    canonicalCount > 0
  ) {
    return {
      failureReason: "dedup_canonicalization_issue",
      operationalCategory: "active_source_problem",
      evidence: `duplicate_rate=${duplicateRate.toFixed(2)} and canonicalized_duplicates=${canonicalizedDuplicates}, which is high enough to suspect canonicalization noise.`,
      recommendedAction: "investigate_dedup",
      priority,
    };
  }

  if (
    (price != null && price < 90) ||
    (location != null && location < 90) ||
    (image != null && image < 90) ||
    (baseQuality != null && baseQuality < 95) ||
    (dominantReason === "MISSING_ISLAND_MAPPING" && dominantReasonCount >= 3)
  ) {
    return {
      failureReason: "parser_breakage",
      operationalCategory: "active_source_problem",
      evidence:
        dominantReason === "MISSING_ISLAND_MAPPING"
          ? `Latest non-public rows are dominated by ${dominantReason} (${dominantReasonCount}), which points to extraction/normalization loss rather than crawl failure.`
          : `Completeness/base-quality is weak despite active fetches (price=${price ?? 0}, location=${location ?? 0}, image=${image ?? 0}, base_quality=${baseQuality ?? 0}).`,
      recommendedAction: "investigate_parser",
      priority,
    };
  }

  if (thinFeed && staleShare >= 40) {
    return {
      failureReason: "thin_feed",
      operationalCategory: mostlyLegacyTail ? "legacy_only_tail" : "active_source_problem",
      evidence: `latest_fetched_count=${latestFetched}, stale_share_pct=${staleShare.toFixed(2)}, and duplicate/canonicalization signals are clean, so the source currently behaves like a thin feed.`,
      recommendedAction: "monitor_only",
      priority,
    };
  }

  if (
    staleShare >= 20 &&
    latestFetched > 0 &&
    baseQuality != null &&
    baseQuality >= 98 &&
    (duplicateRate < 10 && canonicalizedDuplicates === 0) &&
    (
      dominantReason === "SOLD_OR_RESERVED" ||
      (previousPublic != null && latestPublic != null && latestPublic < previousPublic)
    )
  ) {
    return {
      failureReason: "source_inventory_stale",
      operationalCategory: "legacy_only_tail",
      evidence:
        dominantReason === "SOLD_OR_RESERVED"
          ? `Latest exclusions are dominated by SOLD_OR_RESERVED (${dominantReasonCount}) and stale_share_pct=${staleShare.toFixed(2)} while duplicate_rate=${duplicateRate.toFixed(2)}.`
          : `public_count fell from ${previousPublic ?? 0} to ${latestPublic ?? 0} while stale_share_pct stayed at ${staleShare.toFixed(2)} with healthy quality.`,
      recommendedAction: "monitor_only",
      priority,
    };
  }

  if (
    sourceTier === "monitor" &&
    staleShare >= 35 &&
    latestFetched > 0 &&
    baseQuality != null &&
    baseQuality >= 98 &&
    duplicateRate < 10 &&
    canonicalizedDuplicates === 0
  ) {
    return {
      failureReason: "source_inventory_stale",
      operationalCategory: "legacy_only_tail",
      evidence: `Monitor source with stale_share_pct=${staleShare.toFixed(2)}, base_quality=${baseQuality.toFixed(2)}, and no crawl/dedup break signal, so stale inventory is the primary issue.`,
      recommendedAction: "monitor_only",
      priority,
    };
  }

  return {
    failureReason: "unknown",
    operationalCategory: mostlyLegacyTail ? "legacy_only_tail" : "active_source_problem",
    evidence: `Signals are mixed: stale_share_pct=${staleShare.toFixed(2)}, base_quality=${baseQuality ?? 0}, quality=${quality ?? 0}, dominant_reason=${dominantReason ?? "none"}.`,
    recommendedAction: "monitor_only",
    priority,
  };
}

async function main(): Promise<void> {
  const generatedAt = new Date().toISOString();
  const sourceConfig = loadCvSourceConfig();

  const report = await withClient<StaleSourceReport>(async (client) => {
    const { rows } = await client.query<RawSourceRow>(
      `
        WITH latest_run AS (
          SELECT id, started_at
          FROM public.ingest_runs
          WHERE market = $1
            AND status = 'completed'
          ORDER BY started_at DESC
          LIMIT 1
        ),
        previous_run AS (
          SELECT id, started_at
          FROM public.ingest_runs
          WHERE market = $1
            AND status = 'completed'
          ORDER BY started_at DESC
          OFFSET 1
          LIMIT 1
        ),
        latest_metrics AS (
          SELECT s.*
          FROM public.source_run_metrics s
          JOIN latest_run lr ON lr.id = s.ingest_run_id
          WHERE s.market = $1
        ),
        previous_metrics AS (
          SELECT s.*
          FROM public.source_run_metrics s
          JOIN previous_run pr ON pr.id = s.ingest_run_id
          WHERE s.market = $1
        ),
        quality_rpc AS (
          SELECT * FROM public.get_source_quality_stats()
        ),
        listing_base AS (
          SELECT
            l.source_id,
            COUNT(*)::int AS total_listings,
            COUNT(*) FILTER (WHERE COALESCE(l.is_stale, false) = true)::int AS stale_listings,
            COUNT(*) FILTER (
              WHERE COALESCE(l.is_stale, false) = true
                AND l.last_seen_at IS NULL
            )::int AS stale_never_seen_again,
            COUNT(*) FILTER (
              WHERE COALESCE(l.is_stale, false) = true
                AND l.last_seen_at IS NOT NULL
            )::int AS stale_seen_before,
            MAX(COALESCE(l.last_seen_at, l.first_seen_at)) AS last_seen_max,
            COUNT(*) FILTER (
              WHERE COALESCE(l.last_seen_at, l.first_seen_at) >= (SELECT started_at FROM latest_run)
            )::int AS seen_in_latest_run,
            COUNT(*) FILTER (
              WHERE COALESCE(l.last_seen_at, l.first_seen_at) >= (SELECT started_at FROM latest_run)
                AND COALESCE(l.trust_gate_passed, false) = false
            )::int AS latest_non_public_count,
            COUNT(DISTINCT COALESCE(l.canonical_listing_id, l.id))::int AS canonical_count,
            COUNT(*) FILTER (
              WHERE l.canonical_listing_id IS NOT NULL
                AND l.canonical_listing_id <> l.id
            )::int AS canonicalized_duplicates
          FROM public.listings l
          WHERE l.source_id ILIKE ($1 || '\\_%')
          GROUP BY l.source_id
        ),
        latest_review_reason AS (
          SELECT source_id, reason, reason_count
          FROM (
            SELECT
              l.source_id,
              reason.reason,
              COUNT(*)::int AS reason_count,
              ROW_NUMBER() OVER (
                PARTITION BY l.source_id
                ORDER BY COUNT(*) DESC, reason.reason ASC
              ) AS rank_no
            FROM public.listings l
            CROSS JOIN LATERAL unnest(COALESCE(l.review_reasons, ARRAY[]::text[])) AS reason(reason)
            WHERE l.source_id ILIKE ($1 || '\\_%')
              AND COALESCE(l.last_seen_at, l.first_seen_at) >= (SELECT started_at FROM latest_run)
              AND COALESCE(l.trust_gate_passed, false) = false
            GROUP BY l.source_id, reason.reason
          ) ranked
          WHERE rank_no = 1
        ),
        stale_rpc AS (
          SELECT * FROM public.get_source_stale_stats($1)
        )
        SELECT
          lb.source_id,
          lb.total_listings,
          lb.stale_listings,
          lb.stale_never_seen_again,
          lb.stale_seen_before,
          ROUND((lb.stale_listings::numeric / NULLIF(lb.total_listings, 0)) * 100, 2) AS stale_share_pct,
          sr.newly_stale_count,
          sr.reactivated_count,
          lb.last_seen_max,
          lb.seen_in_latest_run,
          lb.latest_non_public_count,
          lb.canonical_count,
          lb.canonicalized_duplicates,
          lrr.reason AS dominant_latest_review_reason,
          lrr.reason_count AS dominant_latest_review_reason_count,
          sr.latest_run_started_at,
          lm.fetched_count AS latest_fetched_count,
          lm.public_count AS latest_public_count,
          qr.quality_score AS latest_quality_score,
          qr.base_quality_score AS latest_base_quality_score,
          lm.price_completeness,
          lm.location_completeness,
          lm.image_validity_rate,
          lm.duplicate_rate,
          pm.fetched_count AS previous_fetched_count,
          pm.public_count AS previous_public_count
        FROM listing_base lb
        LEFT JOIN stale_rpc sr ON sr.source_id = lb.source_id
        LEFT JOIN quality_rpc qr ON qr.source_id = lb.source_id
        LEFT JOIN latest_metrics lm ON lm.source_id = lb.source_id
        LEFT JOIN previous_metrics pm ON pm.source_id = lb.source_id
        LEFT JOIN latest_review_reason lrr ON lrr.source_id = lb.source_id
        ORDER BY lb.stale_listings DESC, stale_share_pct DESC, lb.source_id ASC
      `,
      [CV_MARKET]
    );

    const leaderboard: SourceStaleAssessment[] = rows.map((row) => {
      const source = sourceConfig.get(row.source_id);
      const classification = classify(row, source);
      const staleListings = row.stale_listings ?? 0;
      const staleSharePct = toNumber(row.stale_share_pct) ?? 0;

      return {
        sourceId: row.source_id,
        sourceName: source?.name ?? row.source_id,
        lifecycle: source?.lifecycleOverride ?? "UNKNOWN",
        sourceTier: source?.sourceTier ?? "unknown",
        fetchMethod: source?.fetch_method ?? null,
        totalListings: row.total_listings ?? 0,
        staleListings,
        staleSharePct,
        latestRunStartedAt: row.latest_run_started_at,
        latestFetchedCount: row.latest_fetched_count,
        latestPublicCount: row.latest_public_count,
        previousFetchedCount: row.previous_fetched_count,
        previousPublicCount: row.previous_public_count,
        seenInLatestRun: row.seen_in_latest_run ?? 0,
        lastSeenMax: row.last_seen_max,
        newlyStaleCount: toNumber(row.newly_stale_count) ?? 0,
        reactivatedCount: toNumber(row.reactivated_count) ?? 0,
        latestQualityScore: toNumber(row.latest_quality_score),
        latestBaseQualityScore: toNumber(row.latest_base_quality_score),
        priceCompleteness: toNumber(row.price_completeness),
        locationCompleteness: toNumber(row.location_completeness),
        imageValidityRate: toNumber(row.image_validity_rate),
        duplicateRate: toNumber(row.duplicate_rate),
        canonicalizedDuplicates: row.canonicalized_duplicates ?? 0,
        canonicalCount: row.canonical_count ?? 0,
        latestNonPublicCount: row.latest_non_public_count ?? 0,
        dominantLatestReviewReason: row.dominant_latest_review_reason,
        dominantLatestReviewReasonCount: toNumber(row.dominant_latest_review_reason_count) ?? 0,
        staleNeverSeenAgain: row.stale_never_seen_again ?? 0,
        staleSeenBefore: row.stale_seen_before ?? 0,
        failureReason: classification.failureReason,
        operationalCategory: classification.operationalCategory,
        evidence: classification.evidence,
        recommendedAction: classification.recommendedAction,
        priority: classification.priority,
        impactRankScore: Math.round(staleListings * (1 + staleSharePct / 100) * 100) / 100,
      };
    });

    const topContributorsByImpact = [...leaderboard]
      .sort((a, b) => {
        if (b.staleListings !== a.staleListings) return b.staleListings - a.staleListings;
        if (b.staleSharePct !== a.staleSharePct) return b.staleSharePct - a.staleSharePct;
        return a.sourceId.localeCompare(b.sourceId);
      })
      .slice(0, 8);

    const causeMap = new Map<FailureReason, { sourceCount: number; staleListings: number }>();
    for (const row of leaderboard) {
      const current = causeMap.get(row.failureReason) ?? { sourceCount: 0, staleListings: 0 };
      current.sourceCount += 1;
      current.staleListings += row.staleListings;
      causeMap.set(row.failureReason, current);
    }

    const causeBuckets = Array.from(causeMap.entries())
      .map(([cause, stats]) => ({
        cause,
        sourceCount: stats.sourceCount,
        staleListings: stats.staleListings,
      }))
      .sort((a, b) => b.staleListings - a.staleListings);

    const recommendationActionOrder: Record<RecommendedAction, number> = {
      investigate_crawl: 0,
      investigate_parser: 1,
      investigate_dedup: 2,
      monitor_only: 3,
      retire_source: 4,
    };
    const sourceTierOrder: Record<SourceTier, number> = {
      monitor: 0,
      active: 1,
      deprecated: 2,
      unknown: 3,
    };
    const priorityOrder: Record<Priority, number> = {
      P1: 0,
      P2: 1,
      P3: 2,
      P4: 3,
    };

    const focusedSourceIds = new Set([
      "cv_oceanproperty24",
      "cv_cabohouseproperty",
      "cv_homescasaverde",
      "cv_terracaboverde",
    ]);

    const focusedDiagnostics = leaderboard
      .filter((row) => focusedSourceIds.has(row.sourceId))
      .sort((a, b) => {
        const p = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (p !== 0) return p;
        return b.staleSharePct - a.staleSharePct;
      });

    const recommendations = leaderboard
      .filter((row) => row.staleListings > 0 && !/^cv_source_[12]$/.test(row.sourceId))
      .sort((a, b) => {
        const priorityDelta = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
        const tierDelta = sourceTierOrder[a.sourceTier] - sourceTierOrder[b.sourceTier];
        if (tierDelta !== 0) return tierDelta;
        const actionDelta =
          recommendationActionOrder[a.recommendedAction] - recommendationActionOrder[b.recommendedAction];
        if (actionDelta !== 0) return actionDelta;
        if (b.staleListings !== a.staleListings) return b.staleListings - a.staleListings;
        if (b.staleSharePct !== a.staleSharePct) return b.staleSharePct - a.staleSharePct;
        return a.sourceId.localeCompare(b.sourceId);
      })
      .map((row, index) => ({
        priority: row.priority,
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        sourceTier: row.sourceTier,
        operationalCategory: row.operationalCategory,
        staleSharePct: row.staleSharePct,
        qualityScore: row.latestQualityScore,
        failureReason: row.failureReason,
        evidence: row.evidence,
        recommendedAction: row.recommendedAction,
      }));

    return {
      market: CV_MARKET,
      generatedAt,
      definition: {
        staleThresholdDays: STALE_DAYS,
        staleListingRule:
          "A listing is stale when is_stale=true, currently set by stale cleanup when last_seen_at/first_seen_at is older than 14 days.",
        sourceStaleShareFormula:
          "stale_share_pct = stale_listings / total_listings * 100 for each source_id.",
        impactRankingRule:
          "Rank sources primarily by stale_listings, with stale_share_pct as the tie-breaker.",
      },
      latestRunStartedAt: leaderboard[0]?.latestRunStartedAt ?? null,
      leaderboard,
      topContributorsByImpact,
      causeBuckets,
      focusedDiagnostics,
      recommendations,
      adminSurfaceAssessment: {
        warranted: false,
        rationale:
          "Current stale operations are already covered by SQL + RPC + artifact reporting. Another admin surface is not justified until this leaderboard proves the current workflow is insufficient.",
      },
    };
  });

  const lines: string[] = [
    "CV stale source report",
    "",
    "Definition",
    report.definition.staleListingRule,
    report.definition.sourceStaleShareFormula,
    report.definition.impactRankingRule,
    "",
    formatCountTable([
      { label: "Market", value: report.market },
      { label: "Latest run", value: report.latestRunStartedAt ?? "n/a" },
      { label: "Tracked sources", value: report.leaderboard.length },
    ]),
    "",
    "Top stale contributors by impact",
  ];

  for (const row of report.topContributorsByImpact) {
    lines.push(
      `- ${row.sourceName} (${row.sourceId}): tier=${row.sourceTier}, ${row.staleListings} stale / ${row.totalListings} total (${row.staleSharePct.toFixed(2)}%), failure_reason=${row.failureReason}, action=${row.recommendedAction}`
    );
  }

  lines.push("", "Cause buckets");
  for (const bucket of report.causeBuckets) {
    lines.push(`- ${bucket.cause}: ${bucket.staleListings} stale listings across ${bucket.sourceCount} sources`);
  }

  lines.push("", "Focused diagnostics");
  for (const row of report.focusedDiagnostics) {
    lines.push(
      `- ${row.priority} ${row.sourceName} (${row.sourceId}): sourceTier=${row.sourceTier}, stale_share_pct=${row.staleSharePct.toFixed(2)}, quality_score=${(row.latestQualityScore ?? 0).toFixed(2)}, failure_reason=${row.failureReason}, evidence=${row.evidence}, recommended_action=${row.recommendedAction}`
    );
  }

  lines.push("", "Recommendations");
  lines.push("- Active source problems are ranked ahead of legacy-only and DROP tails.");
  for (const item of report.recommendations) {
    lines.push(
      `- ${item.priority} ${item.sourceName} (${item.sourceId}): sourceTier=${item.sourceTier}, operational_category=${item.operationalCategory}, stale_share_pct=${item.staleSharePct.toFixed(2)}, quality_score=${(item.qualityScore ?? 0).toFixed(2)}, failure_reason=${item.failureReason}, evidence=${item.evidence}, recommended_action=${item.recommendedAction}`
    );
  }

  lines.push(
    "",
    `Admin surface warranted now: ${report.adminSurfaceAssessment.warranted ? "yes" : "no"}`,
    report.adminSurfaceAssessment.rationale
  );

  const text = lines.join("\n");
  const { jsonPath, textPath } = writeArtifactPair("cv_stale_source_report", report, text);

  console.log(text);
  console.log(`\nJSON: ${jsonPath}`);
  console.log(`Text: ${textPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
