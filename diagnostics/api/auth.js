const COOKIE_NAME = "admin_session";
const COOKIE_OPTS = "Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400";

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default function handler(req, res) {
  try {
    if (req.method === "GET") {
      const cookie = (req.headers?.cookie || "").toString();
      const match = cookie.match(new RegExp(COOKIE_NAME + "=([^;]+)"));
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (secret && match && match[1] === secret) {
        send(res, 200, { ok: true });
        return;
      }
      send(res, 401, { ok: false });
      return;
    }

    if (req.method === "POST") {
      const password = process.env.ADMIN_PASSWORD;
      const secret = process.env.ADMIN_SESSION_SECRET;
      if (!password || !secret) {
        send(res, 500, { error: "Auth not configured" });
        return;
      }
      const body = req.body && typeof req.body === "object" ? req.body : {};
      if (body.password !== password) {
        send(res, 401, { error: "Invalid password" });
        return;
      }
      res.setHeader("Set-Cookie", `${COOKIE_NAME}=${secret}; ${COOKIE_OPTS}`);
      send(res, 200, { ok: true });
      return;
    }

    send(res, 405, { error: "Method not allowed" });
  } catch (err) {
    send(res, 500, { error: "Internal error", message: err?.message || String(err) });
  }
}
