/**
 * Pre-flight check for v1.1 study.
 * Verifies per-source listing availability + property_type fill rate.
 * Also samples one cv_capeverdeproperty24 description to confirm
 * the "messy formatting" assumption.
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: true,
});
import { getSupabaseClient } from "../../../core/supabaseClient";

const TARGETS: Record<string, number> = {
  cv_estatecv: 8,
  cv_terracaboverde: 5,
  cv_simplycapeverde: 4,
  cv_homescasaverde: 4,
  cv_capeverdeproperty24: 3,
  cv_cabohouseproperty: 3,
  cv_oceanproperty24: 3,
};

async function main(): Promise<void> {
  const sb = getSupabaseClient();
  console.log("source                       | with_desc | with_pt | property_types_present");
  console.log("-----------------------------+-----------+---------+--------------------------------------");

  for (const source of Object.keys(TARGETS)) {
    const { data, error } = await sb
      .from("listings")
      .select("id, property_type")
      .eq("source_id", source)
      .not("description", "is", null)
      .limit(500);
    if (error) {
      console.log(`${source.padEnd(28)} | ERROR: ${error.message}`);
      continue;
    }
    const rows = (data ?? []).filter(
      (r: any) => typeof r.id === "string"
    );
    const withPt = rows.filter((r: any) => r.property_type).length;
    const ptCounts: Record<string, number> = {};
    for (const r of rows) {
      const pt = r.property_type || "_null";
      ptCounts[pt] = (ptCounts[pt] || 0) + 1;
    }
    const ptSummary = Object.entries(ptCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    const target = TARGETS[source];
    const flag = rows.length < target ? " ⚠" : rows.length >= target * 2 ? " ✓" : " ·";
    console.log(
      `${source.padEnd(28)} | ${String(rows.length).padStart(9)} | ${String(withPt).padStart(7)} | ${ptSummary}${flag}  (target ${target})`
    );
  }

  console.log("\n--- sample cv_capeverdeproperty24 description (first 800 chars) ---");
  const { data: sample } = await sb
    .from("listings")
    .select("id, description")
    .eq("source_id", "cv_capeverdeproperty24")
    .not("description", "is", null)
    .limit(1);
  if (sample && sample.length > 0) {
    console.log(`id: ${sample[0].id}`);
    console.log(String(sample[0].description).slice(0, 800));
  } else {
    console.log("(no rows)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
