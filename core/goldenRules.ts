import { SourceStatus } from "./status";

export const GOLDEN_RULES_V1 = {
  minImages: 2,
  minDescriptionLength: 30,
  genericTitles: [
    "listing",
    "property",
    "for sale",
    "for rent",
    "untitled",
    "no title",
    "n/a",
    "na",
    "-",
    "...",
  ],
} as const;

export enum RuleViolation {
  INSUFFICIENT_IMAGES = "INSUFFICIENT_IMAGES",
  INVALID_PRICE = "INVALID_PRICE",
  MISSING_TITLE = "MISSING_TITLE",
  GENERIC_TITLE = "GENERIC_TITLE",
  DESCRIPTION_TOO_SHORT = "DESCRIPTION_TOO_SHORT",
  BROKEN_SOURCE = "BROKEN_SOURCE",
  DUPLICATE = "DUPLICATE",
}

export interface ListingInput {
  id: string;
  title?: string;
  price?: number | string | null;
  description?: string;
  imageUrls?: string[];
  location?: string;
  sourceStatus: SourceStatus;
}

export function isValidImageUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === "") return false;
  if (trimmed.includes("placeholder")) return false;
  if (trimmed.includes("no-image")) return false;
  if (trimmed.includes("noimage")) return false;
  if (trimmed.includes("default")) return false;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;
  return true;
}

export function countValidImages(imageUrls: string[] | undefined): number {
  if (!imageUrls || !Array.isArray(imageUrls)) return 0;
  return imageUrls.filter(isValidImageUrl).length;
}

export function checkImages(imageUrls: string[] | undefined): RuleViolation | null {
  const validCount = countValidImages(imageUrls);
  if (validCount < GOLDEN_RULES_V1.minImages) {
    return RuleViolation.INSUFFICIENT_IMAGES;
  }
  return null;
}

export function isValidPrice(price: number | string | null | undefined): boolean {
  if (price === null || price === undefined) return false;
  if (price === "") return false;
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return false;
  if (numPrice <= 0) return false;
  return true;
}

export function checkPrice(price: number | string | null | undefined): RuleViolation | null {
  if (!isValidPrice(price)) {
    return RuleViolation.INVALID_PRICE;
  }
  return null;
}

export function isGenericTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return GOLDEN_RULES_V1.genericTitles.some(
    (generic) => normalized === generic || normalized.startsWith(generic + " ")
  );
}

export function checkTitle(title: string | undefined): RuleViolation | null {
  if (!title || typeof title !== "string" || title.trim() === "") {
    return RuleViolation.MISSING_TITLE;
  }
  if (isGenericTitle(title)) {
    return RuleViolation.GENERIC_TITLE;
  }
  return null;
}

export function checkDescription(description: string | undefined): RuleViolation | null {
  if (!description || typeof description !== "string") {
    return RuleViolation.DESCRIPTION_TOO_SHORT;
  }
  if (description.trim().length < GOLDEN_RULES_V1.minDescriptionLength) {
    return RuleViolation.DESCRIPTION_TOO_SHORT;
  }
  return null;
}

export function checkSourceStatus(status: SourceStatus): RuleViolation | null {
  if (status === SourceStatus.BROKEN_SOURCE) {
    return RuleViolation.BROKEN_SOURCE;
  }
  return null;
}

export function evaluateGoldenRules(listing: ListingInput): RuleViolation[] {
  const violations: RuleViolation[] = [];

  const sourceViolation = checkSourceStatus(listing.sourceStatus);
  if (sourceViolation) violations.push(sourceViolation);

  const imageViolation = checkImages(listing.imageUrls);
  if (imageViolation) violations.push(imageViolation);

  const priceViolation = checkPrice(listing.price);
  if (priceViolation) violations.push(priceViolation);

  const titleViolation = checkTitle(listing.title);
  if (titleViolation) violations.push(titleViolation);

  const descViolation = checkDescription(listing.description);
  if (descViolation) violations.push(descViolation);

  return violations;
}

export function generateDuplicateKey(listing: ListingInput): string {
  const title = (listing.title || "").trim().toLowerCase();
  const price = isValidPrice(listing.price) ? String(listing.price) : "";
  const location = (listing.location || "").trim().toLowerCase();
  return `${title}|${price}|${location}`;
}
