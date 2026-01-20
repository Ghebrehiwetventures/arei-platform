import * as fs from "fs";
import * as path from "path";

interface SourceReport {
  id: string;
  name: string;
  status: string;
  lastError?: string;
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
    }
  }

  console.log("");
}

runReport();
