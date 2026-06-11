import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Trans, useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css"; // kv-hero, kv-m-intro, kv-m-section primitives
import "./Policy.css";

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

      {sections.map(([eyebrow, title], i) => (
        <section className="kv-m-section" key={eyebrow}>
          <div className="kv-m-inner">
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
        </section>
      ))}

      <NewsletterCta />
    </div>
  );
}
