import * as fs from "fs";
import * as path from "path";
import { PreflightReport, LifecycleState } from "./preflightTypes";

interface SourceReport {
  id: string;
  name: string;
  status: string;
  lastError?: string;
  debugErrors?: string[];
  consecutiveFailureCount?: number;
  lastErrorClass?: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt?: string;
}

interface ListingReport {
  id: string;
  sourceId: string;
  sourceName: string;
}

interface HiddenListingReport extends ListingReport {
  violations: string[];
}

interface IngestReport {
  marketId: string;
  marketName: string;
  generatedAt: string;
  summary: {
    totalListings: number;
    visibleCount: number;
    hiddenCount: number;
    duplicatesRemoved: number;
    sourceCount: number;
  };
  sources: SourceReport[];
  visibleListings: ListingReport[];
  hiddenListings: HiddenListingReport[];
}

function runReport(): void {
  const reportPath = path.resolve(__dirname, "../artifacts/cv_ingest_report.json");

  if (!fs.existsSync(reportPath)) {
    console.error("Report not found:", reportPath);
    console.error("Run 'npm run ingest:cv' first.");
    process.exit(1);
  }

  const report: IngestReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  // Summary
  console.log("\n=== Cape Verde Market Report ===\n");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Total Listings: ${report.summary.totalListings}`);
  console.log(`Visible: ${report.summary.visibleCount}`);
  console.log(`Hidden: ${report.summary.hiddenCount}`);
  console.log(`Duplicates Removed: ${report.summary.duplicatesRemoved}`);
  console.log(`Sources: ${report.summary.sourceCount}`);

  // Visible per source
  console.log("\n--- Visible per Source ---");
  const visibleBySource: Record<string, number> = {};
  for (const listing of report.visibleListings) {
    visibleBySource[listing.sourceName] = (visibleBySource[listing.sourceName] || 0) + 1;
  }
  for (const [source, count] of Object.entries(visibleBySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source}: ${count}`);
  }
  if (Object.keys(visibleBySource).length === 0) {
    console.log("  (none)");
  }

  // Hidden per source with top 3 reasons
  console.log("\n--- Hidden per Source (Top 3 Reasons) ---");
  const hiddenBySource: Record<string, { count: number; reasons: Record<string, number> }> = {};
  for (const listing of report.hiddenListings) {
    if (!hiddenBySource[listing.sourceName]) {
      hiddenBySource[listing.sourceName] = { count: 0, reasons: {} };
    }
    hiddenBySource[listing.sourceName].count++;
    for (const violation of listing.violations) {
      hiddenBySource[listing.sourceName].reasons[violation] =
        (hiddenBySource[listing.sourceName].reasons[violation] || 0) + 1;
    }
  }
  for (const [source, data] of Object.entries(hiddenBySource).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${source}: ${data.count} hidden`);
    const topReasons = Object.entries(data.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [reason, count] of topReasons) {
      console.log(`    - ${reason}: ${count}`);
    }
  }
  if (Object.keys(hiddenBySource).length === 0) {
    console.log("  (none)");
  }

  // Paused or broken sources
  console.log("\n--- Problem Sources ---");
  const problemSources = report.sources.filter(
    (s) => s.status === "PAUSED_BY_SYSTEM" || s.status === "BROKEN_SOURCE"
  );
  if (problemSources.length === 0) {
    console.log("  All sources OK");
  } else {
    for (const source of problemSources) {
      console.log(`  ${source.name} [${source.status}]`);
      if (source.lastError) {
        console.log(`    Error: ${source.lastError}`);
      }
      if (source.pauseReason) {
        console.log(`    Pause reason: ${source.pauseReason}`);
      }
      if (source.pauseDetail) {
        console.log(`    Pause detail: ${source.pauseDetail}`);
      }
      if (source.consecutiveFailureCount && source.consecutiveFailureCount > 0) {
        console.log(`    Consecutive parser failures: ${source.consecutiveFailureCount}`);
      }
      if (source.lastErrorClass) {
        console.log(`    Error class: ${source.lastErrorClass}`);
      }
      if (source.lastSeenAt) {
        console.log(`    Last seen: ${source.lastSeenAt}`);
      }
      if (source.debugErrors && source.debugErrors.length > 0) {
        console.log(`    Debug errors: ${source.debugErrors.length}`);
        for (const err of source.debugErrors.slice(0, 3)) {
          console.log(`      - ${err}`);
        }
      }
    }
  }

  console.log("");

  // Preflight Lifecycle Report
  displayPreflightReport();
}

function findLatestPreflightReport(): string | null {
  const reportsDir = path.resolve(__dirname, "../reports");

  if (!fs.existsSync(reportsDir)) {
    return null;
  }

  const pattern = /^cv_preflight_(\d{8})_(\d{6})(?:_\d{2})?\.json$/;
  const files = fs.readdirSync(reportsDir);

  const matches: { filename: string; timestamp: string }[] = [];

  for (const file of files) {
    const match = file.match(pattern);
    if (match) {
      const timestamp = match[1] + match[2];
      matches.push({ filename: file, timestamp });
    }
  }

  if (matches.length === 0) {
    return null;
  }

  matches.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return path.join(reportsDir, matches[0].filename);
}

function displayPreflightReport(): void {
  console.log("\n=== Preflight Lifecycle Report ===\n");

  const reportPath = findLatestPreflightReport();

  if (!reportPath) {
    console.log("No preflight report found in reports/ directory.");
    console.log("Run 'npm run preflight:cv' to generate one.");
    return;
  }

  const report: PreflightReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  console.log(`Report: ${path.basename(reportPath)}`);
  console.log(`Generated: ${report.generatedAt}`);

  // Counts per lifecycle state
  console.log("\n--- Lifecycle State Summary ---");
  console.log(`  IN:      ${report.summary.inCount}`);
  console.log(`  OBSERVE: ${report.summary.observeCount}`);
  console.log(`  DROP:    ${report.summary.dropCount}`);
  console.log(`  Total:   ${report.summary.total}`);

  // Per-source lifecycle state
  console.log("\n--- Per-Source Lifecycle ---");
  for (const result of report.results) {
    const reasonStr = result.reasons.length > 0 ? ` (${result.reasons.join(", ")})` : "";
    console.log(`  ${result.sourceName}: ${result.lifecycleState}${reasonStr}`);
  }

  // OBSERVE → IN promotions
  const promotions = report.results.filter((r) => r.promotedToIn === true);
  console.log("\n--- OBSERVE → IN Promotions ---");
  if (promotions.length === 0) {
    console.log("  (none)");
  } else {
    for (const p of promotions) {
      console.log(`  ${p.sourceName}: promoted after trial enrichment`);
    }
  }

  // Global Image Quality
  if (report.globalImageQuality) {
    const giq = report.globalImageQuality;
    console.log("\n--- Global Image Quality (IQS v1) ---");
    console.log(`  Average Score: ${giq.avgScore}/100`);
    console.log(`  Tier Distribution:`);
    console.log(`    A: ${giq.tierDistribution.A} listings`);
    console.log(`    B: ${giq.tierDistribution.B} listings`);
    console.log(`    C: ${giq.tierDistribution.C} listings`);
    console.log(`    D: ${giq.tierDistribution.D} listings`);
    console.log(`  A/B Tier: ${giq.percentAB}%`);
    if (giq.topReasons.length > 0) {
      console.log(`  Top Quality Issues:`);
      for (const { reason, count } of giq.topReasons) {
        console.log(`    - ${reason}: ${count} listings`);
      }
    }
  }

  // Per-Source Image Quality
  const sourcesWithIQ = report.results.filter((r) => r.metrics.imageQuality !== undefined);
  if (sourcesWithIQ.length > 0) {
    console.log("\n--- Per-Source Image Quality ---");
    for (const result of sourcesWithIQ) {
      const iq = result.metrics.imageQuality!;
      console.log(`  ${result.sourceName}:`);
      console.log(`    Avg Score: ${iq.avgScore}/100`);
      console.log(`    Tier: A=${iq.tierDistribution.A}, B=${iq.tierDistribution.B}, C=${iq.tierDistribution.C}, D=${iq.tierDistribution.D}`);
      console.log(`    A/B: ${iq.percentAB}%`);
      if (iq.topReasons.length > 0) {
        const reasonsStr = iq.topReasons.map((r) => `${r.reason}(${r.count})`).join(", ");
        console.log(`    Issues: ${reasonsStr}`);
      }
    }
  }

  // Source-Level IQS Breakdown (Ranked)
  if (report.sourceImageQualityBreakdown && report.sourceImageQualityBreakdown.length > 0) {
    const breakdown = report.sourceImageQualityBreakdown;
    
    console.log("\n=== Source-Level Image Quality Breakdown ===\n");
    
    // Top 3 worst sources (lowest avg IQS)
    console.log("--- Top 3 Worst Sources (by avg IQS) ---");
    const worst = breakdown.slice(0, 3);
    for (const source of worst) {
      console.log(`  ${source.sourceName}:`);
      console.log(`    Listings: ${source.listingCount}`);
      console.log(`    Avg IQS: ${source.avgScore}/100`);
      console.log(`    Tier D: ${source.percentD}% (${source.tierDistribution.D}/${source.listingCount})`);
      if (source.topReasons.length > 0) {
        const reasonsStr = source.topReasons.map((r) => `${r.reason}(${r.count})`).join(", ");
        console.log(`    Top Issues: ${reasonsStr}`);
      }
    }
    
    // Top 3 best sources (highest avg IQS)
    console.log("\n--- Top 3 Best Sources (by avg IQS) ---");
    const best = breakdown.slice(-3).reverse();
    for (const source of best) {
      console.log(`  ${source.sourceName}:`);
      console.log(`    Listings: ${source.listingCount}`);
      console.log(`    Avg IQS: ${source.avgScore}/100`);
      console.log(`    Tier D: ${source.percentD}% (${source.tierDistribution.D}/${source.listingCount})`);
      if (source.topReasons.length > 0) {
        const reasonsStr = source.topReasons.map((r) => `${r.reason}(${r.count})`).join(", ");
        console.log(`    Top Issues: ${reasonsStr}`);
      }
    }
    
    // Full ranked list
    console.log("\n--- All Sources (Ranked by IQS) ---");
    for (let i = 0; i < breakdown.length; i++) {
      const source = breakdown[i];
      console.log(`  ${i + 1}. ${source.sourceName}: ${source.avgScore}/100 (${source.listingCount} listings, ${source.percentD}% Tier D)`);
    }
  }

  console.log("");
}

runReport();
