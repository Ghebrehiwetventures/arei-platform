#!/usr/bin/env ts-node
/**
 * CV Ingest Preflight Script
 * Reads artifacts/cv_ingest_report.json and outputs KPI metrics, top violations,
 * and writes a timestamped JSON report to artifacts/
 *
 * Run with: npx ts-node --transpile-only core/preflightCvIngest.ts
 */

import * as fs from "fs";
import * as path from "path";

// All fields optional to handle varying report shapes
interface Listing {
  id?: string;
  sourceId?: string;
  sourceName?: string;
  sourceUrl?: string;
  title?: string;
  description?: string;
  price?: number;
  priceText?: string;
  location?: string;
  imageCount?: number;
  images?: string[];
  violations?: string[];
}

interface IngestReport {
  marketId?: string;
  marketName?: string;
  generatedAt?: string;
  summary?: {
    totalListings?: number;
    visibleCount?: number;
    hiddenCount?: number;
    duplicatesRemoved?: number;
    sourceCount?: number;
  };
  sources?: Array<{
    id?: string;
    name?: string;
    status?: string;
  }>;
  // Support both naming conventions
  visibleListings?: Listing[];
  visible?: Listing[];
  hiddenListings?: Listing[];
  hidden?: Listing[];
}

interface KPIs {
  totalListings: number;
  percentWithPrice: number;
  percentWith3PlusImages: number;
  percentWithDescription50Plus: number;
  percentWithGenericTitle: number;
}

interface SourceBreakdown {
  sourceId: string;
  sourceName: string;
  kpis: KPIs;
  listingCount: number;
}

interface ViolationCount {
  violation: string;
  count: number;
}

interface PreflightIngestReport {
  generatedAt: string;
  inputFile: string;
  globalKpis: KPIs;
  topViolations: ViolationCount[];
  sourceBreakdown: SourceBreakdown[];
}

// Generic title patterns - broad matching
const GENERIC_TITLE_PATTERNS = [
  /^property$/i,
  /^house$/i,
  /^apartment$/i,
  /^villa$/i,
  /^flat$/i,
  /^home$/i,
  /^listing$/i,
  /^for sale$/i,
  /^for rent$/i,
  /^real estate$/i,
  /^untitled$/i,
  /^property for sale$/i,
  /^property for rent$/i,
  /^house for sale$/i,
  /^house for rent$/i,
  /^apartment for sale$/i,
  /^apartment for rent$/i,
];

function isGenericTitle(title: string | undefined): boolean {
  if (!title) return true; // Missing title counts as generic
  const trimmed = title.trim().toLowerCase();
  if (trimmed === "") return true;
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function hasPrice(listing: Listing): boolean {
  // Check numeric price first
  if (listing.price !== undefined && listing.price !== null && listing.price > 0) {
    return true;
  }
  // Also check priceText
  if (listing.priceText && listing.priceText.trim().length > 0) {
    return true;
  }
  return false;
}

function getImageCount(listing: Listing): number {
  // Prefer images array length, fallback to imageCount
  if (listing.images && Array.isArray(listing.images)) {
    return listing.images.length;
  }
  return listing.imageCount ?? 0;
}

function getDescriptionLength(listing: Listing): number {
  return (listing.description?.trim().length) ?? 0;
}

function calculateKpis(listings: Listing[]): KPIs {
  const total = listings.length;
  if (total === 0) {
    return {
      totalListings: 0,
      percentWithPrice: 0,
      percentWith3PlusImages: 0,
      percentWithDescription50Plus: 0,
      percentWithGenericTitle: 0,
    };
  }

  const withPrice = listings.filter(hasPrice).length;
  const with3PlusImages = listings.filter((l) => getImageCount(l) >= 3).length;
  const withDescription50Plus = listings.filter(
    (l) => getDescriptionLength(l) >= 50
  ).length;
  const withGenericTitle = listings.filter((l) =>
    isGenericTitle(l.title)
  ).length;

  return {
    totalListings: total,
    percentWithPrice: round((withPrice / total) * 100),
    percentWith3PlusImages: round((with3PlusImages / total) * 100),
    percentWithDescription50Plus: round((withDescription50Plus / total) * 100),
    percentWithGenericTitle: round((withGenericTitle / total) * 100),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function countViolations(listings: Listing[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    for (const violation of listing.violations ?? []) {
      counts.set(violation, (counts.get(violation) ?? 0) + 1);
    }
  }
  return counts;
}

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function main(): void {
  const artifactsDir = path.resolve(__dirname, "..", "artifacts");
  const inputPath = path.join(artifactsDir, "cv_ingest_report.json");

  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, "utf-8");
  const report: IngestReport = JSON.parse(rawData);

  // Support both naming conventions
  const visibleListings = report.visibleListings ?? report.visible ?? [];
  const hiddenListings = report.hiddenListings ?? report.hidden ?? [];
  const allListings = [...visibleListings, ...hiddenListings];

  // Global KPIs
  const globalKpis = calculateKpis(allListings);

  // Violation counts
  const violationCounts = countViolations(allListings);
  const sortedViolations: ViolationCount[] = Array.from(violationCounts.entries())
    .map(([violation, count]) => ({ violation, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Per-source breakdown
  const sourceMap = new Map<string, Listing[]>();
  for (const listing of allListings) {
    const key = listing.sourceId ?? "unknown";
    if (!sourceMap.has(key)) {
      sourceMap.set(key, []);
    }
    sourceMap.get(key)!.push(listing);
  }

  const sourceBreakdown: SourceBreakdown[] = Array.from(sourceMap.entries())
    .map(([sourceId, listings]) => ({
      sourceId,
      sourceName: listings[0]?.sourceName ?? sourceId,
      listingCount: listings.length,
      kpis: calculateKpis(listings),
    }))
    .sort((a, b) => b.listingCount - a.listingCount); // Sort by listing count descending

  // Build report
  const preflightReport: PreflightIngestReport = {
    generatedAt: new Date().toISOString(),
    inputFile: inputPath,
    globalKpis,
    topViolations: sortedViolations,
    sourceBreakdown,
  };

  // Output to console
  console.log("\n=== CV INGEST PREFLIGHT REPORT ===\n");
  console.log("GLOBAL KPIs:");
  console.log(`  Total Listings:              ${globalKpis.totalListings}`);
  console.log(`  % With Price:                ${globalKpis.percentWithPrice}%`);
  console.log(`  % With 3+ Images:            ${globalKpis.percentWith3PlusImages}%`);
  console.log(`  % With Description (50+):    ${globalKpis.percentWithDescription50Plus}%`);
  console.log(`  % With Generic Title:        ${globalKpis.percentWithGenericTitle}%`);

  console.log("\nTOP 15 VIOLATIONS:");
  if (sortedViolations.length === 0) {
    console.log("  (none)");
  } else {
    for (const v of sortedViolations) {
      console.log(`  ${v.violation.padEnd(30)} ${v.count}`);
    }
  }

  console.log("\nPER-SOURCE BREAKDOWN:");
  for (const src of sourceBreakdown) {
    console.log(`\n  [${src.sourceName}] (${src.listingCount} listings)`);
    console.log(`    % With Price:             ${src.kpis.percentWithPrice}%`);
    console.log(`    % With 3+ Images:         ${src.kpis.percentWith3PlusImages}%`);
    console.log(`    % With Description (50+): ${src.kpis.percentWithDescription50Plus}%`);
    console.log(`    % With Generic Title:     ${src.kpis.percentWithGenericTitle}%`);
  }

  // Write timestamped output file (seconds in timestamp avoids overwrites)
  const timestamp = getTimestamp();
  const outputFilename = `cv_ingest_preflight_${timestamp}.json`;
  const outputPath = path.join(artifactsDir, outputFilename);

  fs.writeFileSync(outputPath, JSON.stringify(preflightReport, null, 2), "utf-8");
  console.log(`\nReport written to: ${outputPath}\n`);
}

main();
