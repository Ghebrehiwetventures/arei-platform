import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DLayersMark from "./DLayersMark";
import "./Footer.css";

/* Footer — landing-style groups (brand + Explore + Resources + Socials),
   matched to the nav surface so every page in the site is reachable
   from the footer. Mobile collapses to a 2-col grid with brand
   spanning both. */
export default function Footer() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");

  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="fg">
          <div className="footer-brand">
            <Link className="f-logo lk-compact" to="/" aria-label="Cape Verde Real Estate Index">
              <DLayersMark size={28} />
              <span>Cape Verde<span className="lk-desc">Real Estate Index</span></span>
            </Link>
            <p>
              {t("footer.description")}
            </p>
            <div className="footer-status">
              <span className="sd" aria-hidden="true" />
              {isPt ? "Em direto" : "Live"} · {t("common.sourceLinkedIndex")}
            </div>
          </div>

          <div className="footer-col">
            <h4>{t("footer.index")}</h4>
            <Link to="/listings">{t("common.allListings")}</Link>
            <Link to="/market">{t("common.marketData")}</Link>
            <Link to="/agents">Agents</Link>
            <Link to="/saved">{t("common.shortlist")}</Link>
            <a href="mailto:info@africarealestateindex.com">{t("common.contact")}</a>
          </div>

          <div className="footer-col">
            <h4>{t("footer.follow")}</h4>
            <a href="https://www.linkedin.com/company/africa-real-estate-index/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://x.com/arei_data" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            <a href="https://www.instagram.com/capeverderealestateindex" target="_blank" rel="noopener noreferrer">Instagram</a>
          </div>

          <div className="footer-col">
            <h4>{t("footer.resources")}</h4>
            <Link to="/blog/buying-property-cape-verde-guide">{t("footer.buyingGuide")}</Link>
            <Link to="/blog">{t("footer.guidesFaq")}</Link>
            <Link to="/market-news">{t("common.news")}</Link>
            <Link to="/market#methodology">{t("footer.methodology")}</Link>
            <Link to="/about">{t("common.about")}</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">
            © 2026 ·{" "}
            <a
              className="footer-poweredby"
              href="https://www.africarealestateindex.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("common.poweredBy")} ↗
            </a>
          </div>
          <div className="footer-legal">
            <Link to="/privacy">{t("common.privacy")}</Link>
            <Link to="/cookie-policy">{t("common.cookies")}</Link>
          </div>
          <div className="footer-idx">CV·01</div>
        </div>
      </div>
    </footer>
  );
}
