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
  recommendation: "publish" | "keep_candidate" | "archive";
  reasoning: string;
}

export interface PtResult {
  title_pt: string | null;
  snippet_pt: string | null;
  why_it_matters_pt: string | null;
}

// ── EN enrichment ──────────────────────────────────────────────────────────

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

Why it matters rules:
- Write for a foreign investor, buyer or broker who does not know Cape Verde well.
- The goal is to help outside investors understand Cape Verde — not to force every story into a property-price argument.
- Good connections include: tourism, infrastructure, aviation and access, public investment, regulation, government capacity and transparency, the cultural and visitor economy, foreign investment activity, and property-market context when it genuinely applies.
- Use cautious language when the connection is indirect.
- Do not pretend every story directly affects property prices or demand.

Avoid these words and phrases in all fields:
- will boost property demand
- proves market growth
- directly increases property values
- confirms investor confidence
- world-class, major breakthrough, game changer
- lauds / commends / exemplary (bureaucratic tone)

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

Use "archive" when:
  - Crime, health incidents, celebrity or sports gossip
  - Generic travel content or lifestyle articles
  - Title-only or near-empty RSS items
  - Unrelated international news with no Cape Verde market angle

Category guardrail:
  - "category" MUST be exactly one of the 5 values: Economy, Tourism, Infrastructure, Policy & Tax, Banking & Credit.
  - Foreign investment, aviation, hospitality, construction and currency risk are THEMES — capture them in signal_tags.

Phrasing guardrail:
  - Do not write "can attract foreign investment" or similar phrases unless the source clearly supports that connection.`;

function buildEnrichUserMessage(input: EnrichInput): string {
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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function validateEnrichResult(obj: Record<string, unknown>): string | null {
  for (const field of ENRICH_REQUIRED_FIELDS) {
    if (!(field in obj)) return `Missing required field: ${field}`;
  }
  if (!VALID_RECOMMENDATIONS.includes(obj.recommendation as string)) {
    return `Invalid recommendation: "${obj.recommendation}"`;
  }
  const score = Number(obj.relevance_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return `relevance_score must be 0–100, got: ${obj.relevance_score}`;
  }
  if (!Array.isArray(obj.signal_tags)) return "signal_tags must be an array";
  if (!Array.isArray(obj.affected_regions)) return "affected_regions must be an array";
  return null;
}

export async function enrichCandidate(
  input: EnrichInput,
  openaiKey: string,
): Promise<EnrichResult> {
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
        { role: "user", content: buildEnrichUserMessage(input) },
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

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty content in OpenAI response");

  const parsed = parseJson(content) as Record<string, unknown>;
  const err = validateEnrichResult(parsed);
  if (err) throw new Error(`Enrichment response failed validation: ${err}`);

  return {
    ...parsed,
    relevance_score: Math.round(Number(parsed.relevance_score)),
  } as EnrichResult;
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

function buildPtUserMessage(fields: { title: string; snippet: string; why_it_matters: string | null }): string {
  return [
    `title: ${fields.title || "(none)"}`,
    `snippet: ${fields.snippet || "(none)"}`,
    `why_it_matters: ${fields.why_it_matters || "(none)"}`,
  ].join("\n");
}

function validatePtResult(obj: Record<string, unknown>): string | null {
  for (const f of ["title_pt", "snippet_pt", "why_it_matters_pt"] as const) {
    if (!(f in obj)) return `Missing required field: ${f}`;
    if (obj[f] !== null && typeof obj[f] !== "string") return `${f} must be string or null`;
  }
  return null;
}

export async function translateToPt(
  fields: { title: string; snippet: string; why_it_matters: string | null },
  anthropicKey: string,
): Promise<PtResult> {
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
      messages: [{ role: "user", content: buildPtUserMessage(fields) }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Anthropic PT request failed (HTTP ${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as { content?: Array<{ type: string; text: string }> };
  const text = (data.content || [])
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  if (!text) throw new Error("Empty content in Anthropic PT response");

  const parsed = parseJson(text) as Record<string, unknown>;
  const err = validatePtResult(parsed);
  if (err) throw new Error(`PT response failed validation: ${err}`);

  return parsed as PtResult;
}
