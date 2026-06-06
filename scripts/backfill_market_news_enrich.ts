/**
 * Backfill enrichment for existing market_news candidates.
 *
 * One-time companion to the ingest --enrich path: enriches rows that were
 * inserted before auto-enrich was enabled (enriched_at IS NULL). Rewrites
 * title / snippet / why_it_matters + category / signal_tags / affected_regions
 * + relevance_score / enrich_recommendation + PT translation. Never changes
 * `status` — publishing stays a manual human gate.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill_market_news_enrich.ts
 *     → dry-run: lists candidates that WOULD be enriched (no API calls)
 *
 *   npx ts-node --transpile-only scripts/backfill_market_news_enrich.ts --commit
 *     → enriches and writes (sequential, gentle on the APIs)
 *
 * Flags:
 *   --commit          actually call the APIs and write (default: dry-run)
 *   --limit=N         max rows to process (default: 100)
 *   --status=S        which status to backfill (default: candidate; use "all" for any)
 *   --delay=MS        pause between rows (default: 1200)
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (required)
 *   OPENAI_API_KEY                            (required when --commit)
 *   ANTHROPIC_API_KEY                         (optional — PT translation skipped if absent)
 */
import { createClient } from "@supabase/supabase-js";
import { enrichAndTranslate } from "./lib/market-news-enrich";

const COMMIT = process.argv.includes("--commit");
const argVal = (name: string, def: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};
const LIMIT = parseInt(argVal("limit", "100"), 10);
const STATUS = argVal("status", "candidate");
const DELAY = parseInt(argVal("delay", "1200"), 10);

const log = (...a: unknown[]) => console.log(...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim() ?? null;
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim() ?? null;

  if (!url || !key) {
    log("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }
  if (COMMIT && !openaiKey) {
    log("Error: --commit requires OPENAI_API_KEY to be set.");
    process.exit(1);
  }
  if (COMMIT && !anthropicKey) {
    log("Warning: ANTHROPIC_API_KEY not set — PT translation will be skipped.");
  }

  const sb = createClient(url, key);

  let query = sb
    .from("market_news")
    .select("id, title, original_title, snippet, source_name, source_url, category, published_at, language, ingestion_source")
    .is("enriched_at", null)
    .order("published_at", { ascending: false })
    .limit(LIMIT);
  if (STATUS !== "all") query = query.eq("status", STATUS);

  const { data: rows, error } = await query;
  if (error) {
    log(`Error loading candidates: ${error.message}`);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    log("Nothing to backfill — no un-enriched rows match.");
    return;
  }

  log(`${COMMIT ? "ENRICHING" : "DRY-RUN"} — ${rows.length} un-enriched ${STATUS === "all" ? "" : STATUS + " "}row(s) (limit ${LIMIT}).`);
  if (!COMMIT) {
    rows.forEach((r, i) => log(`  ${String(i + 1).padStart(3)}. ${r.title}`));
    log("\nRe-run with --commit to enrich and write.");
    return;
  }

  let enriched = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = `[${i + 1}/${rows.length}]`;
    try {
      const result = await enrichAndTranslate(
        {
          title: r.title,
          original_title: r.original_title ?? null,
          snippet: r.snippet,
          source_name: r.source_name,
          source_url: r.source_url,
          category: r.category,
          published_at: r.published_at ?? null,
          language: r.language ?? null,
          ingestion_source: r.ingestion_source ?? null,
        },
        openaiKey as string,
        anthropicKey
      );

      const { error: updateError } = await sb
        .from("market_news")
        .update({
          title: result.title,
          snippet: result.snippet,
          why_it_matters: result.why_it_matters,
          category: result.category,
          signal_tags: result.signal_tags,
          affected_regions: result.affected_regions,
          relevance_score: result.relevance_score,
          enrich_recommendation: result.enrich_recommendation,
          enriched_at: new Date().toISOString(),
          title_pt: result.title_pt,
          snippet_pt: result.snippet_pt,
          why_it_matters_pt: result.why_it_matters_pt,
        })
        .eq("id", r.id);

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);
      enriched++;
      log(`${tag} ✓ rel=${result.relevance_score} (${result.enrich_recommendation})  ${result.title}${result._pt_error ? `  [PT: ${result._pt_error}]` : ""}`);
    } catch (err) {
      failed++;
      log(`${tag} ✗ ${err instanceof Error ? err.message : String(err)}  — "${r.title}"`);
    }
    if (i < rows.length - 1) await sleep(DELAY);
  }

  log(`\nDone. Enriched ${enriched}, failed ${failed}, of ${rows.length}.`);
}

main().catch((e) => {
  log("Fatal:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
