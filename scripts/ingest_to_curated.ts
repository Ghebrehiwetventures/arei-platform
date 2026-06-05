// scripts/ingest_to_curated.ts
//
// CLI entry point for the kv_curated per-source ingest. The orchestrator
// itself lives in core/pipeline/runMarketSource.ts. This file is just env
// loading + invocation + re-exports for tests.

import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { runMarketSource } from "../core/pipeline/runMarketSource";

export {
  buildKvCuratedUpsertQuery,
  buildFindRemovedPublishedRowsQuery,
  buildDemoteRemovedPublishedRowsQuery,
} from "../core/pipeline/runMarketSource";

function loadEnv(): { marketId: string; sourceId: string; dryRun: boolean } {
  const marketId = process.env.MARKET_ID;
  const sourceId = process.env.SOURCE_ID;
  const dryRun = process.env.DRY_RUN === "1";

  if (!marketId) { console.error("ERROR: MARKET_ID is required"); process.exit(1); }
  if (!sourceId) { console.error("ERROR: SOURCE_ID is required"); process.exit(1); }
  // Always required — the status pre-check runs in dry-run mode too.
  if (!process.env.DATABASE_URL) { console.error("ERROR: DATABASE_URL is required"); process.exit(1); }
  if (!dryRun) {
    if (!process.env.ANTHROPIC_API_KEY) { console.error("ERROR: ANTHROPIC_API_KEY is required (or set DRY_RUN=1)"); process.exit(1); }
    if (!process.env.OPENAI_API_KEY)    { console.error("ERROR: OPENAI_API_KEY is required (or set DRY_RUN=1)"); process.exit(1); }
  }

  return { marketId, sourceId, dryRun };
}

if (require.main === module) {
  const { marketId, sourceId, dryRun } = loadEnv();
  runMarketSource({ marketId, sourceId, dryRun }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
