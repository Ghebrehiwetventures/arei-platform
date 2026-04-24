import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="fg">
          <div className="footer-brand">
            <Link className="f-logo" to="/">KAZAVERDE</Link>
            <p>
              The Cape Verde Real Estate Index. We aggregate public property listings from local agents, clean the data, and publish it in one searchable place.
            </p>
            <div className="footer-status">
              <span className="sd" aria-hidden="true" />
              Live · Source-linked index
            </div>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/">All listings</Link>
            <a href="https://www.africarealestateindex.com/" target="_blank" rel="noopener noreferrer">AREI</a>
            <a href="mailto:info@kazaverde.com">Contact</a>
          </div>
          <div className="footer-col">
            <h4>Socials</h4>
            <a href="https://instagram.com/kazaverde.cv" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://x.com/kazaverdecv" target="_blank" rel="noopener noreferrer">X / Twitter</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Kaza Verde · An AREI product</div>
          <div className="footer-idx">CV·01</div>
        </div>
      </div>
    </footer>
  );
}
