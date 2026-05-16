import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../i18n";

export default function LanguagePersistence() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
    document.documentElement.lang = lang === "pt" ? "pt-PT" : "en";
    try {
      window.localStorage.setItem("kv-language", lang);
    } catch {
      // localStorage is best-effort only.
    }
  }, [i18n.resolvedLanguage, i18n.language]);

  return null;
}
