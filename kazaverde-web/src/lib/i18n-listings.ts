import type { ListingDetail } from "arei-sdk";
import { normalizeLanguage, type SupportedLanguage } from "../i18n";

export function currentListingLanguage(language?: string | null): SupportedLanguage {
  return normalizeLanguage(language);
}

export function getLocalizedDescription(
  listing: Pick<ListingDetail, "ai_descriptions" | "description" | "description_html">,
  language?: string | null,
): { text: string | null; source: "ai" | "html" | "raw" | "none"; language: SupportedLanguage } {
  const lang = currentListingLanguage(language);
  const aiText = listing.ai_descriptions?.[lang]?.text?.trim();
  if (aiText) return { text: aiText, source: "ai", language: lang };

  const englishFallback = listing.ai_descriptions?.en?.text?.trim();
  if (englishFallback) return { text: englishFallback, source: "ai", language: "en" };

  if (listing.description_html) return { text: listing.description_html, source: "html", language: "en" };
  if (listing.description) return { text: listing.description, source: "raw", language: "en" };
  return { text: null, source: "none", language: lang };
}
