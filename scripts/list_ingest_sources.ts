// scripts/list_ingest_sources.ts
//
// Emits the GitHub Actions matrix of {market, source} pairs to ingest:
// every source with lifecycleOverride: IN across the given markets (or all
// markets under markets/ when none are passed). Pure selection logic is
// exported for tests; the CLI prints JSON for `fromJSON()` in the workflow.

import * as fs from "fs";
import * as path from "path";
import { loadSourcesConfig, SourceConfig } from "../core/configLoader";

export interface IngestMatrixEntry {
  market: string;
  source: string;
}

/** Filter one market's sources down to the IN set as matrix entries. */
export function selectInSources(
  marketId: string,
  sources: Pick<SourceConfig, "id" | "lifecycleOverride">[]
): IngestMatrixEntry[] {
  return sources
    .filter((s) => s.lifecycleOverride === "IN")
    .map((s) => ({ market: marketId, source: s.id }));
}

/** Every market directory under markets/ that has a sources.yml. */
export function listMarketIds(): string[] {
  const marketsDir = path.resolve(__dirname, "../markets");
  return fs
    .readdirSync(marketsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(marketsDir, name, "sources.yml")))
    .sort();
}

/** Discover IN sources across the given markets (default: all markets). */
export function discoverIngestSources(marketIds?: string[]): IngestMatrixEntry[] {
  const markets = marketIds && marketIds.length > 0 ? marketIds : listMarketIds();
  const out: IngestMatrixEntry[] = [];
  for (const marketId of markets) {
    const result = loadSourcesConfig(marketId);
    if (!result.success || !result.data) {
      console.error(`[discover] skipping ${marketId}: ${result.error ?? "no data"}`);
      continue;
    }
    out.push(...selectInSources(marketId, result.data.sources));
  }
  return out;
}

if (require.main === module) {
  // Optional CLI arg: comma-separated market ids. Default: all markets.
  const arg = process.argv[2];
  const marketIds = arg ? arg.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const entries = discoverIngestSources(marketIds);
  // GitHub Actions matrix shape: { include: [ {market, source}, ... ] }
  process.stdout.write(JSON.stringify({ include: entries }));
}
