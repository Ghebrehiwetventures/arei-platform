/**
 * backfill_description_from_html.ts
 *
 * One-time backfill: derives plain-text `description` from `description_html`
 * for rows where `description` is null but `description_html` is present.
 *
 * Scope: cv_homescasaverde, cv_simplycapeverde, cv_estatecv only.
 *
 * Root cause: enrichment pipeline stored rich content only in description_html,
 * leaving description null. The golden-rules checker reads description only,
 * so DESCRIPTION_TOO_SHORT fires incorrectly on these rows.
 *
 * This script does NOT touch `violations` or `approved`.
 * Run reevaluate_violations.ts after this to recalculate those.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill_description_from_html.ts          # dry-run
 *   APPLY=1 npx ts-node --transpile-only scripts/backfill_description_from_html.ts  # apply
 */

import { getSupabaseClient } from "../core/supabaseClient";

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;

const MIN_DESCRIPTION_LENGTH = 50;
const BATCH_SIZE = 200;

// Tight scope: only sources confirmed to have stale description/description_html split.
const TARGET_SOURCES = ["cv_homescasaverde", "cv_simplycapeverde", "cv_estatecv"];

type Mode = "dry-run" | "apply";

interface SourceRow {
  id: string;
  source_id: string;
  description: string | null;
  description_html: string | null;
}

interface PlannedUpdate {
  id: string;
  source_id: string;
  derived_description: string;
  derived_length: number;
}

interface SkippedRow {
  id: string;
  source_id: string;
  reason: "stripped_too_short";
  stripped_length: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadRows(): Promise<SourceRow[]> {
  const sb = getSupabaseClient();
  const rows: SourceRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await sb
      .from("listings")
      .select("id, source_id, description, description_html")
      .in("source_id", TARGET_SOURCES)
      .is("description", null)
      .not("description_html", "is", null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Failed to load rows: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as SourceRow[]));
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return rows;
}

function buildPlan(rows: SourceRow[]): { updates: PlannedUpdate[]; skips: SkippedRow[] } {
  const updates: PlannedUpdate[] = [];
  const skips: SkippedRow[] = [];

  for (const row of rows) {
    if (!row.description_html) continue;

    const stripped = stripHtml(row.description_html);

    if (stripped.length < MIN_DESCRIPTION_LENGTH) {
      skips.push({
        id: row.id,
        source_id: row.source_id,
        reason: "stripped_too_short",
        stripped_length: stripped.length,
      });
      continue;
    }

    updates.push({
      id: row.id,
      source_id: row.source_id,
      derived_description: stripped,
      derived_length: stripped.length,
    });
  }

  return { updates, skips };
}

async function applyUpdates(updates: PlannedUpdate[]): Promise<{ applied: number; failed: number }> {
  const sb = getSupabaseClient();
  let applied = 0;
  let failed = 0;

  for (const u of updates) {
    const { error } = await sb
      .from("listings")
      .update({ description: u.derived_description })
      .eq("id", u.id);

    if (error) {
      console.error(`  [fail] ${u.id}: ${error.message}`);
      failed++;
    } else {
      applied++;
    }
  }

  return { applied, failed };
}

async function main(): Promise<void> {
  const mode: Mode = process.env.APPLY === "1" ? "apply" : "dry-run";

  console.log(`\n=== backfill_description_from_html [${mode}] ===\n`);

  const rows = await loadRows();
  console.log(`Rows with description=null and description_html set: ${rows.length}`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const { updates, skips } = buildPlan(rows);

  // Source breakdown
  const bySource: Record<string, number> = {};
  for (const u of updates) {
    bySource[u.source_id] = (bySource[u.source_id] || 0) + 1;
  }

  console.log(`\nPlanned updates: ${updates.length}`);
  for (const [src, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${n}`);
  }

  console.log(`\nSkipped (stripped text < ${MIN_DESCRIPTION_LENGTH} chars): ${skips.length}`);

  if (updates.length > 0) {
    console.log("\nSample updates (first 3):");
    for (const u of updates.slice(0, 3)) {
      console.log(`  ${u.id}  ${u.source_id}  len=${u.derived_length}`);
      console.log(`    "${u.derived_description.slice(0, 80)}..."`);
    }
  }

  if (mode === "dry-run") {
    console.log("\nDry-run complete. Set APPLY=1 to write changes.");
    return;
  }

  console.log("\nApplying...");
  const { applied, failed } = await applyUpdates(updates);
  console.log(`\nDone: ${applied} updated, ${failed} failed`);
  console.log("\nNext step: run reevaluate_violations.ts to recalculate violations and approved.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
