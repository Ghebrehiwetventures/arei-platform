/**
 * Market report snapshot writer.
 *
 * Calls compute_market_report_snapshot() (Supabase RPC — service_role only),
 * and upserts one draft row per island (plus the 'ALL' aggregate) into
 * market_report_snapshots for the given date.
 *
 * IMPORTANT: This script writes status = 'draft' only. It never publishes.
 * Use `npm run publish:market-report -- --date YYYY-MM-DD` to promote a
 * draft to published after reviewing the numbers.
 *
 * Idempotent: re-running on a draft date updates the data columns and
 * leaves status = 'draft'. Running on a date that already has a published
 * snapshot aborts with exit code 4 — never silently overwrites live data.
 *
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY. The compute function is
 * SECURITY DEFINER and restricted to service_role; anon cannot call it.
 *
 * Usage:
 *   npm run snapshot:market-report
 *   npm run snapshot:market-report -- --date 2026-05-21
 *
 *   Or directly:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx ts-node --transpile-only scripts/snapshot_market_report.ts [--date YYYY-MM-DD]
 *
 * Exit codes:
 *   0  success — draft rows written
 *   1  missing env vars or invalid arguments
 *   2  RPC failure
 *   3  upsert failure
 *   4  snapshot for this date already published — use a different date
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

for (const p of [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.local"),
]) {
  dotenv.config({ path: p });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RpcRow {
  snapshot_date: string;
  island: string;
  listing_count: number | string;
  source_count: number | string;
  index_eligible_count: number | string;
  median_price_eur: number | string | null;
  avg_eur_per_sqm: number | string | null;
  sqm_coverage_pct: number | string | null;
  price_coverage_pct: number | string | null;
  methodology_version: string;
}

interface SnapshotRow {
  snapshot_date: string;
  island: string;
  listing_count: number;
  source_count: number;
  index_eligible_count: number;
  median_price_eur: number | null;
  avg_eur_per_sqm: number | null;
  sqm_coverage_pct: number | null;
  price_coverage_pct: number | null;
  status: "draft";
  methodology_version: string;
  last_updated: string;
}

interface ExistingRow {
  status: string;
  published_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(): { date: string } {
  const idx = process.argv.indexOf("--date");
  if (idx === -1) return { date: todayUtc() };

  const raw = process.argv[idx + 1];
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    console.error(
      `[snapshot:market-report] invalid --date value: "${raw ?? ""}" — expected YYYY-MM-DD`
    );
    process.exit(1);
  }
  return { date: raw };
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildRow(r: RpcRow): SnapshotRow {
  return {
    snapshot_date: r.snapshot_date,
    island: r.island,
    listing_count: toNum(r.listing_count),
    source_count: toNum(r.source_count),
    index_eligible_count: toNum(r.index_eligible_count),
    median_price_eur: toNumOrNull(r.median_price_eur),
    avg_eur_per_sqm: toNumOrNull(r.avg_eur_per_sqm),
    sqm_coverage_pct: toNumOrNull(r.sqm_coverage_pct),
    price_coverage_pct: toNumOrNull(r.price_coverage_pct),
    status: "draft",
    methodology_version: r.methodology_version ?? "v1",
    last_updated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[snapshot:market-report] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const { date: snapshotDate } = parseArgs();
  console.log(`[snapshot:market-report] snapshot_date=${snapshotDate}`);

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Guard: abort if this date already has a published snapshot.
  // Never overwrite live data, even if status column would be overwritten
  // with 'draft' again — the publish_at / published_by would be wiped.
  const { data: existing, error: checkError } = await sb
    .from("market_report_snapshots")
    .select("status, published_at")
    .eq("snapshot_date", snapshotDate)
    .eq("island", "ALL")
    .maybeSingle();

  if (checkError) {
    console.error(
      `[snapshot:market-report] pre-flight check failed: ${checkError.message}`
    );
    process.exit(2);
  }

  const existingRow = existing as ExistingRow | null;
  if (existingRow?.status === "published" || existingRow?.published_at) {
    console.error(
      `[snapshot:market-report] snapshot for ${snapshotDate} is already published.`
    );
    console.error(
      `  To re-snapshot, first choose a different date or unpublish via the admin.`
    );
    process.exit(4);
  }

  if (existingRow) {
    console.log(
      `[snapshot:market-report] existing draft found for ${snapshotDate} — will overwrite data columns`
    );
  }

  // Call the compute RPC (service_role only; SECURITY DEFINER).
  const { data, error: rpcError } = await sb.rpc(
    "compute_market_report_snapshot",
    { p_date: snapshotDate }
  );

  if (rpcError) {
    console.error(`[snapshot:market-report] RPC error: ${rpcError.message}`);
    process.exit(2);
  }

  const rpcRows = (data ?? []) as RpcRow[];
  console.log(`[snapshot:market-report] rpc_rows=${rpcRows.length}`);

  if (rpcRows.length === 0) {
    console.error(
      "[snapshot:market-report] RPC returned 0 rows — refusing to write empty snapshot"
    );
    process.exit(2);
  }

  const rows: SnapshotRow[] = rpcRows.map(buildRow);

  // Summary log.
  const allRow = rows.find((r) => r.island === "ALL");
  if (allRow) {
    console.log(
      `[snapshot:market-report] ALL: listing_count=${allRow.listing_count}` +
      ` source_count=${allRow.source_count}` +
      ` index_eligible=${allRow.index_eligible_count}` +
      ` median_eur=${allRow.median_price_eur ?? "n/a"}` +
      ` avg_sqm=${allRow.avg_eur_per_sqm ?? "n/a"}`
    );
  }
  const islandRows = rows.filter((r) => r.island !== "ALL");
  console.log(
    `[snapshot:market-report] islands: ${islandRows.map((r) => r.island).sort().join(", ")}`
  );

  // Upsert draft rows.
  // ON CONFLICT (snapshot_date, island): update data columns only.
  // status, published_at, published_by are NOT in the upserted row,
  // so they are not touched on UPDATE — a re-run never clears a published row
  // (protected by the pre-flight check above anyway).
  const { error: upsertError, count } = await sb
    .from("market_report_snapshots")
    .upsert(rows, {
      onConflict: "snapshot_date,island",
      count: "exact",
    });

  if (upsertError) {
    console.error(
      `[snapshot:market-report] upsert error: ${upsertError.message}`
    );
    process.exit(3);
  }

  console.log(
    `[snapshot:market-report] rows_written=${count ?? rows.length} status=draft`
  );
  console.log("[snapshot:market-report] OK");
  console.log(
    `[snapshot:market-report] → run 'npm run publish:market-report -- --date ${snapshotDate}' to publish`
  );
})().catch((e) => {
  console.error("[snapshot:market-report] unexpected error:", e);
  process.exit(99);
});
