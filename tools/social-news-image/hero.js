#!/usr/bin/env node
/**
 * hero.js — AREI Instagram news hero (v1).
 *
 * renderHero(item) -> PNG buffer (1080×1350).
 * item = { category, date, headline, highlight, dek, imageBuffer }
 *
 * Layout (Business Bulls-validated, AREI brand):
 *   photo top ~58%  →  solid ink text zone
 *   top: D-Layers mark + AREI  ·  SWIPE › pill
 *   seam: sage category pill
 *   headline: Plex Sans Condensed Bold, UPPERCASE, one phrase in sage
 *   dek: one muted italic line
 *   footer: AFRICA REAL ESTATE INDEX  ·  ›››
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1080, H = 1350, M = 72;
const INK = '#0A0A0A', BONE = '#FAFAFA', SAGE = '#8ECFBF', GRAY = '#9a9a9a';
const MONO = 'IBM Plex Mono', SANS = 'IBM Plex Sans', COND = 'IBM Plex Sans Condensed';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function mark(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color}" stroke-width="1.4" stroke-linecap="square" fill="none"><rect x="3" y="3" width="14" height="14"/><rect x="6.5" y="6.5" width="14" height="14"/><rect x="10" y="10" width="9" height="9" fill="${color}" stroke="none"/></g>`;
}

// Which word indices fall inside the highlight phrase (contiguous match).
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

// Greedy wrap by pixel width for condensed caps (~0.50 em advance).
function wrapWords(words, fontSize, maxWidth, charW = 0.5) {
  const max = Math.floor(maxWidth / (fontSize * charW));
  const lines = []; let line = [];
  for (let i = 0; i < words.length; i++) {
    const test = [...line, i];
    const len = test.map(k => words[k]).join(' ').length;
    if (len > max && line.length) { lines.push(line); line = [i]; }
    else line = test;
  }
  if (line.length) lines.push(line);
  return lines;
}

function dekWrap(text, fontSize, maxWidth, charW = 0.5) {
  const max = Math.floor(maxWidth / (fontSize * charW));
  const ws = text.split(/\s+/); const lines = []; let c = '';
  for (const w of ws) { const x = c ? c + ' ' + w : w; if (x.length > max && c) { lines.push(c); c = w; } else c = x; }
  if (c) lines.push(c); return lines;
}

function renderHero(item) {
  const photoUri = 'data:image/jpeg;base64,' + item.imageBuffer.toString('base64');
  const seam = 778;

  // headline
  const words = item.headline.toUpperCase().split(/\s+/);
  const hset = highlightSet(words, item.highlight);
  const hlFS = 92, hlLH = 94;
  const lines = wrapWords(words, hlFS, W - 2 * M);
  const hY = seam + 116;

  const headlineSvg = lines.map((idxs, li) => {
    const spans = idxs.map(i => `<tspan fill="${hset.has(i) ? SAGE : BONE}">${esc(words[i])} </tspan>`).join('');
    return `<text x="${M}" y="${hY + li * hlLH}" font-family="${COND}" font-size="${hlFS}" font-weight="700" letter-spacing="-1">${spans}</text>`;
  }).join('\n');

  // category pill
  const cat = item.category.toUpperCase();
  const catFS = 22, catW = cat.length * (catFS * 0.6) + 44, catH = 44;

  // dek (max 2 lines)
  const dek = dekWrap(item.dek, 27, W - 2 * M, 0.52).slice(0, 2);
  const dekY = hY + lines.length * hlLH + 18;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <image href="${photoUri}" x="0" y="0" width="${W}" height="${seam + 40}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="${seam - 120}" width="${W}" height="120" fill="${INK}" opacity="0.25"/>
  <rect x="0" y="${seam}" width="${W}" height="${H - seam}" fill="${INK}"/>

  ${mark(M, M - 2, 46, BONE)}
  <text x="${M + 62}" y="${M + 30}" font-family="${MONO}" font-size="24" font-weight="700" letter-spacing="3" fill="${BONE}">AREI</text>
  <rect x="${W - M - 150}" y="${M - 2}" width="150" height="44" rx="22" fill="none" stroke="${BONE}" stroke-width="2"/>
  <text x="${W - M - 92}" y="${M + 27}" font-family="${MONO}" font-size="20" font-weight="700" letter-spacing="2" fill="${BONE}">SWIPE</text>
  <text x="${W - M - 26}" y="${M + 27}" font-family="${MONO}" font-size="20" font-weight="700" fill="${BONE}">›</text>

  <rect x="${M}" y="${seam - 22}" width="${catW}" height="${catH}" fill="${SAGE}"/>
  <text x="${M + 22}" y="${seam - 22 + 30}" font-family="${SANS}" font-size="${catFS}" font-weight="700" letter-spacing="1" fill="${INK}">${esc(cat)}</text>

  ${headlineSvg}

  ${dek.map((ln, i) => `<text x="${M}" y="${dekY + i * 36}" font-family="${SANS}" font-size="27" font-weight="400" font-style="italic" fill="${GRAY}">${esc(ln)}</text>`).join('\n')}

  <text x="${M}" y="${H - 50}" font-family="${MONO}" font-size="19" font-weight="600" letter-spacing="2" fill="${GRAY}">AFRICA REAL ESTATE INDEX</text>
  <text x="${W - M}" y="${H - 50}" font-family="${MONO}" font-size="22" font-weight="700" letter-spacing="2" fill="${SAGE}" text-anchor="end">›››</text>
</svg>`;

  const fontFiles = ['fonts/PlexMono-Regular.ttf','fonts/PlexMono-Medium.ttf','fonts/PlexMono-SemiBold.ttf','fonts/PlexSans-Regular.ttf','fonts/PlexSans-SemiBold.ttf','fonts/PlexSans-Bold.ttf','fonts/PlexSansCond-Bold.ttf','fonts/PlexSansCond-SemiBold.ttf'].map(f => path.join(__dirname, f));
  return new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: COND }, fitTo: { mode: 'width', value: W } }).render().asPng();
}

module.exports = { renderHero };

// Demo when run directly
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
