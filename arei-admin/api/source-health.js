/**
 * source-health.js — per-source full-text reliability for market news.
 *
 * GET /api/source-health   (admin only)
 * Aggregates market_news.article_body_used by source_name to show which
 * publishers reliably give us the full article vs only a headline/snippet
 * (paywall / bot-block / JS render). This is the signal that later powers
 * "pick the best (open) source per cluster" for enrichment.
 *
 * Read-only; computed on the fly from market_news. (A persisted
 * news_sources.reliability_tier can be derived from this later.)
 */
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
function getBearerToken(req) {
  const m = (req.headers?.authorization || "").toString().match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}
function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const m = (req.headers?.cookie || "").toString().match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(m && m[1] === secret);
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
  const { data: u, error: ue } = await sb.auth.getUser(token);
  if (ue || !u?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: admin, error: ae } = await sb
    .from("admin_users").select("role").eq("user_id", u.user.id).maybeSingle();
  if (ae) throw new Error(`Could not verify admin user: ${ae.message}`);
  if (!admin) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "GET") { send(res, 405, { error: "Method not allowed" }); return; }
  let sb;
  try { sb = getSupabase(); } catch (err) { send(res, 500, { error: err.message }); return; }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) { send(res, auth.status, { error: auth.error }); return; }

    const { data, error } = await sb
      .from("market_news")
      .select("source_name, article_body_used")
      .not("enriched_at", "is", null);
    if (error) throw new Error(`Load failed: ${error.message}`);

    const map = new Map();
    for (const row of data || []) {
      const s = (row.source_name || "(unknown)").trim() || "(unknown)";
      const e = map.get(s) || { source: s, total: 0, full: 0, snippet: 0, unknown: 0 };
      e.total++;
      if (row.article_body_used === true) e.full++;
      else if (row.article_body_used === false) e.snippet++;
      else e.unknown++;
      map.set(s, e);
    }

    const sources = [...map.values()].map((e) => {
      const known = e.full + e.snippet;
      const ratePct = known ? Math.round((e.full / known) * 100) : null;
      const tier = ratePct == null ? "unmeasured"
        : ratePct >= 70 ? "open"
        : ratePct >= 30 ? "mixed"
        : "closed";
      return { ...e, known, ratePct, tier };
    }).sort((a, b) => b.total - a.total);

    const measured = sources.filter((s) => s.ratePct != null);
    send(res, 200, {
      sources,
      summary: {
        sources: sources.length,
        open: measured.filter((s) => s.tier === "open").length,
        mixed: measured.filter((s) => s.tier === "mixed").length,
        closed: measured.filter((s) => s.tier === "closed").length,
        unmeasured: sources.length - measured.length,
      },
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
