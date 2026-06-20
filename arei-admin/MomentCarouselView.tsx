import { useRef, useState } from "react";
import { applyBrandImageFilter } from "./socialBrandFilter";

// ── Canvas constants ────────────────────────────────────────────────────────
const W = 1080, H = 1350;
const BONE    = "#f7f3ea";
const INK     = "#111110";
const SAGE    = "#8ecfbf";
const SAGE_DEEP = "#2d4a42";
const INTER   = "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";

// ── Slide data ──────────────────────────────────────────────────────────────
interface Slide {
  id: string;
  cta: boolean;
  label: string;
  headline: string;
  body: string;
  imageDataUrl: string | null;
  imageCredit: string;
}

const INITIAL_SLIDES: Slide[] = [
  {
    id: "s1", cta: false,
    label: "Moment",
    headline: "Cape Verde is having a global moment.",
    body: "Football is putting the islands in front of the world.",
    imageDataUrl: null, imageCredit: "",
  },
  {
    id: "s2", cta: false,
    label: "Market",
    headline: "But the property market is still hard to read.",
    body: "Listings are scattered across agencies, portals and islands.",
    imageDataUrl: null, imageCredit: "",
  },
  {
    id: "s3", cta: true,
    label: "Subscribe",
    headline: "Follow the market in one place.",
    body: "Cape Verde Real Estate Index",
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
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Canvas export failed"));
      else resolve(blob);
    }, "image/png");
  });
}

function coverFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const sw = W / scale, sh = H / scale;
  const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) { line = next; continue; }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lh: number) {
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
}

function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
}

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

function drawLockup(ctx: CanvasRenderingContext2D, x: number, y: number, color = BONE, h = 46) {
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

// ── Photo slide (image + dark gradient) ────────────────────────────────────
async function renderPhotoSlide(slide: Slide, index: number, total: number): Promise<Blob> {
  const img = await loadImage(slide.imageDataUrl!);
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  applyBrandImageFilter(ctx, "editorial", () => coverFit(ctx, img));

  // Top vignette
  const topG = ctx.createLinearGradient(0, 0, 0, 280);
  topG.addColorStop(0, "rgba(13,31,28,0.45)");
  topG.addColorStop(1, "rgba(13,31,28,0)");
  ctx.fillStyle = topG; ctx.fillRect(0, 0, W, H);

  // Bottom scrim — darker than PR #400 original
  const botG = ctx.createLinearGradient(0, H * 0.32, 0, H);
  botG.addColorStop(0,    "rgba(13,31,28,0)");
  botG.addColorStop(0.48, "rgba(13,31,28,0.72)");
  botG.addColorStop(1,    "rgba(13,31,28,0.97)");
  ctx.fillStyle = botG; ctx.fillRect(0, 0, W, H);

  drawLockup(ctx, 72, 70);

  // Slide counter
  ctx.fillStyle = "rgba(247,243,234,0.72)";
  ctx.font = `500 24px ${INTER}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${String(index + 1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, W - 170, 102);

  const textX = 72, textY = 800, maxW = W - 144;

  // Label (sage)
  if (slide.label.trim()) {
    ctx.font = `600 22px ${INTER}`;
    ctx.fillStyle = SAGE;
    ctx.fillText(slide.label.trim().toUpperCase(), textX, textY);
  }

  // Headline — Inter 700 (was Georgia in PR #400)
  ctx.font = `700 56px ${INTER}`;
  const hLines = wrapLines(ctx, slide.headline, maxW, 4);
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 3;
  ctx.fillStyle = BONE;
  drawLines(ctx, hLines, textX, textY + 58, 64);
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Body
  if (slide.body.trim()) {
    ctx.font = `400 30px ${INTER}`;
    const bLines = wrapLines(ctx, slide.body, maxW, 3);
    ctx.fillStyle = "rgba(247,243,234,0.88)";
    drawLines(ctx, bLines, textX, textY + 58 + hLines.length * 64 + 32, 42);
  }

  // Image credit
  if (slide.imageCredit.trim()) {
    ctx.font = `400 17px ${INTER}`;
    ctx.fillStyle = "rgba(247,243,234,0.64)";
    ctx.fillText(`Photo: ${slide.imageCredit.trim()}`, 72, H - 52);
  }

  return canvasToPngBlob(canvas);
}

// ── Flat slide (no image, sage-deep background) ─────────────────────────────
async function renderFlatSlide(slide: Slide, index: number, total: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = SAGE_DEEP;
  ctx.fillRect(0, 0, W, H);

  drawLockup(ctx, 72, 70);

  ctx.fillStyle = "rgba(247,243,234,0.72)";
  ctx.font = `500 24px ${INTER}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${String(index + 1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, W - 170, 102);

  const textX = 72, textY = 820, maxW = W - 144;

  if (slide.label.trim()) {
    ctx.font = `600 22px ${INTER}`;
    ctx.fillStyle = SAGE;
    ctx.fillText(slide.label.trim().toUpperCase(), textX, textY);
  }

  ctx.font = `700 56px ${INTER}`;
  const hLines = wrapLines(ctx, slide.headline, maxW, 4);
  ctx.fillStyle = BONE;
  drawLines(ctx, hLines, textX, textY + 58, 64);

  if (slide.body.trim()) {
    ctx.font = `400 30px ${INTER}`;
    const bLines = wrapLines(ctx, slide.body, maxW, 3);
    ctx.fillStyle = "rgba(247,243,234,0.80)";
    drawLines(ctx, bLines, textX, textY + 58 + hLines.length * 64 + 32, 42);
  }

  return canvasToPngBlob(canvas);
}

// ── CTA slide (bone background, dark text, URL bar) ─────────────────────────
async function renderCtaSlide(slide: Slide, total: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = BONE;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#dfe6dc";
  ctx.fillRect(0, 0, W, 420);

  // Sage rule
  ctx.fillStyle = SAGE;
  ctx.fillRect(72, 216, W - 144, 8);

  drawLockup(ctx, 72, 70, INK);

  // Counter
  ctx.fillStyle = SAGE_DEEP;
  ctx.font = `600 24px ${INTER}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${String(total).padStart(2,"0")} / ${String(total).padStart(2,"0")}`, W - 170, 102);

  // Headline
  ctx.font = `700 64px ${INTER}`;
  const hLines = wrapLines(ctx, slide.headline, W - 180, 4);
  ctx.fillStyle = INK;
  drawLines(ctx, hLines, 90, 540, 76);

  // Body
  if (slide.body.trim()) {
    ctx.font = `400 32px ${INTER}`;
    const bLines = wrapLines(ctx, slide.body, W - 180, 4);
    ctx.fillStyle = "#2d3431";
    drawLines(ctx, bLines, 90, 540 + hLines.length * 76 + 52, 46);
  }

  // URL bar
  ctx.fillStyle = SAGE_DEEP;
  ctx.beginPath();
  ctx.roundRect(90, H - 220, W - 180, 100, 6);
  ctx.fill();
  ctx.fillStyle = BONE;
  ctx.font = `600 28px ${INTER}`;
  ctx.fillText("capeverderealestateindex.com/subscribe", 124, H - 158);

  return canvasToPngBlob(canvas);
}

// ── Main dispatch ────────────────────────────────────────────────────────────
async function renderSlide(slide: Slide, index: number, total: number): Promise<Blob> {
  if (slide.cta) return renderCtaSlide(slide, total);
  if (slide.imageDataUrl) return renderPhotoSlide(slide, index, total);
  return renderFlatSlide(slide, index, total);
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
      const total = slides.length;
      const results: Rendered[] = [];
      for (let i = 0; i < slides.length; i++) {
        const blob = await renderSlide(slides[i], i, total);
        const dataUrl = URL.createObjectURL(blob);
        const label = slides[i].label || `slide-${i + 1}`;
        const filename = `cvrei-moment-${String(i + 1).padStart(2,"0")}-${label.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.png`;
        results.push({ filename, dataUrl, blob });
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

  function downloadAll() { rendered.forEach(download); }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-foreground-subtle font-medium">Marketing</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground mt-0.5">Moment Carousel</h1>
        <p className="text-sm text-foreground-subtle mt-1">Football campaign · 3 slides · 1080×1350 PNG</p>
      </div>

      {/* Slides */}
      {slides.map((slide, idx) => (
        <div key={slide.id} className="border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {idx + 1} / {slides.length}
            </span>
            {slide.cta && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-foreground-subtle uppercase tracking-wide">CTA</span>
            )}
          </div>

          {/* Image upload — only on non-CTA slides */}
          {!slide.cta && (
            <div className="space-y-2">
              <label className={lbl}>Photo (optional)</label>
              {slide.imageDataUrl ? (
                <div className="relative h-32 rounded overflow-hidden border border-border">
                  <img src={slide.imageDataUrl} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => update(slide.id, { imageDataUrl: null, imageCredit: "" })}
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white hover:bg-black/80"
                  >Remove</button>
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
          )}

          <div>
            <label className={lbl}>Label</label>
            <input type="text" className={inp} value={slide.label}
              onChange={e => update(slide.id, { label: e.target.value })} />
          </div>

          <div>
            <label className={lbl}>Headline</label>
            <textarea rows={2} className={inp} value={slide.headline}
              onChange={e => update(slide.id, { headline: e.target.value })} />
          </div>

          <div>
            <label className={lbl}>Body</label>
            <textarea rows={2} className={inp} value={slide.body}
              onChange={e => update(slide.id, { body: e.target.value })} />
          </div>
        </div>
      ))}

      {/* Render */}
      <button
        onClick={renderAll} disabled={busy}
        className="w-full py-3 bg-foreground text-background font-medium text-sm rounded hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Rendering…" : "Render slides"}
      </button>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {/* Downloads */}
      {rendered.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {rendered.map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-[4/5] rounded overflow-hidden border border-border bg-surface-2">
                  <img src={r.dataUrl} className="w-full h-full object-cover" alt={`Slide ${i+1}`} />
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
            onClick={downloadAll}
            className="w-full py-2.5 border border-border rounded text-sm text-foreground hover:bg-surface-2"
          >
            Download all ({rendered.length} PNGs)
          </button>
        </div>
      )}

      {/* Caption */}
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
