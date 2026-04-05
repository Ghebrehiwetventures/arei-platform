import fs from "fs/promises";
import path from "path";
import { selectListingsForAttention } from "../arei-admin/listingSelector.ts";
import type { Listing, ListingSelection, ListingSelectionTheme } from "../arei-admin/types.ts";

type EvalLabel = "strong_candidate" | "maybe" | "weak" | "reject";
type AngleFamily = "lifestyle" | "trust" | "opportunity" | "value";

interface EvalRow {
  listing_id: string;
  source_url: string;
  title_snapshot: string;
  location_snapshot: string;
  price_snapshot: string;
  label: EvalLabel;
  preferred_theme?: ListingSelectionTheme;
  acceptable_angles?: AngleFamily[];
  red_flags?: string[];
  notes?: string;
}

interface EvalSet {
  version: number;
  market: string;
  top_k: number;
  listings: EvalRow[];
}

type SourceQualitySignal = {
  score: number;
  approvedPct: number;
  imagePct: number;
  pricePct: number;
};

const DEFAULT_EVAL_PATH = path.resolve(process.cwd(), "arei-admin/evals/agent_v1_eval_set.cv.json");
const PUBLIC_SUPABASE_URL = "https://bhqjdzjtiwckfuteycfl.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_fFm5NsC3cWLYr_Wnx9OLWQ_Ytmnn-Wd";

function sourceIdToName(sourceId: string): string {
  return sourceId
    .replace(/^[a-z]{2}_/, "")
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildFamilyKey(selection: ListingSelection): string {
  return normalizeText(`${selection.title} ${selection.locationLabel}`)
    .replace(/\b\d+\s*(bed|bedroom|sqm|m2)\b/g, " ")
    .replace(/\b(studio|apartment|villa|property|sale|for|private|views|view|pool|garden|use|with|and|resort|island|cape|verde|house|diaspora)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}

function parseAngleFamily(contentAngle: string): AngleFamily | null {
  const lower = contentAngle.toLowerCase();
  if (lower.startsWith("lifestyle angle")) return "lifestyle";
  if (lower.startsWith("trust angle")) return "trust";
  if (lower.startsWith("opportunity angle")) return "opportunity";
  if (lower.startsWith("value angle")) return "value";
  return null;
}

function formatPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function computeSourceQualitySignals(listings: Listing[]): Map<string, SourceQualitySignal> {
  const buckets = new Map<string, { total: number; approved: number; withImages: number; withPrice: number }>();

  for (const listing of listings) {
    const current = buckets.get(listing.sourceId) || { total: 0, approved: 0, withImages: 0, withPrice: 0 };
    current.total += 1;
    if (listing.approved) current.approved += 1;
    if (listing.images.length > 0) current.withImages += 1;
    if (listing.price != null || listing.project_start_price != null) current.withPrice += 1;
    buckets.set(listing.sourceId, current);
  }

  const quality = new Map<string, SourceQualitySignal>();
  for (const [sourceId, bucket] of buckets.entries()) {
    const approvedPct = Math.round((bucket.approved / bucket.total) * 100);
    const imagePct = Math.round((bucket.withImages / bucket.total) * 100);
    const pricePct = Math.round((bucket.withPrice / bucket.total) * 100);
    quality.set(sourceId, {
      score: (approvedPct * 0.5 + imagePct * 0.3 + pricePct * 0.2) / 100,
      approvedPct,
      imagePct,
      pricePct,
    });
  }

  return quality;
}

function mapRow(row: Record<string, unknown>): Listing {
  return {
    id: String(row.id),
    title: (row.title as string | null) || undefined,
    price: (row.price as number | null) ?? undefined,
    currency: row.currency as string | undefined,
    images: ((row.image_urls as string[] | null) || []).filter(Boolean),
    description: (row.description as string | null) || undefined,
    sourceId: String(row.source_id),
    sourceName: sourceIdToName(String(row.source_id)),
    sourceUrl: (row.source_url as string | null) || undefined,
    source_ref: (row.source_ref as string | null) || null,
    location: [row.city, row.island].filter(Boolean).join(", ") || undefined,
    island: (row.island as string | null) || null,
    city: (row.city as string | null) || null,
    bedrooms: (row.bedrooms as number | null) ?? null,
    bathrooms: (row.bathrooms as number | null) ?? null,
    area_sqm: (row.property_size_sqm as number | null) ?? null,
    land_area_sqm: (row.land_area_sqm as number | null) ?? null,
    approved: Boolean(row.approved),
    project_flag: (row.project_flag as boolean | null) ?? null,
    project_start_price: (row.project_start_price as number | null) ?? null,
    property_type: (row.property_type as string | null) || undefined,
    status: (row.status as string | null) || undefined,
    violations: (row.violations as string[] | null) || undefined,
    amenities: (row.amenities as string[] | null) || undefined,
    price_period: (row.price_period as string | null) || undefined,
    createdAt: (row.created_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

async function loadEvalSet(filePath: string): Promise<EvalSet> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as EvalSet;
}

async function fetchRestRows(baseUrl: string, anonKey: string, tableOrView: string, select: string, filters: string[]): Promise<Record<string, unknown>[]> {
  const url = new URL(`${baseUrl}/rest/v1/${tableOrView}`);
  url.searchParams.set("select", select);
  for (const filter of filters) {
    const [key, value] = filter.split("=", 2);
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase REST request failed (${response.status}) for ${tableOrView}`);
  }

  return (await response.json()) as Record<string, unknown>[];
}

async function main() {
  const evalPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : DEFAULT_EVAL_PATH;
  const evalSet = await loadEvalSet(evalPath);
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;

  const evalIds = evalSet.listings.map((row) => row.listing_id);
  const rowById = new Map(evalSet.listings.map((row) => [row.listing_id, row]));

  const selectColumns =
    "id,title,description,price,project_start_price,currency,source_id,source_url,source_ref,project_flag,island,city,bedrooms,bathrooms,property_size_sqm,land_area_sqm,image_urls,approved,violations,property_type,status,amenities,price_period,created_at,updated_at";

  const evalRows = await fetchRestRows(
    supabaseUrl,
    supabaseAnonKey,
    "listings",
    selectColumns,
    [`id=in.(${evalIds.join(",")})`]
  );

  const universeRows = await fetchRestRows(
    supabaseUrl,
    supabaseAnonKey,
    "listings",
    selectColumns,
    ["source_id=ilike.cv_%", "limit=5000"]
  );

  const liveEvalListings = ((evalRows || []) as Record<string, unknown>[]).map(mapRow);
  const universeListings = ((universeRows || []) as Record<string, unknown>[]).map(mapRow);
  const missingIds = evalIds.filter((id) => !liveEvalListings.some((listing) => listing.id === id));

  const ranked = selectListingsForAttention(liveEvalListings, {
    limit: liveEvalListings.length,
    sourceQualityBySourceId: computeSourceQualitySignals(universeListings),
  });

  const topK = ranked.slice(0, evalSet.top_k);
  const topKRows = topK.map((selection) => ({
    selection,
    evalRow: rowById.get(selection.listingId),
  }));
  const denominator = Math.max(topKRows.length, 1);

  const strongCount = topKRows.filter((row) => row.evalRow?.label === "strong_candidate").length;
  const acceptCount = topKRows.filter((row) => row.evalRow && (row.evalRow.label === "strong_candidate" || row.evalRow.label === "maybe")).length;
  const rejectLeakage = topKRows.filter((row) => row.evalRow?.label === "reject");
  const weakLeakage = topKRows.filter((row) => row.evalRow && (row.evalRow.label === "weak" || row.evalRow.label === "reject"));

  const themeEligible = topKRows.filter((row) => row.evalRow?.preferred_theme);
  const themeMatches = themeEligible.filter((row) => row.evalRow?.preferred_theme === row.selection.selectionTheme);

  const angleEligible = topKRows.filter((row) => row.evalRow?.acceptable_angles?.length);
  const angleMatches = angleEligible.filter((row) => {
    const parsed = parseAngleFamily(row.selection.contentAngle);
    return parsed && row.evalRow?.acceptable_angles?.includes(parsed);
  });

  const severeFactConflicts = topKRows.filter((row) => {
    const redFlags = row.evalRow?.red_flags || [];
    const warnings = row.selection.warnings.join(" ").toLowerCase();
    return redFlags.includes("severe_fact_conflict") || warnings.includes("conflict") || warnings.includes("outlier");
  });

  const sourceCounts = new Map<string, number>();
  const islandCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  for (const { selection } of topKRows) {
    sourceCounts.set(selection.sourceName, (sourceCounts.get(selection.sourceName) || 0) + 1);
    islandCounts.set(selection.locationLabel.split(", ").slice(-1)[0], (islandCounts.get(selection.locationLabel.split(", ").slice(-1)[0]) || 0) + 1);
    const family = buildFamilyKey(selection);
    if (family) familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
  }

  const metrics = {
    top_k_precision: strongCount / denominator,
    top_k_accept_rate: acceptCount / denominator,
    reject_leakage: rejectLeakage.length,
    weak_leakage: weakLeakage.length,
    theme_agreement: themeEligible.length ? themeMatches.length / themeEligible.length : null,
    angle_usefulness: angleEligible.length ? angleMatches.length / angleEligible.length : null,
    diversity_sanity: {
      unique_sources: sourceCounts.size,
      unique_islands: islandCounts.size,
      unique_families: familyCounts.size,
      max_per_source: Math.max(...sourceCounts.values(), 0),
      max_per_island: Math.max(...islandCounts.values(), 0),
      max_per_family: Math.max(...familyCounts.values(), 0),
      source_counts: Object.fromEntries(sourceCounts.entries()),
      island_counts: Object.fromEntries(islandCounts.entries()),
    },
  };

  console.log(`Agent V1 eval set: ${evalPath}`);
  console.log(`Eval rows: ${evalSet.listings.length} | Live rows found: ${liveEvalListings.length} | Top-k: ${evalSet.top_k}`);
  if (missingIds.length) {
    console.log(`Missing live rows (${missingIds.length}): ${missingIds.join(", ")}`);
  }

  console.log("\nMetrics");
  console.log(`- top_k_precision: ${formatPct(metrics.top_k_precision)}`);
  console.log(`- top_k_accept_rate: ${formatPct(metrics.top_k_accept_rate)}`);
  console.log(`- reject_leakage: ${metrics.reject_leakage}`);
  console.log(`- weak_leakage: ${metrics.weak_leakage}`);
  console.log(`- theme_agreement: ${formatPct(metrics.theme_agreement)}`);
  console.log(`- angle_usefulness: ${formatPct(metrics.angle_usefulness)}`);
  console.log(`- diversity_sanity: unique_sources=${metrics.diversity_sanity.unique_sources}, unique_islands=${metrics.diversity_sanity.unique_islands}, unique_families=${metrics.diversity_sanity.unique_families}, max_per_source=${metrics.diversity_sanity.max_per_source}, max_per_island=${metrics.diversity_sanity.max_per_island}, max_per_family=${metrics.diversity_sanity.max_per_family}`);

  console.log("\nTop 10");
  for (const { selection, evalRow } of topKRows) {
    console.log(
      `- #${selection.rank} [${selection.totalScore}] ${selection.title} | label=${evalRow?.label || "unlabeled"} | theme=${selection.selectionTheme} | angle=${parseAngleFamily(selection.contentAngle) || "unknown"}`
    );
  }

  const printMismatchGroup = (title: string, rows: Array<{ selection: ListingSelection; evalRow?: EvalRow }>, detail: (row: { selection: ListingSelection; evalRow?: EvalRow }) => string) => {
    console.log(`\n${title}`);
    if (rows.length === 0) {
      console.log("- none");
      return;
    }
    for (const row of rows) {
      console.log(`- ${detail(row)}`);
    }
  };

  printMismatchGroup("Rejects in top 10", rejectLeakage, ({ selection, evalRow }) => `${selection.listingId} | ${selection.title} | ${evalRow?.notes || "no note"}`);
  printMismatchGroup("Weak listings in top 10", weakLeakage, ({ selection, evalRow }) => `${selection.listingId} | ${selection.title} | label=${evalRow?.label}`);
  printMismatchGroup(
    "Theme mismatches",
    topKRows.filter((row) => row.evalRow?.preferred_theme && row.evalRow.preferred_theme !== row.selection.selectionTheme),
    ({ selection, evalRow }) => `${selection.listingId} | expected=${evalRow?.preferred_theme} | got=${selection.selectionTheme} | ${selection.title}`
  );
  printMismatchGroup(
    "Angle mismatches",
    topKRows.filter((row) => row.evalRow?.acceptable_angles?.length && !row.evalRow.acceptable_angles.includes(parseAngleFamily(row.selection.contentAngle) || "value")),
    ({ selection, evalRow }) => `${selection.listingId} | expected=${(evalRow?.acceptable_angles || []).join("/")} | got=${parseAngleFamily(selection.contentAngle) || "unknown"} | ${selection.title}`
  );
  printMismatchGroup(
    "Severe fact conflicts still passing",
    severeFactConflicts,
    ({ selection, evalRow }) => `${selection.listingId} | ${selection.title} | warnings=${selection.warnings.join(" | ")} | red_flags=${(evalRow?.red_flags || []).join(",")}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
