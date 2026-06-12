import { useState, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getConsent, setConsent } from "../lib/consent";
import "./CookieBanner.css";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      // Show until the visitor has made an explicit marketing decision.
      if (getConsent() === "unset") {
        // Small delay so it doesn't flash on first paint
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, []);

  function decide(granted: boolean) {
    setConsent(granted);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="ck-shell">
      <div className="ck-banner" role="dialog" aria-label={t("cookieBanner.policy")} aria-live="polite">
        <div className="ck-copy">
          <span className="ck-eyebrow">{t("cookieBanner.policy")}</span>
          <p className="ck-text">
            <Trans i18nKey="cookieBanner.copy" components={{ 1: <Link to="/cookie-policy" /> }} />
          </p>
        </div>
        <div className="ck-actions">
          <button className="ck-btn ck-btn-secondary" onClick={() => decide(false)} type="button">
            {t("cookieBanner.decline")}
          </button>
          <button className="ck-btn" onClick={() => decide(true)} type="button">
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
