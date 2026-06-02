// Shared helpers for the kv_curated reviewer endpoints. ESM (arei-admin is
// "type": "module"). Auth pattern mirrors arei-admin/api/social-market-news.js.

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const COOKIE_NAME = "admin_session";

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function getBearerToken(req) {
  const header = (req.headers?.authorization || "").toString();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isCookieAuthorized(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = (req.headers?.cookie || "").toString();
  const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
  return Boolean(match && match[1] === secret);
}

export async function authorize(req) {
  // Local-dev escape hatch. Guarded by two conditions so this can never fire
  // in production: an explicit env var the operator has to set, AND a
  // NODE_ENV that is not "production".
  if (process.env.DEV_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production") {
    return { ok: true };
  }
  const token = getBearerToken(req);
  if (!token) {
    if (isCookieAuthorized(req)) return { ok: true };
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, status: 500, error: "Supabase env not configured" };
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await sb.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: adminRow, error: adminError } = await sb
    .from("admin_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminError) return { ok: false, status: 500, error: adminError.message };
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (chunk) => { buf += chunk; });
    req.on("end", () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

export function createPg() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return new pg.Client({ connectionString: process.env.DATABASE_URL });
}
