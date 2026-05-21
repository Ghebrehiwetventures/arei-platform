import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";
const INSTAGRAM_MAX_CAROUSEL_IMAGES = 10;

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

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorizeRequest(req, sb) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow } = await sb
    .from("admin_users")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

function resolveImageUrl(url) {
  if (!url || !url.endsWith(".webp")) return url;
  return url
    .replace("/wp-content/webp-express/webp-images/uploads/", "/wp-content/uploads/")
    .replace(/\.webp$/, "");
}

function sourceName(sourceId) {
  return SOURCE_NAMES[sourceId] || sourceId || "Unknown agency";
}

function formatPrice(price, pricePeriod) {
  if (!price) return null;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return pricePeriod === "rent" ? `${formatted}/month` : formatted;
}

function truncateDescription(desc, maxSentences = 3, maxChars = 400) {
  if (!desc) return "";
  const clean = desc.trim().replace(/\s+/g, " ");
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 0) {
    let result = "";
    for (const s of sentences.slice(0, maxSentences)) {
      result += s;
      if (result.length >= maxChars) break;
    }
    return result.trim() + (result.trim().length < clean.length ? "..." : "");
  }
  return clean.length > maxChars ? clean.substring(0, maxChars).trimEnd() + "..." : clean;
}

function buildCaption(listing) {
  const agency = sourceName(listing.source_id);
  const price = formatPrice(listing.price, listing.price_period);
  const island = listing.island || "Cape Verde";

  const lines = [];

  // Line 1: title + price
  const titleLine = [listing.title, price].filter(Boolean).join(" — ");
  if (titleLine) lines.push(titleLine);

  lines.push("");

  // Description — first 3 sentences only
  const desc = truncateDescription(listing.description);
  if (desc) {
    lines.push(desc);
    lines.push("");
  }

  // Specs
  const specs = [
    listing.bedrooms ? `${listing.bedrooms} bed` : null,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    listing.area_sqm ? `${Math.round(listing.area_sqm)}m²` : null,
    island,
  ].filter(Boolean);
  if (specs.length > 0) {
    lines.push(specs.join(" · "));
    lines.push("");
  }

  lines.push(`Source · ${agency}`);
  lines.push(`Photos courtesy of ${agency}`);
  lines.push("");
  lines.push("Follow @africarealestateindex for the latest in Cape Verde real estate.");
  lines.push("");

  const hashtags = ["#CapeVerde", "#AREI", "#CapeVerdeRealEstate"];
  const islandTag = island.replace(/\s+/g, "");
  if (islandTag && islandTag !== "CapeVerde") hashtags.push(`#${islandTag}`);
  lines.push(hashtags.join(" "));

  return lines.join("\n");
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

async function listListings(sb) {
  const { data, error } = await sb
    .from("v1_feed_cv")
    .select("id, source_id, title, price, price_period, island, bedrooms, bathrooms, area_sqm, description, image_urls, cover_image_url, source_url")
    .eq("has_valid_images", true)
    .order("id", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load listings: ${error.message}`);
  return (data || []).map((row) => ({
    ...row,
    source_name: sourceName(row.source_id),
    image_urls: [...new Set((row.image_urls || []).map(resolveImageUrl).filter(Boolean))],
    cover_image_url: resolveImageUrl(row.cover_image_url),
    listing_url: `https://www.capeverderealestateindex.com/listing/${row.id}`,
  }));
}

async function publishCarousel(sb, body) {
  const { listingId, caption, imageUrls } = body;
  if (!listingId) throw new Error("listingId required");
  if (!caption || !caption.trim()) throw new Error("caption required");

  const ig = getInstagramConfig();
  if (!ig.configured) throw new Error("Instagram not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.");

  // Use client-selected images if provided, otherwise fall back to DB
  let images;
  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    images = imageUrls.slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES);
  } else {
    const { data: listing, error: dbErr } = await sb
      .from("v1_feed_cv")
      .select("image_urls")
      .eq("id", listingId)
      .maybeSingle();
    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
    if (!listing) throw new Error(`Listing not found: ${listingId}`);
    images = [...new Set((listing.image_urls || []).map(resolveImageUrl).filter(Boolean))]
      .slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES);
  }

  if (images.length < 2) throw new Error("Carousel requires at least 2 images. This listing has fewer.");

  const graphBase = `https://graph.instagram.com/${ig.apiVersion}/${ig.accountId}`;

  // Step 1: create a media container for each image
  const containerIds = [];
  for (const imageUrl of images) {
    const params = new URLSearchParams({
      image_url: imageUrl,
      is_carousel_item: "true",
      access_token: ig.accessToken,
    });
    const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      throw new Error(data.error?.message || `Failed to create media container for ${imageUrl}: HTTP ${res.status}`);
    }
    containerIds.push(data.id);
  }

  // Step 2: create carousel container
  const carouselParams = new URLSearchParams({
    media_type: "CAROUSEL",
    caption: caption.trim(),
    children: containerIds.join(","),
    access_token: ig.accessToken,
  });
  const carouselRes = await fetch(`${graphBase}/media`, { method: "POST", body: carouselParams });
  const carouselData = await carouselRes.json().catch(() => ({}));
  if (!carouselRes.ok || !carouselData.id) {
    throw new Error(carouselData.error?.message || `Failed to create carousel container: HTTP ${carouselRes.status}`);
  }

  // Step 3: publish
  const publishParams = new URLSearchParams({
    creation_id: carouselData.id,
    access_token: ig.accessToken,
  });
  const publishRes = await fetch(`${graphBase}/media_publish`, { method: "POST", body: publishParams });
  const publishData = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || !publishData.id) {
    throw new Error(publishData.error?.message || `Failed to publish carousel: HTTP ${publishRes.status}`);
  }

  // Step 4: get permalink
  let permalink = "";
  const permalinkRes = await fetch(
    `https://graph.instagram.com/${ig.apiVersion}/${publishData.id}?fields=permalink&access_token=${encodeURIComponent(ig.accessToken)}`
  );
  if (permalinkRes.ok) {
    const pl = await permalinkRes.json().catch(() => ({}));
    permalink = pl.permalink || "";
  }

  return { postId: publishData.id, permalink };
}

export default async function handler(req, res) {
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

    if (req.method === "GET") {
      const listings = await listListings(sb);
      const ig = getInstagramConfig();
      send(res, 200, { listings, instagram: { configured: ig.configured } });
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (body.action === "generate_caption") {
      const { data: listing, error } = await sb
        .from("v1_feed_cv")
        .select("id, source_id, title, price, price_period, island, bedrooms, bathrooms, area_sqm, description")
        .eq("id", body.listingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!listing) throw new Error("Listing not found");
      send(res, 200, { caption: buildCaption(listing) });
      return;
    }

    if (body.action === "publish_carousel") {
      const result = await publishCarousel(sb, body);
      send(res, 200, result);
      return;
    }

    send(res, 400, { error: "Unknown action" });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
