import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import "./Rent.css";

export default function Sell() {
  useDocumentMeta("Sell", "Direct seller submissions are not part of the current KazaVerde launch scope.");
  const navigate = useNavigate();

  return (
    <div className="rent-coming-soon anim-fu delay-1">
      <div className="rent-icon">
        <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h1>Seller Submissions — <em>Not In Scope</em></h1>
      <p>
        KazaVerde currently operates as a read-only index of tracked public listings.
        Direct owner submissions are not part of the current launch scope.
      </p>
      <button className="bp" onClick={() => navigate("/listings")}>BROWSE LISTINGS</button>
    </div>
  );
}
