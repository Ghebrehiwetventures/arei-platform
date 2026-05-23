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
 *   npx ts-node --transpile-only scripts/ingest_market_news.ts --commit --enrich
 *     → inserts candidates AND runs EN enrichment + PT translation via AI.
 *       Enriched fields (title, snippet, why_it_matters, category, signal_tags,
 *       affected_regions, title_pt, snippet_pt, why_it_matters_pt) are written
 *       back to the candidate row. Curator only needs to Publish or Archive.
 *       Requires OPENAI_API_KEY and ANTHROPIC_API_KEY in .env.
 *
 * Per-source cap: at most MAX_PER_SOURCE new candidates are inserted per
 * source per run. Items beyond the cap are skipped and counted separately.
 *
 * Required env (loaded from repo root .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY      (required when --enrich is passed)
 *   ANTHROPIC_API_KEY   (required when --enrich is passed)
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
import { insertAdminNotification } from "./lib/notifications";
import { enrichCandidate, translateToPt } from "./lib/market-news-enrich";

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
// --enrich: after each insert, run EN enrichment (OpenAI) + PT translation (Anthropic).
const ENRICH = process.argv.includes("--enrich");
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
): Promise<string | null> {
  const { data, error } = await sb
    .from("market_news")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    // Unique constraint violation means a concurrent run beat us to it — safe to ignore.
    if (error.code === "23505") return null;
    throw new Error(error.message);
  }
  return (data as { id: string } | null)?.id ?? null;
}

// ── Admin notification emit ────────────────────────────────────────────────

async function emitMarketNewsNotifications(
  sb: SupabaseClient,
  results: SourceResult[],
  totalInserted: number
): Promise<void> {
  const errorResults = results.filter((r) => r.error !== null);

  // One summary notification per run
  await insertAdminNotification(sb, {
    event_type: "market_news.candidates_imported",
    severity:   errorResults.length > 0 ? "warning" : "info",
    title:      `${totalInserted} new Market News candidate${totalInserted !== 1 ? "s" : ""} imported`,
    body:
      `${results.length} source${results.length !== 1 ? "s" : ""} checked.` +
      (errorResults.length > 0 ? ` ${errorResults.length} had errors.` : ""),
    meta: {
      sources_run: results.length,
      inserted:    totalInserted,
      source_breakdown: results.map((r) => ({
        id:       r.source.id,
        name:     r.source.name,
        inserted: r.inserted,
        error:    r.error ?? null,
      })),
    },
  });

  // One warning notification per errored source
  for (const r of errorResults) {
    await insertAdminNotification(sb, {
      event_type:  "market_news.source_error",
      severity:    "warning",
      title:       `Ingestion error: ${r.source.name}`,
      body:        r.error,
      entity_type: "source",
      entity_id:   r.source.id,
      meta:        { source_id: r.source.id, source_name: r.source.name },
    });
  }
}

// ── Per-source result ──────────────────────────────────────────────────────

interface SourceResult {
  source: MarketNewsSource;
  fetched: number;
  inserted: number;
  enriched: number;
  skippedDup: number;
  skippedCap: number;
  error: string | null;
}

async function processSource(
  sb: SupabaseClient,
  source: MarketNewsSource,
  existingKeys: Set<string>,
  dryRun: boolean,
  openaiKey: string | null,
  anthropicKey: string | null,
): Promise<SourceResult> {
  const result: SourceResult = {
    source,
    fetched: 0,
    inserted: 0,
    enriched: 0,
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
      let insertedId: string | null = null;
      try {
        insertedId = await insertCandidate(sb, row);
        if (insertedId === null) {
          // Concurrent insert beat us (unique constraint) — treat as dup
          result.skippedDup++;
          continue;
        }
        existingKeys.add(row.canonical_url);
        existingKeys.add(row.source_url);
        result.inserted++;
      } catch (err) {
        log(`  [error] insert failed: ${err instanceof Error ? err.message : String(err)}`);
        result.skippedDup++;
        continue;
      }

      // ── Auto-enrich ─────────────────────────────────────────────────────
      if (ENRICH && openaiKey && anthropicKey && insertedId) {
        try {
          const enrichInput = {
            title:            row.title,
            original_title:   row.original_title ?? null,
            snippet:          row.snippet ?? "",
            source_name:      row.source_name,
            source_url:       row.source_url,
            category:         row.category ?? "Economy",
            published_at:     row.published_at ?? null,
            language:         row.language ?? null,
            ingestion_source: row.ingestion_source ?? null,
          };
          const enriched = await enrichCandidate(enrichInput, openaiKey);

          // Only write columns that exist in the schema.
          // relevance_score and recommendation are AI hints — not stored in DB.
          const update: Record<string, unknown> = {
            title:            enriched.title,
            snippet:          enriched.snippet,
            why_it_matters:   enriched.why_it_matters,
            category:         enriched.category,
            signal_tags:      enriched.signal_tags,
            affected_regions: enriched.affected_regions,
          };

          // PT translation — skip for archive-recommended items
          if (enriched.recommendation !== "archive" && anthropicKey) {
            try {
              const pt = await translateToPt(
                { title: enriched.title, snippet: enriched.snippet, why_it_matters: enriched.why_it_matters },
                anthropicKey,
              );
              update.title_pt          = pt.title_pt;
              update.snippet_pt        = pt.snippet_pt;
              update.why_it_matters_pt = pt.why_it_matters_pt;
            } catch (ptErr) {
              log(`  [warn] PT translation failed for "${enriched.title.slice(0, 60)}": ${ptErr instanceof Error ? ptErr.message : String(ptErr)}`);
            }
          }

          const { error: updateErr } = await sb
            .from("market_news")
            .update(update)
            .eq("id", insertedId);

          if (updateErr) {
            log(`  [warn] Enrich update failed for id=${insertedId}: ${updateErr.message}`);
          } else {
            result.enriched++;
          }
        } catch (enrichErr) {
          log(`  [warn] Enrichment failed for "${row.title.slice(0, 60)}": ${enrichErr instanceof Error ? enrichErr.message : String(enrichErr)}`);
        }
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

  const url         = process.env.SUPABASE_URL?.trim();
  const key         = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openaiKey   = process.env.OPENAI_API_KEY?.trim() ?? null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() ?? null;

  if (!url || !key) {
    log("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  if (ENRICH && (!openaiKey || !anthropicKey)) {
    log("Error: --enrich requires OPENAI_API_KEY and ANTHROPIC_API_KEY to be set.");
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
  const enabledSources = activeSources.filter((s) => s.enabled !== false);
  const disabledSources = activeSources.filter((s) => s.enabled === false);

  if (disabledSources.length > 0) {
    log(`\nSkipping ${disabledSources.length} disabled source(s):`);
    for (const s of disabledSources) {
      log(`  [disabled] ${s.name} [${s.id}]`);
    }
  }

  const results: SourceResult[] = [];

  for (const source of enabledSources) {
    log(`\nSource: ${source.name} [${source.id}]`);
    log(`  URL: ${source.url.slice(0, 90)}…`);

    const result = await processSource(sb, source, existingKeys, DRY_RUN, openaiKey, anthropicKey);
    results.push(result);

    if (result.error) {
      log(`  Error: ${result.error}`);
    } else {
      log(`  Fetched:  ${result.fetched} items`);
      log(`  Inserted: ${result.inserted} candidates${result.inserted >= MAX_PER_SOURCE ? ` (cap: ${MAX_PER_SOURCE})` : ""}`);
      if (ENRICH && !DRY_RUN) {
        log(`  Enriched: ${result.enriched} / ${result.inserted}`);
      }
      log(`  Skipped:  ${result.skippedDup} duplicates / no URL`);
      if (result.skippedCap > 0) {
        log(`  Capped:   ${result.skippedCap} items beyond per-source limit of ${MAX_PER_SOURCE}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const totalFetched  = results.reduce((n, r) => n + r.fetched, 0);
  const totalInserted = results.reduce((n, r) => n + r.inserted, 0);
  const totalEnriched = results.reduce((n, r) => n + r.enriched, 0);
  const totalDup      = results.reduce((n, r) => n + r.skippedDup, 0);
  const totalCapped   = results.reduce((n, r) => n + r.skippedCap, 0);
  const totalErrors   = results.filter((r) => r.error !== null).length;

  banner("Summary");
  log(`Sources enabled:      ${enabledSources.length}`);
  log(`Sources disabled:     ${disabledSources.length}`);
  log(`Items seen:           ${totalFetched}`);
  log(`Candidates inserted:  ${totalInserted}${DRY_RUN ? " (dry-run, not written)" : ""}`);
  if (ENRICH && !DRY_RUN) {
    log(`Enriched:             ${totalEnriched} / ${totalInserted}`);
  }
  log(`Skipped (dup/no URL): ${totalDup}`);
  log(`Skipped (cap):        ${totalCapped}`);
  log(`Source errors:        ${totalErrors}`);
  if (DRY_RUN) log("\n⚠  DRY RUN — pass --commit to write candidates to the database.");

  if (totalErrors === enabledSources.length && enabledSources.length > 0) {
    log("\nAll sources failed.");
    process.exit(2);
  }

  // Emit admin notifications (commit mode only — dry-run never writes)
  if (!DRY_RUN) {
    try {
      await emitMarketNewsNotifications(sb, results, totalInserted);
      log("\nNotifications emitted.");
    } catch (err) {
      // Non-fatal: notification failure must not fail the ingestion run
      log(`[warn] Notification emit error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  log(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
