/**
 * reenrich-market-news.js — one-time backfill to re-run enrichment on rows that
 * were enriched BEFORE the prompt update (#354: richer 2–4 sentence snippet, no
 * "this matters" phrasing). Admin-triggered, batched.
 *
 * GET|POST /api/reenrich-market-news?limit=6   (admin only)
 * GET is allowed so it can be triggered straight from the authed admin browser.
 * Re-enriches up to `limit` already-enriched rows that have not yet been
 * re-enriched (market_news.reenriched_at IS NULL), updating the same fields the
 * hourly cron does, then stamps reenriched_at so the backfill terminates and is
 * idempotent. Call repeatedly until { remaining: 0 }.
 *
 * Reuses enrichOne from enrich-pending-cron.js (same prompt/logic as the cron),
 * so there is no extra prompt copy. Never changes `status` (publishing stays a
 * manual gate). Requires migration 052 (reenriched_at column).
 */
import { createClient } from "@supabase/supabase-js";
import { enrichOne } from "./enrich-pending-cron.js";
import { logEvent } from "./enrich-candidate.js";

const COOKIE_NAME = "admin_session";
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 15;

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const match = (req.headers?.authorization || "").toString().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const match = (req.headers?.cookie || "").toString().match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorizeRequest(req, sb) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (adminError) throw new Error(`Could not verify admin user: ${adminError.message}`);
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  let sb;
  try {
    sb = getSupabase();
  } catch (err) {
    send(res, 500, { error: err.message });
    return;
  }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) {
      send(res, auth.status, { error: auth.error });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      send(res, 500, { error: "OPENAI_API_KEY not configured" });
      return;
    }

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(req.query?.limit) || DEFAULT_LIMIT)
    );

    // Already-enriched rows that have not yet been re-enriched.
    const { data: rows, error } = await sb
      .from("market_news")
      .select("id, title, original_title, snippet, source_name, source_url, category, published_at, language, ingestion_source")
      .not("enriched_at", "is", null)
      .is("reenriched_at", null)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Load failed: ${error.message}`);

    let processed = 0;
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
            reenriched_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) throw new Error(`DB update failed: ${upErr.message}`);
        processed++;
      } catch (err) {
        failed++;
        // Stamp reenriched_at even on failure so a permanently-bad row does not
        // block the backfill; it keeps its previous enriched fields.
        await sb.from("market_news").update({ reenriched_at: new Date().toISOString() }).eq("id", row.id);
        logEvent("reenrich_item_failed", { id: row.id, error: err?.message || String(err) });
      }
    }

    const { count: remaining } = await sb
      .from("market_news")
      .select("id", { count: "exact", head: true })
      .not("enriched_at", "is", null)
      .is("reenriched_at", null);

    send(res, 200, {
      processed,
      failed,
      remaining: remaining ?? null,
      done: (remaining ?? 0) === 0,
      note: "Call again until remaining = 0.",
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
