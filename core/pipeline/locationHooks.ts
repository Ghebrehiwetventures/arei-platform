// Per-market location hook loader. Both orchestrators duplicate this verbatim
// before the extraction.

import * as path from "path";

export interface LocationHookModule {
  resolveLocation(input: {
    id: string;
    sourceId: string;
    title?: string | null;
    description?: string | null;
    sourceUrl?: string | null;
    rawIsland?: string | null;
    rawCity?: string | null;
  }): { island?: string; city?: string } | null;
}

export function loadLocationHooks(marketId: string): LocationHookModule | null {
  const hookPath = path.resolve(__dirname, `../../markets/${marketId}/locationHooks`);
  try {
    const mod = require(hookPath);
    if (typeof mod.resolveLocation === "function") {
      console.log(`[Hooks] Loaded location hooks for market: ${marketId}`);
      return mod as LocationHookModule;
    }
  } catch {
    // No location hooks for this market — that's fine
  }
  return null;
}
