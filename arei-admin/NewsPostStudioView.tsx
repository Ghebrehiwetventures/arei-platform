import React, { useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import { fetchMarketNewsSocialState, type MarketNewsItem } from "./socialMarketNews";
import { supabaseAuth } from "./supabase";
import {
  MAX_SLIDES,
  MIN_SLIDES,
  emptySlide,
  addSlide as addSlideOp,
  duplicateActive as duplicateActiveOp,
  deleteSlide as deleteSlideOp,
  moveSlide as moveSlideOp,
  setActive as setActiveOp,
  updateActive as updateActiveOp,
  setSlideById,
  activeSlide as activeSlideOf,
  activeIndex as activeIndexOf,
  applyRenderResult,
  buildRenderRequest,
  canReuseSource,
  needsRender,
  slideFilename,
  zipName,
  type CarouselSlide,
  type CarouselState,
  type ImageSource,
  type RenderResult,
  type RenderRequestOpts,
} from "./newsCarousel";

const CATEGORIES = ["Aviation", "Real Estate", "Tourism", "Policy", "Infrastructure", "Market News"];

const inputCls = "w-full bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded";

type AiProvider = "gemini" | "openai";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

// First complete sentence — avoids the mid-word truncation of a raw char slice.
function firstSentence(text: string): string {
  const t = (text || "").trim();
  if (!t) return "";
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim();
}

// Auto-suggest the sage highlight: the back half of the headline carries the
// news (the subject/outcome). Matches how a human picks it ~most of the time.
function suggestHighlight(headline: string): string {
  const w = (headline || "").trim().split(/\s+/).filter(Boolean);
  if (w.length < 4) return "";
  return w.slice(Math.floor(w.length / 2)).join(" ");
}

// Add/replace a single photo-credit line in the caption (Pexels photographer).
// Idempotent: removes any prior credit line first, so it never duplicates.
function applyPhotoCredit(caption: string, credit: string): string {
  const stripped = caption
    .split("\n")
    .filter((l) => !/^\s*Photo:\s.*\/\sPexels\s*$/i.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
  if (!credit) return stripped;
  const paras = stripped.split("\n\n");
  const lastIsTags = paras.length > 1 && /(^|\s)#\w/.test(paras[paras.length - 1]);
  if (lastIsTags) {
    paras.splice(paras.length - 1, 0, credit);
    return paras.join("\n\n");
  }
  return `${stripped}\n\n${credit}`;
}

// Instagram caption = the news, summarised: headline + what-happened + source +
// hashtags. The caption is carousel-level (one per post).
function buildCaption(item: MarketNewsItem): string {
  const tags = ["#capeverde", "#caboverde", "#realestate", "#marketnews", "#" + (item.category || "").toLowerCase().replace(/[^a-z]/g, "")]
    .filter((t) => t.length > 1);
  const parts: string[] = [];
  if (item.sourceTitle?.trim()) parts.push(item.sourceTitle.trim());
  if (item.whatHappened?.trim()) parts.push(item.whatHappened.trim());
  if (item.sourceName?.trim()) parts.push(`Source: ${item.sourceName.trim()}`);
  parts.push(tags.join(" "));
  return parts.join("\n\n");
}

// Downscale an uploaded image client-side before sending it as a data: URL.
function downscaleImageToDataUrl(file: File, maxDim = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// Largest data: URL we'll round-trip on a deterministic re-render. Vercel caps
// the request body at ~4.5 MB; we keep a margin. A normal AI / curated-Pexels /
// downscaled-upload photo sits well under this.
const MAX_SOURCE_DATAURL = 4_300_000;

interface RenderApiResponse {
  slides: { label: string; imageBase64: string }[];
  mime: string;
  promptUsed: string | null;
  warning: string | null;
  photoMeta?: RenderResult["photoMeta"];
  sourceImageBase64?: string;
  sourceImageMime?: string;
}

const initialState = (): CarouselState => {
  const first = emptySlide();
  return { slides: [first], activeSlideId: first.id, caption: "" };
};

export function NewsPostStudioView() {
  // ── Single source of truth ──────────────────────────────────────────────
  const [carousel, setCarousel] = useState<CarouselState>(initialState);
  // Always-fresh snapshot for async render callbacks (avoids stale closures and
  // applies results to the correct slide id even if the user switches slides).
  const carouselRef = useRef(carousel);
  useEffect(() => { carouselRef.current = carousel; }, [carousel]);

  const slide = activeSlideOf(carousel);
  const idx = activeIndexOf(carousel);

  // ── Global / UI state (not per-slide) ───────────────────────────────────
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sortBy, setSortBy] = useState("relevant");
  const [quality, setQuality] = useState("high");
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [tweakNote, setTweakNote] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ permalink: string } | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [reenriching, setReenriching] = useState(false);
  const [reenrichMsg, setReenrichMsg] = useState("");
  const [clustering, setClustering] = useState(false);
  const [clusterMsg, setClusterMsg] = useState("");

  const [richerSibling, setRicherSibling] = useState<MarketNewsItem | null>(null);
  const [richerSourceCount, setRicherSourceCount] = useState(0);

  useEffect(() => {
    fetchMarketNewsSocialState()
      .then((s) => setItems(s.items))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingItems(false));
  }, []);

  // ── Slide editing — all writes go through the carousel reducer ───────────
  function updateActive(patch: Partial<CarouselSlide>) {
    setCarousel((s) => updateActiveOp(s, patch));
  }
  function setCaption(next: string) {
    setCarousel((s) => ({ ...s, caption: next }));
  }

  function selectItem(item: MarketNewsItem) {
    const title = item.sourceTitle || "";
    setCarousel((s) => {
      const ns = updateActiveOp(s, {
        headline: title,
        category: CATEGORIES.includes(item.category) ? item.category : "Market News",
        dek: firstSentence(item.whatHappened || ""),
        date: formatDate(item.publishedAt),
        highlight: suggestHighlight(title),
        region: item.region || "",
        sourceUrl: item.sourceUrl || "",
        sourceName: item.sourceName || "",
        articleBodyUsed: item.articleBodyUsed ?? null,
        selectedItemId: item.id,
        dateWarning: (() => {
          const y = item.publishedAt ? new Date(item.publishedAt).getFullYear() : NaN;
          return Number.isFinite(y) && y < new Date().getFullYear() - 1;
        })(),
      });
      // Caption is carousel-level: set it from the item only for a fresh/empty
      // carousel, so building extra slides never clobbers an edited caption.
      const setCap = ns.slides.length <= 1 || !ns.caption.trim();
      return setCap ? { ...ns, caption: buildCaption(item) } : ns;
    });
    setError(null);
    setPublished(null);
    setPublishError(null);
    setRicherSibling(null);
    setRicherSourceCount(0);
    if (item.articleBodyUsed !== true) loadRicherSibling(item.id);
  }

  async function loadRicherSibling(itemId: string) {
    try {
      const res = await fetch(`/api/richer-sibling?id=${encodeURIComponent(itemId)}`, {
        credentials: "include",
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      // Apply only if the active slide still points at this item.
      if (activeSlideOf(carouselRef.current).selectedItemId === itemId) {
        setRicherSibling(data.sibling || null);
        setRicherSourceCount(data.sourceCount || 0);
      }
    } catch {
      /* optional — ignore */
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  // Pure network call: build the request for a slide snapshot, return the
  // render result. No state writes — the caller applies it to the right id.
  async function callRender(target: CarouselSlide, opts: RenderRequestOpts = {}): Promise<RenderResult> {
    const body = buildRenderRequest(target, { ...opts, quality, aiProvider }) as Record<string, unknown>;
    const imageUrl = body.imageUrl;
    if (typeof imageUrl === "string" && imageUrl.startsWith("data:") && imageUrl.length > MAX_SOURCE_DATAURL) {
      throw new Error("Source image is too large to re-render — generate a new (smaller) image for this slide.");
    }
    const res = await fetch("/api/generate-news-post-image", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
    const data: RenderApiResponse = await res.json().catch(() => ({} as RenderApiResponse));
    if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
    const png = data.slides?.[0]?.imageBase64 || "";
    if (!png) throw new Error("Renderer returned no image");
    const isFresh = !canReuseSource(target, opts);
    return {
      resultPng: png,
      sourceImageBase64: data.sourceImageBase64 || target.sourceImageBase64,
      sourceImageMime: data.sourceImageMime || target.sourceImageMime,
      promptUsed: data.promptUsed ?? null,
      photoMeta: data.photoMeta ?? null,
      warning: data.warning ?? null,
      isFresh,
    };
  }

  // Generate / regenerate the active slide's image + composition.
  async function generate(opts: RenderRequestOpts = {}) {
    const sid = carouselRef.current.activeSlideId;
    const target = activeSlideOf(carouselRef.current);
    setGenerating(true);
    setError(null);
    try {
      const r = await callRender(target, opts);
      setCarousel((s) => {
        const ns = setSlideById(s, sid, (sl) => applyRenderResult(sl, r));
        return { ...ns, caption: applyPhotoCredit(ns.caption, r.photoMeta?.photo_attribution_text || "") };
      });
      setPublished(null);
      setPublishError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }

  function tweak() {
    const target = activeSlideOf(carouselRef.current);
    const base = (target.basePrompt || target.promptUsed || "").trim();
    if (!base) return;
    const note = tweakNote.trim();
    const prompt = note
      ? `${base} Variation, keeping the same subject and style: ${note}.`
      : `${base} Produce a fresh variation — alternate composition, camera angle and lighting — keeping the same subject and style.`;
    generate({ aiPromptOverride: prompt });
  }

  // Render every slide in order (deterministic when a source photo exists).
  // Throws — naming the failing slide — so callers never ship a partial result.
  async function renderAllInOrder(): Promise<string[]> {
    const slides = carouselRef.current.slides.slice();
    const pngs: string[] = [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      setExportMsg(`Rendering ${i + 1} of ${slides.length}…`);
      if (needsRender(s)) {
        let r: RenderResult;
        try {
          r = await callRender(s, {});
        } catch (e: unknown) {
          const why = e instanceof Error ? e.message : String(e);
          throw new Error(`Slide ${i + 1} (${s.headline || "untitled"}) failed: ${why}`);
        }
        setCarousel((cs) => setSlideById(cs, s.id, (sl) => applyRenderResult(sl, r)));
        pngs.push(r.resultPng);
      } else {
        pngs.push(s.resultPng);
      }
    }
    return pngs;
  }

  async function downloadCurrent() {
    const cs0 = carouselRef.current;
    const i = cs0.slides.findIndex((s) => s.id === cs0.activeSlideId);
    const s = cs0.slides[i];
    let png = s.resultPng;
    if (needsRender(s)) {
      setGenerating(true);
      setError(null);
      try {
        const r = await callRender(s, {});
        setCarousel((cs) => setSlideById(cs, s.id, (sl) => applyRenderResult(sl, r)));
        png = r.resultPng;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setGenerating(false);
        return;
      }
      setGenerating(false);
    }
    if (!png) return;
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${png}`;
    a.download = slideFilename(i, s.headline);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function downloadCarousel() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    setExportMsg("Preparing…");
    try {
      const pngs = await renderAllInOrder();
      setExportMsg("Packaging ZIP…");
      const slides = carouselRef.current.slides;
      const files: Record<string, Uint8Array> = {};
      slides.forEach((s, i) => { files[slideFilename(i, s.headline)] = b64ToU8(pngs[i]); });
      const zipped = zipSync(files, { level: 0 }); // store — PNGs are already compressed
      const blob = new Blob([zipped], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName(carouselRef.current);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMsg(`Done — ${slides.length} slide${slides.length === 1 ? "" : "s"}.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setExportMsg("");
    } finally {
      setExporting(false);
    }
  }

  async function runReenrichBackfill() {
    if (reenriching) return;
    setReenriching(true);
    setReenrichMsg("Starting…");
    try {
      let done = false;
      let total = 0;
      let guard = 0;
      while (!done && guard < 100) {
        guard++;
        const res = await fetch("/api/reenrich-market-news?limit=6", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        total += data.processed || 0;
        done = Boolean(data.done);
        setReenrichMsg(`Re-enriched ${total}… ${data.remaining ?? "?"} remaining`);
      }
      setReenrichMsg(done ? `Done — re-enriched ${total} items.` : `Paused after ${total}. Click again to continue.`);
    } catch (e: unknown) {
      setReenrichMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReenriching(false);
    }
  }

  async function runClustering() {
    if (clustering) return;
    setClustering(true);
    setClusterMsg("Clustering…");
    try {
      const res = await fetch("/api/cluster-news", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setClusterMsg(`${data.clusters} clusters from ${data.articles} articles · ${data.multiSourceClusters} multi-source · ${data.duplicatesGrouped} duplicates grouped`);
    } catch (e: unknown) {
      setClusterMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setClustering(false);
    }
  }

  // Publish the whole carousel: render every slide in order, then post.
  async function publish() {
    if (publishing) return;
    const n = carouselRef.current.slides.length;
    if (!window.confirm(`Publish ${n} slide${n === 1 ? "" : "s"} to Instagram now? It goes live immediately.`)) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const pngs = await renderAllInOrder();
      const res = await fetch("/api/publish-news-post", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ images: pngs, caption: carouselRef.current.caption }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Publish failed (${res.status})`);
      setPublished({ permalink: data.permalink || "" });
    } catch (e: unknown) {
      setPublishError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
      setExportMsg("");
    }
  }

  // ── Slide-rail actions ──────────────────────────────────────────────────
  const slides = carousel.slides;
  const busy = generating || exporting || publishing;
  const addSlide = () => setCarousel((s) => addSlideOp(s));
  const duplicateSlide = () => setCarousel((s) => duplicateActiveOp(s));
  const removeSlide = () => setCarousel((s) => deleteSlideOp(s, s.activeSlideId));
  const moveLeft = () => setCarousel((s) => moveSlideOp(s, s.activeSlideId, "left"));
  const moveRight = () => setCarousel((s) => moveSlideOp(s, s.activeSlideId, "right"));
  const goPrev = () => setCarousel((s) => setActiveOp(s, s.slides[Math.max(0, activeIndexOf(s) - 1)].id));
  const goNext = () => setCarousel((s) => setActiveOp(s, s.slides[Math.min(s.slides.length - 1, activeIndexOf(s) + 1)].id));

  const categoryOptions = Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort();
  const filteredItems = items
    .filter((i) => (!catFilter || i.category === catFilter) &&
      (!search || (i.sourceTitle || "").toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sortBy === "relevant") {
        const ra = a.relevanceScore ?? -1;
        const rb = b.relevanceScore ?? -1;
        if (rb !== ra) return rb - ra;
        return (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0);
      }
      const ta = new Date(a.publishedAt).getTime() || 0;
      const tb = new Date(b.publishedAt).getTime() || 0;
      return sortBy === "oldest" ? ta - tb : tb - ta;
    });

  const railBtn = "px-2.5 py-1.5 rounded border border-border text-[11px] font-mono hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-mono font-semibold tracking-wide">News Post Studio</h1>
        <p className="text-xs text-foreground-muted mt-1">
          Build a 1–{MAX_SLIDES} slide Instagram carousel. Every slide is the same branded hero —
          edit each one, then download all as a ZIP.
        </p>
      </div>

      {/* ── Slide rail ──────────────────────────────────── */}
      <div className="mb-4 border border-border rounded p-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCarousel((cs) => setActiveOp(cs, s.id))}
              className={`shrink-0 w-36 text-left px-2 py-1.5 rounded border transition-colors ${
                s.id === carousel.activeSlideId ? "border-accent bg-surface-2" : "border-border hover:bg-surface-2/60"
              }`}
              title={s.headline || `Slide ${i + 1}`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-foreground-subtle">{String(i + 1).padStart(2, "0")}</span>
                {s.dirty && <span className="text-[9px] text-amber-600" title="Edited — needs re-render">●</span>}
                {!s.resultPng && <span className="text-[9px] text-foreground-muted" title="Not rendered yet">○</span>}
              </div>
              <div className="text-[11px] leading-snug line-clamp-2 mt-0.5">{s.headline || <span className="text-foreground-muted">Empty slide</span>}</div>
            </button>
          ))}
        </div>
        {/* Status legend for the slide markers — subtle. */}
        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-foreground-muted">
          <span><span className="text-amber-600">●</span> edited · needs render</span>
          <span><span className="text-foreground-muted">○</span> not rendered yet</span>
          <span>no marker · rendered &amp; current</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border">
          <button className={railBtn} onClick={addSlide} disabled={busy || slides.length >= MAX_SLIDES}>+ Add</button>
          <button className={railBtn} onClick={duplicateSlide} disabled={busy || slides.length >= MAX_SLIDES}>⧉ Duplicate</button>
          <button className={railBtn} onClick={removeSlide} disabled={busy || slides.length <= MIN_SLIDES}>🗑 Delete</button>
          <span className="w-px h-5 bg-border mx-1" />
          <button className={railBtn} onClick={moveLeft} disabled={busy || idx === 0}>◀ Move</button>
          <button className={railBtn} onClick={moveRight} disabled={busy || idx === slides.length - 1}>Move ▶</button>
          <span className="w-px h-5 bg-border mx-1" />
          <button className={railBtn} onClick={goPrev} disabled={busy || idx === 0}>‹ Prev</button>
          <button className={railBtn} onClick={goNext} disabled={busy || idx === slides.length - 1}>Next ›</button>
          <span className="ml-auto flex items-center gap-2">
            {exportMsg && <span className="text-[11px] font-mono text-foreground-subtle">{exportMsg}</span>}
            <button
              onClick={downloadCarousel}
              disabled={busy}
              className="px-3 py-1.5 rounded bg-accent text-accent-foreground text-[11px] font-mono font-medium disabled:opacity-50"
            >
              {exporting ? "Exporting…" : `↓ Download carousel (${slides.length})`}
            </button>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_minmax(0,420px)] gap-5">
        {/* ── Item picker ─────────────────────────────── */}
        <div className="border border-border rounded">
          <div className="px-3 py-2 border-b border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle flex items-center justify-between">
            <span>Market news</span>
            <span className="text-foreground-muted normal-case tracking-normal">{filteredItems.length}</span>
          </div>
          <div className="p-2 border-b border-border space-y-2">
            <input className={inputCls + " text-xs"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search headlines…" />
            <div className="flex gap-2">
              <select className={inputCls + " text-xs"} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">All categories</option>
                {categoryOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <select className={inputCls + " text-xs"} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="relevant">Most relevant</option>
                <option value="recent">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
          <div className="p-2 border-b border-border">
            <button onClick={runReenrichBackfill} disabled={reenriching} className="w-full px-2 py-1.5 rounded border border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle hover:bg-surface-2 disabled:opacity-50">
              {reenriching ? "Re-enriching…" : "⟳ Backfill old captions"}
            </button>
            {reenrichMsg && <div className="mt-1 text-[10px] font-mono text-foreground-subtle">{reenrichMsg}</div>}
            <button onClick={runClustering} disabled={clustering} className="w-full mt-2 px-2 py-1.5 rounded border border-border text-[10px] font-mono uppercase tracking-widest text-foreground-subtle hover:bg-surface-2 disabled:opacity-50">
              {clustering ? "Clustering…" : "⟳ Rebuild news clusters"}
            </button>
            {clusterMsg && <div className="mt-1 text-[10px] font-mono text-foreground-subtle">{clusterMsg}</div>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loadingItems && <div className="p-3 text-xs text-foreground-muted">Loading…</div>}
            {!loadingItems && filteredItems.length === 0 && <div className="p-3 text-xs text-foreground-muted">No matching items.</div>}
            {filteredItems.map((it) => (
              <button
                key={it.id}
                onClick={() => selectItem(it)}
                className={`w-full text-left px-3 py-2 border-b border-border/60 transition-colors ${
                  slide.selectedItemId === it.id ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  {it.relevanceScore != null && (
                    <span
                      className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        it.relevanceScore >= 70 ? "bg-emerald-100 text-emerald-700"
                          : it.relevanceScore >= 40 ? "bg-amber-100 text-amber-700"
                          : "bg-surface-3 text-foreground-subtle"
                      }`}
                      title="AI relevance score (0–100)"
                    >
                      {it.relevanceScore}
                    </span>
                  )}
                  <div className="text-xs font-medium leading-snug line-clamp-2">{it.sourceTitle}</div>
                </div>
                <div className="text-[10px] font-mono text-foreground-subtle mt-1">{it.category} · {it.sourceName}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Editor (active slide) ───────────────────── */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">
            Editing slide {idx + 1} of {slides.length}
          </div>
          <Field label="Category">
            <select className={inputCls} value={slide.category} onChange={(e) => updateActive({ category: e.target.value })}>
              {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="Headline">
            <textarea className={inputCls} rows={2} value={slide.headline} onChange={(e) => updateActive({ headline: e.target.value })} />
          </Field>
          {slide.sourceUrl && (
            <a href={slide.sourceUrl} target="_blank" rel="noreferrer" className="block -mt-1 text-[11px] font-mono text-accent hover:underline truncate" title={slide.sourceUrl}>
              View original article{slide.sourceName ? ` · ${slide.sourceName}` : ""} →
            </a>
          )}
          {slide.selectedItemId && slide.articleBodyUsed !== null && (
            <span className={`inline-block -mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide ${slide.articleBodyUsed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {slide.articleBodyUsed ? "✓ Full article" : "Snippet only"}
            </span>
          )}
          {slide.dateWarning && (
            <div className="text-[10px] font-mono text-amber-700">⚠ Old published date — verify</div>
          )}
          {richerSibling && (
            <button onClick={() => selectItem(richerSibling)} className="block w-full text-left mt-1 px-2 py-1.5 rounded border border-accent/50 text-[11px] font-mono text-accent hover:bg-surface-2">
              ↑ Richer version from {richerSibling.sourceName} · full article{richerSourceCount ? ` · ${richerSourceCount} sources` : ""} →
              <span className="block text-foreground-subtle normal-case truncate mt-0.5">{richerSibling.sourceTitle}</span>
            </button>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">Highlight (phrase coloured sage)</div>
              <button type="button" onClick={() => updateActive({ highlight: suggestHighlight(slide.headline) })} className="text-[10px] font-mono text-accent hover:underline">↻ suggest</button>
            </div>
            <input className={inputCls} value={slide.highlight} onChange={(e) => updateActive({ highlight: e.target.value })} placeholder="e.g. Cabo Verde and Brazil" />
          </div>
          <Field label="Date">
            <input className={inputCls} value={slide.date} onChange={(e) => updateActive({ date: e.target.value })} placeholder="JUN 4, 2026" />
          </Field>
          <Field label="Dek (one supporting line)">
            <textarea className={inputCls} rows={2} value={slide.dek} onChange={(e) => updateActive({ dek: e.target.value })} />
          </Field>
          <Field label="Image source">
            <select className={inputCls} value={slide.imageSource} onChange={(e) => updateActive({ imageSource: e.target.value as ImageSource })}>
              <option value="ai">AI image (generated)</option>
              <option value="pexels">Curated Cape Verde photo (library)</option>
              <option value="upload">Upload image</option>
              <option value="url">Image URL</option>
            </select>
          </Field>

          {slide.imageSource === "pexels" && (
            <p className="text-[11px] font-mono text-foreground-subtle -mt-1">
              Shuffles a real, human-verified Cape Verde photo from the curated library. While the
              library is empty it falls back to an AI image. Photographer credited in the caption.
            </p>
          )}

          {slide.imageSource === "ai" && (
            <>
              <Field label="AI provider">
                <select className={inputCls} value={aiProvider} onChange={(e) => setAiProvider(e.target.value as AiProvider)}>
                  <option value="gemini">Gemini (better photos)</option>
                  <option value="openai">OpenAI (gpt-image)</option>
                </select>
              </Field>
              {aiProvider === "openai" && (
                <Field label="Quality">
                  <select className={inputCls} value={quality} onChange={(e) => setQuality(e.target.value)}>
                    <option value="high">high (≈ $0.25)</option>
                    <option value="medium">medium (≈ $0.06)</option>
                    <option value="low">low (≈ $0.02)</option>
                  </select>
                </Field>
              )}
            </>
          )}

          {slide.imageSource === "url" && (
            <Field label="Image URL">
              <input className={inputCls} value={slide.imageUrl} onChange={(e) => updateActive({ imageUrl: e.target.value })} placeholder="https://…" />
            </Field>
          )}

          {slide.imageSource === "upload" && (
            <Field label="Upload image">
              <input
                type="file"
                accept="image/*"
                className={inputCls + " text-xs"}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) { updateActive({ imageUrl: "" }); return; }
                  setError(null);
                  try {
                    updateActive({ imageUrl: await downscaleImageToDataUrl(f) });
                  } catch {
                    updateActive({ imageUrl: "" });
                    setError("Could not process that image — try a different file.");
                  }
                }}
              />
            </Field>
          )}

          <button
            onClick={() => generate({ regenerate: true })}
            disabled={busy || !slide.headline.trim()}
            className="w-full mt-2 px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50"
          >
            {generating ? "Generating…" : slide.resultPng ? "↻ Generate new image" : "Generate image →"}
          </button>
          {error && <div className="text-xs text-[#C44A3A] mt-1">{error}</div>}
        </div>

        {/* ── Preview (active slide) ──────────────────── */}
        <div className="space-y-3">
          {slide.resultPng ? (
            <>
              {slide.dirty && (
                <div className="flex items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5">
                  <span className="text-[11px] font-mono text-amber-700">Edited since last render — preview is stale.</span>
                  <button onClick={() => generate({})} disabled={busy} className="px-2 py-1 rounded border border-amber-400 text-[11px] font-mono text-amber-800 hover:bg-amber-100 disabled:opacity-50">
                    ↻ Re-render
                  </button>
                </div>
              )}
              <img src={`data:image/png;base64,${slide.resultPng}`} alt={`Slide ${idx + 1}`} className={`w-full rounded-lg border border-border ${slide.dirty ? "opacity-60" : ""}`} />
              <button onClick={downloadCurrent} disabled={busy} className="block w-full text-center px-3 py-2 rounded border border-border text-xs font-mono hover:bg-surface-2 disabled:opacity-50">
                ↓ Download current slide
              </button>

              {slide.promptUsed && !slide.photoMeta && (
                <div className="space-y-1.5 rounded-lg border border-border p-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle">Tweak — more variants of this image</div>
                  <input className={inputCls + " text-xs"} value={tweakNote} onChange={(e) => setTweakNote(e.target.value)} placeholder="optional steer, e.g. more flag, dusk light" />
                  <button onClick={tweak} disabled={busy} className="w-full px-3 py-2 rounded border border-accent/50 text-accent text-xs font-mono hover:bg-surface-2 disabled:opacity-50">
                    {generating ? "Tweaking…" : "↻ Tweak (new variant)"}
                  </button>
                </div>
              )}
              {slide.warning && <div className="text-[11px] text-[#C44A3A]">{slide.warning}</div>}
              {slide.photoMeta && (
                <div className="text-[11px] font-mono text-foreground-subtle">
                  {slide.photoMeta.photo_attribution_text}
                  {slide.photoMeta.photo_source_url && (
                    <> · <a href={slide.photoMeta.photo_source_url} target="_blank" rel="noreferrer" className="underline">source →</a></>
                  )}
                </div>
              )}

              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">Caption (whole carousel)</div>
                <textarea className={inputCls} rows={8} value={carousel.caption} onChange={(e) => setCaption(e.target.value)} />
              </div>

              {published ? (
                <div className="text-xs font-mono text-accent border border-accent/40 rounded p-3">
                  ✓ Published to Instagram.
                  {published.permalink && (<> <a href={published.permalink} target="_blank" rel="noreferrer" className="underline">View post →</a></>)}
                </div>
              ) : (
                <button onClick={publish} disabled={busy} className="w-full px-4 py-2.5 rounded bg-accent text-accent-foreground font-medium text-sm disabled:opacity-50">
                  {publishing ? "Publishing…" : `Publish carousel (${slides.length}) to Instagram`}
                </button>
              )}
              {publishError && <div className="text-xs text-[#C44A3A]">{publishError}</div>}

              {slide.promptUsed && (
                <details className="text-[11px] text-foreground-subtle">
                  <summary className="cursor-pointer font-mono">Image prompt used</summary>
                  <div className="mt-1 whitespace-pre-wrap">{slide.promptUsed}</div>
                </details>
              )}
            </>
          ) : (
            <div className="border border-dashed border-border rounded-lg h-[60vh] flex items-center justify-center text-center text-xs text-foreground-muted px-4">
              {slide.headline.trim()
                ? "Generate the image for this slide to preview it."
                : "Pick a news item or fill the headline, then Generate."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-widest text-foreground-subtle mb-1">{label}</div>
      {children}
    </label>
  );
}
