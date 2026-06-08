/**
 * cluster-news.js — admin endpoint that runs the news clustering engine
 * (Stage 3 of the cluster architecture, #322).
 *
 * GET|POST /api/cluster-news   (admin only; GET so it can run from the browser)
 *
 * 1. Loads enriched market_news rows (the article universe).
 * 2. Syncs them into news_articles (idempotent by market_news id in raw_feed_meta).
 * 3. Runs clusterArticles (lib/news-cluster.js) — conservative grouping.
 * 4. Rebuilds AUTO clusters (those never touched by a human, reviewed_at IS NULL):
 *    deletes them + their links, then writes fresh news_story_clusters and
 *    news_article_cluster_links. Manually-reviewed clusters are left untouched.
 * 5. Returns stats.
 *
 * Internal/dormant: nothing public reads these tables yet. Requires migration
 * 054 (cluster tables). Never changes market_news or /market-news rendering.
 */
import { createClient } from "@supabase/supabase-js";
import { clusterArticles, normalizeCanonicalUrl } from "../lib/news-cluster.js";

const COOKIE_NAME = "admin_session";
const UNIVERSE_LIMIT = 500; // newest N enriched articles per run

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

const arr = (v) => (Array.isArray(v) ? v : []);

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    send(res, 405, { error: "Method not allowed" });
    return;
  }
  let sb;
  try { sb = getSupabase(); } catch (err) { send(res, 500, { error: err.message }); return; }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) { send(res, auth.status, { error: auth.error }); return; }

    // 1) Article universe: enriched market_news, newest first.
    const { data: news, error: ne } = await sb
      .from("market_news")
      .select("id, title, snippet, source_name, source_url, canonical_url, category, country_code, affected_regions, signal_tags, published_at")
      .not("enriched_at", "is", null)
      .or("enrich_recommendation.is.null,enrich_recommendation.neq.archive") // keep off-topic (archived) stories out of clusters
      .order("published_at", { ascending: false })
      .limit(UNIVERSE_LIMIT);
    if (ne) throw new Error(`Load market_news failed: ${ne.message}`);

    // 2) Sync into news_articles (idempotent by market_news id in raw_feed_meta).
    const { data: existing, error: ee } = await sb
      .from("news_articles")
      .select("id, raw_feed_meta");
    if (ee) throw new Error(`Load news_articles failed: ${ee.message}`);
    const byMarketNewsId = new Map();
    for (const a of existing || []) {
      const mid = a?.raw_feed_meta?.market_news_id;
      if (mid) byMarketNewsId.set(String(mid), a.id);
    }

    const toInsert = [];
    for (const r of news || []) {
      if (byMarketNewsId.has(String(r.id))) continue;
      const canonical = normalizeCanonicalUrl(r.canonical_url || r.source_url);
      toInsert.push({
        title: r.title || null,
        source_name: r.source_name || null,
        source_url: r.source_url || null,
        canonical_url: canonical,
        resolved_url: normalizeCanonicalUrl(r.source_url),
        published_at: r.published_at || null,
        country_code: r.country_code || "CV",
        snippet: r.snippet || null,
        ingestion_source: "market_news_sync",
        raw_feed_meta: { market_news_id: r.id },
        status: "candidate",
      });
    }
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { data: ins, error: ie } = await sb.from("news_articles").insert(chunk).select("id, raw_feed_meta");
      if (ie) throw new Error(`Insert news_articles failed: ${ie.message}`);
      for (const a of ins || []) {
        const mid = a?.raw_feed_meta?.market_news_id;
        if (mid) byMarketNewsId.set(String(mid), a.id);
      }
      inserted += (ins || []).length;
    }

    // 3) Build clustering input from news_articles ids + market_news signals.
    const articles = (news || [])
      .map((r) => {
        const id = byMarketNewsId.get(String(r.id));
        if (!id) return null;
        return {
          id,
          title: r.title || "",
          snippet: r.snippet || "",
          canonicalUrl: r.canonical_url || r.source_url || null,
          resolvedUrl: r.source_url || null,
          countryCode: r.country_code || "CV",
          publishedAt: r.published_at || null,
          topics: arr(r.signal_tags),
          entities: arr(r.affected_regions),
        };
      })
      .filter(Boolean);

    const clusters = clusterArticles(articles);

    // 4) Rebuild AUTO clusters (reviewed_at IS NULL); leave manual ones intact.
    const { data: autoClusters, error: ace } = await sb
      .from("news_story_clusters").select("id").is("reviewed_at", null);
    if (ace) throw new Error(`Load auto clusters failed: ${ace.message}`);
    const autoIds = (autoClusters || []).map((c) => c.id);
    if (autoIds.length) {
      await sb.from("news_article_cluster_links").delete().in("cluster_id", autoIds);
      await sb.from("news_story_clusters").delete().in("id", autoIds);
    }

    // 5) Insert fresh clusters + links.
    let writtenClusters = 0;
    let writtenLinks = 0;
    for (const c of clusters) {
      const primaryArticleId = c.members[c.members.length - 1]?.articleId; // newest = primary source
      const { data: cl, error: cle } = await sb
        .from("news_story_clusters")
        .insert({
          country_code: c.country,
          topics: c.topics,
          entities: c.entities,
          status: "candidate",
          cluster_confidence: c.clusterConfidence,
          first_published_at: c.firstPublishedAt,
          latest_published_at: c.latestPublishedAt,
          source_count: c.sourceCount,
        })
        .select("id")
        .single();
      if (cle) throw new Error(`Insert cluster failed: ${cle.message}`);
      writtenClusters++;
      const links = c.members.map((m) => ({
        cluster_id: cl.id,
        article_id: m.articleId,
        match_method: m.method === "seed" ? "manual" : m.method,
        match_score: m.score,
        is_primary_source: m.articleId === primaryArticleId,
      }));
      const { error: le } = await sb.from("news_article_cluster_links").insert(links);
      if (le) throw new Error(`Insert links failed: ${le.message}`);
      writtenLinks += links.length;
    }

    const multi = clusters.filter((c) => c.sourceCount > 1).length;
    send(res, 200, {
      articles: articles.length,
      articlesInserted: inserted,
      clusters: writtenClusters,
      links: writtenLinks,
      multiSourceClusters: multi,
      duplicatesGrouped: articles.length - writtenClusters,
      note: "Auto clusters rebuilt. Manually-reviewed clusters were preserved.",
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
