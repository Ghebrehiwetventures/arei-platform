// POST /api/deep-review-listing
// Body: { id }
// Calls Claude Sonnet with Anthropic's web_fetch tool to diagnose why a
// kv_curated.listings row has empty fields by reading the live source page.
// Returns { id, verdict } where verdict adds missing_field_report,
// unmapped_fields, and fetch_status to the base contract.

import Anthropic from "@anthropic-ai/sdk";
import { authorize, createPg, readJsonBody, send } from "./_endpointAuth.js";
import reviewerLib from "./_reviewerLib.cjs";

const { buildDeepReviewPrompt, parseAndValidateVerdict } = reviewerLib;

const MODEL = "claude-sonnet-4-6";
// web_fetch is a server tool; in SDK 0.91 it is reached via the beta channel.
const WEB_FETCH_BETA = "web-fetch-2025-09-10";
const WEB_FETCH_TOOL = { type: "web_fetch_20250910", name: "web_fetch", max_uses: 3 };

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
      `SELECT id, title, description, source_url_primary, source_id_primary, island, city,
              property_type, bedrooms, bathrooms, price, currency, property_size_sqm,
              land_area_sqm, image_urls, publish_status
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

  const { system, user } = buildDeepReviewPrompt(row);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let raw;
  try {
    const resp = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: [WEB_FETCH_BETA],
      system,
      tools: [WEB_FETCH_TOOL],
      messages: [{ role: "user", content: user }],
    });
    const textBlocks = resp.content.filter((c) => c.type === "text");
    raw = textBlocks.length ? textBlocks[textBlocks.length - 1].text : "";
  } catch (err) {
    return send(res, 502, { error: "model call failed: " + (err.message || err) });
  }

  let verdict;
  try { verdict = parseAndValidateVerdict(raw); }
  catch (err) { return send(res, 502, { error: err.message, raw }); }

  // Persist. Failures here are logged but not surfaced — the operator already
  // has the verdict in the response.
  let review_log_id = null;
  try {
    const logClient = createPg();
    await logClient.connect();
    try {
      const { rows: logRows } = await logClient.query(
        `INSERT INTO kv_curated.review_log
           (listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason,
            missing_field_report, unmapped_fields, fetch_status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10)
         RETURNING id`,
        [
          row.id,
          MODEL,
          verdict.verdict,
          verdict.confidence,
          JSON.stringify(verdict.reasons),
          JSON.stringify(verdict.suggested_patch),
          verdict.hide_reason ?? null,
          JSON.stringify(verdict.missing_field_report ?? []),
          JSON.stringify(verdict.unmapped_fields ?? []),
          verdict.fetch_status ?? null,
        ],
      );
      review_log_id = logRows[0]?.id ?? null;
    } finally {
      await logClient.end();
    }
  } catch (err) {
    console.error("[deep-review-listing] failed to insert review_log:", err.message);
  }

  return send(res, 200, { id: row.id, verdict, review_log_id, source_id: row.source_id_primary });
}
