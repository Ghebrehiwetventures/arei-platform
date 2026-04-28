/**
 * Backfill AI-generated English descriptions into listings.ai_descriptions.en.
 *
 * Primary model: Claude Sonnet 4.6 (chosen via v1.1 evaluation).
 * Fallback:      GPT-4o (only when Sonnet errors).
 * Prompt:        AREI voice v1.2 (silent conflict-handling + mandatory
 *                "Cape Verde" mention; same prompt text as run_v1_2.ts).
 *
 * Filter:        indexable=true AND description IS NOT NULL AND
 *                LENGTH(description) > 500. ~390 listings as of 2026-04-27.
 *
 * Idempotency:   listings whose ai_descriptions.en.text is already set are
 *                skipped unless --force.
 *
 * DB write:      merges into existing ai_descriptions object so future
 *                language additions (it/pt/de/sv) don't clobber each other.
 *                Shape per language: { text, generated_at, prompt_version,
 *                validated:false }.
 *
 * Resilience:    each listing is processed + written independently; an error
 *                on one row does not abort the run. Failures land in
 *                output/{run_id}.failed.jsonl for inspection.
 *
 * Run:
 *   npx ts-node --transpile-only scripts/backfill_ai_descriptions.ts --limit=5
 *   npx ts-node --transpile-only scripts/backfill_ai_descriptions.ts
 *
 * Flags:
 *   --limit=N    only process first N listings (sorted by id)
 *   --force      regenerate even if ai_descriptions.en.text already set
 *   --dry-run    skip both LLM calls and DB writes (sample-selection check)
 *   --no-write   call LLMs but skip DB writes (for output inspection)
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSupabaseClient } from "../core/supabaseClient";

const PROMPT_VERSION = "v1.2";
const PRIMARY_MODEL = "claude-sonnet-4-6";
const FALLBACK_MODEL = "gpt-4o";
// Lowered from 5 → 3 after first prod run hit Anthropic rate-limits at ~40
// listings, causing 33% silent fallback to GPT.
const CONCURRENCY = 3;
const MIN_DESC_LENGTH = 500;
const TARGET_LANG = "en";
// Retry primary on rate-limit / overloaded errors before falling back.
const PRIMARY_MAX_RETRIES = 3;
const PRIMARY_RETRY_BASE_DELAY_MS = 2000;

const AREI_VOICE_PROMPT = `Du skriver om fastighets-descriptions för AREI, en data-infrastrukturprodukt för afrikansk fastighetsmarknad. Givet källtext (vilket språk som helst) och strukturerad data, producera 2-3 stycken välskriven engelsk prosa i AREI-röst.

AREI-röst:
- Faktabaserad och neutral
- Specifik före generell ("five minutes from the main beach" hellre än "great location")
- Komprimerad — varje mening bär information
- Ingen säljterminologi: "ideal", "perfect", "rare opportunity", "splendid", "unique", "stunning"
- Inga emojis
- Inga bedömningar om avkastning eller värdering
- Behåll egennamn på källspråket (Cá Almeida, São Paulo district, Conservatória do Registo Predial)
- När källan gör en bedömning (motivated sale, undervalued), attribuera till källan: "the source notes a motivated sale" — gör inte påståendet i AREI:s egen text

Struktur (mjuk riktlinje, inte tvång):
- Stycke 1: vad det är, var det ligger, viktigaste särdrag (~50 ord)
- Stycke 2: layout, skick, features (~40-60 ord)
- Stycke 3 (om relevant): status, services, juridiska noter (~30-50 ord)

Hitta inte på fakta. Om källan inte nämner skick — skriv inte om skick. Om källan inte nämner sea view — skriv inte om sea view.

Konflikthantering och informationsluckor hanteras tyst. Om structured data och källan är i konflikt, välj det troliga värdet utan att kommentera valet. Om en uppgift saknas i källan, utelämna fältet helt. Skriv aldrig meta-kommentarer om själva skrivprocessen — undvik fraser som "there is a conflict between...", "no information is provided in the source", "I will use the figure...". (Detta gäller inte attribuering av källans bedömningar — "the source notes a motivated sale" är fortsatt rätt. Skillnaden: attribuera källans åsikter, men kommentera aldrig din egen skrivprocess.)

Geografisk kontext: Varje description ska innehålla "Cape Verde" (eller "Cabo Verde" om källan är på portugisiska och redan använder den formen) minst en gång, även om källtexten bara nämner ö-namn eller stadsdelar. För internationella köpare är landet kärnan i värdesatsen — ö-namn ensamt räcker inte.

Output: ren text, inga JSON-strukturer, inga rubriker, inga listor. Bara 2-3 stycken prosa separerade med dubbel radbrytning.`;

interface Listing {
  id: string;
  source_id: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  property_size_sqm: number | null;
  land_area_sqm: number | null;
  property_type: string | null;
  city: string | null;
  island: string | null;
  country: string | null;
  region: string | null;
  amenities: string[] | null;
  rendered_translation_source_language: string | null;
  ai_descriptions: Record<string, unknown> | null;
}

const LISTING_COLUMNS = [
  "id",
  "source_id",
  "title",
  "description",
  "price",
  "bedrooms",
  "bathrooms",
  "property_size_sqm",
  "land_area_sqm",
  "property_type",
  "city",
  "island",
  "country",
  "region",
  "amenities",
  "rendered_translation_source_language",
  "ai_descriptions",
].join(",");

interface Args {
  limit: number | null;
  force: boolean;
  dryRun: boolean;
  noWrite: boolean;
  rerunFallback: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let force = false;
  let dryRun = false;
  let noWrite = false;
  let rerunFallback = false;
  for (const a of args) {
    if (a.startsWith("--limit=")) limit = parseInt(a.split("=")[1], 10);
    else if (a === "--force") force = true;
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--no-write") noWrite = true;
    else if (a === "--rerun-fallback") rerunFallback = true;
  }
  // --rerun-fallback implies --force (we want to overwrite the GPT entries).
  if (rerunFallback) force = true;
  return { limit, force, dryRun, noWrite, rerunFallback };
}

function buildUserMessage(l: Listing): string {
  const sourceLang =
    l.rendered_translation_source_language ?? "unknown (auto-detect from text)";
  const fields = [
    ["property_type", l.property_type],
    ["city", l.city],
    ["island", l.island],
    ["country", l.country],
    ["region", l.region],
    ["bedrooms", l.bedrooms],
    ["bathrooms", l.bathrooms],
    ["property_size_sqm", l.property_size_sqm],
    ["land_area_sqm", l.land_area_sqm],
    ["price", l.price],
    ["amenities", l.amenities && l.amenities.length ? l.amenities.join(", ") : null],
  ]
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return [
    `Source language: ${sourceLang}`,
    `Target language: ${TARGET_LANG}`,
    "",
    "Structured data:",
    fields || "- (no structured fields available)",
    "",
    "Source description:",
    "```",
    l.description ?? "",
    "```",
    "",
    "Output the rewritten English description as plain prose only.",
  ].join("\n");
}

function isRetryablePrimaryError(e: any): boolean {
  const status = e?.status ?? e?.response?.status;
  if (status === 429 || status === 529 || status === 503 || status === 500) return true;
  const msg = String(e?.message ?? "");
  return /rate.?limit|overloaded|too many requests/i.test(msg);
}

async function callClaudeOnce(client: Anthropic, l: Listing): Promise<string> {
  const resp = await client.messages.create({
    model: PRIMARY_MODEL,
    max_tokens: 1024,
    system: AREI_VOICE_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(l) }],
  });
  const block = resp.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude: no text block");
  const text = block.text.trim();
  if (!text) throw new Error("Claude: empty text");
  return text;
}

async function callClaude(client: Anthropic, l: Listing): Promise<string> {
  let lastErr: any;
  for (let attempt = 0; attempt < PRIMARY_MAX_RETRIES; attempt++) {
    try {
      return await callClaudeOnce(client, l);
    } catch (e) {
      lastErr = e;
      if (attempt < PRIMARY_MAX_RETRIES - 1 && isRetryablePrimaryError(e)) {
        const delay = PRIMARY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function callGpt(client: OpenAI, l: Listing): Promise<string> {
  const resp = await client.chat.completions.create({
    model: FALLBACK_MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    messages: [
      { role: "system", content: AREI_VOICE_PROMPT },
      { role: "user", content: buildUserMessage(l) },
    ],
  });
  const text = resp.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("GPT: empty response");
  return text;
}

interface ProcessResult {
  id: string;
  status: "skipped" | "ok_primary" | "ok_fallback" | "failed" | "dry_run";
  text?: string;
  primary_error?: string;
  fallback_error?: string;
  elapsed_ms: number;
}

async function processListing(
  l: Listing,
  anthropic: Anthropic,
  openai: OpenAI,
  args: Args,
  sb: ReturnType<typeof getSupabaseClient>
): Promise<ProcessResult> {
  const startedAt = Date.now();

  // Idempotency: skip if en already filled, unless --force.
  const existing = (l.ai_descriptions ?? {}) as Record<string, any>;
  const existingEn = existing[TARGET_LANG];
  if (!args.force && existingEn && typeof existingEn.text === "string" && existingEn.text.length > 0) {
    return { id: l.id, status: "skipped", elapsed_ms: Date.now() - startedAt };
  }

  if (args.dryRun) {
    return { id: l.id, status: "dry_run", elapsed_ms: Date.now() - startedAt };
  }

  // Try primary, then fallback.
  let text = "";
  let primaryError: string | undefined;
  let fallbackError: string | undefined;
  let usedFallback = false;
  try {
    text = await callClaude(anthropic, l);
  } catch (e: any) {
    primaryError = String(e?.message ?? e);
    try {
      text = await callGpt(openai, l);
      usedFallback = true;
    } catch (e2: any) {
      fallbackError = String(e2?.message ?? e2);
    }
  }

  if (!text) {
    return {
      id: l.id,
      status: "failed",
      primary_error: primaryError,
      fallback_error: fallbackError,
      elapsed_ms: Date.now() - startedAt,
    };
  }

  // Write to DB unless --no-write. Merge with existing object so other
  // language entries (when added later) are preserved.
  if (!args.noWrite) {
    const merged = {
      ...existing,
      [TARGET_LANG]: {
        text,
        generated_at: new Date().toISOString(),
        prompt_version: PROMPT_VERSION,
        model: usedFallback ? FALLBACK_MODEL : PRIMARY_MODEL,
        validated: false,
      },
    };
    const { error } = await sb
      .from("listings")
      .update({ ai_descriptions: merged })
      .eq("id", l.id);
    if (error) {
      return {
        id: l.id,
        status: "failed",
        primary_error: primaryError,
        fallback_error: `db_write_error: ${error.message}`,
        elapsed_ms: Date.now() - startedAt,
      };
    }
  }

  return {
    id: l.id,
    status: usedFallback ? "ok_fallback" : "ok_primary",
    text,
    primary_error: primaryError,
    elapsed_ms: Date.now() - startedAt,
  };
}

async function fetchScope(rerunFallback: boolean): Promise<Listing[]> {
  const sb = getSupabaseClient();
  const all: Listing[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = sb
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("indexable", true)
      .not("description", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (rerunFallback) {
      // Only listings whose current en entry was produced by the fallback model.
      q = q.eq("ai_descriptions->en->>model", FALLBACK_MODEL);
    }
    const { data, error } = await q;
    if (error) throw new Error(`fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as Listing[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all.filter((l) => (l.description ?? "").length > MIN_DESC_LENGTH);
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number, last: R) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  async function lane() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      done++;
      onProgress?.(done, items.length, results[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
  return results;
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  }

  const runId = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/-\d{3}Z$/, "Z");
  const outDir = path.resolve(__dirname, "experiments/description_rewrite_v1/output");
  fs.mkdirSync(outDir, { recursive: true });
  const failedPath = path.join(outDir, `backfill-${runId}.failed.jsonl`);
  const summaryPath = path.join(outDir, `backfill-${runId}.summary.json`);

  console.log(
    `[backfill] run_id=${runId} prompt_version=${PROMPT_VERSION} ` +
      `limit=${args.limit ?? "all"} force=${args.force} dry_run=${args.dryRun} no_write=${args.noWrite}`
  );

  console.log(`[backfill] fetching scope…`);
  const allInScope = await fetchScope(args.rerunFallback);
  if (args.rerunFallback) {
    console.log(`[backfill] scope: ${allInScope.length} listings (rerun-fallback: model=${FALLBACK_MODEL})`);
  } else {
    console.log(`[backfill] scope: ${allInScope.length} listings (indexable, description, len>${MIN_DESC_LENGTH})`);
  }

  const todo = args.limit ? allInScope.slice(0, args.limit) : allInScope;
  const skippedExisting = args.force
    ? 0
    : todo.filter((l) => {
        const en = (l.ai_descriptions ?? {})[TARGET_LANG] as any;
        return en && typeof en.text === "string" && en.text.length > 0;
      }).length;
  console.log(`[backfill] processing ${todo.length} listings (${skippedExisting} will be skipped as already-done unless --force)`);

  const sb = getSupabaseClient();
  const anthropic = args.dryRun
    ? (null as unknown as Anthropic)
    : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = args.dryRun
    ? (null as unknown as OpenAI)
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const counts = { skipped: 0, ok_primary: 0, ok_fallback: 0, failed: 0, dry_run: 0 };
  const failedRows: ProcessResult[] = [];
  const primaryErrorRows: ProcessResult[] = [];
  const startedAt = Date.now();

  const results = await runWithConcurrency(
    todo,
    CONCURRENCY,
    (l) => processListing(l, anthropic, openai, args, sb),
    (done, total, last) => {
      counts[last.status]++;
      if (last.status === "failed") failedRows.push(last);
      if (last.primary_error) primaryErrorRows.push(last);
      if (done % 10 === 0 || done === total) {
        console.log(
          `[backfill] ${done}/${total}  ok=${counts.ok_primary}+${counts.ok_fallback}fb  skip=${counts.skipped}  fail=${counts.failed}`
        );
      }
    }
  );

  if (failedRows.length > 0) {
    fs.writeFileSync(
      failedPath,
      failedRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
      "utf8"
    );
    console.log(`[backfill] wrote ${failedRows.length} failures to ${failedPath}`);
  }
  if (primaryErrorRows.length > 0) {
    const primaryErrPath = path.join(outDir, `backfill-${runId}.primary-errors.jsonl`);
    fs.writeFileSync(
      primaryErrPath,
      primaryErrorRows
        .map((r) => JSON.stringify({ id: r.id, status: r.status, primary_error: r.primary_error }))
        .join("\n") + "\n",
      "utf8"
    );
    console.log(`[backfill] wrote ${primaryErrorRows.length} primary errors to ${primaryErrPath}`);
  }

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  const summary = {
    run_id: runId,
    prompt_version: PROMPT_VERSION,
    primary_model: PRIMARY_MODEL,
    fallback_model: FALLBACK_MODEL,
    started_at: new Date(startedAt).toISOString(),
    elapsed_sec: elapsedSec,
    args,
    scope_total: allInScope.length,
    processed: results.length,
    counts,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");

  console.log(`[backfill] done in ${elapsedSec}s`);
  console.log(`[backfill] counts: ${JSON.stringify(counts)}`);
  console.log(`[backfill] summary: ${summaryPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
