import { useRef, useState } from "react";
import { applyBrandImageFilter } from "./socialBrandFilter";

// ── Inter font loading ───────────────────────────────────────────────────────
// Canvas ignores CSS webfonts — we must load Inter explicitly via FontFace API
// before any ctx.font call, otherwise the browser silently falls back to
// system-ui (which is not Inter on most machines).
const INTER_BASE = "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin";
const INTER_WEIGHTS: [string, string][] = [
  ["400", `${INTER_BASE}-400-normal.woff2`],
  ["600", `${INTER_BASE}-600-normal.woff2`],
  ["700", `${INTER_BASE}-700-normal.woff2`],
];
let interReady: Promise<void> | null = null;
function ensureInter(): Promise<void> {
  if (!interReady) {
    interReady = Promise.all(
      INTER_WEIGHTS.map(([weight, url]) => {
        const f = new FontFace("Inter", `url(${url})`, { weight });
        return f.load().then(loaded => { document.fonts.add(loaded); });
      }),
    ).then(() => undefined);
  }
  return interReady;
}

// ── Canvas constants — match PR #399 4:5 layout geometry ───────────────────
const W = 1080, H = 1350;
const M = 72;          // margin
const LOCK_H = 44;     // lockup height
const BOTTOM_SAFE = 86; // clear space at bottom
const INTER = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const BONE    = "#f7f3ea";
const SAGE    = "#8ecfbf";
const SAGE_DEEP = "#2d4a42";
// Headline autofit ladder (same as PR #399 4:5 cover)
const H_LADDER = [98, 86, 76, 66, 58, 50, 44];
// Headline may wrap to this many lines before the autofit gives up and renders
// at the smallest grade (full text always shown — never truncated).
const MAX_HL_LINES = 5;

// ── Slide data ──────────────────────────────────────────────────────────────
interface Slide {
  id: string;
  headline: string;
  // Contiguous words inside the headline rendered in sage (e.g. "global moment").
  accent: string;
  body: string;
  imageDataUrl: string | null;
  imageCredit: string;
}

const INITIAL_SLIDES: Slide[] = [
  {
    id: "s1",
    headline: "Cape Verde is having a global moment.",
    accent: "global moment.",
    body: "Football is putting the islands in front of the world.",
    imageDataUrl: null, imageCredit: "",
  },
  {
    id: "s2",
    headline: "But the property market is still hard to read.",
    accent: "hard to read.",
    body: "Listings are scattered across agencies, portals and islands.",
    imageDataUrl: null, imageCredit: "",
  },
  {
    id: "s3",
    headline: "Follow the market in one place.",
    accent: "one place.",
    body: "Cape Verde Real Estate Index\ncapeverderealestateindex.com/subscribe",
    imageDataUrl: null, imageCredit: "",
  },
];

const DEFAULT_CAPTION = `Cape Verde is getting global attention.

We track homes for sale, island updates and property market notes from across Cape Verde.

Subscribe:
capeverderealestateindex.com/subscribe

Cape Verde Real Estate Index is not a broker.`;

// ── Canvas helpers ──────────────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
    );
  });
}

function coverFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const sw = W / scale, sh = H / scale;
  const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}

// Canvas text wrap using measureText. Wraps ALL words into as many lines as
// needed — never truncates. The headline autofit shrinks the font until the
// full wrap fits within the allowed line count, so words are never dropped.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

// Indices of the headline words that make up `accent` (contiguous, punctuation-
// and case-insensitive) — so a phrase like "global moment" renders sage inside
// an otherwise bone headline. Mirrors PR #399's accentSet().
function accentWordSet(headline: string, accent: string): Set<number> {
  if (!accent.trim()) return new Set();
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const words = headline.trim().split(/\s+/).map(norm);
  const a = accent.trim().split(/\s+/).map(norm).filter(Boolean);
  if (!a.length) return new Set();
  for (let i = 0; i + a.length <= words.length; i++) {
    if (a.every((w, j) => words[i + j] === w)) {
      return new Set(Array.from({ length: a.length }, (_, k) => i + k));
    }
  }
  return new Set();
}

// Draw wrapped headline lines word-by-word, colouring accent words sage. Uses
// the context's current font + letterSpacing. `x`/`firstY` anchor the top line.
function drawHeadline(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  accentSet: Set<number>,
  x: number, firstY: number, lineHeight: number,
  fg: string, accent: string,
) {
  let wordIdx = 0;
  for (let li = 0; li < lines.length; li++) {
    const lineWords = lines[li].split(/\s+/).filter(Boolean);
    let cursor = x;
    const y = firstY + li * lineHeight;
    for (const w of lineWords) {
      ctx.fillStyle = accentSet.has(wordIdx) ? accent : fg;
      ctx.fillText(w, cursor, y);
      cursor += ctx.measureText(w + " ").width;
      wordIdx++;
    }
  }
}

// Letter-tracking helper for kicker.
function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

// D·Layers mark (canonical geometry).
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const s = size / 24;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 1.4 * s; ctx.lineCap = "square";
  ctx.strokeRect(x + 3 * s, y + 3 * s, 14 * s, 14 * s);
  ctx.strokeRect(x + 6.5 * s, y + 6.5 * s, 14 * s, 14 * s);
  ctx.fillRect(x + 10 * s, y + 10 * s, 9 * s, 9 * s);
  ctx.restore();
}

// CAPE VERDE / REAL ESTATE / INDEX three-line lockup.
function drawLockup(ctx: CanvasRenderingContext2D, x: number, y: number, color = BONE, h = LOCK_H) {
  const t = Math.round(h * 0.34);
  const tx = x + h + 12;
  const tracking = t * 0.04;
  const adv = Math.round(t * 1.2);
  drawMark(ctx, x, y, h, color);
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${t}px ${INTER}`;
  drawTracked(ctx, "CAPE VERDE", tx, y + t - 1, tracking);
  ctx.globalAlpha = 0.72;
  ctx.font = `400 ${t}px ${INTER}`;
  drawTracked(ctx, "REAL ESTATE", tx, y + t - 1 + adv, tracking);
  drawTracked(ctx, "INDEX", tx, y + t - 1 + adv * 2, tracking);
  ctx.restore();
}

// ── Single editorial slide renderer ────────────────────────────────────────
// All 3 slides use this function. Photo-led when imageDataUrl is present;
// sage-deep flat surface otherwise. Text is always bottom-anchored — the
// lower-third editorial feel from PR #399.
async function renderEditorialSlide(slide: Slide, index: number, total: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  // ── Background ────────────────────────────────────────────────────────────
  const hasPhoto = Boolean(slide.imageDataUrl);
  if (hasPhoto) {
    const img = await loadImage(slide.imageDataUrl!);
    applyBrandImageFilter(ctx, "editorial", () => coverFit(ctx, img));

    // Top vignette — matches PR #399 #t gradient (220px, 50%→0%)
    const topG = ctx.createLinearGradient(0, 0, 0, 220);
    topG.addColorStop(0, "rgba(10,20,18,0.50)");
    topG.addColorStop(1, "rgba(10,20,18,0)");
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, W, H);

    // Bottom scrim — matches PR #399 #bl gradient exactly
    // 55% transparent → 80% 34% → 100% 90%
    const botG = ctx.createLinearGradient(0, 0, 0, H);
    botG.addColorStop(0.55, "rgba(10,20,18,0)");
    botG.addColorStop(0.80, "rgba(10,20,18,0.34)");
    botG.addColorStop(1.0,  "rgba(10,20,18,0.90)");
    ctx.fillStyle = botG;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = SAGE_DEEP;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Lockup — top left ─────────────────────────────────────────────────────
  drawLockup(ctx, M, M, BONE, LOCK_H);

  // ── Counter — top right ───────────────────────────────────────────────────
  // PR #399: font-size="17" font-weight="600" letter-spacing="2" text-anchor="end"
  // at x = W-M, y = M+28
  ctx.save();
  ctx.font = `600 17px ${INTER}`;
  ctx.fillStyle = hasPhoto ? "rgba(247,243,234,0.80)" : "rgba(247,243,234,0.65)";
  const counterStr = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const cw = ctx.measureText(counterStr).width;
  ctx.fillText(counterStr, W - M - cw, M + 28);
  ctx.restore();

  // ── Text block — bottom anchored ─────────────────────────────────────────
  // Layout from bottom up:
  //   H - BOTTOM_SAFE = 1264  ← last body line baseline
  //   gap 44px
  //   headline last line baseline
  //   headline lines (lineHeight = fontSize * 1.04) upward
  //   kicker = headlineFirstY - fontSize - 26
  const maxW = W - 2 * M;

  // Body: 28px / 40px line height (PR #399 dek treatment)
  const BODY_SIZE = 28;
  const BODY_LH = 40;
  ctx.font = `400 ${BODY_SIZE}px ${INTER}`;
  const bodyLines = slide.body.trim() ? wrapLines(ctx, slide.body, maxW).slice(0, 3) : [];
  const bodyLastY = H - BOTTOM_SAFE;  // baseline of last body line
  const bodyFirstY = bodyLastY - (bodyLines.length - 1) * BODY_LH;

  // Headline: pick the largest grade whose FULL wrap fits within MAX_HL_LINES.
  // Tight negative tracking (PR #399: fontSize × -0.02) is applied while
  // measuring so the wrap matches what we actually paint. If even the smallest
  // grade overflows, we still render every word (more lines) — never truncate.
  let hSize = H_LADDER[H_LADDER.length - 1];
  let hLines: string[] = [];
  for (const size of H_LADDER) {
    ctx.font = `700 ${size}px ${INTER}`;
    ctx.letterSpacing = `${(size * -0.02).toFixed(1)}px`;
    const candidate = wrapLines(ctx, slide.headline, maxW);
    hSize = size; hLines = candidate;
    if (candidate.length <= MAX_HL_LINES) break;
  }
  ctx.letterSpacing = "0px";
  const hLH = Math.round(hSize * 1.04);

  // Anchor headline last baseline above body (PR #399: lastBaseline with dek = H - safe - 60)
  const hLastY = bodyLines.length > 0 ? bodyFirstY - 44 : bodyLastY;
  const hFirstY = hLastY - (hLines.length - 1) * hLH;

  // ── Draw text ─────────────────────────────────────────────────────────────

  // No eyebrow/kicker — the headline + lockup carry the slide (Bloomberg-style).

  // Headline: 700, flat (no shadow), accent words in sage. The bottom scrim
  // already carries the contrast — PR #399 paints flat, editorial type.
  ctx.font = `700 ${hSize}px ${INTER}`;
  ctx.letterSpacing = `${(hSize * -0.02).toFixed(1)}px`;
  const accentSet = accentWordSet(slide.headline, slide.accent);
  drawHeadline(ctx, hLines, accentSet, M, hFirstY, hLH, BONE, SAGE);
  ctx.letterSpacing = "0px";

  // Body: 28px 400, slightly dimmed bone (PR #399 sub colour)
  if (bodyLines.length > 0) {
    ctx.font = `400 ${BODY_SIZE}px ${INTER}`;
    ctx.fillStyle = hasPhoto ? "rgba(247,243,234,0.80)" : "rgba(247,243,234,0.75)";
    for (let i = 0; i < bodyLines.length; i++) {
      ctx.fillText(bodyLines[i], M, bodyFirstY + i * BODY_LH);
    }
  }

  // Photo credit: 17px 400, very dim (PR #399: y = H - 26)
  if (hasPhoto && slide.imageCredit.trim()) {
    ctx.font = `400 17px ${INTER}`;
    ctx.fillStyle = "rgba(247,243,234,0.50)";
    ctx.fillText(`Photo: ${slide.imageCredit.trim()}`, M, H - 26);
  }

  return canvasToPngBlob(canvas);
}

// ── UI helpers ──────────────────────────────────────────────────────────────
const inp = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm rounded";
const lbl = "block text-[11px] uppercase tracking-wide text-foreground-subtle font-medium mb-1.5";

interface Rendered { filename: string; dataUrl: string; blob: Blob; }

// ── Component ────────────────────────────────────────────────────────────────
export function MomentCarouselView() {
  const [slides, setSlides] = useState<Slide[]>(INITIAL_SLIDES);
  const [caption, setCaption] = useState(DEFAULT_CAPTION);
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function update(id: string, patch: Partial<Slide>) {
    setSlides(s => s.map(sl => sl.id === id ? { ...sl, ...patch } : sl));
  }

  function handleFile(id: string, file: File) {
    const reader = new FileReader();
    reader.onload = e => update(id, { imageDataUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  }

  async function renderAll() {
    setBusy(true); setErr(null); setRendered([]);
    try {
      await ensureInter();
      const total = slides.length;
      const results: Rendered[] = [];
      for (let i = 0; i < slides.length; i++) {
        const blob = await renderEditorialSlide(slides[i], i, total);
        const dataUrl = URL.createObjectURL(blob);
        const slug = slides[i].headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `slide-${i + 1}`;
        results.push({
          filename: `cvrei-moment-${String(i + 1).padStart(2, "0")}-${slug}.png`,
          dataUrl,
          blob,
        });
      }
      setRendered(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(false);
    }
  }

  function download(r: Rendered) {
    const a = document.createElement("a");
    a.href = r.dataUrl; a.download = r.filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-foreground-subtle font-medium">Marketing</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">Moment Carousel</h1>
        <p className="text-sm text-foreground-subtle mt-1">Football campaign · 3 slides · 1080×1350 PNG</p>
      </div>

      {slides.map((slide, idx) => (
        <div key={slide.id} className="border border-border rounded-lg p-5 space-y-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
            Slide {idx + 1} / {slides.length}
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <label className={lbl}>Photo (optional)</label>
            {slide.imageDataUrl ? (
              <div className="relative h-32 rounded overflow-hidden border border-border">
                <img src={slide.imageDataUrl} className="w-full h-full object-cover" alt="" />
                <button
                  onClick={() => update(slide.id, { imageDataUrl: null, imageCredit: "" })}
                  className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white hover:bg-black/80"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRefs.current[slide.id]?.click()}
                className="w-full h-20 border-2 border-dashed border-border rounded text-sm text-foreground-subtle hover:border-foreground-subtle transition-colors"
              >
                + Upload photo
              </button>
            )}
            <input
              ref={el => { fileRefs.current[slide.id] = el; }}
              type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(slide.id, f); }}
            />
            {slide.imageDataUrl && (
              <div>
                <label className={lbl}>Photo credit</label>
                <input
                  type="text" className={inp} placeholder="Photographer / Source"
                  value={slide.imageCredit}
                  onChange={e => update(slide.id, { imageCredit: e.target.value })}
                />
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>Headline</label>
            <textarea rows={2} className={inp} value={slide.headline}
              onChange={e => update(slide.id, { headline: e.target.value })} />
          </div>

          <div>
            <label className={lbl}>Accent words (sage)</label>
            <input type="text" className={inp} placeholder="Contiguous words from the headline"
              value={slide.accent}
              onChange={e => update(slide.id, { accent: e.target.value })} />
          </div>

          <div>
            <label className={lbl}>Body</label>
            <textarea rows={2} className={inp} value={slide.body}
              onChange={e => update(slide.id, { body: e.target.value })} />
          </div>
        </div>
      ))}

      <button
        onClick={renderAll} disabled={busy}
        className="w-full py-3 bg-foreground text-background font-medium text-sm rounded hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Rendering…" : "Render slides"}
      </button>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {rendered.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {rendered.map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/5] rounded overflow-hidden border border-border bg-surface-2">
                  <img src={r.dataUrl} className="w-full h-full object-cover" alt={`Slide ${i + 1}`} />
                </div>
                <button
                  onClick={() => download(r)}
                  className="w-full text-xs py-1.5 border border-border rounded hover:bg-surface-2 text-foreground"
                >
                  ↓ Slide {i + 1}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => rendered.forEach(download)}
            className="w-full py-2.5 border border-border rounded text-sm text-foreground hover:bg-surface-2"
          >
            Download all ({rendered.length} PNGs)
          </button>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <label className={lbl}>Instagram caption</label>
        <textarea rows={8} className={inp} value={caption}
          onChange={e => setCaption(e.target.value)} />
        <button
          onClick={() => navigator.clipboard?.writeText(caption)}
          className="text-xs px-3 py-1.5 border border-border rounded hover:bg-surface-2 text-foreground"
        >
          Copy caption
        </button>
      </div>
    </div>
  );
}
