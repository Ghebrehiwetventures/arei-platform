/**
 * CV location recovery hook.
 *
 * Thin adapter from the generic island-recovery engine into the LocationHook
 * interface so ingestMarket.ts can load it dynamically for the "cv" market.
 * All CV-specific knowledge lives in markets/cv/locations.yml, not here.
 */

import { resolveIslandRecovery } from "../../core/islandRecovery";

export interface LocationHookInput {
  id: string;
  sourceId: string;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  rawIsland?: string | null;
  rawCity?: string | null;
}

export interface LocationHookResult {
  island?: string;
  city?: string;
}

export function resolveLocation(input: LocationHookInput): LocationHookResult | null {
  const recovery = resolveIslandRecovery({
    id: input.id,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    sourceUrl: input.sourceUrl,
    rawIsland: input.rawIsland,
    rawCity: input.rawCity,
  }, "cv");

  if (recovery.kind === "resolved") {
    return {
      island: recovery.island,
      city: recovery.city ?? undefined,
    };
  }

  return null;
}
