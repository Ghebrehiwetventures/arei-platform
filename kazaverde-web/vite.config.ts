import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { PRERENDER_LISTING_IDS } from "./src/lib/prerender-listings";

const prerenderedListingIds = new Set(PRERENDER_LISTING_IDS);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "blog-prerender-preview-rewrite",
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (!req.url || req.method !== "GET") {
            next();
            return;
          }

          const url = new URL(req.url, "http://127.0.0.1");
          if (/^\/blog\/[^/]+$/.test(url.pathname)) {
            req.url = `${url.pathname}/index.html${url.search}`;
          }

          if (url.pathname.startsWith("/listing/")) {
            const id = decodeURIComponent(url.pathname.slice("/listing/".length));
            if (prerenderedListingIds.has(id)) {
              req.url = `${url.pathname}/index.html${url.search}`;
            }
          }

          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
