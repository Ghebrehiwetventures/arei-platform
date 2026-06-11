import * as fs from "fs";
import * as path from "path";
import { getSupabaseClient } from "../core/supabaseClient";
import { getIslands } from "../core/locationMapper";
import {
  resolveIslandRecovery,
  type IslandRecoverySkipReason,
} from "../core/islandRecovery";

process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ||= process.env.VITE_SUPABASE_ANON_KEY;

type Mode = "dry-run" | "apply";

interface CandidateRow {
  id: string;
  source_id: string;
  title: string | null;
  island: string | null;
  city: string | null;
  source_url: string | null;
  description: string | null;
  image_urls: string[] | null;
  approved: boolean | null;
  is_superseded: boolean | null;
}

interface PlannedUpdate {
  action: "update";
  id: string;
  source_id: string;
  source_url: string | null;
  before: {
    island: string | null;
    city: string | null;
  };
  after: {
    island: string;
    city: string | null;
  };
  confidence: "high" | "medium";
  rule: string;
  matchedText: string | null;
  pageTitleHint: string | null;
}

interface PlannedSkip {
  action: "skip";
  id: string;
  source_id: string;
  source_url: string | null;
  before: {
    island: string | null;
    city: string | null;
  };
  reason: IslandRecoverySkipReason | "no_match";
}

interface PlanArtifact {
  kind: "cv_island_recovery_plan";
  createdAt: string;
  mode: Mode;
  totalCandidates: number;
  plannedUpdateCount: number;
  plannedSkipCount: number;
  updates: PlannedUpdate[];
  skips: PlannedSkip[];
}

interface BackupArtifact {
  kind: "cv_island_recovery_backup";
  createdAt: string;
  mode: "apply";
  totalCandidates: number;
  plannedUpdateCount: number;
  plannedSkipCount: number;
  rows: PlannedUpdate[];
  skips: PlannedSkip[];
}

function getMode(): Mode {
  return process.env.APPLY === "1" ? "apply" : "dry-run";
}

async function loadCandidateRows(): Promise<CandidateRow[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("listings")
    .select(
      "id, source_id, title, island, city, source_url, description, image_urls, approved, is_superseded"
    )
    .ilike("source_id", "cv_%");

  if (error) {
    throw new Error(`Failed to load listings: ${error.message}`);
  }

  return (data || []) as CandidateRow[];
}

async function loadFeedIds(): Promise<Set<string>> {
  const sb = getSupabaseClient();
  const { data, error } = await sb.from("v1_feed_cv").select("id");

  if (error) {
    throw new Error(`Failed to load feed ids: ${error.message}`);
  }

  return new Set((data || []).map((row: { id: string }) => row.id));
}

function selectTargetCandidates(
  rows: CandidateRow[],
  feedIds: Set<string>,
  canonicalIslands: Set<string>
): CandidateRow[] {
  return rows.filter((row) => {
    const hasImages = Array.isArray(row.image_urls) && row.image_urls.length > 0;
    const isVisible = row.approved === true && row.is_superseded !== true;
    const hasSourceUrl = row.source_url != null;
    const notInFeed = !feedIds.has(row.id);
    const invalidIsland = row.island == null || !canonicalIslands.has(row.island);

    return hasImages && isVisible && hasSourceUrl && notInFeed && invalidIsland;
  });
}

function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (!match) return null;
  return match[1].replace(/\s+/g, " ").trim();
}

async function maybeFetchPageTitleHint(row: CandidateRow): Promise<string | null> {
  if (row.source_id !== "cv_globallistings") return null;
  if ((row.island || "").trim() !== "Cape Verde") return null;
  if (!row.source_url) return null;

  try {
    const response = await fetch(row.source_url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;

    const html = await response.text();
    return extractHtmlTitle(html);
  } catch {
    return null;
  }
}

async function buildPlan(candidates: CandidateRow[]): Promise<PlanArtifact> {
  const updates: PlannedUpdate[] = [];
  const skips: PlannedSkip[] = [];

  for (const row of candidates) {
    const pageTitleHint = await maybeFetchPageTitleHint(row);
    const result = resolveIslandRecovery({
      id: row.id,
      sourceId: row.source_id,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      rawIsland: row.island,
      rawCity: row.city,
      pageTitleHint,
    }, "cv");

    if (result.kind === "resolved") {
      updates.push({
        action: "update",
        id: row.id,
        source_id: row.source_id,
        source_url: row.source_url,
        before: {
          island: row.island,
          city: row.city,
        },
        after: {
          island: result.island,
          city: result.city,
        },
        confidence: result.confidence,
        rule: result.rule,
        matchedText: result.matchedText,
        pageTitleHint,
      });
      continue;
    }

    skips.push({
      action: "skip",
      id: row.id,
      source_id: row.source_id,
      source_url: row.source_url,
      before: {
        island: row.island,
        city: row.city,
      },
      reason: result.kind === "skipped" ? result.reason : "no_match",
    });
  }

  return {
    kind: "cv_island_recovery_plan",
    createdAt: new Date().toISOString(),
    mode: getMode(),
    totalCandidates: candidates.length,
    plannedUpdateCount: updates.length,
    plannedSkipCount: skips.length,
    updates,
    skips,
  };
}

function ensureArtifactsDir(): string {
  const artifactsDir = path.resolve(__dirname, "../artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  return artifactsDir;
}

function makeArtifactPath(prefix: string, createdAt: string): string {
  const artifactsDir = ensureArtifactsDir();
  const safeTimestamp = createdAt.replace(/[:.]/g, "-");
  return path.join(artifactsDir, `${prefix}_${safeTimestamp}.json`);
}

function writePlanArtifact(plan: PlanArtifact): string {
  const filePath = makeArtifactPath("cv_island_recovery_plan", plan.createdAt);
  fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
  return filePath;
}

function writeBackupArtifact(plan: PlanArtifact): string {
  const backup: BackupArtifact = {
    kind: "cv_island_recovery_backup",
    createdAt: plan.createdAt,
    mode: "apply",
    totalCandidates: plan.totalCandidates,
    plannedUpdateCount: plan.plannedUpdateCount,
    plannedSkipCount: plan.plannedSkipCount,
    rows: plan.updates,
    skips: plan.skips,
  };
  const filePath = makeArtifactPath("cv_island_recovery_backup", plan.createdAt);
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
  return filePath;
}

async function applyPlan(plan: PlanArtifact): Promise<{
  applied: number;
  failed: number;
  driftSkipped: number;
}> {
  const sb = getSupabaseClient();
  let applied = 0;
  let failed = 0;
  let driftSkipped = 0;

  for (const update of plan.updates) {
    const { data: current, error: readError } = await sb
      .from("listings")
      .select("id, source_id, source_url, island, city")
      .eq("id", update.id)
      .single();

    if (readError || !current) {
      failed += 1;
      continue;
    }

    const drifted =
      current.source_id !== update.source_id ||
      current.source_url !== update.source_url ||
      current.island !== update.before.island ||
      current.city !== update.before.city;

    if (drifted) {
      driftSkipped += 1;
      continue;
    }

    const { error: updateError } = await sb
      .from("listings")
      .update({
        island: update.after.island,
        city: update.after.city,
      })
      .eq("id", update.id);

    if (updateError) {
      failed += 1;
      continue;
    }

    applied += 1;
  }

  return { applied, failed, driftSkipped };
}

async function main(): Promise<void> {
  const mode = getMode();
  const canonicalIslands = new Set(getIslands("cv"));
  const rows = await loadCandidateRows();
  const feedIds = await loadFeedIds();
  const candidates = selectTargetCandidates(rows, feedIds, canonicalIslands);
  const plan = await buildPlan(candidates);
  const planPath = writePlanArtifact(plan);

  console.log(`mode=${mode}`);
  console.log(`candidates=${plan.totalCandidates}`);
  console.log(`planned_updates=${plan.plannedUpdateCount}`);
  console.log(`planned_skips=${plan.plannedSkipCount}`);
  console.log(`plan_file=${planPath}`);

  if (mode === "dry-run") {
    return;
  }

  const backupPath = writeBackupArtifact(plan);
  console.log(`backup_file=${backupPath}`);

  const result = await applyPlan(plan);
  console.log(`applied=${result.applied}`);
  console.log(`failed=${result.failed}`);
  console.log(`drift_skipped=${result.driftSkipped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
