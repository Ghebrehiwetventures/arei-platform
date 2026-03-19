import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSaved } from "../hooks/useSaved";
import "./Navbar.css";

export default function Navbar() {
  const { count } = useSaved();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="nav anim-fd">
      <a className="logo" onClick={() => navigate("/")} role="button" tabIndex={0}>
        KAZA<span>VERDE</span>
      </a>

      <div className="nc hide-mobile">
        <NavLink to="/listings" className={({ isActive }) => (isActive ? "on" : "")}>BUY</NavLink>
        <NavLink to="/market" className={({ isActive }) => (isActive ? "on" : "")}>MARKET DATA</NavLink>
        <NavLink to="/blog" className={({ isActive }) => (isActive ? "on" : "")}>BLOG</NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? "on" : "")}>ABOUT</NavLink>
      </div>

      <button
        type="button"
        className="nav-hamburger hide-desktop"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" fill="none"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>

      <div className={`nc-mobile${menuOpen ? " open" : ""}`}>
        <NavLink to="/listings" className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>BUY</NavLink>
        <NavLink to="/market" className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>MARKET DATA</NavLink>
        <NavLink to="/blog" className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>BLOG</NavLink>
        <NavLink to="/about" className={({ isActive }) => (isActive ? "on" : "")} onClick={closeMenu}>ABOUT</NavLink>
        <NavLink to="/saved" className={({ isActive }) => `nav-saved-mobile${isActive ? " on" : ""}`} onClick={closeMenu}>
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          SAVED
          {count > 0 && <span className="saved-badge">{count}</span>}
        </NavLink>
      </div>

      <div className="nr">
        <NavLink to="/saved" className="nl nav-saved">
          <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          SAVED
          <span className={`saved-badge${count === 0 ? " hide" : ""}`}>{count}</span>
        </NavLink>
      </div>
    </nav>
  );
}
