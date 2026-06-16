/**
 * carouselRender.js — Social Carousel Builder renderer (AREI / CVREI).
 *
 * Renders branded social-carousel slides as PNGs (SVG → resvg) in two
 * formats: 4:5 (1080×1350, Instagram/Facebook/Threads/LinkedIn) and 9:16
 * (1080×1920, TikTok Photo Mode / Reels / Stories). Each format has its own
 * layout rules — 9:16 is a proper recomposition with more vertical breathing
 * room and a bottom safe-zone for platform UI, not a stretched 4:5.
 *
 * Self-contained: loads Inter (400/500/600) from the jsDelivr fontsource CDN
 * to /tmp and caches it, so it does not depend on newsHero.js. Brand system =
 * Inter, the CVREI D·Layers lockup, and the sage/ink/bone palette.
 *
 * Pure: callers pass already-fetched image buffers (the API proxies listing
 * photos through wsrv.nl first), so this module does no network I/O beyond the
 * one-time font fetch.
 */
import { Resvg } from "@resvg/resvg-js";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const INK = "#0A0A0A", BONE = "#FAFAFA", SAGE = "#8ECFBF", SAGE_DEEP = "#2D4A42";
const DIM = "#cfcfcf", MUTED = "#9a9a9a", FAINT = "#777777";

// Social-native surfaces. Black is no longer the default background — text
// slides default to a light bone (editorial) or deep-teal surface, so the feed
// reads "market-intelligence magazine", not "investor deck". Ink stays for
// text and the listing-photo scrim, not as the dominant background.
const SURFACES = {
  ink:      { bg: INK,       fg: BONE, sub: DIM,       accent: SAGE,      kicker: SAGE,      lock: BONE },
  deepteal: { bg: SAGE_DEEP, fg: BONE, sub: "#bcd2cb", accent: SAGE,      kicker: SAGE,      lock: BONE },
  bone:     { bg: BONE,      fg: INK,  sub: "#6b6b6b", accent: SAGE_DEEP, kicker: SAGE_DEEP, lock: INK },
};
const DEFAULT_SURFACE = { cover: "deepteal", statement: "bone", priceCheck: "deepteal", cta: "bone" };
// Light text used over a photo (cover-with-photo, listing cards).
const ON_PHOTO = { fg: BONE, sub: DIM, accent: SAGE, kicker: SAGE, lock: BONE };

// Layout per output format. bottomSafe = clear space kept at the bottom (9:16
// leaves room for TikTok/Reels UI: caption, action rail). Listing cards are
// photo-first — full-bleed image + a bottom gradient, no solid info band — so
// the photo carries the post.
const FORMATS = {
  "4:5":  { W: 1080, H: 1350, M: 72, lockH: 44, bottomSafe: 86 },
  "9:16": { W: 1080, H: 1920, M: 80, lockH: 46, bottomSafe: 300 },
};
export const FORMAT_KEYS = Object.keys(FORMATS);

// ── Fonts (Inter 400/500/600, fetched once, cached) ─────────────────────────
const FONT_URLS = [400, 500, 600].map(
  (w) => `https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-${w}-normal.ttf`
);
let FONT_FILES = null;
async function loadFonts() {
  if (FONT_FILES) return FONT_FILES;
  const dir = path.join(os.tmpdir(), "cvrei-carousel-fonts");
  fs.mkdirSync(dir, { recursive: true });
  FONT_FILES = await Promise.all(
    FONT_URLS.map(async (u, i) => {
      const file = path.join(dir, `inter-${i}.ttf`);
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

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function mimeOf(b) {
  return b[0] === 0x89 && b[1] === 0x50 ? "image/png"
    : b[0] === 0x47 && b[1] === 0x49 ? "image/gif"
    : b[0] === 0x52 && b[1] === 0x49 ? "image/webp" : "image/jpeg";
}
const dataUri = (buf) => `data:${mimeOf(buf)};base64,` + buf.toString("base64");

// CVREI D·Layers mark (canonical geometry — do not redraw).
function mark(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color}" stroke-width="1.4" stroke-linecap="square" fill="none"><rect x="3" y="3" width="14" height="14"/><rect x="6.5" y="6.5" width="14" height="14"/><rect x="10" y="10" width="9" height="9" fill="${color}" stroke="none"/></g>`;
}

// Three-line CVREI lockup in Inter (CAPE VERDE 600, the rest 400).
function lockup(x, y, color, h) {
  const t = 15, tx = x + h + 12;
  return `${mark(x, y, h, color)}
  <g font-family="Inter" fill="${color}">
    <text x="${tx}" y="${y + 16}" font-size="${t}" font-weight="600" letter-spacing="1.6">CAPE VERDE</text>
    <text x="${tx}" y="${y + 34}" font-size="${t}" font-weight="400" letter-spacing="1.6" opacity="0.72">REAL ESTATE</text>
    <text x="${tx}" y="${y + 52}" font-size="${t}" font-weight="400" letter-spacing="1.6" opacity="0.72">INDEX</text>
  </g>`;
}

// Word-wrap by char-width estimate (Inter mixed-case ≈ 0.56 of font size).
function wrap(words, fontSize, maxWidth, charW = 0.56) {
  const max = Math.max(1, Math.floor(maxWidth / (fontSize * charW)));
  const lines = []; let line = [];
  for (let i = 0; i < words.length; i++) {
    const test = [...line, words[i]];
    if (test.join(" ").length > max && line.length) { lines.push(line); line = [words[i]]; }
    else line = test;
  }
  if (line.length) lines.push(line);
  return lines;
}

// Pick the largest grade from a ladder whose wrap fits within maxLines.
function autofit(text, maxWidth, ladder, maxLines, charW = 0.56) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  let fontSize = ladder[ladder.length - 1];
  let lines = wrap(words, fontSize, maxWidth, charW);
  for (const fs of ladder) {
    const cand = wrap(words, fs, maxWidth, charW);
    if (cand.length <= maxLines) { fontSize = fs; lines = cand; break; }
  }
  return { fontSize, lines };
}

// Indices of the words that make up `accent` (contiguous, case-insensitive),
// so a short phrase like "€100k" can be coloured sage inside a headline.
function accentSet(words, accent) {
  if (!accent) return new Set();
  const a = String(accent).trim().toUpperCase().split(/\s+/);
  const up = words.map((w) => w.toUpperCase());
  for (let i = 0; i + a.length <= up.length; i++) {
    if (a.every((w, j) => up[i + j] === w)) {
      return new Set(Array.from({ length: a.length }, (_, k) => i + k));
    }
  }
  return new Set();
}

// Render a bottom-anchored headline block (kicker + wrapped, optionally
// accented, title). Returns { svg, topBaseline } so callers can place a kicker
// above it. `lastBaseline` is the baseline of the final line.
function headlineBlock({ text, x, lastBaseline, fontSize, lineHeight, weight, accent, maxWidth, fgColor = BONE, accentColor = SAGE }) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = wrap(words, fontSize, maxWidth);
  const aset = accentSet(words, accent);
  const ls = (fontSize * -0.02).toFixed(2);
  const firstBaseline = lastBaseline - (lines.length - 1) * lineHeight;
  let wi = 0;
  const svg = lines.map((lineWords, li) => {
    const spans = lineWords.map(() => {
      const idx = wi++;
      return `<tspan fill="${aset.has(idx) ? accentColor : fgColor}">${esc(words[idx])} </tspan>`;
    }).join("");
    return `<text x="${x}" y="${firstBaseline + li * lineHeight}" font-family="Inter" font-size="${fontSize}" font-weight="${weight}" letter-spacing="${ls}">${spans}</text>`;
  }).join("\n");
  return { svg, topBaseline: firstBaseline };
}

function render(svg, W) {
  return new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Inter" },
    fitTo: { mode: "width", value: W },
  }).render().asPng();
}

function defs() {
  return `<defs>
    <linearGradient id="bl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="${INK}" stop-opacity="0"/>
      <stop offset="0.80" stop-color="${INK}" stop-opacity="0.34"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0.9"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${INK}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

const kicker = (x, y, text, color = SAGE) =>
  `<text x="${x}" y="${y}" font-family="Inter" font-size="22" font-weight="600" letter-spacing="3.5" fill="${color}">${esc(text)}</text>`;

const counter = (x, y, idx, total, color = BONE) =>
  `<text x="${x}" y="${y}" font-family="Inter" font-size="17" font-weight="600" letter-spacing="2" fill="${color}" text-anchor="end">${idx} / ${total}</text>`;

/**
 * Render one carousel slide to a PNG buffer.
 *
 * @param {object} slide  { type, format, ...fields, imageBuffer? }
 *   type: "cover" | "statement" | "priceCheck" | "listing" | "cta"
 *   format: "4:5" | "9:16"
 * @returns {Promise<Buffer>}
 */
export async function renderSlide(slide) {
  await loadFonts();
  const fmt = FORMATS[slide.format];
  if (!fmt) throw new Error(`Unknown format: ${slide.format}`);
  const { W, H, M, lockH, bottomSafe } = fmt;
  const innerW = W - 2 * M;
  const hasPhoto = Boolean(slide.imageBuffer);
  const photoCover = slide.type === "cover" && hasPhoto;
  const onPhoto = slide.type === "listing" || photoCover;

  // Resolve the surface. Photo slides use light-on-photo text; everything else
  // uses a light default surface (bone / deep-teal), never pure black by default.
  const S = onPhoto ? ON_PHOTO : SURFACES[slide.surface || DEFAULT_SURFACE[slide.type] || "ink"];

  let bg;
  if (onPhoto) {
    // Photo-first: full-bleed image + a light bottom scrim (top ~55% stays
    // bright; only the very bottom darkens enough for text).
    bg = `<rect width="${W}" height="${H}" fill="#16384a"/>
      ${hasPhoto ? `<image href="${dataUri(slide.imageBuffer)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>` : ""}
      <rect width="${W}" height="220" fill="url(#t)"/>
      <rect width="${W}" height="${H}" fill="url(#bl)"/>`;
  } else {
    bg = `<rect width="${W}" height="${H}" fill="${S.bg}"/>`;
  }

  let body = "";

  if (slide.type === "listing") {
    const total = String(slide.total || 5).padStart(2, "0");
    const idx = String(slide.idx || 1).padStart(2, "0");
    // Bottom-anchored text block over the gradient, stacked bottom-up:
    // kicker · price · specs · location.
    const priceFit = autofit(slide.price || "", innerW, [96, 84, 74, 64], 1, 0.6);
    let y = H - bottomSafe;
    let locY = null, specsY = null;
    if (slide.location) { locY = y; y -= 44; }
    if (slide.specs) { specsY = y; y -= 60; }
    const priceY = y;
    const kickY = priceY - priceFit.fontSize - 22;
    const src = slide.source ? ` · ${slide.source}` : "";
    body = `${lockup(M, M, S.lock, lockH)}
      ${counter(W - M, M + 28, idx, total, S.lock)}
      ${kicker(M, kickY, `// FOR SALE${src}`, S.kicker)}
      <text x="${M}" y="${priceY}" font-family="Inter" font-size="${priceFit.fontSize}" font-weight="600" letter-spacing="-2" fill="${S.fg}">${esc(slide.price)}</text>
      ${specsY != null ? `<text x="${M}" y="${specsY}" font-family="Inter" font-size="30" font-weight="400" fill="${S.sub}">${esc(slide.specs)}</text>` : ""}
      ${locY != null ? `<text x="${M}" y="${locY}" font-family="Inter" font-size="30" font-weight="400" fill="${MUTED}">${esc(slide.location)}</text>` : ""}`;
  } else if (slide.type === "cover") {
    const last = H - bottomSafe - (slide.dek ? 60 : 0);
    const ladder = slide.format === "9:16" ? [110, 96, 84, 74, 64] : [98, 86, 76, 66, 58];
    const fit = autofit(slide.title || "", innerW, ladder, 3);
    const hb = headlineBlock({ text: slide.title, x: M, lastBaseline: last, fontSize: fit.fontSize, lineHeight: Math.round(fit.fontSize * 1.04), weight: 600, accent: slide.accent, maxWidth: innerW, fgColor: S.fg, accentColor: S.accent });
    body = `${lockup(M, M, S.lock, lockH)}
      ${kicker(M, hb.topBaseline - fit.fontSize - 26, slide.kicker || "// CABO VERDE", S.kicker)}
      ${hb.svg}
      ${slide.dek ? `<text x="${M}" y="${H - bottomSafe}" font-family="Inter" font-size="28" font-weight="400" fill="${S.sub}">${esc(slide.dek)}</text>` : ""}`;
  } else if (slide.type === "statement" || slide.type === "priceCheck") {
    const ladder = slide.format === "9:16" ? [84, 74, 66, 58] : [72, 64, 56, 50];
    const fit = autofit(slide.text || "", innerW, ladder, 4);
    const hb = headlineBlock({ text: slide.text, x: M, lastBaseline: H - bottomSafe, fontSize: fit.fontSize, lineHeight: Math.round(fit.fontSize * 1.12), weight: 600, accent: slide.accent, maxWidth: innerW, fgColor: S.fg, accentColor: S.accent });
    body = `${lockup(M, M, S.lock, lockH)}
      ${kicker(M, hb.topBaseline - fit.fontSize - 26, slide.kicker || (slide.type === "priceCheck" ? "// PRICE CHECK" : "// THE MOMENT"), S.kicker)}
      ${hb.svg}`;
  } else if (slide.type === "cta") {
    const urlY = H - bottomSafe;
    const subY = urlY - 64;
    const ladder = slide.format === "9:16" ? [86, 76, 66] : [74, 64, 56];
    const fit = autofit(slide.title || "See what it actually costs.", innerW, ladder, 3);
    const hb = headlineBlock({ text: slide.title || "See what it actually costs.", x: M, lastBaseline: subY - 60, fontSize: fit.fontSize, lineHeight: Math.round(fit.fontSize * 1.06), weight: 600, accent: slide.accent, maxWidth: innerW, fgColor: S.fg, accentColor: S.accent });
    body = `${lockup(M, M, S.lock, lockH)}
      ${kicker(M, hb.topBaseline - fit.fontSize - 26, slide.kicker || "// THE INDEX", S.kicker)}
      ${hb.svg}
      <text x="${M}" y="${subY}" font-family="Inter" font-size="27" font-weight="400" fill="${S.sub}">${esc(slide.sub || "Live Cape Verde listings · structured property data.")}</text>
      <text x="${M}" y="${urlY}" font-family="Inter" font-size="24" font-weight="600" letter-spacing="0.5" fill="${S.fg}">${esc(slide.url || "capeverderealestateindex.com")}</text>`;
  } else {
    throw new Error(`Unknown slide type: ${slide.type}`);
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${defs()}
${bg}
${body}
</svg>`;

  return render(svg, W);
}
