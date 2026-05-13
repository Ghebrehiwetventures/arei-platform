/**
 * POST /api/enrich-candidate
 *
 * Calls OpenAI with a raw market news candidate and returns structured
 * editorial suggestions. Never reads or writes the database.
 * Uses OPENAI_API_KEY from the server environment — never from the browser.
 */

const SYSTEM_PROMPT = `You are an editorial assistant for the Cape Verde Real Estate Index (AREI), a \
property market intelligence platform for real estate investors and buyers.

Your task: given a raw market news candidate — which may be in Portuguese, English, French, or another \
language — rewrite it as clear, professional English market-intelligence copy.

Output ONLY a single JSON object. No markdown fences. No preamble. No trailing text.

Required fields:
{
  "title": "concise English editorial headline, max ~12 words, factual",
  "snippet": "2–3 sentences summarising the key facts in English",
  "why_it_matters": "1–2 sentences explaining the concrete impact on Cape Verde property demand, tourism, investment climate, or infrastructure",
  "category": "exactly one of: Economy, Tourism, Hospitality, Infrastructure, Aviation, Foreign investment, Policy / regulation, Tax / residency, Construction, Banking / credit, Currency / macro risk",
  "signal_tags": ["3–5 short market signal phrases, e.g. Air connectivity, Tourism demand, Resort development"],
  "affected_regions": ["Cape Verde islands or regions directly affected, e.g. Sal, Boa Vista, Santiago, São Vicente, Fogo — leave empty array if impact is national or unclear"],
  "relevance_score": <integer 0–100 where 100 = directly and clearly affects Cape Verde real estate, tourism, or investment>,
  "recommendation": "publish" or "keep_candidate" or "archive",
  "reasoning": "1–2 sentences explaining your recommendation"
}

Guardrails:
- Do not invent facts. Use only the information provided.
- If source content is vague, incomplete, or lacks a clear Cape Verde property-market angle, set relevance_score below 40 and recommend archive or keep_candidate.
- Be conservative: prefer keep_candidate when uncertain.
- Recommend publish only when market relevance is direct and clear.
- Recommend archive for: crime, celebrity gossip, disease/health events (unless clearly market-relevant), generic travel blogs, unrelated international news, static database or reference pages, RSS items that are title-only with no substantive content.
- Relevant topics for publish: aviation/connectivity, hospitality/resort development, property regulation, foreign investment, infrastructure (energy, water, ports), tourism demand indicators, macro stability, tax/residency/credit policy.
- Keep title concise and factual — no clickbait.
- Snippet should summarise facts only — no editorialising.
- why_it_matters must add analytical value, not repeat the snippet.`;

function buildUserMessage(body) {
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
          { role: "user", content: buildUserMessage(body) },
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

  return send(res, 200, suggestion);
}
