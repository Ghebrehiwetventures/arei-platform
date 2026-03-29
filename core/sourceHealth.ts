import * as fs from "fs";
import * as path from "path";
import { SourceStatus } from "./status";

export const SOURCE_HEALTH_AUTO_PAUSE_THRESHOLD = 3;

export interface SourceHealthEntry {
  marketId: string;
  sourceId: string;
  consecutiveFailureCount: number;
  lastStatus: SourceStatus | string;
  lastErrorClass: string;
  pauseReason?: string;
  pauseDetail?: string;
  lastSeenAt: string;
}

interface SourceHealthArtifact {
  version: number;
  updatedAt: string;
  sources: Record<string, SourceHealthEntry>;
}

export interface SourceHealthReportInput {
  id: string;
  status: SourceStatus | string;
  lastError?: string;
  debugErrors?: string[];
  pauseReason?: string;
  pauseDetail?: string;
}

const SOURCE_HEALTH_VERSION = 1;
const SOURCE_HEALTH_ARTIFACT = "source_health.json";
const PARSER_FAILURE_ERROR_CLASS = "parser_failure";
const OTHER_ERROR_CLASS = "other";
const NONE_ERROR_CLASS = "none";

function getArtifactsDir(): string {
  return path.resolve(__dirname, "../artifacts");
}

export function getSourceHealthArtifactPath(): string {
  return path.join(getArtifactsDir(), SOURCE_HEALTH_ARTIFACT);
}

function getSourceHealthKey(marketId: string, sourceId: string): string {
  return `${marketId}:${sourceId}`;
}

export function loadSourceHealth(): Record<string, SourceHealthEntry> {
  const artifactPath = getSourceHealthArtifactPath();

  if (!fs.existsSync(artifactPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(artifactPath, "utf-8")) as Partial<SourceHealthArtifact>;
    if (!parsed || typeof parsed !== "object" || !parsed.sources || typeof parsed.sources !== "object") {
      return {};
    }
    return parsed.sources as Record<string, SourceHealthEntry>;
  } catch (err) {
    console.warn(`[SourceHealth] Failed to read ${artifactPath}:`, err);
    return {};
  }
}

export function getSourceHealthEntry(
  sourceHealth: Record<string, SourceHealthEntry>,
  marketId: string,
  sourceId: string
): SourceHealthEntry | undefined {
  return sourceHealth[getSourceHealthKey(marketId, sourceId)];
}

export function hasParserDiagnostics(errors?: string[]): boolean {
  return (errors || []).some(
    (err) => err.startsWith("page_parse_error") || err.startsWith("listing_parse_error")
  );
}

export function shouldAutoPauseSource(entry?: SourceHealthEntry): boolean {
  return Boolean(
    entry &&
      entry.lastErrorClass === PARSER_FAILURE_ERROR_CLASS &&
      entry.consecutiveFailureCount >= SOURCE_HEALTH_AUTO_PAUSE_THRESHOLD
  );
}

function classifyLastError(status: SourceStatus | string, debugErrors?: string[]): string {
  if (status === SourceStatus.BROKEN_SOURCE && hasParserDiagnostics(debugErrors)) {
    return PARSER_FAILURE_ERROR_CLASS;
  }
  if (status === SourceStatus.OK) {
    return NONE_ERROR_CLASS;
  }
  return OTHER_ERROR_CLASS;
}

export function persistSourceHealth(
  marketId: string,
  sourceReports: SourceHealthReportInput[],
  existingSourceHealth?: Record<string, SourceHealthEntry>
): Record<string, SourceHealthEntry> {
  const artifactPath = getSourceHealthArtifactPath();
  const sourceHealth = { ...(existingSourceHealth || loadSourceHealth()) };
  const now = new Date().toISOString();

  for (const source of sourceReports) {
    const key = getSourceHealthKey(marketId, source.id);
    const previous = sourceHealth[key];
    const lastErrorClass = classifyLastError(source.status, source.debugErrors);
    const wasAutoPausedByParserFailures =
      source.status === SourceStatus.PAUSED_BY_SYSTEM &&
      (source.pauseReason === "parser_failure_threshold" ||
        source.lastError?.startsWith("Auto-paused after") === true) &&
      previous?.lastErrorClass === PARSER_FAILURE_ERROR_CLASS;
    const pauseReason =
      source.status === SourceStatus.PAUSED_BY_SYSTEM ? source.pauseReason || previous?.pauseReason : undefined;
    const pauseDetail =
      source.status === SourceStatus.PAUSED_BY_SYSTEM ? source.pauseDetail || source.lastError || previous?.pauseDetail : undefined;

    let consecutiveFailureCount = 0;
    if (lastErrorClass === PARSER_FAILURE_ERROR_CLASS) {
      consecutiveFailureCount = (previous?.consecutiveFailureCount || 0) + 1;
    } else if (wasAutoPausedByParserFailures) {
      consecutiveFailureCount = previous?.consecutiveFailureCount || 0;
    }

    sourceHealth[key] = {
      marketId,
      sourceId: source.id,
      consecutiveFailureCount,
      lastStatus: source.status,
      lastErrorClass: wasAutoPausedByParserFailures ? PARSER_FAILURE_ERROR_CLASS : lastErrorClass,
      pauseReason,
      pauseDetail,
      lastSeenAt: now,
    };
  }

  const artifact: SourceHealthArtifact = {
    version: SOURCE_HEALTH_VERSION,
    updatedAt: now,
    sources: sourceHealth,
  };

  const artifactsDir = getArtifactsDir();
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  return sourceHealth;
}
