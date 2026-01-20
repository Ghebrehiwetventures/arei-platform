import { SourceStatus } from "./status";
import {
  ListingInput,
  RuleViolation,
  generateDuplicateKey,
  countValidImages,
  evaluateGoldenRules,
} from "./goldenRules";
import { ListingVisibility, ClassificationResult } from "./classifyListing";

export interface MarketListingInput extends ListingInput {
  sourceId: string;
  createdAt?: Date;
}

export interface SourceStatusMap {
  [sourceId: string]: SourceStatus;
}

export interface BatchEvaluationResult {
  marketId: string;
  totalListings: number;
  visibleCount: number;
  hiddenCount: number;
  classifications: ClassificationResult[];
}

interface DuplicateCandidate {
  listing: MarketListingInput;
  imageCount: number;
  descriptionLength: number;
  createdAt: Date;
}

function selectBestCandidate(candidates: DuplicateCandidate[]): MarketListingInput {
  const sorted = [...candidates].sort((a, b) => {
    if (a.imageCount !== b.imageCount) {
      return b.imageCount - a.imageCount;
    }
    if (a.descriptionLength !== b.descriptionLength) {
      return b.descriptionLength - a.descriptionLength;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted[0].listing;
}

function findDuplicates(listings: MarketListingInput[]): Set<string> {
  const duplicateGroups = new Map<string, DuplicateCandidate[]>();

  for (const listing of listings) {
    const key = generateDuplicateKey(listing);
    if (!key || key === "||") continue;

    const candidate: DuplicateCandidate = {
      listing,
      imageCount: countValidImages(listing.imageUrls),
      descriptionLength: (listing.description || "").length,
      createdAt: listing.createdAt || new Date(0),
    };

    const group = duplicateGroups.get(key);
    if (group) {
      group.push(candidate);
    } else {
      duplicateGroups.set(key, [candidate]);
    }
  }

  const duplicateIds = new Set<string>();

  for (const [, candidates] of duplicateGroups) {
    if (candidates.length <= 1) continue;

    const best = selectBestCandidate(candidates);
    for (const candidate of candidates) {
      if (candidate.listing.id !== best.id) {
        duplicateIds.add(candidate.listing.id);
      }
    }
  }

  return duplicateIds;
}

export function batchEvaluateMarket(
  marketId: string,
  listings: MarketListingInput[],
  sourceStatuses: SourceStatusMap
): BatchEvaluationResult {
  const listingsWithStatus: MarketListingInput[] = listings.map((listing) => ({
    ...listing,
    sourceStatus: sourceStatuses[listing.sourceId] || SourceStatus.OK,
  }));

  const duplicateIds = findDuplicates(listingsWithStatus);

  const classifications: ClassificationResult[] = [];
  let visibleCount = 0;
  let hiddenCount = 0;

  for (const listing of listingsWithStatus) {
    const violations = evaluateGoldenRules(listing);
    const isDuplicate = duplicateIds.has(listing.id);

    if (isDuplicate) {
      violations.push(RuleViolation.DUPLICATE);
    }

    const visibility =
      violations.length === 0
        ? ListingVisibility.VISIBLE
        : ListingVisibility.HIDDEN_GOLDEN_RULE;

    if (visibility === ListingVisibility.VISIBLE) {
      visibleCount++;
    } else {
      hiddenCount++;
    }

    classifications.push({
      listingId: listing.id,
      visibility,
      violations,
    });
  }

  return {
    marketId,
    totalListings: listings.length,
    visibleCount,
    hiddenCount,
    classifications,
  };
}
