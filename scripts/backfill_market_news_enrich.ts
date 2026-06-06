/**
 * Backfill enrichment for market_news candidates — using the SAME logic as the
 * admin "Re-enrich" button (arei-admin/api/enrich-candidate.js): Cape-Verde
 * fact extraction + CV-angled rewrite + PT translation. (The older
 * scripts/lib/market-news-enrich.ts copy produced generic "Africa" titles.)
 *
 * Persists the result to market_news. Never changes `status` — publishing
 * stays a manual gate.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/backfill_market_news_enrich.ts            # dry-run
 *   npx ts-node --transpile-only scripts/backfill_market_news_enrich.ts --commit   # write
 *
 * Flags:
 *   --commit          actually call the APIs and write (default: dry-run)
 *   --force           re-enrich even rows already enriched (to upgrade old ones)
 *   --limit=N         max rows (default: 100)
 *   --status=S        candidate (default) | all
 *   --delay=MS        pause between rows (default: 1200)
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (required when
 *      --commit); ANTHROPIC_API_KEY (optional — PT skipped if absent).
 */
import { createClient } from "@supabase/supabase-js";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  validateSuggestion,
  normalizeSuggestion,
  resolvePublisherUrl,
  fetchArticleBody,
  translateToPt,
} from "../arei-admin/api/enrich-candidate.js";

const COMMIT = process.argv.includes("--commit");
const FORCE = process.argv.includes("--force");
const argVal = (name: string, def: string) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=")[1] : def;
};
const LIMIT = parseInt(argVal("limit", "100"), 10);
const STATUS = argVal("status", "candidate");
const DELAY = parseInt(argVal("delay", "1200"), 10);

const log = (...a: unknown[]) => console.log(...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Compute the enrichment suggestion for one row (mirrors enrich-candidate.js).
async function enrichOne(row: any, openaiKey: string, anthropicKey: string | null) {
  let articleBody: string | null = null;
  let resolvedUrl = row.source_url || null;
  if (row.source_url) {
    const resolution = await resolvePublisherUrl(row.source_url);
    resolvedUrl = resolution.url || row.source_url;
    articleBody = await fetchArticleBody(resolvedUrl);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(row, articleBody) },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${(await response.text().catch(() => "")).slice(0, 200)}`);
  }
  const ai = await response.json();
  const content = ai?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI content");
  const s: any = JSON.parse(content);
  const validationError = validateSuggestion(s);
  if (validationError) throw new Error(`Validation failed: ${validationError}`);
  s.relevance_score = Math.round(Number(s.relevance_score));
  normalizeSuggestion(s);

  // PT translation (non-fatal, skipped for archive or without a key)
  if (anthropicKey && s.recommendation !== "archive") {
    try {
      const pt = await translateToPt(anthropicKey, {
        title: s.title,
        snippet: s.snippet,
        why_it_matters: s.why_it_matters ?? null,
      });
      s.title_pt = pt.title_pt;
      s.snippet_pt = pt.snippet_pt;
      s.why_it_matters_pt = pt.why_it_matters_pt;
    } catch (err) {
      s._pt_error = err instanceof Error ? err.message : String(err);
    }
  }
  return s;
}

async function main() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
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
  if (COMMIT && !anthropicKey) log("Warning: ANTHROPIC_API_KEY not set — PT translation will be skipped.");

  const sb = createClient(url, key);

  let query = sb
    .from("market_news")
    .select("id, title, original_title, snippet, source_name, source_url, category, published_at, language, ingestion_source, enriched_at")
    .order("published_at", { ascending: false })
    .limit(LIMIT);
  if (STATUS !== "all") query = query.eq("status", STATUS);
  if (!FORCE) query = query.is("enriched_at", null);

  const { data: rows, error } = await query;
  if (error) { log(`Error loading: ${error.message}`); process.exit(1); }
  if (!rows || rows.length === 0) { log("Nothing to backfill."); return; }

  log(`${COMMIT ? "ENRICHING" : "DRY-RUN"}${FORCE ? " (--force, re-enriching)" : ""} — ${rows.length} row(s).`);
  if (!COMMIT) {
    rows.forEach((r, i) => log(`  ${String(i + 1).padStart(3)}. ${r.title}${r.enriched_at ? "  [already enriched]" : ""}`));
    log("\nRe-run with --commit to enrich and write.");
    return;
  }

  let enriched = 0, failed = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = `[${i + 1}/${rows.length}]`;
    try {
      const s = await enrichOne(r, openaiKey as string, anthropicKey);
      const { error: upErr } = await sb
        .from("market_news")
        .update({
          title: s.title,
          snippet: s.snippet,
          why_it_matters: s.why_it_matters ?? null,
          category: s.category,
          signal_tags: Array.isArray(s.signal_tags) ? s.signal_tags : [],
          affected_regions: Array.isArray(s.affected_regions) ? s.affected_regions : [],
          relevance_score: s.relevance_score,
          enrich_recommendation: s.recommendation,
          enriched_at: new Date().toISOString(),
          title_pt: s.title_pt ?? null,
          snippet_pt: s.snippet_pt ?? null,
          why_it_matters_pt: s.why_it_matters_pt ?? null,
        })
        .eq("id", r.id);
      if (upErr) throw new Error(`DB update failed: ${upErr.message}`);
      enriched++;
      log(`${tag} ✓ rel=${s.relevance_score} (${s.recommendation})  ${s.title}${s._pt_error ? `  [PT: ${s._pt_error}]` : ""}`);
    } catch (err) {
      failed++;
      log(`${tag} ✗ ${err instanceof Error ? err.message : String(err)}  — "${r.title}"`);
    }
    if (i < rows.length - 1) await sleep(DELAY);
  }
  log(`\nDone. Enriched ${enriched}, failed ${failed}, of ${rows.length}.`);
}

main().catch((e) => { log("Fatal:", e instanceof Error ? e.message : String(e)); process.exit(1); });
