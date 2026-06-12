import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./ReportListing.css";

export type ReportReason =
  | "sold"
  | "price"
  | "duplicate"
  | "photos"
  | "scam"
  | "other";

const REASONS: ReportReason[] = ["sold", "price", "duplicate", "photos", "scam", "other"];

interface Props {
  listingId: string;
}

/** "Report this listing" — trigger link + modal. Submission is a UI stub
    until the listing_reports backend lands; the payload shape below is
    the contract the backend will receive. */
export default function ReportListing({ listingId }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openModal() {
    setReason(null);
    setComment("");
    setEmail("");
    setStatus("idle");
    setOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reason || status === "submitting") return;
    setStatus("submitting");
    void { listingId, reason, comment: comment.trim(), email: email.trim() };
    await new Promise((r) => setTimeout(r, 500));
    setStatus("success");
  }

  return (
    <>
      <button type="button" className="kv-rl-trigger" onClick={openModal}>
        {t("detail.report.trigger")}
      </button>

      {open &&
        createPortal(
          <div
            className="kv-rl-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={t("detail.report.title")}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="kv-rl-card">
              <button
                type="button"
                className="kv-rl-close"
                onClick={() => setOpen(false)}
                aria-label={t("detail.report.close")}
              >
                ×
              </button>

              {status === "success" ? (
                <div className="kv-rl-success">
                  <div className="kv-rl-success-mark" aria-hidden="true">✓</div>
                  <div className="kv-rl-success-title">{t("detail.report.successTitle")}</div>
                  <p className="kv-rl-success-body">{t("detail.report.successBody")}</p>
                  <button type="button" className="kv-rl-back" onClick={() => setOpen(false)}>
                    {t("detail.report.back")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="kv-rl-title">{t("detail.report.title")}</div>
                  <p className="kv-rl-intro">{t("detail.report.intro")}</p>

                  <div className="kv-rl-reasons" role="radiogroup" aria-label={t("detail.report.title")}>
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={reason === r}
                        className={`kv-rl-chip${reason === r ? " is-selected" : ""}`}
                        onClick={() => setReason(r)}
                      >
                        {t(`detail.report.reason_${r}`)}
                      </button>
                    ))}
                  </div>

                  <label className="kv-rl-label" htmlFor="kv-rl-comment">
                    {t("detail.report.detailsLabel")}
                  </label>
                  <textarea
                    id="kv-rl-comment"
                    className="kv-rl-textarea"
                    placeholder={t("detail.report.detailsPlaceholder")}
                    value={comment}
                    maxLength={500}
                    onChange={(e) => setComment(e.target.value)}
                  />

                  <label className="kv-rl-label" htmlFor="kv-rl-email">
                    {t("detail.report.emailLabel")}
                  </label>
                  <input
                    id="kv-rl-email"
                    type="email"
                    className="kv-rl-input"
                    placeholder={t("detail.report.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <button
                    type="submit"
                    className="kv-rl-submit"
                    disabled={!reason || status === "submitting"}
                  >
                    {status === "submitting"
                      ? t("detail.report.submitting")
                      : t("detail.report.submit")}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
