/**
 * publish-news-post.js — publish a generated News Studio post to Instagram.
 *
 * Instagram's Graph API needs a PUBLIC image URL (not base64), so each slide is
 * uploaded to a public Supabase Storage bucket, then published as a single
 * image (1 slide) or a carousel (2+). Mirrors the proven flow in
 * social-listing.js but for our 1080×1350 (4:5) posts (no square crop).
 *
 * Admin-authed; only runs on explicit POST from the studio's Publish button.
 */
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";
const BUCKET = "news-posts";

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
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow } = await sb.from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

function getInstagramConfig() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || "";
  const accountId =
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
    process.env.INSTAGRAM_IG_USER_ID ||
    process.env.META_INSTAGRAM_BUSINESS_ACCOUNT_ID ||
    "";
  return {
    configured: Boolean(accessToken && accountId),
    accessToken,
    accountId,
    apiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0",
  };
}

async function ensureBucket(sb) {
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  // Ignore "already exists"; surface anything else.
  if (error && !/exist/i.test(error.message)) throw new Error(`Bucket: ${error.message}`);
}

async function uploadImage(sb, base64, i) {
  const buffer = Buffer.from(base64, "base64");
  const path = `posts/${Date.now()}-${i}.png`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Upload: ${error.message}`);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function waitUntilReady(ig, containerId, maxAttempts = 20, delayMs = 1500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const r = await fetch(`https://graph.instagram.com/${ig.apiVersion}/${containerId}?fields=status_code&access_token=${encodeURIComponent(ig.accessToken)}`);
    const d = await r.json().catch(() => ({}));
    if (d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR" || d.status_code === "EXPIRED") throw new Error(`Container ${containerId} ended in ${d.status_code}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Container ${containerId} did not finish in time`);
}

async function publishToInstagram(ig, imageUrls, caption) {
  const graphBase = `https://graph.instagram.com/${ig.apiVersion}/${ig.accountId}`;
  let creationId;

  if (imageUrls.length === 1) {
    const params = new URLSearchParams({ image_url: imageUrls[0], caption, access_token: ig.accessToken });
    const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) throw new Error(data.error?.message || `Create media failed: HTTP ${res.status}`);
    await waitUntilReady(ig, data.id);
    creationId = data.id;
  } else {
    const childIds = [];
    for (const url of imageUrls) {
      const params = new URLSearchParams({ image_url: url, is_carousel_item: "true", access_token: ig.accessToken });
      const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error?.message || `Create carousel item failed: HTTP ${res.status}`);
      childIds.push(data.id);
    }
    await Promise.all(childIds.map((id) => waitUntilReady(ig, id)));
    const params = new URLSearchParams({ media_type: "CAROUSEL", caption, children: childIds.join(","), access_token: ig.accessToken });
    const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) throw new Error(data.error?.message || `Create carousel failed: HTTP ${res.status}`);
    await waitUntilReady(ig, data.id);
    creationId = data.id;
  }

  const publishRes = await fetch(`${graphBase}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: creationId, access_token: ig.accessToken }),
  });
  const publishData = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || !publishData.id) throw new Error(publishData.error?.message || `Publish failed: HTTP ${publishRes.status}`);

  let permalink = "";
  const plRes = await fetch(`https://graph.instagram.com/${ig.apiVersion}/${publishData.id}?fields=permalink&access_token=${encodeURIComponent(ig.accessToken)}`);
  if (plRes.ok) permalink = (await plRes.json().catch(() => ({}))).permalink || "";
  return { postId: publishData.id, permalink };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  let sb;
  try { sb = getSupabase(); } catch (err) { return send(res, 500, { error: err.message }); }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const images = Array.isArray(body.images) ? body.images.filter((s) => typeof s === "string" && s) : [];
    const caption = (typeof body.caption === "string" ? body.caption : "").trim();
    if (images.length === 0) return send(res, 400, { error: "images (base64[]) required" });
    if (!caption) return send(res, 400, { error: "caption required" });

    const ig = getInstagramConfig();
    if (!ig.configured) return send(res, 500, { error: "Instagram not configured (INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID)" });

    await ensureBucket(sb);
    const imageUrls = [];
    for (let i = 0; i < images.length; i++) imageUrls.push(await uploadImage(sb, images[i], i));

    const result = await publishToInstagram(ig, imageUrls, caption);
    send(res, 200, { ok: true, ...result, imageUrls });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
