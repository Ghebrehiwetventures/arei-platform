import { Listing, ListingSelection, ListingSelectorScorePart, ListingSelectionTheme } from "./types";

interface SourceQualitySignal {
  score: number;
  approvedPct: number;
  imagePct: number;
  pricePct: number;
}

interface SelectorOptions {
  limit?: number;
  sourceQualityBySourceId?: Map<string, SourceQualitySignal>;
}

interface PoolStats {
  titleSignatureCounts: Map<string, number>;
  islandMedianPricePerSqm: Map<string, number>;
  updatedDayCounts: Map<string, number>;
}

const MAX_SELECTIONS = 8;
const MIN_SELECTION_SCORE = 55;

const ISLAND_SCORES: Record<string, number> = {
  sal: 8,
  "boa vista": 8,
  "sao vicente": 6,
  "sao vicente island": 6,
  santiago: 5,
  maio: 4,
  "santo antao": 4,
};

const CITY_SCORES: Record<string, number> = {
  "santa maria": 4,
  mindelo: 4,
  praia: 3,
  "sal rei": 3,
  tarrafal: 2,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocationLabel(listing: Listing): string {
  const joined = [listing.city, listing.island].filter(Boolean).join(", ").trim();
  return joined || listing.location?.trim() || "Cape Verde";
}

function formatPriceLabel(listing: Listing): string | null {
  const numericPrice = listing.price ?? listing.project_start_price ?? null;
  if (numericPrice == null) return null;
  const currency = listing.currency || "EUR";
  const prefix = currency === "EUR" ? "EUR " : `${currency} `;
  const lead = listing.project_start_price != null && listing.price == null ? "From " : "";
  return `${lead}${prefix}${Math.round(numericPrice).toLocaleString()}`;
}

function getUsableImages(listing: Listing): string[] {
  return listing.images.filter((url) => {
    const lower = url.toLowerCase();
    return (
      lower.startsWith("http") &&
      !lower.includes("placeholder") &&
      !lower.includes("default") &&
      !lower.includes("avatar") &&
      !lower.includes("logo")
    );
  });
}

function getLeadImage(listing: Listing): string | null {
  const usable = getUsableImages(listing);
  return usable[0] || listing.images[0] || null;
}

function hasInactiveStatus(listing: Listing): boolean {
  const status = normalizeText(listing.status);
  return ["sold", "rented", "inactive", "hidden", "draft", "archived"].some((token) => status.includes(token));
}

function getHardFailures(listing: Listing): string[] {
  const failures: string[] = [];
  if (!listing.approved) failures.push("not approved");
  if (!listing.sourceUrl) failures.push("missing source url");
  if (!listing.title || normalizeText(listing.title).length < 10) failures.push("weak title");
  if (!getLocationLabel(listing)) failures.push("missing location");
  if (getUsableImages(listing).length === 0) failures.push("no usable images");
  if (hasInactiveStatus(listing)) failures.push("inactive status");
  return failures;
}

function getDaysSince(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return null;
  const diff = Date.now() - parsed;
  return Math.max(0, Math.round(diff / 86_400_000));
}

function getPricePerSqm(listing: Listing): number | null {
  if (!listing.price || !listing.area_sqm || listing.area_sqm <= 0) return null;
  return listing.price / listing.area_sqm;
}

function getIsoDay(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  const parsed = Date.parse(dateValue);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function parseBedroomsFromTitle(title: string | undefined): number | null {
  const normalized = normalizeText(title);
  if (!normalized) return null;
  if (/\bstudio\b|\bmonolocale\b/.test(normalized)) return 0;
  const digitMatch = normalized.match(/\b(\d+)\s*(?:bed|bedroom|br)\b/);
  if (digitMatch) return Number(digitMatch[1]);

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };
  const wordMatch = normalized.match(/\b(one|two|three|four|five)\s*(?:bed|bedroom)\b/);
  return wordMatch ? wordMap[wordMatch[1]] : null;
}

function assessTitleQuality(title: string | undefined): { penalty: number; issues: string[] } {
  const rawTitle = (title || "").trim();
  const normalized = normalizeText(rawTitle);
  const issues: string[] = [];
  let penalty = 0;

  if (!rawTitle) {
    return { penalty: 8, issues: ["Missing title."] };
  }

  if (/^[A-Z]{2,}[_-]?[A-Z0-9]{2,}/.test(rawTitle)) {
    penalty += 3;
    issues.push("Title starts with a feed-style code prefix.");
  }
  if (/[\t\n\r]/.test(rawTitle)) {
    penalty += 3;
    issues.push("Title contains raw whitespace artifacts.");
  }
  if ((rawTitle.match(/[-_]/g) || []).length >= 4) {
    penalty += 2;
    issues.push("Title uses excessive separators.");
  }
  if ((rawTitle.match(/[A-Z]{4,}/g) || []).length >= 2) {
    penalty += 2;
    issues.push("Title contains multiple all-caps fragments.");
  }
  if (normalized.length < 12) {
    penalty += 2;
    issues.push("Title is too thin to feel editorial-grade.");
  }

  return {
    penalty: clamp(penalty, 0, 8),
    issues,
  };
}

function assessFactSanity(
  listing: Listing,
  pricePerSqm: number | null,
  islandMedianPricePerSqm: number | null
): { penalty: number; issues: string[] } {
  const issues: string[] = [];
  let penalty = 0;
  const normalizedTitle = normalizeText(listing.title);
  const titleBedrooms = parseBedroomsFromTitle(listing.title);
  const structuredBedrooms = listing.bedrooms;

  if ((/\bstudio\b|\bmonolocale\b/.test(normalizedTitle) && (structuredBedrooms ?? 0) > 1) || titleBedrooms === 0 && (structuredBedrooms ?? 0) > 1) {
    penalty += 10;
    issues.push("Studio-style title conflicts with 2+ structured bedrooms.");
  }

  if (titleBedrooms != null && structuredBedrooms != null && titleBedrooms > 0 && Math.abs(titleBedrooms - structuredBedrooms) >= 1) {
    penalty += 6;
    issues.push(`Title bedroom count (${titleBedrooms}) conflicts with structured bedrooms (${structuredBedrooms}).`);
  }

  if (normalizedTitle.includes("villa") && listing.property_type && normalizeText(listing.property_type).includes("apartment")) {
    penalty += 4;
    issues.push("Title implies villa while structured type looks like apartment.");
  }

  if (pricePerSqm != null && islandMedianPricePerSqm != null) {
    const ratio = pricePerSqm / islandMedianPricePerSqm;
    if (ratio < 0.35 || ratio > 2.2) {
      penalty += 6;
      issues.push("Price per sqm looks like a strong outlier against the island baseline.");
    }
  }

  return {
    penalty: clamp(penalty, 0, 16),
    issues,
  };
}

function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildPoolStats(listings: Listing[]): PoolStats {
  const titleSignatureCounts = new Map<string, number>();
  const perIslandPricePerSqm = new Map<string, number[]>();
  const updatedDayCounts = new Map<string, number>();

  for (const listing of listings) {
    const titleSignature = normalizeText(`${listing.title || ""} ${listing.city || ""}`).split(" ").slice(0, 8).join(" ");
    if (titleSignature) {
      titleSignatureCounts.set(titleSignature, (titleSignatureCounts.get(titleSignature) || 0) + 1);
    }

    const islandKey = normalizeText(listing.island);
    const pricePerSqm = getPricePerSqm(listing);
    if (!islandKey || pricePerSqm == null) continue;
    const bucket = perIslandPricePerSqm.get(islandKey) || [];
    bucket.push(pricePerSqm);
    perIslandPricePerSqm.set(islandKey, bucket);

    const updatedDay = getIsoDay(listing.updatedAt || listing.createdAt);
    if (updatedDay) {
      updatedDayCounts.set(updatedDay, (updatedDayCounts.get(updatedDay) || 0) + 1);
    }
  }

  const islandMedianPricePerSqm = new Map<string, number>();
  for (const [islandKey, values] of perIslandPricePerSqm.entries()) {
    const median = computeMedian(values);
    if (median != null) islandMedianPricePerSqm.set(islandKey, median);
  }

  return {
    titleSignatureCounts,
    islandMedianPricePerSqm,
    updatedDayCounts,
  };
}

function scoreListing(
  listing: Listing,
  poolStats: PoolStats,
  sourceQualityBySourceId: Map<string, SourceQualitySignal>
): { totalScore: number; theme: ListingSelectionTheme; breakdown: ListingSelectorScorePart[]; warnings: string[] } {
  const usableImages = getUsableImages(listing);
  const sourceQuality = sourceQualityBySourceId.get(listing.sourceId) || {
    score: 0.5,
    approvedPct: 50,
    imagePct: 50,
    pricePct: 50,
  };
  const descriptionLength = listing.description?.trim().length || 0;
  const factsCount = [listing.bedrooms, listing.bathrooms, listing.area_sqm, listing.price ?? listing.project_start_price].filter(
    (value) => value != null
  ).length;
  const islandKey = normalizeText(listing.island);
  const cityKey = normalizeText(listing.city);
  const daysSinceUpdate = getDaysSince(listing.updatedAt || listing.createdAt);
  const updatedDay = getIsoDay(listing.updatedAt || listing.createdAt);
  const updatedDayCount = updatedDay ? poolStats.updatedDayCounts.get(updatedDay) || 0 : 0;
  const pricePerSqm = getPricePerSqm(listing);
  const islandMedianPricePerSqm = islandKey ? poolStats.islandMedianPricePerSqm.get(islandKey) : null;
  const titleSignature = normalizeText(`${listing.title || ""} ${listing.city || ""}`).split(" ").slice(0, 8).join(" ");
  const titleFrequency = titleSignature ? poolStats.titleSignatureCounts.get(titleSignature) || 1 : 1;
  const titleQuality = assessTitleQuality(listing.title);
  const factSanity = assessFactSanity(listing, pricePerSqm, islandMedianPricePerSqm);

  const trustScore = clamp(
    Math.round(sourceQuality.score * 12) + (listing.approved ? 6 : 0) + (listing.source_ref ? 3 : 0) + (!hasInactiveStatus(listing) ? 3 : 0),
    0,
    24
  );

  const visualScore = clamp(
    (usableImages.length >= 6 ? 12 : usableImages.length >= 4 ? 10 : usableImages.length >= 2 ? 7 : 4) +
      (usableImages.length >= 8 ? 4 : usableImages.length >= 5 ? 3 : usableImages.length >= 3 ? 2 : 0) +
      (getLeadImage(listing) ? 2 : 0),
    0,
    18
  );

  const completenessScore = clamp(
    (listing.title ? 3 : 0) +
      (descriptionLength >= 500 ? 8 : descriptionLength >= 240 ? 6 : descriptionLength >= 120 ? 4 : descriptionLength >= 60 ? 2 : 0) +
      Math.min(3, factsCount) -
      titleQuality.penalty,
    0,
    14
  );

  const locationScore = clamp((ISLAND_SCORES[islandKey] || 2) + (CITY_SCORES[cityKey] || 0), 0, 12);

  let valueScore = 2;
  let valueNote = "Limited value signal because price context is incomplete.";
  if (pricePerSqm != null && islandMedianPricePerSqm != null) {
    const ratio = pricePerSqm / islandMedianPricePerSqm;
    valueScore = ratio <= 0.82 ? 10 : ratio <= 0.92 ? 8 : ratio <= 1.05 ? 6 : ratio <= 1.2 ? 4 : 2;
    valueNote =
      ratio <= 0.92
        ? "Price per sqm looks competitive versus the current island median."
        : ratio <= 1.05
          ? "Price per sqm is close to the current island median, which keeps the value story usable."
          : "Price per sqm looks premium relative to the current island median.";
  } else if (listing.price != null || listing.project_start_price != null) {
    valueScore = 5;
    valueNote = "Price exists even if sqm context is incomplete, so there is still a usable value hook.";
  }

  const freshnessBase =
    daysSinceUpdate == null ? 2 : daysSinceUpdate === 0 ? 4 : daysSinceUpdate <= 7 ? 5 : daysSinceUpdate <= 21 ? 4 : daysSinceUpdate <= 60 ? 3 : daysSinceUpdate <= 120 ? 2 : 1;
  const freshnessMassRefreshPenalty = updatedDayCount >= 40 ? 2 : updatedDayCount >= 20 ? 1 : 0;
  const freshnessScore = clamp(freshnessBase - freshnessMassRefreshPenalty, 0, 6);

  const uniquenessScore = clamp(titleFrequency <= 1 ? 7 : titleFrequency === 2 ? 5 : titleFrequency === 3 ? 2 : 0, 0, 7);

  const materialScore = clamp(
    (usableImages.length >= 4 ? 3 : usableImages.length >= 2 ? 2 : 1) +
      (descriptionLength >= 180 ? 2 : descriptionLength >= 80 ? 1 : 0) +
      (factsCount >= 3 ? 2 : factsCount >= 2 ? 1 : 0) -
      Math.ceil(factSanity.penalty / 4),
    0,
    7
  );

  const breakdown: ListingSelectorScorePart[] = [
    {
      key: "trust",
      label: "Trust",
      score: trustScore,
      maxScore: 24,
      note: `Source quality is ${Math.round(sourceQuality.score * 100)}/100 with ${sourceQuality.approvedPct}% approved coverage.`,
    },
    {
      key: "visual",
      label: "Visual",
      score: visualScore,
      maxScore: 18,
      note: `${usableImages.length} usable images give the selector enough editorial material.`,
    },
    {
      key: "completeness",
      label: "Completeness",
      score: completenessScore,
      maxScore: 14,
      note: `${descriptionLength} description chars and ${factsCount} usable facts.`,
    },
    {
      key: "location",
      label: "Location",
      score: locationScore,
      maxScore: 12,
      note: `Location signal is based on ${getLocationLabel(listing)}.`,
    },
    {
      key: "value",
      label: "Value",
      score: valueScore,
      maxScore: 10,
      note: valueNote,
    },
    {
      key: "freshness",
      label: "Freshness",
      score: freshnessScore,
      maxScore: 8,
      note:
        daysSinceUpdate == null
          ? "Freshness is unknown, so the selector applies a conservative midpoint."
          : `Listing was updated about ${daysSinceUpdate} day${daysSinceUpdate === 1 ? "" : "s"} ago.`,
    },
    {
      key: "uniqueness",
      label: "Uniqueness",
      score: uniquenessScore,
      maxScore: 7,
      note: titleFrequency <= 1 ? "This looks distinct inside the current candidate pool." : "Similar title/location patterns exist in the pool.",
    },
    {
      key: "material",
      label: "Post Material",
      score: materialScore,
      maxScore: 7,
      note: "Measures whether the listing has enough image and text material for a credible post brief.",
    },
  ];

  const totalScore = breakdown.reduce((sum, part) => sum + part.score, 0) - factSanity.penalty;
  const warnings: string[] = [];
  warnings.push(...titleQuality.issues);
  warnings.push(...factSanity.issues);
  if (usableImages.length < 4) warnings.push("Thin image set. Review lead image quality before using it.");
  if (descriptionLength < 120) warnings.push("Short description. Angle will need to lean on visuals and facts.");
  if (listing.price == null && listing.project_start_price == null) warnings.push("No clear price, so the value story is weaker.");
  if (sourceQuality.score < 0.55) warnings.push("Source quality is below preferred confidence for a top recommendation.");
  if (daysSinceUpdate != null && daysSinceUpdate > 90) warnings.push("Older listing. Confirm it still feels current before featuring it.");
  if (updatedDayCount >= 20) warnings.push("Freshness signal is weak because many listings share the same update date.");

  const dreamSignal = visualScore + locationScore;
  const trustSignal = trustScore + completenessScore;
  const opportunitySignal = valueScore + freshnessScore + (listing.project_flag ? 1 : 0);

  const theme: ListingSelectionTheme =
    opportunitySignal >= dreamSignal && opportunitySignal >= trustSignal
      ? "opportunity"
      : trustSignal >= dreamSignal
        ? "trust"
        : "dream";

  return { totalScore, theme, breakdown, warnings };
}

function buildContentAngle(listing: Listing, theme: ListingSelectionTheme, breakdown: ListingSelectorScorePart[]): string {
  const locationLabel = getLocationLabel(listing);
  const propertyType = listing.property_type ? normalizeText(listing.property_type) : "property";
  const facts = [
    listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
    listing.area_sqm != null ? `${Math.round(listing.area_sqm)} sqm` : null,
    formatPriceLabel(listing),
  ].filter(Boolean);
  const compactFacts = facts.join(" | ");
  const valuePart = breakdown.find((part) => part.key === "value");

  if (theme === "dream") {
    return `Lifestyle angle: use the image set to sell the feel of ${locationLabel}, then anchor the post with ${compactFacts || "clear location facts"}.`;
  }
  if (theme === "trust") {
    const projectNote = listing.project_flag ? " with enough structure to review confidently inside a resort-style project" : "";
    return `Trust angle: present this as a clean, well-documented ${propertyType} in ${locationLabel}${compactFacts ? ` with ${compactFacts}` : ""}${projectNote}.`;
  }
  if (listing.project_flag || listing.project_start_price != null) {
    return `Opportunity angle: frame this as a selective value signal in ${locationLabel}${compactFacts ? ` with ${compactFacts}` : ""}, without overselling the project wrapper.`;
  }
  return `Value angle: show why this ${propertyType} in ${locationLabel} deserves attention${valuePart ? `, especially because ${valuePart.note.toLowerCase()}` : ""}`;
}

function buildReasons(breakdown: ListingSelectorScorePart[]): string[] {
  return [...breakdown]
    .sort((a, b) => b.score / b.maxScore - a.score / a.maxScore)
    .slice(0, 3)
    .map((part) => `${part.label}: ${part.note}`);
}

function buildDiversityFamilyKey(selection: ListingSelection): string {
  const normalized = normalizeText(`${selection.title} ${selection.locationLabel}`)
    .replace(/\b\d+\s*(bed|bedroom|sqm|m2)\b/g, " ")
    .replace(/\b(studio|apartment|villa|property|sale|for|private|views|view|pool|garden|use|with|and|resort|island|cape|verde)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.split(" ").slice(0, 3).join(" ");
}

function applyDiversityRerank(selections: ListingSelection[], limit: number): ListingSelection[] {
  const remaining = [...selections];
  const picked: ListingSelection[] = [];
  const islandCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();

  while (remaining.length > 0 && picked.length < limit) {
    let bestIndex = 0;
    let bestAdjustedScore = -Infinity;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const islandKey = normalizeText(candidate.locationLabel.split(",").slice(-1)[0] || candidate.locationLabel);
      const sourceKey = normalizeText(candidate.sourceName);
      const familyKey = buildDiversityFamilyKey(candidate);

      const adjustedScore =
        candidate.totalScore -
        (islandCounts.get(islandKey) || 0) * 2 -
        (sourceCounts.get(sourceKey) || 0) * 2 -
        (familyKey ? (familyCounts.get(familyKey) || 0) * 4 : 0);

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = index;
      }
    }

    const [chosen] = remaining.splice(bestIndex, 1);
    const islandKey = normalizeText(chosen.locationLabel.split(",").slice(-1)[0] || chosen.locationLabel);
    const sourceKey = normalizeText(chosen.sourceName);
    const familyKey = buildDiversityFamilyKey(chosen);

    islandCounts.set(islandKey, (islandCounts.get(islandKey) || 0) + 1);
    sourceCounts.set(sourceKey, (sourceCounts.get(sourceKey) || 0) + 1);
    if (familyKey) {
      familyCounts.set(familyKey, (familyCounts.get(familyKey) || 0) + 1);
    }
    picked.push(chosen);
  }

  return picked.map((selection, index) => ({
    ...selection,
    rank: index + 1,
  }));
}

export function selectListingsForAttention(listings: Listing[], options: SelectorOptions = {}): ListingSelection[] {
  const sourceQualityBySourceId = options.sourceQualityBySourceId || new Map<string, SourceQualitySignal>();
  const poolStats = buildPoolStats(listings);
  const limit = options.limit || MAX_SELECTIONS;

  const scoredSelections = listings
    .map((listing) => {
      const hardFailures = getHardFailures(listing);
      if (hardFailures.length > 0) return null;

      const selectedImage = getLeadImage(listing);
      if (!selectedImage) return null;

      const { totalScore, theme, breakdown, warnings } = scoreListing(listing, poolStats, sourceQualityBySourceId);
      if (totalScore < MIN_SELECTION_SCORE) return null;

      return {
        listingId: listing.id,
        rank: 0,
        totalScore,
        selectionTheme: theme,
        title: listing.title || "Untitled listing",
        sourceName: listing.sourceName,
        sourceUrl: listing.sourceUrl,
        locationLabel: getLocationLabel(listing),
        priceLabel: formatPriceLabel(listing),
        selectedImage,
        reasons: buildReasons(breakdown),
        warnings,
        contentAngle: buildContentAngle(listing, theme, breakdown),
        scoreBreakdown: breakdown,
      } satisfies ListingSelection;
    })
    .filter((listing): listing is ListingSelection => Boolean(listing))
    .sort((a, b) => b.totalScore - a.totalScore);

  return applyDiversityRerank(scoredSelections, limit);
}
