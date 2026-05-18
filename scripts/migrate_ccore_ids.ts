// scripts/migrate_ccore_ids.ts
//
// One-shot migration: rename existing kv_curated.listings rows for
// source_id_primary='cv_ccoreinvestments' from md5(title|price|url)-derived ids
// to the stable numeric id embedded in their source_url_primary.
//
// Why: the engine now derives ids from `id_url_pattern` so the same listing
// resolves to the same row across language variants. Existing rows were
// inserted before that change and use the hash form; without migrating them,
// the next ingest from /en/list inserts duplicates instead of upserting.
//
// Run:
//   DATABASE_URL=... npx ts-node --transpile-only scripts/migrate_ccore_ids.ts
//   (defaults to dry-run; pass APPLY=1 to actually write)
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { createPostgresClient } from "../core/postgresClient";

const SOURCE_ID = "cv_ccoreinvestments";
const ID_PREFIX = "ccore";
const URL_ID_RE = /\/(\d+)(?:[/?#]|$)/;

interface Row {
  id: string;
  source_url_primary: string | null;
  publish_status: string;
}

async function main() {
  const apply = process.env.APPLY === "1";
  const client = createPostgresClient();
  await client.connect();

  try {
    const { rows } = await client.query<Row>(
      `SELECT id, source_url_primary, publish_status
         FROM kv_curated.listings
        WHERE source_id_primary = $1`,
      [SOURCE_ID]
    );

    console.log(`Found ${rows.length} rows for source_id_primary='${SOURCE_ID}'.\n`);

    const plan: Array<{ from: string; to: string; status: string }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const collisions: Array<{ from: string; to: string }> = [];

    const targetIds = new Set<string>();
    for (const r of rows) {
      const m = r.source_url_primary?.match(URL_ID_RE);
      if (!m) { skipped.push({ id: r.id, reason: "no numeric id in source_url_primary" }); continue; }
      const newId = `${ID_PREFIX}_${m[1]}`;
      if (newId === r.id) { skipped.push({ id: r.id, reason: "already numeric" }); continue; }
      if (targetIds.has(newId)) { collisions.push({ from: r.id, to: newId }); continue; }
      targetIds.add(newId);
      plan.push({ from: r.id, to: newId, status: r.publish_status });
    }

    // Pre-flight: do any of the target ids collide with existing rows
    // we are NOT migrating (e.g. rows from a different source)?
    if (plan.length > 0) {
      const targets = plan.map(p => p.to);
      const { rows: existing } = await client.query<{ id: string; source_id_primary: string }>(
        `SELECT id, source_id_primary FROM kv_curated.listings WHERE id = ANY($1::text[])`,
        [targets]
      );
      const externalCollisions = existing.filter(e => e.source_id_primary !== SOURCE_ID);
      if (externalCollisions.length > 0) {
        console.error("ABORT: target ids collide with rows from another source:");
        externalCollisions.forEach(e => console.error(`  ${e.id}  (source=${e.source_id_primary})`));
        process.exit(2);
      }
    }

    console.log(`Plan: ${plan.length} renames, ${skipped.length} skipped, ${collisions.length} collisions.\n`);
    console.log("Sample of planned renames (first 10):");
    plan.slice(0, 10).forEach(p => console.log(`  ${p.from}  →  ${p.to}   [${p.status}]`));
    if (skipped.length) {
      console.log("\nSkipped:");
      skipped.slice(0, 20).forEach(s => console.log(`  ${s.id}: ${s.reason}`));
    }
    if (collisions.length) {
      console.log("\nIntra-batch collisions (two source rows map to the same target id — investigate):");
      collisions.slice(0, 20).forEach(c => console.log(`  ${c.from}  →  ${c.to}`));
    }

    if (!apply) {
      console.log("\n[DRY-RUN] No changes written. Re-run with APPLY=1 to apply.");
      return;
    }

    console.log(`\n[APPLY] Renaming ${plan.length} rows…`);
    await client.query("BEGIN");
    try {
      for (const p of plan) {
        const r = await client.query(
          `UPDATE kv_curated.listings
              SET id = $2,
                  seeded_from_raw_listing_id = $2
            WHERE id = $1`,
          [p.from, p.to]
        );
        if (r.rowCount !== 1) {
          throw new Error(`UPDATE for ${p.from}→${p.to} touched ${r.rowCount} rows (expected 1)`);
        }
      }
      await client.query("COMMIT");
      console.log(`[APPLY] Committed ${plan.length} renames.`);
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("[APPLY] Rolled back due to error:", e);
      process.exit(3);
    }
  } finally {
    await client.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
