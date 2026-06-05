import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css"; // kv-hero, kv-m-intro, kv-m-section primitives
import "./Policy.css";

export default function Privacy() {
  const { t } = useTranslation();
  const collectList = t("privacy.collectList", { returnObjects: true }) as [string, string][];
  const services = t("privacy.services", { returnObjects: true }) as [string, string, string][];
  useDocumentMeta(
    t("privacy.metaTitle"),
    t("privacy.metaDescription"),
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("privacy.eyebrow")}</div>
          <h1>{t("privacy.title")}</h1>
          <p className="kv-hero-sub">
            {t("privacy.sub")}
          </p>
          <span className="kv-pol-stamp">{t("privacy.updated")}</span>
        </div>
      </header>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.0.0")}</span>
            <h2>{t("privacy.sections.0.1")}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans i18nKey="privacy.sections.0.2" components={{ 1: <strong /> }} />
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.1.0")}</span>
            <h2>{t("privacy.sections.1.1")}</h2>
            <p>
              {t("privacy.sections.1.2")}
            </p>
          </div>
          <ul className="kv-pol-list">
            {collectList.map(([head, body]) => (
              <li key={head}><strong>{head}</strong> {body}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.2.0")}</span>
            <h2>{t("privacy.sections.2.1")}</h2>
          </div>
          <div className="kv-pol-pull">
            {t("privacy.sections.2.2")}
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.3.0")}</span>
            <h2>{t("privacy.sections.3.1")}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans i18nKey="privacy.sections.3.2" components={{ 1: <Link to="/cookie-policy" /> }} />
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.4.0")}</span>
            <h2>{t("privacy.sections.4.1")}</h2>
            <p>
              {t("privacy.sections.4.2")}
            </p>
          </div>
          <ul className="kv-pol-list">
            <li>
              <strong>{services[0][0]}</strong> {services[0][1]}{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {services[0][2]}
              </a>
            </li>
            <li>
              <strong>{services[1][0]}</strong> {services[1][1]}{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {services[1][2]}
              </a>
            </li>
            <li>
              <strong>{services[2][0]}</strong> {services[2][1]}{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {services[2][2]}
              </a>
            </li>
            <li>
              <strong>{services[3][0]}</strong> {services[3][1]}{" "}
              <a
                href="https://www.facebook.com/privacy/policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {services[3][2]}
              </a>
            </li>
            <li>
              <strong>{services[4][0]}</strong> {services[4][1]}{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {services[4][2]}
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.5.0")}</span>
            <h2>{t("privacy.sections.5.1")}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans i18nKey="privacy.sections.5.2" components={{ 1: <a href="mailto:info@africarealestateindex.com" /> }} />
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("privacy.sections.6.0")}</span>
            <h2>{t("privacy.sections.6.1")}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans i18nKey="privacy.sections.6.2" components={{ 1: <a href="mailto:info@africarealestateindex.com" /> }} />
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
