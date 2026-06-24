import { createClient } from "@supabase/supabase-js";
import { renderHero, renderListing, generateAiImage, generateGeminiImage, suggestCaption, buildImagePrompt, placeholderImage } from "../lib/newsHero.js";
import { searchPexelsPhoto } from "../lib/pexels.js";

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
    const slideType = clean(body.slideType) === "listing" ? "listing" : "hero";
    const item = {
      category: clean(body.category) || "Market News",
      headline: clean(body.headline),
      highlight: clean(body.highlight),
      date: clean(body.date),
      dek: clean(body.dek),
      aiPrompt: clean(body.aiPrompt),
      imageUrl: clean(body.imageUrl),
      location: clean(body.location),
      // Listing fields (used when slideType === "listing").
      agency: clean(body.agency),
      propertyType: clean(body.propertyType),
      price: clean(body.price),
      beds: clean(body.beds),
      baths: clean(body.baths),
      sqm: clean(body.sqm),
      idx: Number(body.idx) || 1,
      total: Number(body.total) || 1,
    };
    if (slideType === "hero" && !item.headline) {
      send(res, 400, { error: "headline is required" });
      return;
    }
    if (slideType === "listing" && !item.price && !item.imageUrl) {
      send(res, 400, { error: "listing slide needs a price or an image" });
      return;
    }
    // A listing background may be AI-generated; give buildImagePrompt something
    // to work with when there's no headline.
    if (slideType === "listing" && !item.headline) {
      item.headline = [item.propertyType, item.location].filter(Boolean).join(" in ") || "Cape Verde property";
    }

    const useAi = body.useAi === true || body.useAi === "1";
    const quality = clean(body.quality) || "high";
    const imageSource = clean(body.imageSource) || "ai"; // "ai" (default) | "pexels"
    const aiProvider = clean(body.aiProvider) || "gemini"; // "gemini" (default) | "openai"

    // Resolve the background image.
    let imageBuffer;
    let promptUsed = null;
    let warning = null;
    let attribution = null; // rendered on the hero when sourced from Pexels
    let photoMeta = null;   // provider/author info returned to the client

    // Existing AI / explicit-URL / placeholder resolution. Used directly for the
    // default flow, and as the fallback when a Pexels lookup is unavailable.
    async function resolveAiOrUrl() {
      if (useAi) {
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        // Prefer Gemini when chosen and configured; fall back to OpenAI; then placeholder.
        if (aiProvider === "gemini" && geminiKey) {
          try {
            const { buffer, prompt } = await generateGeminiImage(item);
            promptUsed = prompt;
            return buffer;
          } catch (err) {
            warning = `Gemini image failed (${err?.message || err}) — ${openaiKey ? "used OpenAI." : "used placeholder."}`;
            if (!openaiKey) return placeholderImage();
          }
        }
        if (!openaiKey) {
          if (!warning) warning = "No AI image key configured — used placeholder.";
          return placeholderImage();
        }
        const { buffer, prompt } = await generateAiImage(item, quality);
        promptUsed = prompt;
        return buffer;
      }
      if (item.imageUrl) {
        // Support both a remote URL and an uploaded image sent as a data: URL.
        if (item.imageUrl.startsWith("data:")) {
          const b64 = item.imageUrl.split(",")[1] || "";
          const buf = Buffer.from(b64, "base64");
          if (!buf.length) throw new Error("Uploaded image is empty or invalid");
          return buf;
        }
        const r = await fetch(item.imageUrl);
        if (!r.ok) throw new Error(`Image fetch failed (${r.status})`);
        return Buffer.from(await r.arrayBuffer());
      }
      return placeholderImage();
    }

    if (imageSource === "pexels") {
      // Optional real-photo background. Any failure falls back to the existing
      // AI/placeholder flow so the user flow never breaks.
      try {
        const photo = await searchPexelsPhoto({
          headline: item.headline,
          category: item.category,
          location: item.location,
        });
        if (photo) {
          const r = await fetch(photo.imageUrl);
          if (r.ok) {
            imageBuffer = Buffer.from(await r.arrayBuffer());
            attribution = photo.attribution;
            photoMeta = {
              photo_provider: "pexels",
              photo_author: photo.photographer,
              photo_author_url: photo.photographerUrl,
              photo_source_url: photo.sourceUrl,
              photo_attribution_text: photo.attribution,
            };
          }
        }
      } catch {
        // swallow — handled by the fallback below
      }
      if (!imageBuffer) {
        warning = "Curated Cape Verde photo library is empty — used an AI image instead. Add photos via curation to use real photography.";
        imageBuffer = await resolveAiOrUrl();
      }
    } else {
      imageBuffer = await resolveAiOrUrl();
    }

    // Single-slide post: hero only. No swipe affordance / corner chevrons since
    // there is nothing to swipe to. Photo attribution is surfaced in the caption
    // (via photoMeta), not burned onto the image.
    const slides = [];
    const png = slideType === "listing"
      ? await renderListing({ ...item, imageBuffer })
      : await renderHero({ ...item, imageBuffer, showNav: false });
    slides.push({ label: slideType === "listing" ? "Listing" : "1 · Hero", imageBase64: png.toString("base64") });

    const caption = suggestCaption(item);

    // The resolved source photo (before compositing). Returned so the carousel
    // editor can store it per slide and re-render that slide deterministically
    // (via imageSource:"url" + this data URL) instead of re-generating a new
    // AI/Pexels image on every edit. Compositing is unchanged — this is the
    // renderer's *input*, so the visual output is identical.
    //
    // A re-render POSTs this photo back as a data URL; Vercel caps the request
    // body at ~4.5 MB. If the resolved photo is too large to round-trip safely,
    // we omit it (and warn) rather than returning a source that would later 413
    // — the slide simply regenerates its image on edit instead of re-composing.
    // (A proper one-time server-side downscale would need an image lib such as
    // sharp; the real sources here — AI ≈1024px, curated Pexels, client-
    // downscaled uploads — already sit well under the cap.)
    const SOURCE_ROUNDTRIP_CAP = 3_100_000; // bytes → base64 ≈ 4.1 MB data URL
    const srcTooBig = imageBuffer.length > SOURCE_ROUNDTRIP_CAP;
    const srcMime = imageBuffer[0] === 0x89 ? "image/png"
      : imageBuffer[0] === 0x47 ? "image/gif"
      : imageBuffer[0] === 0x52 ? "image/webp"
      : "image/jpeg";
    const sizeWarning = srcTooBig
      ? "Source photo is large — editing text on this slide will regenerate the image rather than re-compose the same one."
      : null;

    send(res, 200, {
      slides,
      mime: "image/png",
      caption,
      promptUsed: promptUsed || (useAi ? buildImagePrompt(item) : null),
      warning: warning || sizeWarning,
      attribution,
      photoMeta,
      sourceImageBase64: srcTooBig ? "" : imageBuffer.toString("base64"),
      sourceImageMime: srcTooBig ? "" : srcMime,
    });
  } catch (err) {
    send(res, 500, { error: err?.message || String(err) });
  }
}
