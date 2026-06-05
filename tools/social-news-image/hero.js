#!/usr/bin/env node
/**
 * hero.js — Cape Verde Real Estate Index · Instagram news hero (v1).
 *
 * renderHero(item) -> PNG buffer (1080×1350).
 * item = { category, date, headline, highlight, dek, imageBuffer }
 *
 * Full-bleed photo + ink gradient fade (darker at bottom).
 *   top-left:  D-Layers mark + CAPE VERDE / REAL ESTATE / INDEX lockup (canonical)
 *   top-right: SWIPE › pill
 *   sage category pill above the headline
 *   headline: IBM Plex Sans Condensed Bold, UPPERCASE, one phrase in sage
 *   dek: one muted line
 *   footer: capeverderealestateindex.com  ·  ›››
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1080, H = 1350, M = 72;
const INK = '#0A0A0A', BONE = '#FAFAFA', SAGE = '#8ECFBF', GRAY = '#b9b9b9';
const MONO = 'IBM Plex Mono', SANS = 'IBM Plex Sans', COND = 'IBM Plex Sans Condensed';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Canonical D-Layers mark (docs/brand/assets/d-layers-mark.svg)
function mark(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color}" stroke-width="1.4" stroke-linecap="square" fill="none"><rect x="3" y="3" width="14" height="14"/><rect x="6.5" y="6.5" width="14" height="14"/><rect x="10" y="10" width="9" height="9" fill="${color}" stroke="none"/></g>`;
}

// CVREI three-line ceremonial lockup (canonical: manual-core.jsx PrimaryLockup).
// CAPE VERDE is weight 600; REAL ESTATE / INDEX are weight 400 @ 0.85 opacity.
function lockup(x, y, color, h = 46) {
  const t = Math.round(h * 0.34);          // wordmark size = mark height × 0.34
  const tx = x + h + 10;                    // mark + gap
  const ls = (t * 0.04).toFixed(2);         // 0.04em tracking
  const adv = Math.round(t * 1.2);          // line advance (lineHeight ~1.0 + gap)
  const y1 = y + t - 1;
  return `${mark(x, y, h, color)}
  <g font-family="${MONO}" font-size="${t}" letter-spacing="${ls}" fill="${color}">
    <text x="${tx}" y="${y1}" font-weight="600">CAPE VERDE</text>
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
    if (test.map(k => words[k]).join(' ').length > max && line.length) { lines.push(line); line = [i]; }
    else line = test;
  }
  if (line.length) lines.push(line);
  return lines;
}

function dekWrap(text, fontSize, maxWidth, charW = 0.52) {
  const max = Math.floor(maxWidth / (fontSize * charW));
  const ws = text.split(/\s+/); const lines = []; let c = '';
  for (const w of ws) { const x = c ? c + ' ' + w : w; if (x.length > max && c) { lines.push(c); c = w; } else c = x; }
  if (c) lines.push(c); return lines;
}

function renderHero(item) {
  const photoUri = 'data:image/jpeg;base64,' + item.imageBuffer.toString('base64');

  const words = item.headline.toUpperCase().split(/\s+/);
  const hset = highlightSet(words, item.highlight);
  const hlFS = 92, hlLH = 92;
  const lines = wrapWords(words, hlFS, W - 2 * M);
  const dek = dekWrap(item.dek, 27, W - 2 * M).slice(0, 2);
  const cat = item.category.toUpperCase();
  const catFS = 22, catW = cat.length * (catFS * 0.6) + 44, catH = 44;

  // bottom-anchored stack: footer → dek → headline → pill
  const footerY = H - 50;
  const dekLastBaseline = H - 104;
  const dekFirstBaseline = dekLastBaseline - (dek.length - 1) * 36;
  const hlLastBaseline = dekFirstBaseline - 56;
  const hlFirstBaseline = hlLastBaseline - (lines.length - 1) * hlLH;
  const pillY = hlFirstBaseline - hlFS - 26;

  const headlineSvg = lines.map((idxs, li) => {
    const spans = idxs.map(i => `<tspan fill="${hset.has(i) ? SAGE : BONE}">${esc(words[i])} </tspan>`).join('');
    return `<text x="${M}" y="${hlFirstBaseline + li * hlLH}" font-family="${COND}" font-size="${hlFS}" font-weight="700" letter-spacing="-1">${spans}</text>`;
  }).join('\n');

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

  <image href="${photoUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${W}" height="240" fill="url(#topfade)"/>
  <rect width="${W}" height="${H}" fill="url(#fade)"/>

  ${lockup(M, M, BONE)}
  <rect x="${W - M - 150}" y="${M}" width="150" height="44" rx="22" fill="none" stroke="${BONE}" stroke-width="2"/>
  <text x="${W - M - 73}" y="${M + 29}" font-family="${MONO}" font-size="20" font-weight="700" letter-spacing="2" fill="${BONE}" text-anchor="middle">SWIPE ›</text>

  <rect x="${M}" y="${pillY}" width="${catW}" height="${catH}" fill="${SAGE}"/>
  <text x="${M + 22}" y="${pillY + 30}" font-family="${SANS}" font-size="${catFS}" font-weight="700" letter-spacing="1" fill="${INK}">${esc(cat)}</text>

  ${headlineSvg}

  ${dek.map((ln, i) => `<text x="${M}" y="${dekFirstBaseline + i * 36}" font-family="${SANS}" font-size="27" font-weight="400" fill="${GRAY}">${esc(ln)}</text>`).join('\n')}

  <text x="${M}" y="${footerY}" font-family="${MONO}" font-size="18" font-weight="500" letter-spacing="1" fill="${GRAY}">capeverderealestateindex.com</text>
  <text x="${W - M}" y="${footerY}" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="2" fill="${SAGE}" text-anchor="end">›››</text>
</svg>`;

  const fontFiles = ['fonts/PlexMono-Regular.ttf','fonts/PlexMono-Medium.ttf','fonts/PlexMono-SemiBold.ttf','fonts/PlexSans-Regular.ttf','fonts/PlexSans-SemiBold.ttf','fonts/PlexSans-Bold.ttf','fonts/PlexSansCond-Bold.ttf','fonts/PlexSansCond-SemiBold.ttf'].map(f => path.join(__dirname, f));
  return new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: COND }, fitTo: { mode: 'width', value: W } }).render().asPng();
}

module.exports = { renderHero };

if (require.main === module) {
  const item = {
    category: 'Aviation',
    date: 'JUN 4, 2026',
    headline: 'New direct flight links Cabo Verde and Brazil',
    highlight: 'Cabo Verde and Brazil',
    dek: 'First scheduled link between the two countries, planned from August 2026.',
    imageBuffer: fs.readFileSync(path.join(__dirname, 'photo.jpg')),
  };
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out/v1-draft.png'), renderHero(item));
  console.log('Wrote out/v1-draft.png');
}
