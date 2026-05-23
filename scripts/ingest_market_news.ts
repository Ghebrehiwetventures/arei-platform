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
 *       affected_regions, relevance_score, enrich_recommendation, enriched_at,
 *       title_pt, snippet_pt, why_it_matters_pt) are written back to the row.
 *       Curator only needs to review and Publish or Archive.
 *
 * Dry-run with --enrich logs which items would be enriched but never calls APIs.
 *
 * Per-source cap: at most MAX_PER_SOURCE new candidates are inserted per
 * source per run. Items beyond the cap are skipped and counted separately.
 *
 * Required env (loaded from repo root .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Required when --enrich is passed:
 *   OPENAI_API_KEY
 *   ANTHROPIC_API_KEY   (optional — PT translation skipped if absent)
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
import { enrichAndTranslate } from "./lib/market-news-enrich";

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

// Returns the inserted row's id, or null if it was a duplicate (23505).
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

async function enrichAndUpdate(
  sb: SupabaseClient,
  id: string,
  row: MarketNewsInsert,
  openaiKey: string,
  anthropicKey: string | null
): Promise<{ ok: boolean; recommendation?: string; ptError?: string; error?: string }> {
  let result;
  try {
    result = await enrichAndTranslate(
      {
        title:            row.title,
        original_title:   row.original_title ?? null,
        snippet:          row.snippet,
        source_name:      row.source_name,
        source_url:       row.source_url,
        category:         row.category,
        published_at:     row.published_at ?? null,
        language:         row.language ?? null,
        ingestion_source: row.ingestion_source ?? null,
      },
      openaiKey,
      anthropicKey
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  const { error: updateError } = await sb
    .from("market_news")
    .update({
      title:                 result.title,
      snippet:               result.snippet,
      why_it_matters:        result.why_it_matters,
      category:              result.category,
      signal_tags:           result.signal_tags,
      affected_regions:      result.affected_regions,
      relevance_score:       result.relevance_score,
      enrich_recommendation: result.enrich_recommendation,
      enriched_at:           new Date().toISOString(),
      title_pt:              result.title_pt,
      snippet_pt:            result.snippet_pt,
      why_it_matters_pt:     result.why_it_matters_pt,
    })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: `DB update failed: ${updateError.message}` };
  }

  return {
    ok: true,
    recommendation: result.enrich_recommendation,
    ptError: result._pt_error,
  };
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
  skippedDup: number;
  skippedCap: number;
  enriched: number;
  enrichFailed: number;
  error: string | null;
}

async function processSource(
  sb: SupabaseClient,
  source: MarketNewsSource,
  existingKeys: Set<string>,
  dryRun: boolean,
  openaiKey: string | null,
  anthropicKey: string | null
): Promise<SourceResult> {
  const result: SourceResult = {
    source,
    fetched: 0,
    inserted: 0,
    skippedDup: 0,
    skippedCap: 0,
    enriched: 0,
    enrichFailed: 0,
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
      if (ENRICH) {
        log(`  [dry-run] would enrich: ${row.title.slice(0, 80)}`);
      }
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

      if (ENRICH && openaiKey && insertedId) {
        const enrichOut = await enrichAndUpdate(sb, insertedId, row, openaiKey, anthropicKey);
        if (enrichOut.ok) {
          result.enriched++;
          if (enrichOut.ptError) {
            log(`  [warn] PT translation failed for "${row.title.slice(0, 60)}": ${enrichOut.ptError}`);
          } else {
            log(`  [enrich] ${enrichOut.recommendation} — ${row.title.slice(0, 70)}`);
          }
        } else {
          result.enrichFailed++;
          log(`  [error] enrich failed for "${row.title.slice(0, 60)}": ${enrichOut.error}`);
        }
      }
    }
  }

  return result;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const started = new Date().toISOString();

  const modeLabel = [
    DRY_RUN ? "DRY RUN — pass --commit to write" : "COMMIT MODE",
    ENRICH   ? "+ ENRICH" : "",
  ].filter(Boolean).join(" ");

  banner(`[ingest-market-news] ${started}  ${DRY_RUN ? "⚠" : "✎"}  ${modeLabel}`);

  const url          = process.env.SUPABASE_URL?.trim();
  const key          = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openaiKey    = process.env.OPENAI_API_KEY?.trim() ?? null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() ?? null;

  if (!url || !key) {
    log("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  if (ENRICH && !openaiKey) {
    log("Error: --enrich requires OPENAI_API_KEY to be set.");
    process.exit(1);
  }

  if (ENRICH && !anthropicKey) {
    log("Warning: ANTHROPIC_API_KEY not set — PT translation will be skipped.");
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

  const activeSources  = MARKET_NEWS_SOURCES.filter((s) => s.active !== false);
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

  const totalFetched      = results.reduce((n, r) => n + r.fetched, 0);
  const totalInserted     = results.reduce((n, r) => n + r.inserted, 0);
  const totalEnriched     = results.reduce((n, r) => n + r.enriched, 0);
  const totalEnrichFailed = results.reduce((n, r) => n + r.enrichFailed, 0);
  const totalDup          = results.reduce((n, r) => n + r.skippedDup, 0);
  const totalCapped       = results.reduce((n, r) => n + r.skippedCap, 0);
  const totalErrors       = results.filter((r) => r.error !== null).length;

  banner("Summary");
  log(`Sources enabled:      ${enabledSources.length}`);
  log(`Sources disabled:     ${disabledSources.length}`);
  log(`Items seen:           ${totalFetched}`);
  log(`Candidates inserted:  ${totalInserted}${DRY_RUN ? " (dry-run, not written)" : ""}`);
  if (ENRICH) {
    log(`Enriched:             ${totalEnriched}${DRY_RUN ? " (dry-run, not written)" : ""}`);
    if (totalEnrichFailed > 0) {
      log(`Enrich failed:        ${totalEnrichFailed}`);
    }
  }
  log(`Skipped (dup/no URL): ${totalDup}`);
  log(`Skipped (cap):        ${totalCapped}`);
  log(`Source errors:        ${totalErrors}`);
  if (DRY_RUN) {
    const enrichHint = !ENRICH ? " Combine with --enrich to also auto-enrich each candidate." : "";
    log(`\n⚠  DRY RUN — pass --commit to write candidates to the database.${enrichHint}`);
  }

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
