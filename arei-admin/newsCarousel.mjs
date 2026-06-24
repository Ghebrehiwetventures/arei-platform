// newsCarousel.mjs — pure, framework-free state logic for the News Post Studio
// multi-slide carousel editor.
//
// A carousel is an ordered array of the existing News Post slide. Every slide
// uses the exact same renderHero composition; "slide 1/2/3" are only positions.
// This module owns slide-array operations, the dirty/render rules, and the
// render-request builder that keeps re-renders deterministic. It is imported by
// NewsPostStudioView.tsx (types via newsCarousel.d.ts) and unit-tested by
// tests/news-carousel.test.mjs under `node --test` — no React, no DOM.

export const MIN_SLIDES = 1;
export const MAX_SLIDES = 10;

// Fields that appear on the composed hero (or steer a fresh image). Editing one
// marks the slide dirty but KEEPS the stabilised source photo, so a re-render
// re-composites the same photo with new text — no fresh AI/Pexels call.
export const RENDER_TEXT_FIELDS = ["category", "headline", "highlight", "date", "dek", "region"];
// Editing one of these means a different photo: drop the stabilised source photo
// and the rendered result so the next render resolves a new image.
export const IMAGE_FIELDS = ["imageSource", "imageUrl"];

export function newId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the simple fallback */
  }
  return "s-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptySlide(overrides = {}) {
  return {
    id: newId(),
    category: "Market News",
    headline: "",
    highlight: "",
    date: "",
    dek: "",
    region: "",
    imageSource: "ai",
    imageUrl: "",
    // Article metadata — follows the picked market-news item, per slide.
    sourceUrl: "",
    sourceName: "",
    articleBodyUsed: null,
    dateWarning: false,
    selectedItemId: null,
    // Stabilised resolved photo + composed render.
    sourceImageBase64: "",
    sourceImageMime: "",
    resultPng: "",
    promptUsed: null,
    basePrompt: "",
    photoMeta: null,
    warning: null,
    dirty: false,
    ...overrides,
  };
}

// Copy every field — including image positioning and the stabilised source
// photo — but mint a new id. dirty stays as-is (a clean source stays clean).
export function duplicateSlide(slide) {
  return { ...slide, id: newId() };
}

// Apply a field patch with the dirty/image rules. Returns a new slide.
export function patchSlide(slide, patch) {
  const next = { ...slide, ...patch };
  const keys = Object.keys(patch);
  const changedImage = keys.some((k) => IMAGE_FIELDS.includes(k) && patch[k] !== slide[k]);
  const changedText = keys.some((k) => RENDER_TEXT_FIELDS.includes(k) && patch[k] !== slide[k]);
  if (changedImage) {
    // New image source/URL → previous source photo and render are void.
    next.sourceImageBase64 = "";
    next.sourceImageMime = "";
    next.resultPng = "";
    next.photoMeta = null;
    next.warning = null;
    next.dirty = true;
  } else if (changedText) {
    // Text-only edit: keep the stabilised source photo; mark stale so the
    // result is re-composited (never reused) until the next render.
    next.dirty = true;
  }
  return next;
}

// Fold a completed render back into the slide. isFresh = a new image was
// resolved (AI/Pexels/url) rather than a deterministic text-only re-render.
export function applyRenderResult(slide, res) {
  return {
    ...slide,
    resultPng: res.resultPng,
    sourceImageBase64: res.sourceImageBase64 || slide.sourceImageBase64,
    sourceImageMime: res.sourceImageMime || slide.sourceImageMime,
    promptUsed: res.isFresh ? (res.promptUsed ?? slide.promptUsed) : slide.promptUsed,
    basePrompt: res.isFresh && res.promptUsed ? res.promptUsed : slide.basePrompt,
    photoMeta: res.isFresh ? (res.photoMeta ?? null) : slide.photoMeta,
    warning: res.warning ?? null,
    dirty: false,
  };
}

export function needsRender(slide) {
  return slide.dirty || !slide.resultPng;
}

export function dataUrl(mime, base64) {
  return `data:${mime || "image/jpeg"};base64,${base64}`;
}

// True when a render can reuse the stabilised source photo (deterministic,
// text-only) instead of resolving a fresh AI/Pexels/url image.
export function canReuseSource(slide, opts = {}) {
  return Boolean(slide.sourceImageBase64) && !opts.regenerate && !opts.aiPromptOverride;
}

// Build the POST body for /api/generate-news-post-image.
// Deterministic path: reuse the exact stored photo via imageSource:"url" + a
// data URL, with useAi:false — so AI/Pexels are NOT re-invoked on text edits.
export function buildRenderRequest(slide, opts = {}) {
  const { aiPromptOverride = null, quality = "high", aiProvider = "gemini" } = opts;
  const base = {
    category: slide.category,
    headline: slide.headline,
    highlight: slide.highlight,
    date: slide.date,
    dek: slide.dek,
    location: slide.region,
  };
  if (canReuseSource(slide, opts)) {
    return {
      ...base,
      useAi: false,
      imageSource: "url",
      imageUrl: dataUrl(slide.sourceImageMime, slide.sourceImageBase64),
    };
  }
  return {
    ...base,
    useAi: aiPromptOverride ? true : slide.imageSource === "ai" || slide.imageSource === "pexels",
    imageSource: aiPromptOverride ? "ai" : slide.imageSource,
    imageUrl: slide.imageUrl,
    quality,
    aiProvider,
    aiPrompt: aiPromptOverride || undefined,
  };
}

// ── Slide-array operations (pure; never mutate input) ───────────────────────
export function addSlide(state) {
  if (state.slides.length >= MAX_SLIDES) return state;
  const slide = emptySlide();
  return { ...state, slides: [...state.slides, slide], activeSlideId: slide.id };
}

export function duplicateActive(state) {
  if (state.slides.length >= MAX_SLIDES) return state;
  const idx = state.slides.findIndex((s) => s.id === state.activeSlideId);
  if (idx < 0) return state;
  const copy = duplicateSlide(state.slides[idx]);
  const slides = [...state.slides.slice(0, idx + 1), copy, ...state.slides.slice(idx + 1)];
  return { ...state, slides, activeSlideId: copy.id };
}

export function deleteSlide(state, id) {
  if (state.slides.length <= MIN_SLIDES) return state;
  const idx = state.slides.findIndex((s) => s.id === id);
  if (idx < 0) return state;
  const slides = state.slides.filter((s) => s.id !== id);
  const activeSlideId = state.activeSlideId === id
    ? slides[Math.min(idx, slides.length - 1)].id // nearest remaining
    : state.activeSlideId;
  return { ...state, slides, activeSlideId };
}

export function moveSlide(state, id, dir) {
  const idx = state.slides.findIndex((s) => s.id === id);
  if (idx < 0) return state;
  const swap = dir === "left" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= state.slides.length) return state;
  const slides = state.slides.slice();
  const tmp = slides[idx];
  slides[idx] = slides[swap];
  slides[swap] = tmp;
  return { ...state, slides };
}

export function activeSlide(state) {
  return state.slides.find((s) => s.id === state.activeSlideId) || state.slides[0];
}

export function activeIndex(state) {
  const i = state.slides.findIndex((s) => s.id === state.activeSlideId);
  return i < 0 ? 0 : i;
}

export function updateActive(state, patch) {
  return {
    ...state,
    slides: state.slides.map((s) => (s.id === state.activeSlideId ? patchSlide(s, patch) : s)),
  };
}

export function setSlideById(state, id, updater) {
  return { ...state, slides: state.slides.map((s) => (s.id === id ? updater(s) : s)) };
}

export function setActive(state, id) {
  return state.slides.some((s) => s.id === id) ? { ...state, activeSlideId: id } : state;
}

// ── Filenames (UTF-8 safe, ASCII-slugged) ───────────────────────────────────
export function sanitizeFilename(text, fallback = "slide") {
  const cleaned = String(text || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")     // strip diacritics
    .toLowerCase()
    .replace(/[’'"]/g, "")           // drop apostrophes/quotes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return cleaned || fallback;
}

export function slideFilename(index, headline) {
  return `${String(index + 1).padStart(2, "0")}-${sanitizeFilename(headline, "slide")}.png`;
}

export function zipName(state) {
  const first = state.slides[0]?.headline || "";
  return `${sanitizeFilename(first, "carousel")}-carousel.zip`;
}
