/**
 * One-time backfill: re-fetch Google News RSS feeds and update source_name
 * for existing rows that still carry a "Google News — …" feed-level name.
 *
 * When a Google News RSS item has a <source> element (e.g. "Le Monde",
 * "Reuters"), that is the real publisher name. PR #226 fixed new ingestions,
 * but rows already in the database were never updated. This script does that.
 *
 * DEFAULT BEHAVIOUR: dry-run. Nothing is written unless --commit is passed.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill_market_news_source_names.ts
 *   npx ts-node --transpile-only scripts/backfill_market_news_source_names.ts --commit
 *
 * Required env (loaded from repo root .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MARKET_NEWS_SOURCES } from "./lib/market-news-sources";
import { parseFeedItems } from "./lib/market-news-transform";
import { normalizeUrl } from "./lib/market-news-dedup";

for (const p of [
  path.resolve(__dirname, "../.env"),
  "/Users/ghebrehiwet/arei-platform-clean/.env",
]) {
  dotenv.config({ path: p });
}

const COMMIT = process.argv.includes("--commit");
const DRY_RUN = !COMMIT;
const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "AREI-MarketNewsBot/1.0 (+https://capeverderealestateindex.com)";

function log(msg: string) { process.stdout.write(msg + "\n"); }
function banner(msg: string) { log("\n" + "─".repeat(60) + "\n" + msg + "\n" + "─".repeat(60)); }

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  banner(`[backfill-source-names] ${new Date().toISOString()}${DRY_RUN ? "  ⚠  DRY RUN" : "  ✎  COMMIT"}`);

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) { log("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."); process.exit(1); }

  const sb: SupabaseClient = createClient(url, key);

  const googleNewsSources = MARKET_NEWS_SOURCES.filter(
    (s) => s.type === "google_news_rss" && s.active !== false
  );

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const source of googleNewsSources) {
    log(`\nSource: ${source.name} [${source.id}]`);

    let xml: string;
    try {
      xml = await fetchFeed(source.url);
    } catch (err) {
      log(`  Error fetching: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const items = parseFeedItems(xml);
    log(`  Fetched ${items.length} items from feed`);

    let sourceUpdated = 0;
    let sourceSkipped = 0;

    for (const raw of items) {
      if (!raw.sourceAttrib) { sourceSkipped++; continue; }

      const rawUrl = raw.link || (raw.guid.startsWith("http") ? raw.guid : "");
      if (!rawUrl) { sourceSkipped++; continue; }

      const canonical = normalizeUrl(rawUrl);

      // Try canonical_url first, fall back to source_url
      const candidates = [
        { col: "canonical_url", val: canonical },
        { col: "source_url",    val: rawUrl },
      ];

      let matched = false;
      for (const { col, val } of candidates) {
        if (DRY_RUN) {
          const { data } = await sb
            .from("market_news")
            .select("id, source_name")
            .eq(col, val)
            .maybeSingle();

          if (!data || !data.source_name?.startsWith("Google News")) continue;

          log(`  [dry-run] would update: "${data.source_name}" → "${raw.sourceAttrib}"`);
          sourceUpdated++;
          matched = true;
          break;
        } else {
          const { data, error } = await sb
            .from("market_news")
            .update({ source_name: raw.sourceAttrib })
            .eq(col, val)
            .like("source_name", "Google News%")
            .select("id");

          if (error) { log(`  [error] ${error.message}`); continue; }

          const count = data?.length ?? 0;
          if (count > 0) {
            log(`  updated: "${raw.sourceAttrib}" (${count} row)`);
            sourceUpdated += count;
            matched = true;
            break;
          }
        }
      }

      if (!matched) sourceSkipped++;
    }

    log(`  Updated: ${sourceUpdated}  Skipped: ${sourceSkipped}`);
    totalUpdated += sourceUpdated;
    totalSkipped += sourceSkipped;
  }

  banner("Summary");
  log(`Updated: ${totalUpdated}${DRY_RUN ? " (dry-run)" : ""}`);
  log(`Skipped: ${totalSkipped}`);
  if (DRY_RUN) log("\n⚠  DRY RUN — pass --commit to write.");
}

main().catch((err) => {
  log(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
