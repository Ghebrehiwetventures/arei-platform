/**
 * Check image_urls coverage for approved listings.
 * Usage: npx ts-node scripts/check_image_coverage.ts [country]
 * Default: Cape Verde. Use "all" for all countries.
 */
import { getSupabaseClient } from "../core/supabaseClient";

async function main() {
  const sb = getSupabaseClient();
  const countryArg = process.argv[2] || "Cape Verde";

  let query = sb
    .from("listings")
    .select("id, image_urls")
    .eq("approved", true)
    .limit(5000);
  if (countryArg.toLowerCase() !== "all") {
    query = query.eq("country", countryArg);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  const rows = data || [];
  const total = rows.length;
  const hasImage = rows.filter(
    (r: { image_urls?: string[] | null }) =>
      r.image_urls != null && Array.isArray(r.image_urls) && r.image_urls.length > 0
  ).length;
  const noImage = total - hasImage;

  console.log("\n=== IMAGE COVERAGE ===\n");
  console.log(`Country filter: ${countryArg}`);
  console.log(`Total approved: ${total}`);
  console.log(`Has image(s):   ${hasImage} (${total ? ((hasImage / total) * 100).toFixed(1) : 0}%)`);
  console.log(`No image:       ${noImage} (${total ? ((noImage / total) * 100).toFixed(1) : 0}%)`);
  console.log("");
}

main();
