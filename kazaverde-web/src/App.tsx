import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useLayoutEffect, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import CookieBanner from "./components/CookieBanner";
import Listings from "./pages/Listings";

// v1: only / (Listings) and /listing/:id (Detail) are user-facing.
// All other routes redirect to / until they're rebuilt in the KV design.
const Detail = lazy(() => import("./pages/Detail"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    // Prevent browser from auto-restoring scroll position on navigation
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

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
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
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
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Listings />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listing/:id" element={<Detail />} />
          <Route path="/saved" element={<Navigate to="/" replace />} />
          {/* v1 redirects — pages not yet rebuilt in KV design */}
          <Route path="/listings/sal" element={<Navigate to="/?island=Sal" replace />} />
          <Route path="/listings/boa-vista" element={<Navigate to="/?island=Boa+Vista" replace />} />
          <Route path="/market" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<Navigate to="/" replace />} />
          <Route path="/blog" element={<Navigate to="/" replace />} />
          <Route path="/blog/:slug" element={<Navigate to="/" replace />} />
          <Route path="/privacy" element={<Navigate to="/" replace />} />
          <Route path="/cookie-policy" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
      <Footer />
    </div>
  );
}