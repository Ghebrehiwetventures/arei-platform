#!/usr/bin/env node
/**
 * AREI Instagram news-post mockups — direction explorer.
 *
 * Renders the SAME example headline in four visual directions at 1080×1350
 * (Instagram portrait) so a human can pick a direction by looking, not guessing.
 *
 * Pure SVG -> PNG via @resvg/resvg-js with real IBM Plex Mono. No AI image API
 * is wired up in this environment, so photo/AI zones are shown as labelled
 * placeholders to communicate LAYOUT, not final imagery.
 *
 * Run: node render.js   (writes out/A.png … out/D.png)
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// ── Canvas ────────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;
const M = 80; // outer margin

// ── Brand tokens (canonical 8) ──────────────────────────────────────────────
const INK = '#0A0A0A';
const PAPER = '#FFFFFF';
const BONE = '#FAFAFA';
const OFFWHITE = '#F2F0EC';
const SAGE = '#8ECFBF';
const SAGE_DEEP = '#2D4A42';
const GRAY = '#888888';

// ── Example content (the news post we are designing for) ────────────────────
const EYEBROW = 'MARKET NEWS · CABO VERDE';
const HEADLINE = 'Ny flyglinje lanserad mellan Kap Verde och Brasilien';
const DATE = '4 JUN 2026';
const SOURCE = 'Baserat på monitorerade tillkännagivanden · arei.so';

const FONT = 'IBM Plex Mono';
const CHAR_W = 0.6; // IBM Plex Mono advance width per em

// ── Helpers ─────────────────────────────────────────────────────────────────
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Greedy word wrap for a monospace face given a pixel width and font size.
function wrap(text, fontSize, maxWidth) {
  const maxChars = Math.floor(maxWidth / (CHAR_W * fontSize));
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const cand = line ? line + ' ' + w : w;
    if (cand.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = cand;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function lines(text, fontSize, weight, fill, x, yStart, lh, attrs = '') {
  return text
    .map(
      (ln, i) =>
        `<text x="${x}" y="${yStart + i * lh}" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" ${attrs}>${esc(ln)}</text>`
    )
    .join('\n');
}

// D·Layers mark — canonical geometry (viewBox 0 0 24), scaled & colored.
function mark(x, y, size, stroke, fill) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${stroke}" stroke-width="1.4" stroke-linecap="square" fill="none">
    <rect x="3" y="3" width="14" height="14"/>
    <rect x="6.5" y="6.5" width="14" height="14"/>
    <rect x="10" y="10" width="9" height="9" fill="${fill}" stroke="none"/>
  </g>`;
}

function frame(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
}

// Labelled placeholder standing in for a future photo / AI image zone.
function photoZone(x, y, w, h, label) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${SAGE_DEEP}"/>
    <text x="${x + w / 2}" y="${y + h / 2}" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="3" fill="${SAGE}" text-anchor="middle" opacity="0.85">${esc(label)}</text>
    <text x="${x + w / 2}" y="${y + h / 2 + 34}" font-family="${FONT}" font-size="13" font-weight="400" letter-spacing="1" fill="${SAGE}" text-anchor="middle" opacity="0.55">platshållare — verklig bild/AI i steg 2</text>`;
}

// ── Direction N — Clean "news card" (breaking-news structure, no noise) ─────
// One small tag + one dominant headline + quiet meta. Two themes.
function newsCard({ dark }) {
  const bg = dark ? INK : BONE;
  const head = dark ? BONE : INK;
  const meta = dark ? GRAY : GRAY;
  const tagText = dark ? INK : INK; // ink text on sage chip in both themes
  const markStroke = dark ? SAGE : INK;
  const markFill = dark ? SAGE : INK;
  const rule = dark ? SAGE : INK;
  const ruleOp = dark ? 0.4 : 0.15;

  const TAG = 'MARKET NEWS · CABO VERDE';
  const tagFS = 18;
  const chipW = TAG.length * (tagFS * CHAR_W + 2.4) + 56;

  const hl = wrap(HEADLINE, 62, W - 2 * M);
  const lh = 78;
  // vertically center the headline block in the open middle area
  const blockTop = 360;
  const hlY = blockTop + 60;

  return frame(`
    <rect width="${W}" height="${H}" fill="${bg}"/>

    <!-- tag (the only "news" signal we keep from the genre) -->
    <rect x="${M}" y="${M}" width="${chipW}" height="46" fill="${SAGE}"/>
    <text x="${M + 28}" y="${M + 30}" font-family="${FONT}" font-size="${tagFS}" font-weight="600" letter-spacing="2.4" fill="${tagText}">${esc(TAG)}</text>
    <text x="${W - M}" y="${M + 31}" font-family="${FONT}" font-size="20" font-weight="500" letter-spacing="3" fill="${meta}" text-anchor="end">${esc(DATE)}</text>

    <!-- dominant headline -->
    ${lines(hl, 62, 500, head, M, hlY, lh, 'letter-spacing="-1.5"')}

    <!-- quiet footer -->
    <line x1="${M}" y1="${H - 150}" x2="${W - M}" y2="${H - 150}" stroke="${rule}" stroke-width="1" opacity="${ruleOp}"/>
    ${mark(M, H - 116, 52, markStroke, markFill)}
    <text x="${M + 72}" y="${H - 90}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${dark ? SAGE : SAGE_DEEP}">AFRICA REAL ESTATE INDEX</text>
    <text x="${M + 72}" y="${H - 64}" font-family="${FONT}" font-size="16" font-weight="400" letter-spacing="0.5" fill="${meta}">${esc(SOURCE)}</text>`);
}

// ── Direction A — Strict typographic, ink ground ────────────────────────────
function dirA() {
  const hl = wrap(HEADLINE, 60, W - 2 * M);
  const hlY = 560;
  const lh = 76;
  return frame(`
    <rect width="${W}" height="${H}" fill="${INK}"/>
    ${mark(M, M, 92, SAGE, SAGE)}
    <text x="${W - M}" y="${M + 34}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="3" fill="${GRAY}" text-anchor="end">${esc(DATE)}</text>
    <line x1="${M}" y1="${M + 130}" x2="${W - M}" y2="${M + 130}" stroke="${SAGE}" stroke-width="1" opacity="0.5"/>
    <text x="${M}" y="${hlY - 64}" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="5" fill="${SAGE}">${esc(EYEBROW)}</text>
    ${lines(hl, 60, 500, BONE, M, hlY, lh, 'letter-spacing="-1"')}
    <line x1="${M}" y1="${H - 150}" x2="${W - M}" y2="${H - 150}" stroke="${SAGE}" stroke-width="1" opacity="0.3"/>
    <text x="${M}" y="${H - 108}" font-family="${FONT}" font-size="20" font-weight="400" letter-spacing="0.5" fill="${GRAY}">${esc(SOURCE)}</text>
    <text x="${M}" y="${H - 72}" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="4" fill="${SAGE}">AFRICA REAL ESTATE INDEX · MARKET 01</text>`);
}

// ── Direction B — Editorial split (photo top, paper panel bottom) ───────────
function dirB() {
  const splitY = 760;
  const hl = wrap(HEADLINE, 50, W - 2 * M);
  const hlY = splitY + 150;
  const lh = 64;
  return frame(`
    <rect width="${W}" height="${H}" fill="${BONE}"/>
    ${photoZone(0, 0, W, splitY, '[ FOTO / AI-BILD ]')}
    ${mark(M, M, 72, SAGE, SAGE)}
    <text x="${W - M}" y="${M + 30}" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="3" fill="${SAGE}" text-anchor="end" opacity="0.85">${esc(DATE)}</text>
    <text x="${M}" y="${splitY + 78}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="5" fill="${SAGE_DEEP}">${esc(EYEBROW)}</text>
    ${lines(hl, 50, 500, INK, M, hlY, lh, 'letter-spacing="-0.5"')}
    <line x1="${M}" y1="${H - 132}" x2="${W - M}" y2="${H - 132}" stroke="${INK}" stroke-width="1" opacity="0.15"/>
    <text x="${M}" y="${H - 92}" font-family="${FONT}" font-size="18" font-weight="400" fill="${GRAY}">${esc(SOURCE)}</text>
    <text x="${W - M}" y="${H - 92}" font-family="${FONT}" font-size="18" font-weight="600" letter-spacing="3" fill="${SAGE_DEEP}" text-anchor="end">arei.so</text>`);
}

// ── Direction C — Full-bleed image + flat ink overlay ───────────────────────
function dirC() {
  const hl = wrap(HEADLINE, 58, W - 2 * M);
  const hlY = 980;
  const lh = 74;
  return frame(`
    ${photoZone(0, 0, W, H, '[ FOTO / AI-BILD — HELBILD ]')}
    <rect width="${W}" height="${H}" fill="${INK}" opacity="0.55"/>
    <rect x="0" y="${H - 620}" width="${W}" height="620" fill="${INK}" opacity="0.45"/>
    ${mark(M, M, 84, SAGE, SAGE)}
    <text x="${W - M}" y="${M + 32}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="3" fill="${BONE}" text-anchor="end">${esc(DATE)}</text>
    <text x="${M}" y="${hlY - 60}" font-family="${FONT}" font-size="24" font-weight="600" letter-spacing="5" fill="${SAGE}">${esc(EYEBROW)}</text>
    ${lines(hl, 58, 500, BONE, M, hlY, lh, 'letter-spacing="-1"')}
    <text x="${M}" y="${H - 92}" font-family="${FONT}" font-size="19" font-weight="400" letter-spacing="0.5" fill="${OFFWHITE}" opacity="0.85">${esc(SOURCE)}</text>`);
}

// ── Direction D — Punchy caption-card (reach-optimized, still Plex Mono) ─────
function dirD() {
  const hl = wrap(HEADLINE, 78, W - 2 * M);
  const hlY = 640;
  const lh = 92;
  // sage tag chip sized to eyebrow text (20px font + 3px letter-spacing)
  const chipW = EYEBROW.length * (20 * CHAR_W + 3) + 64;
  return frame(`
    <rect width="${W}" height="${H}" fill="${INK}"/>
    <rect x="0" y="0" width="16" height="${H}" fill="${SAGE}"/>
    <rect x="${M}" y="${M}" width="${chipW}" height="50" fill="${SAGE}"/>
    <text x="${M + 28}" y="${M + 33}" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="3" fill="${INK}">${esc(EYEBROW)}</text>
    <text x="${W - M}" y="${M + 35}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="3" fill="${GRAY}" text-anchor="end">${esc(DATE)}</text>
    ${lines(hl, 78, 500, BONE, M, hlY, lh, 'letter-spacing="-2"')}
    <line x1="${M}" y1="${H - 170}" x2="${W - M}" y2="${H - 170}" stroke="${SAGE}" stroke-width="2" opacity="0.6"/>
    <text x="${M}" y="${H - 122}" font-family="${FONT}" font-size="19" font-weight="400" fill="${GRAY}">${esc(SOURCE)}</text>
    ${mark(M, H - 96, 56, SAGE, SAGE)}
    <text x="${M + 76}" y="${H - 60}" font-family="${FONT}" font-size="20" font-weight="600" letter-spacing="3" fill="${SAGE}">AREI · MARKET 01</text>`);
}

// ── Render ──────────────────────────────────────────────────────────────────
const fontFiles = [
  path.join(__dirname, 'fonts/PlexMono-Regular.ttf'),
  path.join(__dirname, 'fonts/PlexMono-Medium.ttf'),
  path.join(__dirname, 'fonts/PlexMono-SemiBold.ttf'),
];

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const directions = {
  'N-dark': newsCard({ dark: true }),
  'N-light': newsCard({ dark: false }),
  A: dirA(),
  B: dirB(),
  C: dirC(),
  D: dirD(),
};

for (const [name, svg] of Object.entries(directions)) {
  const resvg = new Resvg(svg, {
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: FONT },
    fitTo: { mode: 'width', value: W },
  });
  const png = resvg.render().asPng();
  const out = path.join(outDir, `${name}.png`);
  fs.writeFileSync(out, png);
  console.log(`Wrote ${out} (${png.length} bytes)`);
}
console.log('Done.');
