import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./NewsletterCta.css";

interface Props {
  overline?: string;
  heading?: React.ReactNode;
  description?: string;
}

export default function NewsletterCta({
  overline,
  heading,
  description,
}: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
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
        notifyFormspree({ email: trimmed, source: "newsletter" }),
      ]);
      if (supaResult.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(t("newsletter.error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("newsletter.error"));
    }
  };

  return (
    <div className="nl-cta anim-fu delay-4">
      <div className="nl-cta-inner">
        <div className="nl-overline">{overline ?? t("newsletter.eyebrow")}</div>
        <h2>{heading ?? t("newsletter.title")}</h2>
        <p>{description ?? t("newsletter.description")}</p>
        {status === "success" ? (
          <div className="nl-success">{t("newsletter.success")}</div>
        ) : (
          <form className="nl-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="nl-input"
              placeholder={t("newsletter.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              aria-label={t("newsletter.placeholder")}
            />
            <button
              type="submit"
              className="nl-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? t("newsletter.submitting") : <>{t("newsletter.submit")} <span aria-hidden="true">[→]</span></>}
            </button>
          </form>
        )}
        {status === "error" && <div className="nl-error">{errorMsg}</div>}
        <div className="nl-fine">
          {t("newsletter.fine")}
        </div>
      </div>
    </div>
  );
}
