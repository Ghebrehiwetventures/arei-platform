import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { hasMarketingConsent, onConsentChange } from "../lib/consent";

// Meta (Facebook) Pixel — loaded ONLY after the visitor opts in to marketing
// cookies via the cookie banner, and only in production. The pixel sets Meta
// cookies (_fbp) and shares page-visit events with Meta, so it must never fire
// before consent. Mirrors the consent/route-tracking shape of GoogleAnalytics.
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "990980146866415";
const PIXEL_SCRIPT_ID = "kv-meta-pixel";

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

function ensurePixel(id: string) {
  if (window.fbq) return;

  // Standard Meta Pixel bootstrap: a queueing stub that buffers calls until
  // fbevents.js loads and replaces it with the real implementation.
  const n = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  } as FbqFn;
  n.queue = [];
  n.loaded = true;
  n.version = "2.0";
  n.push = n;
  window.fbq = n;
  window._fbq = window._fbq || n;

  if (!document.getElementById(PIXEL_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = PIXEL_SCRIPT_ID;
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq?.("init", id);
}

export default function MetaPixel() {
  const location = useLocation();
  const [consented, setConsented] = useState(() => hasMarketingConsent());

  useEffect(() => onConsentChange((c) => setConsented(c === "granted")), []);

  useEffect(() => {
    if (!import.meta.env.PROD || !META_PIXEL_ID || !consented) return;
    ensurePixel(META_PIXEL_ID);
    window.fbq?.("track", "PageView");
  }, [consented, location.pathname, location.search]);

  return null;
}
