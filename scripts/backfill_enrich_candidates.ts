/**
 * Backfill enrichment for existing market_news candidates that were ingested
 * before the --enrich flag existed (i.e. enriched_at IS NULL).
 *
 * DEFAULT BEHAVIOUR: dry-run. Pass --commit to actually write to the database.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill_enrich_candidates.ts
 *     → dry-run: lists unenriched candidates, no API calls
 *
 *   npx ts-node --transpile-only scripts/backfill_enrich_candidates.ts --commit
 *     → enriches each candidate via OpenAI + Anthropic and writes results back
 *
 * Required env (loaded from repo root .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *   ANTHROPIC_API_KEY   (optional — PT translation skipped if absent)
 *
 * Exit codes:
 *   0  success (or dry-run completed)
 *   1  missing required env vars
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { enrichAndTranslate, EnrichInput } from "./lib/market-news-enrich";

for (const p of [
  path.resolve(__dirname, "../.env"),
  "/Users/ghebrehiwet/arei-platform-clean/.env",
]) {
  dotenv.config({ path: p });
}

const COMMIT = process.argv.includes("--commit");
const DRY_RUN = !COMMIT;

function log(msg: string) { process.stdout.write(msg + "\n"); }
function banner(msg: string) {
  log("\n" + "─".repeat(60));
  log(msg);
  log("─".repeat(60));
}

async function main() {
  const sbUrl  = process.env.SUPABASE_URL;
  const sbKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? null;

  if (!sbUrl || !sbKey) {
    log("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }
  if (!COMMIT) {
    log("[dry-run] Pass --commit to write enrichment results to the database.");
    log("[dry-run] No API calls will be made.");
  }
  if (COMMIT && !openaiKey) {
    log("ERROR: OPENAI_API_KEY is required when --commit is passed.");
    process.exit(1);
  }
  if (COMMIT && !anthropicKey) {
    log("WARNING: ANTHROPIC_API_KEY not set — PT translation will be skipped.");
  }

  const sb = createClient(sbUrl, sbKey);

  banner("Fetching unenriched candidates…");

  const { data: rows, error } = await sb
    .from("market_news")
    .select("id,title,original_title,snippet,source_name,source_url,category,published_at,language,ingestion_source")
    .eq("status", "candidate")
    .is("enriched_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    log(`ERROR fetching candidates: ${error.message}`);
    process.exit(1);
  }

  const candidates = rows ?? [];
  log(`Found ${candidates.length} unenriched candidate(s).`);

  if (candidates.length === 0) {
    log("Nothing to do.");
    process.exit(0);
  }

  if (DRY_RUN) {
    for (const r of candidates) {
      log(`  [dry-run] would enrich: ${r.id.slice(0, 8)}… "${r.title.slice(0, 60)}"`);
    }
    log(`\n[dry-run] ${candidates.length} candidate(s) would be enriched. Pass --commit to proceed.`);
    process.exit(0);
  }

  banner(`Enriching ${candidates.length} candidate(s)…`);

  let enriched = 0;
  let failed   = 0;

  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    const prefix = `[${i + 1}/${candidates.length}]`;
    log(`${prefix} Enriching "${r.title.slice(0, 60)}"…`);

    const input: EnrichInput = {
      title:            r.title,
      original_title:   r.original_title ?? null,
      snippet:          r.snippet,
      source_name:      r.source_name,
      source_url:       r.source_url,
      category:         r.category,
      published_at:     r.published_at ?? null,
      language:         r.language ?? null,
      ingestion_source: r.ingestion_source ?? null,
    };

    try {
      const result = await enrichAndTranslate(input, openaiKey!, anthropicKey);

      const update: Record<string, unknown> = {
        title:                result.title,
        snippet:              result.snippet,
        why_it_matters:       result.why_it_matters,
        category:             result.category,
        signal_tags:          result.signal_tags,
        affected_regions:     result.affected_regions,
        relevance_score:      result.relevance_score,
        enrich_recommendation: result.enrich_recommendation,
        enriched_at:          new Date().toISOString(),
        title_pt:             result.title_pt,
        snippet_pt:           result.snippet_pt,
        why_it_matters_pt:    result.why_it_matters_pt,
      };

      const { error: updateErr } = await sb
        .from("market_news")
        .update(update)
        .eq("id", r.id);

      if (updateErr) {
        log(`  ERROR updating row: ${updateErr.message}`);
        failed++;
      } else {
        const score = result.relevance_score;
        const rec   = result.enrich_recommendation;
        const ptNote = result._pt_error ? ` (PT failed: ${result._pt_error.slice(0, 60)})` : "";
        log(`  OK score=${score} rec=${rec}${ptNote}`);
        enriched++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  FAILED: ${msg.slice(0, 120)}`);
      failed++;
    }

    // Small delay between API calls to avoid rate limiting
    if (i < candidates.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  banner("Done");
  log(`Enriched : ${enriched}`);
  log(`Failed   : ${failed}`);
  log(`Total    : ${candidates.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
