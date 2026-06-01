// GET /api/kv-curation-stats
// Returns the four dashboard tile values plus the needs_review backlog age.

import { authorize, createPg, send } from "./_endpointAuth.js";
import curationLib from "./_curationLib.cjs";

const { buildStatsQuery } = curationLib;

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  const client = createPg();
  await client.connect();
  try {
    const { text, values } = buildStatsQuery();
    const { rows } = await client.query(text, values);
    const r = rows[0] || {};
    return send(res, 200, {
      live: Number(r.live) || 0,
      needs_review: Number(r.needs_review) || 0,
      needs_review_older_than_14d: Number(r.needs_review_older_than_14d) || 0,
      new_this_week: Number(r.new_this_week) || 0,
      agent_flagged: Number(r.agent_flagged) || 0,
    });
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
