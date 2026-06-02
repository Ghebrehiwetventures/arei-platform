// GET /api/kv-curated-listing-history?id=<listing_id>
// Returns up to 20 review_log rows for the listing, most recent first.

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildHistoryQuery } = curationLib;

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const url = new URL(req.url, "http://localhost");
  const id = url.searchParams.get("id");
  if (!id) return send(res, 400, { error: "id is required" });

  let q;
  try { q = buildHistoryQuery(id); }
  catch (err) { return send(res, 400, { error: err.message }); }

  const client = createPg();
  await client.connect();
  try {
    const { rows } = await client.query(q.text, q.values);
    return send(res, 200, { items: rows });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
