import type { ListingDetail } from "arei-sdk";
import { normalizeLanguage, type SupportedLanguage } from "../i18n";
import { PT_LISTING_TRANSLATIONS } from "./pt-listing-translations.generated";
import { buildListingTitle, isBadListingTitle } from "./listingTitleDisplay.js";

type LocalizedListingFields = {
  id?: string;
  title: string;
  property_type?: string | null;
  bedrooms?: number | null;
  city?: string | null;
  island?: string | null;
  ai_descriptions?: ListingDetail["ai_descriptions"];
};

export function currentListingLanguage(language?: string | null): SupportedLanguage {
  return normalizeLanguage(language);
}

export function getLocalizedTitle(
  listing: LocalizedListingFields,
  language?: string | null,
): { title: string; language: SupportedLanguage; source: "ai" | "deterministic" | "raw" } {
  const lang = currentListingLanguage(language);

  // 1. AI-rewritten title for this language (reserved for future use; en pipeline intentionally
  //    does not produce titles — only descriptions).
  const aiTitle = listing.ai_descriptions?.[lang]?.title?.trim();
  if (aiTitle) return { title: aiTitle, language: lang, source: "ai" };

  // 2. Only replace the raw title when it is clearly broken scraped metadata
  //    (SqM measurements, "located at" boilerplate, empty, etc.).
  //    Acceptable project names / generic titles / location descriptions are kept as-is.
  if (isBadListingTitle(listing.title)) {
    const deterministic = buildListingTitle(listing, lang);
    if (deterministic) return { title: deterministic, language: lang, source: "deterministic" };
  }

  // 3. Raw title is acceptable — pass it through as-is.
  //    Caller runs normalizeListingDisplayTitle() to fix ALL-CAPS casing.
  return { title: listing.title, language: "en", source: "raw" };
}

export function getLocalizedDescription(
  listing: Pick<ListingDetail, "ai_descriptions" | "description" | "description_html"> & { id?: string },
  language?: string | null,
): { text: string | null; source: "ai" | "html" | "raw" | "none"; language: SupportedLanguage } {
  const lang = currentListingLanguage(language);
  const aiText = listing.ai_descriptions?.[lang]?.text?.trim();
  if (aiText) return { text: aiText, source: "ai", language: lang };

  const generatedText = lang === "pt" && listing.id ? PT_LISTING_TRANSLATIONS[listing.id]?.text?.trim() : "";
  if (generatedText) return { text: generatedText, source: "ai", language: "pt" };

  const englishFallback = listing.ai_descriptions?.en?.text?.trim();
  if (englishFallback) return { text: englishFallback, source: "ai", language: "en" };

  if (listing.description_html) return { text: listing.description_html, source: "html", language: "en" };
  if (listing.description) return { text: listing.description, source: "raw", language: "en" };
  return { text: null, source: "none", language: lang };
}
