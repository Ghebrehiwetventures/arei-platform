import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Link } from "react-router-dom";
import NewsletterCta from "../components/NewsletterCta";
import "./About.css";

export default function Privacy() {
  useDocumentMeta("Privacy Policy", "How KazaVerde handles your data, what we collect, and your rights.");

  return (
    <>
      <section className="ah anim-fu delay-1">
        <div className="ov">Privacy Policy</div>
        <h1>How we handle <em>your data</em></h1>
        <p>Last updated: 27 March 2026</p>
      </section>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.15s" }}>
        <h3>Who We Are</h3>
        <p className="about-body">
          KazaVerde (<strong>kazaverde.com</strong>) is a read-only property index for Cape Verde,
          operated as part of Africa Real Estate Index (AREI). This policy explains what data we collect,
          why we collect it, and how we protect it.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.20s" }}>
        <h3>What We Collect</h3>
        <ul className="about-list">
          <li>
            <span className="dot" />
            <div>
              <strong>Analytics data.</strong> We use Vercel Web Analytics to understand how visitors use the site.
              This collects anonymous page view data including page URL, referrer, browser type, operating system,
              and device type. No cookies are used for analytics. No personally identifiable information is collected.
            </div>
          </li>
          <li>
            <span className="dot" />
            <div>
              <strong>Newsletter email.</strong> If you subscribe to our newsletter, we store your email address
              to send you periodic market updates. We do not share your email with third parties. You can
              unsubscribe at any time.
            </div>
          </li>
          <li>
            <span className="dot" />
            <div>
              <strong>Saved properties.</strong> If you save listings, this data is stored locally in your browser
              using localStorage. We do not transmit or store your saved properties on our servers.
            </div>
          </li>
        </ul>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.25s" }}>
        <h3>What We Do Not Collect</h3>
        <p className="about-body">
          We do not collect names, phone numbers, physical addresses, payment information, or any other
          personal data beyond what is listed above. We do not use advertising trackers. We do not sell
          or share data with advertisers.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.30s" }}>
        <h3>Cookies</h3>
        <p className="about-body">
          KazaVerde uses minimal cookies. Vercel Web Analytics is privacy-focused and does not use cookies.
          The only storage used is browser localStorage for saved property preferences. For more detail, see
          our <Link to="/cookie-policy" style={{ color: "var(--ac)" }}>Cookie Policy</Link>.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.35s" }}>
        <h3>Third-Party Services</h3>
        <ul className="about-list">
          <li>
            <span className="dot" />
            <div>
              <strong>Vercel.</strong> Hosts the website and provides anonymous analytics.
              See <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ac)" }}>Vercel's privacy policy</a>.
            </div>
          </li>
          <li>
            <span className="dot" />
            <div>
              <strong>Supabase.</strong> Stores newsletter subscriptions.
              See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ac)" }}>Supabase's privacy policy</a>.
            </div>
          </li>
          <li>
            <span className="dot" />
            <div>
              <strong>Google Fonts.</strong> Serves typefaces used on the site. Font requests may transmit
              your IP address to Google.
              See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ac)" }}>Google's privacy policy</a>.
            </div>
          </li>
        </ul>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.40s" }}>
        <h3>Your Rights</h3>
        <p className="about-body">
          You can request deletion of your newsletter subscription at any time by emailing{" "}
          <a href="mailto:info@kazaverde.com" style={{ color: "var(--ac)" }}>info@kazaverde.com</a>.
          Since we do not collect personal data beyond newsletter emails, there is no additional data to
          request access to or delete.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.45s" }}>
        <h3>Changes to This Policy</h3>
        <p className="about-body">
          We may update this policy as the product evolves. Material changes will be noted with an updated
          date at the top of this page.
        </p>
      </div>

      <div className="mi-section anim-fu" style={{ animationDelay: "0.50s" }}>
        <h3>Contact</h3>
        <p className="about-body">
          Questions about this policy? Email us at{" "}
          <a href="mailto:info@kazaverde.com" style={{ color: "var(--ac)" }}>info@kazaverde.com</a>.
        </p>
      </div>

      <NewsletterCta />
    </>
  );
}
