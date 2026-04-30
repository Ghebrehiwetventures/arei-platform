// Classify a parsed user message into the conversation lifecycle.
//
//   new_search — a fresh property query. Resets prior incompatible state
//                so the user is not forced to "undo" earlier filters.
//   refinement — adjusts the existing search (add a keyword, switch
//                island, "show cheaper", etc.). Merges into prior intent.
//   action     — pure side-effect like "send me the links" with no new
//                criteria. Does not mutate intent.
//   buyer_support — legal, financing, viewing, agent/source, or process
//                questions. Does not mutate intent or last matches.
//   area_guidance — high-level area questions. Does not show listing cards
//                unless the user explicitly asks for listings later.
//
// The rules are deliberately simple and deterministic; no LLM.

import type { BuyerIntent, MessageClass, ParseResult } from "./types";

function hasIntentSignal(parsed: ParseResult): boolean {
  const i = parsed.intent;
  return (
    i.island != null ||
    i.city != null ||
    i.propertyType != null ||
    i.maxPrice != null ||
    i.minPrice != null ||
    i.minBedrooms != null ||
    i.minSizeSqm != null ||
    (i.keywords != null && i.keywords.length > 0) ||
    parsed.selector != null ||
    parsed.modifiers.length > 0 ||
    Object.keys(parsed.replacements).length > 0
  );
}

export function classifyMessage(
  parsed: ParseResult,
  _prior: BuyerIntent
): MessageClass {
  if (parsed.supportIntent) return "buyer_support";
  if (parsed.areaGuidance) return "area_guidance";

  // Pure action: link request with no new criteria.
  if (
    parsed.actions.includes("send_links") &&
    !hasIntentSignal(parsed)
  ) {
    return "action";
  }

  const i = parsed.intent;
  const hasLocation = i.island != null || i.city != null;

  // A fresh full-shape query: a property type plus a location.
  if (i.propertyType != null && hasLocation) return "new_search";

  // A selector ("most expensive house") combined with a property type or
  // location is a fresh ask too — there's no prior context to merge into.
  if (parsed.selector != null && (i.propertyType != null || hasLocation)) {
    return "new_search";
  }

  return "refinement";
}
