/**
 * POST /api/enrich-candidate
 *
 * Calls OpenAI with a raw market news candidate and returns structured
 * editorial suggestions, then calls Claude (Anthropic) to translate the
 * three key fields into European Portuguese.
 * Never reads or writes the database.
 * Uses OPENAI_API_KEY and ANTHROPIC_API_KEY from the server environment.
 */

export const SYSTEM_PROMPT = `You are an editorial assistant for the Cape Verde Real Estate Index (AREI). \
AREI helps foreign investors, buyers and market observers understand what is happening in Cape Verde.

Your job: take raw local news — which may be in Portuguese, English, French, or another language — \
and rewrite it in plain English so that an outside investor can understand it quickly.

Work in two stages. FIRST extract the concrete Cape-Verde-relevant facts from the input. \
THEN write the title and snippet from those extracted facts. The headline and summary must reflect \
what the facts actually say about Cape Verde — not the generic angle of the original headline.

You are translating meaning, not words. Write clearly. Use short sentences. Avoid jargon. \
Do not make it sound like a government report or academic paper.

Output ONLY a single JSON object. No markdown fences. No preamble. No trailing text.

Required fields:
{
  "title": "short plain-English headline, max ~12 words, no bureaucratic phrasing, no sensationalism",
  "snippet": "1–2 simple sentences. State what happened, who did it, and where if relevant. No long government-style sentences.",
  "why_it_matters": "1–2 sentences written for a foreign investor, buyer or broker. Start with 'This matters because' or similar plain framing. Connect to market context only when reasonable. Use cautious language when the link to property is indirect. Do not claim every story directly changes property prices.",
  "category": "exactly one of: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit",
  "signal_tags": ["3–5 short market signal phrases, e.g. Air connectivity, Tourism demand, Resort development"],
  "affected_regions": ["Cape Verde islands or regions directly affected, e.g. Sal, Boa Vista, Santiago, São Vicente, Fogo — leave empty array if impact is national or unclear"],
  "key_facts": [
    {
      "fact": "what the fact states, e.g. 'Cape Verde ranks 6th in Africa by hotel pipeline rooms'",
      "value": "the number or value if any, e.g. 6 or 4328 — omit when there is no number",
      "unit": "unit for the value if any, e.g. 'rooms', 'hotels', '%' — omit when not applicable",
      "geography": "the place the fact is about, e.g. 'Cape Verde' — omit when unclear",
      "source_text": "a short verbatim excerpt from the provided input that supports this fact",
      "confidence": "high | medium | low"
    }
  ],
  "cape_verde_angle": "one sentence explaining the specific Cape Verde relevance, or null if Cape Verde is only weakly or indirectly relevant",
  "relevance_score": <integer 0–100 where 100 = directly and clearly affects Cape Verde real estate, tourism, or investment>,
  "recommendation": "publish" or "keep_candidate" or "archive",
  "reasoning": "1–2 sentences explaining your recommendation"
}

Fact extraction (do this FIRST, before writing the title and snippet):
- Read the title, the snippet, and the "Article body" section if it is present.
- Extract concrete, Cape-Verde-relevant facts into "key_facts". A fact is concrete when it has a number, ranking, named institution, named project, date, or a specific comparison.
- If the input contains a Cape Verde ranking, hotel or room count, project count, construction percentage, investment figure, tourism demand signal, or named institution, you MUST extract it as a fact.
- Every fact must be present in the provided input. Never invent figures, rankings, actors, dates or places. If unsure, lower the confidence or omit the fact entirely.
- "source_text" must be a short verbatim excerpt copied from the provided input — do not paraphrase it.
- If no concrete Cape Verde facts exist in the input, return an empty "key_facts" array and set "cape_verde_angle" to null.

Render title and snippet FROM the extracted facts:
- Prefer specific Cape Verde facts (numbers, rankings, named projects) over generic "Africa real estate" or "across the continent" language.
- When strong facts exist, lead with the most investor-relevant one.
  Example good title: "Cape Verde ranks sixth in Africa hotel pipeline with 4,328 planned rooms".
  Example weak title to avoid: "Africa's hotel development reaches record high".
- The snippet should state the key facts plainly and, where useful, note what they imply for Cape Verde (e.g. strong planned investment but limited near-term delivery). Do not overstate certainty.
- Base relevance_score on the full available content, including the article body — not only the RSS headline. An article that names Cape Verde with concrete figures is more relevant than its generic headline suggests.

Title rules:
- Short and clear.
- Plain English. No sensationalism.
- No bureaucratic or overly formal phrasing.
- Example good title: "Cape Verde Approves New Artist Statute"
- Example bad title: "Government Lauds Regulatory Body's Exemplary Performance"

Snippet rules:
- Summarise what happened in 1–2 simple sentences.
- Include the actor, the action and the location if relevant.
- Avoid long compound sentences copied from government press releases.
- Example good snippet: "Cape Verde's Vice Prime Minister praised ARAP, the public procurement regulator, for recent progress and professional certification work."
- Example bad snippet: "The Vice Prime Minister of Cape Verde commended the Public Procurement Regulatory Agency for its notable regulatory achievements and ongoing capacity-building endeavours."

Why it matters rules:
- Write for a foreign investor, buyer or broker who does not know Cape Verde well.
- The goal is to help outside investors understand Cape Verde — not to force every story into a property-price argument.
- Good connections include: tourism, infrastructure, aviation and access, public investment, regulation, government capacity and transparency, the cultural and visitor economy, foreign investment activity, and property-market context when it genuinely applies.
- Use cautious language when the connection is indirect. It is fine to say the story helps investors understand how the country is developing.
- Do not pretend every story directly affects property prices or demand.
- "This matters because..." is a natural way to open, but do not force it every time. Write in a way that feels human and clear, not templated. Vary the phrasing when it reads better.

Avoid these words and phrases in all fields:
- will boost property demand
- proves market growth
- directly increases property values
- confirms investor confidence
- world-class
- major breakthrough
- game changer
- lauds / commends / exemplary (bureaucratic tone)
- any phrase that overstates certainty about market impact

Relevance score and recommendation rules:
- Do not invent facts. Use only the information provided.
- Be conservative. When in doubt about investor relevance, prefer "archive" over "keep_candidate" for items with no concrete Cape Verde market angle.
- Score on INVESTOR MATERIALITY: would a foreign property, tourism, or business investor in Cape Verde actually care about or act on this? If not, it is not relevant for AREI — score it low and archive it, even if "Cape Verde" appears in the text.
- Cape Verde must be a PRIMARY subject with a concrete real-estate, tourism, aviation/connectivity, infrastructure, investment, tax/residency, or banking angle. If Cape Verde is only mentioned in passing, listed among several countries, or the core story is health, crime, disaster, disease/outbreak, accidents, sports, or celebrity news, set relevance_score below 15 and recommendation = "archive".
- When the facts genuinely support it, frame the title and snippet as an opportunity or positive signal for an investor — but never invent positivity, hype, or certainty.

Use "publish" ONLY when the article has a clear and direct market signal in one of these areas:
  - Aviation or connectivity (new routes, airport investment, airline capacity)
  - Hotels, resorts, or hospitality development
  - Real estate agencies, property market structure, or property transactions
  - Foreign investment projects (must be clearly stated in the source)
  - Infrastructure that directly affects access, utilities, ports, airports, or tourism
  - Tax, residency, or property regulation
  - Credit, mortgage, or banking conditions
  - A major, concrete tourism demand signal (visitor numbers, large booking data, flagship event)
  - A major macro or fiscal signal with a clear and direct investment angle

Use "keep_candidate" when:
  - The item is plausible country context but the property or investment link is indirect
  - The article is about government capacity, education, culture, public administration, institutional development, or general social policy
  - The item may be useful background for understanding Cape Verde but needs human judgment to assess market relevance
  Examples: artist statutes, cultural legislation, education centres, public administration reform, regulatory body achievements, procurement process improvements

Use "archive" when:
  - Crime, health incidents, disease outbreaks, accidents or disasters, celebrity or sports gossip
  - Generic travel content or lifestyle articles
  - Multi-country roundups or international news where Cape Verde is only one name in a list, with no Cape-Verde-specific market fact
  - Title-only or near-empty RSS items
  - Unrelated international news with no Cape Verde market angle

Category guardrail:
  - "category" MUST be exactly one of the 5 values: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit. Never invent other values.
  - Mapping guidance: macro / currency / fiscal-economy → Economy; hotels, resorts, hospitality, visitor demand → Tourism; aviation, airports, ports, energy, utilities, construction → Infrastructure; regulation, residency, property tax, legal framework → Policy & Tax; mortgages, credit, banking conditions → Banking & Credit.
  - Foreign investment, aviation, hospitality, construction and currency risk are THEMES, not categories. Capture them in "signal_tags" (e.g. "Foreign investment", "Air connectivity"), and still pick the single best-fit category from the 5.

Phrasing guardrail:
  - Do not write "can attract foreign investment" or similar phrases unless the source clearly supports that connection.
  - For indirect items, use language like: "This is indirect context for investors" or "The link to the property market is not direct."`;

// ── Structured logging ──────────────────────────────────────────────────────
// Emits the named pipeline events so fulltext success/failure is observable in
// server logs. Never throws.

export function logEvent(event, detail) {
  try {
    console.log(`[enrich-candidate] ${event}${detail ? " " + JSON.stringify(detail) : ""}`);
  } catch {
    console.log(`[enrich-candidate] ${event}`);
  }
}

// ── Source URL resolution (Google News → publisher) ─────────────────────────
// Google News RSS items link to news.google.com/rss/articles/<id>, not the real
// publisher article. Fetching that URL yields no article body, so we resolve it
// to the publisher URL first. Best-effort with graceful fallback.

const ARTICLE_FETCH_TIMEOUT = 10_000;
const ARTICLE_MAX_BYTES = 200 * 1024; // 200 KB
const ARTICLE_MIN_CHARS = 200;        // below this, body is too weak — fall back to snippet
const USER_AGENT = "AREI-MarketNewsBot/1.0 (+https://capeverderealestateindex.com)";

function isGoogleNewsUrl(rawUrl) {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    return h === "news.google.com" || h.endsWith(".news.google.com");
  } catch {
    return false;
  }
}

function isOffGoogle(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return !h.endsWith("google.com") && !h.endsWith("gstatic.com") && !h.endsWith("googleapis.com");
  } catch {
    return false;
  }
}

/**
 * Best-effort offline decode of the publisher URL embedded in a Google News
 * /articles/<id> path. Older Google News IDs base64url-decode to a binary blob
 * that contains the publisher URL as readable text. Returns null for the newer
 * encrypted ID format, which cannot be decoded offline.
 */
export function decodeGoogleNewsUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    if (!seg || seg.length < 16) return null;
    let b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = Buffer.from(b64, "base64").toString("latin1");
    const matches = decoded.match(/https?:\/\/[\x21-\x7e]+/g);
    if (!matches) return null;
    for (const raw of matches) {
      // Trim trailing protobuf/binary junk: keep only valid URL characters.
      const clean = raw.replace(/[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%].*$/, "");
      if (clean.length > 12 && isOffGoogle(clean)) return clean;
    }
    return null;
  } catch {
    return null;
  }
}

function extractPublisherLinkFromHtml(html) {
  if (!html) return null;
  // Google News interstitial pages expose the target via data-n-au, or via a
  // single external <a href>.
  const nau = html.match(/data-n-au=["'](https?:\/\/[^"']+)["']/i);
  if (nau && isOffGoogle(nau[1])) return nau[1];
  const hrefs = html.match(/href=["'](https?:\/\/[^"']+)["']/gi) || [];
  for (const h of hrefs) {
    const m = h.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (m && isOffGoogle(m[1])) return m[1];
  }
  return null;
}

/**
 * Resolve a candidate source URL to the real publisher URL when it is a Google
 * News link. Returns { url, resolved, method }. Falls back to the original URL
 * on any failure — never throws.
 */
export async function resolvePublisherUrl(rawUrl, { fetchImpl = fetch } = {}) {
  if (!rawUrl) {
    logEvent("source_url_resolution_skipped", { reason: "no_url" });
    return { url: rawUrl, resolved: false };
  }
  if (!isGoogleNewsUrl(rawUrl)) {
    logEvent("source_url_resolution_skipped", { reason: "not_google_news" });
    return { url: rawUrl, resolved: false };
  }

  // Attempt 1: offline base64 decode (no network).
  const decoded = decodeGoogleNewsUrl(rawUrl);
  if (decoded) {
    logEvent("source_url_resolved_to_publisher", { method: "decode", url: decoded });
    logEvent("source_url_resolution_success", { method: "decode" });
    return { url: decoded, resolved: true, method: "decode" };
  }

  // Attempt 2: follow redirects, then inspect the final URL and interstitial HTML.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT);
    let res;
    try {
      res = await fetchImpl(rawUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    const finalUrl = res?.url || "";
    if (finalUrl && isOffGoogle(finalUrl)) {
      logEvent("source_url_resolved_to_publisher", { method: "redirect", url: finalUrl });
      logEvent("source_url_resolution_success", { method: "redirect" });
      return { url: finalUrl, resolved: true, method: "redirect" };
    }
    const html = typeof res?.text === "function" ? await res.text() : "";
    const link = extractPublisherLinkFromHtml(html);
    if (link) {
      logEvent("source_url_resolved_to_publisher", { method: "html", url: link });
      logEvent("source_url_resolution_success", { method: "html" });
      return { url: link, resolved: true, method: "html" };
    }
    logEvent("source_url_resolution_failed", { reason: "no_publisher_link" });
    return { url: rawUrl, resolved: false };
  } catch (err) {
    logEvent("source_url_resolution_failed", { reason: err?.message ?? String(err) });
    return { url: rawUrl, resolved: false };
  }
}

// ── Article body fetcher ───────────────────────────────────────────────────
// Fetches the (resolved) article URL and extracts readable article text so
// OpenAI has the full article content rather than just the RSS snippet.
// Non-fatal: returns null on any error.

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function extractArticleText(html) {
  if (!html) return null;
  // Pull text from <p> tags — reasonable proxy for article body on most news sites.
  // Drop obvious boilerplate (nav, footer, cookie, newsletter, ad text).
  const BOILERPLATE = /\b(cookie|subscribe|newsletter|sign up|advertisement|all rights reserved|privacy policy|terms of service|follow us|share this)\b/i;
  const paragraphs = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRe.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text.length > 40 && !BOILERPLATE.test(text)) paragraphs.push(text);
  }
  const body = paragraphs.join(" ").slice(0, 3000); // cap at ~3000 chars
  return body || null;
}

/**
 * Fetch the article URL and extract readable body text.
 * Returns null on any failure (timeout, non-200, empty/too-short body). The
 * caller treats null as "fall back to snippet-only enrichment".
 */
export async function fetchArticleBody(url, { fetchImpl = fetch } = {}) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT);
    try {
      const res = await fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
        signal: controller.signal,
      });
      if (!res.ok) {
        logEvent("fulltext_fetch_failed", { url, status: res.status });
        return null;
      }

      // Prefer streaming (caps download); fall back to text() for mocked responses.
      let html;
      if (res.body?.getReader) {
        const reader = res.body.getReader();
        const chunks = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          chunks.push(value);
          total += value.length;
          if (total >= ARTICLE_MAX_BYTES) { reader.cancel().catch(() => {}); break; }
        }
        const bytes = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { bytes.set(c, off); off += c.length; }
        html = new TextDecoder().decode(bytes);
      } else if (typeof res.text === "function") {
        html = (await res.text()).slice(0, ARTICLE_MAX_BYTES * 4);
      } else {
        logEvent("fulltext_fetch_failed", { url, reason: "no_body" });
        return null;
      }

      const text = extractArticleText(html);
      if (!text || text.length < ARTICLE_MIN_CHARS) {
        logEvent("fulltext_empty_or_too_short", { url, length: text ? text.length : 0 });
        return null;
      }
      logEvent("fulltext_fetch_success", { url, length: text.length });
      return text;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    logEvent("fulltext_fetch_failed", { url, reason: err?.message ?? String(err) });
    return null;
  }
}

export function buildUserMessage(body, articleBody) {
  const lines = [
    `Title: ${body.title || "(none)"}`,
    `Original title: ${body.original_title || "(none)"}`,
    `Snippet: ${body.snippet || "(none)"}`,
    `Source: ${body.source_name || "(unknown)"}`,
    `URL: ${body.source_url || "(unknown)"}`,
    `Current category: ${body.category || "(unknown)"}`,
    `Published: ${body.published_at || "(unknown)"}`,
    `Language: ${body.language || "(unknown)"}`,
    `Ingestion source: ${body.ingestion_source || "(unknown)"}`,
  ];
  if (articleBody) {
    lines.push(`\nArticle body (extracted from source URL):\n${articleBody}`);
  }
  return `Candidate:\n${lines.join("\n")}`;
}

const REQUIRED_FIELDS = [
  "title",
  "snippet",
  "why_it_matters",
  "category",
  "signal_tags",
  "affected_regions",
  "relevance_score",
  "recommendation",
  "reasoning",
];
const VALID_RECOMMENDATIONS = ["publish", "keep_candidate", "archive"];

export function validateSuggestion(obj) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) return `Missing required field: ${field}`;
  }
  if (!VALID_RECOMMENDATIONS.includes(obj.recommendation)) {
    return `Invalid recommendation value: "${obj.recommendation}"`;
  }
  const score = Number(obj.relevance_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return `relevance_score must be an integer 0–100, got: ${obj.relevance_score}`;
  }
  if (!Array.isArray(obj.signal_tags)) return "signal_tags must be an array";
  if (!Array.isArray(obj.affected_regions)) return "affected_regions must be an array";
  return null;
}

const VALID_CONFIDENCE = ["high", "medium", "low"];

/**
 * Sanitise the optional structured-extraction fields in place. These are NOT
 * required for a valid suggestion — a model that omits them must not cause the
 * enrichment to fail — so malformed values are coerced/dropped rather than
 * rejected. Returns the same object for convenience.
 */
export function normalizeSuggestion(suggestion) {
  const rawFacts = Array.isArray(suggestion.key_facts) ? suggestion.key_facts : [];
  suggestion.key_facts = rawFacts
    .filter((f) => f && typeof f === "object" && typeof f.fact === "string" && f.fact.trim())
    .map((f) => {
      const fact = { fact: f.fact.trim() };
      if (f.value !== undefined && f.value !== null && f.value !== "") fact.value = f.value;
      if (typeof f.unit === "string" && f.unit.trim()) fact.unit = f.unit.trim();
      if (typeof f.geography === "string" && f.geography.trim()) fact.geography = f.geography.trim();
      if (typeof f.source_text === "string" && f.source_text.trim()) fact.source_text = f.source_text.trim();
      fact.confidence = VALID_CONFIDENCE.includes(f.confidence) ? f.confidence : "low";
      return fact;
    });

  suggestion.cape_verde_angle =
    typeof suggestion.cape_verde_angle === "string" && suggestion.cape_verde_angle.trim()
      ? suggestion.cape_verde_angle.trim()
      : null;

  return suggestion;
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return send(res, 500, { error: "OPENAI_API_KEY is not configured on the server" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (!body.title) {
    return send(res, 400, { error: "title is required" });
  }

  // ── Resolve publisher URL + fetch article body (both non-fatal) ────────────
  let articleBody = null;
  let resolvedUrl = body.source_url || null;
  if (body.source_url) {
    const resolution = await resolvePublisherUrl(body.source_url);
    resolvedUrl = resolution.url || body.source_url;
    articleBody = await fetchArticleBody(resolvedUrl);
    if (!articleBody) logEvent("fallback_to_snippet", { url: resolvedUrl });
  }

  // ── Call OpenAI ────────────────────────────────────────────────────────────

  let aiResponse;
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(body, articleBody) },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return send(res, 502, {
        error: `OpenAI request failed (HTTP ${response.status})`,
        detail: errText.slice(0, 300),
      });
    }

    aiResponse = await response.json();
  } catch (err) {
    return send(res, 502, {
      error: "Failed to reach OpenAI API",
      detail: err?.message ?? String(err),
    });
  }

  // ── Parse and validate response ────────────────────────────────────────────

  let suggestion;
  try {
    const content = aiResponse?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty content in OpenAI response");
    suggestion = JSON.parse(content);
  } catch (err) {
    return send(res, 502, {
      error: "Failed to parse AI response as JSON",
      detail: err?.message ?? String(err),
    });
  }

  const validationError = validateSuggestion(suggestion);
  if (validationError) {
    return send(res, 502, { error: `AI response failed validation: ${validationError}` });
  }

  // Coerce score to a safe integer before returning
  suggestion.relevance_score = Math.round(Number(suggestion.relevance_score));

  // Sanitise the optional structured-extraction fields, then attach the
  // server-computed provenance fields (not produced by the model).
  normalizeSuggestion(suggestion);
  suggestion.article_body_used = Boolean(articleBody);
  if (resolvedUrl && resolvedUrl !== body.source_url) {
    suggestion.resolved_source_url = resolvedUrl;
  }

  // ── PT translation via Claude API ─────────────────────────────────────────
  // Only translate if the article is worth showing (not archive).
  // Soft failure: if translation fails the enrich response still goes through.
  if (suggestion.recommendation !== "archive") {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const ptResult = await translateToPt(anthropicKey, {
          title: suggestion.title,
          snippet: suggestion.snippet,
          why_it_matters: suggestion.why_it_matters ?? null,
        });
        suggestion.title_pt = ptResult.title_pt;
        suggestion.snippet_pt = ptResult.snippet_pt;
        suggestion.why_it_matters_pt = ptResult.why_it_matters_pt;
      } catch (err) {
        // Non-fatal: log warning, return EN-only enrichment
        suggestion._pt_translation_error = err?.message ?? String(err);
      }
    }
  }

  return send(res, 200, suggestion);
}

// ── PT translation ─────────────────────────────────────────────────────────

const PT_SYSTEM_PROMPT = `You are a professional Portuguese translator specialising in business and real estate content for Cape Verde.

Translate the provided English text into European Portuguese (Portugal standard, pt-PT).
Use clear, natural language suited for property investors and market observers.

Rules:
- Translate meaning faithfully. Do not add, omit, or editorialize.
- Use European Portuguese spelling and vocabulary (not Brazilian).
  Prefer: "imóvel" not "imóveil", "apartamento", "vivenda", "terreno".
- Preserve proper nouns unchanged: Cape Verde, Sal, Boa Vista, Santiago,
  São Vicente, Fogo, Mindelo, Santa Maria, Praia, AREI.
- Preserve numbers, currencies, percentages, and dates exactly as written.
- Do not use gerunds as verbal forms (Brazilian pattern) — use infinitive
  or finite verb constructions.
- If why_it_matters source is null or "(none)", return null for
  why_it_matters_pt — do not invent content.

Output ONLY a single JSON object. No markdown. No preamble.

{
  "title_pt":          "translated headline",
  "snippet_pt":        "translated snippet",
  "why_it_matters_pt": "translated why it matters, or null if source was null"
}`;

function buildPtUserMessage({ title, snippet, why_it_matters }) {
  return [
    `title: ${title || "(none)"}`,
    `snippet: ${snippet || "(none)"}`,
    `why_it_matters: ${why_it_matters || "(none)"}`,
  ].join("\n");
}

const PT_REQUIRED_FIELDS = ["title_pt", "snippet_pt", "why_it_matters_pt"];

function validatePtSuggestion(obj) {
  for (const field of PT_REQUIRED_FIELDS) {
    if (!(field in obj)) return `Missing required field: ${field}`;
  }
  if (obj.title_pt !== null && typeof obj.title_pt !== "string") return "title_pt must be string or null";
  if (obj.snippet_pt !== null && typeof obj.snippet_pt !== "string") return "snippet_pt must be string or null";
  if (obj.why_it_matters_pt !== null && typeof obj.why_it_matters_pt !== "string") return "why_it_matters_pt must be string or null";
  return null;
}

export async function translateToPt(apiKey, { title, snippet, why_it_matters }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0.1,
      system: PT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildPtUserMessage({ title, snippet, why_it_matters }) },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic PT request failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  if (!text) throw new Error("Empty content in Anthropic PT response");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Anthropic PT response did not contain JSON");
    parsed = JSON.parse(match[0]);
  }

  const validationError = validatePtSuggestion(parsed);
  if (validationError) throw new Error(`PT response failed validation: ${validationError}`);

  return parsed;
}
