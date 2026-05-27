/**
 * Market report snapshot publisher.
 *
 * Promotes a draft snapshot to published. This is a deliberate, manual step
 * — it is the only path from status='draft' to status='published'.
 *
 * Before promoting, the script prints the draft data for review and asks
 * for confirmation (unless --confirm is passed for non-interactive use).
 *
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   npm run publish:market-report -- --date 2026-05-21
 *   npm run publish:market-report -- --date 2026-05-21 --by "editor@areigroup.com"
 *   npm run publish:market-report -- --date 2026-05-21 --confirm
 *
 *   Or directly:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx ts-node --transpile-only scripts/publish_market_report_snapshot.ts \
 *     --date 2026-05-21 [--by IDENTITY] [--confirm]
 *
 * Exit codes:
 *   0  success — snapshot published
 *   1  missing env vars or invalid arguments
 *   2  query failure
 *   3  update failure
 *   4  no draft snapshot found for the given date
 *   5  snapshot already published
 *   6  user declined confirmation
 */

import * as path from "path";
import * as readline from "readline";
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

interface SnapshotRow {
  snapshot_date: string;
  island: string;
  status: string;
  published_at: string | null;
  listing_count: number;
  source_count: number;
  index_eligible_count: number;
  median_price_eur: number | null;
  avg_eur_per_sqm: number | null;
  sqm_coverage_pct: number | null;
  price_coverage_pct: number | null;
  methodology_version: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { date: string; by: string; confirm: boolean } {
  const argv = process.argv;

  const dateIdx = argv.indexOf("--date");
  if (dateIdx === -1 || !argv[dateIdx + 1]) {
    console.error(
      "[publish:market-report] --date YYYY-MM-DD is required"
    );
    process.exit(1);
  }
  const date = argv[dateIdx + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(
      `[publish:market-report] invalid --date value: "${date}" — expected YYYY-MM-DD`
    );
    process.exit(1);
  }

  const byIdx = argv.indexOf("--by");
  const by = byIdx !== -1 && argv[byIdx + 1] ? argv[byIdx + 1] : "arei-cli";

  const confirm = argv.includes("--confirm");

  return { date, by, confirm };
}

function fmtEur(v: number | null): string {
  if (v === null) return "n/a";
  return `€${v.toLocaleString("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(v: number | null): string {
  return v === null ? "n/a" : `${v}%`;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function printTable(rows: SnapshotRow[]): void {
  const sorted = [...rows].sort((a, b) => {
    if (a.island === "ALL") return -1;
    if (b.island === "ALL") return 1;
    return a.island.localeCompare(b.island);
  });

  const header = [
    pad("Island", 18),
    pad("Listings", 10),
    pad("Eligible", 10),
    pad("Median", 12),
    pad("Avg €/sqm", 12),
    pad("Sources", 9),
    pad("Sqm cov", 9),
    pad("Price cov", 10),
  ].join(" | ");

  const divider = "-".repeat(header.length);

  console.log("");
  console.log(header);
  console.log(divider);

  for (const r of sorted) {
    const line = [
      pad(r.island, 18),
      pad(String(r.listing_count), 10),
      pad(String(r.index_eligible_count), 10),
      pad(fmtEur(r.median_price_eur), 12),
      pad(fmtEur(r.avg_eur_per_sqm), 12),
      pad(String(r.source_count), 9),
      pad(fmtPct(r.sqm_coverage_pct), 9),
      pad(fmtPct(r.price_coverage_pct), 10),
    ].join(" | ");
    console.log(line);
  }

  console.log(divider);
  console.log("");
}

function promptConfirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[publish:market-report] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  const { date: snapshotDate, by: publishedBy, confirm: skipPrompt } =
    parseArgs();

  console.log(
    `[publish:market-report] snapshot_date=${snapshotDate} published_by=${publishedBy}`
  );

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Fetch all rows for this date (service_role bypasses RLS, so we see drafts too).
  const { data, error: fetchError } = await sb
    .from("market_report_snapshots")
    .select(
      "snapshot_date, island, status, published_at, " +
      "listing_count, source_count, index_eligible_count, " +
      "median_price_eur, avg_eur_per_sqm, sqm_coverage_pct, " +
      "price_coverage_pct, methodology_version"
    )
    .eq("snapshot_date", snapshotDate)
    .order("island");

  if (fetchError) {
    console.error(
      `[publish:market-report] fetch error: ${fetchError.message}`
    );
    process.exit(2);
  }

  const rows = (data ?? []) as SnapshotRow[];

  if (rows.length === 0) {
    console.error(
      `[publish:market-report] no snapshot found for ${snapshotDate}.`
    );
    console.error(
      `  Run 'npm run snapshot:market-report -- --date ${snapshotDate}' first.`
    );
    process.exit(4);
  }

  // Check the representative 'ALL' row for current status.
  const allRow = rows.find((r) => r.island === "ALL");
  if (!allRow) {
    console.error(
      `[publish:market-report] snapshot for ${snapshotDate} is malformed — ` +
      `no 'ALL' aggregate row found. Re-run the snapshot command.`
    );
    process.exit(4);
  }

  if (allRow.status === "published" || allRow.published_at !== null) {
    console.error(
      `[publish:market-report] snapshot for ${snapshotDate} is already published ` +
      `(published_at=${allRow.published_at}).`
    );
    process.exit(5);
  }

  // Print the draft data for review.
  console.log(
    `[publish:market-report] draft snapshot for ${snapshotDate} ` +
    `(${rows.length} rows, methodology=${allRow.methodology_version}):`
  );
  printTable(rows);

  // Confirm unless --confirm flag was passed.
  if (!skipPrompt) {
    const ok = await promptConfirm(
      `[publish:market-report] Publish this snapshot as the live market report?`
    );
    if (!ok) {
      console.log("[publish:market-report] aborted — snapshot not published");
      process.exit(6);
    }
  }

  // Promote all rows for this date from draft to published.
  // Both status and published_at are set — both conditions are required for
  // public reads (RLS + SDK query).
  const publishedAt = new Date().toISOString();

  const { error: updateError, count } = await sb
    .from("market_report_snapshots")
    .update({
      status: "published",
      published_at: publishedAt,
      published_by: publishedBy,
      last_updated: publishedAt,
    })
    .eq("snapshot_date", snapshotDate)
    .eq("status", "draft");

  if (updateError) {
    console.error(
      `[publish:market-report] update error: ${updateError.message}`
    );
    process.exit(3);
  }

  console.log(
    `[publish:market-report] published ${count ?? rows.length} rows ` +
    `for ${snapshotDate} at ${publishedAt}`
  );
  console.log("[publish:market-report] OK — snapshot is now live");
})().catch((e) => {
  console.error("[publish:market-report] unexpected error:", e);
  process.exit(99);
});
