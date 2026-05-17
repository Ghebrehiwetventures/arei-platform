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

  return (
    <div className="lang-toggle" role="group" aria-label={t("common.languageToggleLabel")}>
      {SUPPORTED_LANGUAGES.map((lang, i) => (
        <>
          {i > 0 && <span key={`sep-${lang}`} className="lang-sep" aria-hidden="true">/</span>}
          <button
            key={lang}
            type="button"
            className={`lang-toggle-btn${current === lang ? " on" : ""}`}
            onClick={() => changeLanguage(lang)}
            aria-pressed={current === lang}
          >
            {lang === "pt" ? "PT" : "EN"}
          </button>
        </>
      ))}
    </div>
  );
}
