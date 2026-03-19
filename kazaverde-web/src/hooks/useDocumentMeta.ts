import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_DESCRIPTION =
  "Cape Verde's read-only property index. Every island, every listing, one source-linked view.";
const SITE_NAME = "KazaVerde";
const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://kazaverde.com");

function setMeta(name: string, content: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useDocumentMeta(
  title: string,
  description: string = DEFAULT_DESCRIPTION,
  options?: { image?: string; url?: string }
) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", SITE_NAME, true);

    const canonicalUrl = options?.url ?? `${SITE_URL}${pathname}`;
    setCanonical(canonicalUrl);
    if (options?.url) {
      setMeta("og:url", options.url, true);
    } else {
      setMeta("og:url", canonicalUrl, true);
    }
    if (options?.image) {
      setMeta("og:image", options.image, true);
    }

    return () => {
      document.title = `${SITE_NAME} — Cape Verde Real Estate`;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("og:title", `${SITE_NAME} — Cape Verde Real Estate`, true);
      setMeta("og:description", DEFAULT_DESCRIPTION, true);
      setMeta("og:image", "", true);
      setMeta("og:url", "", true);
      setCanonical(SITE_URL);
    };
  }, [title, description, pathname, options?.image, options?.url]);
}
