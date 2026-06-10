/**
 * Island/region recovery — market-agnostic engine.
 *
 * Recovers an island/city for listings whose structured location is missing or
 * country-only, using per-source landmark knowledge declared as DATA in
 * `markets/<market>/locations.yml` under `island_recovery:`. No source-specific
 * logic lives here — only generic, reusable match strategies selected by config.
 *
 * Precedence (generic, same for every market):
 *   1. unsafe_ids        — never auto-recover these ids; skip with a reason
 *   2. parse rawIsland    — via the config-driven location parser
 *   3. parse rawCity      — via the config-driven location parser
 *   4. per-source rules   — landmark / strategy / skip rules from config, in order
 *   5. no_match
 */

import { getIslands, parseLocation, loadLocationsConfig } from "./locationMapper";

export type IslandRecoveryConfidence = "high" | "medium";

/** Open strings: rule/reason names come from market config, not a fixed union. */
export type IslandRecoveryRuleName = string;
export type IslandRecoverySkipReason = string;

export interface IslandRecoveryInput {
  id: string;
  sourceId: string;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  rawIsland?: string | null;
  rawCity?: string | null;
  pageTitleHint?: string | null;
}

export interface IslandRecoveryResolved {
  kind: "resolved";
  island: string;
  city: string | null;
  confidence: IslandRecoveryConfidence;
  rule: IslandRecoveryRuleName;
  matchedText: string | null;
}

export interface IslandRecoverySkipped {
  kind: "skipped";
  reason: IslandRecoverySkipReason;
}

export interface IslandRecoveryNoMatch {
  kind: "no_match";
}

export type IslandRecoveryResult =
  | IslandRecoveryResolved
  | IslandRecoverySkipped
  | IslandRecoveryNoMatch;

// ── Config schema (declared as data in locations.yml) ────────────────────────

/** Fields a rule may search. `cleaned_title` is a virtual field (see preprocess). */
export type IslandRecoveryField =
  | "rawIsland"
  | "rawCity"
  | "title"
  | "description"
  | "sourceUrl"
  | "cleaned_title";

export interface LandmarkRule {
  /** Single phrase, or any-of phrases. The matched phrase is the default matchedText. */
  landmark?: string;
  landmark_any?: string[];
  /** Fields whose concatenation is searched (substring, normalized). */
  in: IslandRecoveryField[];
  /** Also match if the URL path includes this slug. */
  path_contains?: string;
  /** Compute the `cleaned_title` virtual field before matching. */
  preprocess?: "clean_title";
  island: string;
  city?: string;
  confidence?: IslandRecoveryConfidence;
  rule: string;
  /** Where matchedText comes from. Default "phrase". */
  matched_text?: "phrase" | "source" | "cleaned_title";
}

export interface PathSkipRule {
  skip_if_path_contains: string;
  reason: string;
}

export interface BlanketSkipRule {
  skip: string;
}

export interface SingleTokenRule {
  when_equals: { field: IslandRecoveryField; value: string };
  strategy: "single_canonical_island_token";
  from: IslandRecoveryField | "pageTitleHint";
  confidence: IslandRecoveryConfidence;
  rule: string;
  no_match_skip: string;
}

export interface EqualsSkipRule {
  when_equals: { field: IslandRecoveryField; value: string };
  preprocess?: "clean_title";
  skip: string;
}

export type IslandRecoveryRule =
  | LandmarkRule
  | PathSkipRule
  | BlanketSkipRule
  | SingleTokenRule
  | EqualsSkipRule;

export interface IslandRecoveryConfig {
  /** id → skip reason. */
  unsafe_ids?: Record<string, string>;
  /** sourceId → ordered rules. */
  sources?: Record<string, IslandRecoveryRule[]>;
}

// ── Generic helpers ──────────────────────────────────────────────────────────

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function containsText(text: string | null | undefined, phrase: string): boolean {
  return normalizeText(text).includes(normalizeText(phrase));
}

function getUrlPath(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

/** Strip leading price/number noise and common property-type words from a title. */
function cleanTitle(title: string | null | undefined): string {
  return (title || "")
    .replace(/^[£€$0-9,.\s]+/g, "")
    .replace(/Flats?\s*\/\s*Apartments?/gi, " ")
    .replace(/Houses?/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasIslandToken(text: string | null | undefined, island: string): boolean {
  if (!text) return false;
  const pattern = new RegExp(
    `(^|[\\s,|/()\\-])${escapeRegex(island)}(?=$|[\\s,|/()\\-])`,
    "i"
  );
  return pattern.test(text);
}

function detectSingleCanonicalIslandToken(
  text: string | null | undefined,
  canonicalIslands: string[]
): string | null {
  const matches = canonicalIslands.filter((island) => hasIslandToken(text, island));
  return matches.length === 1 ? matches[0] : null;
}

function resolved(
  island: string,
  city: string | null,
  confidence: IslandRecoveryConfidence,
  rule: string,
  matchedText: string | null
): IslandRecoveryResolved {
  return { kind: "resolved", island, city, confidence, rule, matchedText };
}

function tryParse(
  text: string | null | undefined,
  marketId: string,
  rule: "parse:raw_island" | "parse:raw_city"
): IslandRecoveryResolved | null {
  if (!text) return null;
  const result = parseLocation(text, marketId);
  if (!result.island) return null;
  return resolved(result.island, result.city || null, "high", rule, text);
}

// ── Field access (incl. the virtual `cleaned_title`) ─────────────────────────

function fieldValue(input: IslandRecoveryInput, field: string): string {
  switch (field) {
    case "rawIsland":
      return input.rawIsland || "";
    case "rawCity":
      return input.rawCity || "";
    case "title":
      return input.title || "";
    case "description":
      return input.description || "";
    case "sourceUrl":
      return input.sourceUrl || "";
    case "pageTitleHint":
      return input.pageTitleHint || "";
    case "cleaned_title":
      return cleanTitle(input.title);
    default:
      return "";
  }
}

// ── Rule evaluation ──────────────────────────────────────────────────────────

function evalLandmark(
  rule: LandmarkRule,
  input: IslandRecoveryInput,
  path: string
): IslandRecoveryResolved | null {
  const phrases = rule.landmark_any ?? (rule.landmark != null ? [rule.landmark] : []);
  const haystack = rule.in.map((f) => fieldValue(input, f)).join(" ");

  let matchedPhrase: string | null = null;
  for (const phrase of phrases) {
    if (containsText(haystack, phrase)) {
      matchedPhrase = phrase;
      break;
    }
  }
  const pathMatched =
    rule.path_contains != null && path.includes(rule.path_contains);

  if (matchedPhrase == null && !pathMatched) return null;

  let matchedText: string | null;
  switch (rule.matched_text) {
    case "source":
      matchedText = (input.rawIsland || "") || path;
      break;
    case "cleaned_title":
      matchedText = fieldValue(input, "cleaned_title");
      break;
    default:
      // "phrase": the phrase that matched (path-only matches fall back to the
      // first declared phrase, mirroring the original code's literal text).
      matchedText = matchedPhrase ?? phrases[0] ?? null;
  }

  return resolved(
    rule.island,
    rule.city ?? null,
    rule.confidence ?? "high",
    rule.rule,
    matchedText
  );
}

function evalRule(
  rule: IslandRecoveryRule,
  input: IslandRecoveryInput,
  path: string,
  canonicalIslands: string[]
): IslandRecoveryResult | null {
  if ("skip" in rule) {
    if ("when_equals" in rule) {
      const { field, value } = rule.when_equals;
      if (normalizeText(fieldValue(input, field)) === normalizeText(value)) {
        return { kind: "skipped", reason: rule.skip };
      }
      return null;
    }
    return { kind: "skipped", reason: rule.skip };
  }

  if ("skip_if_path_contains" in rule) {
    if (path.includes(rule.skip_if_path_contains)) {
      return { kind: "skipped", reason: rule.reason };
    }
    return null;
  }

  if ("strategy" in rule) {
    const { field, value } = rule.when_equals;
    if (normalizeText(fieldValue(input, field)) !== normalizeText(value)) return null;
    const fromText = fieldValue(input, rule.from);
    const island = detectSingleCanonicalIslandToken(fromText, canonicalIslands);
    if (island) {
      return resolved(island, null, rule.confidence, rule.rule, fromText);
    }
    return { kind: "skipped", reason: rule.no_match_skip };
  }

  // LandmarkRule
  return evalLandmark(rule, input, path);
}

export function resolveIslandRecovery(
  input: IslandRecoveryInput,
  marketId: string
): IslandRecoveryResult {
  const config = (loadLocationsConfig(marketId) as { island_recovery?: IslandRecoveryConfig } | null)
    ?.island_recovery;

  // 1. Unsafe ids — never auto-recover.
  const unsafeReason = config?.unsafe_ids?.[input.id];
  if (unsafeReason) return { kind: "skipped", reason: unsafeReason };

  // 2 + 3. Generic structured-location parse.
  const parsedIsland = tryParse(input.rawIsland, marketId, "parse:raw_island");
  if (parsedIsland) return parsedIsland;
  const parsedCity = tryParse(input.rawCity, marketId, "parse:raw_city");
  if (parsedCity) return parsedCity;

  // 4. Per-source rules, in declared order.
  const rules = config?.sources?.[input.sourceId];
  if (rules && rules.length > 0) {
    const path = getUrlPath(input.sourceUrl);
    const canonicalIslands = getIslands(marketId);
    for (const rule of rules) {
      const result = evalRule(rule, input, path, canonicalIslands);
      if (result) return result;
    }
  }

  // 5. No match.
  return { kind: "no_match" };
}
