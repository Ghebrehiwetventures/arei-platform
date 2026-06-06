/**
 * Manual verification for the fulltext fact-extraction enrichment.
 *
 * Runs the real SYSTEM_PROMPT against a mocked Hospitality-Net-style article
 * body (the kind of content that only exists inside the article, never in the
 * RSS snippet) and prints the enriched headline, summary, Cape Verde angle and
 * extracted key_facts.
 *
 *   node arei-admin/scripts/verify-enrich-fulltext.mjs
 *
 * With OPENAI_API_KEY set it calls OpenAI live. Without it, it prints the
 * payload that would be sent and the target output, then exits cleanly.
 */

import {
  SYSTEM_PROMPT,
  buildUserMessage,
  validateSuggestion,
  normalizeSuggestion,
} from "../api/enrich-candidate.js";

// Facts below appear ONLY in the body — the RSS title/snippet are generic.
const CANDIDATE = {
  title: "Africa's hotel development pipeline hits record high as East Africa leads in construction momentum - Hospitality Net",
  original_title: "Africa's hotel development pipeline hits record high as East Africa leads in construction momentum",
  snippet: "Africa's hotel development pipeline hits record high as East Africa leads in construction momentum Hospitality Net",
  source_name: "Hospitality Net",
  source_url: "https://www.hospitalitynet.org/news/4131326.html",
  category: "Infrastructure",
  published_at: "2026-03-10",
  language: "en",
  ingestion_source: "gnews-cv-property",
};

const ARTICLE_BODY = [
  "Africa's hotel development pipeline has reached a record high according to the 2026 Hotel Chain Development Pipelines in Africa report by W Hospitality Group.",
  "Cape Verde ranks sixth on the continent by planned hotel rooms. The report identifies 17 hotel and resort projects in Cape Verde, representing 4,328 planned rooms.",
  "That places Cape Verde ahead of larger markets including Tunisia, Tanzania, South Africa and Ghana in total pipeline rooms.",
  "Only 374 of Cape Verde's planned rooms are currently under construction, equal to 8.6 percent of the total pipeline, suggesting much of the potential remains in the planning phase.",
  "With an average project size of 255 rooms, the country's pipeline points to continued investor interest in resort-driven development.",
].join(" ");

function banner(t) { console.log("\n" + "═".repeat(72) + "\n" + t + "\n" + "═".repeat(72)); }

const userMessage = buildUserMessage(CANDIDATE, ARTICLE_BODY);

banner("USER MESSAGE SENT TO THE MODEL (note the Article body section)");
console.log(userMessage);

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  banner("OPENAI_API_KEY not set — skipping live call");
  console.log("Target behaviour (what the prompt is designed to produce):");
  console.log("  title:   Cape Verde ranks sixth in Africa hotel pipeline with 4,328 planned rooms");
  console.log("  snippet: Cape Verde ranks sixth among African hotel development markets, with 17");
  console.log("           planned hotels and 4,328 rooms. Only 8.6% of the pipeline is under");
  console.log("           construction, signalling strong planned investment but limited near-term delivery.");
  console.log("  key_facts: rank 6, 17 hotels, 4,328 rooms, 374 under construction, 8.6%");
  console.log("\nSet OPENAI_API_KEY to run the real model and verify.");
  process.exit(0);
}

banner("CALLING OPENAI (gpt-4o-mini)…");
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 900,
    response_format: { type: "json_object" },
  }),
});

if (!res.ok) {
  console.error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}

const data = await res.json();
const suggestion = JSON.parse(data.choices[0].message.content);
const err = validateSuggestion(suggestion);
if (err) { console.error("Validation failed:", err); process.exit(1); }
normalizeSuggestion(suggestion);

banner("ENRICHED OUTPUT");
console.log("title:           ", suggestion.title);
console.log("snippet:         ", suggestion.snippet);
console.log("why_it_matters:  ", suggestion.why_it_matters);
console.log("relevance_score: ", suggestion.relevance_score, "/100  →", suggestion.recommendation);
console.log("cape_verde_angle:", suggestion.cape_verde_angle);
console.log("key_facts:");
for (const f of suggestion.key_facts) {
  const v = f.value !== undefined ? ` = ${f.value}${f.unit ? " " + f.unit : ""}` : "";
  console.log(`  • [${f.confidence}] ${f.fact}${v}`);
  if (f.source_text) console.log(`      ↳ "${f.source_text}"`);
}

// Lightweight sanity checks on the live output.
banner("SANITY CHECKS");
const blob = JSON.stringify(suggestion).toLowerCase();
const checks = [
  ["mentions Cape Verde", blob.includes("cape verde")],
  ["title is specific (has a number)", /\d/.test(suggestion.title)],
  ["extracted at least 2 key facts", suggestion.key_facts.length >= 2],
  ["relevance lifted above generic (>= 70)", suggestion.relevance_score >= 70],
];
let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "✓" : "✗"} ${label}`);
  if (!pass) ok = false;
}
process.exit(ok ? 0 : 1);
