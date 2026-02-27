import { useNavigate } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import PropertyCard from "../components/PropertyCard";
import { useSaved } from "../hooks/useSaved";
import { DEMO_LISTINGS } from "../lib/demo-data";
import "./Saved.css";

export default function Saved() {
  useDocumentMeta("Saved Properties", "Your saved property listings.");
  const navigate = useNavigate();
  const { saved } = useSaved();
  const listings = DEMO_LISTINGS.filter((l) => saved.includes(l.id));

  return (
    <>
      <div className="saved-header anim-fu delay-1">
        <h1>Saved <em>Properties</em></h1>
        <p>Properties you've bookmarked are stored locally in your browser.</p>
      </div>

      <div className="sync-banner anim-fu delay-15">
        <div className="sync-banner-left">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <div className="sync-text">
            <strong>Sign in to sync across devices</strong>
            <span>Your saved listings currently only exist in this browser.</span>
          </div>
        </div>
        <button className="sync-btn">SIGN IN TO SYNC</button>
      </div>

      {listings.length > 0 ? (
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {listings.map((l, i) => (
            <PropertyCard key={l.id} listing={l} index={i} />
          ))}
        </div>
      ) : (
        <div className="saved-empty anim-fu delay-2">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3>No saved properties yet</h3>
          <p>Click the bookmark icon on any listing to save it here. No account required.</p>
          <button className="bp" onClick={() => navigate("/listings")}>BROWSE PROPERTIES</button>
        </div>
      )}
    </>
  );
}
