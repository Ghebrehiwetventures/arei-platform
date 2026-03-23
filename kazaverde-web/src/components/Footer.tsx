import { Link, useLocation } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return (
      <footer className="ft home-footer">
        <div className="home-footer-top">
          <div>
            <div className="home-footer-logo">AREI</div>
            <p className="home-footer-copy">
              Africa Real Estate Index. A data infrastructure layer for fragmented property markets,
              with live proof in Cape Verde.
            </p>
          </div>
          <div className="home-footer-links">
            <a href="#proof">Proof</a>
            <a href="#model">Business model</a>
            <a href="https://www.kazaverde.com" target="_blank" rel="noreferrer">
              KazaVerde
            </a>
            <a href="mailto:info@kazaverde.com">Email</a>
          </div>
        </div>
        <div className="home-footer-bottom">
          <span>© 2026 Africa Real Estate Index</span>
          <span>Built on the live KazaVerde feed and launch stack.</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="ft">
      <div className="fg">
        <div>
          <Link className="fb_" to="/">KAZA<span>VERDE</span>.COM</Link>
          <p className="fdesc">
            Cape Verde's read-only property index. Market truth over marketplace noise.
          </p>
        </div>
        <div className="fc">
          <h4>Discover</h4>
          <Link to="/listings">Latest Listings</Link>
          <Link to="/saved">Saved Properties</Link>
          <Link to="/market">Market Data</Link>
        </div>
        <div className="fc">
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/blog">Blog</Link>
        </div>
        <div className="fc">
          <h4>Connect</h4>
          <a href="https://instagram.com/kazaverde.cv" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://x.com/kazaverdecv" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
          <a href="mailto:info@kazaverde.com">Email Us</a>
        </div>
      </div>
      <div className="fc_">
        <span>© 2026 Kaza Verde</span>
        <a href="https://www.africarealestateindex.com/" target="_blank" rel="noopener noreferrer">
          Powered by Africa Real Estate Index
        </a>
      </div>
    </footer>
  );
}
