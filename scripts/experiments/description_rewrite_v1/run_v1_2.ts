/**
 * Description-rewrite feasibility study v1.2.
 *
 * Same sample composition + dual-model setup as v1.1. Two prompt fixes
 * applied based on v1.1 evaluation:
 *   1. Silent conflict-handling — no first-person meta-commentary about
 *      the writing process when source/structured data conflict or when
 *      info is missing.
 *   2. Mandatory "Cape Verde" mention regardless of whether source text
 *      explicitly names the country.
 *
 * Adds --ids flag for targeted spot-check on specific listing IDs (used to
 * verify the meta-commentary regression is fixed on the two known-bad cases
 * from v1.1: ecv_04a410910fb2 and cv_simplycapeverde:ilha-de-lux).
 *
 * Source quotas same as v1.1 (Gabetti excluded). Filters same:
 * description IS NOT NULL AND LENGTH(description) > 500. Within each
 * source: stratify on property_type (with `_unknown` bucket).
 *
 * Run:
 *   npx ts-node --transpile-only scripts/experiments/description_rewrite_v1/run_v1_2.ts
 *
 * Flags:
 *   --smoke         pull 1 from each source (7 total)
 *   --ids=a,b,c     run only on these specific listing IDs (ignores quotas)
 *   --dry-run       skip LLM calls
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: true,
});
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSupabaseClient } from "../../../core/supabaseClient";

const PROMPT_VERSION = "v1.2";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const GPT_MODEL = "gpt-4o";
const CONCURRENCY = 5;
const MIN_DESC_LENGTH = 500;

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

const SOURCE_QUOTAS: Record<string, number> = {
  cv_estatecv: 8,
  cv_terracaboverde: 5,
  cv_simplycapeverde: 4,
  cv_homescasaverde: 4,
  cv_capeverdeproperty24: 3,
  cv_cabohouseproperty: 3,
  cv_oceanproperty24: 3,
};

interface Listing {
  id: string;
  source_id: string | null;
  source_url: string | null;
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
  rendered_description_en: string | null;
  rendered_translation_source_language: string | null;
  rendered_translation_target_language: string | null;
}

const LISTING_COLUMNS = [
  "id",
  "source_id",
  "source_url",
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
  "rendered_description_en",
  "rendered_translation_source_language",
  "rendered_translation_target_language",
].join(",");

function parseArgs(): { smoke: boolean; dryRun: boolean; ids: string[] | null } {
  const args = process.argv.slice(2);
  let ids: string[] | null = null;
  for (const a of args) {
    if (a.startsWith("--ids=")) {
      ids = a
        .slice("--ids=".length)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }
  return {
    smoke: args.includes("--smoke"),
    dryRun: args.includes("--dry-run"),
    ids,
  };
}

async function fetchByIds(ids: string[]): Promise<Listing[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLUMNS)
    .in("id", ids);
  if (error) throw new Error(`Supabase id-fetch failed: ${error.message}`);
  // Preserve user-supplied order, drop any IDs that didn't resolve.
  const byId = new Map<string, Listing>();
  for (const l of data ?? []) byId.set(l.id, l as Listing);
  return ids.map((id) => byId.get(id)).filter((l): l is Listing => !!l);
}

function lengthBucket(text: string | null): "med" | "long" {
  // With LENGTH(description) > 500 filter applied, only med/long apply.
  return (text ?? "").length <= 1500 ? "med" : "long";
}

function stratifyWithinSource(pool: Listing[], target: number): Listing[] {
  if (pool.length <= target) return pool.slice();
  const groups = new Map<string, Listing[]>();
  for (const l of pool) {
    const key = `${l.property_type ?? "_unknown"}|${lengthBucket(l.description)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  const buckets = [...groups.values()].map((g) =>
    g.slice().sort((a, b) => a.id.localeCompare(b.id))
  );
  buckets.sort((a, b) => a[0].id.localeCompare(b[0].id));
  const picked: Listing[] = [];
  let i = 0;
  while (picked.length < target) {
    const b = buckets[i % buckets.length];
    if (b.length > 0) picked.push(b.shift()!);
    i++;
    if (buckets.every((bb) => bb.length === 0)) break;
  }
  return picked.slice(0, target);
}

async function fetchSourcePool(source: string): Promise<Listing[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("source_id", source)
    .not("description", "is", null)
    .limit(500);
  if (error) throw new Error(`Supabase fetch failed for ${source}: ${error.message}`);
  // Apply LENGTH(description) > 500 client-side (pgrest doesn't expose length()).
  return (data ?? []).filter(
    (l: Listing) => (l.description ?? "").length > MIN_DESC_LENGTH
  );
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
    `Target language: en`,
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

async function callClaude(client: Anthropic, l: Listing): Promise<string> {
  const resp = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: AREI_VOICE_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(l) }],
  });
  const block = resp.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude: no text block");
  return block.text.trim();
}

async function callGpt(client: OpenAI, l: Listing): Promise<string> {
  const resp = await client.chat.completions.create({
    model: GPT_MODEL,
    max_tokens: 1024,
    temperature: 0.5,
    messages: [
      { role: "system", content: AREI_VOICE_PROMPT },
      { role: "user", content: buildUserMessage(l) },
    ],
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) throw new Error("GPT: empty response");
  return text.trim();
}

function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

interface RowResult {
  id: string;
  source_id: string;
  pool: "rendered" | "null";
  source_lang: string;
  property_type: string;
  original_text: string;
  original_words: number;
  rendered_description_en: string;
  rendered_words: number;
  claude_text: string;
  claude_words: number;
  claude_error: string;
  gpt_text: string;
  gpt_words: number;
  gpt_error: string;
}

const CSV_HEADERS = [
  "run_id",
  "prompt_version",
  "id",
  "source_id",
  "pool",
  "source_lang",
  "property_type",
  "original_words",
  "rendered_words",
  "claude_words",
  "gpt_words",
  "original_text",
  "rendered_description_en",
  "claude_text",
  "gpt_text",
  "claude_error",
  "gpt_error",
  "facts_preserved_claude",
  "facts_preserved_gpt",
  "facts_invented_claude",
  "facts_invented_gpt",
  "tone_quality_claude",
  "tone_quality_gpt",
  "readability_claude",
  "readability_gpt",
  "vs_original_claude",
  "vs_original_gpt",
  "formatting_improvement_claude",
  "formatting_improvement_gpt",
  "notes",
];

async function processOne(
  l: Listing,
  anthropic: Anthropic,
  openai: OpenAI,
  dryRun: boolean
): Promise<RowResult> {
  const original = l.description ?? "";
  const rendered = l.rendered_description_en ?? "";
  let claude_text = "";
  let claude_error = "";
  let gpt_text = "";
  let gpt_error = "";
  if (!dryRun) {
    const [c, g] = await Promise.all([
      callClaude(anthropic, l).catch((e) => ({ __err: String(e?.message ?? e) })),
      callGpt(openai, l).catch((e) => ({ __err: String(e?.message ?? e) })),
    ]);
    if (typeof c === "string") claude_text = c;
    else claude_error = c.__err;
    if (typeof g === "string") gpt_text = g;
    else gpt_error = g.__err;
  }
  return {
    id: l.id,
    source_id: l.source_id ?? "",
    pool: rendered ? "rendered" : "null",
    source_lang: l.rendered_translation_source_language ?? "unknown",
    property_type: l.property_type ?? "",
    original_text: original,
    original_words: wordCount(original),
    rendered_description_en: rendered,
    rendered_words: rendered ? wordCount(rendered) : 0,
    claude_text,
    claude_words: claude_text ? wordCount(claude_text) : 0,
    claude_error,
    gpt_text,
    gpt_words: gpt_text ? wordCount(gpt_text) : 0,
    gpt_error,
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
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
      onProgress?.(done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => lane()));
  return results;
}

async function main(): Promise<void> {
  const { smoke, dryRun, ids } = parseArgs();
  if (!dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  }

  const runId = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/-\d{3}Z$/, "Z");
  const outDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const csvPath = path.join(outDir, `${runId}.csv`);
  const metaPath = path.join(outDir, `${runId}.meta.json`);

  const mode = ids ? "ids" : smoke ? "smoke" : "full";
  console.log(`[v1.2] run_id=${runId} prompt_version=${PROMPT_VERSION} mode=${mode} dry_run=${dryRun}`);

  const picks: Array<{ l: Listing; sourceQuota: number }> = [];
  const sourceStats: Array<{ source: string; eligible: number; picked: number; quota: number }> = [];

  if (ids) {
    const fetched = await fetchByIds(ids);
    const missing = ids.filter((id) => !fetched.find((l) => l.id === id));
    if (missing.length) console.log(`[v1.2] ⚠ unresolved ids: ${missing.join(", ")}`);
    for (const l of fetched) picks.push({ l, sourceQuota: 0 });
    console.log(`[v1.2] id-mode picks=${picks.length}`);
  } else {
    for (const [source, quota] of Object.entries(SOURCE_QUOTAS)) {
      const target = smoke ? 1 : quota;
      const pool = await fetchSourcePool(source);
      const picked = stratifyWithinSource(pool, target);
      sourceStats.push({ source, eligible: pool.length, picked: picked.length, quota: target });
      for (const l of picked) picks.push({ l, sourceQuota: quota });
    }
    console.log(`[v1.2] sample composition:`);
    for (const s of sourceStats) {
      const flag = s.picked < s.quota ? " ⚠ short" : "";
      console.log(`  ${s.source.padEnd(28)} eligible=${String(s.eligible).padStart(4)}  picked=${s.picked}/${s.quota}${flag}`);
    }
    console.log(`[v1.2] total picks=${picks.length}`);
  }

  const anthropic = dryRun
    ? (null as unknown as Anthropic)
    : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = dryRun
    ? (null as unknown as OpenAI)
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const startedAt = Date.now();
  const results = await runWithConcurrency(
    picks,
    CONCURRENCY,
    (p) => processOne(p.l, anthropic, openai, dryRun),
    (done, total) => {
      if (done % 5 === 0 || done === total) {
        console.log(`[v1.2] ${done}/${total} done`);
      }
    }
  );
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);

  const lines = [CSV_HEADERS.join(",")];
  for (const r of results) {
    const row: Record<string, unknown> = {
      run_id: runId,
      prompt_version: PROMPT_VERSION,
      id: r.id,
      source_id: r.source_id,
      pool: r.pool,
      source_lang: r.source_lang,
      property_type: r.property_type,
      original_words: r.original_words,
      rendered_words: r.rendered_words,
      claude_words: r.claude_words,
      gpt_words: r.gpt_words,
      original_text: r.original_text,
      rendered_description_en: r.rendered_description_en,
      claude_text: r.claude_text,
      gpt_text: r.gpt_text,
      claude_error: r.claude_error,
      gpt_error: r.gpt_error,
    };
    lines.push(CSV_HEADERS.map((h) => csvEscape(row[h] ?? "")).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n") + "\n", "utf8");

  const meta = {
    run_id: runId,
    study_iteration: "v1.1",
    prompt_version: PROMPT_VERSION,
    started_at: new Date(startedAt).toISOString(),
    elapsed_sec: elapsedSec,
    models: { claude: CLAUDE_MODEL, gpt: GPT_MODEL },
    filters: { description_not_null: true, min_description_length: MIN_DESC_LENGTH },
    source_quotas: SOURCE_QUOTAS,
    source_stats: sourceStats,
    counts: {
      total_picked: results.length,
      claude_errors: results.filter((r) => r.claude_error).length,
      gpt_errors: results.filter((r) => r.gpt_error).length,
    },
    listing_ids: results.map((r) => ({ id: r.id, source_id: r.source_id, pool: r.pool })),
    prompt: AREI_VOICE_PROMPT,
    smoke,
    dry_run: dryRun,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

  console.log(`[v1.2] wrote ${csvPath}`);
  console.log(`[v1.2] wrote ${metaPath}`);
  console.log(
    `[v1.2] elapsed=${elapsedSec}s  claude_errors=${meta.counts.claude_errors}  gpt_errors=${meta.counts.gpt_errors}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
