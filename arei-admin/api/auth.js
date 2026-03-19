import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";
const COOKIE_OPTS = "Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function safeEqual(a, b) {
  const left = Buffer.from(a || "", "utf8");
  const right = Buffer.from(b || "", "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function getClientKey(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function getAttemptState(key) {
  const now = Date.now();
  const existing = attempts.get(key);
  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    const fresh = { count: 0, firstAttemptAt: now };
    attempts.set(key, fresh);
    return fresh;
  }
  return existing;
}

export default function handler(req, res) {
  try {
    if (req.method === "GET") {
      const cookie = (req.headers?.cookie || "").toString();
      const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (secret && match && safeEqual(match[1], secret)) {
        send(res, 200, { ok: true });
        return;
      }
      send(res, 401, { ok: false });
      return;
    }

    if (req.method === "POST") {
      const password = process.env.ADMIN_PASSWORD;
      const secret = process.env.ADMIN_SESSION_SECRET;
      const clientKey = getClientKey(req);
      const state = getAttemptState(clientKey);

      if (!password || !secret) {
        send(res, 500, { error: "Auth not configured" });
        return;
      }

      if (state.count >= MAX_ATTEMPTS) {
        send(res, 429, { error: "Too many attempts. Try again later." });
        return;
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      if (!safeEqual(body.password, password)) {
        state.count += 1;
        send(res, 401, { error: "Invalid password" });
        return;
      }

      attempts.delete(clientKey);
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=${secret}; ${COOKIE_OPTS}`);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    send(res, 500, { error: "Internal error", message: err?.message || String(err) });
  }
}
