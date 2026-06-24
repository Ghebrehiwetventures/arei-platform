import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useTranslation } from "react-i18next";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css";
import "./Policy.css";

type AboutSection = {
  eyebrow: string;
  heading: string;
  body?: string;
  list?: string[];
};

export default function About() {
  const { t } = useTranslation();
  const sections = t("about.sections", { returnObjects: true }) as AboutSection[];

  useDocumentMeta(t("about.metaTitle"), t("about.metaDescription"));

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("about.eyebrow")}</div>
          <h1>{t("about.title")}</h1>
          <p className="kv-hero-sub">{t("about.sub")}</p>
        </div>
      </header>

      {sections.map((sec) => (
        <section className="kv-m-section" key={sec.eyebrow}>
          <div className="kv-m-inner">
            <div className="kv-m-section-head">
              <span className="kv-l-eyebrow">{sec.eyebrow}</span>
              <h2>{sec.heading}</h2>
            </div>
            {sec.body && <p className="kv-pol-prose">{sec.body}</p>}
            {sec.list && (
              <ul className="kv-pol-list">
                {sec.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}

      {/* Publisher — names AREI and links to the platform home. */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">{t("about.publisherEyebrow")}</span>
            <h2>{t("about.publisherHeading")}</h2>
          </div>
          <p className="kv-pol-prose">
            {t("about.publisherLead")}{" "}
            <a href="https://africarealestateindex.com" target="_blank" rel="noopener noreferrer">
              {t("about.publisherAreiLabel")}
            </a>
            {t("about.publisherTail")}
          </p>
        </div>
      </section>

      {/* From the founder — restored quote + byline. */}
      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-pol-founder">
            <span className="kv-l-eyebrow">{t("about.founderEyebrow")}</span>
            <blockquote className="kv-pol-founder-quote">
              {(t("about.founderQuote", { returnObjects: true }) as string[]).map((p, i, arr) => (
                <p key={p}>{i === 0 ? `"${p}` : i === arr.length - 1 ? `${p}"` : p}</p>
              ))}
            </blockquote>
            <div className="kv-pol-founder-byline">
              <div className="kv-pol-founder-meta">
                <span className="kv-pol-founder-name">{t("about.founderName")}</span>
                <span className="kv-pol-founder-role">{t("about.founderRole")}</span>
                <a
                  className="kv-pol-founder-link"
                  href="https://www.linkedin.com/in/ghebrehiwet"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("about.founderLink")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <p className="kv-m-disclaimer">{t("about.disclosure")}</p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
