/**
 * Shared enrichment + PT-translation logic for market_news candidates.
 *
 * Used by ingest_market_news.ts (--enrich flag) via ts-node.
 *
 * Note: the same prompts are duplicated in arei-admin/api/enrich-candidate.js
 * (the Vercel serverless function). Cross-package imports from Vercel functions
 * are avoided to keep the build boundary clean.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface EnrichInput {
  title: string;
  original_title?: string | null;
  snippet: string;
  source_name: string;
  source_url: string;
  category: string;
  published_at?: string | null;
  language?: string | null;
  ingestion_source?: string | null;
}

export interface EnrichResult {
  title: string;
  snippet: string;
  why_it_matters: string;
  category: string;
  signal_tags: string[];
  affected_regions: string[];
  relevance_score: number;
  enrich_recommendation: "publish" | "keep_candidate" | "archive";
  reasoning: string;
  title_pt: string | null;
  snippet_pt: string | null;
  why_it_matters_pt: string | null;
  /** Set when PT translation failed (non-fatal). */
  _pt_error?: string;
}

// ── System prompts ─────────────────────────────────────────────────────────
// Keep in sync with arei-admin/api/enrich-candidate.js

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
  "snippet": "2–4 sentences summarising the news, drawing concrete detail from the article body when present: what happened, who did it, where, and any specific figures, dates or named projects. Plain and factual, no long government-style run-on sentences. This is the Instagram caption body, so make it a complete little summary, not a one-line teaser.",
  "why_it_matters": "1–2 sentences of market intelligence for a foreign investor, buyer or broker. Open directly with the market implication — never with an explainer phrase. Connect to market context only when reasonable. Use cautious language when the link to property is indirect. Do not claim every story directly changes property prices. Example tone: 'Luxury inventory moving across Sal signals where foreign buyer demand and high-end capital may be concentrating.'",
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
- Summarise the news in 2–4 sentences. It is the Instagram caption body, so it should read as a complete little summary, not a one-line teaser.
- Draw concrete detail from the article body when present: actor, action, location, and specific figures, dates or named projects.
- Use short, plain sentences — several short ones, not one long compound sentence copied from a government press release.

Why it matters rules:
- Write for a foreign investor, buyer or broker who does not know Cape Verde well.
- The goal is to help outside investors understand Cape Verde — not to force every story into a property-price argument.
- Good connections include: tourism, infrastructure, aviation and access, public investment, regulation, government capacity and transparency, the cultural and visitor economy, foreign investment activity, and property-market context when it genuinely applies.
- Use cautious language when the connection is indirect. It is fine to say the story helps investors understand how the country is developing.
- Do not pretend every story directly affects property prices or demand.
- Open directly with the market implication. Lead with what the development signals for demand, capital, access, supply or risk — not with a framing phrase.
- The tone is AREI / CVREI market intelligence: institutional, concise, investor-grade. Not a beginner explainer or newsletter bot.
- NEVER open with or include explainer scaffolding. The following phrases are forbidden in this field (and any casing/variant of them):
  - "This matters because"
  - "Why it matters"
  - "This is important because"
- Good example: "Luxury inventory moving across Sal signals where foreign buyer demand and high-end capital may be concentrating."
- Weak example to avoid: "This matters because the sale could attract foreign buyers interested in Cape Verde's real estate market."

Avoid these words and phrases in all fields:
- will boost property demand
- proves market growth
- directly increases property values
- confirms investor confidence
- world-class / major breakthrough / game changer
- lauds / commends / exemplary (bureaucratic tone)
- This matters because
- Why it matters
- This is important because
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
  - Government capacity, education, culture, public administration, institutional development
  - The item may be useful background but needs human judgment to assess market relevance

Use "archive" when:
  - Crime, health incidents, disease/outbreaks, accidents or disasters, celebrity or sports gossip
  - Generic travel content or lifestyle articles
  - Title-only or near-empty RSS items
  - Unrelated international news with no Cape Verde market angle

A health, disease/outbreak, crime, accident or disaster story is ALWAYS "archive",
even if it mentions tourism, travel, the economy or their "impact"/"concerns". A
tangential tourism or economic angle does NOT make a disease or crime story relevant
for a property investor. Example: "Hantavirus outbreak on cruise ship raises tourism
concerns" → archive.

Category guardrail:
  - "category" MUST be exactly one of: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit.
  - Foreign investment, aviation, hospitality, construction and currency risk are THEMES, not categories. Capture them in "signal_tags".

Phrasing guardrail:
  - Do not write "can attract foreign investment" unless the source clearly supports that connection.
  - For indirect items, use language like: "This is indirect context for investors" or "The link to the property market is not direct."`;

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

// ── Validation ─────────────────────────────────────────────────────────────

const REQUIRED_EN_FIELDS = [
  "title", "snippet", "why_it_matters", "category",
  "signal_tags", "affected_regions", "relevance_score",
  "recommendation", "reasoning",
] as const;

const VALID_RECOMMENDATIONS = ["publish", "keep_candidate", "archive"] as const;
const VALID_CATEGORIES = ["Economy", "Tourism", "Infrastructure", "Policy & Tax", "Banking & Credit"] as const;

function validateEnResponse(obj: Record<string, unknown>): string | null {
  for (const field of REQUIRED_EN_FIELDS) {
    if (!(field in obj)) return `Missing required field: ${field}`;
  }
  if (!VALID_RECOMMENDATIONS.includes(obj.recommendation as never)) {
    return `Invalid recommendation: "${obj.recommendation}"`;
  }
  if (!VALID_CATEGORIES.includes(obj.category as never)) {
    return `Invalid category: "${obj.category}"`;
  }
  const score = Number(obj.relevance_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return `relevance_score must be 0–100, got: ${obj.relevance_score}`;
  }
  if (!Array.isArray(obj.signal_tags)) return "signal_tags must be an array";
  if (!Array.isArray(obj.affected_regions)) return "affected_regions must be an array";
  return null;
}

function validatePtResponse(obj: Record<string, unknown>): string | null {
  for (const field of ["title_pt", "snippet_pt", "why_it_matters_pt"] as const) {
    if (!(field in obj)) return `Missing required field: ${field}`;
    if (obj[field] !== null && typeof obj[field] !== "string") {
      return `${field} must be string or null`;
    }
  }
  return null;
}

// ── OpenAI EN enrichment ───────────────────────────────────────────────────

export async function enrichCandidate(
  input: EnrichInput,
  openaiKey: string
): Promise<Omit<EnrichResult, "title_pt" | "snippet_pt" | "why_it_matters_pt" | "_pt_error">> {
  const userMessage = [
    `Title: ${input.title}`,
    `Original title: ${input.original_title ?? "(none)"}`,
    `Snippet: ${input.snippet}`,
    `Source: ${input.source_name}`,
    `URL: ${input.source_url}`,
    `Current category: ${input.category}`,
    `Published: ${input.published_at ?? "(unknown)"}`,
    `Language: ${input.language ?? "(unknown)"}`,
    `Ingestion source: ${input.ingestion_source ?? "(unknown)"}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ENRICH_SYSTEM_PROMPT },
        { role: "user", content: `Candidate:\n${userMessage}` },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty content in OpenAI response");

  const raw = JSON.parse(content) as Record<string, unknown>;

  const validationError = validateEnResponse(raw);
  if (validationError) throw new Error(`OpenAI response failed validation: ${validationError}`);

  return {
    title:                raw.title as string,
    snippet:              raw.snippet as string,
    why_it_matters:       raw.why_it_matters as string,
    category:             raw.category as string,
    signal_tags:          raw.signal_tags as string[],
    affected_regions:     raw.affected_regions as string[],
    relevance_score:      Math.round(Number(raw.relevance_score)),
    enrich_recommendation: raw.recommendation as EnrichResult["enrich_recommendation"],
    reasoning:            raw.reasoning as string,
  };
}

// ── Anthropic PT translation ───────────────────────────────────────────────

export async function translateToPt(
  fields: { title: string; snippet: string; why_it_matters: string },
  anthropicKey: string
): Promise<{ title_pt: string | null; snippet_pt: string | null; why_it_matters_pt: string | null }> {
  const userMessage = [
    `title: ${fields.title}`,
    `snippet: ${fields.snippet}`,
    `why_it_matters: ${fields.why_it_matters}`,
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      temperature: 0.1,
      system: PT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic PT request failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { content?: { type: string; text: string }[] };
  const text = (data.content ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  if (!text) throw new Error("Empty content in Anthropic PT response");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Anthropic PT response contained no JSON");
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  }

  const ptErr = validatePtResponse(parsed);
  if (ptErr) throw new Error(`PT response failed validation: ${ptErr}`);

  return {
    title_pt:          parsed.title_pt as string | null,
    snippet_pt:        parsed.snippet_pt as string | null,
    why_it_matters_pt: parsed.why_it_matters_pt as string | null,
  };
}

// ── Combined entry point ───────────────────────────────────────────────────

/**
 * Enrich + PT-translate a candidate in one call.
 * PT translation is non-fatal: if it fails, EN fields are returned with
 * null PT fields and _pt_error set.
 * Throws on OpenAI failure.
 */
export async function enrichAndTranslate(
  input: EnrichInput,
  openaiKey: string,
  anthropicKey: string | null
): Promise<EnrichResult> {
  const en = await enrichCandidate(input, openaiKey);

  const result: EnrichResult = {
    ...en,
    title_pt: null,
    snippet_pt: null,
    why_it_matters_pt: null,
  };

  if (en.enrich_recommendation !== "archive" && anthropicKey) {
    try {
      const pt = await translateToPt(
        { title: en.title, snippet: en.snippet, why_it_matters: en.why_it_matters },
        anthropicKey
      );
      result.title_pt          = pt.title_pt;
      result.snippet_pt        = pt.snippet_pt;
      result.why_it_matters_pt = pt.why_it_matters_pt;
    } catch (err) {
      result._pt_error = err instanceof Error ? err.message : String(err);
    }
  }

  return result;
}
