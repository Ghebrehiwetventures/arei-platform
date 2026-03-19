import { useNavigate } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="ft">
      <div className="fg">
        <div>
          <div className="fb_">KAZA<span>VERDE</span>.COM</div>
          <p className="fdesc">
            Cape Verde's read-only property index. Market truth over marketplace noise.
          </p>
        </div>
        <div className="fc">
          <h4>Discover</h4>
          <span>Latest Listings</span>
          <span>Saved Properties</span>
          <span>Market Data</span>
          <span>Source Links</span>
        </div>
        <div className="fc">
          <h4>Company</h4>
          <a onClick={() => navigate("/about")}>About Us</a>
          <a onClick={() => navigate("/market")}>Market Data</a>
          <a onClick={() => navigate("/blog")}>Blog</a>
          <span>Press</span>
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
