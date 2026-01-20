import {
  ListingInput,
  RuleViolation,
  evaluateGoldenRules,
} from "./goldenRules";

export enum ListingVisibility {
  VISIBLE = "VISIBLE",
  HIDDEN_GOLDEN_RULE = "HIDDEN_GOLDEN_RULE",
}

export interface ClassificationResult {
  listingId: string;
  visibility: ListingVisibility;
  violations: RuleViolation[];
}

export function classifyListing(listing: ListingInput): ClassificationResult {
  const violations = evaluateGoldenRules(listing);

  const visibility =
    violations.length === 0
      ? ListingVisibility.VISIBLE
      : ListingVisibility.HIDDEN_GOLDEN_RULE;

  return {
    listingId: listing.id,
    visibility,
    violations,
  };
}

export function classifyListingWithDuplicate(
  listing: ListingInput,
  isDuplicate: boolean
): ClassificationResult {
  const violations = evaluateGoldenRules(listing);

  if (isDuplicate) {
    violations.push(RuleViolation.DUPLICATE);
  }

  const visibility =
    violations.length === 0
      ? ListingVisibility.VISIBLE
      : ListingVisibility.HIDDEN_GOLDEN_RULE;

  return {
    listingId: listing.id,
    visibility,
    violations,
  };
}
