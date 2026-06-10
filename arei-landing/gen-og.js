#!/usr/bin/env node
/**
 * Generate Open Graph images — D·Layers mark only, centered, 1200 × 630.
 *
 * No text in the image: WhatsApp/Twitter/iMessage render og:title and
 * og:description below the thumbnail, so text in the image duplicates it
 * and turns illegible at thumbnail size. Pure SVG geometry — no fonts,
 * so sharp/librsvg renders it exactly.
 *
 * Mark geometry is locked: docs/brand/assets/d-layers-mark.svg (24-unit grid).
 * Color variants per brand manual §04.3 (monochrome only):
 *   arei-landing  → white mark on ink
 *   kazaverde-web → sage mark on ink ("On ink · sage mark")
 *
 * Run: node gen-og.js (requires `sharp` installed as devDependency)
 */
const path = require('path');
const sharp = require('sharp');

const W = 1200;
const H = 630;
const MARK = 220;

function ogSvg(markColor) {
  const s = MARK / 24;
  const x = (W - MARK) / 2;
  const y = (H - MARK) / 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0A0A0A"/>
  <g transform="translate(${x} ${y}) scale(${s})"
     fill="none" stroke="${markColor}" stroke-width="1.4" stroke-linecap="square">
    <rect x="3"   y="3"   width="14" height="14"/>
    <rect x="6.5" y="6.5" width="14" height="14"/>
    <rect x="10"  y="10"  width="9"  height="9" fill="${markColor}" stroke="none"/>
  </g>
</svg>`;
}

const targets = [
  { color: '#FFFFFF', out: path.join(__dirname, 'arei-og-v5.png') },
  { color: '#8ECFBF', out: path.join(__dirname, '..', 'kazaverde-web', 'public', 'cvrei-og.png') },
];

Promise.all(
  targets.map(({ color, out }) =>
    sharp(Buffer.from(ogSvg(color)))
      .png({ quality: 95 })
      .toFile(out)
      .then(info => console.log(`Wrote ${out} (${info.width}×${info.height}, ${info.size} bytes)`))
  )
).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
