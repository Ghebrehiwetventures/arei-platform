/**
 * Market News candidate ingestion script.
 *
 * Fetches configured RSS/Google News RSS feeds and inserts new items into
 * public.market_news with status = 'candidate'. Never auto-publishes.
 * Never modifies or deletes existing rows.
 *
 * DEFAULT BEHAVIOUR: dry-run. Nothing is written to the database unless
 * --commit is explicitly passed.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/ingest_market_news.ts
 *     → dry-run: fetches, parses, dedupes, logs what would be inserted
 *
 *   npx ts-node --transpile-only scripts/ingest_market_news.ts --commit
 *     → writes candidates to public.market_news (status = 'candidate')
 *
 * Per-source cap: at most MAX_PER_SOURCE new candidates are inserted per
 * source per run. Items beyond the cap are skipped and counted separately.
 *
 * Required env (loaded from repo root .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Exit codes:
 *   0  success (or dry-run completed)
 *   1  missing env vars
 *   2  all sources failed
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MARKET_NEWS_SOURCES, MarketNewsSource } from "./lib/market-news-sources";
import { parseFeedItems, transformFeedItem, MarketNewsInsert } from "./lib/market-news-transform";
import { loadExistingKeys, isDuplicate } from "./lib/market-news-dedup";

// Load from repo root .env. Matches the pattern in snapshot_source_health.ts —
// tries the conventional relative path first, then a known absolute fallback
// for local dev and worktree environments.
for (const p of [
  path.resolve(__dirname, "../.env"),
  "/Users/ghebrehiwet/arei-platform-clean/.env",
]) {
  dotenv.config({ path: p });
}

// Dry-run is the default. Real inserts require an explicit --commit flag.
const COMMIT = process.argv.includes("--commit");
const DRY_RUN = !COMMIT;
const MAX_PER_SOURCE = 20;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "AREI-MarketNewsBot/1.0 (+https://capeverderealestateindex.com)";

// ── Logging ────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stdout.write(msg + "\n");
}

function banner(msg: string) {
  log("\n" + "─".repeat(60));
  log(msg);
  log("─".repeat(60));
}

// ── Feed fetch ─────────────────────────────────────────────────────────────

async function fetchFeed(source: MarketNewsSource): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Insert ─────────────────────────────────────────────────────────────────

async function insertCandidate(
  sb: SupabaseClient,
  row: MarketNewsInsert
): Promise<void> {
  const { error } = await sb
    .from("market_news")
    .insert(row);

  if (error) {
    // Unique constraint violation means a concurrent run beat us to it — safe to ignore.
    if (error.code === "23505") return;
    throw new Error(error.message);
  }
}

// ── Per-source result ──────────────────────────────────────────────────────

interface SourceResult {
  source: MarketNewsSource;
  fetched: number;
  inserted: number;
  skippedDup: number;
  skippedCap: number;
  error: string | null;
}

async function processSource(
  sb: SupabaseClient,
  source: MarketNewsSource,
  existingKeys: Set<string>,
  dryRun: boolean
): Promise<SourceResult> {
  const result: SourceResult = {
    source,
    fetched: 0,
    inserted: 0,
    skippedDup: 0,
    skippedCap: 0,
    error: null,
  };

  let xml: string;
  try {
    xml = await fetchFeed(source);
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }

  const rawItems = parseFeedItems(xml);
  result.fetched = rawItems.length;

  for (const raw of rawItems) {
    const row = transformFeedItem(raw, source);
    if (!row) {
      result.skippedDup++;
      continue;
    }

    if (isDuplicate(row.canonical_url, row.source_url, existingKeys)) {
      result.skippedDup++;
      continue;
    }

    // Per-source cap: stop inserting once MAX_PER_SOURCE is reached
    if (result.inserted >= MAX_PER_SOURCE) {
      result.skippedCap++;
      continue;
    }

    if (dryRun) {
      log(`  [dry-run] would insert: ${row.title.slice(0, 80)}`);
      // Add to set so dry-run dedup works consistently across sources
      existingKeys.add(row.canonical_url);
      result.inserted++;
    } else {
      try {
        await insertCandidate(sb, row);
        existingKeys.add(row.canonical_url);
        existingKeys.add(row.source_url);
        result.inserted++;
      } catch (err) {
        log(`  [error] insert failed: ${err instanceof Error ? err.message : String(err)}`);
        result.skippedDup++;
      }
    }
  }

  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const started = new Date().toISOString();

  banner(
    `[ingest-market-news] ${started}` +
    (DRY_RUN ? "  ⚠  DRY RUN — pass --commit to write" : "  ✎  COMMIT MODE")
  );

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    log("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  const sb = createClient(url, key);

  log("\nLoading existing market_news keys for dedup…");
  let existingKeys: Set<string>;
  try {
    existingKeys = await loadExistingKeys(sb);
    log(`  ${existingKeys.size} existing keys loaded.`);
  } catch (err) {
    log(`Error loading existing keys: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const activeSources = MARKET_NEWS_SOURCES.filter((s) => s.active !== false);
  const results: SourceResult[] = [];

  for (const source of activeSources) {
    log(`\nSource: ${source.name} [${source.id}]`);
    log(`  URL: ${source.url.slice(0, 90)}…`);

    const result = await processSource(sb, source, existingKeys, DRY_RUN);
    results.push(result);

    if (result.error) {
      log(`  Error: ${result.error}`);
    } else {
      log(`  Fetched:  ${result.fetched} items`);
      log(`  Inserted: ${result.inserted} candidates${result.inserted >= MAX_PER_SOURCE ? ` (cap: ${MAX_PER_SOURCE})` : ""}`);
      log(`  Skipped:  ${result.skippedDup} duplicates / no URL`);
      if (result.skippedCap > 0) {
        log(`  Capped:   ${result.skippedCap} items beyond per-source limit of ${MAX_PER_SOURCE}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const totalFetched  = results.reduce((n, r) => n + r.fetched, 0);
  const totalInserted = results.reduce((n, r) => n + r.inserted, 0);
  const totalDup      = results.reduce((n, r) => n + r.skippedDup, 0);
  const totalCapped   = results.reduce((n, r) => n + r.skippedCap, 0);
  const totalErrors   = results.filter((r) => r.error !== null).length;

  banner("Summary");
  log(`Sources checked:      ${activeSources.length}`);
  log(`Items seen:           ${totalFetched}`);
  log(`Candidates inserted:  ${totalInserted}${DRY_RUN ? " (dry-run, not written)" : ""}`);
  log(`Skipped (dup/no URL): ${totalDup}`);
  log(`Skipped (cap):        ${totalCapped}`);
  log(`Source errors:        ${totalErrors}`);
  if (DRY_RUN) log("\n⚠  DRY RUN — pass --commit to write candidates to the database.");

  if (totalErrors === activeSources.length && activeSources.length > 0) {
    log("\nAll sources failed.");
    process.exit(2);
  }

  process.exit(0);
}

main().catch((err) => {
  log(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
