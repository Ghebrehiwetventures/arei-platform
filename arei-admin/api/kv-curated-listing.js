// GET /api/kv-curated-listing            → filtered list of curated rows
// GET /api/kv-curated-listing?id=<id>    → single row with description
//
// Filter query params (list mode only):
//   status, source_id, island, q, price_min, price_max, first_seen_after,
//   flagged_hide (1), limit, offset

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildListingsQuery } = curationLib;

const DETAIL_COLS =
  "id, publish_status, title, source_id_primary, source_url_primary, island, city, " +
  "property_type, bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm, " +
  "image_urls, first_seen_at, last_verified_at, description";

function parseFilters(url) {
  const sp = url.searchParams;
  const getInt = (k) => {
    const v = sp.get(k);
    return v == null ? undefined : Number(v);
  };
  return {
    status: sp.get("status") || undefined,
    source_id: sp.get("source_id") || undefined,
    island: sp.get("island") || undefined,
    q: sp.get("q") || undefined,
    price_min: sp.get("price_min") != null ? getInt("price_min") : undefined,
    price_max: sp.get("price_max") != null ? getInt("price_max") : undefined,
    first_seen_after: sp.get("first_seen_after") || undefined,
    flagged_hide: sp.get("flagged_hide") === "1",
    limit: sp.get("limit") != null ? getInt("limit") : undefined,
    offset: sp.get("offset") != null ? getInt("offset") : undefined,
  };
}

function shapeListRow(r) {
  const last_review = r.last_review_created_at
    ? {
        verdict: r.last_review_verdict,
        confidence: r.last_review_confidence,
        hide_reason: r.last_review_hide_reason,
        created_at: r.last_review_created_at,
      }
    : null;
  const {
    last_review_verdict, last_review_confidence, last_review_hide_reason, last_review_created_at,
    ...rest
  } = r;
  return { ...rest, last_review };
}

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

    let q;
    try { q = buildListingsQuery(parseFilters(url)); }
    catch (err) { return send(res, 400, { error: err.message }); }

    const [listRes, countRes] = await Promise.all([
      client.query(q.text, q.values),
      client.query(q.countText, q.countValues),
    ]);
    return send(res, 200, {
      items: listRes.rows.map(shapeListRow),
      totalCount: countRes.rows[0]?.count ?? 0,
    });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
