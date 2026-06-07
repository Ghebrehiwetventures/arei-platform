/**
 * newsHero.js — Cape Verde Real Estate Index · Instagram news hero renderer.
 *
 * Server-side image generator used by /api/generate-news-post-image.
 * Ported from tools/social-news-image/hero.js. Fonts are fetched at runtime
 * from the jsDelivr fontsource CDN and cached in module scope, so no font
 * files need to be bundled into the Vercel function.
 *
 * Design = the locked v1 system: full-bleed photo + ink gradient fade,
 * canonical CVREI lockup (CAPE VERDE bold), sage category pill, IBM Plex Sans
 * Condensed uppercase headline with a sage keyword highlight, dek line.
 */
import { Resvg } from "@resvg/resvg-js";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const W = 1080, H = 1350, M = 72;
const INK = "#0A0A0A", BONE = "#FAFAFA", SAGE = "#8ECFBF", GRAY = "#b9b9b9";
const MONO = "IBM Plex Mono", SANS = "IBM Plex Sans", COND = "IBM Plex Sans Condensed";

// ── Fonts (fetched once, cached) ────────────────────────────────────────────
const FONT_URLS = [
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-400-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-500-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-600-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-mono@latest/latin-700-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans@latest/latin-400-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans@latest/latin-600-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans@latest/latin-700-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans-condensed@latest/latin-600-normal.ttf",
  "https://cdn.jsdelivr.net/fontsource/fonts/ibm-plex-sans-condensed@latest/latin-700-normal.ttf",
];
// Fonts are written to /tmp and passed to resvg as fontFiles (paths). resvg's
// family resolution from on-disk files correctly distinguishes "IBM Plex Sans"
// from "IBM Plex Sans Condensed"; in-memory fontBuffers did not, which broke
// the condensed headline. Cached across warm invocations.
let FONT_FILES = null;
async function loadFonts() {
  if (FONT_FILES) return FONT_FILES;
  const dir = path.join(os.tmpdir(), "cvrei-fonts");
  fs.mkdirSync(dir, { recursive: true });
  FONT_FILES = await Promise.all(
    FONT_URLS.map(async (u, i) => {
      const file = path.join(dir, `f${i}-${u.split("/").pop()}`);
      if (!fs.existsSync(file)) {
        const res = await fetch(u);
        if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${u}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      }
      return file;
    })
  );
  return FONT_FILES;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mark(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color}" stroke-width="1.4" stroke-linecap="square" fill="none"><rect x="3" y="3" width="14" height="14"/><rect x="6.5" y="6.5" width="14" height="14"/><rect x="10" y="10" width="9" height="9" fill="${color}" stroke="none"/></g>`;
}

// CVREI three-line ceremonial lockup (CAPE VERDE bold; per brand manual-core.jsx)
function lockup(x, y, color, h = 46) {
  const t = Math.round(h * 0.34);
  const tx = x + h + 10;
  const ls = (t * 0.04).toFixed(2);
  const adv = Math.round(t * 1.2);
  const y1 = y + t - 1;
  return `${mark(x, y, h, color)}
  <g font-family="${MONO}" font-size="${t}" letter-spacing="${ls}" fill="${color}">
    <text x="${tx}" y="${y1}" font-weight="700">CAPE VERDE</text>
    <text x="${tx}" y="${y1 + adv}" font-weight="400" opacity="0.85">REAL ESTATE</text>
    <text x="${tx}" y="${y1 + adv * 2}" font-weight="400" opacity="0.85">INDEX</text>
  </g>`;
}

function highlightSet(words, highlight) {
  if (!highlight) return new Set();
  const hw = highlight.toUpperCase().split(/\s+/);
  for (let i = 0; i + hw.length <= words.length; i++) {
    if (hw.every((w, j) => words[i + j] === w)) {
      return new Set(Array.from({ length: hw.length }, (_, k) => i + k));
    }
  }
  return new Set();
}
function wrapWords(words, fontSize, maxWidth, charW = 0.5) {
  const max = Math.floor(maxWidth / (fontSize * charW));
  const lines = []; let line = [];
  for (let i = 0; i < words.length; i++) {
    const test = [...line, i];
    if (test.map((k) => words[k]).join(" ").length > max && line.length) { lines.push(line); line = [i]; }
    else line = test;
  }
  if (line.length) lines.push(line);
  return lines;
}
function dekWrap(text, fontSize, maxWidth, charW = 0.52) {
  const max = Math.floor(maxWidth / (fontSize * charW));
  const ws = text.split(/\s+/); const lines = []; let c = "";
  for (const w of ws) { const x = c ? c + " " + w : w; if (x.length > max && c) { lines.push(c); c = w; } else c = x; }
  if (c) lines.push(c); return lines;
}

// ── Public: render the hero PNG ─────────────────────────────────────────────
// item = { category, date, headline, highlight, dek, imageBuffer }
export async function renderHero(item) {
  const fontFiles = await loadFonts();
  const b = item.imageBuffer;
  const mime =
    b[0] === 0x89 && b[1] === 0x50 ? "image/png" :
    b[0] === 0x47 && b[1] === 0x49 ? "image/gif" :
    b[0] === 0x52 && b[1] === 0x49 ? "image/webp" : "image/jpeg";
  const photoUri = `data:${mime};base64,` + b.toString("base64");

  const words = (item.headline || "").toUpperCase().split(/\s+/);
  const hset = highlightSet(words, item.highlight);
  const hlFS = 92, hlLH = 92;
  const lines = wrapWords(words, hlFS, W - 2 * M);

  // dek: wrap to max 2 lines; if it overflowed, end with an ellipsis (clean,
  // never mid-word).
  let dek = [];
  if (item.dek) {
    const all = dekWrap(item.dek, 27, W - 2 * M);
    dek = all.slice(0, 2);
    if (all.length > 2 && dek.length === 2) dek[1] = dek[1].replace(/[\s.,;:]+$/, "") + "…";
  }

  // Swipe affordance (SWIPE pill + corner chevrons) only makes sense for a
  // multi-slide carousel. Single-slide posts pass showNav:false to hide them.
  // (Photo attribution is surfaced in the caption, not burned onto the image.)
  const showNav = item.showNav !== false;

  const cat = (item.category || "Market News").toUpperCase();
  const catFS = 22, catPad = 26;
  const catW = cat.length * (catFS * 0.62 + 1) + catPad * 2; // account for tracking + bold caps
  const catH = 44;

  const footerY = H - 50;
  const dekLastBaseline = H - 104;
  const dekFirstBaseline = dekLastBaseline - (Math.max(dek.length, 1) - 1) * 36;
  const hlLastBaseline = (dek.length ? dekFirstBaseline : H - 96) - 56;
  const hlFirstBaseline = hlLastBaseline - (lines.length - 1) * hlLH;
  const pillY = hlFirstBaseline - hlFS - 26;

  const headlineSvg = lines.map((idxs, li) => {
    const spans = idxs.map((i) => `<tspan fill="${hset.has(i) ? SAGE : BONE}">${esc(words[i])} </tspan>`).join("");
    return `<text x="${M}" y="${hlFirstBaseline + li * hlLH}" font-family="${COND}" font-size="${hlFS}" font-weight="700" letter-spacing="-1">${spans}</text>`;
  }).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="38%" stop-color="${INK}" stop-opacity="0.08"/>
      <stop offset="62%" stop-color="${INK}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.96"/>
    </linearGradient>
    <linearGradient id="topfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <image href="${photoUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice"/>
  <rect x="0" y="0" width="${W}" height="240" fill="url(#topfade)"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>
  ${lockup(M, M, BONE)}
  ${showNav ? `<rect x="${W - M - 150}" y="${M}" width="150" height="44" rx="22" fill="none" stroke="${BONE}" stroke-width="2"/>
  <text x="${W - M - 73}" y="${M + 29}" font-family="${MONO}" font-size="20" font-weight="700" letter-spacing="2" fill="${BONE}" text-anchor="middle">SWIPE ›</text>` : ""}
  <rect x="${M}" y="${pillY}" width="${catW}" height="${catH}" fill="${SAGE}"/>
  <text x="${M + catPad}" y="${pillY + 30}" font-family="${SANS}" font-size="${catFS}" font-weight="700" letter-spacing="1" fill="${INK}">${esc(cat)}</text>
  ${headlineSvg}
  ${dek.map((ln, i) => `<text x="${M}" y="${dekFirstBaseline + i * 36}" font-family="${SANS}" font-size="27" font-weight="400" fill="${GRAY}">${esc(ln)}</text>`).join("\n")}
  ${showNav ? `<text x="${W - M}" y="${footerY}" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="2" fill="${SAGE}" text-anchor="end">›››</text>` : ""}
</svg>`;

  return new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: COND },
    fitTo: { mode: "width", value: W },
  }).render().asPng();
}

function mimeOf(b) {
  return b[0] === 0x89 && b[1] === 0x50 ? "image/png"
    : b[0] === 0x47 && b[1] === 0x49 ? "image/gif"
    : b[0] === 0x52 && b[1] === 0x49 ? "image/webp" : "image/jpeg";
}

// ── Detail slide (slide 2): photo top + solid ink zone with kicker + bullets ─
// item = { category, kicker, bullets[], idx, total, imageBuffer }
export async function renderDetailSlide(item) {
  const fontFiles = await loadFonts();
  const photoUri = `data:${mimeOf(item.imageBuffer)};base64,` + item.imageBuffer.toString("base64");
  const seam = 560;
  const kicker = (item.kicker || "What happened").toUpperCase();
  const idx = item.idx || 2, total = item.total || 2;

  let y = seam + 150;
  const bulletSvg = (item.bullets || []).filter(Boolean).map((b) => {
    const lines = dekWrap(b, 36, W - 2 * M - 44);
    const block = lines.map((ln, i) => `<text x="${M + 44}" y="${y + i * 48}" font-family="${SANS}" font-size="36" font-weight="500" fill="${BONE}">${esc(ln)}</text>`).join("\n");
    const sq = `<rect x="${M}" y="${y - 29}" width="19" height="19" fill="${SAGE}"/>`;
    y += lines.length * 48 + 40;
    return sq + "\n" + block;
  }).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="tf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${INK}" stop-opacity="0.5"/><stop offset="100%" stop-color="${INK}" stop-opacity="0"/></linearGradient></defs>
  <image href="${photoUri}" x="0" y="0" width="${W}" height="${seam + 30}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${W}" height="200" fill="url(#tf)"/>
  <rect x="0" y="${seam}" width="${W}" height="${H - seam}" fill="${INK}"/>
  ${lockup(M, M, BONE)}
  <text x="${W - M}" y="${M + 28}" font-family="${MONO}" font-size="22" font-weight="600" letter-spacing="2" fill="${BONE}" text-anchor="end">0${idx} / 0${total}</text>
  <text x="${M}" y="${seam + 78}" font-family="${COND}" font-size="68" font-weight="700" fill="${SAGE}" letter-spacing="-1">${esc(kicker)}</text>
  <line x1="${M}" y1="${seam + 102}" x2="${W - M}" y2="${seam + 102}" stroke="${SAGE}" stroke-width="1" opacity="0.35"/>
  ${bulletSvg}
  <text x="${W - M}" y="${H - 50}" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="2" fill="${SAGE}" text-anchor="end">›››</text>
</svg>`;

  return new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: COND },
    fitTo: { mode: "width", value: W },
  }).render().asPng();
}

// ── Image sourcing & helpers ────────────────────────────────────────────────
// Pick the scene from the HEADLINE first (so a hotel story shows a hotel, not a
// generic beach), then fall back to category. Handles both the studio category
// names and the enrichment category names.
const SUBJECT_RULES = [
  [/\b(hotel|resort|hospitality|rooms?|tourist)\b/i, "a striking modern beachfront resort and hotel buildings, pool and palms under a bright blue sky"],
  [/\b(flight|airline|route|airport|aviation|air\s|transatlantic|charter)\b/i, "a commercial airliner climbing through a bright, clear blue sky above the Atlantic ocean"],
  [/\b(port|harbou?r|shipping|cargo|maritime|cruise|ferry)\b/i, "a coastal port with cranes and ships in clear bright daylight"],
  [/\b(road|highway|bridge|construction|build|develop|crane|stadium)\b/i, "a coastal construction site with cranes and new buildings under a bright clear sky"],
  [/\b(property|real estate|apartment|villa|housing|residen|land)\b/i, "modern coastal residential architecture with sharp clean lines in bright daylight"],
  [/\b(bank|credit|mortgage|loan|finance|fiscal|econom|currency|investment|fund)\b/i, "a sleek modern business district building in clear daylight, low angle"],
  [/\b(tax|residency|visa|law|regulat|policy|government|statute|ministr|parliament)\b/i, "a bright modern civic or government building, strong architectural perspective"],
];
const CATEGORY_FALLBACK = {
  aviation: "a commercial airliner over the Atlantic in bright clear daylight",
  tourism: "a vibrant sunlit resort coastline under a bright blue sky",
  "real estate": "modern coastal residential architecture in bright daylight",
  policy: "a bright modern civic building, strong perspective",
  "policy & tax": "a bright modern civic building, strong perspective",
  infrastructure: "a coastal port or new development with cranes under a bright clear sky",
  economy: "a sleek modern business district building in clear daylight, low angle",
  "banking & credit": "a sleek modern business district building in clear daylight, low angle",
  "market news": "a bright sunlit aerial of a tropical Atlantic island town and coastline",
};

export function buildImagePrompt(item) {
  const headline = item.headline || "";
  let subject = null;
  for (const [re, scene] of SUBJECT_RULES) {
    if (re.test(headline)) { subject = scene; break; }
  }
  if (!subject) subject = CATEGORY_FALLBACK[(item.category || "").toLowerCase()] || CATEGORY_FALLBACK["market news"];
  // NOTE: do NOT put the headline text in the prompt — gpt-image renders quoted
  // words as actual text in the scene (e.g. a ghosted "CAPE VERDE" appeared in
  // the image). The subject is already derived from the headline above; describe
  // only the scene.
  return [
    "A bold, editorial news photograph for a Cape Verde real-estate market story.",
    `Depict ${subject}, set in Cape Verde (an Atlantic island nation).`,
    // Bright by default — the old "dramatic lighting" wording made every image
    // dark, forcing a manual "more light" tweak each time.
    "Bright, clear natural daylight with an airy, optimistic mood — luminous, not dark or moody.",
    // Leave the lower third calm so the headline overlay reads cleanly.
    "Editorial composition for a vertical poster: keep the main subject in the upper two-thirds and leave the lower third calm and uncluttered (open sky, sea, or plain ground) as negative space for a headline overlaid later.",
    "Photorealistic, rich colour, magazine-cover polish.",
    // Strong no-text guard — gpt-image otherwise hallucinates words/signage.
    "CRITICAL: this is a pure photographic scene with absolutely NO text, letters, words, numbers, captions, labels, watermarks, signage, posters or logos anywhere in the frame. No recognizable real landmarks, no identifiable faces.",
  ].join(" ");
}

export function suggestCaption(item) {
  const tags = ["#capeverde", "#caboverde", "#realestate", "#marketnews", "#" + (item.category || "").toLowerCase().replace(/[^a-z]/g, "")];
  const parts = [`${item.headline}.`];
  if (item.body && item.body.trim()) parts.push(item.body.trim());
  else if (item.dek && item.dek.trim()) parts.push(item.dek.trim());
  if (item.sourceName) parts.push(`Source: ${item.sourceName}`);
  parts.push(tags.join(" "));
  return parts.join("\n\n");
}

// Generate an AI background via OpenAI gpt-image-1 (relevant to the news).
export async function generateAiImage(item, quality = "high") {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  const prompt = (item.aiPrompt && item.aiPrompt.trim()) || buildImagePrompt(item);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1536", quality, n: 1 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return { buffer: Buffer.from(j.data[0].b64_json, "base64"), prompt };
}

// Solid placeholder when no AI / URL image is available.
export async function placeholderImage() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#2D4A42"/><text x="${W / 2}" y="${H / 2}" font-family="monospace" font-size="30" fill="${SAGE}" text-anchor="middle" opacity="0.8">[ no image ]</text></svg>`;
  return new Resvg(svg).render().asPng();
}
