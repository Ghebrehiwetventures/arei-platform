/**
 * Daily source health snapshot writer.
 *
 * Calls get_source_quality_stats() (Supabase RPC), computes the operational
 * health grade using the shared module from arei-admin/sourceHealthGrade.ts
 * (single source of truth — must match the live admin), and upserts one row
 * per source per UTC day into source_health_snapshots.
 *
 * Idempotent: same-day re-runs upsert on (snapshot_date, source_id) so cron
 * misses or manual workflow_dispatch backfills are safe.
 *
 * Auth: requires SUPABASE_SERVICE_ROLE_KEY because the snapshots table has
 * RLS enabled with no insert policies for anon/authenticated.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx ts-node --transpile-only scripts/snapshot_source_health.ts
 *
 * Exit codes:
 *   0  success (rows written)
 *   1  missing env vars
 *   2  RPC failure
 *   3  upsert failure
 */
import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { computeHealthGrade } from "./sourceHealthGrade";

// Local dev convenience; in CI the env vars are injected directly.
for (const p of [path.resolve(__dirname, "../.env"), "/Users/ghebrehiwet/arei-platform-clean/.env"]) {
  dotenv.config({ path: p });
}

interface RpcRow {
  source_id: string;
  listing_count: number | string;
  approved_count: number | string;
  with_image_count: number | string;
  with_price_count: number | string;
  with_sqm_count?: number | string;
  with_beds_count?: number | string;
  with_baths_count?: number | string;
  trust_passed_count?: number | string;
  indexable_count?: number | string;
  public_feed_count?: number | string;
  last_updated_at?: string | null;
}

interface SnapshotRow {
  snapshot_date: string;
  source_id: string;
  market_id: string;
  listing_count: number;
  approved_count: number;
  public_feed_count: number;
  indexable_count: number;
  trust_passed_count: number;
  with_sqm_count: number;
  with_beds_count: number;
  with_baths_count: number;
  sqm_pct: number;
  beds_pct: number;
  baths_pct: number;
  feed_conversion_pct: number;
  health_grade: "A" | "B" | "C" | "D";
  last_updated_at: string | null;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildSnapshotRow(r: RpcRow, snapshotDate: string): SnapshotRow {
  const marketId = r.source_id.match(/^([a-z]{2})_/)?.[1] || "?";
  const listing = toNum(r.listing_count);
  const approved = toNum(r.approved_count);
  const feed = toNum(r.public_feed_count);
  const indexable = toNum(r.indexable_count);
  const trust = toNum(r.trust_passed_count);
  const withSqm = toNum(r.with_sqm_count);
  const withBeds = toNum(r.with_beds_count);
  const withBaths = toNum(r.with_baths_count);

  const denom = listing || 1;
  const sqmPct = (withSqm / denom) * 100;
  const bedsPct = (withBeds / denom) * 100;
  const bathsPct = (withBaths / denom) * 100;
  const feedConvPct = approved > 0 ? (feed / approved) * 100 : 0;

  const { grade } = computeHealthGrade({
    listing_count: listing,
    approved_count: approved,
    public_feed_count: feed,
    trust_passed_count: trust,
    indexable_count: indexable,
    sqm_pct: sqmPct,
    beds_pct: bedsPct,
    baths_pct: bathsPct,
    feed_conversion_pct: feedConvPct,
    last_updated_at: r.last_updated_at,
  });

  return {
    snapshot_date: snapshotDate,
    source_id: r.source_id,
    market_id: marketId,
    listing_count: listing,
    approved_count: approved,
    public_feed_count: feed,
    indexable_count: indexable,
    trust_passed_count: trust,
    with_sqm_count: withSqm,
    with_beds_count: withBeds,
    with_baths_count: withBaths,
    sqm_pct: round1(sqmPct),
    beds_pct: round1(bedsPct),
    baths_pct: round1(bathsPct),
    feed_conversion_pct: round1(feedConvPct),
    health_grade: grade,
    last_updated_at: r.last_updated_at ?? null,
  };
}

(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const snapshotDate = todayUtc();
  console.log(`[snapshot] snapshot_date=${snapshotDate}`);

  const { data, error } = await sb.rpc("get_source_quality_stats");
  if (error) {
    console.error(`[snapshot] RPC error: ${error.message}`);
    process.exit(2);
  }
  const rpcRows = (data || []) as RpcRow[];
  console.log(`[snapshot] rpc_rows=${rpcRows.length}`);
  if (rpcRows.length === 0) {
    console.error("[snapshot] RPC returned 0 rows — refusing to write");
    process.exit(2);
  }

  const snapshotRows = rpcRows.map((r) => buildSnapshotRow(r, snapshotDate));

  // Per-market breakdown (for the log).
  const byMarket = new Map<string, number>();
  for (const r of snapshotRows) byMarket.set(r.market_id, (byMarket.get(r.market_id) ?? 0) + 1);
  const breakdown = [...byMarket.entries()].sort().map(([m, n]) => `${m}=${n}`).join(" ");
  console.log(`[snapshot] by_market: ${breakdown}`);

  // Per-grade breakdown (also for the log).
  const byGrade = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  for (const r of snapshotRows) byGrade[r.health_grade]++;
  console.log(`[snapshot] by_grade: A=${byGrade.A} B=${byGrade.B} C=${byGrade.C} D=${byGrade.D}`);

  const { error: upsertError, count } = await sb
    .from("source_health_snapshots")
    .upsert(snapshotRows, { onConflict: "snapshot_date,source_id", count: "exact" });
  if (upsertError) {
    console.error(`[snapshot] upsert error: ${upsertError.message}`);
    process.exit(3);
  }
  console.log(`[snapshot] rows_written=${count ?? snapshotRows.length}`);
  console.log("[snapshot] OK");
})().catch((e) => {
  console.error("[snapshot] unexpected error:", e);
  process.exit(99);
});
