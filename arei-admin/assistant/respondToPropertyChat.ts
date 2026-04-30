// Orchestrator: classify the message, update intent according to the
// conversation lifecycle, run a data-aware match, and reply honestly about
// what the data could and could not verify.

import type { Listing } from "../types";
import { classifyMessage } from "./classifyMessage";
import { matchListings, diagnoseEmpty } from "./matchListings";
import { parseBuyerIntent } from "./parseBuyerIntent";
import { respondToAreaGuidance } from "./respondToAreaGuidance";
import { respondToBuyerSupport } from "./respondToBuyerSupport";
import { updateConversationIntent } from "./updateConversationIntent";
import type {
  BuyerIntent,
  ChatState,
  ChatTurn,
  ListingMatch,
  ParseResult,
} from "./types";

export interface RespondInput {
  message: string;
  state: ChatState;
  listings: Listing[];
}

export interface RespondOutput {
  state: ChatState;
  reply: ChatTurn;
}

const DEFAULT_MATCH_LIMIT = 3;
const EXPANDED_MATCH_LIMIT = 6;

const REQUIRED_FIELDS: Array<{
  key: keyof BuyerIntent;
  question: string;
}> = [
  { key: "island", question: "Which island are you looking at — Sal, Boa Vista, Santiago, São Vicente, or somewhere else?" },
  { key: "propertyType", question: "Are you after an apartment, a villa, a house, or land?" },
  { key: "maxPrice", question: "What's your budget — roughly the most you'd want to spend?" },
];

function hasEnoughIntent(intent: BuyerIntent): boolean {
  if (intent.selector) return true;
  const hasLocation = !!(intent.island || intent.city);
  const hasType = !!intent.propertyType;
  const hasBudget = intent.maxPrice != null || intent.minPrice != null;
  const hasQuantifier =
    hasBudget ||
    intent.minBedrooms != null ||
    intent.minSizeSqm != null ||
    intent.preferLowPrice === true;
  const hasKeyword = intent.keywords.length > 0;

  if (hasLocation && hasKeyword && !hasType) return true;
  if (hasType && hasBudget && (hasLocation || hasKeyword || intent.minBedrooms != null || intent.minSizeSqm != null)) {
    return true;
  }
  if (hasType && hasLocation && (hasQuantifier || intent.city != null || intent.propertyType === "land")) {
    return true;
  }
  return false;
}

function nextClarifyingQuestion(intent: BuyerIntent): string {
  for (const f of REQUIRED_FIELDS) {
    if ((intent as unknown as Record<string, unknown>)[f.key] == null) return f.question;
  }
  return "Tell me a bit more about what you're looking for.";
}

function summarizeIntent(intent: BuyerIntent): string {
  const parts: string[] = [];
  if (intent.selector === "most_expensive") parts.push("most expensive");
  if (intent.selector === "cheapest") parts.push("cheapest");
  if (intent.propertyType) parts.push(intent.propertyType);
  if (intent.minBedrooms != null && intent.minBedrooms > 0 && intent.propertyType !== "land") {
    parts.push(`${intent.minBedrooms}+ bed`);
  }
  if (intent.city) parts.push(`in ${intent.city}`);
  else if (intent.island) parts.push(`on ${intent.island}`);
  if (intent.maxPrice != null) parts.push(`under €${formatPrice(intent.maxPrice)}`);
  if (intent.minSizeSqm != null) parts.push(`${intent.minSizeSqm}+ sqm`);
  if (intent.keywords.length) parts.push(intent.keywords.join(", "));
  return parts.join(" · ");
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function hasPriceOrSizeSelector(intent: BuyerIntent): boolean {
  return (
    intent.maxPrice != null ||
    intent.minPrice != null ||
    intent.minBedrooms != null ||
    intent.minSizeSqm != null ||
    intent.preferLowPrice === true ||
    intent.selector != null
  );
}

function qualificationQuestion(
  message: string,
  intent: BuyerIntent,
  parsed: ParseResult
): string | null {
  if (parsed.actions.length > 0 || intent.selector) return null;

  const lc = message.toLowerCase();
  const hasLocation = !!(intent.island || intent.city);
  const hasConcreteSignal =
    hasLocation ||
    intent.propertyType != null ||
    intent.maxPrice != null ||
    intent.minPrice != null ||
    intent.minBedrooms != null ||
    intent.minSizeSqm != null ||
    intent.keywords.length > 0;

  if (/\b(good stuff|best stuff|good ones|best ones)\b/.test(lc)) {
    return "Do you mean best value, sea view, beachfront, lowest price, or investment potential?";
  }

  if (/\b(buy|purchase)\b.*\bproperty\b/.test(lc) && !hasConcreteSignal) {
    return "Are you looking for a holiday home, investment, land, or somewhere to live?";
  }

  if (!hasLocation && intent.keywords.some((kw) => kw.includes("beach"))) {
    return "Which island should I focus on for beach properties — Sal, Boa Vista, Santiago, or somewhere else?";
  }

  if (intent.propertyType && hasLocation && !hasPriceOrSizeSelector(intent)) {
    const place = intent.city ?? intent.island;
    const type = intent.propertyType === "studio" ? "studio" : intent.propertyType;
    return `What budget range should I use for the ${type}${place ? ` in ${place}` : ""}?`;
  }

  return null;
}

function cheaperWeakOnlyReply(intent: BuyerIntent): string {
  const type = intent.propertyType ?? "property";
  return `I don't have good cheaper ${type} matches with the current data. Do you want to relax bedrooms, increase budget, or see possible matches with missing data?`;
}

function isWeakCheaperResult(parsed: ParseResult, matches: ListingMatch[]): boolean {
  return (
    parsed.modifiers.includes("cheaper") &&
    matches.every((m) => m.confidence !== "strong")
  );
}

function nextStepPrompt(intent: BuyerIntent, expanded = false): string {
  if (expanded) return "Should I send the links or help you compare these?";
  if (intent.propertyType === "land") {
    return "Want me to narrow this by size, cheaper options, or the links?";
  }
  if (intent.maxPrice == null && intent.minPrice == null) {
    return "Want me to narrow this by budget or show more?";
  }
  return "Do you want sea view only, cheaper options, or the links?";
}

/** Map applicable-field keys to user-facing words, for the data-quality note. */
const FIELD_LABEL: Record<string, string> = {
  price: "price",
  size: "size",
  bedrooms: "bedrooms",
  property_type: "property type",
  island: "island",
  city: "city",
};

function dataQualityNote(matches: ListingMatch[]): string | null {
  // If any of the returned matches are partial/possible, summarise the
  // missing fields so the assistant doesn't overclaim.
  const partial = matches.filter((m) => m.confidence !== "strong");
  if (partial.length === 0) return null;

  const missing = new Set<string>();
  for (const m of partial) {
    for (const f of m.unknownFields) missing.add(FIELD_LABEL[f] ?? f);
  }
  if (missing.size === 0) return null;
  const fields = Array.from(missing).join(", ");
  return `Some listings are missing ${fields} — those are shown as partial matches.`;
}

function buildMatchesReply(
  intent: BuyerIntent,
  matches: ListingMatch[],
  opts: { expanded?: boolean } = {}
): string {
  const summary = summarizeIntent(intent) || "your criteria";
  const strong = matches.filter((m) => m.confidence === "strong").length;
  const total = matches.length;

  let head: string;
  if (intent.selector) {
    head =
      total === 1
        ? `Top result for ${summary}.`
        : `Top ${total} results for ${summary}.`;
  } else if (total === 1) {
    head = `Found 1 listing for ${summary}.`;
  } else if (strong === total) {
    head = `Here are the top ${total} matches for ${summary}.`;
  } else if (strong === 0) {
    head = `No listings fully match ${summary}, but here are ${total} possible matches based on what data we have.`;
  } else {
    head = `Here are ${total} listings for ${summary} — ${strong} confirmed, ${total - strong} partial (some data missing).`;
  }
  if (opts.expanded && total > DEFAULT_MATCH_LIMIT) {
    head = `${head} This is a broader view of up to ${EXPANDED_MATCH_LIMIT} matches.`;
  }

  const parts = [head];
  const note = dataQualityNote(matches);
  if (note) parts.push(note);
  parts.push(nextStepPrompt(intent, opts.expanded === true));
  return parts.join("\n");
}

function buildLinksReply(intent: BuyerIntent, matches: ListingMatch[]): string {
  if (matches.length === 0) {
    return "I don't have any current matches to share links for. Want to refine the search first?";
  }
  const lines = matches
    .map((m, i) => {
      const t = m.listing.title || `Listing ${m.listing.id}`;
      const url = m.listing.sourceUrl ?? "(no URL)";
      return `${i + 1}. ${t} — ${url}`;
    })
    .join("\n");
  const head =
    intent.selector === "most_expensive"
      ? "Here's the link to the most expensive match:"
      : intent.selector === "cheapest"
      ? "Here's the link to the cheapest match:"
      : "Here are the links:";
  return `${head}\n${lines}`;
}

/** Build a fresh intent from a parsed message, with no inheritance from
 *  prior conversation state. Land queries automatically drop bedroom
 *  constraints since they don't apply. */
function freshIntentFromParse(parsed: ParseResult): BuyerIntent {
  const fresh: BuyerIntent = {
    keywords: parsed.intent.keywords ? [...parsed.intent.keywords] : [],
  };
  // Copy through scalar fields.
  if (parsed.intent.island) fresh.island = parsed.intent.island;
  if (parsed.intent.city) fresh.city = parsed.intent.city;
  if (parsed.intent.propertyType) fresh.propertyType = parsed.intent.propertyType;
  if (parsed.intent.maxPrice != null) fresh.maxPrice = parsed.intent.maxPrice;
  if (parsed.intent.minPrice != null) fresh.minPrice = parsed.intent.minPrice;
  if (parsed.intent.minBedrooms != null) fresh.minBedrooms = parsed.intent.minBedrooms;
  if (parsed.intent.minSizeSqm != null) fresh.minSizeSqm = parsed.intent.minSizeSqm;
  if (parsed.selector) fresh.selector = parsed.selector;

  // "cheap" with no maxPrice → bias ranking, don't invent a budget.
  if (parsed.modifiers.includes("cheaper") && fresh.maxPrice == null) {
    fresh.preferLowPrice = true;
  }

  // Land has no bedrooms — drop any minBedrooms even if accidentally parsed.
  if (fresh.propertyType === "land") {
    delete fresh.minBedrooms;
  }

  // Selector implies sort behaviour rather than a price floor/ceiling, so
  // make sure preferLowPrice doesn't double up on cheapest.
  if (fresh.selector) delete fresh.preferLowPrice;

  return fresh;
}

export function respondToPropertyChat(input: RespondInput): RespondOutput {
  const { message, state, listings } = input;

  const userTurn: ChatTurn = { role: "user", text: message };
  const parsed = parseBuyerIntent(message);
  const cls = classifyMessage(parsed, state.intent);

  if (cls === "buyer_support" && parsed.supportIntent) {
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text: respondToBuyerSupport(parsed.supportIntent),
      intentSnapshot: state.intent,
    };
    return {
      state: {
        intent: state.intent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  if (cls === "area_guidance" && parsed.areaGuidance) {
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text: respondToAreaGuidance(parsed.areaGuidance, state.intent),
      intentSnapshot: state.intent,
    };
    return {
      state: {
        intent: state.intent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // ── Decide the next intent based on classification ──────────────────
  let newIntent: BuyerIntent;
  if (cls === "new_search") {
    newIntent = freshIntentFromParse(parsed);
  } else if (cls === "action") {
    newIntent = state.intent;
  } else {
    // refinement
    newIntent = updateConversationIntent(state.intent, parsed, state.lastMatches);
    // Refinement-only side rules:
    // If the user replaced the island and the prior city is in a different
    // island, drop the now-incompatible city.
    if (parsed.replacements.island && newIntent.city && state.intent.city) {
      // We only kept the city in updateConversationIntent if it wasn't
      // explicitly replaced. Drop it on island change to be safe.
      if (parsed.replacements.island !== state.intent.island) {
        delete newIntent.city;
      }
    }
    // If the property type became "land" via refinement, drop bedrooms.
    if (newIntent.propertyType === "land") {
      delete newIntent.minBedrooms;
    }
  }

  // ── Pure action: expand current result set ──────────────────────────
  if (cls === "action" && parsed.actions.includes("show_more")) {
    if (!hasEnoughIntent(newIntent)) {
      const assistantTurn: ChatTurn = {
        role: "assistant",
        text: "I can show more once we have a search. Which island or property type should I focus on?",
        intentSnapshot: newIntent,
      };
      return {
        state: {
          intent: newIntent,
          lastMatches: state.lastMatches,
          turns: [...state.turns, userTurn, assistantTurn],
        },
        reply: assistantTurn,
      };
    }

    const matches = matchListings(listings, newIntent, { limit: EXPANDED_MATCH_LIMIT });
    const text =
      matches.length === 0
        ? `Nothing matches ${summarizeIntent(newIntent)} right now. Want to broaden the search?`
        : buildMatchesReply(newIntent, matches, { expanded: true });
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text,
      matches,
      intentSnapshot: newIntent,
    };
    return {
      state: {
        intent: newIntent,
        lastMatches: matches.length > 0 ? matches : state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // ── Pure action: deliver links from the current result set ──────────
  if (cls === "action" && parsed.actions.includes("send_links")) {
    const text = buildLinksReply(newIntent, state.lastMatches);
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text,
      intentSnapshot: newIntent,
    };
    return {
      state: {
        intent: newIntent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // ── Qualification: ask one useful question before broad card dumps ──
  const qualifyingQuestion = qualificationQuestion(message, newIntent, parsed);
  if (qualifyingQuestion) {
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text: qualifyingQuestion,
      intentSnapshot: newIntent,
    };
    return {
      state: {
        intent: newIntent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // ── Need more info? ──────────────────────────────────────────────────
  if (!hasEnoughIntent(newIntent)) {
    const text = nextClarifyingQuestion(newIntent);
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text,
      intentSnapshot: newIntent,
    };
    return {
      state: {
        intent: newIntent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // ── Run match ────────────────────────────────────────────────────────
  const limit = newIntent.selector ? 1 : DEFAULT_MATCH_LIMIT;
  const matches = matchListings(listings, newIntent, { limit });

  if (cls === "refinement" && newIntent.propertyType && isWeakCheaperResult(parsed, matches)) {
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text: cheaperWeakOnlyReply(newIntent),
      intentSnapshot: state.intent,
    };
    return {
      state: {
        intent: state.intent,
        lastMatches: state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  // If the user combined a selector with a send_links request (e.g.
  // "send me link to the most expensive house"), reply with a link list.
  if (parsed.actions.includes("send_links") && cls !== "action") {
    const text =
      matches.length === 0
        ? `I couldn't find any ${summarizeIntent(newIntent)} with a known price.`
        : buildLinksReply(newIntent, matches);
    const assistantTurn: ChatTurn = {
      role: "assistant",
      text,
      matches,
      intentSnapshot: newIntent,
    };
    return {
      state: {
        intent: newIntent,
        lastMatches: matches.length > 0 ? matches : state.lastMatches,
        turns: [...state.turns, userTurn, assistantTurn],
      },
      reply: assistantTurn,
    };
  }

  let text: string;
  if (matches.length === 0) {
    const relax = diagnoseEmpty(listings, newIntent);
    text = relax
      ? `Nothing matches ${summarizeIntent(newIntent)} right now. Try ${relax}.`
      : `Nothing matches ${summarizeIntent(newIntent)} right now. Want to broaden the search?`;
  } else {
    text = buildMatchesReply(newIntent, matches);
  }

  const assistantTurn: ChatTurn = {
    role: "assistant",
    text,
    matches,
    intentSnapshot: newIntent,
  };
  return {
    state: {
      intent: newIntent,
      lastMatches: matches.length > 0 ? matches : state.lastMatches,
      turns: [...state.turns, userTurn, assistantTurn],
    },
    reply: assistantTurn,
  };
}
