import { useEffect, useMemo, useRef, useState } from "react";
import { applyBrandImageFilter } from "./socialBrandFilter";

type ImageRights = "owned" | "licensed" | "creative_commons" | "permission_granted" | "unknown";
type ImageStatus = "idle" | "loading" | "loaded" | "error";
type ImageCreditStatus = "manual" | "auto_detected";

interface GuideSlide {
  id: string;
  imageUrl: string;
  originalFilename: string | null;
  imageCredit: string;
  imageCreditStatus: ImageCreditStatus;
  imageRights: ImageRights;
  label: string;
  headline: string;
  body: string;
  imageStatus: ImageStatus;
}

interface RenderedSlide {
  filename: string;
  blob: Blob;
  dataUrl: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;
const DEFAULT_CTA_HEADLINE = "Get Cape Verde property market updates.";
const DEFAULT_CTA_COPY =
  "Source-linked listings, market notes and island-level property information from the Cape Verde Real Estate Index.";
const DEFAULT_CTA_DESTINATION = "capeverderealestateindex.com";

const inputClass = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm rounded";
const labelClass = "block text-[11px] uppercase tracking-wide text-foreground-subtle font-medium mb-1.5";

const RIGHTS_OPTIONS: { value: ImageRights; label: string }[] = [
  { value: "owned", label: "Owned" },
  { value: "licensed", label: "Licensed" },
  { value: "creative_commons", label: "Creative Commons" },
  { value: "permission_granted", label: "Permission granted" },
  { value: "unknown", label: "Unknown" },
];

const DESCRIPTOR_WORDS = new Set([
  "beach",
  "boa",
  "caboverde",
  "cape",
  "city",
  "fisherman",
  "fogo",
  "island",
  "landscape",
  "mindelo",
  "photo",
  "praia",
  "sal",
  "santiago",
  "verde",
]);

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptySlide(): GuideSlide {
  return {
    id: uid(),
    imageUrl: "",
    originalFilename: null,
    imageCredit: "",
    imageCreditStatus: "manual",
    imageRights: "unknown",
    label: "",
    headline: "",
    body: "",
    imageStatus: "idle",
  };
}

function sampleSlides(): GuideSlide[] {
  return [
    {
      ...emptySlide(),
      label: "Geography",
      headline: "Cape Verde is an Atlantic archipelago off West Africa.",
      body: "Ten islands, nine inhabited, each with a distinct property and visitor profile.",
    },
    {
      ...emptySlide(),
      label: "Market",
      headline: "The property market is not one single market.",
      body: "Sal, Boa Vista, Santiago and Sao Vicente behave differently because demand and infrastructure differ.",
    },
    {
      ...emptySlide(),
      label: "Data",
      headline: "Most public signals are asking prices, not transaction prices.",
      body: "Use source-linked listings as a market sample, then verify details locally.",
    },
  ];
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function titleCaseName(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferCreditFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const parts = base.split("-").filter(Boolean);
  if (parts.length === 0) return "";

  const lower = parts.map((part) => part.toLowerCase());
  if (lower[0] === "pexels") {
    const nameParts = parts.slice(1).filter((part) => !/^\d+$/.test(part));
    if (nameParts.length > 0) return `${titleCaseName(nameParts.join(" "))} / Pexels`;
  }

  const firstNumericIndex = parts.findIndex((part) => /^\d+$/.test(part));
  const likelyNameParts = firstNumericIndex >= 0 ? parts.slice(0, firstNumericIndex) : parts;
  if (likelyNameParts.length >= 2 && DESCRIPTOR_WORDS.has(likelyNameParts[1].toLowerCase())) {
    return titleCaseName(likelyNameParts[0]);
  }
  if (likelyNameParts.length === 1) return titleCaseName(likelyNameParts[0]);
  if (likelyNameParts.length >= 2) return titleCaseName(likelyNameParts.slice(0, 2).join(" "));
  return "";
}

function formatSlideRange(indices: number[]): string {
  if (indices.length === 1) return `Slide ${indices[0]}`;
  const sorted = [...indices].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `Slide ${start}` : `Slides ${start}-${prev}`);
    start = current;
    prev = current;
  }
  ranges.push(start === prev ? `Slide ${start}` : `Slides ${start}-${prev}`);
  return ranges.join(", ");
}

function buildPhotoCreditsBlock(slides: GuideSlide[]): string {
  const groups = new Map<string, number[]>();
  slides.forEach((slide, index) => {
    const credit = slide.imageCredit.trim();
    if (!credit) return;
    const existing = groups.get(credit) ?? [];
    existing.push(index + 1);
    groups.set(credit, existing);
  });
  if (groups.size === 0) return "";
  return [
    "Photo credits:",
    ...Array.from(groups.entries()).map(([credit, indices]) => `${formatSlideRange(indices)}: ${credit}`),
  ].join("\n");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read rendered slide"));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not export PNG. Remote image permissions may block canvas export."));
      else resolve(blob);
    }, "image/png");
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:!?]?$/, "") + "...";
  }
  return lines;
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  fillStyle: string,
) {
  ctx.fillStyle = fillStyle;
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function drawLockup(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#f7f3ea") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, 30, 30);
  ctx.strokeRect(x + 10, y + 10, 30, 30);
  ctx.fillRect(x + 20, y + 20, 18, 18);
  ctx.font = "600 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("CVREI", x + 56, y + 31);
  ctx.restore();
}

async function renderContentSlide(slide: GuideSlide, index: number, total: number, brandFilter: boolean): Promise<Blob> {
  const image = await loadImage(slide.imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  const drawPhoto = () => coverImage(ctx, image, 0, 0, WIDTH, HEIGHT);
  if (brandFilter) applyBrandImageFilter(ctx, "editorial", drawPhoto);
  else drawPhoto();

  const gradient = ctx.createLinearGradient(0, HEIGHT * 0.52, 0, HEIGHT);
  gradient.addColorStop(0, "rgba(13, 31, 28, 0)");
  gradient.addColorStop(0.48, "rgba(13, 31, 28, 0.48)");
  gradient.addColorStop(1, "rgba(13, 31, 28, 0.82)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawLockup(ctx, 72, 70);

  ctx.fillStyle = "rgba(247, 243, 234, 0.72)";
  ctx.font = "500 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, WIDTH - 170, 102);

  const panelX = 72;
  const panelY = 790;
  const panelW = WIDTH - 144;
  const maxTextW = panelW - 64;

  ctx.fillStyle = "rgba(247, 243, 234, 0.92)";
  roundedRect(ctx, panelX, panelY, panelW, 380, 6);
  ctx.fill();

  if (slide.label.trim()) {
    ctx.font = "700 24px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle = "#2d4a42";
    ctx.fillText(slide.label.trim().toUpperCase(), panelX + 32, panelY + 62);
  }

  ctx.font = "700 54px Georgia, Times New Roman, serif";
  const headlineLines = wrapLines(ctx, slide.headline, maxTextW, 3);
  drawTextBlock(ctx, headlineLines, panelX + 32, panelY + 126, 62, "#111110");

  if (slide.body.trim()) {
    ctx.font = "400 31px system-ui, -apple-system, Segoe UI, sans-serif";
    const bodyLines = wrapLines(ctx, slide.body, maxTextW, 3);
    drawTextBlock(ctx, bodyLines, panelX + 32, panelY + 126 + headlineLines.length * 62 + 30, 42, "#2d3431");
  }

  ctx.font = "400 18px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "rgba(247, 243, 234, 0.74)";
  ctx.fillText(`Photo: ${slide.imageCredit.trim()}`, 72, HEIGHT - 54);

  return canvasToPngBlob(canvas);
}

async function renderCtaSlide(headline: string, subcopy: string, destination: string, total: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  ctx.fillStyle = "#f7f3ea";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#dfe6dc";
  ctx.fillRect(0, 0, WIDTH, 420);
  ctx.fillStyle = "#8ecfbf";
  ctx.fillRect(72, 220, WIDTH - 144, 10);

  drawLockup(ctx, 72, 70, "#111110");

  ctx.fillStyle = "#2d4a42";
  ctx.font = "600 24px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`${String(total).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, WIDTH - 170, 102);

  ctx.font = "700 68px Georgia, Times New Roman, serif";
  const headlineLines = wrapLines(ctx, headline, WIDTH - 180, 4);
  drawTextBlock(ctx, headlineLines, 90, 560, 78, "#111110");

  ctx.font = "400 34px system-ui, -apple-system, Segoe UI, sans-serif";
  const subcopyLines = wrapLines(ctx, subcopy, WIDTH - 180, 5);
  drawTextBlock(ctx, subcopyLines, 90, 560 + headlineLines.length * 78 + 58, 48, "#2d3431");

  ctx.fillStyle = "#2d4a42";
  roundedRect(ctx, 90, HEIGHT - 210, WIDTH - 180, 104, 6);
  ctx.fill();
  ctx.fillStyle = "#f7f3ea";
  ctx.font = "600 32px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(destination, 124, HEIGHT - 146);

  return canvasToPngBlob(canvas);
}

function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function u16(value: number): number[] {
  return [value & 255, (value >>> 8) & 255];
}

function u32(value: number): number[] {
  return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
}

function blobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function createZip(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(await file.blob.arrayBuffer());
    const crc = crc32(data);
    const localHeader = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0),
    ]);
    chunks.push(localHeader, nameBytes, data);

    const centralHeader = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nameBytes.length), ...u16(0),
      ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ]);
    central.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const centralOffset = offset;
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(centralOffset), ...u16(0),
  ]);

  return new Blob([...chunks, ...central, end].map(blobPart), { type: "application/zip" });
}

function fileSlug(title: string): string {
  return (title || "guide-social-post")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70) || "guide-social-post";
}

function PreviewImage({ slide, onStatus }: { slide: GuideSlide; onStatus: (status: ImageStatus) => void }) {
  useEffect(() => {
    if (!slide.imageUrl) {
      onStatus("idle");
    }
  }, [slide.imageUrl]);

  if (!slide.imageUrl) {
    return <div className="h-28 rounded bg-surface-2 border border-border flex items-center justify-center text-xs text-foreground-subtle">No image selected</div>;
  }

  return (
    <div className="h-28 rounded bg-surface-2 border border-border overflow-hidden">
      <img
        src={slide.imageUrl}
        alt=""
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onLoad={() => onStatus("loaded")}
        onError={() => onStatus("error")}
      />
    </div>
  );
}

export function GuideSocialBuilderView() {
  const [postTitle, setPostTitle] = useState("7 things to know about Cape Verde");
  const [internalNote, setInternalNote] = useState("");
  const [slides, setSlides] = useState<GuideSlide[]>(sampleSlides);
  const [includeCta, setIncludeCta] = useState(true);
  const [ctaHeadline, setCtaHeadline] = useState(DEFAULT_CTA_HEADLINE);
  const [ctaSubcopy, setCtaSubcopy] = useState(DEFAULT_CTA_COPY);
  const [ctaDestination, setCtaDestination] = useState(DEFAULT_CTA_DESTINATION);
  const [caption, setCaption] = useState("");
  const [appendFooter, setAppendFooter] = useState(true);
  const [brandFilter, setBrandFilter] = useState(() => localStorage.getItem("guide_social_brand_filter") !== "off");
  const [rendered, setRendered] = useState<RenderedSlide[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const finalCaption = useMemo(() => {
    if (!appendFooter) return caption;
    const credits = buildPhotoCreditsBlock(slides);
    const footer = [
      ctaDestination.trim() || DEFAULT_CTA_DESTINATION,
      "#capeverde #caboverde #capeverdeproperty #realestate #cvrei",
      credits,
    ].filter(Boolean).join("\n\n");
    return [caption.trim(), footer].filter(Boolean).join("\n\n");
  }, [appendFooter, caption, ctaDestination, slides]);

  useEffect(() => {
    localStorage.setItem("guide_social_brand_filter", brandFilter ? "on" : "off");
  }, [brandFilter]);

  function updateSlide(id: string, patch: Partial<GuideSlide>) {
    setSlides((current) => current.map((slide) => slide.id === id ? { ...slide, ...patch } : slide));
  }

  function addSlide() {
    if (slides.length >= 7) return;
    setSlides((current) => [...current, emptySlide()]);
  }

  function removeSlide(id: string) {
    if (slides.length <= 3) return;
    setSlides((current) => current.filter((slide) => slide.id !== id));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    setSlides((current) => {
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }

  async function pickUpload(slideId: string, file: File | undefined) {
    if (!file) return;
    const dataUrl = await blobToDataUrl(file);
    const inferredCredit = inferCreditFromFilename(file.name);
    updateSlide(slideId, {
      imageUrl: dataUrl,
      originalFilename: file.name,
      imageCredit: inferredCredit,
      imageCreditStatus: inferredCredit ? "auto_detected" : "manual",
      imageStatus: "loading",
    });
  }

  function validationErrors(): string[] {
    const errors: string[] = [];
    if (!postTitle.trim()) errors.push("Post title is required.");
    if (slides.length < 3 || slides.length > 7) errors.push("Create between 3 and 7 content slides.");
    slides.forEach((slide, index) => {
      const n = index + 1;
      if (!slide.imageUrl.trim()) errors.push(`Slide ${n} needs an image upload or image URL.`);
      if (slide.imageStatus !== "loaded") errors.push(`Slide ${n} image has not loaded successfully.`);
      if (!slide.imageCredit.trim()) errors.push(`Slide ${n} needs an image source or credit.`);
      if (slide.imageRights === "unknown") errors.push(`Slide ${n} image rights/source cannot be unknown for export.`);
      if (!slide.headline.trim()) errors.push(`Slide ${n} needs a headline.`);
    });
    if (includeCta) {
      if (!ctaHeadline.trim()) errors.push("CTA headline is required when the CTA slide is enabled.");
      if (!ctaSubcopy.trim()) errors.push("CTA subcopy is required when the CTA slide is enabled.");
      if (!ctaDestination.trim()) errors.push("CTA destination is required when the CTA slide is enabled.");
    }
    return errors;
  }

  async function renderAll(): Promise<RenderedSlide[]> {
    const errors = validationErrors();
    if (errors.length) throw new Error(errors.join("\n"));
    const total = slides.length + (includeCta ? 1 : 0);
    const output: RenderedSlide[] = [];
    for (let i = 0; i < slides.length; i += 1) {
      const blob = await renderContentSlide(slides[i], i, total, brandFilter);
      output.push({ filename: `${String(i + 1).padStart(2, "0")}.png`, blob, dataUrl: await blobToDataUrl(blob) });
    }
    if (includeCta) {
      const blob = await renderCtaSlide(ctaHeadline.trim(), ctaSubcopy.trim(), ctaDestination.trim(), total);
      output.push({ filename: `${String(total).padStart(2, "0")}.png`, blob, dataUrl: await blobToDataUrl(blob) });
    }
    return output;
  }

  async function handleRenderPreview() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const output = await renderAll();
      setRendered(output);
      setMessage(`Rendered ${output.length} Instagram 4:5 PNG slides.`);
    } catch (e) {
      setRendered([]);
      setError(e instanceof Error ? e.message : "Could not render preview.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadZip() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const output = await renderAll();
      setRendered(output);
      const metadata = {
        postTitle: postTitle.trim(),
        internalNote: internalNote.trim() || null,
        slideOrder: slides.map((slide, index) => ({
          index: index + 1,
          label: slide.label.trim() || null,
          headline: slide.headline.trim(),
          originalFilename: slide.originalFilename,
          imageCredit: slide.imageCredit.trim(),
          imageCreditStatus: slide.imageCreditStatus,
          imageRights: slide.imageRights,
          imageSourceUrl: slide.imageUrl.startsWith("data:") ? null : slide.imageUrl,
        })),
        cta: includeCta ? { headline: ctaHeadline.trim(), subcopy: ctaSubcopy.trim(), destination: ctaDestination.trim() } : null,
        brandFilter,
        imageCredits: slides.map((slide) => slide.imageCredit.trim()),
        imageSourceUrls: slides.map((slide) => slide.imageUrl.startsWith("data:") ? null : slide.imageUrl),
        exportTimestamp: new Date().toISOString(),
      };
      const files = [
        ...output.map((slide) => ({ name: slide.filename, blob: slide.blob })),
        { name: "caption.txt", blob: new Blob([finalCaption], { type: "text/plain;charset=utf-8" }) },
        { name: "metadata.json", blob: new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json;charset=utf-8" }) },
      ];
      const zip = await createZip(files);
      downloadBlob(`${fileSlug(postTitle)}.zip`, zip);
      setMessage(`Downloaded ZIP with ${output.length} PNG slides, caption.txt and metadata.json.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download ZIP.");
    } finally {
      setBusy(false);
    }
  }

  const validation = validationErrors();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-wide text-foreground-subtle font-medium">Marketing</div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Guide Social Builder</h1>
      </header>

      <section className="border border-border bg-surface-1 rounded p-4 md:p-5">
        <h2 className="text-base font-semibold text-foreground mb-4">1. Post details</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div>
            <label className={labelClass}>Post title</label>
            <input className={inputClass} value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Optional internal note</label>
            <input className={inputClass} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="border border-border bg-surface-1 rounded p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-foreground">2. Slides</h2>
          <button type="button" onClick={addSlide} disabled={slides.length >= 7} className="px-3 py-2 text-sm bg-primary text-primary-foreground disabled:opacity-40">
            Add slide
          </button>
        </div>

        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div key={slide.id} className="border border-border rounded bg-background p-3 md:p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="text-sm font-semibold text-foreground">Slide {index + 1}</div>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0} className="px-2 py-1 text-xs border border-border disabled:opacity-40">Up</button>
                  <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1} className="px-2 py-1 text-xs border border-border disabled:opacity-40">Down</button>
                  <button type="button" onClick={() => removeSlide(slide.id)} disabled={slides.length <= 3} className="px-2 py-1 text-xs border border-border text-red disabled:opacity-40">Remove</button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="space-y-2">
                  <PreviewImage slide={slide} onStatus={(status) => updateSlide(slide.id, { imageStatus: status })} />
                  {slide.imageStatus === "error" && <p className="text-xs text-red">Image failed to load. Replace it before export.</p>}
                  {slide.imageStatus === "loading" && <p className="text-xs text-foreground-subtle">Checking image...</p>}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2 grid gap-2 md:grid-cols-[1fr_auto]">
                    <div>
                      <label className={labelClass}>Image URL</label>
                      <input className={inputClass} value={slide.imageUrl.startsWith("data:") ? "Uploaded image" : slide.imageUrl} onChange={(e) => updateSlide(slide.id, { imageUrl: e.target.value, originalFilename: null, imageCreditStatus: "manual", imageStatus: "loading" })} disabled={slide.imageUrl.startsWith("data:")} placeholder="https://..." />
                    </div>
                    <div className="flex items-end gap-2">
                      <input
                        ref={(el) => { fileInputs.current[slide.id] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickUpload(slide.id, e.target.files?.[0])}
                      />
                      <button type="button" onClick={() => fileInputs.current[slide.id]?.click()} className="px-3 py-2 text-sm border border-border">Upload</button>
                      {slide.imageUrl.startsWith("data:") && (
                        <button type="button" onClick={() => updateSlide(slide.id, { imageUrl: "", originalFilename: null, imageCreditStatus: "manual", imageStatus: "idle" })} className="px-3 py-2 text-sm border border-border">Clear</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Image source/credit</label>
                    <input className={inputClass} value={slide.imageCredit} onChange={(e) => updateSlide(slide.id, { imageCredit: e.target.value, imageCreditStatus: "manual" })} placeholder="Photographer / source / license note" />
                    {slide.imageCreditStatus === "auto_detected" && (
                      <p className="mt-1 text-xs text-amber">Auto-detected — verify</p>
                    )}
                    {slide.originalFilename && (
                      <p className="mt-1 text-[11px] text-foreground-subtle truncate">Original file: {slide.originalFilename}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Rights/source</label>
                    <select className={inputClass} value={slide.imageRights} onChange={(e) => updateSlide(slide.id, { imageRights: e.target.value as ImageRights })}>
                      {RIGHTS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Optional short label</label>
                    <input className={inputClass} value={slide.label} onChange={(e) => updateSlide(slide.id, { label: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Headline</label>
                    <input className={inputClass} value={slide.headline} onChange={(e) => updateSlide(slide.id, { headline: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Optional short body text</label>
                    <textarea className={inputClass} rows={2} value={slide.body} onChange={(e) => updateSlide(slide.id, { body: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-surface-1 rounded p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-foreground">3. CTA</h2>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input type="checkbox" checked={includeCta} onChange={(e) => setIncludeCta(e.target.checked)} />
            Include final CTA slide
          </label>
        </div>
        <div className="grid gap-4">
          <div>
            <label className={labelClass}>Headline</label>
            <input className={inputClass} value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} disabled={!includeCta} />
          </div>
          <div>
            <label className={labelClass}>Subcopy</label>
            <textarea className={inputClass} rows={2} value={ctaSubcopy} onChange={(e) => setCtaSubcopy(e.target.value)} disabled={!includeCta} />
          </div>
          <div>
            <label className={labelClass}>Destination</label>
            <input className={inputClass} value={ctaDestination} onChange={(e) => setCtaDestination(e.target.value)} disabled={!includeCta} />
          </div>
        </div>
      </section>

      <section className="border border-border bg-surface-1 rounded p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-foreground">4. Caption</h2>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input type="checkbox" checked={appendFooter} onChange={(e) => setAppendFooter(e.target.checked)} />
            Append simple footer
          </label>
        </div>
        <textarea className={inputClass} rows={7} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write or paste the editorial hook manually." />
        {appendFooter && (
          <details className="mt-3 text-sm text-foreground-muted">
            <summary className="cursor-pointer">Preview caption footer</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs bg-background border border-border rounded p-3">{finalCaption}</pre>
          </details>
        )}
      </section>

      <section className="border border-border bg-surface-1 rounded p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-foreground mr-auto">5. Preview and export</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-muted">Brand filter</span>
            <div className="flex rounded border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setBrandFilter(true)}
                className={`px-3 py-2 text-xs ${brandFilter ? "bg-primary text-primary-foreground" : "bg-background text-foreground-muted"}`}
              >
                On
              </button>
              <button
                type="button"
                onClick={() => setBrandFilter(false)}
                className={`px-3 py-2 text-xs border-l border-border ${!brandFilter ? "bg-primary text-primary-foreground" : "bg-background text-foreground-muted"}`}
              >
                Off
              </button>
            </div>
          </div>
          <button type="button" onClick={handleRenderPreview} disabled={busy} className="px-3 py-2 text-sm border border-border disabled:opacity-50">Render preview</button>
          <button type="button" onClick={handleDownloadZip} disabled={busy || validation.length > 0} className="px-3 py-2 text-sm bg-primary text-primary-foreground disabled:opacity-40">Download ZIP</button>
        </div>

        {validation.length > 0 && (
          <div className="mb-4 rounded border border-amber bg-amber-muted p-3 text-sm text-amber">
            <div className="font-semibold mb-1">Export blocked</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {validation.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
              {validation.length > 8 && <li>{validation.length - 8} more issue(s)</li>}
            </ul>
          </div>
        )}
        {error && <pre className="mb-4 whitespace-pre-wrap rounded border border-red bg-red-muted p-3 text-sm text-red">{error}</pre>}
        {message && <div className="mb-4 rounded border border-green bg-green-muted p-3 text-sm text-green">{message}</div>}

        {rendered.length === 0 ? (
          <div className="border border-dashed border-border rounded bg-background p-8 text-center text-sm text-foreground-muted">
            Render a preview after adding images, credits and slide text.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rendered.map((slide) => (
              <div key={slide.filename} className="border border-border rounded bg-background p-2">
                <img src={slide.dataUrl} alt={slide.filename} className="w-full aspect-[4/5] object-cover rounded" />
                <div className="mt-2 text-xs text-foreground-subtle">{slide.filename}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
