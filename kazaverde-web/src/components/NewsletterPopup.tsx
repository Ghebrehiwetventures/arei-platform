import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./NewsletterPopup.css";

const STORAGE_KEY = "kv_nl_popup";

export default function NewsletterPopup() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setVisible(true), 8000);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable — skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // silent
    }
    setVisible(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg(t("newsletter.error"));
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const [supaResult] = await Promise.all([
        arei.subscribeNewsletter(trimmed),
        notifyFormspree({ email: trimmed, source: "newsletter-popup" }),
      ]);
      if (supaResult.ok) {
        setStatus("success");
        try {
          localStorage.setItem(STORAGE_KEY, "subscribed");
        } catch {
          // silent
        }
        setTimeout(() => setVisible(false), 2800);
      } else {
        setStatus("error");
        setErrorMsg(t("newsletter.error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("newsletter.error"));
    }
  }

  if (!visible) return null;

  return (
    <div className="nlp-overlay" role="dialog" aria-modal="true" aria-label={t("newsletterPopup.label")} onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="nlp-card">
        <button className="nlp-close" onClick={dismiss} aria-label={t("newsletterPopup.close")} type="button">
          ×
        </button>
        <div className="nlp-overline">{t("newsletterPopup.overline")}</div>
        <h2 className="nlp-heading">{t("newsletterPopup.heading")}</h2>
        <p className="nlp-desc">
          {t("newsletterPopup.description")}
        </p>
        {status === "success" ? (
          <div className="nlp-success">{t("newsletter.success")}</div>
        ) : (
          <form className="nlp-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="nlp-input"
              placeholder={t("newsletter.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              aria-label={t("newsletter.placeholder")}
              autoFocus
            />
            <button
              type="submit"
              className="nlp-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? t("newsletter.submitting") : <>{t("newsletter.submit")} <span aria-hidden="true">[→]</span></>}
            </button>
          </form>
        )}
        {status === "error" && <div className="nlp-error">{errorMsg}</div>}
        <div className="nlp-fine">{t("newsletter.fine")}</div>
      </div>
    </div>
  );
}
