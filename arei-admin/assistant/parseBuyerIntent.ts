// Deterministic, rule-based parser for property-chat messages.
// No LLM calls. Cape Verde geography is hard-coded for V0.

import type {
  AreaGuidanceIntent,
  BuyerIntent,
  BuyerSupportIntent,
  ChatAction,
  ChatModifier,
  ParseResult,
  PropertyTypeIntent,
  Selector,
} from "./types";

interface Alias {
  /** Canonical value as stored in the listings table. */
  canonical: string;
  /** Lowercased aliases that should match this canonical value. */
  aliases: string[];
}

const ISLAND_ALIASES: Alias[] = [
  { canonical: "Sal", aliases: ["sal"] },
  { canonical: "Boa Vista", aliases: ["boa vista", "boavista", "boa-vista"] },
  { canonical: "Santiago", aliases: ["santiago"] },
  { canonical: "São Vicente", aliases: ["sao vicente", "são vicente", "s. vicente"] },
  { canonical: "Santo Antão", aliases: ["santo antao", "santo antão"] },
  { canonical: "Fogo", aliases: ["fogo"] },
  { canonical: "Maio", aliases: ["maio"] },
  { canonical: "Brava", aliases: ["brava"] },
  { canonical: "São Nicolau", aliases: ["sao nicolau", "são nicolau"] },
];

// City aliases that strongly imply an island. Used for both city and island
// inference. Canonical city strings match the casing seen in listings.city.
const CITY_ALIASES: Array<Alias & { island: string }> = [
  { canonical: "Santa Maria", aliases: ["santa maria"], island: "Sal" },
  { canonical: "Espargos", aliases: ["espargos"], island: "Sal" },
  { canonical: "Sal Rei", aliases: ["sal rei", "salrei"], island: "Boa Vista" },
  { canonical: "Mindelo", aliases: ["mindelo"], island: "São Vicente" },
  { canonical: "Praia", aliases: ["praia"], island: "Santiago" },
];

const PROPERTY_TYPE_ALIASES: Array<{ type: PropertyTypeIntent; aliases: string[] }> = [
  { type: "apartment", aliases: ["apartment", "apartments", "flat", "flats", "condo"] },
  { type: "villa", aliases: ["villa", "villas"] },
  { type: "house", aliases: ["house", "houses", "home", "homes", "townhouse"] },
  { type: "land", aliases: ["land", "plot", "plots", "lote", "terreno"] },
  { type: "commercial", aliases: ["commercial", "office", "shop", "retail"] },
  { type: "studio", aliases: ["studio", "studios"] },
];

const KEYWORD_VOCAB = [
  "beachfront",
  "beach",
  "holiday",
  "sea view",
  "ocean view",
  "sea-view",
  "pool",
  "garden",
  "renovated",
  "new build",
  "furnished",
  "resort",
  "porto antigo",
  "leme bedje",
];

function findCityAlias(text: string): (Alias & { island: string }) | undefined {
  for (const a of CITY_ALIASES) {
    for (const alias of a.aliases) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, "i");
      if (re.test(text)) return a;
    }
  }
  return undefined;
}

function findAlias(text: string, aliases: Alias[]): Alias | undefined {
  for (const a of aliases) {
    for (const alias of a.aliases) {
      // word-boundary-ish match; allow multi-word aliases
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, "i");
      if (re.test(text)) return a;
    }
  }
  return undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse a price expression. Handles forms like:
 *   "under 200k", "under 200,000", "below 500000", "max 300k",
 *   "less than 100k", "<200k", "under €200k", "200k EUR or less"
 * Returns the price in EUR (assumes EUR — Cape Verde listings are EUR).
 */
function parseMaxPrice(text: string): number | undefined {
  const lc = text.toLowerCase();
  // Match phrases that bound a maximum.
  const patterns = [
    /(?:under|below|less than|max(?:imum)?|up to|<=?)\s*€?\s*([\d.,]+)\s*(k|m)?/i,
    /€?\s*([\d.,]+)\s*(k|m)?\s*(?:or less|max|maximum)/i,
  ];
  for (const re of patterns) {
    const m = lc.match(re);
    if (m) {
      const n = normalizeNumber(m[1], m[2]);
      if (n != null) return n;
    }
  }
  return undefined;
}

function parseMinSize(text: string): number | undefined {
  const lc = text.toLowerCase();
  const patterns = [
    /(?:at least|min(?:imum)?|over|more than|>=?)\s*([\d.,]+)\s*(?:sqm|sq\.?m|m2|m²)/i,
    /([\d.,]+)\s*(?:sqm|sq\.?m|m2|m²)\s*(?:or more|\+|min(?:imum)?)/i,
    /([\d.,]+)\+\s*(?:sqm|sq\.?m|m2|m²)/i,
  ];
  for (const re of patterns) {
    const m = lc.match(re);
    if (m) {
      const n = normalizeNumber(m[1]);
      if (n != null) return n;
    }
  }
  return undefined;
}

function parseMinBedrooms(text: string): number | undefined {
  const lc = text.toLowerCase();
  if (/\bstudio(s)?\b/.test(lc)) return 0;
  // "at least 3 bedrooms", "3+ bed", "3-bedroom", "3 br", "two bedroom"
  const wordNums: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  };
  const wordMatch = lc.match(
    /\b(one|two|three|four|five|six)[\s-]*(?:bedroom|bed|br)\b/
  );
  if (wordMatch) return wordNums[wordMatch[1]];

  const patterns = [
    /(?:at least|min(?:imum)?|>=?)\s*(\d+)\s*(?:bedroom|bed|br)\b/,
    /\b(\d+)\s*\+\s*(?:bedroom|bed|br)\b/,
    /\b(\d+)[\s-]*(?:bedroom|bed|br)\b/,
  ];
  for (const re of patterns) {
    const m = lc.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function normalizeNumber(raw: string, suffix?: string): number | undefined {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, ".");
  const base = parseFloat(cleaned);
  if (!Number.isFinite(base)) return undefined;
  if (suffix?.toLowerCase() === "k") return Math.round(base * 1_000);
  if (suffix?.toLowerCase() === "m") return Math.round(base * 1_000_000);
  return Math.round(base);
}

function detectKeywords(text: string): string[] {
  const lc = text.toLowerCase();
  const out: string[] = [];
  for (const kw of KEYWORD_VOCAB) {
    if (kw === "beach") {
      if (/\bbeach\b/.test(lc)) out.push(kw);
    } else if (lc.includes(kw)) {
      out.push(kw);
    }
  }
  // normalize sea-view variants
  if (out.includes("sea-view") && !out.includes("sea view")) {
    out[out.indexOf("sea-view")] = "sea view";
  }
  return Array.from(new Set(out));
}

function detectActions(text: string): ChatAction[] {
  const lc = text.toLowerCase();
  const actions: ChatAction[] = [];
  if (
    /\b(send|share|give)\b.*\b(link|links|url|urls)\b/.test(lc) ||
    /\b(link|links|urls?)\b\s*(please|pls)?$/.test(lc.trim())
  ) {
    actions.push("send_links");
  }
  return actions;
}

function detectSelector(text: string): Selector | undefined {
  const lc = text.toLowerCase();
  if (/\b(most expensive|highest price|priciest|most pricey|biggest budget)\b/.test(lc)) {
    return "most_expensive";
  }
  if (/\b(cheapest|least expensive|lowest price|most affordable)\b/.test(lc)) {
    return "cheapest";
  }
  return undefined;
}

function detectBuyerSupportIntent(text: string): BuyerSupportIntent | undefined {
  const lc = text.toLowerCase();
  if (/\b(foreign|foreigner|foreigners|international buyer|diaspora)\b.*\b(buy|purchase|own|property)\b/.test(lc)) {
    return "foreign_buyers";
  }
  if (/\b(mortgage|finance|financing|loan|bank loan|home loan)\b/.test(lc)) {
    return "mortgage";
  }
  if (/\b(lawyer|legal|solicitor|attorney|notary|notario|notário)\b/.test(lc)) {
    return "lawyer";
  }
  if (/\b(contact|message|reach)\b.*\b(agent|source|seller|owner)\b/.test(lc)) {
    return "agent_contact";
  }
  if (/\b(book|schedule|arrange)\b.*\b(viewing|visit|tour|appointment)\b/.test(lc) || /\bviewing\b/.test(lc)) {
    return "viewing";
  }
  if (/\b(tax|taxes|fee|fees|cost|costs|stamp duty|registration)\b/.test(lc)) {
    return "taxes_costs";
  }
  if (/\b(buying process|purchase process|buying steps|how (?:do|does|to) .*buy|how to buy)\b/.test(lc)) {
    return "buying_process";
  }
  if (/\b(safe|safety|scam|fraud|trust|verify|due diligence)\b/.test(lc)) {
    return "safety";
  }
  return undefined;
}

function detectAreaGuidance(text: string, intent: Partial<BuyerIntent>): AreaGuidanceIntent | undefined {
  const lc = text.toLowerCase();
  const explicitAreaQuestion =
    /\b(best areas?|where should (?:i|we) buy|where to buy|which areas?|neighbou?rhood|areas in)\b/.test(lc);
  const hasAreaSignal =
    explicitAreaQuestion ||
    /\b(area for|good for rentals?)\b/.test(lc) ||
    /^is\s+.+\s+good\b/.test(lc.trim());
  if (!hasAreaSignal) return undefined;
  if (!intent.island && !intent.city) {
    return explicitAreaQuestion ? {} : undefined;
  }
  return {
    island: intent.island,
    city: intent.city,
  };
}

function detectModifiers(text: string): ChatModifier[] {
  const lc = text.toLowerCase();
  const out: ChatModifier[] = [];
  if (/\b(cheap|cheaper|less expensive|lower (?:price|budget))\b/.test(lc)) {
    out.push("cheaper");
  }
  if (/\b(bigger|larger|more space)\b/.test(lc)) {
    out.push("bigger");
  }
  return out;
}

/**
 * Detect "what about X instead?" / "switch to X" / "only Sal" style replacements.
 * Returns fields that should overwrite (not merge) the conversation intent.
 */
function detectReplacements(text: string): Partial<BuyerIntent> {
  const lc = text.toLowerCase();
  const replacements: Partial<BuyerIntent> = {};
  const replaceTrigger =
    /\b(what about|how about|instead|switch to|only|just)\b/.test(lc);
  if (replaceTrigger) {
    const island = findAlias(text, ISLAND_ALIASES);
    if (island) replacements.island = island.canonical;
    const cityAlias = findCityAlias(text);
    if (cityAlias) {
      replacements.city = cityAlias.canonical;
      replacements.island = cityAlias.island;
    }
  }
  return replacements;
}

export function parseBuyerIntent(message: string): ParseResult {
  const text = message.trim();
  const intent: Partial<BuyerIntent> = {};
  const matchedTerms: string[] = [];

  const island = findAlias(text, ISLAND_ALIASES);
  if (island) {
    intent.island = island.canonical;
    matchedTerms.push(`island=${island.canonical}`);
  }

  const city = findCityAlias(text);
  if (city) {
    intent.city = city.canonical;
    if (!intent.island) intent.island = city.island;
    matchedTerms.push(`city=${city.canonical}`);
  }

  for (const t of PROPERTY_TYPE_ALIASES) {
    if (
      t.aliases.some((a) =>
        new RegExp(`(^|[^a-z])${escapeRegex(a)}([^a-z]|$)`, "i").test(text)
      )
    ) {
      intent.propertyType = t.type;
      matchedTerms.push(`type=${t.type}`);
      // studio implies bedrooms = 0
      if (t.type === "studio") intent.minBedrooms = 0;
      break;
    }
  }

  const maxPrice = parseMaxPrice(text);
  if (maxPrice != null) {
    intent.maxPrice = maxPrice;
    matchedTerms.push(`maxPrice=${maxPrice}`);
  }

  const minBeds = parseMinBedrooms(text);
  if (minBeds != null) {
    intent.minBedrooms = minBeds;
    matchedTerms.push(`minBedrooms=${minBeds}`);
  }

  const minSize = parseMinSize(text);
  if (minSize != null) {
    intent.minSizeSqm = minSize;
    matchedTerms.push(`minSizeSqm=${minSize}`);
  }

  const keywords = detectKeywords(text);
  if (keywords.length) {
    intent.keywords = keywords;
    matchedTerms.push(`keywords=${keywords.join("|")}`);
  }

  const actions = detectActions(text);
  const replacements = detectReplacements(text);
  const modifiers = detectModifiers(text);
  const selector = detectSelector(text);
  const supportIntent = detectBuyerSupportIntent(text);
  const areaGuidance = detectAreaGuidance(text, intent);
  if (selector) matchedTerms.push(`selector=${selector}`);
  if (supportIntent) matchedTerms.push(`support=${supportIntent}`);
  if (areaGuidance) matchedTerms.push("area_guidance");

  return {
    intent,
    actions,
    replacements,
    modifiers,
    selector,
    supportIntent,
    areaGuidance,
    matchedTerms,
  };
}
