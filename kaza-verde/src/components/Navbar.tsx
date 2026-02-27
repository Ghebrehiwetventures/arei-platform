import { NavLink, useNavigate } from "react-router-dom";
import { useSaved } from "../hooks/useSaved";
import "./Navbar.css";

export default function Navbar() {
  const { count } = useSaved();
  const navigate = useNavigate();

  return (
    <nav className="nav anim-fd">
      <a className="logo" onClick={() => navigate("/")} role="button" tabIndex={0}>
        KAZA<span>VERDE</span>
      </a>

      <div className="nc hide-mobile">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "on" : "")}>BUY</NavLink>
        <NavLink to="/rent" className={({ isActive }) => (isActive ? "on" : "")}>RENT</NavLink>
        <NavLink to="/listings" className={({ isActive }) => (isActive ? "on" : "")}>SELL</NavLink>
        <NavLink to="/market" className={({ isActive }) => (isActive ? "on" : "")}>MARKET DATA</NavLink>
        <NavLink to="/blog" className={({ isActive }) => (isActive ? "on" : "")}>BLOG</NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? "on" : "")}>ABOUT</NavLink>
      </div>

      <div className="nr">
        <NavLink to="/saved" className="nl nav-saved">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          SAVED
          <span className={`saved-badge${count === 0 ? " hide" : ""}`}>{count}</span>
        </NavLink>
        <button className="bp" onClick={() => navigate("/listings")}>LIST PROPERTY</button>
      </div>
    </nav>
  );
}
