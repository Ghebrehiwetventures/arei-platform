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

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <p className="kv-m-disclaimer">{t("about.disclosure")}</p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
