/**
 * fetch-url-candidate
 *
 * POST { url: string }
 *
 * Fetches the given URL, extracts OG/meta fields, runs EN enrichment via
 * OpenAI and PT translation via Anthropic, inserts a 'candidate' row into
 * public.market_news, and returns the full saved row.
 *
 * Dedup: if the normalised URL already exists in market_news (any status),
 * returns 409 with { error: "duplicate", canonical_url }.
 *
 * Auth: bearer token (Supabase JWT) or admin_session cookie.
 *
 * Env required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *   ANTHROPIC_API_KEY
 *   ADMIN_SESSION_SECRET  (cookie auth)
 */

import { createClient } from "@supabase/supabase-js";

// ── Constants ──────────────────────────────────────────────────────────────

const COOKIE_NAME     = "admin_session";
const FETCH_TIMEOUT   = 12_000;
const USER_AGENT      = "AREI-MarketNewsBot/1.0 (+https://capeverderealestateindex.com)";
const DEFAULT_COUNTRY = "CV";

// ── Helpers ────────────────────────────────────────────────────────────────

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const m = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(m && m[1] === secret);
}

async function authorizeRequest(req, sb) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true, user: null };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: userData, error } = await sb.auth.getUser(token);
  if (error || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow } = await sb
    .from("admin_users")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, user: userData.user };
}

// ── URL normalisation ──────────────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "utm_id", "fbclid", "gclid", "gbraid", "wbraid", "msclkid", "twclid",
  "mc_cid", "mc_eid", "ref", "_hsenc", "_hsmi",
]);

function normalizeUrl(raw) {
  try {
    const url = new URL(raw.trim());
    for (const k of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(k)) url.searchParams.delete(k);
    }
    url.hash = "";
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    url.hostname = url.hostname.toLowerCase();
    url.protocol = url.protocol.toLowerCase();
    return url.toString();
  } catch {
    return raw.trim().toLowerCase();
  }
}

// ── Meta extraction from raw HTML ──────────────────────────────────────────

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Extract a single <meta> content value by property or name attribute.
 * Handles both attribute orderings.
 */
function getMeta(html, prop) {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+(?:property|name)=["']${esc}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function getPageTitle(html) {
  const m = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
  return m?.[1] ? decodeEntities(m[1].trim()) : null;
}

/**
 * Derive a human-readable source name from a URL hostname.
 * e.g. "www.inforpress.cv" → "Inforpress"
 */
function hostnameToSourceName(hostname) {
  return hostname
    .replace(/^www\./, "")
    .replace(/\.[^.]+$/, "")          // strip TLD
    .split(/[-.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractPageMeta(html, pageUrl) {
  const title       = getMeta(html, "og:title") || getPageTitle(html) || "";
  const description = getMeta(html, "og:description") || getMeta(html, "description") || "";
  const siteName    = getMeta(html, "og:site_name") ||
                      hostnameToSourceName(new URL(pageUrl).hostname);
  const lang        = getMeta(html, "og:locale")?.slice(0, 2).toLowerCase() || "en";

  return { title, description, siteName, lang };
}

// ── Fetch page ─────────────────────────────────────────────────────────────

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.statusText = res.statusText;
      throw err;
    }
    // Read only the first 100 KB — enough for <head> meta tags
    const reader  = res.body?.getReader();
    const chunks  = [];
    let totalRead = 0;
    const MAX     = 100 * 1024;
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalRead += value.length;
        if (totalRead >= MAX) { reader.cancel().catch(() => {}); break; }
      }
    }
    const bytes = new Uint8Array(totalRead);
    let offset = 0;
    for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    return new TextDecoder().decode(bytes);
  } finally {
    clearTimeout(timer);
  }
}

function isManualMetadata(body) {
  return Boolean(
    body?.manual === true ||
    body?.manual_metadata === true ||
    body?.title ||
    body?.snippet ||
    body?.sourceName ||
    body?.source_name
  );
}

function buildManualMeta(body, pageUrl) {
  const title = (body.title || "").toString().trim();
  if (!title) {
    const err = new Error("Title is required when the article cannot be fetched automatically.");
    err.status = 400;
    throw err;
  }

  const sourceName = (body.sourceName || body.source_name || "").toString().trim() ||
    hostnameToSourceName(new URL(pageUrl).hostname);
  const description = (body.snippet || body.description || "").toString().trim();
  const lang = (body.language || "en").toString().slice(0, 2).toLowerCase() || "en";

  return { title, description, siteName: sourceName, lang };
}

// ── OpenAI enrichment ──────────────────────────────────────────────────────
// Prompts duplicated from scripts/lib/market-news-enrich.ts.
// Cross-package TypeScript imports are avoided to keep the Vercel build clean.

const ENRICH_SYSTEM_PROMPT = `You are an editorial assistant for the Cape Verde Real Estate Index (AREI). \
AREI helps foreign investors, buyers and market observers understand what is happening in Cape Verde.

Your job: take raw local news — which may be in Portuguese, English, French, or another language — \
and rewrite it in plain English so that an outside investor can understand it quickly.

You are translating meaning, not words. Write clearly. Use short sentences. Avoid jargon. \
Do not make it sound like a government report or academic paper.

Output ONLY a single JSON object. No markdown fences. No preamble. No trailing text.

Required fields:
{
  "title": "short plain-English headline, max ~10 words, no bureaucratic phrasing, no sensationalism",
  "snippet": "1–2 simple sentences. State what happened, who did it, and where if relevant.",
  "why_it_matters": "1–2 sentences of market intelligence for a foreign investor, buyer or broker. Open directly with the market implication — never with explainer scaffolding such as 'This matters because', 'Why it matters' or 'This is important because'. Institutional, concise, investor-grade tone. Example: 'Luxury inventory moving across Sal signals where foreign buyer demand and high-end capital may be concentrating.'",
  "category": "exactly one of: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit",
  "signal_tags": ["3–5 short market signal phrases"],
  "affected_regions": ["Cape Verde islands or regions directly affected — empty array if national or unclear"],
  "relevance_score": <integer 0–100>,
  "recommendation": "publish" or "keep_candidate" or "archive",
  "reasoning": "1–2 sentences explaining your recommendation"
}

Category: MUST be exactly one of the 5 values: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit.
Use "publish" only for clear direct market signals (aviation, hotels, real estate, foreign investment, infrastructure, tax/residency, credit, major tourism data).
Use "keep_candidate" for plausible country context with indirect property link.
Use "archive" for crime, health incidents, gossip, generic travel content, or unrelated international news.`;

function buildEnrichUserMessage(input) {
  return [
    `Candidate:`,
    `Title: ${input.title || "(none)"}`,
    `Original title: ${input.original_title || "(none)"}`,
    `Snippet: ${input.snippet || "(none)"}`,
    `Source: ${input.source_name || "(unknown)"}`,
    `URL: ${input.source_url || "(unknown)"}`,
    `Current category: ${input.category || "(unknown)"}`,
    `Published: ${input.published_at || "(unknown)"}`,
    `Language: ${input.language || "(unknown)"}`,
    `Ingestion source: ${input.ingestion_source || "(unknown)"}`,
  ].join("\n");
}

const ENRICH_REQUIRED_FIELDS = [
  "title", "snippet", "why_it_matters", "category",
  "signal_tags", "affected_regions", "relevance_score",
  "recommendation", "reasoning",
];
const VALID_RECOMMENDATIONS = ["publish", "keep_candidate", "archive"];

function parseJson(text) {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Response did not contain JSON");
  return JSON.parse(m[0]);
}

function validateEnrich(obj) {
  for (const f of ENRICH_REQUIRED_FIELDS) {
    if (!(f in obj)) return `Missing field: ${f}`;
  }
  if (!VALID_RECOMMENDATIONS.includes(obj.recommendation)) return `Invalid recommendation: "${obj.recommendation}"`;
  const score = Number(obj.relevance_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return `relevance_score must be 0–100`;
  if (!Array.isArray(obj.signal_tags))      return "signal_tags must be an array";
  if (!Array.isArray(obj.affected_regions)) return "affected_regions must be an array";
  return null;
}

async function callEnrich(input, openaiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ENRICH_SYSTEM_PROMPT },
        { role: "user",   content: buildEnrichUserMessage(input) },
      ],
      temperature: 0.3,
      max_tokens:  800,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data    = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  const parsed  = parseJson(content);
  const err     = validateEnrich(parsed);
  if (err) throw new Error(`Enrichment validation: ${err}`);
  parsed.relevance_score = Math.round(Number(parsed.relevance_score));
  return parsed;
}

// ── PT translation ─────────────────────────────────────────────────────────

const PT_SYSTEM_PROMPT = `You are a professional Portuguese translator specialising in business and real estate content for Cape Verde.

Translate the provided English text into European Portuguese (Portugal standard, pt-PT).
Use clear, natural language suited for property investors and market observers.

Rules:
- Translate meaning faithfully. Do not add, omit, or editorialize.
- Use European Portuguese spelling and vocabulary (not Brazilian).
  Prefer: "imóvel", "apartamento", "vivenda", "terreno".
- Preserve proper nouns unchanged: Cape Verde, Sal, Boa Vista, Santiago,
  São Vicente, Fogo, Mindelo, Santa Maria, Praia, AREI.
- Preserve numbers, currencies, percentages, and dates exactly as written.
- Do not use gerunds as verbal forms (Brazilian pattern) — use infinitive or finite verb constructions.
- If why_it_matters source is null or "(none)", return null for why_it_matters_pt — do not invent content.

Output ONLY a single JSON object. No markdown. No preamble.

{
  "title_pt":          "translated headline",
  "snippet_pt":        "translated snippet",
  "why_it_matters_pt": "translated why it matters, or null if source was null"
}`;

function buildPtUserMessage(fields) {
  return [
    `title: ${fields.title || "(none)"}`,
    `snippet: ${fields.snippet || "(none)"}`,
    `why_it_matters: ${fields.why_it_matters || "(none)"}`,
  ].join("\n");
}

function validatePt(obj) {
  for (const f of ["title_pt", "snippet_pt", "why_it_matters_pt"]) {
    if (!(f in obj)) return `Missing field: ${f}`;
    if (obj[f] !== null && typeof obj[f] !== "string") return `${f} must be string or null`;
  }
  return null;
}

async function callTranslatePt(fields, anthropicKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "x-api-key":       anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0.1,
      system:     PT_SYSTEM_PROMPT,
      messages:   [{ role: "user", content: buildPtUserMessage(fields) }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const data   = await res.json();
  const text   = (data.content || []).filter((p) => p.type === "text").map((p) => p.text).join("\n");
  if (!text) throw new Error("Empty Anthropic response");
  const parsed = parseJson(text);
  const err    = validatePt(parsed);
  if (err) throw new Error(`PT validation: ${err}`);
  return parsed;
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const openaiKey    = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!openaiKey)    return send(res, 500, { error: "OPENAI_API_KEY is not configured" });
  if (!anthropicKey) return send(res, 500, { error: "ANTHROPIC_API_KEY is not configured" });

  let sb;
  try { sb = getSupabase(); } catch (err) {
    return send(res, 500, { error: err?.message ?? "Supabase config error" });
  }

  const auth = await authorizeRequest(req, sb);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rawUrl = (body.url || "").toString().trim();
  if (!rawUrl) return send(res, 400, { error: "url is required" });

  let canonicalUrl;
  try {
    canonicalUrl = normalizeUrl(rawUrl);
    new URL(canonicalUrl); // validate parseable
  } catch {
    return send(res, 400, { error: "Invalid URL" });
  }

  // ── Dedup ────────────────────────────────────────────────────────────────

  const { data: existing } = await sb
    .from("market_news")
    .select("id, status")
    .or(`canonical_url.eq.${canonicalUrl},source_url.eq.${canonicalUrl}`)
    .maybeSingle();

  if (existing) {
    return send(res, 409, {
      error:         "duplicate",
      canonical_url: canonicalUrl,
      existing_id:   existing.id,
      existing_status: existing.status,
    });
  }

  // ── Fetch page ────────────────────────────────────────────────────────────

  let meta;
  const manualMetadata = isManualMetadata(body);
  if (manualMetadata) {
    try {
      meta = buildManualMeta(body, canonicalUrl);
    } catch (err) {
      return send(res, err?.status || 400, { error: err?.message ?? String(err) });
    }
  } else {
    let html;
    try {
      html = await fetchPage(canonicalUrl);
    } catch (err) {
      const upstreamStatus = Number(err?.status || 0);
      if (upstreamStatus === 401 || upstreamStatus === 403 || upstreamStatus === 451) {
        return send(res, 502, {
          error: "The publisher blocked automatic fetching. Add the URL manually with the article title and excerpt.",
          code: "upstream_blocked",
          upstream_status: upstreamStatus,
        });
      }
      return send(res, 502, {
        error: `Failed to fetch URL: ${err?.message ?? String(err)}`,
        code: "upstream_fetch_failed",
        upstream_status: upstreamStatus || null,
      });
    }

    meta = extractPageMeta(html, canonicalUrl);
  }

  if (!meta.title) {
    return send(res, 422, { error: "Could not extract a title from the page. Check that the URL is a news article." });
  }

  const snippet     = meta.description.slice(0, 500) || meta.title;
  const sourceName  = meta.siteName;
  const hostname    = new URL(canonicalUrl).hostname;

  // ── Enrichment ────────────────────────────────────────────────────────────

  let enriched;
  try {
    enriched = await callEnrich({
      title:            meta.title,
      original_title:   meta.title,
      snippet,
      source_name:      sourceName,
      source_url:       canonicalUrl,
      category:         "Economy",
      published_at:     null,
      language:         meta.lang,
      ingestion_source: "manual_url",
    }, openaiKey);
  } catch (err) {
    return send(res, 502, { error: `Enrichment failed: ${err?.message ?? String(err)}` });
  }

  // ── PT translation ────────────────────────────────────────────────────────

  let pt = { title_pt: null, snippet_pt: null, why_it_matters_pt: null };
  if (enriched.recommendation !== "archive") {
    try {
      pt = await callTranslatePt({
        title:          enriched.title,
        snippet:        enriched.snippet,
        why_it_matters: enriched.why_it_matters ?? null,
      }, anthropicKey);
    } catch (err) {
      // Non-fatal: proceed with EN-only
      console.warn("[fetch-url-candidate] PT translation failed:", err?.message ?? String(err));
    }
  }

  // ── Insert candidate ──────────────────────────────────────────────────────

  const row = {
    title:            enriched.title,
    original_title:   meta.title,
    source_name:      sourceName,
    source_url:       canonicalUrl,
    canonical_url:    canonicalUrl,
    published_at:     null,
    category:         enriched.category,
    snippet:          enriched.snippet,
    why_it_matters:   enriched.why_it_matters ?? null,
    status:           "candidate",
    language:         meta.lang || "en",
    country_code:     DEFAULT_COUNTRY,
    affected_regions: enriched.affected_regions ?? [],
    signal_tags:      enriched.signal_tags ?? [],
    ingestion_source: "manual_url",
    title_pt:         pt.title_pt,
    snippet_pt:       pt.snippet_pt,
    why_it_matters_pt: pt.why_it_matters_pt,
    enriched_at:           new Date().toISOString(),
    relevance_score:       enriched.relevance_score ?? null,
    enrich_recommendation: enriched.recommendation ?? null,
  };

  const { data: inserted, error: insertErr } = await sb
    .from("market_news")
    .insert(row)
    .select("id,title,original_title,source_name,source_url,canonical_url,published_at,category,snippet,why_it_matters,status,relevance,language,country_code,affected_regions,signal_tags,ingestion_source,created_at,title_pt,snippet_pt,why_it_matters_pt,enriched_at,relevance_score,enrich_recommendation")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return send(res, 409, { error: "duplicate", canonical_url: canonicalUrl });
    }
    return send(res, 500, { error: `Insert failed: ${insertErr.message}` });
  }

  return send(res, 200, { candidate: inserted });
}
