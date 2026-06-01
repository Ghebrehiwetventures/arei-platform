// GET /api/kv-curated-listing            → list needs_review rows
// GET /api/kv-curated-listing?id=<id>     → single row with description

import { authorize, createPg, send } from "./_endpointAuth.js";

const LIST_COLS =
  "id, publish_status, title, source_id_primary, source_url_primary, island, city, " +
  "property_type, bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm, " +
  "image_urls, first_seen_at, last_verified_at";

const DETAIL_COLS = LIST_COLS + ", description";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");

  const client = createPg();
  await client.connect();
  try {
    if (id) {
      const { rows } = await client.query(
        `SELECT ${DETAIL_COLS} FROM kv_curated.listings WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return send(res, 404, { error: "not found" });
      return send(res, 200, rows[0]);
    }
    const { rows } = await client.query(
      `SELECT ${LIST_COLS} FROM kv_curated.listings
       WHERE publish_status = 'needs_review'
       ORDER BY first_seen_at DESC NULLS LAST
       LIMIT 200`,
    );
    return send(res, 200, { items: rows });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
