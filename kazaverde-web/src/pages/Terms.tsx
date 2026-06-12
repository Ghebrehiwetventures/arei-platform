import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css"; // kv-hero, kv-m-inner, kv-m-section primitives
import "./Policy.css"; // kv-pol shell + kv-pol-prose
import "./Terms.css"; // single-section flow for the seven clause blocks

export default function Terms() {
  const { t } = useTranslation();
  const sections = t("terms.sections", { returnObjects: true }) as [string, string, string][];
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

      {/* One kv-m-section for the whole document: same rule + alignment as
          every other page, but the clause blocks flow with whitespace instead
          of repeating full-width banded sections. */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          {sections.map(([eyebrow, title], i) => (
            <div className="kv-terms-block" key={eyebrow}>
              <div className="kv-m-section-head">
                <span className="kv-l-eyebrow">{eyebrow}</span>
                <h2>{title}</h2>
              </div>
              <p className="kv-pol-prose">
                <Trans
                  i18nKey={`terms.sections.${i}.2`}
                  components={{ 1: <a href="mailto:info@africarealestateindex.com" /> }}
                />
              </p>
            </div>
          ))}
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
