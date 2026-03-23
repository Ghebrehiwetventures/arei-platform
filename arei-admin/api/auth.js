import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "__Host-admin_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24;
const COOKIE_OPTS = `Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SEC}`;
const CLEAR_COOKIE_OPTS = "Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
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
  const userAgent = (req.headers?.["user-agent"] || "").toString().slice(0, 200);
  if (typeof forwarded === "string" && forwarded.trim()) {
    return `${forwarded.split(",")[0].trim()}|${userAgent}`;
  }
  return `${req.socket?.remoteAddress || "unknown"}|${userAgent}`;
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

function base64url(input) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function signToken(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(secret) {
  const payload = base64url(
    JSON.stringify({
      exp: Date.now() + SESSION_MAX_AGE_SEC * 1000,
      nonce: randomUUID(),
    })
  );
  const signature = signToken(payload, secret);
  return `${payload}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !secret || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = signToken(payload, secret);
  if (!safeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof decoded?.exp === "number" && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${CLEAR_COOKIE_OPTS}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const cookie = (req.headers?.cookie || "").toString();
      const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (secret && match && verifySessionToken(match[1], secret)) {
        send(res, 200, { ok: true });
        return;
      }
      if (match) {
        clearSession(res);
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
        res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
        send(res, 429, { error: "Too many attempts. Try again later." });
        return;
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      if (!safeEqual(body.password, password)) {
        state.count += 1;
        await sleep(Math.min(1000, 200 * state.count));
        send(res, 401, { error: "Invalid password" });
        return;
      }

      attempts.delete(clientKey);
      const token = createSessionToken(secret);
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; ${COOKIE_OPTS}`);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    send(res, 500, { error: "Internal error", message: err?.message || String(err) });
  }
}
