import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import NewsletterCta from "../components/NewsletterCta";
import "./About.css";

export default function CookiePolicy() {
  useDocumentMeta("Cookie Policy", "What cookies and local storage KazaVerde uses and why.");

  return (
    <>
      <section className="ah anim-fu delay-1">
        <div className="ov">Cookie Policy</div>
        <h1>Cookies &amp; <em>local storage</em></h1>
        <p>Last updated: 27 March 2026</p>
      </section>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.15s" }}>
        <h3>Our Approach</h3>
        <p className="about-body">
          KazaVerde is designed to minimize data collection. We do not use advertising cookies,
          marketing trackers, or third-party analytics cookies. This page explains what browser
          storage the site does use.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.20s" }}>
        <h3>What We Use</h3>
        <div className="badge-grid">
          <div className="badge-card">
            <div className="badge-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <strong>Vercel Web Analytics</strong>
            </div>
            <p>
              Privacy-focused, cookieless analytics. Collects anonymous page view data only.
              No cookies set. No personal data collected.
            </p>
          </div>
          <div className="badge-card">
            <div className="badge-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <strong>Saved Properties</strong>
            </div>
            <p>
              Uses browser localStorage to remember which listings you have saved. This data
              never leaves your device.
            </p>
          </div>
          <div className="badge-card">
            <div className="badge-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <strong>Cookie Consent</strong>
            </div>
            <p>
              Uses localStorage to remember whether you have acknowledged this cookie notice,
              so we do not show it again.
            </p>
          </div>
        </div>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.25s" }}>
        <h3>What We Do Not Use</h3>
        <ul className="about-list">
          <li><span className="dot" />Advertising or retargeting cookies</li>
          <li><span className="dot" />Third-party tracking pixels</li>
          <li><span className="dot" />Social media tracking cookies</li>
          <li><span className="dot" />Cross-site tracking of any kind</li>
        </ul>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.30s" }}>
        <h3>Managing Storage</h3>
        <p className="about-body">
          You can clear localStorage at any time through your browser settings. This will remove your
          saved properties and cookie consent preference. No account or server-side data will be affected.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.35s" }}>
        <h3>More Information</h3>
        <p className="about-body">
          For broader data handling details, see our{" "}
          <Link to="/privacy" style={{ color: "var(--ac)" }}>Privacy Policy</Link>.
          Questions? Email{" "}
          <a href="mailto:info@kazaverde.com" style={{ color: "var(--ac)" }}>info@kazaverde.com</a>.
        </p>
      </div>

      <NewsletterCta />
    </>
  );
}
