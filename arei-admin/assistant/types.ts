// Types for the Property Chat Lab assistant.
// Mirrors the Listing shape already used by arei-admin/data.ts.

import type { Listing } from "../types";

export type PropertyTypeIntent =
  | "apartment"
  | "house"
  | "villa"
  | "land"
  | "commercial"
  | "studio";

/** Sort/select directives like "most expensive house" / "cheapest land". */
export type Selector = "most_expensive" | "cheapest";

export type BuyerSupportIntent =
  | "foreign_buyers"
  | "mortgage"
  | "lawyer"
  | "agent_contact"
  | "taxes_costs"
  | "viewing"
  | "buying_process"
  | "safety";

export interface AreaGuidanceIntent {
  island?: string;
  city?: string;
}

export interface BuyerIntent {
  island?: string;
  city?: string;
  propertyType?: PropertyTypeIntent;
  maxPrice?: number;
  minPrice?: number;
  minBedrooms?: number;
  minSizeSqm?: number;
  keywords: string[];
  /** Bias ranking toward lower prices. Set when the user says "cheap" /
   *  "cheaper" and there is no explicit maxPrice to enforce. */
  preferLowPrice?: boolean;
  /** Pick "most expensive" / "cheapest" of the matching set. */
  selector?: Selector;
}

export const EMPTY_INTENT: BuyerIntent = { keywords: [] };

export interface ParseResult {
  intent: Partial<BuyerIntent>;
  /** Special user actions detected, e.g. "links". */
  actions: ChatAction[];
  /** Direct replacement signals, e.g. "what about Boa Vista instead?" */
  replacements: Partial<BuyerIntent>;
  /** Modifier signals (cheaper, bigger). */
  modifiers: ChatModifier[];
  /** Selector — separate from intent so the classifier can see it. */
  selector?: Selector;
  /** Non-listing buyer support intent. Does not mutate listing search. */
  supportIntent?: BuyerSupportIntent;
  /** Area guidance request. Does not render listing cards by default. */
  areaGuidance?: AreaGuidanceIntent;
  /** What the parser actually matched, for the debug panel. */
  matchedTerms: string[];
}

export type ChatAction = "send_links";
export type ChatModifier = "cheaper" | "bigger";

/** How well a listing matches the intent given the data we actually have.
 *  - strong: every applicable constraint was verified.
 *  - partial: at least one constraint verified, some unverifiable due to
 *    missing fields, none violated.
 *  - possible: no constraint could be verified beyond location; included
 *    only as a fallback when we'd otherwise return nothing useful. */
export type MatchConfidence = "strong" | "partial" | "possible";

/** Classification of a user message in the conversation lifecycle. */
export type MessageClass =
  | "new_search"
  | "refinement"
  | "action"
  | "buyer_support"
  | "area_guidance";

export interface ListingMatch {
  listing: Listing;
  score: number;
  reasons: string[];
  pricePerSqm: number | null;
  confidence: MatchConfidence;
  /** Fields the user asked about that this listing was missing. */
  unknownFields: string[];
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
  matches?: ListingMatch[];
  /** Snapshot of intent after this turn. Useful for the debug panel. */
  intentSnapshot?: BuyerIntent;
}

export interface ChatState {
  intent: BuyerIntent;
  /** Last set of ranked matches, used for follow-ups like "send me the links". */
  lastMatches: ListingMatch[];
  turns: ChatTurn[];
}

export const INITIAL_CHAT_STATE: ChatState = {
  intent: { ...EMPTY_INTENT },
  lastMatches: [],
  turns: [],
};
