#!/usr/bin/env node
/**
 * Generate 180x180 apple-touch-icon.png for each AREI web surface.
 * Pure Node.js — no external dependencies (uses built-in zlib).
 *
 * Run from repo root: node scripts/gen-icons.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 — required by the PNG spec for chunk integrity
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.concat([tb, data]);
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, tb, data, crcVal]);
}

function iconPNG(w, h, background, mark) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  // bytes 10-12: compression=0, filter=0, interlace=0

  const [br, bg, bb] = background;
  const supersample = 4;
  const sw = w * supersample;
  const sh = h * supersample;
  const viewBox = 24;
  const scale = sw / viewBox;
  const strokeWidth = 1.4 * scale;

  const hi = Buffer.alloc(sw * sh * 3);
  for (let i = 0; i < hi.length; i += 3) {
    hi[i] = br;
    hi[i + 1] = bg;
    hi[i + 2] = bb;
  }

  function paintPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= sw || y >= sh) return;
    const i = (y * sw + x) * 3;
    hi[i] = color[0];
    hi[i + 1] = color[1];
    hi[i + 2] = color[2];
  }

  function fillRect(x, y, width, height, color) {
    const x0 = Math.round(x * scale);
    const y0 = Math.round(y * scale);
    const x1 = Math.round((x + width) * scale);
    const y1 = Math.round((y + height) * scale);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) paintPixel(px, py, color);
    }
  }

  function strokeRect(x, y, width, height, color) {
    const x0 = Math.round(x * scale - strokeWidth / 2);
    const y0 = Math.round(y * scale - strokeWidth / 2);
    const x1 = Math.round((x + width) * scale + strokeWidth / 2);
    const y1 = Math.round((y + height) * scale + strokeWidth / 2);
    const ix0 = Math.round(x * scale + strokeWidth / 2);
    const iy0 = Math.round(y * scale + strokeWidth / 2);
    const ix1 = Math.round((x + width) * scale - strokeWidth / 2);
    const iy1 = Math.round((y + height) * scale - strokeWidth / 2);

    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const insideHole = px >= ix0 && px < ix1 && py >= iy0 && py < iy1;
        if (!insideHole) paintPixel(px, py, color);
      }
    }
  }

  // D·Layers mark — keep geometry in sync with docs/brand/assets/d-layers-mark.svg.
  strokeRect(3, 3, 14, 14, mark);
  strokeRect(6.5, 6.5, 14, 14, mark);
  fillRect(10, 10, 9, 9, mark);

  // Filter byte (0 = None) + RGB per pixel, per row
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const base = y * (1 + w * 3);
    raw[base] = 0; // filter type
    for (let x = 0; x < w; x++) {
      let tr = 0;
      let tg = 0;
      let tb = 0;
      for (let sy = 0; sy < supersample; sy++) {
        for (let sx = 0; sx < supersample; sx++) {
          const hiIndex = (((y * supersample + sy) * sw) + (x * supersample + sx)) * 3;
          tr += hi[hiIndex];
          tg += hi[hiIndex + 1];
          tb += hi[hiIndex + 2];
        }
      }
      const samples = supersample * supersample;
      raw[base + 1 + x * 3] = Math.round(tr / samples);
      raw[base + 1 + x * 3 + 1] = Math.round(tg / samples);
      raw[base + 1 + x * 3 + 2] = Math.round(tb / samples);
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function hex(str) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(str);
  if (!m) throw new Error(`Bad hex: ${str}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

const ROOT = path.resolve(__dirname, '..');

const targets = [
  // arei-landing: sage — master brand surface
  { background: '#8ecfbf', mark: '#0a0a0a', out: 'arei-landing/apple-touch-icon.png' },
  // arei-admin: monochrome — control surface
  { background: '#0a0a0a', mark: '#ffffff', out: 'arei-admin/public/apple-touch-icon.png' },
  // kazaverde-web: teal — Cape Verde market site
  { background: '#8ecfbf', mark: '#0a0a0a', out: 'kazaverde-web/public/apple-touch-icon.png' },
];

for (const { background, mark, out } of targets) {
  const png = iconPNG(180, 180, hex(background), hex(mark));
  const dest = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, png);
  console.log(`✓  ${out}  (${png.length} bytes, ${background} / ${mark})`);
}
