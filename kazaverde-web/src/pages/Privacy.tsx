import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css"; // kv-hero, kv-m-intro, kv-m-section primitives
import "./Policy.css";

export default function Privacy() {
  useDocumentMeta(
    "Privacy Policy — KazaVerde",
    "How KazaVerde handles your data, what we collect, and your rights.",
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">Privacy policy</div>
          <h1>How we handle your data.</h1>
          <p className="kv-hero-sub">
            What we collect, what we don't, and how to reach us if you want
            something removed. KazaVerde is a read-only index — we collect
            very little.
          </p>
          <span className="kv-pol-stamp">Last updated · 27 March 2026</span>
        </div>
      </header>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Who we are</span>
            <h2>KazaVerde, operated under Africa Real Estate Index.</h2>
          </div>
          <p className="kv-pol-prose">
            KazaVerde (<strong>kazaverde.com</strong>) is a read-only property
            index for Cape Verde, operated as part of Africa Real Estate Index
            (AREI). This policy explains what data we collect, why we collect
            it, and how we protect it.
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">What we collect</span>
            <h2>Three things, all minimal.</h2>
            <p>
              We don't run advertising, retargeting, or personal profiling.
              The list below is the full set of data the site interacts with.
            </p>
          </div>
          <ul className="kv-pol-list">
            <li>
              <strong>Analytics data.</strong> Vercel Web Analytics records
              anonymous page views — URL, referrer, browser, device — without
              cookies or any personally identifiable information.
            </li>
            <li>
              <strong>Newsletter email.</strong> If you subscribe, we store
              your email address to send periodic market updates. We don't
              share it with third parties. Unsubscribe any time.
            </li>
            <li>
              <strong>Saved properties.</strong> If you shortlist listings,
              the IDs are kept in your browser's localStorage. They never
              leave your device.
            </li>
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">What we don't collect</span>
            <h2>Everything else.</h2>
          </div>
          <div className="kv-pol-pull">
            <strong>No names, phone numbers, addresses, or payment data.</strong>{" "}
            No advertising trackers. We do not sell or share data with
            advertisers, brokers, or marketing networks.
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Cookies</span>
            <h2>Almost none.</h2>
          </div>
          <p className="kv-pol-prose">
            KazaVerde uses minimal browser storage. Vercel Web Analytics is
            cookieless. The only persistent storage is localStorage for your
            saved properties and cookie-banner acknowledgement. For the full
            breakdown, see the{" "}
            <Link to="/cookie-policy">Cookie Policy</Link>.
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Third-party services</span>
            <h2>Who else touches your request.</h2>
            <p>
              KazaVerde is a small read-only site, but a request to it
              involves a handful of upstream providers. Each has its own
              privacy policy — links below.
            </p>
          </div>
          <ul className="kv-pol-list">
            <li>
              <strong>Vercel.</strong> Hosts the site and provides anonymous
              analytics.{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy policy ↗
              </a>
            </li>
            <li>
              <strong>Supabase.</strong> Stores newsletter subscriptions and
              the listings index.{" "}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy policy ↗
              </a>
            </li>
            <li>
              <strong>Google Fonts.</strong> Serves the typefaces used on the
              site. Font requests can transmit your IP address to Google.{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy policy ↗
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Your rights</span>
            <h2>Removal on request.</h2>
          </div>
          <p className="kv-pol-prose">
            You can request deletion of your newsletter subscription at any
            time via our <Link to="/contact?topic=unsubscribe">contact form</Link>. Since
            we don't collect personal data beyond newsletter emails, there is
            no additional data to access or delete.
          </p>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Updates &amp; contact</span>
            <h2>Material changes get a new date.</h2>
          </div>
          <p className="kv-pol-prose">
            We may update this policy as the product evolves. Material
            changes are noted with a fresh date at the top of this page.
            Questions? Reach us via the <Link to="/contact">contact form</Link>.
          </p>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
