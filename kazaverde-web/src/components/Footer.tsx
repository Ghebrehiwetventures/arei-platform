import { Link } from "react-router-dom";
import "./Footer.css";

/* Footer — four columns at desktop (brand + Index + Resources + Connect),
   matched to the nav surface so every page in the site is reachable
   from the footer. Mobile collapses to a 2-col grid with brand
   spanning both. */
export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="fg">
          <div className="footer-brand">
            <Link className="f-logo" to="/">KAZAVERDE</Link>
            <p>
              A read-only index of public property listings across Cape Verde.
              We aggregate from local agents, clean the data, and publish it
              in one searchable place.
            </p>
            <div className="footer-status">
              <span className="sd" aria-hidden="true" />
              Live · Source-linked index
            </div>
          </div>

          <div className="footer-col">
            <h4>Index</h4>
            <Link to="/listings">All listings</Link>
            <Link to="/market">Market data</Link>
            <Link to="/saved">Shortlist</Link>
          </div>

          <div className="footer-col">
            <h4>Resources</h4>
            <Link to="/blog">Guides &amp; FAQ</Link>
            <Link to="/blog/buying-property-cape-verde-guide">Buying guide</Link>
            <Link to="/market#methodology">Methodology</Link>
            <Link to="/about">About</Link>
          </div>

          <div className="footer-col">
            <h4>Connect</h4>
            <a href="mailto:info@kazaverde.com">Contact</a>
            <a href="https://instagram.com/kazaverde.cv" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://x.com/kazaverdecv" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookie-policy">Cookies</Link>
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
              Powered by Africa Real Estate Index ↗
            </a>
          </div>
          <div className="footer-idx">CV·01</div>
        </div>
      </div>
    </footer>
  );
}
