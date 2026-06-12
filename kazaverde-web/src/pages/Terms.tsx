import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css"; // kv-hero, kv-m-inner, kv-m-section primitives
import "./Policy.css"; // kv-pol shell, prose, list, pull
import "./Terms.css"; // sub-clause blocks inside grouped bands

/* Terms groups its seven clauses into four kv-m-section bands so the
   page keeps the same alternating-surface rhythm as Privacy/Cookies
   without seven thin stripes: basics → automated access (core clause
   as pull) → disclaimers (list) → updates & contact. */
export default function Terms() {
  const { t } = useTranslation();
  const sections = t("terms.sections", { returnObjects: true }) as [string, string, string][];
  const [whoWeAre, usingIndex, automated, searchEngines, accuracy, noAdvice, updates] = sections;
  useDocumentMeta(
    t("terms.metaTitle"),
    t("terms.metaDescription"),
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("terms.eyebrow")}</div>
          <h1>{t("terms.title")}</h1>
          <p className="kv-hero-sub">
            {t("terms.sub")}
          </p>
          <span className="kv-pol-stamp">{t("terms.updated")}</span>
        </div>
      </header>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{whoWeAre[0]}</span>
            <h2>{whoWeAre[1]}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans i18nKey="terms.sections.0.2" />
          </p>
          <div className="kv-terms-sub">
            <span className="kv-l-eyebrow">{usingIndex[0]}</span>
            <h3>{usingIndex[1]}</h3>
            <p className="kv-pol-prose">
              <Trans i18nKey="terms.sections.1.2" />
            </p>
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{automated[0]}</span>
            <h2>{automated[1]}</h2>
          </div>
          <div className="kv-pol-pull">
            <Trans
              i18nKey="terms.sections.2.2"
              components={{ 1: <a href="mailto:info@africarealestateindex.com" /> }}
            />
          </div>
          <div className="kv-terms-sub">
            <span className="kv-l-eyebrow">{searchEngines[0]}</span>
            <h3>{searchEngines[1]}</h3>
            <p className="kv-pol-prose">
              <Trans i18nKey="terms.sections.3.2" />
            </p>
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("terms.disclaimerEyebrow")}</span>
            <h2>{t("terms.disclaimerTitle")}</h2>
          </div>
          <ul className="kv-pol-list">
            <li><strong>{accuracy[1]}</strong> {accuracy[2]}</li>
            <li><strong>{noAdvice[1]}</strong> {noAdvice[2]}</li>
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{updates[0]}</span>
            <h2>{updates[1]}</h2>
          </div>
          <p className="kv-pol-prose">
            <Trans
              i18nKey="terms.sections.6.2"
              components={{ 1: <a href="mailto:info@africarealestateindex.com" /> }}
            />
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
