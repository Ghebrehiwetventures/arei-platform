import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./Rent.css";

export default function Rent() {
  useDocumentMeta("Rent", "Rental listings are not part of the current KazaVerde public launch feed.");
  const navigate = useNavigate();

  return (
    <div className="rent-coming-soon anim-fu delay-1">
      <div className="rent-icon">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h1>Rentals — <em>Not In Scope</em></h1>
      <p>
        The current public launch feed covers Cape Verde buy listings and market data.
        Rental inventory is not part of the current launch scope.
      </p>
      <button className="bp" onClick={() => navigate("/listings")}>BROWSE BUY LISTINGS</button>
    </div>
  );
}
