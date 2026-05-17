/**
 * @deprecated Use backfill_ai_descriptions_for_language.ts instead:
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts pt
 * This file is kept for reference only and is not wired into any automated flow.
 *
 * Backfill Portuguese (pt-PT) listing title + description into
 * listings.ai_descriptions.pt from existing listings.ai_descriptions.en.
 *
 * Reuses the same provider order as scripts/backfill_ai_descriptions.ts:
 * Claude primary, GPT fallback. It does not re-read or translate raw scraped
 * descriptions; it localizes the already-approved AREI English text.
 *
 * Run:
 *   npx ts-node --transpile-only scripts/backfill_ai_descriptions_pt.ts --dry-run
 *   npx ts-node --transpile-only scripts/backfill_ai_descriptions_pt.ts --limit=10
 *   npx ts-node --transpile-only scripts/backfill_ai_descriptions_pt.ts
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSupabaseClient } from "../core/supabaseClient";

const PROMPT_VERSION = "pt-pt-v1";
const PRIMARY_MODEL = "claude-sonnet-4-6";
const FALLBACK_MODEL = "gpt-4o";
const CONCURRENCY = 3;
const PRIMARY_MAX_RETRIES = 3;
const PRIMARY_RETRY_BASE_DELAY_MS = 2000;

type AiEntry = {
  title?: string;
  text?: string;
  generated_at?: string;
  prompt_version?: string;
  model?: string;
  validated?: boolean;
};

type Listing = {
  id: string;
  title: string | null;
  island: string | null;
  city: string | null;
  property_type: string | null;
  ai_descriptions: Record<string, AiEntry> | null;
};

type Args = {
  limit: number | null;
  force: boolean;
  dryRun: boolean;
  noWrite: boolean;
};

type Translation = {
  title: string;
  text: string;
};

const SYSTEM_PROMPT = `You translate Cape Verde real estate listing copy for AREI into European Portuguese (pt-PT).

Rules:
- Output only valid JSON with keys "title" and "text".
- Translate into Portugal Portuguese, not Brazilian Portuguese.
- Preserve facts exactly. Do not add investment claims or new details.
- Keep place names, source names, resort names, and legal entity names unchanged unless they have a standard Portuguese form.
- Keep "Cape Verde Real Estate Index" and "AREI" unchanged.
- No emojis, no markdown, no headings.
- Title should be concise and natural for a Portuguese-speaking property buyer.
- Text should preserve paragraph breaks from the English source.`;

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let force = false;
  let dryRun = false;
  let noWrite = false;
  for (const a of args) {
    if (a.startsWith("--limit=")) limit = Number(a.split("=")[1]);
    else if (a === "--force") force = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--no-write") noWrite = true;
  }
  return { limit, force, dryRun, noWrite };
}

function userMessage(l: Listing): string {
  const en = l.ai_descriptions?.en ?? {};
  return [
    "Translate this listing title and AREI description into pt-PT.",
    "",
    "Structured context:",
    `- city: ${l.city ?? ""}`,
    `- island: ${l.island ?? ""}`,
    `- property_type: ${l.property_type ?? ""}`,
    "",
    "English title:",
    l.title ?? "",
    "",
    "English AREI description:",
    en.text ?? "",
  ].join("\n");
}

function parseJson(text: string): Translation {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.title !== "string" || typeof parsed.text !== "string") {
    throw new Error("LLM response missing title/text");
  }
  const title = parsed.title.trim();
  const body = parsed.text.trim();
  if (!title || !body) throw new Error("LLM response has empty title/text");
  return { title, text: body };
}

function isRetryablePrimaryError(e: unknown): boolean {
  const err = e as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.status ?? err?.response?.status;
  if (status === 429 || status === 529 || status === 503 || status === 500) return true;
  return /rate.?limit|overloaded|too many requests/i.test(String(err?.message ?? ""));
}

async function callClaudeOnce(client: Anthropic, l: Listing): Promise<Translation> {
  const resp = await client.messages.create({
    model: PRIMARY_MODEL,
    max_tokens: 1400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage(l) }],
  });
  const block = resp.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude: no text block");
  return parseJson(block.text);
}

async function callClaude(client: Anthropic, l: Listing): Promise<Translation> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < PRIMARY_MAX_RETRIES; attempt++) {
    try {
      return await callClaudeOnce(client, l);
    } catch (e) {
      lastErr = e;
      if (attempt < PRIMARY_MAX_RETRIES - 1 && isRetryablePrimaryError(e)) {
        await new Promise((r) => setTimeout(r, PRIMARY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function callGpt(client: OpenAI, l: Listing): Promise<Translation> {
  const resp = await client.chat.completions.create({
    model: FALLBACK_MODEL,
    max_tokens: 1400,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage(l) },
    ],
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) throw new Error("GPT: empty response");
  return parseJson(text);
}

async function fetchScope(force: boolean): Promise<Listing[]> {
  const sb = getSupabaseClient();
  const all: Listing[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("listings")
      .select("id,title,island,city,property_type,ai_descriptions")
      .eq("indexable", true)
      .not("ai_descriptions->en->>text", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as Listing[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.filter((l) => {
    const enText = l.ai_descriptions?.en?.text;
    const pt = l.ai_descriptions?.pt;
    if (!enText || enText.length < 20) return false;
    if (force) return true;
    return !(pt?.text && pt.text.length > 0 && pt?.title && pt.title.length > 0);
  });
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function lane() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
  return results;
}

async function main() {
  const args = parseArgs();
  if (!args.dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  }
  const sb = getSupabaseClient();
  const scope = await fetchScope(args.force);
  const todo = args.limit ? scope.slice(0, args.limit) : scope;
  console.log(`[pt-backfill] scope=${scope.length} processing=${todo.length} force=${args.force} dryRun=${args.dryRun} noWrite=${args.noWrite}`);

  if (args.dryRun) return;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const counts = { ok_primary: 0, ok_fallback: 0, failed: 0 };
  const failures: { id: string; error: string }[] = [];

  await runWithConcurrency(todo, CONCURRENCY, async (l, idx) => {
    let translated: Translation | null = null;
    let model = PRIMARY_MODEL;
    try {
      translated = await callClaude(anthropic, l);
      counts.ok_primary++;
    } catch (e) {
      try {
        translated = await callGpt(openai, l);
        model = FALLBACK_MODEL;
        counts.ok_fallback++;
      } catch (e2) {
        counts.failed++;
        failures.push({ id: l.id, error: String((e2 as Error)?.message ?? e2) });
      }
    }
    if (translated && !args.noWrite) {
      const merged = {
        ...(l.ai_descriptions ?? {}),
        pt: {
          title: translated.title,
          text: translated.text,
          generated_at: new Date().toISOString(),
          prompt_version: PROMPT_VERSION,
          model,
          validated: false,
        },
      };
      const { error } = await sb.from("listings").update({ ai_descriptions: merged }).eq("id", l.id);
      if (error) {
        counts.failed++;
        failures.push({ id: l.id, error: `db_write_error: ${error.message}` });
      }
    }
    if ((idx + 1) % 10 === 0 || idx + 1 === todo.length) {
      console.log(`[pt-backfill] ${idx + 1}/${todo.length} primary=${counts.ok_primary} fallback=${counts.ok_fallback} failed=${counts.failed}`);
    }
  });

  const outDir = path.resolve(__dirname, "experiments/description_rewrite_v1/output");
  fs.mkdirSync(outDir, { recursive: true });
  const summaryPath = path.join(outDir, `pt-backfill-${new Date().toISOString().replace(/[:.]/g, "-")}.summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({ args, scope: scope.length, processed: todo.length, counts, failures }, null, 2));
  console.log(`[pt-backfill] done ${JSON.stringify(counts)} summary=${summaryPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
