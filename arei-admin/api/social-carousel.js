/**
 * social-carousel.js — Social Carousel Builder API (AREI / CVREI).
 *
 * GET  /api/social-carousel?cap=100000
 *   → eligible Cape Verde listings at or under the price cap (real data from
 *     v1_feed_cv), with deduped/resolved image URLs, specs and source.
 *
 * POST /api/social-carousel   { slide, format }
 *   → renders ONE branded carousel slide to a base64 PNG. Rendered per-slide
 *     (not the whole deck at once) so photographic PNGs never blow past the
 *     serverless response size. Listing/cover photos are proxied through
 *     wsrv.nl for reliability (hotlinked broker URLs + webp/hotlink-protection).
 *
 * Admin-authed (cookie or bearer). Manual builder — no scheduling, no auto
 * publishing here; Instagram publish reuses /api/publish-news-post.
 */
import { createClient } from "@supabase/supabase-js";
import { renderSlide, FORMAT_KEYS } from "../lib/carouselRender.js";

const COOKIE_NAME = "admin_session";
const PRICE_FLOOR = 10000; // mirrors PRICE_BUCKETS.under_100k.min in arei-sdk

// Source id → human name (mirrors social-listing.js SOURCE_NAMES).
const SOURCE_NAMES = {
  cv_homescasaverde: "Homes Casa Verde",
  cv_remax: "REMAX Cape Verde",
  cv_simplycapeverde: "Simply Cape Verde",
  cv_terracaboverde: "Terra Cabo Verde",
  cv_ccoreinvestments: "CCore Investments",
  cv_capeverdeproperty24: "Cape Verde Property 24",
  cv_cabohouseproperty: "Cabo House Property",
  cv_estatecv: "Estate CV",
  cv_oceanproperty24: "Ocean Property 24",
  cv_nhakaza: "NhaKaza",
};
const sourceName = (id) => SOURCE_NAMES[id] || "Cape Verde Real Estate Index";

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

// ── Image helpers (mirror social-listing.js; kept local to avoid coupling) ───
function resolveImageUrl(url) {
  if (!url || !url.endsWith(".webp")) return url;
  return url
    .replace("/wp-content/webp-express/webp-images/uploads/", "/wp-content/uploads/")
    .replace(/\.webp$/, "");
}
function imageBaseKey(url) {
  return url.split("?")[0].replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, "").replace(/\.(webp|jpe?g|png|gif)$/i, "").toLowerCase();
}
function imagePixelArea(url) {
  const m = url.split("?")[0].match(/-(\d{2,4})x(\d{2,4})(?=\.[a-z]+$)/i);
  return m ? parseInt(m[1], 10) * parseInt(m[2], 10) : Number.POSITIVE_INFINITY;
}
function dedupeImages(urls) {
  const best = new Map();
  for (const url of urls) {
    if (!url) continue;
    const key = imageBaseKey(url);
    const area = imagePixelArea(url);
    const cur = best.get(key);
    if (!cur || area > cur.area) best.set(key, { url, area });
  }
  return [...best.values()].map((v) => v.url);
}

// Proxy a hotlinked broker image through wsrv.nl → reliable, normalised JPG.
// resvg slices it into each format's photo zone, so we just need a large source.
async function fetchProxiedImage(url) {
  if (!url) return null;
  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1280&output=jpg&q=88`;
  try {
    const r = await fetch(proxied, { headers: { "User-Agent": "cvrei-carousel/1.0 (capeverderealestateindex.com)" } });
    if (!r.ok) return null;
    const b = Buffer.from(await r.arrayBuffer());
    return b.length > 2000 ? b : null;
  } catch {
    return null;
  }
}

// ── Social-candidate quality heuristics ─────────────────────────────────────
// Land / plot / project-only listings are weak "buy a home" content.
const LAND_RE = /\b(land|plot|plots|lote|lotes|terreno|terrenos|terrain|parcel|building plot|development land|investment land|ruin|ruína|ruina)\b/i;
// Image URLs that look like maps, floor/site plans, flyers, logos, watermarks —
// not real property photos. Filtered out of the usable image set.
const BAD_IMAGE_RE = /(floor.?plan|grundriss|site.?plan|master.?plan|plano|planta|[-_.]plan[-_.]|[-_]plan\.|[-_.]map[-_.]|[-_]map\.|google.?map|flyer|brochure|logo|watermark|banner|price.?list|sketch|blueprint|diagram|cad[-_.])/i;
// Real-home signal (boosts ranking).
const RESIDENTIAL_RE = /\b(apartment|apartamento|villa|moradia|house|home|casa|t[1-5]\b|v[1-5]\b|penthouse|duplex|studio|condo|flat)\b/i;

const isLand = (row) => LAND_RE.test(`${row.title || ""} ${row.property_type || ""}`);
const isResidential = (row) => RESIDENTIAL_RE.test(`${row.title || ""} ${row.property_type || ""}`);
const filterGoodImages = (images) => images.filter((u) => !BAD_IMAGE_RE.test(u));

// Higher = stronger social candidate. More real photos, real-home signals, and
// residential type rank up; single-image listings are penalised.
function socialScore(l) {
  let s = 0;
  const n = l.images.length;
  s += Math.min(n, 6) * 2;
  if (n === 1) s -= 5;
  if (l.bedrooms != null) s += 2;
  if (l.area_sqm != null) s += 1;
  if (isResidential(l)) s += 4;
  return s;
}

function specsLine(row) {
  const parts = [];
  if (row.bedrooms != null) parts.push(`${row.bedrooms} bed`);
  if (row.bathrooms != null) parts.push(`${row.bathrooms} bath`);
  if (row.area_sqm != null) parts.push(`${Math.round(row.area_sqm)} m²`);
  return parts.join(" · ");
}
// European premium style: full price with space thousands separators
// (€100 000), never "k" shorthand, never comma separators.
function priceLabel(price) {
  if (price == null) return "Price on request";
  return "€" + Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// v1_feed_cv may or may not expose property_type; select it when present and
// fall back to the base column set otherwise.
async function queryFeed(sb, cap, withType) {
  const cols = "id, source_id, title, price, price_period, island, bedrooms, bathrooms, area_sqm, image_urls, cover_image_url, source_url" + (withType ? ", property_type" : "");
  return sb
    .from("v1_feed_cv")
    .select(cols)
    .eq("has_valid_images", true)
    .neq("price_period", "rent")
    .gte("price", PRICE_FLOOR)
    .lte("price", cap)
    .order("id", { ascending: false })
    .limit(200);
}

// Eligible listings, ranked by social-candidate quality (NOT cheapest-first):
// drops land/plot and map/plan/flyer images, ranks real residential photos up,
// and deprioritises single-image listings. Caller picks the top few.
async function listEligible(sb, cap) {
  let { data, error } = await queryFeed(sb, cap, true);
  if (error && /property_type/i.test(error.message || "")) ({ data, error } = await queryFeed(sb, cap, false));
  if (error) throw new Error(`Could not load listings: ${error.message}`);

  const mapped = (data || []).map((row) => {
    const images = filterGoodImages(dedupeImages((row.image_urls || []).map(resolveImageUrl).filter(Boolean)));
    return {
      id: row.id,
      title: row.title || "",
      property_type: row.property_type || "",
      price: row.price,
      priceLabel: priceLabel(row.price),
      island: row.island || "",
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      area_sqm: row.area_sqm,
      specs: specsLine(row),
      images,
      source_id: row.source_id,
      source_name: sourceName(row.source_id),
      source_url: row.source_url || "",
      listing_url: `https://www.capeverderealestateindex.com/listing/${row.id}`,
    };
  });

  return mapped
    .filter((l) => l.images.length > 0 && !isLand(l)) // need a real photo; not land/plot
    .map((l) => ({ ...l, _score: socialScore(l) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 48)
    .map(({ _score, ...l }) => l);
}

export default async function handler(req, res) {
  let sb;
  try { sb = getSupabase(); } catch (err) { return send(res, 500, { error: err.message }); }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) return send(res, auth.status, { error: auth.error });

    if (req.method === "GET") {
      const rawCap = Number(req.query?.cap);
      const cap = Number.isFinite(rawCap) && rawCap > PRICE_FLOOR ? Math.min(rawCap, 5_000_000) : 100_000;
      const listings = await listEligible(sb, cap);
      return send(res, 200, { cap, count: listings.length, listings });
    }

    if (req.method === "POST") {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const slide = body.slide && typeof body.slide === "object" ? { ...body.slide } : null;
      const format = String(body.format || "4:5");
      if (!slide || !slide.type) return send(res, 400, { error: "slide { type } required" });
      if (!FORMAT_KEYS.includes(format)) return send(res, 400, { error: `format must be one of ${FORMAT_KEYS.join(", ")}` });

      let photoFailed = false;
      let failedUrl = null;
      if (slide.imageUrl) {
        const original = slide.imageUrl;
        const buf = await fetchProxiedImage(original);
        if (buf) slide.imageBuffer = buf;
        else { photoFailed = true; failedUrl = original; } // surface the dead URL
        delete slide.imageUrl;
      }
      slide.format = format;
      const png = await renderSlide(slide);
      return send(res, 200, { base64: png.toString("base64"), mime: "image/png", photoFailed, failedUrl });
    }

    return send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    return send(res, 500, { error: err?.message || String(err) });
  }
}
