/**
 * POST /api/enrich-candidate
 *
 * Calls OpenAI with a raw market news candidate and returns structured
 * editorial suggestions, then calls Claude (Anthropic) to translate the
 * three key fields into European Portuguese.
 * Never reads or writes the database.
 * Uses OPENAI_API_KEY and ANTHROPIC_API_KEY from the server environment.
 */

const SYSTEM_PROMPT = `You are an editorial assistant for the Cape Verde Real Estate Index (AREI). \
AREI helps foreign investors, buyers and market observers understand what is happening in Cape Verde.

Your job: take raw local news — which may be in Portuguese, English, French, or another language — \
and rewrite it in plain English so that an outside investor can understand it quickly.

You are translating meaning, not words. Write clearly. Use short sentences. Avoid jargon. \
Do not make it sound like a government report or academic paper.

Output ONLY a single JSON object. No markdown fences. No preamble. No trailing text.

Required fields:
{
  "title": "short plain-English headline, max ~10 words, no bureaucratic phrasing, no sensationalism",
  "snippet": "1–2 simple sentences. State what happened, who did it, and where if relevant. No long government-style sentences.",
  "why_it_matters": "1–2 sentences written for a foreign investor, buyer or broker. Start with 'This matters because' or similar plain framing. Connect to market context only when reasonable. Use cautious language when the link to property is indirect. Do not claim every story directly changes property prices.",
  "category": "exactly one of: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit",
  "signal_tags": ["3–5 short market signal phrases, e.g. Air connectivity, Tourism demand, Resort development"],
  "affected_regions": ["Cape Verde islands or regions directly affected, e.g. Sal, Boa Vista, Santiago, São Vicente, Fogo — leave empty array if impact is national or unclear"],
  "relevance_score": <integer 0–100 where 100 = directly and clearly affects Cape Verde real estate, tourism, or investment>,
  "recommendation": "publish" or "keep_candidate" or "archive",
  "reasoning": "1–2 sentences explaining your recommendation"
}

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
- Be conservative. When in doubt, use keep_candidate.

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
  - Crime, health incidents, celebrity or sports gossip
  - Generic travel content or lifestyle articles
  - Title-only or near-empty RSS items
  - Unrelated international news with no Cape Verde market angle

Category guardrail:
  - "category" MUST be exactly one of the 5 values: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit. Never invent other values.
  - Mapping guidance: macro / currency / fiscal-economy → Economy; hotels, resorts, hospitality, visitor demand → Tourism; aviation, airports, ports, energy, utilities, construction → Infrastructure; regulation, residency, property tax, legal framework → Policy & Tax; mortgages, credit, banking conditions → Banking & Credit.
  - Foreign investment, aviation, hospitality, construction and currency risk are THEMES, not categories. Capture them in "signal_tags" (e.g. "Foreign investment", "Air connectivity"), and still pick the single best-fit category from the 5.

Phrasing guardrail:
  - Do not write "can attract foreign investment" or similar phrases unless the source clearly supports that connection.
  - For indirect items, use language like: "This is indirect context for investors" or "The link to the property market is not direct."`;

// ── Article body fetcher ───────────────────────────────────────────────────
// Fetches the source URL and extracts readable article text so OpenAI has
// the full article content rather than just the RSS snippet.
// Non-fatal: returns null on any error.

const ARTICLE_FETCH_TIMEOUT = 10_000;
const ARTICLE_MAX_BYTES = 200 * 1024; // 200 KB
const USER_AGENT = "AREI-MarketNewsBot/1.0 (+https://capeverderealestateindex.com)";

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

function extractArticleText(html) {
  // Pull text from <p> tags — reasonable proxy for article body on most news sites
  const paragraphs = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = pRe.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text.length > 40) paragraphs.push(text);
  }
  const body = paragraphs.join(" ").slice(0, 3000); // cap at ~3000 chars
  return body || null;
}

async function fetchArticleBody(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const reader = res.body?.getReader();
      if (!reader) return null;
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
      const html = new TextDecoder().decode(bytes);
      return extractArticleText(html);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

function buildUserMessage(body, articleBody) {
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

function validateSuggestion(obj) {
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

  // ── Fetch article body (non-fatal) ─────────────────────────────────────────
  const articleBody = body.source_url ? await fetchArticleBody(body.source_url) : null;

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

async function translateToPt(apiKey, { title, snippet, why_it_matters }) {
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
