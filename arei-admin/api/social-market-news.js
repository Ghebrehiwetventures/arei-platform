import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "admin_session";
const PROMPT_VERSION = "market-news-social-v1";
const DEFAULT_COUNTRY = "Cape Verde";
const DEFAULT_REGION = "West Africa";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for social draft admin API");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorizeRequest(req, sb) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true, user: null, reviewer: "admin_session" };
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: userData, error: userError } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: adminRow, error: adminError } = await sb
    .from("admin_users")
    .select("role,email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) {
    throw new Error(`Could not verify admin user: ${adminError.message}`);
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return {
    ok: true,
    user,
    reviewer: cleanText(adminRow.email) || user.email || user.id,
    role: adminRow.role || null,
  };
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).slice(0, 12);
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map(cleanText)
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function firstText(row, keys) {
  for (const key of keys) {
    const value = cleanText(row?.[key]);
    if (value) return value;
  }
  return "";
}

function normalizeMarketNewsItem(row) {
  const sourceTitle = firstText(row, ["title", "headline", "source_title", "name"]);
  const whatHappened =
    firstText(row, ["what_happened", "factual_summary", "snippet", "summary", "description"]) || sourceTitle;
  const whyItMatters = firstText(row, ["why_it_matters", "investor_relevance", "relevance", "context"]);
  const sourceName = firstText(row, ["source_name", "source", "publisher", "publication", "origin"]);
  const sourceUrl = firstText(row, ["source_url", "url", "link", "original_url"]);
  const country = firstText(row, ["country", "market"]) || DEFAULT_COUNTRY;

  return {
    id: String(row.id ?? row.uuid ?? row.slug ?? sourceTitle),
    sourceTitle,
    sourceName,
    sourceUrl,
    country,
    region: firstText(row, ["region"]) || DEFAULT_REGION,
    category: firstText(row, ["category", "topic"]),
    tags: cleanTags(row.tags),
    whatHappened,
    whyItMatters,
    status: firstText(row, ["status", "published_status"]),
    reviewStatus: firstText(row, ["review_status"]),
    publishedAt: firstText(row, ["published_at", "published_date", "date"]),
  };
}

function isCapeVerdeItem(item) {
  const country = item.country.toLowerCase();
  return !country || country.includes("cape verde") || country.includes("cabo verde") || country === "cv";
}

function validateSourceItem(item) {
  const missing = [];
  if (!item.id) missing.push("id");
  if (!item.sourceTitle) missing.push("title");
  if (!item.sourceName) missing.push("source_name");
  if (!item.sourceUrl) missing.push("source_url");
  if (!item.whatHappened) missing.push("what_happened");
  if (!item.whyItMatters) missing.push("why_it_matters");
  if (!isCapeVerdeItem(item)) missing.push("country_cape_verde_only");
  return missing;
}

async function listMarketNewsItems(sb) {
  const { data, error } = await sb.from("market_news").select("*");
  if (error) {
    return { items: [], error: `Could not load market_news: ${error.message}` };
  }
  const items = (data || [])
    .map(normalizeMarketNewsItem)
    .filter(isCapeVerdeItem)
    .sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  return { items, error: null };
}

async function listDrafts(sb) {
  const { data, error } = await sb
    .from("market_news_social_drafts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return { drafts: [], error: `Could not load market_news_social_drafts: ${error.message}` };
  }
  return { drafts: data || [], error: null };
}

function getProviderConfig(provider) {
  const openaiReady = Boolean(process.env.OPENAI_API_KEY);
  const anthropicReady = Boolean(process.env.ANTHROPIC_API_KEY);
  const selected =
    provider === "anthropic" || provider === "openai"
      ? provider
      : openaiReady
        ? "openai"
        : anthropicReady
          ? "anthropic"
          : "";

  if (selected === "openai" && openaiReady) {
    return {
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      ready: true,
    };
  }
  if (selected === "anthropic" && anthropicReady) {
    return {
      provider: "anthropic",
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      ready: true,
    };
  }
  return {
    provider: selected || "none",
    model: "",
    ready: false,
  };
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
    apiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || "v20.0",
    defaultImageUrl: process.env.INSTAGRAM_DEFAULT_IMAGE_URL || "",
  };
}

function configStatus() {
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const instagram = getInstagramConfig();
  return {
    llm: {
      openaiConfigured: openai,
      anthropicConfigured: anthropic,
      defaultProvider: openai ? "openai" : anthropic ? "anthropic" : null,
    },
    instagram: {
      configured: instagram.configured,
      hasDefaultImageUrl: Boolean(instagram.defaultImageUrl),
      requiresImageUrl: true,
    },
  };
}

function generationSystemPrompt() {
  return [
    "You create source-linked social drafts for AREI's Cape Verde Market News.",
    "Tone: institutional, investor-facing, simple English, calm, low-hype.",
    "Rules: no investment advice, no recommendations to buy/sell, no unsupported price or return claims.",
    "Avoid generic 'Africa is rising' language, fake urgency, exaggerated superlatives, and claims not supported by the input.",
    "Separate facts from interpretation. Preserve source and context.",
    "Return strict JSON only with keys: instagram_feed_caption, instagram_story_outline, instagram_carousel_outline, linkedin_post, x_post.",
  ].join("\n");
}

function generationUserPrompt(item) {
  return JSON.stringify(
    {
      task: "Generate platform-specific social draft variants from this Cape Verde Market News item.",
      item: {
        title: item.sourceTitle,
        what_happened: item.whatHappened,
        why_it_matters: item.whyItMatters,
        source_name: item.sourceName,
        source_url: item.sourceUrl,
        country: item.country,
        region: item.region,
        category: item.category,
        tags: item.tags,
      },
      output_rules: {
        instagram_feed_caption:
          "Short caption. Include 'What happened', 'Why it matters', and 'Source'. No more than 900 characters.",
        instagram_story_outline:
          "Three frames: What happened, Why it matters, Read more/source. Plain text outline.",
        instagram_carousel_outline:
          "Three to five slides: headline, what happened, why it matters, investor context, source/read more.",
        linkedin_post:
          "Serious source-linked post. Slightly longer. Clearly label fact/context. Include source name and URL.",
        x_post:
          "Short single post if possible. Include source name and link. No thread unless necessary.",
      },
    },
    null,
    2
  );
}

function extractJson(text) {
  const trimmed = cleanText(text);
  if (!trimmed) throw new Error("LLM returned empty content");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("LLM response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function validateGeneratedVariants(value) {
  const keys = [
    "instagram_feed_caption",
    "instagram_story_outline",
    "instagram_carousel_outline",
    "linkedin_post",
    "x_post",
  ];
  const variants = {};
  for (const key of keys) {
    const text = cleanText(value?.[key]);
    if (!text) throw new Error(`LLM response missing ${key}`);
    variants[key] = text;
  }
  return variants;
}

async function generateWithOpenAI(item, model) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: generationSystemPrompt() },
        { role: "user", content: generationUserPrompt(item) },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI request failed with ${response.status}`);
  }
  return validateGeneratedVariants(extractJson(data.choices?.[0]?.message?.content));
}

async function generateWithAnthropic(item, model) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system: generationSystemPrompt(),
      messages: [{ role: "user", content: generationUserPrompt(item) }],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `Anthropic request failed with ${response.status}`);
  }
  const text = (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  return validateGeneratedVariants(extractJson(text));
}

async function generateVariants(item, provider) {
  const config = getProviderConfig(provider);
  if (!config.ready) {
    throw new Error("No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
  }
  const variants =
    config.provider === "openai"
      ? await generateWithOpenAI(item, config.model)
      : await generateWithAnthropic(item, config.model);
  return { variants, provider: config.provider, model: config.model };
}

function variantRows(item, generation, mediaUrl) {
  const base = {
    market_news_item_id: item.id,
    source_title: item.sourceTitle,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    country: DEFAULT_COUNTRY,
    region: item.region || DEFAULT_REGION,
    category: item.category || null,
    tags: item.tags || [],
    what_happened: item.whatHappened,
    why_it_matters: item.whyItMatters,
    approval_status: "pending",
    publish_status: "not_published",
    model_provider: generation.provider,
    model_name: generation.model,
    prompt_version: PROMPT_VERSION,
    media_url: mediaUrl || getInstagramConfig().defaultImageUrl || null,
  };
  return [
    ["instagram", "instagram_feed_caption", generation.variants.instagram_feed_caption],
    ["instagram", "instagram_story_outline", generation.variants.instagram_story_outline],
    ["instagram", "instagram_carousel_outline", generation.variants.instagram_carousel_outline],
    ["linkedin", "linkedin_post", generation.variants.linkedin_post],
    ["x", "x_post", generation.variants.x_post],
  ].map(([platform, draftType, text]) => ({
    ...base,
    platform,
    draft_type: draftType,
    generated_text: text,
    editable_text: text,
  }));
}

async function loadItemById(sb, itemId) {
  const { data, error } = await sb.from("market_news").select("*").eq("id", itemId).maybeSingle();
  if (error) throw new Error(`Could not load market_news item: ${error.message}`);
  if (!data) throw new Error("Market News item not found");
  return normalizeMarketNewsItem(data);
}

async function loadDraftById(sb, draftId) {
  const { data, error } = await sb.from("market_news_social_drafts").select("*").eq("id", draftId).maybeSingle();
  if (error) throw new Error(`Could not load social draft: ${error.message}`);
  if (!data) throw new Error("Social draft not found");
  return data;
}

async function updateDraftText(sb, body) {
  const draft = await loadDraftById(sb, body.draftId);
  if (draft.publish_status === "published") {
    throw new Error("Published drafts cannot be edited. Create a new draft revision instead.");
  }
  const editableText = cleanText(body.editableText);
  if (!editableText) throw new Error("Draft text cannot be empty");
  const resetApproval = draft.approval_status === "approved" && editableText !== draft.editable_text;
  const payload = {
    editable_text: editableText,
    updated_at: new Date().toISOString(),
    ...(resetApproval
      ? {
          approval_status: "pending",
          approved_by: null,
          approved_at: null,
          publish_status: "not_published",
          publish_error_message: null,
        }
      : {}),
  };
  const { data, error } = await sb.from("market_news_social_drafts").update(payload).eq("id", body.draftId).select("*").single();
  if (error) throw new Error(`Could not update draft: ${error.message}`);
  return data;
}

async function setApprovalStatus(sb, body, status) {
  const draft = await loadDraftById(sb, body.draftId);
  if (draft.publish_status === "published" && status !== "approved") {
    throw new Error("Published drafts cannot be rejected or reset");
  }
  if (status === "approved") {
    if (!cleanText(draft.source_url)) throw new Error("Cannot approve a draft without source URL");
    if (!cleanText(draft.editable_text)) throw new Error("Cannot approve an empty draft");
  }
  const now = new Date().toISOString();
  const payload = {
    approval_status: status,
    updated_at: now,
    ...(status === "approved"
      ? {
          approved_by: cleanText(body.approvedBy) || process.env.ADMIN_REVIEWER_NAME || "admin",
          approved_at: now,
          publish_error_message: null,
        }
      : {
          approved_by: null,
          approved_at: null,
          publish_error_message: null,
          publish_status: draft.publish_status === "published" ? "published" : "not_published",
        }),
  };
  const { data, error } = await sb.from("market_news_social_drafts").update(payload).eq("id", body.draftId).select("*").single();
  if (error) throw new Error(`Could not update approval: ${error.message}`);
  return data;
}

async function publishInstagram(sb, body) {
  const draft = await loadDraftById(sb, body.draftId);
  const now = new Date().toISOString();

  function failStatus(message, status = "failed") {
    return sb
      .from("market_news_social_drafts")
      .update({
        publish_status: status,
        publish_attempted_at: now,
        publish_error_message: message,
        updated_at: now,
      })
      .eq("id", draft.id)
      .select("*")
      .single();
  }

  if (draft.platform !== "instagram" || draft.draft_type !== "instagram_feed_caption") {
    const { data } = await failStatus("Only approved Instagram feed captions can be published to Instagram");
    return { draft: data, errorStatus: 400 };
  }
  if (draft.approval_status !== "approved") {
    const { data } = await failStatus("Draft must be approved before Instagram publishing");
    return { draft: data, errorStatus: 400 };
  }
  if (!cleanText(draft.source_url)) {
    const { data } = await failStatus("Draft source URL is required before Instagram publishing");
    return { draft: data, errorStatus: 400 };
  }

  const ig = getInstagramConfig();
  if (!ig.configured) {
    const { data } = await failStatus(
      "Instagram publishing is not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
      "not_configured"
    );
    return { draft: data, errorStatus: 400 };
  }

  const imageUrl = cleanText(body.mediaUrl) || cleanText(draft.media_url) || ig.defaultImageUrl;
  if (!imageUrl) {
    const { data } = await failStatus(
      "Instagram feed publishing requires a public image URL. Set draft media_url or INSTAGRAM_DEFAULT_IMAGE_URL."
    );
    return { draft: data, errorStatus: 400 };
  }

  await sb
    .from("market_news_social_drafts")
    .update({
      publish_status: "publishing",
      publish_attempted_at: now,
      publish_error_message: null,
      media_url: imageUrl,
      updated_at: now,
    })
    .eq("id", draft.id);

  const graphBase = `https://graph.facebook.com/${ig.apiVersion}/${ig.accountId}`;
  try {
    const createParams = new URLSearchParams({
      image_url: imageUrl,
      caption: draft.editable_text,
      access_token: ig.accessToken,
    });
    const createRes = await fetch(`${graphBase}/media`, {
      method: "POST",
      body: createParams,
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createData.id) {
      throw new Error(createData.error?.message || `Instagram media container creation failed with ${createRes.status}`);
    }

    const publishParams = new URLSearchParams({
      creation_id: createData.id,
      access_token: ig.accessToken,
    });
    const publishRes = await fetch(`${graphBase}/media_publish`, {
      method: "POST",
      body: publishParams,
    });
    const publishData = await publishRes.json().catch(() => ({}));
    if (!publishRes.ok || !publishData.id) {
      throw new Error(publishData.error?.message || `Instagram media publish failed with ${publishRes.status}`);
    }

    let permalink = "";
    const permalinkRes = await fetch(
      `https://graph.facebook.com/${ig.apiVersion}/${publishData.id}?fields=permalink&access_token=${encodeURIComponent(
        ig.accessToken
      )}`
    );
    if (permalinkRes.ok) {
      const permalinkData = await permalinkRes.json().catch(() => ({}));
      permalink = cleanText(permalinkData.permalink);
    }

    const { data, error } = await sb
      .from("market_news_social_drafts")
      .update({
        publish_status: "published",
        published_at: new Date().toISOString(),
        external_platform_post_id: publishData.id,
        external_platform_permalink: permalink || null,
        publish_error_message: null,
        media_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .select("*")
      .single();
    if (error) throw new Error(`Published, but failed to record status: ${error.message}`);
    return { draft: data, errorStatus: 0 };
  } catch (err) {
    const { data } = await failStatus(err?.message || String(err));
    return { draft: data, errorStatus: 502 };
  }
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
      const [itemsResult, draftsResult] = await Promise.all([listMarketNewsItems(sb), listDrafts(sb)]);
      send(res, 200, {
        items: itemsResult.items,
        drafts: draftsResult.drafts,
        config: configStatus(),
        warnings: [itemsResult.error, draftsResult.error].filter(Boolean),
      });
      return;
    }

    if (req.method !== "POST") {
      send(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const action = cleanText(body.action);

    if (action === "generate") {
      const item = await loadItemById(sb, body.itemId);
      const missing = validateSourceItem(item);
      if (missing.length > 0) {
        send(res, 400, { error: `Cannot generate social drafts. Missing: ${missing.join(", ")}` });
        return;
      }
      const generation = await generateVariants(item, body.provider);
      await sb
        .from("market_news_social_drafts")
        .delete()
        .eq("market_news_item_id", item.id)
        .neq("publish_status", "published");
      const rows = variantRows(item, generation, cleanText(body.mediaUrl));
      const { data, error } = await sb.from("market_news_social_drafts").insert(rows).select("*");
      if (error) throw new Error(`Could not store generated drafts: ${error.message}`);
      send(res, 200, { drafts: data || [], config: configStatus() });
      return;
    }

    if (action === "update") {
      const draft = await updateDraftText(sb, body);
      send(res, 200, { draft });
      return;
    }

    if (action === "approve") {
      const draft = await setApprovalStatus(sb, { ...body, approvedBy: body.approvedBy || auth.reviewer }, "approved");
      send(res, 200, { draft });
      return;
    }

    if (action === "reject") {
      const draft = await setApprovalStatus(sb, body, "rejected");
      send(res, 200, { draft });
      return;
    }

    if (action === "reset") {
      const draft = await setApprovalStatus(sb, body, "pending");
      send(res, 200, { draft });
      return;
    }

    if (action === "publish_instagram") {
      const result = await publishInstagram(sb, body);
      send(res, result.errorStatus || 200, result.errorStatus ? { draft: result.draft, error: result.draft?.publish_error_message } : { draft: result.draft });
      return;
    }

    send(res, 400, { error: "Unknown action" });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
