import { createClient } from "@supabase/supabase-js";
import { renderHero, renderDetailSlide, generateAiImage, suggestCaption, buildImagePrompt, placeholderImage } from "../lib/newsHero.js";

const COOKIE_NAME = "admin_session";

function send(res, status, data) {
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
    .from("admin_users")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (adminError) throw new Error(`Could not verify admin user: ${adminError.message}`);
  if (!adminRow) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

const clean = (v) => (typeof v === "string" ? v.trim() : "");

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const item = {
      category: clean(body.category) || "Market News",
      headline: clean(body.headline),
      highlight: clean(body.highlight),
      date: clean(body.date),
      dek: clean(body.dek),
      aiPrompt: clean(body.aiPrompt),
      imageUrl: clean(body.imageUrl),
    };
    if (!item.headline) {
      send(res, 400, { error: "headline is required" });
      return;
    }

    // Slide 2 ("What happened") bullets — array or newline-separated string.
    const bullets = (Array.isArray(body.bullets) ? body.bullets : String(body.bullets || "").split("\n"))
      .map(clean)
      .filter(Boolean)
      .slice(0, 4);
    const includeSlide2 = bullets.length > 0;

    const useAi = body.useAi === true || body.useAi === "1";
    const quality = clean(body.quality) || "high";

    // Resolve the background image.
    let imageBuffer;
    let promptUsed = null;
    let warning = null;
    if (useAi) {
      if (!process.env.OPENAI_API_KEY) {
        warning = "OPENAI_API_KEY not configured — used placeholder.";
        imageBuffer = await placeholderImage();
      } else {
        const { buffer, prompt } = await generateAiImage(item, quality);
        imageBuffer = buffer;
        promptUsed = prompt;
      }
    } else if (item.imageUrl) {
      const r = await fetch(item.imageUrl);
      if (!r.ok) throw new Error(`Image fetch failed (${r.status})`);
      imageBuffer = Buffer.from(await r.arrayBuffer());
    } else {
      imageBuffer = await placeholderImage();
    }

    const total = includeSlide2 ? 2 : 1;
    const slides = [];

    const hero = await renderHero({ ...item, imageBuffer });
    slides.push({ label: "1 · Hero", imageBase64: hero.toString("base64") });

    if (includeSlide2) {
      // Reuse the same background image for visual continuity (one AI image, two slides).
      const detail = await renderDetailSlide({
        category: item.category,
        kicker: "What happened",
        bullets,
        idx: 2,
        total,
        imageBuffer,
      });
      slides.push({ label: "2 · What happened", imageBase64: detail.toString("base64") });
    }

    const caption = suggestCaption(item);

    send(res, 200, {
      slides,
      mime: "image/png",
      caption,
      promptUsed: promptUsed || (useAi ? buildImagePrompt(item) : null),
      warning,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
