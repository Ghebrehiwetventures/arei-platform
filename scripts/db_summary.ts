/**
 * Sammanställning av listings i Supabase.
 * Usage: npx ts-node scripts/db_summary.ts
 */
import { getSupabaseClient } from "../core/supabaseClient";

async function fetcher(sb: ReturnType<typeof getSupabaseClient>, offset: number, limit: number) {
  const { data, error } = await sb
    .from("listings")
    .select("id, country, approved, image_urls, source_id")
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
}

async function main() {
  const sb = getSupabaseClient();
  const pageSize = 1000;
  let offset = 0;
  type Row = { id: string; country: string | null; approved: boolean; image_urls?: string[] | null; source_id?: string };
  let rows: Row[] = [];

  while (true) {
    const chunk = await fetcher(sb, offset, pageSize);
    rows = rows.concat(chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }

  const total = rows.length;
  const approved = rows.filter((r) => r.approved).length;
  const hidden = total - approved;

  const byCountry: Record<string, { total: number; approved: number }> = {};
  for (const r of rows) {
    const c = r.country || "(utan land)";
    if (!byCountry[c]) byCountry[c] = { total: 0, approved: 0 };
    byCountry[c].total++;
    if (r.approved) byCountry[c].approved++;
  }

  const hasImage = rows.filter(
    (r) =>
      r.image_urls != null && Array.isArray(r.image_urls) && r.image_urls.length > 0
  ).length;
  const noImage = total - hasImage;

  const sources = new Set(rows.map((r) => r.source_id).filter(Boolean));
  const sourceCount = sources.size;

  console.log("\n=== SUPABASE LISTINGS – SAMMANSTÄLLNING ===\n");
  console.log(`Total listings:     ${total.toLocaleString()}`);
  console.log(`Godkända (visible): ${approved.toLocaleString()} (${total ? ((approved / total) * 100).toFixed(1) : 0}%)`);
  console.log(`Gömda:             ${hidden.toLocaleString()}`);
  console.log(`Unika källor:      ${sourceCount}`);
  console.log(`\n--- Med / utan bild ---`);
  console.log(`Har bild(er):      ${hasImage.toLocaleString()} (${total ? ((hasImage / total) * 100).toFixed(1) : 0}%)`);
  console.log(`Utan bild:         ${noImage.toLocaleString()} (${total ? ((noImage / total) * 100).toFixed(1) : 0}%)`);

  console.log(`\n--- Per land ---`);
  const sorted = Object.entries(byCountry).sort((a, b) => b[1].approved - a[1].approved);
  for (const [country, { total: n, approved: a }] of sorted) {
    const pct = n ? ((a / n) * 100).toFixed(0) : "0";
    console.log(`  ${country.padEnd(25)} ${a.toLocaleString().padStart(6)} approved / ${n.toLocaleString().padStart(6)} total (${pct}%)`);
  }

  console.log("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
