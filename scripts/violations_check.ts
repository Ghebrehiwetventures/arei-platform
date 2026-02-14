import { getSupabaseClient } from "../core/supabaseClient";

async function main() {
  const sb = getSupabaseClient();
  const marketFilter = process.argv[2] || "ke";
  const { data } = await sb.from("listings").select("violations, source_id, image_urls, description, price").like("source_id", marketFilter + "_%");

  if (!data) { console.log("No data"); return; }

  const total = data.length;
  console.log("=== " + marketFilter.toUpperCase() + " VIOLATIONS (" + total + " listings) ===\n");

  const vCounts: Record<string, number> = {};
  let noViolations = 0;
  for (const r of data) {
    const violations = (r as any).violations || [];
    if (violations.length === 0) noViolations++;
    for (const v of violations) {
      vCounts[v] = (vCounts[v] || 0) + 1;
    }
  }
  for (const [k, v] of Object.entries(vCounts).sort((a, b) => (b[1] as number) - (a[1] as number))) {
    console.log("  ", k.padEnd(30), v, "/", total, "(" + ((v as number / total) * 100).toFixed(0) + "%)");
  }
  console.log("\n  No violations (clean):", noViolations, "/", total);

  // Image stats
  const imgCounts = data.map((r: any) => (r.image_urls || []).length);
  const has3plus = imgCounts.filter((c: number) => c >= 3).length;
  const has1 = imgCounts.filter((c: number) => c === 1).length;
  const has0 = imgCounts.filter((c: number) => c === 0).length;
  console.log("\n=== IMAGE STATS ===");
  console.log("  0 images:", has0);
  console.log("  1 image:", has1);
  console.log("  3+ images:", has3plus);

  // Description stats
  const descLengths = data.map((r: any) => (r.description || "").length);
  const has50plus = descLengths.filter((c: number) => c >= 50).length;
  console.log("\n=== DESCRIPTION STATS ===");
  console.log("  50+ chars:", has50plus, "/", total);
  console.log("  0 chars:", descLengths.filter((c: number) => c === 0).length, "/", total);
}

main();
