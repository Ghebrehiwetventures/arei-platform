import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { PRERENDER_LISTING_IDS } from "./src/lib/prerender-listings";

const prerenderedListingIds = new Set(PRERENDER_LISTING_IDS);

type ReviewStatus = "needs_review" | "published" | "hidden";

function sendJson(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: string) => void }, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function reviewQueueDevPlugin(databaseUrl: string | undefined) {
  return {
    name: "kv-review-queue-dev-api",
    apply: "serve" as const,
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: () => void) => {
        if (!req.url || req.method !== "GET") {
          next();
          return;
        }

        const url = new URL(req.url, "http://127.0.0.1");
        if (url.pathname !== "/__kv-review/listings") {
          next();
          return;
        }

        if (!databaseUrl) {
          sendJson(res, 500, { error: "DATABASE_URL is required for the local review queue." });
          return;
        }

        const statusParam = url.searchParams.get("status") || "needs_review";
        const status = ["needs_review", "published", "hidden"].includes(statusParam)
          ? statusParam as ReviewStatus
          : undefined;
        const sourceId = (url.searchParams.get("sourceId") || "").trim();
        const limitParam = Number(url.searchParams.get("limit") || "200");
        const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(Math.trunc(limitParam), 500)) : 200;

        const filters: string[] = ["source_id_primary LIKE 'cv\\_%' ESCAPE '\\'"];
        const params: unknown[] = [];
        if (status) {
          params.push(status);
          filters.push(`publish_status = $${params.length}`);
        }
        if (sourceId) {
          params.push(sourceId);
          filters.push(`source_id_primary = $${params.length}`);
        }
        params.push(limit);
        const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

        let client: any;
        try {
          const { Client } = await import("pg");
          client = new Client({ connectionString: databaseUrl });
          await client.connect();

          const [rowsResult, summaryResult] = await Promise.all([
            client.query(
              `
                SELECT
                  id,
                  title,
                  island,
                  city,
                  price,
                  currency,
                  property_type,
                  bedrooms,
                  bathrooms,
                  COALESCE(property_size_sqm, land_area_sqm) AS area_sqm,
                  image_urls,
                  source_id_primary AS source_id,
                  source_url_primary AS source_url,
                  publish_status,
                  first_seen_at,
                  last_verified_at,
                  updated_at,
                  (ai_descriptions IS NOT NULL) AS has_ai_description
                FROM kv_curated.listings
                ${where}
                ORDER BY updated_at DESC NULLS LAST, first_seen_at DESC NULLS LAST, id ASC
                LIMIT $${params.length}
              `,
              params,
            ),
            client.query(`
              SELECT
                source_id_primary AS source_id,
                publish_status,
                count(*)::int AS count
              FROM kv_curated.listings
              WHERE source_id_primary LIKE 'cv\\_%' ESCAPE '\\'
              GROUP BY source_id_primary, publish_status
              ORDER BY source_id_primary, publish_status
            `),
          ]);

          sendJson(res, 200, {
            data: rowsResult.rows,
            total: rowsResult.rows.length,
            limit,
            sources: summaryResult.rows,
          });
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : "Review queue query failed." });
        } finally {
          if (client) await client.end().catch(() => {});
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;

  return {
    envDir: "..",
    plugins: [
      react(),
      reviewQueueDevPlugin(databaseUrl),
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
  };
});
