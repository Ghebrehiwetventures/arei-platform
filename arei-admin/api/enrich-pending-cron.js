/**
 * enrich-pending-cron.js — auto-enrich pending market_news candidates.
 *
 * Runs in Vercel (where OPENAI_API_KEY / SUPABASE_SERVICE_ROLE_KEY already
 * live), so enrichment is fully automatic without any GitHub Actions secret.
 * Reuses the exact suggestion logic from enrich-candidate.js, then PERSISTS
 * the result to market_news (the interactive endpoint only returns a
 * suggestion). Never changes `status` — publishing stays a manual gate.
 *
 * Triggered by a Vercel cron (see vercel.json). Processes a small batch per
 * run to stay within the function budget; the cron cadence drains the backlog.
 */
import { createClient } from "@supabase/supabase-js";
import {
  SYSTEM_PROMPT,
  buildUserMessage,
  validateSuggestion,
  normalizeSuggestion,
  resolvePublisherUrl,
  fetchArticleBody,
  logEvent,
} from "./enrich-candidate.js";

const BATCH = Number(process.env.ENRICH_CRON_BATCH || 5);

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Compute the enrichment suggestion for one row (mirrors enrich-candidate.js).
async function enrichOne(row, apiKey) {
  let articleBody = null;
  let resolvedUrl = row.source_url || null;
  if (row.source_url) {
    const resolution = await resolvePublisherUrl(row.source_url);
    resolvedUrl = resolution.url || row.source_url;
    articleBody = await fetchArticleBody(resolvedUrl);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
  const suggestion = JSON.parse(content);

  const validationError = validateSuggestion(suggestion);
  if (validationError) throw new Error(`Validation failed: ${validationError}`);
  suggestion.relevance_score = Math.round(Number(suggestion.relevance_score));
  normalizeSuggestion(suggestion);
  return suggestion;
}

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "CRON_SECRET not set" }));
    return;
  }
  // Vercel sets Authorization: Bearer <CRON_SECRET> on cron calls.
  if ((req.headers?.authorization || "") !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "OPENAI_API_KEY not configured" }));
    return;
  }

  try {
    const sb = getSupabase();
    const { data: rows, error } = await sb
      .from("market_news")
      .select("id, title, original_title, snippet, source_name, source_url, category, published_at, language, ingestion_source")
      .eq("status", "candidate")
      .is("enriched_at", null)
      .order("published_at", { ascending: false })
      .limit(BATCH);
    if (error) throw new Error(`Load failed: ${error.message}`);

    let enriched = 0;
    let failed = 0;
    for (const row of rows || []) {
      try {
        const s = await enrichOne(row, apiKey);
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
          })
          .eq("id", row.id);
        if (upErr) throw new Error(`DB update failed: ${upErr.message}`);
        enriched++;
      } catch (err) {
        failed++;
        logEvent("enrich_cron_item_failed", { id: row.id, error: err?.message || String(err) });
      }
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ scanned: rows?.length || 0, enriched, failed }));
  } catch (err) {
    console.error("[enrich-pending-cron] error:", err?.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
