import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { pathToFileURL } from "url";
import { createRequire } from "module";

const artifactsDir = path.resolve(__dirname, "../artifacts");
const publicDir = fs.existsSync(artifactsDir) ? artifactsDir : path.resolve(__dirname, "public");

// Dev-only: serve arei-admin/api/*.js as Vercel-style serverless functions so
// the SPA can talk to /api/* in `vite dev` without the Vercel CLI. Production
// deploys still use the Vercel platform's own function runtime.
function devApiPlugin(): Plugin {
  return {
    name: "arei-admin-dev-api",
    apply: "serve",
    configureServer(server) {
      dotenv.config({ path: path.resolve(__dirname, "../.env") });
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        const [pathOnly] = req.url.split("?");
        const fileName = pathOnly.replace(/^\/api\//, "").replace(/\/$/, "");
        const apiDir = path.resolve(__dirname, "api");
        const handlerFile = path.resolve(apiDir, fileName + ".js");
        // Guard against `/api/../foo` resolving outside the api directory.
        // `server.host: true` binds 0.0.0.0 in dev, so a passerby on the
        // same network could otherwise probe arbitrary .js files on disk.
        if (!handlerFile.startsWith(apiDir + path.sep)) return next();
        if (!fs.existsSync(handlerFile)) return next();
        try {
          // Use Node's native dynamic import — Vite's ssrLoadModule does not
          // do CJS interop, which breaks handlers that import a .cjs helper.
          // Cache-bust by mtime so saved edits are picked up without a server
          // restart. ESM query-string busting does not reach .cjs subimports
          // (Node's CJS loader keeps them in require.cache), so also drop any
          // cached require.cache entries under api/ before re-importing — a
          // freshly edited _reviewerLib.cjs would otherwise stay stale.
          try {
            const requireFromHere = createRequire(import.meta.url);
            for (const key of Object.keys(requireFromHere.cache)) {
              if (key.startsWith(apiDir + path.sep)) delete requireFromHere.cache[key];
            }
          } catch { /* best effort */ }
          const mtime = fs.statSync(handlerFile).mtimeMs;
          const url = pathToFileURL(handlerFile).href + "?t=" + mtime;
          const mod = await import(url);
          const handler = mod.default;
          if (typeof handler !== "function") return next();
          await handler(req, res);
        } catch (err) {
          console.error("[dev-api] handler error:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  envDir: "..",
  plugins: [react(), tailwindcss(), devApiPlugin()],
  publicDir,
  server: {
    port: 3099,
    host: true,
    strictPort: false,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../core"),
        path.resolve(__dirname, "../artifacts"),
      ],
    },
  },
});
