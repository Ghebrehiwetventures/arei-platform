/**
 * richer-sibling.js — find a richer open source for the same story (Väg A).
 *
 * GET /api/richer-sibling?id=<market_news_id>   (admin only)
 *
 * If the given market_news item is thin (snippet-only) but its story cluster
 * contains a sibling article from an OPEN source that got the full article,
 * returns that sibling (in MarketNewsItem shape) so the News Post Studio can
 * switch to it. Text always follows the source that is actually used —
 * attribution stays correct because the Studio rebuilds the whole form (incl.
 * the "Source:" caption line) from the returned sibling.
 *
 * Returns { current, sibling, sourceCount }. sibling is null when the item is
 * already rich, not clustered, or has no richer sibling. Requires migration 054
 * + a clustering run.
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

// Map a market_news row to the MarketNewsItem shape the Studio's selectItem uses.
function toItem(row) {
  return {
    id: String(row.id),
    sourceTitle: row.title || "",
    sourceName: row.source_name || "",
    sourceUrl: row.source_url || "",
    country: row.country_code || "CV",
    region: Array.isArray(row.affected_regions) && row.affected_regions[0] ? row.affected_regions[0] : "",
    category: row.category || "",
    tags: Array.isArray(row.signal_tags) ? row.signal_tags : [],
    whatHappened: row.snippet || "",
    whyItMatters: row.why_it_matters || "",
    status: row.status || "",
    reviewStatus: "",
    publishedAt: row.published_at || "",
    articleBodyUsed: typeof row.article_body_used === "boolean" ? row.article_body_used : null,
  };
}
const richness = (row) =>
  (row.article_body_used === true ? 1000 : 0) + (row.snippet ? row.snippet.length : 0);

export default async function handler(req, res) {
  if (req.method !== "GET") { send(res, 405, { error: "Method not allowed" }); return; }
  let sb;
  try { sb = getSupabase(); } catch (err) { send(res, 500, { error: err.message }); return; }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) { send(res, auth.status, { error: auth.error }); return; }

    const id = String(req.query?.id || "").trim();
    if (!id) { send(res, 400, { error: "id is required" }); return; }

    // Current row (to know its richness).
    const { data: cur } = await sb
      .from("market_news")
      .select("id, snippet, article_body_used")
      .eq("id", id)
      .maybeSingle();
    const currentRich = cur ? cur.article_body_used === true : false;

    const empty = { current: { articleBodyUsed: cur?.article_body_used ?? null }, sibling: null, sourceCount: 0 };
    // Already rich → no need for a sibling.
    if (currentRich) { send(res, 200, empty); return; }

    // market_news id → news_articles.id
    const { data: art } = await sb
      .from("news_articles").select("id").eq("raw_feed_meta->>market_news_id", id).maybeSingle();
    if (!art) { send(res, 200, empty); return; }

    // article → cluster
    const { data: link } = await sb
      .from("news_article_cluster_links").select("cluster_id").eq("article_id", art.id).limit(1).maybeSingle();
    if (!link) { send(res, 200, empty); return; }

    // cluster → all article ids
    const { data: links } = await sb
      .from("news_article_cluster_links").select("article_id").eq("cluster_id", link.cluster_id);
    const articleIds = (links || []).map((l) => l.article_id);
    if (articleIds.length < 2) { send(res, 200, { ...empty, sourceCount: articleIds.length }); return; }

    // article ids → their market_news ids
    const { data: arts } = await sb
      .from("news_articles").select("id, raw_feed_meta").in("id", articleIds);
    const siblingMnIds = (arts || [])
      .map((a) => a?.raw_feed_meta?.market_news_id)
      .filter((mid) => mid && String(mid) !== id)
      .map(String);
    if (!siblingMnIds.length) { send(res, 200, { ...empty, sourceCount: articleIds.length }); return; }

    // sibling market_news rows
    const { data: sibs } = await sb
      .from("market_news")
      .select("id, title, snippet, source_name, source_url, why_it_matters, category, country_code, affected_regions, signal_tags, published_at, status, article_body_used")
      .in("id", siblingMnIds);

    // Pick the richest sibling that is genuinely richer than the current item.
    const candidates = (sibs || [])
      .filter((s) => s.article_body_used === true) // open source got full text
      .sort((a, b) => richness(b) - richness(a));
    const best = candidates[0] || null;

    send(res, 200, {
      current: { articleBodyUsed: cur?.article_body_used ?? null },
      sibling: best ? toItem(best) : null,
      sourceCount: articleIds.length,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
