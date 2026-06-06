#!/usr/bin/env node
/**
 * generate-ai.js — Generate an AI background via OpenAI gpt-image-1, then
 * composite the AREI news-post template over it.
 *
 * Requires: OPENAI_API_KEY in the environment.
 * Run: OPENAI_API_KEY=sk-... node generate-ai.js
 *
 * The AI prompt deliberately asks for an atmospheric, editorial, *textless*
 * aerial/coastal scene — never fake landmarks or signage — so it reads as a
 * credible news backdrop, not an obvious AI render.
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const W = 1080, H = 1350, M = 64;
const INK = '#0A0A0A', BONE = '#FAFAFA', SAGE = '#8ECFBF';
const MONO = 'IBM Plex Mono', SANS = 'IBM Plex Sans';

// ── News item (would come from market_news in production) ────────────────────
const NEWS = {
  tag: 'MARKET NEWS',
  kicker: 'CABO VERDE · JUN 4, 2026',
  // headline as styled lines: each token {t: text, c: color}
  headline: [
    [{ t: 'New direct flight', c: BONE }],
    [{ t: 'links ', c: BONE }, { t: 'Cape Verde', c: SAGE }],
    [{ t: '& Brazil', c: SAGE }],
  ],
  // image prompt — atmospheric, no text, no fake landmarks
  imagePrompt:
    'Cinematic aerial drone photograph of a tropical Atlantic island coastline ' +
    'at golden hour: turquoise shallows, volcanic sandy beaches, calm ocean, ' +
    'soft natural light, muted editorial color grade, documentary photojournalism ' +
    'style, high detail, no text, no logos, no signage, no people in focus.',
};

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function mark(x, y, size, color) {
  const s = size / 24;
  return `<g transform="translate(${x},${y}) scale(${s})" stroke="${color}" stroke-width="1.4" stroke-linecap="square" fill="none"><rect x="3" y="3" width="14" height="14"/><rect x="6.5" y="6.5" width="14" height="14"/><rect x="10" y="10" width="9" height="9" fill="${color}" stroke="none"/></g>`;
}

async function generateImage(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set in environment');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1536', // portrait, closest to 4:5
      quality: 'high',
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, 'base64');
}

function renderPost(photoBuffer, news) {
  const dataUri = 'data:image/png;base64,' + photoBuffer.toString('base64');
  const hlFS = 100, hlLH = 98, n = news.headline.length;
  const lastBaseline = H - 80;
  const firstBaseline = lastBaseline - (n - 1) * hlLH;
  const tagH = 56, tagFS = 30;
  const tagW = news.tag.length * (tagFS * 0.6 + 1.5) + 52;
  const tagY = firstBaseline - hlFS - 30;

  const headlineSvg = news.headline
    .map((line, i) => {
      const spans = line.map(tok => `<tspan fill="${tok.c}">${esc(tok.t)}</tspan>`).join('');
      return `<text x="${M}" y="${firstBaseline + i * hlLH}" font-family="${SANS}" font-size="${hlFS}" font-weight="700" letter-spacing="-3">${spans}</text>`;
    })
    .join('\n');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="ov" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${INK}" stop-opacity="0.05"/>
    <stop offset="40%" stop-color="${INK}" stop-opacity="0.12"/>
    <stop offset="64%" stop-color="${INK}" stop-opacity="0.62"/>
    <stop offset="100%" stop-color="${INK}" stop-opacity="0.95"/>
  </linearGradient></defs>
  <image href="${dataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${W}" height="${H}" fill="url(#ov)"/>
  <circle cx="${M+8}" cy="${M+28}" r="8" fill="${SAGE}"/>
  <text x="${M+28}" y="${M+36}" font-family="${MONO}" font-size="23" font-weight="600" letter-spacing="4" fill="${BONE}">${esc(news.kicker)}</text>
  ${mark(W-M-56, M, 56, BONE)}
  <rect x="${M}" y="${tagY}" width="${tagW}" height="${tagH}" fill="${SAGE}"/>
  <text x="${M+26}" y="${tagY+40}" font-family="${SANS}" font-size="${tagFS}" font-weight="700" font-style="italic" fill="${INK}">${esc(news.tag)}</text>
  ${headlineSvg}
</svg>`;

  const fontFiles = ['fonts/PlexMono-Regular.ttf','fonts/PlexMono-Medium.ttf','fonts/PlexMono-SemiBold.ttf','fonts/PlexSans-Regular.ttf','fonts/PlexSans-SemiBold.ttf','fonts/PlexSans-Bold.ttf'].map(f => path.join(__dirname, f));
  return new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: SANS }, fitTo: { mode: 'width', value: W } }).render().asPng();
}

(async () => {
  console.log('Generating AI background via gpt-image-1…');
  const img = await generateImage(NEWS.imagePrompt);
  fs.writeFileSync(path.join(__dirname, 'out/ai-raw.png'), img);
  console.log('  saved out/ai-raw.png');
  const post = renderPost(img, NEWS);
  fs.writeFileSync(path.join(__dirname, 'out/ai-post.png'), post);
  console.log('  saved out/ai-post.png');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
