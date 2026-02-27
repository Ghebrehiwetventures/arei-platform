import { useEffect } from "react";

const DEFAULT_DESCRIPTION =
  "Cape Verde's real estate aggregator. Every island, every listing, one index.";
const SITE_NAME = "KazaVerde";

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

export function useDocumentMeta(
  title: string,
  description: string = DEFAULT_DESCRIPTION,
  options?: { image?: string; url?: string }
) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    document.title = fullTitle;

    setMeta("description", description);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", description, true);
    setMeta("og:type", "website", true);
    setMeta("og:site_name", SITE_NAME, true);

    if (options?.url) {
      setMeta("og:url", options.url, true);
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
    };
  }, [title, description, options?.image, options?.url]);
}
