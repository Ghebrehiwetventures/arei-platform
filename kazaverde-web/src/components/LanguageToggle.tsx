import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, normalizeLanguage, type SupportedLanguage } from "../i18n";

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const current = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  function changeLanguage(lang: SupportedLanguage) {
    void i18n.changeLanguage(lang);
    try {
      window.localStorage.setItem("kv-language", lang);
    } catch {
      // Persistence is best-effort; i18next still updates in memory.
    }
  }

  return (
    <div className="lang-toggle" role="group" aria-label={t("common.languageToggleLabel")}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`lang-toggle-btn${current === lang ? " on" : ""}`}
          onClick={() => changeLanguage(lang)}
          aria-pressed={current === lang}
        >
          {lang === "pt" ? "PT" : "EN"}
        </button>
      ))}
    </div>
  );
}
