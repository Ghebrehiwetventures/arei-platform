/**
 * news-clusters.js — read the news story clusters for the admin review UI
 * (Stage 3b of the cluster architecture, #322).
 *
 * GET /api/news-clusters   (admin only)
 * Returns clusters (newest / most-sourced first) with their member articles,
 * so the admin can see "N sources report the same story". Read-only; merge/
 * split/publish actions come later. Requires migration 054.
 */
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";
const CLUSTER_LIMIT = 200;

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

    const { data: clusters, error: ce } = await sb
      .from("news_story_clusters")
      .select("id, cluster_title, country_code, topics, entities, status, source_count, first_published_at, latest_published_at, cluster_confidence")
      .order("source_count", { ascending: false })
      .order("latest_published_at", { ascending: false })
      .limit(CLUSTER_LIMIT);
    if (ce) throw new Error(`Load clusters failed: ${ce.message}`);

    const clusterIds = (clusters || []).map((c) => c.id);
    let links = [];
    let articles = [];
    if (clusterIds.length) {
      const { data: ld, error: le } = await sb
        .from("news_article_cluster_links")
        .select("cluster_id, article_id, match_method, match_score, is_primary_source")
        .in("cluster_id", clusterIds);
      if (le) throw new Error(`Load links failed: ${le.message}`);
      links = ld || [];

      const articleIds = Array.from(new Set(links.map((l) => l.article_id)));
      if (articleIds.length) {
        const { data: ad, error: ae } = await sb
          .from("news_articles")
          .select("id, title, source_name, source_url, published_at")
          .in("id", articleIds);
        if (ae) throw new Error(`Load articles failed: ${ae.message}`);
        articles = ad || [];
      }
    }

    const articleById = new Map(articles.map((a) => [a.id, a]));
    const membersByCluster = new Map();
    for (const l of links) {
      const a = articleById.get(l.article_id) || {};
      const list = membersByCluster.get(l.cluster_id) || [];
      list.push({
        articleId: l.article_id,
        title: a.title || "(untitled)",
        sourceName: a.source_name || "",
        sourceUrl: a.source_url || "",
        publishedAt: a.published_at || null,
        matchMethod: l.match_method,
        matchScore: l.match_score,
        isPrimary: Boolean(l.is_primary_source),
      });
      membersByCluster.set(l.cluster_id, list);
    }

    const out = (clusters || []).map((c) => ({
      ...c,
      members: (membersByCluster.get(c.id) || []).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    }));

    send(res, 200, {
      clusters: out,
      total: out.length,
      multiSource: out.filter((c) => (c.source_count || 0) > 1).length,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
