import { getSupabase, processQueueOnce } from "./social-listing.js";

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "CRON_SECRET not set" }));
    return;
  }

  // Vercel sets Authorization: Bearer <CRON_SECRET> automatically on cron calls.
  const auth = req.headers?.authorization || "";
  if (auth !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  // Run the queue processor in-process. We deliberately do NOT make an internal
  // HTTP call to /api/social-listing — that hit the deployment URL behind Vercel
  // deployment protection, so process_queue never actually ran.
  try {
    const sb = getSupabase();
    const result = await processQueueOnce(sb);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error("[social-listing-cron] error:", err?.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err?.message || String(err) }));
  }
}
