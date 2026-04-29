import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useSaved } from "../hooks/useSaved";
import "./Navbar.css";

/* Six-link nav — Listings · Rent · Market · Guides · Shortlist · Contact.
   Mobile menu is the cv-listing.html drawer pattern: 3-span burger
   that morphs to X on open, full-screen black panel that slides in
   from the right (translateX 100% → 0). Body scroll lock via the
   .nav-locked class on <body>. Drawer rendered to body via portal
   so it escapes the sticky nav's stacking context. */
export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useSaved();

  const closeMenu = () => setMenuOpen(false);

  // Lock body scroll while drawer is open (matches cv-listing).
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("nav-locked");
      return () => document.body.classList.remove("nav-locked");
    }
  }, [menuOpen]);

  const links = [
    { to: "/listings", label: "Listings" },
    { to: "/rent", label: "Rent" },
    { to: "/market", label: "Market" },
    { to: "/blog", label: "Guides" },
    { to: "/saved", label: count > 0 ? `Shortlist · ${count}` : "Shortlist" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <nav className="nav anim-fd">
      <div className="nav-inner">
        <a className="logo" onClick={() => navigate("/")} role="button" tabIndex={0}>
          KazaVerde
        </a>

        <div className="nav-links hide-mobile">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-a${isActive ? " on" : ""}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          className={`nav-burger hide-desktop${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span></span><span></span><span></span>
        </button>
      </div>

      {/* Drawer — rendered to body via portal so .nav's sticky+z-index
          stacking context can't trap the overlay. */}
      {createPortal(
        <div className={`nav-drawer${menuOpen ? " open" : ""}`} aria-hidden={!menuOpen}>
          {/* Explicit X close — matches cv-listing.html drawer.
              The morphing burger above stays clickable too, but this
              gives users an obvious in-drawer escape they expect. */}
          <button
            type="button"
            className="nav-drawer-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <span aria-hidden="true">×</span>
          </button>

          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-drawer-link${isActive ? " on" : ""}`}
              onClick={closeMenu}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/listings" onClick={closeMenu} className="nav-drawer-cta">
            All listings →
          </NavLink>
        </div>,
        document.body,
      )}
    </nav>
  );
}
