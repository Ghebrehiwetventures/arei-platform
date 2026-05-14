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

function solidPNG(w, h, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  // bytes 10-12: compression=0, filter=0, interlace=0

  // Filter byte (0 = None) + RGB per pixel, per row
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const base = y * (1 + w * 3);
    raw[base] = 0; // filter type
    for (let x = 0; x < w; x++) {
      raw[base + 1 + x * 3]     = r;
      raw[base + 1 + x * 3 + 1] = g;
      raw[base + 1 + x * 3 + 2] = b;
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
  { color: '#8ecfbf', out: 'arei-landing/apple-touch-icon.png' },
  // arei-admin: sage deep — control surface, distinct from public sites
  { color: '#2d4a42', out: 'arei-admin/public/apple-touch-icon.png' },
  // kazaverde-web: sage — Cape Verde market site (same brand family as landing)
  { color: '#8ecfbf', out: 'kazaverde-web/public/apple-touch-icon.png' },
];

for (const { color, out } of targets) {
  const [r, g, b] = hex(color);
  const png = solidPNG(180, 180, r, g, b);
  const dest = path.join(ROOT, out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, png);
  console.log(`✓  ${out}  (${png.length} bytes, ${color})`);
}
