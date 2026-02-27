import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./Rent.css";

export default function Rent() {
  useDocumentMeta("Rent", "Rental listings in Cape Verde — coming soon.");
  const navigate = useNavigate();

  return (
    <div className="rent-coming-soon anim-fu delay-1">
      <div className="rent-icon">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h1>Rent — <em>Coming Soon</em></h1>
      <p>
        We're working on adding rental listings to the KazaVerde index.
        In the meantime, explore our buy listings.
      </p>
      <button className="bp" onClick={() => navigate("/listings")}>BROWSE BUY LISTINGS</button>
    </div>
  );
}
