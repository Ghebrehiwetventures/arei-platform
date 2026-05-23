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

// Wrap image through wsrv.nl proxy to crop to 1:1 square (1080x1080 JPEG)
// Instagram requires aspect 1:1 - 1.91:1 and consistent ratios in carousels.
function squareCrop(url) {
  if (!url) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1080&h=1080&fit=cover&output=jpg`;
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

const ISLAND_HASHTAGS = {
  "Sal":         ["#Sal", "#SantaMaria", "#SalIsland", "#SalCapeVerde", "#SantaMariaSal", "#SalBeach"],
  "Santiago":    ["#Santiago", "#Praia", "#SantiagoCapeVerde", "#PraiaCapeVerde"],
  "Boa Vista":   ["#BoaVista", "#BoaVistaIsland", "#BoaVistaCapeVerde", "#BoaVistaBeach"],
  "São Vicente": ["#SaoVicente", "#Mindelo", "#MindeloCapeVerde", "#SaoVicenteCapeVerde"],
  "Santo Antão": ["#SantoAntao", "#SantoAntaoCapeVerde"],
  "Fogo":        ["#Fogo", "#FogoCapeVerde", "#PicoDoFogo"],
  "Maio":        ["#Maio", "#MaioCapeVerde"],
  "Brava":       ["#Brava", "#BravaCapeVerde"],
  "São Nicolau": ["#SaoNicolau", "#SaoNicolauCapeVerde"],
};

// Facebook Place IDs for Cape Verde islands (used for Instagram location tagging)
const ISLAND_LOCATION_IDS = {
  "Sal":         "109315372423960",
  "Santiago":    "109924729019790",
  "Boa Vista":   "110373705643399",
  "São Vicente": "109207629098195",
  "Santo Antão": "107680032590497",
  "Fogo":        "107897969224870",
  "Maio":        "108230932539302",
};

function buildHashtags(listing) {
  const island = listing.island || "";
  const title = (listing.title || "").toLowerCase();
  const tags = [];

  // Core Cape Verde real estate
  tags.push("#CapeVerde", "#CaboVerde", "#CapeVerdeRealEstate", "#CaboVerdeProperty");
  tags.push("#CapeVerdeProperty", "#CapeVerdeIslands", "#BuyInCapeVerde", "#InvestInCapeVerde");

  // AREI / Africa
  tags.push("#AREI", "#AfricaRealEstate", "#AfricaRealEstateIndex", "#AfricanProperty");

  // General real estate
  tags.push("#RealEstate", "#PropertyForSale", "#RealEstateInvestment", "#LuxuryRealEstate");
  tags.push("#IslandProperty", "#IslandLife", "#OceanView", "#TropicalLiving");

  // Island-specific
  const islandTags = ISLAND_HASHTAGS[island];
  if (islandTags) tags.push(...islandTags);

  // Property-type hints from title
  if (title.includes("villa")) tags.push("#Villa", "#VillaForSale", "#LuxuryVilla");
  else if (title.includes("apartment") || title.includes("flat")) tags.push("#Apartment", "#ApartmentForSale");
  else if (title.includes("townhouse") || title.includes("moradia")) tags.push("#Townhouse", "#HouseForSale");
  else if (title.includes("land") || title.includes("plot") || title.includes("terrain")) tags.push("#LandForSale", "#BuildingPlot");
  else tags.push("#PropertyInvestment", "#DreamHome");

  // Price tier
  if (listing.price && listing.price >= 500000) tags.push("#LuxuryProperty", "#HighEndRealEstate");

  return [...new Set(tags)].join(" ");
}

async function findLocationId(island, accessToken, apiVersion) {
  const id = ISLAND_LOCATION_IDS[island];
  if (id) return id;
  // Dynamic fallback: search Facebook Places
  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/search?type=place&q=${encodeURIComponent(island + " Cape Verde")}&fields=id,name&limit=1&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await res.json().catch(() => ({}));
    return data?.data?.[0]?.id || null;
  } catch {
    return null;
  }
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
  lines.push("Follow @capeverderealestateindex for the latest in Cape Verde real estate.");
  lines.push("");
  lines.push(buildHashtags(listing));
  lines.push("");

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
  const [listingsRes, postsRes] = await Promise.all([
    sb
      .from("v1_feed_cv")
      .select("id, source_id, title, price, price_period, island, bedrooms, bathrooms, area_sqm, description, image_urls, cover_image_url, source_url")
      .eq("has_valid_images", true)
      .order("id", { ascending: false })
      .limit(200),
    sb
      .from("social_listing_posts")
      .select("listing_id")
      .eq("platform", "instagram"),
  ]);
  if (listingsRes.error) throw new Error(`Could not load listings: ${listingsRes.error.message}`);
  const publishedIds = new Set((postsRes.data || []).map((r) => r.listing_id));
  return (listingsRes.data || [])
    .filter((row) => !publishedIds.has(row.id))
    .map((row) => ({
      ...row,
      source_name: sourceName(row.source_id),
      image_urls: [...new Set((row.image_urls || []).map(resolveImageUrl).filter(Boolean))],
      cover_image_url: resolveImageUrl(row.cover_image_url),
      listing_url: `https://www.capeverderealestateindex.com/listing/${row.id}`,
    }));
}

async function listPublishedPosts(sb) {
  const { data, error } = await sb
    .from("social_listing_posts")
    .select("id, listing_id, external_post_id, permalink, caption, image_urls, published_at")
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) {
    // Table may not exist yet — non-fatal
    return [];
  }
  return data || [];
}

async function publishCarousel(sb, body) {
  const { listingId, caption, imageUrls } = body;
  if (!listingId) throw new Error("listingId required");
  if (!caption || !caption.trim()) throw new Error("caption required");

  const ig = getInstagramConfig();
  if (!ig.configured) throw new Error("Instagram not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.");

  // Always fetch listing metadata (island for location tagging + image fallback)
  const { data: listingRow, error: dbErr } = await sb
    .from("v1_feed_cv")
    .select("image_urls, island")
    .eq("id", listingId)
    .maybeSingle();
  if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
  if (!listingRow) throw new Error(`Listing not found: ${listingId}`);

  const images = (Array.isArray(imageUrls) && imageUrls.length > 0)
    ? imageUrls.slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES)
    : [...new Set((listingRow.image_urls || []).map(resolveImageUrl).filter(Boolean))].slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES);

  if (images.length < 2) throw new Error("Carousel requires at least 2 images. This listing has fewer.");

  const graphBase = `https://graph.instagram.com/${ig.apiVersion}/${ig.accountId}`;

  console.log("[social-listing] publish start", {
    accountId: ig.accountId,
    tokenPrefix: ig.accessToken.slice(0, 20),
    apiVersion: ig.apiVersion,
    imageCount: images.length,
  });

  // Step 1: create a media container for each image (square-cropped via proxy)
  const containerIds = [];
  for (const imageUrl of images) {
    const params = new URLSearchParams({
      image_url: squareCrop(imageUrl),
      is_carousel_item: "true",
      access_token: ig.accessToken,
    });
    const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    console.log("[social-listing] container create", { status: res.status, data });
    if (!res.ok || !data.id) {
      throw new Error(data.error?.message || `Failed to create media container for ${imageUrl}: HTTP ${res.status}`);
    }
    containerIds.push(data.id);
  }

  // Step 1b: poll each container until status_code === FINISHED.
  // Instagram processes media asynchronously; referencing an IN_PROGRESS
  // container in the carousel step yields "Media ID is not available".
  async function waitUntilReady(containerId, maxAttempts = 20, delayMs = 1500) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const r = await fetch(
        `https://graph.instagram.com/${ig.apiVersion}/${containerId}?fields=status_code&access_token=${encodeURIComponent(ig.accessToken)}`
      );
      const d = await r.json().catch(() => ({}));
      if (d.status_code === "FINISHED") return;
      if (d.status_code === "ERROR" || d.status_code === "EXPIRED") {
        throw new Error(`Container ${containerId} ended in status ${d.status_code}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Container ${containerId} did not finish processing in time`);
  }
  for (const id of containerIds) {
    await waitUntilReady(id);
  }

  // Step 2: create carousel container
  const locationId = listingRow.island
    ? await findLocationId(listingRow.island, ig.accessToken, ig.apiVersion)
    : null;
  if (locationId) console.log("[social-listing] location_id", locationId, "for island", listingRow.island);

  const carouselParams = new URLSearchParams({
    media_type: "CAROUSEL",
    caption: caption.trim(),
    children: containerIds.join(","),
    access_token: ig.accessToken,
  });
  if (locationId) carouselParams.set("location_id", locationId);
  const carouselRes = await fetch(`${graphBase}/media`, { method: "POST", body: carouselParams });
  const carouselData = await carouselRes.json().catch(() => ({}));
  if (!carouselRes.ok || !carouselData.id) {
    throw new Error(carouselData.error?.message || `Failed to create carousel container: HTTP ${carouselRes.status}`);
  }

  // Wait for the carousel container itself before publishing
  await waitUntilReady(carouselData.id);

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

  // Step 5: log the publish in social_listing_posts (non-fatal if it fails)
  const { error: logErr } = await sb.from("social_listing_posts").insert({
    listing_id: listingId,
    platform: "instagram",
    external_post_id: publishData.id,
    permalink: permalink || null,
    caption: caption.trim(),
    image_urls: images,
  });
  if (logErr) console.error("[social-listing] Could not log publish:", logErr.message);

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
      const [listings, published] = await Promise.all([listListings(sb), listPublishedPosts(sb)]);
      const ig = getInstagramConfig();
      send(res, 200, { listings, published, instagram: { configured: ig.configured } });
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
