import { Routes, Route, useLocation } from "react-router-dom";
import { useLayoutEffect, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import CookieBanner from "./components/CookieBanner";

const Listings = lazy(() => import("./pages/Listings"));
const IslandLanding = lazy(() => import("./pages/IslandLanding"));
const Detail = lazy(() => import("./pages/Detail"));
const Market = lazy(() => import("./pages/Market"));
const Saved = lazy(() => import("./pages/Saved"));
const About = lazy(() => import("./pages/About"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
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
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/sal" element={<IslandLanding island="Sal" />} />
          <Route path="/listings/boa-vista" element={<IslandLanding island="Boa Vista" />} />
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
      </Suspense>
      <CookieBanner />
      <Footer />
    </div>
  );
}