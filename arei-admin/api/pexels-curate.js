/**
 * pexels-curate.js — admin tool to build the curated Cape Verde photo allowlist.
 *
 * GET /api/pexels-curate  (admin only)
 * Searches Pexels for Cape Verde portrait photos, drops obvious wrong-country
 * look-alikes, dedupes, and returns candidates ready to paste into
 * arei-admin/lib/cape-verde-photos.json. Each candidate carries a `confident`
 * flag (its description positively names Cape Verde / an island) so the obvious
 * keepers are easy to spot. Human review is the point — keep only real Cape
 * Verde photos; the runtime then shuffles exclusively among the saved list.
 */
import { createClient } from "@supabase/supabase-js";
import { isLikelyWrongCountry } from "../lib/pexels.js";

const COOKIE_NAME = "admin_session";
const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";

// Positive Cape Verde signal in a photo's description.
const CV_NAMED_RE = new RegExp(
  ["cabo verde", "cape verde", "sal rei", "boa vista", "santiago", "são vicente",
   "sao vicente", "mindelo", "praia", "santa maria", "fogo", "santo antão",
   "santo antao", "maio", "brava", "espargos", "tarrafal"].join("|"),
  "i"
);

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const match = (req.headers?.authorization || "").toString().match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const match = (req.headers?.cookie || "").toString().match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function authorizeRequest(req, sb) {
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users").select("role").eq("user_id", userData.user.id).maybeSingle();
  if (adminError) throw new Error(`Could not verify admin user: ${adminError.message}`);
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  let sb;
  try {
    sb = getSupabase();
  } catch (err) {
    send(res, 500, { error: err.message });
    return;
  }

  try {
    const auth = await authorizeRequest(req, sb);
    if (!auth.ok) {
      send(res, auth.status, { error: auth.error });
      return;
    }

    const key = process.env.PEXELS_API_KEY;
    if (!key) {
      send(res, 500, { error: "PEXELS_API_KEY not configured" });
      return;
    }

    const queries = ["Cabo Verde", "Cape Verde", "Cabo Verde beach", "Cabo Verde island"];
    const byId = new Map();

    for (const query of queries) {
      try {
        const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=80&orientation=portrait`;
        const r = await fetch(url, { headers: { Authorization: key } });
        if (!r.ok) continue;
        const json = await r.json();
        for (const p of Array.isArray(json?.photos) ? json.photos : []) {
          if (!p?.src) continue;
          const alt = String(p.alt || "");
          if (isLikelyWrongCountry(alt)) continue; // drop named look-alikes
          const id = p.id ?? p.src?.original;
          if (!id || byId.has(id)) continue;
          byId.set(id, {
            id,
            imageUrl: p.src.portrait || p.src.large2x || p.src.large || p.src.original,
            photographer: String(p.photographer || "Unknown"),
            photographerUrl: String(p.photographer_url || ""),
            sourceUrl: String(p.url || ""),
            alt,
            confident: CV_NAMED_RE.test(alt), // alt positively names Cape Verde
          });
        }
      } catch {
        // skip this query on error
      }
    }

    const photos = [...byId.values()];
    // Confident (named Cape Verde) first, for quick eyeballing.
    photos.sort((a, b) => Number(b.confident) - Number(a.confident));

    send(res, 200, {
      total: photos.length,
      confident: photos.filter((p) => p.confident).length,
      note:
        "Review these and keep only real Cape Verde photos. Paste the chosen " +
        "entries (id, imageUrl, photographer, photographerUrl, sourceUrl) into " +
        "arei-admin/lib/cape-verde-photos.json. The runtime then shuffles only those.",
      photos,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
