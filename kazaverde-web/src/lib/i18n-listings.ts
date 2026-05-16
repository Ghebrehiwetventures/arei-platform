import type { ListingDetail } from "arei-sdk";
import { normalizeLanguage, type SupportedLanguage } from "../i18n";
import { PT_LISTING_TRANSLATIONS } from "./pt-listing-translations.generated";

type LocalizedListingFields = { id?: string; title: string; ai_descriptions?: ListingDetail["ai_descriptions"] };

export function currentListingLanguage(language?: string | null): SupportedLanguage {
  return normalizeLanguage(language);
}

export function getLocalizedTitle(
  listing: LocalizedListingFields,
  language?: string | null,
): { title: string; language: SupportedLanguage; source: "ai" | "raw" } {
  const lang = currentListingLanguage(language);
  const aiTitle = listing.ai_descriptions?.[lang]?.title?.trim();
  if (aiTitle) return { title: aiTitle, language: lang, source: "ai" };

  const generatedTitle = lang === "pt" && listing.id ? PT_LISTING_TRANSLATIONS[listing.id]?.title?.trim() : "";
  if (generatedTitle) return { title: generatedTitle, language: "pt", source: "ai" };

  const englishAiTitle = listing.ai_descriptions?.en?.title?.trim();
  if (lang === "en" && englishAiTitle) return { title: englishAiTitle, language: "en", source: "ai" };

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
