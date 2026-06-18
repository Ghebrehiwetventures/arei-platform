import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useLayoutEffect, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import CookieBanner from "./components/CookieBanner";
import NewsletterPopup from "./components/NewsletterPopup";
import GoogleAnalytics from "./components/GoogleAnalytics";
import MetaPixel from "./components/MetaPixel";
import Landing from "./pages/Landing";

// Phase A live: / (landing), /listings (grid), /listing/:id, /saved,
// /market, /market-news, /blog, /blog/:slug. Other routes still redirect to /
// until they're rebuilt in the KV design.
const Listings = lazy(() => import("./pages/Listings"));
const Detail = lazy(() => import("./pages/Detail"));
const Saved = lazy(() => import("./pages/Saved"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Market = lazy(() => import("./pages/Market"));
const MarketNews = lazy(() => import("./pages/MarketNews"));
const MarketUpdates = lazy(() => import("./pages/MarketUpdates"));
// Dev-only internal tool. Gating the dynamic import (not just the route) keeps
// the page out of the production bundle entirely — in a prod build
// import.meta.env.DEV folds to false and Rollup drops the code-split chunk.
const ReviewQueue = import.meta.env.DEV
  ? lazy(() => import("./pages/ReviewQueue"))
  : (() => null);
const BriefingArchive = lazy(() => import("./pages/BriefingArchive"));
const Briefing = lazy(() => import("./pages/Briefing"));
const Rent = lazy(() => import("./pages/Rent"));
const About = lazy(() => import("./pages/About"));
const Agents = lazy(() => import("./pages/Agents"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Terms = lazy(() => import("./pages/Terms"));

/* Back-compat redirect: /briefings/:slug → /market/briefings/:slug,
   preserving the slug param. */
function BriefingSlugRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/market/briefings/${slug ?? ""}`} replace />;
}

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
  const { pathname } = useLocation();
  const isCapturePage = pathname === "/market-updates";

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
          <Route path="/market-news" element={<MarketNews />} />
          <Route path="/market-updates" element={<MarketUpdates />} />
          {/* Dev-only internal tool: its /__kv-review API is served only by the
              vite dev middleware (apply: "serve"), so the route must not ship to
              production. Gated behind import.meta.env.DEV. */}
          {import.meta.env.DEV && (
            <Route path="/review" element={<ReviewQueue />} />
          )}
          <Route path="/news" element={<Navigate to="/market-news" replace />} />
          {/* Canonical: briefings live under Market (they are monthly market
              reports, not a separate product category). */}
          <Route path="/market/briefings" element={<BriefingArchive />} />
          <Route path="/market/briefings/:slug" element={<Briefing />} />
          {/* Back-compat aliases — old top-level routes redirect to /market/briefings */}
          <Route path="/briefings" element={<Navigate to="/market/briefings" replace />} />
          <Route path="/briefings/:slug" element={<BriefingSlugRedirect />} />
          <Route path="/briefing" element={<Navigate to="/market/briefings" replace />} />
          {/* Rent surface offline — redirect to listings. Rent page and data model preserved. */}
          <Route path="/rent" element={<Navigate to="/listings" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/guides" element={<Navigate to="/blog" replace />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/guides/:slug" element={<BlogPost />} />
          <Route path="/shortlist" element={<Navigate to="/saved" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/cookies" element={<Navigate to="/cookie-policy" replace />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-of-use" element={<Navigate to="/terms" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isCapturePage && <NewsletterPopup />}
      <CookieBanner />
      <Footer />
      <GoogleAnalytics />
      <MetaPixel />
      <Analytics />
    </div>
  );
}
