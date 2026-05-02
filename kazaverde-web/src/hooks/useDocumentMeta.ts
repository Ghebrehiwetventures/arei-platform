import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_DESCRIPTION =
  "Cape Verde's read-only property index. Every island, every listing, one source-linked view.";
const SITE_NAME = "KazaVerde";
const SITE_TAGLINE = "Cape Verde Real Estate Index";
const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://kazaverde.com");

/* Default social preview image. Lives in /public so it's served from the
   site root. Swap the file (1200x630 PNG/JPG) without touching this code.
   Per-page images can still be passed via options.image. */
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface DocumentMetaOptions {
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

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

function removeMeta(name: string, isProperty = false) {
  const attr = isProperty ? "property" : "name";
  document.querySelectorAll(`meta[${attr}="${name}"]`).forEach((el) => el.remove());
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
  options?: DocumentMetaOptions
) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    const image = options?.image ?? DEFAULT_OG_IMAGE;
    const canonicalUrl = options?.url ?? `${SITE_URL}${pathname}`;
    const ogType = options?.type ?? "website";

    setMeta("description", description);

    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", image, true);

    if (ogType === "article") {
      if (options?.publishedTime) setMeta("article:published_time", options.publishedTime, true);
      else removeMeta("article:published_time", true);

      if (options?.modifiedTime) setMeta("article:modified_time", options.modifiedTime, true);
      else removeMeta("article:modified_time", true);

      if (options?.author) setMeta("article:author", options.author, true);
      else removeMeta("article:author", true);
    } else {
      removeMeta("article:published_time", true);
      removeMeta("article:modified_time", true);
      removeMeta("article:author", true);
    }

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", image);

    setCanonical(canonicalUrl);

    return () => {
      document.title = `${SITE_NAME} — ${SITE_TAGLINE}`;
      setMeta("description", DEFAULT_DESCRIPTION);
      setMeta("og:title", `${SITE_NAME} — ${SITE_TAGLINE}`, true);
      setMeta("og:description", DEFAULT_DESCRIPTION, true);
      setMeta("og:type", "website", true);
      setMeta("og:image", DEFAULT_OG_IMAGE, true);
      setMeta("og:url", SITE_URL, true);
      removeMeta("article:published_time", true);
      removeMeta("article:modified_time", true);
      removeMeta("article:author", true);
      setMeta("twitter:title", `${SITE_NAME} — ${SITE_TAGLINE}`);
      setMeta("twitter:description", DEFAULT_DESCRIPTION);
      setMeta("twitter:image", DEFAULT_OG_IMAGE);
      setCanonical(SITE_URL);
    };
  }, [
    title,
    description,
    pathname,
    options?.image,
    options?.url,
    options?.type,
    options?.publishedTime,
    options?.modifiedTime,
    options?.author,
  ]);
}
