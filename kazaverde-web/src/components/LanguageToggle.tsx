import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, normalizeLanguage, type SupportedLanguage } from "../i18n";

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  function changeLanguage(lang: SupportedLanguage) {
    // The i18next detector persists the choice to localStorage and i18n.ts
    // syncs <html lang>. The toggle only needs to request the change.
    void i18n.changeLanguage(lang);
  }

  const next = SUPPORTED_LANGUAGES.find((lang) => lang !== current) ?? SUPPORTED_LANGUAGES[0];

  return (
    <button
      type="button"
      className="lang-toggle-btn"
      onClick={() => changeLanguage(next)}
      aria-label={t("common.languageToggleLabel")}
    >
      {next === "pt" ? "PT" : "EN"}
    </button>
  );
}
