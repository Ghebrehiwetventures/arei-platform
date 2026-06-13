/**
 * wikimedia-curate.js — admin tool to build the curated Cape Verde photo
 * allowlist from Wikimedia Commons (real, geotagged, freely-licensed photos).
 *
 * GET /api/wikimedia-curate            (admin only)
 *   ?q=Cape+Verde+architecture         optional — override the default queries
 *                                      (repeatable / comma-separated)
 *   ?width=1600                        optional — thumbnail width to request
 *
 * Searches Commons, drops non-photos (maps/flags/SVG) and named wrong-country
 * look-alikes, dedupes, and returns candidates ready to paste into
 * arei-admin/lib/cape-verde-photos.json. Each candidate is already allowlist-
 * shaped (provider: "wikimedia", licence-aware attribution) and carries a
 * `confident` flag (its title/description names Cape Verde / an island). Human
 * review is the point — keep only real Cape Verde photos; the runtime then
 * shuffles among the saved list, mixing freely with any Pexels entries.
 *
 * No third-party API key is needed — the Commons API is public.
 */
import { createClient } from "@supabase/supabase-js";
import { fetchWikimediaCandidates } from "../lib/wikimedia.js";

const COOKIE_NAME = "admin_session";

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

// Accept ?q=a,b or repeated ?q=a&q=b; returns [] when none given.
function parseQueries(req) {
  const raw = req.query?.q;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .flatMap((s) => String(s).split(","))
    .map((s) => s.trim())
    .filter(Boolean)
    .map((q) => (/filetype:/i.test(q) ? q : `${q} filetype:bitmap`));
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

    const queries = parseQueries(req);
    const widthPx = Number(req.query?.width) || undefined;
    const { photos, queriesUsed } = await fetchWikimediaCandidates({
      queries: queries.length ? queries : undefined,
      widthPx,
    });

    send(res, 200, {
      total: photos.length,
      confident: photos.filter((p) => p.confident).length,
      queriesUsed,
      note:
        "Review these and keep only real Cape Verde photos. Paste the chosen " +
        "entries (id, provider, imageUrl, photographer, photographerUrl, " +
        "sourceUrl, license, attribution) into arei-admin/lib/cape-verde-" +
        "photos.json. The runtime shuffles among all saved entries (Pexels + " +
        "Wikimedia) and credits each per its provider.",
      photos,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
