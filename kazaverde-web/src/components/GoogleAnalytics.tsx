import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const GA4_SCRIPT_ID = "kv-ga4-script";
let ga4Initialized = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGoogleAnalytics(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer?.push(arguments);
    };

  if (!document.getElementById(GA4_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GA4_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }
}

export default function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.PROD || !GA4_MEASUREMENT_ID) return;

    ensureGoogleAnalytics(GA4_MEASUREMENT_ID);
    if (!ga4Initialized) {
      window.gtag?.("js", new Date());
      ga4Initialized = true;
    }
    window.gtag?.("config", GA4_MEASUREMENT_ID, {
      page_path: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search]);

  return null;
}
