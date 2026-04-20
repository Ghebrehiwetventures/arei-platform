/**
 * CV-specific location recovery hook.
 *
 * Wraps cvIslandRecovery into the generic LocationHook interface
 * so ingestMarket.ts can load it dynamically for the "cv" market.
 */

import { resolveCvIslandRecovery } from "../../core/cvIslandRecovery";

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
  const recovery = resolveCvIslandRecovery({
    id: input.id,
    sourceId: input.sourceId,
    title: input.title,
    description: input.description,
    sourceUrl: input.sourceUrl,
    rawIsland: input.rawIsland,
    rawCity: input.rawCity,
  });

  if (recovery.kind === "resolved") {
    return {
      island: recovery.island,
      city: recovery.city ?? undefined,
    };
  }

  return null;
}
