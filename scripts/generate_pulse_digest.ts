/**
 * AREI Pulse — nightly executive digest generator.
 *
 * AREI Pulse acts as an AI "vice CEO / chief of staff". This script
 * collects company-level signals (and, when a safe provider is wired
 * up, external web intelligence), asks Claude to synthesize and
 * PRIORITIZE — never invent — at most 5 executive cards, then writes
 * them to pulse_cards (migration 050). The admin dashboard reads them.
 *
 * Hard rules enforced here (not just prompted):
 *   - Max 5 cards per digest_date.
 *   - No card without evidence — cards with an empty evidence array
 *     are dropped.
 *   - Categories must be in the agreed taxonomy.
 *   - If no meaningful signal exists, zero cards are written.
 *   - Claude synthesizes/prioritizes; facts come only from the signals.
 *   - No fabricated web opportunities — when no web provider is
 *     configured, no web-sourced cards can appear (provider returns []).
 *
 * Auth: requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (insert is
 * service-role only) and ANTHROPIC_API_KEY (synthesis).
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/generate_pulse_digest.ts
 *   npx ts-node --transpile-only scripts/generate_pulse_digest.ts --date 2026-06-03
 *   npx ts-node --transpile-only scripts/generate_pulse_digest.ts --force
 *   npx ts-node --transpile-only scripts/generate_pulse_digest.ts --dry-run
 *
 * Exit codes:
 *   0  success (cards written, or none warranted)
 *   1  missing env vars / invalid args
 *   2  signal collection or synthesis failure
 */

import * as path from "path";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

import {
  PULSE_CATEGORIES,
  PulseCardInsert,
  PulseEvidence,
  isValidCategory,
  insertPulseCards,
  countPulseCardsForDate,
  clearFreshPulseCardsForDate,
} from "./lib/pulse";
import { collectInternalSignals, SignalBundle } from "./lib/pulse-signals";
import {
  getWebIntelProvider,
  defaultWatchlist,
  WebIntelResult,
} from "./lib/pulse-web-intel";

for (const p of [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.local"),
]) {
  dotenv.config({ path: p });
}

const MODEL = "claude-sonnet-4-6";
const PROMPT_VERSION = "pulse-v1";
const MAX_CARDS = 5;

// ── AREI executive context ───────────────────────────────────────────────────

const AREI_CONTEXT = `
You are AREI Pulse — an AI vice-CEO / chief of staff for AREI (Africa Real
Estate Index). Your job is to tell the founders what AREI should care about
RIGHT NOW and what to do next.

About AREI:
- AREI builds data acquisition and intelligence infrastructure for African
  property markets. Tagline: "Africa's property data is everywhere. We bring
  it together."
- Market one is Cape Verde (live product: Cape Verde Real Estate Index).
  Market two is planned: Ghana. The investor thesis depends on proving the
  Cape Verde methodology is REPEATABLE in a second market.
- The differentiation is methodology, data quality, and institutional-grade
  signal — NOT generic listings aggregation.
- Founders: Michael (CEO — business, strategy, fundraising, partnerships,
  sales, positioning) and Eloy (technical — data pipeline, and he OWNS a
  separate data-cleaning / data-quality agent).

Your scope (executive intelligence ONLY):
- strategy, operations, technical_execution, data_quality_risk, sales,
  partnerships, market_expansion, events, competitors, content_pr, fundraising.
- You are NOT a technical notification center. Do NOT produce cards about
  individual listings, parsers, or per-source health. Eloy's data-cleaning
  agent handles low-level data work — never duplicate it.
- data_quality_risk cards are allowed ONLY when data quality affects a
  COMPANY-LEVEL priority (e.g. "we cannot publish investor-facing methodology
  until baseline quality is trusted"). Summarize; never list per-source detail.
`.trim();

// ── Card schema returned by the model ────────────────────────────────────────

interface ModelCard {
  category: string;
  priority: number;
  title: string;
  signal_summary: string;
  why_it_matters: string;
  recommended_action: string;
  evidence: PulseEvidence[];
  owner_suggestion?: string | null;
  source_url?: string | null;
}

function buildPrompt(bundle: SignalBundle, web: WebIntelResult[]): string {
  const internal = bundle.signals
    .map((s) => `- [${s.id}] ${s.label}: ${s.summary}`)
    .join("\n");

  const webBlock =
    web.length === 0
      ? "(No external web intelligence available this run — do NOT invent events, competitors, or news. Only use the internal signals above.)"
      : web
          .map(
            (w, i) =>
              `- [web_${i}] (${w.topic}) ${w.title} — ${w.summary} [${w.url}]`
          )
          .join("\n");

  return `
INTERNAL SIGNALS (the only company facts you may use):
${internal || "(none)"}

EXTERNAL WEB INTELLIGENCE:
${webBlock}

TASK:
Synthesize at most ${MAX_CARDS} EXECUTIVE cards answering: "What should AREI
care about right now, and what should we do next?"

Rules:
- Prioritize business impact over completeness. Quality over quantity.
- Use ONLY facts present in the signals above. Do not invent numbers, events,
  competitors, or opportunities. If the signals do not justify a meaningful
  executive card, return FEWER cards — or an empty array.
- Every card MUST cite evidence drawn from the signal ids above
  (e.g. ref "data_quality_summary" or "web_0"). No evidence => no card.
- No generic advice ("improve marketing"). Be specific and actionable.
- category must be one of: ${PULSE_CATEGORIES.join(", ")}.
- priority is an integer 0-100 (higher = more urgent/impactful).
- owner_suggestion: "Michael", "Eloy", or null. Infer only when confident.
- Do NOT produce listing/parser/per-source cards. data_quality_risk only when
  it blocks a company-level priority.

Respond with STRICT JSON only — an object: {"cards": ModelCard[]}.
ModelCard = {category, priority, title, signal_summary, why_it_matters,
recommended_action, evidence:[{label, ref?, detail?}], owner_suggestion?,
source_url?}. No prose, no markdown fences.
`.trim();
}

function parseModelCards(text: string): ModelCard[] {
  // Tolerate accidental markdown fences.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last resort: extract the first {...} or [...] block.
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("model did not return JSON");
    parsed = JSON.parse(match[0]);
  }
  const cards = Array.isArray(parsed)
    ? parsed
    : (parsed as { cards?: unknown }).cards;
  if (!Array.isArray(cards)) throw new Error("no cards array in model output");
  return cards as ModelCard[];
}

/** Drop structurally invalid or evidence-free cards; clamp + cap. */
function validateCards(raw: ModelCard[], digestDate: string): PulseCardInsert[] {
  const valid: PulseCardInsert[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") continue;
    if (!isValidCategory(String(c.category))) continue;
    const required = [c.title, c.signal_summary, c.why_it_matters, c.recommended_action];
    if (required.some((f) => typeof f !== "string" || f.trim().length === 0)) continue;
    const evidence = Array.isArray(c.evidence)
      ? c.evidence.filter((e) => e && typeof e.label === "string" && e.label.trim())
      : [];
    if (evidence.length === 0) continue; // no card without evidence

    const priority = Math.max(0, Math.min(100, Math.round(Number(c.priority) || 0)));
    const cited = evidence.map((e) => String(e.ref ?? ""));
    const source_type = cited.some((r) => r.startsWith("web_"))
      ? cited.some((r) => r && !r.startsWith("web_"))
        ? "mixed"
        : "web"
      : "internal";

    valid.push({
      digest_date: digestDate,
      category: c.category as PulseCardInsert["category"],
      priority,
      title: c.title.trim(),
      signal_summary: c.signal_summary.trim(),
      why_it_matters: c.why_it_matters.trim(),
      recommended_action: c.recommended_action.trim(),
      evidence,
      source_type,
      source_url: typeof c.source_url === "string" ? c.source_url : null,
      owner_suggestion:
        typeof c.owner_suggestion === "string" && c.owner_suggestion.trim()
          ? c.owner_suggestion.trim()
          : null,
      meta: { model: MODEL, prompt_version: PROMPT_VERSION },
    });
  }
  valid.sort((a, b) => b.priority - a.priority);
  return valid.slice(0, MAX_CARDS);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const dateArg = args.find((a) => a.startsWith("--date"));
  const digestDate = dateArg
    ? (dateArg.includes("=") ? dateArg.split("=")[1] : args[args.indexOf(dateArg) + 1])
    : new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(digestDate)) {
    console.error(`[pulse] invalid --date "${digestDate}" (want YYYY-MM-DD)`);
    return 1;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key) {
    console.error("[pulse] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
    return 1;
  }
  if (!anthropicKey) {
    console.error("[pulse] ANTHROPIC_API_KEY required for synthesis");
    return 1;
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Idempotency.
  const existing = await countPulseCardsForDate(sb, digestDate);
  if (existing > 0 && !force) {
    console.log(`[pulse] ${existing} card(s) already exist for ${digestDate}; skipping (use --force).`);
    return 0;
  }

  // 1. Collect signals.
  let bundle: SignalBundle;
  try {
    bundle = await collectInternalSignals(sb);
  } catch (e) {
    console.error(`[pulse] signal collection failed: ${String(e)}`);
    return 2;
  }
  console.log(`[pulse] collected ${bundle.signals.length} internal signal(s).`);

  // 2. External web intelligence (no-op unless a provider is configured).
  const provider = getWebIntelProvider();
  let web: WebIntelResult[] = [];
  try {
    web = await provider.search(defaultWatchlist());
  } catch (e) {
    console.warn(`[pulse] web intel provider "${provider.name}" failed: ${String(e)}`);
  }
  console.log(`[pulse] web provider="${provider.name}" returned ${web.length} result(s).`);

  if (bundle.signals.length === 0 && web.length === 0) {
    console.log("[pulse] no signals available — writing zero cards.");
    return 0;
  }

  // 3. Synthesize via Claude.
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  let raw: ModelCard[];
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: AREI_CONTEXT,
      messages: [{ role: "user", content: buildPrompt(bundle, web) }],
    });
    const block = resp.content.find((c) => c.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    raw = parseModelCards(text);
  } catch (e) {
    console.error(`[pulse] synthesis failed: ${String(e)}`);
    return 2;
  }

  // 4. Validate (drops evidence-free / invalid; caps at MAX_CARDS).
  const cards = validateCards(raw, digestDate);
  console.log(`[pulse] ${raw.length} raw card(s) -> ${cards.length} valid after guardrails.`);

  if (dryRun) {
    console.log(JSON.stringify(cards, null, 2));
    return 0;
  }

  if (cards.length === 0) {
    console.log("[pulse] no meaningful executive cards this run.");
    return 0;
  }

  if (force) {
    const cleared = await clearFreshPulseCardsForDate(sb, digestDate);
    if (cleared > 0) console.log(`[pulse] cleared ${cleared} stale 'new' card(s) for ${digestDate}.`);
  }

  const inserted = await insertPulseCards(sb, cards);
  console.log(`[pulse] wrote ${inserted} card(s) for ${digestDate}.`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[pulse] unexpected error: ${String(e)}`);
    process.exit(2);
  });
