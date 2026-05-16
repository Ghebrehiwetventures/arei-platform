import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./CookieBanner.css";

const STORAGE_KEY = "kv_cookie_ack";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so it doesn't flash on first paint
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // silent
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="ck-shell">
      <div className="ck-banner" role="dialog" aria-label={t("cookieBanner.policy")} aria-live="polite">
        <div className="ck-copy">
          <span className="ck-eyebrow">{t("cookieBanner.policy")}</span>
          <p className="ck-text">
            {t("cookieBanner.copy")}
          </p>
        </div>
        <button className="ck-btn" onClick={accept} type="button">
          {t("cookieBanner.accept")}
        </button>
      </div>
    </div>
  );
}
