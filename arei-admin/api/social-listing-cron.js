export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "CRON_SECRET not set" }));
    return;
  }

  // Vercel sets Authorization: Bearer <CRON_SECRET> automatically on cron calls
  const auth = req.headers?.authorization || "";
  if (auth !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const r = await fetch(`${baseUrl}/api/social-listing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ action: "process_queue" }),
  });

  const data = await r.json().catch(() => ({}));
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}
