/**
 * Description-rewrite feasibility study v1.
 *
 * Fetches a stratified sample of listings, rewrites the description with
 * Claude Sonnet 4.6 + GPT-4o in parallel, and writes a side-by-side CSV
 * for manual evaluation.
 *
 * Sample pool:
 *   - 25 listings with rendered_description_en NOT NULL (it→en today)
 *   - 5 listings with rendered_description_en NULL (raw source → AREI prose)
 *
 * Output:
 *   scripts/experiments/description_rewrite_v1/output/{run_id}.csv
 *   scripts/experiments/description_rewrite_v1/output/{run_id}.meta.json
 *
 * Run:
 *   ANTHROPIC_API_KEY=... OPENAI_API_KEY=... \
 *   npx ts-node --transpile-only scripts/experiments/description_rewrite_v1/run.ts
 *
 * Flags:
 *   --limit-rendered=N   override default 25
 *   --limit-null=N       override default 5
 *   --smoke              shorthand for --limit-rendered=1 --limit-null=1
 *   --dry-run            skip LLM calls (for sample-selection debugging)
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
// Override empty shell env vars (e.g. ANTHROPIC_API_KEY left empty by parent runtime)
// with values from the project .env. Must run before any module that consumes process.env.
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: true,
});
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getSupabaseClient } from "../../../core/supabaseClient";

const PROMPT_VERSION = "v1";
const CLAUDE_MODEL = "claude-sonnet-4-6";
const GPT_MODEL = "gpt-4o";
const CONCURRENCY = 5;

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

Output: ren text, inga JSON-strukturer, inga rubriker, inga listor. Bara 2-3 stycken prosa separerade med dubbel radbrytning.`;

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

function parseArgs(): {
  limitRendered: number;
  limitNull: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let limitRendered = 25;
  let limitNull = 5;
  let dryRun = false;
  for (const a of args) {
    if (a === "--smoke") {
      limitRendered = 1;
      limitNull = 1;
    } else if (a === "--dry-run") {
      dryRun = true;
    } else if (a.startsWith("--limit-rendered=")) {
      limitRendered = parseInt(a.split("=")[1], 10);
    } else if (a.startsWith("--limit-null=")) {
      limitNull = parseInt(a.split("=")[1], 10);
    }
  }
  return { limitRendered, limitNull, dryRun };
}

function lengthBucket(text: string | null): "short" | "med" | "long" {
  const n = (text ?? "").length;
  if (n < 500) return "short";
  if (n <= 1500) return "med";
  return "long";
}

function stratifiedSample(pool: Listing[], target: number): Listing[] {
  if (pool.length <= target) return pool.slice();
  // Group by (property_type || "_unknown") + length bucket of description.
  const groups = new Map<string, Listing[]>();
  for (const l of pool) {
    const key = `${l.property_type ?? "_unknown"}|${lengthBucket(l.description)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }
  // Sort each group deterministically by id, then round-robin pick.
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

async function fetchPool(
  whereRendered: "not_null" | "null",
  cap: number
): Promise<Listing[]> {
  const sb = getSupabaseClient();
  // Pull a generous candidate set so stratification has room.
  const candidateLimit = Math.max(cap * 6, 100);
  let query = sb.from("listings").select(LISTING_COLUMNS).limit(candidateLimit);
  if (whereRendered === "not_null") {
    query = query.not("rendered_description_en", "is", null);
  } else {
    query = query.is("rendered_description_en", null);
  }
  // Only listings with a non-trivial source description are eligible.
  query = query.not("description", "is", null);
  const { data, error } = await query;
  if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
  return (data ?? []).filter((l: Listing) => (l.description ?? "").trim().length > 30);
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
  source_lang: string;
  property_type: string;
  pool: "rendered" | "null";
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
  "notes",
];

async function processOne(
  l: Listing,
  pool: "rendered" | "null",
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
    source_lang:
      l.rendered_translation_source_language ?? (pool === "rendered" ? "?" : "unknown"),
    property_type: l.property_type ?? "",
    pool,
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
  const { limitRendered, limitNull, dryRun } = parseArgs();
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

  console.log(`[study] run_id=${runId} prompt_version=${PROMPT_VERSION}`);
  console.log(`[study] target rendered=${limitRendered} null=${limitNull} dry_run=${dryRun}`);

  console.log(`[study] fetching pools…`);
  const [renderedPool, nullPool] = await Promise.all([
    fetchPool("not_null", limitRendered),
    fetchPool("null", limitNull),
  ]);
  console.log(
    `[study] candidate pools: rendered=${renderedPool.length} null=${nullPool.length}`
  );

  const renderedPick = stratifiedSample(renderedPool, limitRendered);
  const nullPick = stratifiedSample(nullPool, limitNull);
  console.log(`[study] stratified picks: rendered=${renderedPick.length} null=${nullPick.length}`);

  const anthropic = dryRun
    ? (null as unknown as Anthropic)
    : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = dryRun
    ? (null as unknown as OpenAI)
    : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const tasks: Array<{ l: Listing; pool: "rendered" | "null" }> = [
    ...renderedPick.map((l) => ({ l, pool: "rendered" as const })),
    ...nullPick.map((l) => ({ l, pool: "null" as const })),
  ];

  const startedAt = Date.now();
  const results = await runWithConcurrency(
    tasks,
    CONCURRENCY,
    (t) => processOne(t.l, t.pool, anthropic, openai, dryRun),
    (done, total) => {
      if (done % 5 === 0 || done === total) {
        console.log(`[study] ${done}/${total} done`);
      }
    }
  );
  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);

  const lines = [CSV_HEADERS.join(",")];
  for (const r of results) {
    lines.push(
      [
        runId,
        PROMPT_VERSION,
        r.id,
        r.pool,
        r.source_lang,
        r.property_type,
        r.original_words,
        r.rendered_words,
        r.claude_words,
        r.gpt_words,
        r.original_text,
        r.rendered_description_en,
        r.claude_text,
        r.gpt_text,
        r.claude_error,
        r.gpt_error,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  fs.writeFileSync(csvPath, lines.join("\n") + "\n", "utf8");

  const meta = {
    run_id: runId,
    prompt_version: PROMPT_VERSION,
    started_at: new Date(startedAt).toISOString(),
    elapsed_sec: elapsedSec,
    models: { claude: CLAUDE_MODEL, gpt: GPT_MODEL },
    counts: {
      rendered_target: limitRendered,
      rendered_picked: renderedPick.length,
      null_target: limitNull,
      null_picked: nullPick.length,
      claude_errors: results.filter((r) => r.claude_error).length,
      gpt_errors: results.filter((r) => r.gpt_error).length,
    },
    listing_ids: results.map((r) => ({ id: r.id, pool: r.pool })),
    prompt: AREI_VOICE_PROMPT,
    dry_run: dryRun,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");

  console.log(`[study] wrote ${csvPath}`);
  console.log(`[study] wrote ${metaPath}`);
  console.log(
    `[study] elapsed=${elapsedSec}s  claude_errors=${meta.counts.claude_errors}  gpt_errors=${meta.counts.gpt_errors}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
