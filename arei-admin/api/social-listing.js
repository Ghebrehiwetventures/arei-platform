import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";
const INSTAGRAM_MAX_CAROUSEL_IMAGES = 10;

// The only market + channel live today. Stored on every content row so the
// same engine scales to other markets/channels without a schema change.
const DEFAULT_MARKET_ID = "cv";
const DEFAULT_PLATFORM = "instagram";

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

export function getSupabase() {
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

// Source feeds often contain several size variants of the same photo
// (foo-768x512.jpg, foo-1024x768.jpg, foo.jpg). Collapse them to one image per
// base, keeping the largest variant — this removes duplicates AND guarantees the
// highest resolution, without a fragile thumbnail filter.

// Strip the -WxH size suffix + extension to get the base identity of an image.
function imageBaseKey(url) {
  return url
    .split("?")[0]
    .replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, "")
    .replace(/\.(webp|jpe?g|png|gif)$/i, "")
    .toLowerCase();
}

// Pixel area of a variant; the no-suffix original counts as largest.
function imagePixelArea(url) {
  const m = url.split("?")[0].match(/-(\d{2,4})x(\d{2,4})(?=\.[a-z]+$)/i);
  return m ? parseInt(m[1], 10) * parseInt(m[2], 10) : Number.POSITIVE_INFINITY;
}

// Dedupe by base image, keeping the largest variant. Preserves first-seen order.
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

// 1:1 square for carousel items — high quality
function listingBrandFilterParams() {
  return "&mod=1.01,0.94,0";
}

function squareCrop(url, brandFilter = false) {
  if (!url) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1080&h=1080&fit=cover&output=jpg&q=92&sharp=1${brandFilter ? listingBrandFilterParams() : ""}`;
}

async function waitUntilReady(ig, containerId, maxAttempts = 20, delayMs = 1500) {
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


function sourceName(sourceId) {
  return SOURCE_NAMES[sourceId] || sourceId || "Unknown agency";
}

function formatPrice(price, pricePeriod) {
  if (!price) return null;
  // sv-SE: space as thousands separator, symbol after the amount (e.g. "300 000 €").
  // Avoids comma/dot being read as a decimal by SV/PT audiences.
  const formatted = new Intl.NumberFormat("sv-SE", {
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

// Resolve a Facebook Place ID for the listing's location at publish time.
// We no longer hardcode IDs — earlier guesses were rejected by Instagram
// ("Param location_id is not a valid location page ID"). The place search
// only works if the access token has the Facebook Places permissions; if it
// doesn't (e.g. a pure Instagram Login token), this returns null and the
// carousel publishes without a location tag.
async function findLocationId(city, island, accessToken, apiVersion) {
  const query = [city, island, "Cape Verde"].filter(Boolean).join(", ");
  if (!query) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/search?type=place&q=${encodeURIComponent(query)}&fields=id,name&limit=1&access_token=${encodeURIComponent(accessToken)}`
    );
    const data = await res.json().catch(() => ({}));
    if (data?.error) {
      console.error("[social-listing] place search failed:", data.error.message);
      return null;
    }
    return data?.data?.[0]?.id || null;
  } catch (err) {
    console.error("[social-listing] place search error:", err?.message);
    return null;
  }
}

// Deterministic fallback caption (used if the LLM is unavailable or errors).
function buildTemplateCaption(listing) {
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

// The LLM writes only the creative opening (hook + 2-3 editorial sentences).
// Everything below it — specs line, attribution, follow line, hashtags, and the
// blank-line spacing — is assembled in code so Instagram formatting is reliable
// (LLMs are unreliable at exact whitespace, rounding, and hashtag discipline).
const CAPTION_SYSTEM_PROMPT = `Write two parts for an Instagram caption about a Cape Verde property listing.

Part 1 — Hook (max 10 words):
Location + price. Example: 'Santa Maria, Sal — 110 000 €.'
Always format prices with a space as the thousands separator and the
euro symbol after the amount (110 000 €, never €110,000 or €110.000).

Part 2 — Description (2-3 sentences):
Describe the property using specific details from the listing. Focus on: size, layout, location context, construction stage, views, key features. Plain english. Professional tone. No hype.

Rules:
- No emoji
- No exclamation marks
- No words: exclusive, stunning, luxury, paradise, dream, sought-after, exceptional, prestigious
- Never copy the broker description — extract facts and rewrite
- If a detail is missing, omit it. Never guess.
- Never state a completion date, year, or timeline unless it appears word-for-word in the listing description. If unsure, omit it.

Return only Part 1 and Part 2 as plain text. No labels, no JSON, no other sections.`;

function buildCaptionUserMessage(listing) {
  const fields = {
    title: listing.title ?? null,
    price: listing.price ? formatPrice(listing.price, listing.price_period) : null,
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    property_size_sqm: (listing.area_sqm ?? listing.property_size_sqm) != null
      ? Math.round(listing.area_sqm ?? listing.property_size_sqm)
      : null,
    island: listing.island ?? null,
    city: listing.city ?? null,
    source_name: sourceName(listing.source_id),
    description: listing.description ?? null,
  };
  return JSON.stringify(fields, null, 2);
}

const ISLAND_HASHTAG = {
  "Sal": "#Sal",
  "Boa Vista": "#BoaVista",
  "Santiago": "#Santiago",
  "São Vicente": "#SãoVicente",
  "Santo Antão": "#SantoAntao",
  "Fogo": "#Fogo",
  "Maio": "#Maio",
  "Brava": "#Brava",
  "São Nicolau": "#SaoNicolau",
};

// #CapeVerde #AREI #CapeVerdeRealEstate + island tag + a few general tags. Max 10.
function buildCaptionHashtags(listing) {
  const tags = ["#CapeVerde", "#AREI", "#CapeVerdeRealEstate"];
  const islandTag = ISLAND_HASHTAG[listing.island];
  if (islandTag) tags.push(islandTag);
  tags.push("#CaboVerde", "#PropertyForSale", "#IslandProperty");
  return [...new Set(tags)].slice(0, 10).join(" ");
}

// Assemble the final caption deterministically around the AI hook + description.
function assembleCaption(hook, description, listing) {
  const agency = sourceName(listing.source_id);
  const size = listing.area_sqm ?? listing.property_size_sqm;
  const lines = [];

  if (hook) lines.push(hook.trim());
  if (description) { lines.push(""); lines.push(description.trim()); }

  // Specs line: [X] bed · [Y] bath · [Z] m² · [island]
  // Studios (property_type contains "studio" or bedrooms = 0) show "Studio".
  const isStudio = listing.bedrooms === 0 || /studio/i.test(listing.property_type || "");
  const bedSpec = isStudio ? "Studio" : (listing.bedrooms ? `${listing.bedrooms} bed` : null);
  const specs = [
    bedSpec,
    listing.bathrooms ? `${listing.bathrooms} bath` : null,
    size ? `${Math.round(size)} m²` : null,
    listing.island || null,
  ].filter(Boolean);
  if (specs.length) { lines.push(""); lines.push(specs.join(" · ")); }

  lines.push("");
  lines.push(`Listing Rep: ${agency}`);
  lines.push(`Photos courtesy of ${agency}`);
  lines.push("");
  lines.push("Follow @capeverderealestateindex for Cape Verde property data.");
  lines.push("");
  lines.push(buildCaptionHashtags(listing));

  return lines.join("\n");
}

// Split the LLM's plain-text reply into hook (first block) + description (rest).
function parseHookAndDescription(text) {
  const clean = (text || "").trim();
  if (!clean) return { hook: "", description: "" };
  const blocks = clean.split(/\n\s*\n/);
  if (blocks.length >= 2) {
    return { hook: blocks[0].trim(), description: blocks.slice(1).join("\n\n").trim() };
  }
  const nl = clean.split("\n");
  return { hook: nl[0].trim(), description: nl.slice(1).join(" ").trim() };
}

// AI-written hook + description + deterministic structure. Falls back to the old
// template if the OpenAI key is missing or the call fails.
async function buildCaption(listing) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildTemplateCaption(listing);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: CAPTION_SYSTEM_PROMPT },
          { role: "user", content: buildCaptionUserMessage(listing) },
        ],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });
    if (!response.ok) {
      console.error("[social-listing] caption LLM failed:", response.status, await response.text().catch(() => ""));
      return buildTemplateCaption(listing);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const { hook, description } = parseHookAndDescription(content);
    if (!hook) return buildTemplateCaption(listing);
    return assembleCaption(hook, description, listing);
  } catch (err) {
    console.error("[social-listing] caption LLM error (fallback to template):", err?.message);
    return buildTemplateCaption(listing);
  }
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

function resolveChannels(value, fallback = DEFAULT_PLATFORM) {
  const raw = Array.isArray(value) && value.length > 0 ? value : [fallback];
  return [...new Set(raw.map((channel) => String(channel || "").trim()).filter(Boolean))];
}

// ─── TikTok Photo Mode ────────────────────────────────────────────────────────

function getTikTokConfig() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN || "";
  return { configured: Boolean(accessToken), accessToken };
}

function tikTokImageUrl(url) {
  if (!url) return url;
  // Convert any source format to JPG via proxy; TikTok pulls server-side so
  // CORS is not a concern, but format normalisation avoids HEIC/WEBP rejections.
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=92`;
}

async function pollTikTokStatus(accessToken, publishId, maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const data = await res.json().catch(() => ({}));
    const status = data?.data?.status;
    if (status === "PUBLISH_COMPLETE") {
      const postIds = data?.data?.publicaly_available_post_id || [];
      return { postId: postIds[0] || publishId };
    }
    if (status === "FAILED") {
      throw new Error(`TikTok publish failed: ${data?.error?.message || "FAILED status"}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("TikTok: publish did not complete in time");
}

async function publishToTikTok(sb, { listingId, caption, imageUrls, marketId }) {
  const cfg = getTikTokConfig();
  if (!cfg.configured) throw new Error("TikTok not configured. Set TIKTOK_ACCESS_TOKEN.");

  const photos = imageUrls.slice(0, 35).map(tikTokImageUrl);
  if (photos.length < 1) throw new Error("At least 1 image required for TikTok.");

  const title = caption.trim().slice(0, 2200);

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_images: photos,
        photo_cover_index: 0,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  const initData = await initRes.json().catch(() => ({}));
  console.log("[social-listing] tiktok init", { status: initRes.status, error: initData?.error });

  if (!initRes.ok || initData?.error?.code !== "ok") {
    throw new Error(initData?.error?.message || `TikTok init failed: HTTP ${initRes.status}`);
  }

  const publishId = initData?.data?.publish_id;
  if (!publishId) throw new Error("TikTok: no publish_id in response");

  const { postId } = await pollTikTokStatus(cfg.accessToken, publishId);

  const { error: logErr } = await sb.from("social_listing_posts").insert({
    listing_id: listingId,
    platform: "tiktok",
    market_id: marketId || DEFAULT_MARKET_ID,
    external_post_id: postId,
    permalink: null,
    caption: caption.trim(),
    image_urls: imageUrls,
  });
  if (logErr) console.error("[social-listing] tiktok log error:", logErr.message);

  return { postId, permalink: null };
}

async function listListings(sb) {
  const [listingsRes, postsRes] = await Promise.all([
    sb
      .from("v1_feed_cv")
      .select("id, source_id, title, price, price_period, island, bedrooms, bathrooms, area_sqm, description, image_urls, cover_image_url, source_url")
      .eq("has_valid_images", true)
      .order("id", { ascending: false })
      .limit(2000),
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
      image_urls: dedupeImages((row.image_urls || []).map(resolveImageUrl).filter(Boolean)),
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

async function getExistingPublishedPost(sb, listingId, platform = DEFAULT_PLATFORM, marketId = DEFAULT_MARKET_ID) {
  const { data: postRows, error: postErr } = await sb
    .from("social_listing_posts")
    .select("external_post_id, permalink, market_id, platform")
    .eq("listing_id", listingId)
    .order("published_at", { ascending: false })
    .limit(10);
  if (postErr) throw new Error(`Could not verify publish history: ${postErr.message}`);
  const post = (postRows || []).find((row) =>
    (row.market_id == null || row.market_id === marketId) &&
    (row.platform == null || row.platform === platform)
  );
  if (post) {
    return {
      postId: post.external_post_id,
      permalink: post.permalink || "",
      storyPublished: false,
      alreadyPublished: true,
    };
  }

  const { data: queueRows, error: queueErr } = await sb
    .from("social_listing_queue")
    .select("post_id, permalink, story_published, market_id, platform")
    .eq("listing_id", listingId)
    .eq("status", "published")
    .not("post_id", "is", null)
    .order("scheduled_at", { ascending: false })
    .limit(10);
  if (queueErr) throw new Error(`Could not verify queue history: ${queueErr.message}`);
  const queued = (queueRows || []).find((row) =>
    (row.market_id == null || row.market_id === marketId) &&
    (row.platform == null || row.platform === platform) &&
    !String(row.post_id || "").startsWith("CLAIM:")
  );
  if (!queued) return null;
  return {
    postId: queued.post_id,
    permalink: queued.permalink || "",
    storyPublished: Boolean(queued.story_published),
    alreadyPublished: true,
  };
}

async function getActiveQueuedPost(sb, listingId, platform = DEFAULT_PLATFORM, marketId = DEFAULT_MARKET_ID) {
  const { data, error } = await sb
    .from("social_listing_queue")
    .select("id, status, scheduled_at, post_id, market_id, platform")
    .eq("listing_id", listingId)
    .in("status", ["pending", "published"])
    .order("scheduled_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(`Could not verify queue state: ${error.message}`);
  return (data || []).find((row) =>
    (row.market_id == null || row.market_id === marketId) &&
    (row.platform == null || row.platform === platform)
  ) || null;
}

async function getMarketingSummary(sb) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    posts7d,
    latestPosts,
    pendingQueue,
    failedQueue,
    latestQueue,
  ] = await Promise.all([
    sb
      .from("social_listing_posts")
      .select("id", { count: "exact", head: true })
      .eq("market_id", DEFAULT_MARKET_ID)
      .eq("platform", DEFAULT_PLATFORM)
      .gte("published_at", sevenDaysAgo),
    sb
      .from("social_listing_posts")
      .select("id, listing_id, permalink, image_urls, published_at")
      .eq("market_id", DEFAULT_MARKET_ID)
      .eq("platform", DEFAULT_PLATFORM)
      .order("published_at", { ascending: false })
      .limit(5),
    sb
      .from("social_listing_queue")
      .select("id", { count: "exact", head: true })
      .eq("market_id", DEFAULT_MARKET_ID)
      .eq("platform", DEFAULT_PLATFORM)
      .eq("status", "pending"),
    sb
      .from("social_listing_queue")
      .select("id", { count: "exact", head: true })
      .eq("market_id", DEFAULT_MARKET_ID)
      .eq("platform", DEFAULT_PLATFORM)
      .eq("status", "failed"),
    sb
      .from("social_listing_queue")
      .select("id, listing_id, listing_title, scheduled_at, status, permalink, error_message, image_urls")
      .eq("market_id", DEFAULT_MARKET_ID)
      .eq("platform", DEFAULT_PLATFORM)
      .order("scheduled_at", { ascending: false })
      .limit(5),
  ]);

  const firstError = [posts7d, latestPosts, pendingQueue, failedQueue, latestQueue].find((r) => r.error)?.error;
  if (firstError) throw new Error(firstError.message);

  return {
    platform: DEFAULT_PLATFORM,
    marketId: DEFAULT_MARKET_ID,
    posts7d: posts7d.count ?? 0,
    pending: pendingQueue.count ?? 0,
    failed: failedQueue.count ?? 0,
    latestPosts: latestPosts.data || [],
    latestQueue: latestQueue.data || [],
  };
}

async function publishCarousel(sb, body) {
  const { listingId, caption, imageUrls, brandFilter } = body;
  if (!listingId) throw new Error("listingId required");
  if (!caption || !caption.trim()) throw new Error("caption required");

  const existingPost = await getExistingPublishedPost(sb, listingId);
  if (existingPost) return existingPost;

  const ig = getInstagramConfig();
  if (!ig.configured) throw new Error("Instagram not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.");

  // Always fetch listing metadata (city/island for location tagging + image fallback)
  const { data: listingRow, error: dbErr } = await sb
    .from("v1_feed_cv")
    .select("image_urls, island, city")
    .eq("id", listingId)
    .maybeSingle();
  if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
  if (!listingRow) throw new Error(`Listing not found: ${listingId}`);

  const images = (Array.isArray(imageUrls) && imageUrls.length > 0)
    ? imageUrls.slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES)
    : dedupeImages((listingRow.image_urls || []).map(resolveImageUrl).filter(Boolean)).slice(0, INSTAGRAM_MAX_CAROUSEL_IMAGES);

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
      image_url: squareCrop(imageUrl, Boolean(brandFilter)),
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

  // Step 1b: poll all containers concurrently until FINISHED (sequential polling
  // of 7 images could exceed the function timeout).
  await Promise.all(containerIds.map((id) => waitUntilReady(ig, id)));

  // Step 2: create carousel container
  const locationId = (listingRow.city || listingRow.island)
    ? await findLocationId(listingRow.city, listingRow.island, ig.accessToken, ig.apiVersion)
    : null;
  if (locationId) console.log("[social-listing] location_id", locationId, "for", listingRow.city, listingRow.island);

  const createCarousel = async (withLocation) => {
    const params = new URLSearchParams({
      media_type: "CAROUSEL",
      caption: caption.trim(),
      children: containerIds.join(","),
      access_token: ig.accessToken,
    });
    if (withLocation && locationId) params.set("location_id", locationId);
    const res = await fetch(`${graphBase}/media`, { method: "POST", body: params });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && Boolean(data.id), status: res.status, data };
  };

  // Location tagging must never block a publish: if Instagram rejects the
  // location_id (our Place IDs are unverified estimates), retry without it.
  let carousel = await createCarousel(true);
  if (!carousel.ok && locationId) {
    console.error("[social-listing] carousel with location_id failed, retrying without:", carousel.data.error?.message);
    carousel = await createCarousel(false);
  }
  if (!carousel.ok) {
    throw new Error(carousel.data.error?.message || `Failed to create carousel container: HTTP ${carousel.status}`);
  }
  const carouselData = carousel.data;

  await waitUntilReady(ig, carouselData.id);

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

  // Auto-story is intentionally disabled: Instagram's API can only publish a
  // standalone image as a story — it cannot re-share the feed post with a
  // tappable link back to it (that's an app-only feature). Share the post to
  // story manually in the Instagram app to get the linked version.
  const storyPublished = false;

  // Step 5: log the publish in social_listing_posts (non-fatal if it fails)
  const { error: logErr } = await sb.from("social_listing_posts").insert({
    listing_id: listingId,
    platform: DEFAULT_PLATFORM,
    market_id: DEFAULT_MARKET_ID,
    external_post_id: publishData.id,
    permalink: permalink || null,
    caption: caption.trim(),
    image_urls: images,
  });
  if (logErr) console.error("[social-listing] Could not log publish:", logErr.message);

  return { postId: publishData.id, permalink, storyPublished };
}

// Publish ONE due queued post. A single carousel publish (with parallel image
// polling) finishes well under the function timeout, so the status update always
// runs — items never get stuck "pending". Running the cron every minute drains
// the queue one post at a time; each publish finishes before the next cron fires,
// so overlapping runs don't double-publish. Called directly by the cron handler
// (no internal HTTP hop) and by the process_queue action.
export async function processQueueOnce(sb) {
  const { data: items } = await sb
    .from("social_listing_queue")
    .select("*")
    .eq("status", "pending")
    .is("post_id", null)
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1);
  const item = (items || [])[0];
  if (!item) return { processed: 0 };

  // Atomic claim: flip post_id from NULL -> a claim marker, conditional on the
  // row still being unclaimed. If a concurrent cron run already claimed it, this
  // updates 0 rows and we bail — preventing the same post being published twice.
  const claimMarker = `CLAIM:${Date.now()}`;
  const { data: claimed } = await sb
    .from("social_listing_queue")
    .update({ post_id: claimMarker })
    .eq("id", item.id)
    .eq("status", "pending")
    .is("post_id", null)
    .select("id");
  if (!claimed || claimed.length === 0) {
    return { processed: 0, note: "already claimed by another run" };
  }

  // Resolve channels: fall back to the legacy platform column for old rows.
  const channels = resolveChannels(item.channels, item.platform || DEFAULT_PLATFORM);

  const channelErrors = [];
  let primaryPostId = null;
  let primaryPermalink = null;

  for (const channel of channels) {
    try {
      let result;
      if (channel === "instagram") {
        result = await publishCarousel(sb, {
          listingId: item.listing_id,
          caption: item.caption,
          imageUrls: item.image_urls,
          brandFilter: item.brand_filter,
        });
      } else if (channel === "tiktok") {
        result = await publishToTikTok(sb, {
          listingId: item.listing_id,
          caption: item.caption,
          imageUrls: item.image_urls,
          marketId: item.market_id,
        });
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }
      if (!primaryPostId) {
        primaryPostId = result.postId;
        primaryPermalink = result.permalink;
      }
      if (result.alreadyPublished) {
        console.warn(`[social-listing] ${channel} already published; marking queue row published`, item.id);
      }
      console.log(`[social-listing] ${channel} published`, item.id);
    } catch (err) {
      const msg = err.message || String(err);
      channelErrors.push(`${channel}: ${msg}`);
      console.error(`[social-listing] ${channel} failed`, item.id, msg);
    }
  }

  if (primaryPostId) {
    // At least one channel succeeded. Do not retry the row after a partial
    // success: external publish APIs are not transactional, and retrying can
    // create duplicate posts if a later channel or logging step is throttled.
    await sb.from("social_listing_queue").update({
      status: "published",
      post_id: primaryPostId,
      permalink: primaryPermalink,
      story_published: false,
      error_message: channelErrors.length > 0 ? channelErrors.join("; ") : null,
    }).eq("id", item.id);
    const published = channels.filter((c) => !channelErrors.some((e) => e.startsWith(`${c}:`)));
    return { processed: 1, id: item.id, status: "published", channels: published };
  }

  // Instagram throttling before any successful publish: back off the whole item
  // so the queue drains once the 25-posts/24h quota frees up.
  const igRateLimited = channelErrors.some(
    (e) => e.startsWith("instagram:") && /request limit|rate limit|too many requests/i.test(e)
  );
  if (igRateLimited) {
    const retryAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await sb.from("social_listing_queue").update({
      status: "pending",
      post_id: null,
      scheduled_at: retryAt,
      error_message: "Instagram rate limit reached — will retry automatically",
    }).eq("id", item.id);
    console.warn("[social-listing] rate limited, backing off", item.id, "until", retryAt);
    return { processed: 1, id: item.id, status: "rate_limited", retryAt };
  }

  // All channels failed.
  const allErrors = channelErrors.join("; ");
  await sb.from("social_listing_queue").update({
    status: "failed",
    post_id: null,
    error_message: allErrors,
  }).eq("id", item.id);
  console.error("[social-listing] queue all channels failed", item.id, allErrors);
  return { processed: 1, id: item.id, status: "failed", error: allErrors };
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
      const tt = getTikTokConfig();
      send(res, 200, {
        listings,
        published,
        instagram: { configured: ig.configured },
        tiktok: { configured: tt.configured },
      });
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (body.action === "summary") {
      send(res, 200, await getMarketingSummary(sb));
      return;
    }

    if (body.action === "generate_caption") {
      const { data: listing, error } = await sb
        .from("v1_feed_cv")
        .select("id, source_id, title, price, price_period, island, city, property_type, bedrooms, bathrooms, area_sqm, description")
        .eq("id", body.listingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!listing) throw new Error("Listing not found");
      send(res, 200, { caption: await buildCaption(listing) });
      return;
    }

    if (body.action === "publish_carousel") {
      const result = await publishCarousel(sb, body);
      send(res, 200, result);
      return;
    }

    if (body.action === "queue_carousel") {
      const { listingId, caption, imageUrls, scheduledAt, listingTitle, channels, brandFilter } = body;
      if (!listingId || !caption || !imageUrls?.length || !scheduledAt) {
        send(res, 400, { error: "listingId, caption, imageUrls, scheduledAt required" });
        return;
      }
      const resolvedChannels = resolveChannels(channels, body.platform || DEFAULT_PLATFORM);
      const marketId = body.marketId || DEFAULT_MARKET_ID;
      for (const channel of resolvedChannels) {
        const existingPost = await getExistingPublishedPost(sb, listingId, channel, marketId);
        if (existingPost) {
          send(res, 409, {
            error: `This listing has already been published to ${channel}.`,
            existingPost,
          });
          return;
        }
        const activeQueue = await getActiveQueuedPost(sb, listingId, channel, marketId);
        if (activeQueue) {
          send(res, 409, {
            error: activeQueue.status === "pending"
              ? `This listing is already queued for ${channel}.`
              : `This listing has already been published to ${channel}.`,
            queueId: activeQueue.id,
            status: activeQueue.status,
          });
          return;
        }
      }
      const { data, error } = await sb.from("social_listing_queue").insert({
        listing_id: listingId,
        listing_title: listingTitle || null,
        caption: caption.trim(),
        image_urls: imageUrls,
        scheduled_at: scheduledAt,
        market_id: marketId,
        platform: resolvedChannels[0],
        channels: resolvedChannels,
        brand_filter: Boolean(brandFilter),
      }).select("id, scheduled_at").single();
      if (error) {
        if (error.code === "23505") {
          send(res, 409, { error: "This listing is already queued or published on this channel." });
          return;
        }
        throw new Error(error.message);
      }
      send(res, 200, { queued: true, id: data.id, scheduledAt: data.scheduled_at });
      return;
    }

    if (body.action === "list_queue") {
      const { data, error } = await sb
        .from("social_listing_queue")
        .select("id, listing_id, listing_title, caption, scheduled_at, status, permalink, story_published, error_message, image_urls, brand_filter")
        .order("scheduled_at", { ascending: true })
        .limit(50);
      if (error) throw new Error(error.message);
      send(res, 200, { items: data || [] });
      return;
    }

    if (body.action === "update_queue") {
      const queueId = body.queueId || body.id;
      if (!queueId) { send(res, 400, { error: "queueId required" }); return; }
      const patch = {};
      if (body.listingId) patch.listing_id = body.listingId;
      if (typeof body.caption === "string") patch.caption = body.caption.trim();
      if (Array.isArray(body.imageUrls)) patch.image_urls = body.imageUrls;
      if (body.scheduledAt) patch.scheduled_at = body.scheduledAt;
      if (typeof body.brandFilter === "boolean") patch.brand_filter = body.brandFilter;
      const { error } = await sb
        .from("social_listing_queue")
        .update(patch)
        .eq("id", queueId)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      send(res, 200, { updated: true });
      return;
    }

    if (body.action === "remove_from_queue") {
      const id = body.id || body.queueId;
      if (!id) { send(res, 400, { error: "id required" }); return; }
      const { error } = await sb
        .from("social_listing_queue")
        .delete()
        .eq("id", id)
        .in("status", ["pending", "failed"]);
      if (error) throw new Error(error.message);
      send(res, 200, { removed: true });
      return;
    }

    if (body.action === "clear_published") {
      const { error } = await sb.from("social_listing_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw new Error(error.message);
      send(res, 200, { cleared: true });
      return;
    }

    if (body.action === "clear_failed") {
      const { error } = await sb
        .from("social_listing_queue")
        .delete()
        .eq("status", "failed");
      if (error) throw new Error(error.message);
      send(res, 200, { cleared: true });
      return;
    }

    if (body.action === "process_queue") {
      const cronSecret = process.env.CRON_SECRET;
      const auth = req.headers?.authorization || "";
      if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
        send(res, 401, { error: "Unauthorized" });
        return;
      }
      const result = await processQueueOnce(sb);
      send(res, 200, result);
      return;
    }

    send(res, 400, { error: "Unknown action" });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
