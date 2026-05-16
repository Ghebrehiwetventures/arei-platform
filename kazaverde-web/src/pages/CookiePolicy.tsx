import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css";
import "./Policy.css";

const STORAGE_USES = [
  {
    name: "Vercel Web Analytics",
    desc: "Privacy-focused, cookieless analytics. Records anonymous page views only — no cookies, no personal data.",
  },
  {
    name: "Saved Properties",
    desc: "Uses browser localStorage to remember which listings you've shortlisted. Never leaves your device.",
  },
  {
    name: "Cookie Consent",
    desc: "Uses localStorage to remember whether you've acknowledged this cookie notice, so it doesn't show again.",
  },
];

const NOT_USED = [
  "Advertising or retargeting cookies",
  "Third-party tracking pixels",
  "Social media tracking cookies",
  "Cross-site tracking of any kind",
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function CookiePolicy() {
  const { t } = useTranslation();
  const storageUses = (t("cookies.uses", { returnObjects: true }) as [string, string][])
    .map(([name, desc]) => ({ name, desc }));
  const notUsed = t("cookies.notUsed", { returnObjects: true }) as string[];

  useDocumentMeta(
    t("cookies.metaTitle"),
    t("cookies.metaDescription"),
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("cookies.eyebrow")}</div>
          <h1>{t("cookies.title")}</h1>
          <p className="kv-hero-sub">
            {t("cookies.sub")}
          </p>
          <span className="kv-pol-stamp">{t("cookies.updated")}</span>
        </div>
      </header>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("cookies.approachEyebrow")}</span>
            <h2>{t("cookies.approachTitle")}</h2>
          </div>
          <p className="kv-pol-prose">
            {t("cookies.approachBody")}
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("cookies.useEyebrow")}</span>
            <h2>{t("cookies.useTitle")}</h2>
          </div>
          <div className="kv-pol-cards">
            {storageUses.map((s) => (
              <div className="kv-pol-card" key={s.name}>
                <div className="kv-pol-card-head">
                  <CheckIcon />
                  {s.name}
                </div>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("cookies.notUseEyebrow")}</span>
            <h2>{t("cookies.notUseTitle")}</h2>
          </div>
          <ul className="kv-pol-list">
            {notUsed.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("cookies.manageEyebrow")}</span>
            <h2>{t("cookies.manageTitle")}</h2>
          </div>
          <p className="kv-pol-prose">
            {t("cookies.manageBody")}
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("cookies.moreEyebrow")}</span>
            <h2>{t("cookies.moreTitle")}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans
              i18nKey="cookies.moreBody"
              components={{
                1: <Link to="/privacy" />,
                3: <a href="mailto:info@africarealestateindex.com" />,
              }}
            />
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
