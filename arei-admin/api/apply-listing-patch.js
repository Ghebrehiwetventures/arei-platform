// POST /api/apply-listing-patch
// Body: { id, patch, publish_status?, recovered_gaps? }
// Applies a subset of fields to kv_curated.listings and optionally changes
// publish_status. Returns { row }. If recovered_gaps is provided and non-empty,
// also inserts rows into kv_curated.scraper_gap_log inside the same
// transaction, but under a SAVEPOINT — if the gap insert fails (e.g. the
// scraper_gap_log table has not been migrated yet), we roll back the savepoint
// and still commit the listing UPDATE that the operator confirmed.

import { authorize, createPg, readJsonBody, send } from "./_endpointAuth.js";
import reviewerLib from "./_reviewerLib.cjs";

const { buildPatchSql, buildScraperGapInsert } = reviewerLib;

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  let body;
  try { body = await readJsonBody(req); }
  catch (e) { return send(res, 400, { error: "invalid JSON body: " + e.message }); }

  const id = body?.id;
  const patch = body?.patch ?? {};
  const publishStatus = body?.publish_status ?? null;
  const recoveredGaps = Array.isArray(body?.recovered_gaps) ? body.recovered_gaps : [];

  if (!id || typeof id !== "string") return send(res, 400, { error: "id is required" });
  if (patch && typeof patch !== "object") return send(res, 400, { error: "patch must be an object" });

  let query;
  try { query = buildPatchSql(id, patch, publishStatus); }
  catch (err) { return send(res, 400, { error: err.message }); }

  let gapQuery = null;
  try { gapQuery = buildScraperGapInsert(id, recoveredGaps); }
  catch (err) { return send(res, 400, { error: err.message }); }

  const client = createPg();
  await client.connect();
  let gapInsertError = null;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(query.text, query.values);
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return send(res, 404, { error: "listing not found" });
    }
    if (gapQuery) {
      try {
        await client.query("SAVEPOINT gap_insert");
        await client.query(gapQuery.text, gapQuery.values);
        await client.query("RELEASE SAVEPOINT gap_insert");
      } catch (err) {
        gapInsertError = err.message;
        console.error("[apply-listing-patch] scraper_gap_log insert failed:", err.message);
        await client.query("ROLLBACK TO SAVEPOINT gap_insert").catch(() => {});
      }
    }
    await client.query("COMMIT");
    return send(res, 200, { row: rows[0], gap_insert_error: gapInsertError });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }
}
