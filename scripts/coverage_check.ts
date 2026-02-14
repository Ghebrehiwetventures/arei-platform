import { getSupabaseClient } from "../core/supabaseClient";

async function main() {
  const sb = getSupabaseClient();
  const marketFilter = process.argv[2] || "cv";
  const { data, error } = await sb.from("listings").select("*").like("source_id", marketFilter + "_%");
  if (error) { console.error("ERROR:", error.message); return; }

  const total = data!.length;
  console.log("=== " + marketFilter.toUpperCase() + " LISTINGS:", total, "===\n");

  const fields = [
    "id", "source_id", "source_url", "title", "description",
    "price", "currency", "country", "island", "city",
    "bedrooms", "bathrooms", "property_size_sqm",
    "image_urls", "property_type", "amenities", "price_period",
    "status", "violations", "approved"
  ];

  console.log("FIELD".padEnd(22), "FILLED".padEnd(10), "%".padEnd(6), "SAMPLE");
  console.log("-".repeat(80));

  for (const f of fields) {
    let filled = 0;
    let sample: any = null;
    for (const row of data!) {
      const v = (row as any)[f];
      const isEmpty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      if (!isEmpty) {
        filled++;
        if (sample === null) sample = v;
      }
    }
    const pct = ((filled / total) * 100).toFixed(0);
    let sampleStr: string;
    if (Array.isArray(sample)) {
      sampleStr = "[" + sample.length + " items]";
    } else if (typeof sample === "string" && sample.length > 50) {
      sampleStr = sample.substring(0, 50) + "...";
    } else {
      sampleStr = String(sample);
    }
    console.log(f.padEnd(22), (filled + "/" + total).padEnd(10), (pct + "%").padEnd(6), sampleStr);
  }

  // Property type breakdown
  const ptypes: Record<string, number> = {};
  for (const r of data!) {
    const pt = (r as any).property_type || "(null)";
    ptypes[pt] = (ptypes[pt] || 0) + 1;
  }
  console.log("\n=== PROPERTY TYPE BREAKDOWN ===");
  for (const [k, v] of Object.entries(ptypes).sort((a, b) => (b[1] as number) - (a[1] as number))) {
    console.log("  ", k.padEnd(20), v);
  }

  // Amenities
  const withAmenities = data!.filter((d: any) => d.amenities && d.amenities.length > 0);
  console.log("\n=== AMENITIES ===");
  console.log("Listings with amenities:", withAmenities.length, "/", total);
  if (withAmenities.length > 0) {
    const allAmenities: Record<string, number> = {};
    for (const r of withAmenities) {
      for (const a of (r as any).amenities) {
        allAmenities[a] = (allAmenities[a] || 0) + 1;
      }
    }
    for (const [k, v] of Object.entries(allAmenities).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      console.log("  ", k.padEnd(20), v);
    }
  }

  // Country
  console.log("\n=== COUNTRY ===");
  const countries: Record<string, number> = {};
  for (const r of data!) {
    const c = (r as any).country || "(null)";
    countries[c] = (countries[c] || 0) + 1;
  }
  for (const [k, v] of Object.entries(countries)) {
    console.log("  ", k.padEnd(20), v);
  }

  // Price period
  console.log("\n=== PRICE PERIOD ===");
  const periods: Record<string, number> = {};
  for (const r of data!) {
    const p = (r as any).price_period || "(null)";
    periods[p] = (periods[p] || 0) + 1;
  }
  for (const [k, v] of Object.entries(periods)) {
    console.log("  ", k.padEnd(20), v);
  }
}

main();
