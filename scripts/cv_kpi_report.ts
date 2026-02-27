/**
 * CV KPI Report – Nuläge mot "CV dominerad" (docs/kaza-verde-cv-dominated-kpi.md).
 * Usage: npx ts-node scripts/cv_kpi_report.ts
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or same as ingest) in env.
 */
import { getSupabaseClient } from "../core/supabaseClient";

const FRESHNESS_DAYS = 30;

// Core (IN lifecycle) sources — actively scraped and enrichable
const CORE_SOURCES = [
  "cv_terracaboverde",
  "cv_simplycapeverde",
  "cv_homescasaverde",
  "cv_capeverdeproperty24",
  "cv_cabohouseproperty",
  "cv_estatecv",
  "cv_oceanproperty24",
];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

interface Row {
  id: string;
  source_id: string;
  approved: boolean | null;
  price: number | null;
  island: string | null;
  city: string | null;
  image_urls: string[] | null;
  property_size_sqm: number | null;
  bedrooms: number | null;
  created_at: string | null;
  updated_at: string | null;
  canonical_id?: string | null;
  is_superseded?: boolean | null;
}

function computeKpis(rows: Row[], cutoff: string) {
  const totalVisible = rows.length;
  const withPrice = rows.filter((r) => r.price != null && r.price > 0);
  const withLocation = rows.filter(
    (r) => (r.island && r.island.trim() !== "") || (r.city && r.city.trim() !== "")
  );
  const withImages = rows.filter(
    (r) => Array.isArray(r.image_urls) && r.image_urls.length > 0
  );
  const withAreaOrBeds = rows.filter(
    (r) =>
      (r.property_size_sqm != null && r.property_size_sqm > 0) ||
      (r.bedrooms != null && r.bedrooms >= 0)
  );
  const updatedLast30 = rows.filter(
    (r) => r.updated_at && r.updated_at >= cutoff
  );

  const byCanonical = new Map<string, Row[]>();
  for (const r of rows) {
    const cid = r.canonical_id ?? r.id;
    if (!byCanonical.has(cid)) byCanonical.set(cid, []);
    byCanonical.get(cid)!.push(r);
  }
  const duplicateGroups = [...byCanonical.values()].filter((arr) => arr.length > 1);
  const duplicateCount = duplicateGroups.reduce((sum, arr) => sum + arr.length - 1, 0);

  const bySource = new Map<string, { total: number; recent: number }>();
  for (const r of rows) {
    const sid = r.source_id || "unknown";
    if (!bySource.has(sid)) bySource.set(sid, { total: 0, recent: 0 });
    bySource.get(sid)!.total++;
    if (r.updated_at && r.updated_at >= cutoff) bySource.get(sid)!.recent++;
  }
  const stableSources = [...bySource.entries()].filter(
    ([_, v]) => v.total >= 10 && v.recent >= 1
  ).length;

  return {
    totalVisible,
    withPrice: withPrice.length,
    withLocation: withLocation.length,
    withImages: withImages.length,
    withAreaOrBeds: withAreaOrBeds.length,
    duplicateCount,
    updatedLast30: updatedLast30.length,
    stableSources,
    bySource,
  };
}

function printKpiTable(kpis: ReturnType<typeof computeKpis>, label: string) {
  const { totalVisible, withPrice, withLocation, withImages, withAreaOrBeds, duplicateCount, updatedLast30, stableSources } = kpis;
  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0");
  const ok = (v: number, target: number) => (v >= target ? "✓" : "✗");
  const uniqueCount = totalVisible - duplicateCount;
  const dupPct = totalVisible ? (duplicateCount / totalVisible) * 100 : 0;

  console.log(`\n--- ${label} ---\n`);
  console.log("Unika CV-listings (visible)     ", totalVisible.toString().padStart(6), "  Mål ≥300    ", ok(totalVisible, 300));
  console.log("  (av dessa, unika canonical_id)", uniqueCount.toString().padStart(6));
  console.log("Med price > 0                   ", withPrice.toString().padStart(6), `  ${pct(withPrice, totalVisible)}%`, "  Mål ≥95%   ", ok(withPrice, totalVisible * 0.95));
  console.log("Med location (island/city)      ", withLocation.toString().padStart(6), `  ${pct(withLocation, totalVisible)}%`, "  Mål ≥90%   ", ok(withLocation, totalVisible * 0.9));
  console.log("Med ≥1 bild                     ", withImages.toString().padStart(6), `  ${pct(withImages, totalVisible)}%`, "  Mål ≥90%   ", ok(withImages, totalVisible * 0.9));
  console.log("Med area eller bedrooms         ", withAreaOrBeds.toString().padStart(6), `  ${pct(withAreaOrBeds, totalVisible)}%`, "  Mål ≥85%   ", ok(withAreaOrBeds, totalVisible * 0.85));
  console.log("Dubletter (canonical_id > 1)    ", duplicateCount.toString().padStart(6), `  ${dupPct.toFixed(1)}%`, "  Mål ≤5%    ", dupPct <= 5 ? "✓" : "✗");
  console.log("Uppdaterade senaste 30 d        ", updatedLast30.toString().padStart(6), `  ${pct(updatedLast30, totalVisible)}%`, "  Mål ≥80%   ", ok(updatedLast30, totalVisible * 0.8));
  console.log("Stabila källor (≥10 list, 30d) ", stableSources.toString().padStart(6), "  Mål ≥5     ", ok(stableSources, 5));
}

function printPerSourceKpis(visible: Row[]) {
  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "---");

  // Group by source
  const sources = new Map<string, Row[]>();
  for (const r of visible) {
    const sid = r.source_id || "unknown";
    if (!sources.has(sid)) sources.set(sid, []);
    sources.get(sid)!.push(r);
  }

  const sorted = [...sources.entries()].sort((a, b) => b[1].length - a[1].length);

  console.log("\n--- Per källa KPI ---\n");
  console.log(
    "  " +
    "Källa".padEnd(28) +
    "List".padStart(5) +
    "  Price%".padStart(8) +
    "  Imgs%".padStart(8) +
    "  Specs%".padStart(8) +
    "  Loc%".padStart(8) +
    "  Type"
  );
  console.log("  " + "-".repeat(73));

  for (const [sid, rows] of sorted) {
    const total = rows.length;
    const price = rows.filter((r) => r.price != null && r.price > 0).length;
    const imgs = rows.filter((r) => Array.isArray(r.image_urls) && r.image_urls.length > 0).length;
    const specs = rows.filter(
      (r) =>
        (r.property_size_sqm != null && r.property_size_sqm > 0) ||
        (r.bedrooms != null && r.bedrooms >= 0)
    ).length;
    const loc = rows.filter(
      (r) => (r.island && r.island.trim() !== "") || (r.city && r.city.trim() !== "")
    ).length;
    const isCore = CORE_SOURCES.includes(sid);

    console.log(
      "  " +
      sid.padEnd(28) +
      total.toString().padStart(5) +
      `${pct(price, total)}%`.padStart(8) +
      `${pct(imgs, total)}%`.padStart(8) +
      `${pct(specs, total)}%`.padStart(8) +
      `${pct(loc, total)}%`.padStart(8) +
      (isCore ? "  CORE" : "  DROP")
    );
  }
}

async function main() {
  const sb = getSupabaseClient();
  const cutoff = daysAgo(FRESHNESS_DAYS);

  const { data: rows, error } = await sb
    .from("listings")
    .select(
      "id, source_id, approved, price, island, city, image_urls, property_size_sqm, bedrooms, created_at, updated_at, canonical_id, is_superseded"
    )
    .ilike("source_id", "cv_%");

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  const all = (rows ?? []) as Row[];
  const approved = all.filter((r) => r.approved === true);
  const visible = approved.filter((r) => r.is_superseded !== true);

  const coreVisible = visible.filter((r) => CORE_SOURCES.includes(r.source_id));

  console.log("\n=== KAZA VERDE – CV KPI REPORT (nuläge) ===\n");
  console.log("Källa: listings WHERE source_id LIKE 'cv_%' AND approved = true");
  console.log("(is_superseded = true exkluderad från visible.)");

  // All sources KPI
  const allKpis = computeKpis(visible, cutoff);
  printKpiTable(allKpis, "1️⃣  ALL SOURCES (produkt-vy)");

  // Core sources KPI
  const coreKpis = computeKpis(coreVisible, cutoff);
  printKpiTable(coreKpis, "1️⃣  CORE SOURCES (index-kvalitet, enrichable)");

  // Per-source breakdown
  printPerSourceKpis(visible);

  console.log("\n--- 2️⃣ PRODUKT / 3–5 (manuell bedömning) ---");
  console.log("Se docs/kaza-verde-cv-dominated-kpi.md för produkt-, distribution-, positionerings- och monetiserings-KPIs.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
