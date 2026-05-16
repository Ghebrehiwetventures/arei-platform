import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSaved } from "../hooks/useSaved";
import DLayersMark from "./DLayersMark";
import LanguageToggle from "./LanguageToggle";
import "./Navbar.css";

/* Five-link nav — Listings · Market · News · Guides · Shortlist.
   Mobile menu is the cv-listing.html drawer pattern: 3-span burger
   that morphs to X on open, full-screen black panel that slides in
   from the right (translateX 100% → 0). Body scroll lock via the
   .nav-locked class on <body>. Drawer rendered to body via portal
   so it escapes the sticky nav's stacking context. */
export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    { to: "/listings", label: t("common.listings") },
    { to: "/market", label: t("common.market") },
    { to: "/market-news", label: t("common.news") },
    { to: "/blog", label: t("common.guides") },
    { to: "/saved", label: count > 0 ? `${t("common.shortlist")} · ${count}` : t("common.shortlist") },
  ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <a
          className="logo lk-compact lk-nav"
          onClick={() => navigate("/")}
          role="button"
          tabIndex={0}
          aria-label={t("nav.homeAria")}
        >
          <DLayersMark size={20} />
          <span className="lk-text">
            Cape Verde<span className="lk-desc">Real Estate Index</span>
          </span>
          <span className="lk-text-mobile" aria-hidden="true">
            <span className="lk-m1">Cape Verde</span>
            <span className="lk-m2">Real Estate</span>
            <span className="lk-m3">Index</span>
          </span>
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

        <div className="hide-mobile">
          <LanguageToggle />
        </div>

        <button
          type="button"
          className={`nav-burger hide-desktop${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
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
            aria-label={t("nav.closeMenu")}
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
          <LanguageToggle />
          <NavLink to="/listings" onClick={closeMenu} className="nav-drawer-cta">
            {t("nav.allListingsCta")}
          </NavLink>
        </div>,
        document.body,
      )}
    </nav>
  );
}
