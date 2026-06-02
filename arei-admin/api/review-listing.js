// POST /api/review-listing
// Body: { id }
// Calls Anthropic Haiku 4.5 to review a kv_curated.listings row.
// Returns { id, verdict } where verdict is the parsed JSON contract from _reviewerLib.cjs.

import Anthropic from "@anthropic-ai/sdk";
import { authorize, createPg, readJsonBody, send } from "./_endpointAuth.js";
import reviewerLib from "./_reviewerLib.cjs";

const { buildReviewPrompt, parseAndValidateVerdict } = reviewerLib;

const MODEL = "claude-haiku-4-5-20251001";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const auth = await authorize(req);
  if (!auth.ok) return send(res, auth.status, { error: auth.error });

  if (!process.env.ANTHROPIC_API_KEY) return send(res, 500, { error: "ANTHROPIC_API_KEY not set" });

  let body;
  try { body = await readJsonBody(req); }
  catch (e) { return send(res, 400, { error: "invalid JSON body: " + e.message }); }
  const id = body?.id;
  if (!id || typeof id !== "string") return send(res, 400, { error: "id is required" });

  const client = createPg();
  let row;
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, title, description, source_url_primary, island, city, property_type,
              bedrooms, bathrooms, price, currency, property_size_sqm, land_area_sqm,
              image_urls, publish_status
         FROM kv_curated.listings WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return send(res, 404, { error: "listing not found" });
    row = rows[0];
  } catch (err) {
    return send(res, 500, { error: err.message });
  } finally {
    await client.end();
  }

  const { system, user } = buildReviewPrompt(row);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let raw;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = resp.content.find((c) => c.type === "text");
    raw = block?.text ?? "";
  } catch (err) {
    return send(res, 502, { error: "model call failed: " + (err.message || err) });
  }

  let verdict;
  try { verdict = parseAndValidateVerdict(raw); }
  catch (err) { return send(res, 502, { error: err.message, raw }); }

  // Persist the verdict. Failures here are logged but not surfaced — the
  // operator already has the verdict in the response and re-running review
  // would just spend another model call to recover the same data.
  let review_log_id = null;
  try {
    const logClient = createPg();
    await logClient.connect();
    try {
      const { rows: logRows } = await logClient.query(
        `INSERT INTO kv_curated.review_log
           (listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
         RETURNING id`,
        [
          row.id,
          MODEL,
          verdict.verdict,
          verdict.confidence,
          JSON.stringify(verdict.reasons),
          JSON.stringify(verdict.suggested_patch),
          verdict.hide_reason ?? null,
        ],
      );
      review_log_id = logRows[0]?.id ?? null;
    } finally {
      await logClient.end();
    }
  } catch (err) {
    console.error("[review-listing] failed to insert review_log:", err.message);
  }

  return send(res, 200, { id: row.id, verdict, review_log_id });
}
