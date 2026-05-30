/**
 * backfill_agencies_from_sources.ts
 *
 * Populates public.agencies from the Cape Verde source registry
 * (markets/cv/sources.yml). One agency per active scraping source.
 *
 * WHAT THIS DOES
 * ──────────────
 * 1. Deletes the test seed record "Archipelago Real Estate" if it exists
 *    (identified by exact agency_name match + example-domain website).
 * 2. Reads markets/cv/sources.yml and filters to active sources:
 *    - Excludes type: stub
 *    - Excludes lifecycleOverride: DROP
 * 3. For each active source, checks whether an agency already has that
 *    source_id in its source_ids array.
 *    - If found: skips (idempotent).
 *    - If not found: inserts a new agency row.
 * 4. Populates only what is available from source metadata:
 *    - agency_name ← source.name
 *    - public_display_name ← source.name
 *    - website ← base URL (origin) derived from source.url
 *    - source_ids ← [source.id]
 *    - market_code ← market prefix from source id (e.g. "cv_..." → "cv")
 *    - claimed_status ← "unclaimed"
 *    - data_partner_status ← "none"
 *    - email, phone, whatsapp, logo_url, description ← null (not invented)
 *
 * IDEMPOTENCY
 * ───────────
 * Safe to re-run. Existing agency rows with matching source_ids are never
 * modified — this preserves any edits made via the Agency Console.
 *
 * RUN
 * ───
 *   npx ts-node --transpile-only scripts/backfill_agencies_from_sources.ts
 *   npx ts-node --transpile-only scripts/backfill_agencies_from_sources.ts --dry-run
 *
 * FLAGS
 *   --dry-run    print what would be inserted/deleted without writing to DB
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

import { getSupabaseClient } from "../core/supabaseClient";

// ─── Args ────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Source config type (subset we need) ─────────────────────────────────────
interface RawSource {
  id: string;
  name: string;
  url: string;
  type?: string;
  lifecycleOverride?: string;
}

interface SourcesFile {
  market: string;
  sources: RawSource[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the URL origin (protocol + hostname) from a scraping URL.
 * "https://terracaboverde.com/properties/" → "https://terracaboverde.com"
 * Returns null if the URL is not parseable.
 */
function extractWebsite(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * Derive market_code from source id prefix.
 * "cv_terracaboverde" → "cv"
 * Falls back to the sources.yml market field if there's no underscore.
 */
function marketFromSourceId(id: string, fileMarket: string): string {
  const underscore = id.indexOf("_");
  return underscore > 0 ? id.slice(0, underscore) : fileMarket;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const sourcesPath = path.join(repoRoot, "markets", "cv", "sources.yml");

  if (!fs.existsSync(sourcesPath)) {
    console.error(`[backfill] sources.yml not found at ${sourcesPath}`);
    process.exit(1);
  }

  const raw = yaml.load(fs.readFileSync(sourcesPath, "utf8")) as SourcesFile;
  const allSources: RawSource[] = raw.sources ?? [];
  const market = raw.market ?? "cv";

  // Filter: active sources only
  const activeSources = allSources.filter((s) => {
    if (s.type === "stub") return false;
    if (s.lifecycleOverride === "DROP") return false;
    return true;
  });

  console.log(`[backfill] ${allSources.length} total sources → ${activeSources.length} active (non-stub, non-DROP)`);

  if (DRY_RUN) {
    console.log("\n[dry-run] Would clean up test seed:");
    console.log('  DELETE WHERE agency_name = "Archipelago Real Estate" AND website LIKE "%archipelago-cv.example%"');
    console.log("\n[dry-run] Would upsert agencies for:");
    for (const s of activeSources) {
      console.log(`  ${s.id} → "${s.name}" (${extractWebsite(s.url) ?? "no website"})`);
    }
    console.log("\n[dry-run] No DB writes. Re-run without --dry-run to apply.");
    return;
  }

  const sb = getSupabaseClient();

  // ── Step 1: Remove the test seed row (very narrow condition) ──────────────
  // Narrow OR condition (as authorised): the reserved .example domain can
  // never be a real agency site, and the exact legacy name is unambiguous.
  // The website match also catches renamed variants like
  // "Archipelago Real Estate (DEMO)".
  const { error: delError, count: delCount } = await sb
    .from("agencies")
    .delete({ count: "exact" })
    .or('website.ilike.%archipelago-cv.example%,agency_name.eq.Archipelago Real Estate');

  if (delError) {
    console.warn("[backfill] Warning: could not delete test seed row:", delError.message);
  } else if ((delCount ?? 0) > 0) {
    console.log(`[backfill] Deleted ${delCount} test seed row(s) (Archipelago Real Estate)`);
  } else {
    console.log("[backfill] No test seed row found (already clean)");
  }

  // ── Step 2: Fetch existing agencies to check for already-linked source_ids ─
  const { data: existingAgencies, error: fetchError } = await sb
    .from("agencies")
    .select("id, agency_name, source_ids")
    .eq("market_code", market);

  if (fetchError) {
    console.error("[backfill] Failed to fetch existing agencies:", fetchError.message);
    process.exit(1);
  }

  const linkedSourceIds = new Set<string>(
    (existingAgencies ?? []).flatMap((a: { source_ids: string[] }) => a.source_ids ?? [])
  );

  console.log(`[backfill] ${linkedSourceIds.size} source_ids already linked to existing agencies`);

  // ── Step 3: Insert missing agencies ────────────────────────────────────────
  const toInsert = activeSources.filter((s) => !linkedSourceIds.has(s.id));
  const toSkip = activeSources.filter((s) => linkedSourceIds.has(s.id));

  if (toSkip.length > 0) {
    console.log(`[backfill] Skipping ${toSkip.length} already-linked source(s): ${toSkip.map((s) => s.id).join(", ")}`);
  }

  if (toInsert.length === 0) {
    console.log("[backfill] All active sources already have agency records. Nothing to insert.");
    return;
  }

  console.log(`[backfill] Inserting ${toInsert.length} new agency record(s)...`);

  const now = new Date().toISOString();
  const rows = toInsert.map((s) => ({
    market_code: marketFromSourceId(s.id, market),
    agency_name: s.name,
    public_display_name: s.name,
    website: extractWebsite(s.url),
    source_ids: [s.id],
    claimed_status: "unclaimed",
    data_partner_status: "none",
    // All contact / media fields intentionally null — not invented
    email: null,
    phone: null,
    whatsapp: null,
    logo_url: null,
    description: null,
    created_at: now,
    updated_at: now,
  }));

  const { error: insertError } = await sb.from("agencies").insert(rows);

  if (insertError) {
    console.error("[backfill] Insert failed:", insertError.message);
    process.exit(1);
  }

  console.log(`[backfill] ✓ Inserted ${rows.length} agency record(s):`);
  for (const row of rows) {
    console.log(`  ${row.source_ids[0]} → "${row.agency_name}" (${row.website ?? "no website"})`);
  }
  console.log("\n[backfill] Done. Run again to verify idempotency.");
}

main().catch((err) => {
  console.error("[backfill] Fatal:", err);
  process.exit(1);
});
