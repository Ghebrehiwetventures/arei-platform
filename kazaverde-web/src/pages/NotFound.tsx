import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./NotFound.css";

interface Props {
  title?: string;
  message?: string;
}

export default function NotFound({ title, message }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const heading = title ?? t("notFound.title");
  const body =
    message ??
    t("notFound.body");

  useDocumentMeta(heading, body);

  const isListing = pathname.startsWith("/listing/");

  return (
    <div className="nf">
      <div className="nf-icon">
        <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="16" width="64" height="48" rx="6" />
          <path d="M8 32h64" />
          <circle cx="20" cy="24" r="2" fill="currentColor" stroke="none" />
          <circle cx="28" cy="24" r="2" fill="currentColor" stroke="none" />
          <circle cx="36" cy="24" r="2" fill="currentColor" stroke="none" />
          <path d="M30 50l8-8 8 8" />
          <path d="M34 54h12" />
        </svg>
      </div>

      <h1 className="nf-title">{heading}</h1>
      <p className="nf-body">{body}</p>

      <div className="nf-actions">
        {isListing ? (
          <button className="nf-btn nf-primary" onClick={() => navigate("/listings")}>
            {t("common.browseAllListings")}
          </button>
        ) : (
          <button className="nf-btn nf-primary" onClick={() => navigate("/")}>
            {t("notFound.home")}
          </button>
        )}
        <button className="nf-btn nf-secondary" onClick={() => navigate(-1)}>
          {t("notFound.back")}
        </button>
      </div>

      <div className="nf-links">
        <a onClick={() => navigate("/listings")}>{t("common.listings")}</a>
        <span className="nf-dot" />
        <a onClick={() => navigate("/market")}>{t("common.marketData")}</a>
        <span className="nf-dot" />
        <a onClick={() => navigate("/blog")}>{t("common.guides")}</a>
      </div>
    </div>
  );
}
