/**
 * Translate listing ai_descriptions from English into one or more supported languages.
 *
 * Source of truth for supported languages: scripts/lib/translation-languages.ts
 *
 * Usage:
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts pt
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts --all
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts pt --dry-run
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts --all --limit=50
 *   pnpm tsx scripts/backfill_ai_descriptions_for_language.ts pt --force
 *
 * Flags:
 *   --all        Run for every entry in SUPPORTED_LANGUAGES (mutually exclusive with positional lang)
 *   --limit=N    Max listings to process per language (default: all eligible)
 *   --force      Overwrite existing translations
 *   --dry-run    Skip LLM calls and DB writes; logs eligible rows only
 *   --no-write   Call LLMs but skip DB writes (for output inspection)
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSupabaseClient } from "../core/supabaseClient";
import { SUPPORTED_LANGUAGES, getLanguageConfig, LanguageConfig } from "./lib/translation-languages";

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

type Translation = {
  title: string;
  text: string;
};

type Args = {
  langs: LanguageConfig[];
  limit: number | null;
  force: boolean;
  dryRun: boolean;
  noWrite: boolean;
};

type LangCounts = {
  eligible: number;
  to_translate: number;
  already_done: number;
  ok_primary: number;
  ok_fallback: number;
  failed: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let runAll = false;
  let langCode: string | null = null;
  let limit: number | null = null;
  let force = false;
  let dryRun = false;
  let noWrite = false;

  for (const a of argv) {
    if (a === "--all") runAll = true;
    else if (a.startsWith("--limit=")) limit = Number(a.split("=")[1]);
    else if (a === "--force") force = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--no-write") noWrite = true;
    else if (!a.startsWith("--")) langCode = a;
  }

  if (runAll && langCode) {
    console.error("[translate] Error: use either --all or a language code, not both.");
    process.exit(1);
  }
  if (!runAll && !langCode) {
    const valid = SUPPORTED_LANGUAGES.map((l) => l.code).join(", ");
    console.error(`[translate] Error: provide a language code (${valid}) or --all.`);
    process.exit(1);
  }

  let langs: LanguageConfig[];
  if (runAll) {
    langs = SUPPORTED_LANGUAGES;
  } else {
    try {
      langs = [getLanguageConfig(langCode!)];
    } catch (e) {
      console.error(`[translate] Error: ${(e as Error).message}`);
      process.exit(1);
    }
  }
  return { langs, limit, force, dryRun, noWrite };
}

function buildUserMessage(l: Listing, lang: LanguageConfig): string {
  const en = l.ai_descriptions?.en ?? {};
  return [
    `Translate this listing title and AREI description into ${lang.label}.`,
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

function parseTranslation(raw: string): Translation {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed.title !== "string" || typeof parsed.text !== "string") {
    throw new Error("LLM response missing title/text fields");
  }
  const title = parsed.title.trim();
  const text = parsed.text.trim();
  if (!title || !text) throw new Error("LLM response has empty title or text");
  return { title, text };
}

function isRetryable(e: unknown): boolean {
  const err = e as { status?: number; response?: { status?: number }; message?: string };
  const status = err?.status ?? err?.response?.status;
  if (status === 429 || status === 529 || status === 503 || status === 500) return true;
  return /rate.?limit|overloaded|too many requests/i.test(String(err?.message ?? ""));
}

async function callClaude(client: Anthropic, l: Listing, lang: LanguageConfig): Promise<Translation> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < PRIMARY_MAX_RETRIES; attempt++) {
    try {
      const resp = await client.messages.create({
        model: PRIMARY_MODEL,
        max_tokens: 1400,
        system: lang.systemPrompt,
        messages: [{ role: "user", content: buildUserMessage(l, lang) }],
      });
      const block = resp.content.find((c) => c.type === "text");
      if (!block || block.type !== "text") throw new Error("Claude: no text block");
      return parseTranslation(block.text);
    } catch (e) {
      lastErr = e;
      if (attempt < PRIMARY_MAX_RETRIES - 1 && isRetryable(e)) {
        await new Promise((r) => setTimeout(r, PRIMARY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function callGpt(client: OpenAI, l: Listing, lang: LanguageConfig): Promise<Translation> {
  const resp = await client.chat.completions.create({
    model: FALLBACK_MODEL,
    max_tokens: 1400,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: lang.systemPrompt },
      { role: "user", content: buildUserMessage(l, lang) },
    ],
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) throw new Error("GPT: empty response");
  return parseTranslation(text);
}

async function fetchEligible(): Promise<Listing[]> {
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
    const enText = l.ai_descriptions?.en?.text ?? "";
    return enText.length >= 20;
  });
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<void>
): Promise<void> {
  let next = 0;
  async function lane() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => lane()));
}

async function translateLanguage(
  lang: LanguageConfig,
  eligible: Listing[],
  args: Args,
  anthropic: Anthropic | null,
  openai: OpenAI | null,
  outDir: string
): Promise<LangCounts> {
  const prefix = `[translate:${lang.code}]`;

  const needsTranslation = eligible.filter((l) => {
    if (args.force) return true;
    const entry = l.ai_descriptions?.[lang.code];
    return !(entry?.text && entry.text.length > 0 && entry?.title && entry.title.length > 0);
  });
  const alreadyDone = eligible.length - needsTranslation.length;
  const todo = args.limit ? needsTranslation.slice(0, args.limit) : needsTranslation;

  console.log(
    `${prefix} language="${lang.label}" prompt_version=${lang.promptVersion}`
  );
  console.log(
    `${prefix} eligible=${eligible.length} to_translate=${todo.length} already_done=${alreadyDone} force=${args.force} dry_run=${args.dryRun}`
  );

  const counts: LangCounts = {
    eligible: eligible.length,
    to_translate: todo.length,
    already_done: alreadyDone,
    ok_primary: 0,
    ok_fallback: 0,
    failed: 0,
  };

  if (args.dryRun || todo.length === 0) {
    console.log(`${prefix} done (dry_run or nothing to translate)`);
    return counts;
  }

  const sb = getSupabaseClient();
  const failures: { id: string; error: string }[] = [];

  await runWithConcurrency(todo, CONCURRENCY, async (l, idx) => {
    let translated: Translation | null = null;
    let model = PRIMARY_MODEL;

    try {
      translated = await callClaude(anthropic!, l, lang);
      counts.ok_primary++;
    } catch {
      try {
        translated = await callGpt(openai!, l, lang);
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
        [lang.code]: {
          title: translated.title,
          text: translated.text,
          generated_at: new Date().toISOString(),
          prompt_version: lang.promptVersion,
          model,
          validated: false,
        },
      };
      const { error } = await sb.from("listings").update({ ai_descriptions: merged }).eq("id", l.id);
      if (error) {
        counts.ok_primary = model === PRIMARY_MODEL ? counts.ok_primary - 1 : counts.ok_primary;
        counts.ok_fallback = model === FALLBACK_MODEL ? counts.ok_fallback - 1 : counts.ok_fallback;
        counts.failed++;
        failures.push({ id: l.id, error: `db_write_error: ${error.message}` });
      }
    }

    const done = idx + 1;
    if (done % 10 === 0 || done === todo.length) {
      console.log(
        `${prefix} ${done}/${todo.length} ok_primary=${counts.ok_primary} ok_fallback=${counts.ok_fallback} failed=${counts.failed}`
      );
    }
  });

  const translated = counts.ok_primary + counts.ok_fallback;
  console.log(
    `${prefix} done translated=${translated} (primary=${counts.ok_primary} fallback=${counts.ok_fallback}) skipped=${alreadyDone} failed=${counts.failed}`
  );

  if (failures.length > 0) {
    const runId = new Date().toISOString().replace(/[:.]/g, "-");
    const failPath = path.join(outDir, `translate-${lang.code}-${runId}.failed.jsonl`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(failPath, failures.map((f) => JSON.stringify(f)).join("\n") + "\n");
    console.log(`${prefix} failures written to ${failPath}`);
  }

  return counts;
}

async function main() {
  const args = parseArgs();

  if (!args.dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  }

  const outDir = path.resolve(__dirname, "experiments/description_rewrite_v1/output");

  console.log(`[translate] fetching eligible listings…`);
  const eligible = await fetchEligible();
  console.log(`[translate] ${eligible.length} eligible listings (indexable, en.text set)`);

  const anthropic = args.dryRun ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = args.dryRun ? null : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (const lang of args.langs) {
    await translateLanguage(lang, eligible, args, anthropic, openai, outDir);
  }

  console.log(`[translate] all languages done`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
