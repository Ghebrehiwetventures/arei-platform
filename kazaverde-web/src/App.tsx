import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Detail from "./pages/Detail";
import Market from "./pages/Market";
import Saved from "./pages/Saved";
import About from "./pages/About";
import BlogList from "./pages/BlogList";
import BlogPost from "./pages/BlogPost";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import CookiePolicy from "./pages/CookiePolicy";
import CookieBanner from "./components/CookieBanner";

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Footer and nav stay mounted across routes, so blur any focused shell link
    // before forcing scroll restoration. Otherwise some browsers keep the
    // focused footer link in view after navigation.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const id = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="ctn">
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/listings/sal" element={<Navigate to="/listings?island=Sal" replace />} />
        <Route path="/listings/boa-vista" element={<Navigate to="/listings?island=Boa%20Vista" replace />} />
        <Route path="/listing/:id" element={<Detail />} />
        <Route path="/market" element={<Market />} />
        <Route path="/saved" element={<Saved />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <CookieBanner />
      <Footer />
    </div>
  );
}