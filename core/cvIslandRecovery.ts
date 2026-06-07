import { getIslands, parseLocation } from "./locationMapper";

export type CvIslandRecoveryConfidence = "high" | "medium";

export type CvIslandRecoveryRule =
  | "parse:raw_island"
  | "parse:raw_city"
  | "globallistings:slug_santa_maria"
  | "globallistings:slug_melia_tortuga"
  | "globallistings:slug_paradise_beach_sal"
  | "globallistings:slug_dunas_beach_resort"
  | "globallistings:slug_ponta_preta"
  | "globallistings:slug_sal_rel"
  | "globallistings:page_title_single_island"
  | "homescasaverde:melia_tortuga"
  | "homescasaverde:vila_verde"
  | "homescasaverde:paradise_beach"
  | "simplycapeverde:dunas_beach_resort"
  | "cabohouseproperty:tortuga_beach_resort"
  | "cabohouseproperty:porto_antigo"
  | "terracaboverde:city_sal_rei"
  | "rightmove:title_santo_antao";

export type CvIslandRecoverySkipReason =
  | "known_non_listing"
  | "known_unsafe_op24"
  | "known_unsafe_country_only"
  | "globallistings:search_page"
  | "globallistings:country_only_unconfirmed"
  | "rightmove:country_only"
  | "op24:do_not_auto_recover";

export interface CvIslandRecoveryInput {
  id: string;
  sourceId: string;
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  rawIsland?: string | null;
  rawCity?: string | null;
  pageTitleHint?: string | null;
}

export interface CvIslandRecoveryResolved {
  kind: "resolved";
  island: string;
  city: string | null;
  confidence: CvIslandRecoveryConfidence;
  rule: CvIslandRecoveryRule;
  matchedText: string | null;
}

export interface CvIslandRecoverySkipped {
  kind: "skipped";
  reason: CvIslandRecoverySkipReason;
}

export interface CvIslandRecoveryNoMatch {
  kind: "no_match";
}

export type CvIslandRecoveryResult =
  | CvIslandRecoveryResolved
  | CvIslandRecoverySkipped
  | CvIslandRecoveryNoMatch;

export const CV_ISLAND_RECOVERY_UNSAFE_IDS: ReadonlySet<string> = new Set([
  "gen_80220e8beb3a",
  "op24_a6ffae9129f4",
  "gen_21c802edd693",
]);

const CV_CANONICAL_ISLANDS = getIslands("cv");

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

function resolved(
  island: string,
  city: string | null,
  confidence: CvIslandRecoveryConfidence,
  rule: CvIslandRecoveryRule,
  matchedText: string | null
): CvIslandRecoveryResolved {
  return {
    kind: "resolved",
    island,
    city,
    confidence,
    rule,
    matchedText,
  };
}

function tryParse(
  text: string | null | undefined,
  rule: "parse:raw_island" | "parse:raw_city"
): CvIslandRecoveryResolved | null {
  if (!text) return null;
  const result = parseLocation(text, "cv");
  if (!result.island) return null;
  return resolved(result.island, result.city || null, "high", rule, text);
}

function cleanRightmoveTitle(title: string | null | undefined): string {
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

function detectSingleCanonicalIslandToken(text: string | null | undefined): string | null {
  const matches = CV_CANONICAL_ISLANDS.filter((island) => hasIslandToken(text, island));
  return matches.length === 1 ? matches[0] : null;
}

export function resolveCvIslandRecovery(
  input: CvIslandRecoveryInput
): CvIslandRecoveryResult {
  if (CV_ISLAND_RECOVERY_UNSAFE_IDS.has(input.id)) {
    if (input.id === "gen_80220e8beb3a") {
      return { kind: "skipped", reason: "known_non_listing" };
    }
    if (input.id === "op24_a6ffae9129f4") {
      return { kind: "skipped", reason: "known_unsafe_op24" };
    }
    return { kind: "skipped", reason: "known_unsafe_country_only" };
  }

  const parsedIsland = tryParse(input.rawIsland, "parse:raw_island");
  if (parsedIsland) return parsedIsland;

  const parsedCity = tryParse(input.rawCity, "parse:raw_city");
  if (parsedCity) return parsedCity;

  const title = input.title || "";
  const description = input.description || "";
  const rawIsland = input.rawIsland || "";
  const rawCity = input.rawCity || "";
  const path = getUrlPath(input.sourceUrl);

  if (input.sourceId === "cv_globallistings") {
    if (path.includes("/property-search")) {
      return { kind: "skipped", reason: "globallistings:search_page" };
    }

    if (containsText(rawIsland, "Santa Maria") || path.includes("santa-maria")) {
      return resolved("Sal", "Santa Maria", "high", "globallistings:slug_santa_maria", rawIsland || path);
    }
    if (containsText(rawIsland, "Melia Tortuga") || path.includes("melia-tortuga")) {
      return resolved("Sal", null, "high", "globallistings:slug_melia_tortuga", rawIsland || path);
    }
    if (containsText(rawIsland, "Paradise Beach Sal") || path.includes("paradise-beach-sal")) {
      return resolved("Sal", null, "high", "globallistings:slug_paradise_beach_sal", rawIsland || path);
    }
    if (containsText(rawIsland, "Dunas Beach Resort") || path.includes("dunas-beach-resort")) {
      return resolved("Sal", null, "high", "globallistings:slug_dunas_beach_resort", rawIsland || path);
    }
    if (containsText(rawIsland, "Ponta Preta") || path.includes("ponta-preta")) {
      return resolved("Sal", null, "high", "globallistings:slug_ponta_preta", rawIsland || path);
    }
    if (containsText(rawIsland, "Sal Rel") || path.includes("sal-rel")) {
      return resolved("Boa Vista", "Sal Rei", "high", "globallistings:slug_sal_rel", rawIsland || path);
    }

    if (normalizeText(rawIsland) === "cape verde") {
      const pageTitleHint = input.pageTitleHint || "";
      const pageTitleIsland = detectSingleCanonicalIslandToken(pageTitleHint);
      if (pageTitleIsland) {
        return resolved(
          pageTitleIsland,
          null,
          "medium",
          "globallistings:page_title_single_island",
          pageTitleHint
        );
      }
      return { kind: "skipped", reason: "globallistings:country_only_unconfirmed" };
    }
  }

  if (input.sourceId === "cv_homescasaverde") {
    const combined = `${title} ${description} ${input.sourceUrl || ""}`;
    if (containsText(combined, "Melia Tortuga")) {
      return resolved("Sal", null, "high", "homescasaverde:melia_tortuga", "Melia Tortuga");
    }
    if (containsText(combined, "Vila Verde")) {
      return resolved("Sal", null, "high", "homescasaverde:vila_verde", "Vila Verde");
    }
    if (containsText(combined, "Paradise Beach")) {
      return resolved("Sal", null, "high", "homescasaverde:paradise_beach", "Paradise Beach");
    }
  }

  if (input.sourceId === "cv_simplycapeverde") {
    const combined = `${title} ${input.sourceUrl || ""}`;
    if (containsText(combined, "Dunas Beach Resort")) {
      return resolved("Sal", null, "high", "simplycapeverde:dunas_beach_resort", "Dunas Beach Resort");
    }
  }

  if (input.sourceId === "cv_cabohouseproperty") {
    const combined = `${title} ${description} ${input.sourceUrl || ""}`;
    if (containsText(combined, "Tortuga Beach Resort")) {
      return resolved(
        "Sal",
        "Santa Maria",
        "high",
        "cabohouseproperty:tortuga_beach_resort",
        "Tortuga Beach Resort"
      );
    }
    if (containsText(combined, "Porto Antigo")) {
      return resolved(
        "Sal",
        "Santa Maria",
        "high",
        "cabohouseproperty:porto_antigo",
        "Porto Antigo"
      );
    }
  }

  if (input.sourceId === "cv_terracaboverde") {
    if (containsText(rawCity, "Sal Rei")) {
      return resolved("Boa Vista", "Sal Rei", "high", "terracaboverde:city_sal_rei", rawCity);
    }
  }

  if (input.sourceId === "cv_rightmove") {
    const cleanedTitle = cleanRightmoveTitle(title);
    if (containsText(cleanedTitle, "Santo Antao") || containsText(cleanedTitle, "Santo Antão")) {
      return resolved("Santo Antão", null, "high", "rightmove:title_santo_antao", cleanedTitle);
    }
    if (normalizeText(cleanedTitle) === "cape verde") {
      return { kind: "skipped", reason: "rightmove:country_only" };
    }
  }

  if (input.sourceId === "cv_oceanproperty24") {
    return { kind: "skipped", reason: "op24:do_not_auto_recover" };
  }

  return { kind: "no_match" };
}
