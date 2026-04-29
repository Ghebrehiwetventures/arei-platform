import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
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
  useDocumentMeta(
    "Cookie Policy — KazaVerde",
    "What cookies and local storage KazaVerde uses and why.",
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">Cookie policy</div>
          <h1>Cookies &amp; local storage.</h1>
          <p className="kv-hero-sub">
            KazaVerde is built to minimise data collection. No advertising
            cookies, no marketing trackers, no third-party analytics cookies.
          </p>
          <span className="kv-pol-stamp">Last updated · 27 March 2026</span>
        </div>
      </header>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Our approach</span>
            <h2>Minimal storage, transparent purpose.</h2>
          </div>
          <p className="kv-pol-prose">
            We use only the storage strictly required to make the site work
            for you. This page lists every browser-side mechanism the site
            touches, what it does, and why.
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">What we use</span>
            <h2>Three storage mechanisms.</h2>
          </div>
          <div className="kv-pol-cards">
            {STORAGE_USES.map((s) => (
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
            <span className="kv-l-eyebrow">What we don't use</span>
            <h2>Everything in the tracking-industry stack.</h2>
          </div>
          <ul className="kv-pol-list">
            {NOT_USED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Managing storage</span>
            <h2>You're in control.</h2>
          </div>
          <p className="kv-pol-prose">
            You can clear localStorage at any time through your browser
            settings. This will remove your saved properties and cookie-banner
            acknowledgement. No account or server-side data is affected.
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">More information</span>
            <h2>Broader data handling.</h2>
          </div>
          <p className="kv-pol-prose">
            For broader data-handling details, see the{" "}
            <Link to="/privacy">Privacy Policy</Link>. Questions? Reach us via
            the <Link to="/contact">contact form</Link>.
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
