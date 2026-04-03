/**
 * reevaluate_violations.ts
 *
 * Re-runs golden-rules evaluation against current DB state for Cape Verde listings
 * and writes back corrected `violations` + `approved` where they differ.
 *
 * Run AFTER backfill_description_from_html.ts so that `description` is populated
 * before violations are recalculated.
 *
 * This script does NOT modify any other field (title, price, images, etc.).
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/reevaluate_violations.ts          # dry-run
 *   APPLY=1 npx ts-node --transpile-only scripts/reevaluate_violations.ts  # apply
 *
 * Scope: cv_homescasaverde, cv_simplycapeverde, cv_estatecv only.
 * Targets: rows where current violations/approved are stale due to confirmed pipeline bugs.
 */

import { getSupabaseClient } from "../core/supabaseClient";
import { evaluateGoldenRules, RuleViolation, ListingInput } from "../core/goldenRules";
import { SourceStatus } from "../core/status";

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;

const BATCH_SIZE = 200;

// Tight scope: only the three sources confirmed to have stale violations.
// cv_homescasaverde: image backfill wrote image_urls without recalculating violations.
// cv_simplycapeverde: enrichment cap / CAPTCHA left description null, violations never refreshed.
// cv_estatecv: same enrichment-cap root cause as cv_simplycapeverde.
const TARGET_SOURCES = ["cv_homescasaverde", "cv_simplycapeverde", "cv_estatecv"];

type Mode = "dry-run" | "apply";

interface DbRow {
  id: string;
  source_id: string;
  title: string | null;
  price: number | null;
  description: string | null;
  image_urls: string[] | null;
  source_url: string | null;
  violations: string[] | null;
  approved: boolean;
}

interface PlannedUpdate {
  id: string;
  source_id: string;
  old_violations: string[];
  new_violations: string[];
  old_approved: boolean;
  new_approved: boolean;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

async function loadRows(): Promise<DbRow[]> {
  const sb = getSupabaseClient();
  const rows: DbRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await sb
      .from("listings")
      .select("id, source_id, title, price, description, image_urls, source_url, violations, approved")
      .in("source_id", TARGET_SOURCES)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Failed to load rows: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as DbRow[]));
    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return rows;
}

function buildPlan(rows: DbRow[]): PlannedUpdate[] {
  const updates: PlannedUpdate[] = [];

  for (const row of rows) {
    const input: ListingInput = {
      id: row.id,
      title: row.title ?? undefined,
      price: row.price ?? undefined,
      description: row.description ?? undefined,
      imageUrls: Array.isArray(row.image_urls) ? row.image_urls : undefined,
      sourceUrl: row.source_url ?? undefined,
      sourceStatus: SourceStatus.OK,
    };

    const newViolations = evaluateGoldenRules(input);
    const newApproved = newViolations.filter((v) => v !== RuleViolation.INVALID_PRICE).length === 0;

    const oldViolations = Array.isArray(row.violations) ? (row.violations as string[]) : [];
    const oldApproved = row.approved;

    if (!arraysEqual(oldViolations, newViolations) || oldApproved !== newApproved) {
      updates.push({
        id: row.id,
        source_id: row.source_id,
        old_violations: oldViolations,
        new_violations: newViolations,
        old_approved: oldApproved,
        new_approved: newApproved,
      });
    }
  }

  return updates;
}

async function applyUpdates(updates: PlannedUpdate[]): Promise<{ applied: number; failed: number }> {
  const sb = getSupabaseClient();
  let applied = 0;
  let failed = 0;

  for (const u of updates) {
    const { error } = await sb
      .from("listings")
      .update({ violations: u.new_violations, approved: u.new_approved })
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

  console.log(`\n=== reevaluate_violations [${mode}] ===\n`);

  const rows = await loadRows();
  console.log(`Target sources: ${TARGET_SOURCES.join(", ")}`);
  console.log(`Total rows loaded: ${rows.length}`);

  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const updates = buildPlan(rows);

  console.log(`\nRows with changed violations or approved: ${updates.length}`);
  console.log(`Rows unchanged: ${rows.length - updates.length}`);

  // Source breakdown
  const bySource: Record<string, { total: number; willApprove: number; wasApproved: number }> = {};
  for (const u of updates) {
    if (!bySource[u.source_id]) bySource[u.source_id] = { total: 0, willApprove: 0, wasApproved: 0 };
    bySource[u.source_id].total++;
    if (u.new_approved) bySource[u.source_id].willApprove++;
    if (u.old_approved) bySource[u.source_id].wasApproved++;
  }

  if (Object.keys(bySource).length > 0) {
    console.log("\nSource breakdown (changed rows only):");
    for (const [src, counts] of Object.entries(bySource).sort((a, b) => b[1].total - a[1].total)) {
      console.log(`  ${src}: ${counts.total} changed  (${counts.wasApproved} → ${counts.willApprove} approved)`);
    }
  }

  // Violation delta summary
  const gainApproval = updates.filter((u) => !u.old_approved && u.new_approved).length;
  const loseApproval = updates.filter((u) => u.old_approved && !u.new_approved).length;

  console.log(`\nApproval changes:`);
  console.log(`  false → true  (gain approval): ${gainApproval}`);
  console.log(`  true  → false (lose approval): ${loseApproval}`);

  if (updates.length > 0) {
    console.log("\nSample changes (first 5):");
    for (const u of updates.slice(0, 5)) {
      console.log(`  ${u.id}  ${u.source_id}`);
      console.log(`    violations: [${u.old_violations.join(", ")}] → [${u.new_violations.join(", ")}]`);
      console.log(`    approved:   ${u.old_approved} → ${u.new_approved}`);
    }
  }

  if (mode === "dry-run") {
    console.log("\nDry-run complete. Set APPLY=1 to write changes.");
    return;
  }

  console.log("\nApplying...");
  const { applied, failed } = await applyUpdates(updates);
  console.log(`\nDone: ${applied} updated, ${failed} failed`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
