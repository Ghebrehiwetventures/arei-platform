import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useLayoutEffect, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import CookieBanner from "./components/CookieBanner";
import GoogleAnalytics from "./components/GoogleAnalytics";
import Landing from "./pages/Landing";

// Phase A live: / (landing), /listings (grid), /listing/:id, /saved,
// /market, /blog, /blog/:slug. Other routes still redirect to /
// until they're rebuilt in the KV design.
const Listings = lazy(() => import("./pages/Listings"));
const Detail = lazy(() => import("./pages/Detail"));
const Saved = lazy(() => import("./pages/Saved"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Market = lazy(() => import("./pages/Market"));
const Rent = lazy(() => import("./pages/Rent"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

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
          <Route path="/" element={<Landing />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listing/:id" element={<Detail />} />
          <Route path="/saved" element={<Saved />} />
          {/* v1 island routes — handled as 301 redirects in vercel.json */}
          <Route path="/listings/sal" element={<Navigate to="/?island=Sal" replace />} />
          <Route path="/listings/boa-vista" element={<Navigate to="/?island=Boa+Vista" replace />} />
          <Route path="/market" element={<Market />} />
          {/* Rent surface offline — redirect to listings. Rent page and data model preserved. */}
          <Route path="/rent" element={<Navigate to="/listings" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <CookieBanner />
      <Footer />
      <GoogleAnalytics />
      <Analytics />
    </div>
  );
}
