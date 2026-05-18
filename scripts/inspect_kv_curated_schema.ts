/**
 * Inspect the live kv_curated.listings schema and verify our proposed
 * ingest_to_curated mapping is complete and type-compatible.
 *
 * Uses DATABASE_URL (pooler-backed pg.Client) — required because
 * kv_curated is a private schema not exposed via Supabase REST.
 *
 * Run:
 *   npx ts-node --transpile-only scripts/inspect_kv_curated_schema.ts
 */
import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PROPOSED_MAPPING: Record<string, string> = {
  id: "text",
  publish_status: "text",
  title: "text",
  description: "text",
  price: "numeric",
  currency: "text",
  price_period: "text",
  country: "text",
  island: "text",
  city: "text",
  bedrooms: "integer",
  bathrooms: "integer",
  property_type: "text",
  property_size_sqm: "numeric",
  land_area_sqm: "numeric",
  image_urls: "ARRAY",
  source_id_primary: "text",
  source_url_primary: "text",
  first_seen_at: "timestamp with time zone",
  ai_descriptions: "jsonb",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set in .env");

  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'kv_curated'
      AND table_name   = 'listings'
    ORDER BY ordinal_position
  `);

  await client.end();

  if (rows.length === 0) {
    console.error("No columns found — table may not exist or DATABASE_URL lacks access.");
    process.exit(1);
  }

  console.log("\n=== kv_curated.listings — live schema ===\n");
  console.log(
    "column_name".padEnd(35),
    "data_type".padEnd(32),
    "nullable".padEnd(10),
    "default"
  );
  console.log("-".repeat(100));
  for (const r of rows) {
    console.log(
      r.column_name.padEnd(35),
      r.data_type.padEnd(32),
      r.is_nullable.padEnd(10),
      r.column_default ?? ""
    );
  }

  // --- Mapping verification ---
  console.log("\n=== Proposed mapping verification ===\n");
  const liveByName = new Map(rows.map((r) => [r.column_name, r]));
  let allOk = true;

  for (const [col, proposedType] of Object.entries(PROPOSED_MAPPING)) {
    const live = liveByName.get(col);
    if (!live) {
      console.log(`  ✗ MISSING  ${col}  (proposed: ${proposedType})`);
      allOk = false;
      continue;
    }
    const typeMatch =
      live.data_type === proposedType ||
      (proposedType === "ARRAY" && live.data_type === "ARRAY");
    const mark = typeMatch ? "✓" : "✗ TYPE_MISMATCH";
    if (!typeMatch) allOk = false;
    console.log(
      `  ${mark.padEnd(18)} ${col.padEnd(30)} live=${live.data_type}  proposed=${proposedType}`
    );
  }

  // --- Columns in live schema not in our mapping ---
  console.log("\n=== Live columns NOT in proposed mapping ===\n");
  for (const r of rows) {
    if (!PROPOSED_MAPPING[r.column_name]) {
      const nullable = r.is_nullable === "YES" ? "nullable" : "NOT NULL";
      console.log(`  ${r.column_name.padEnd(35)} ${r.data_type}  (${nullable})`);
    }
  }

  console.log(allOk ? "\n✓ Mapping looks correct.\n" : "\n✗ Fix mismatches before proceeding.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
