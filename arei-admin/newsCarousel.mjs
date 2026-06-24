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
// Listing-slide render-affecting fields — same dirty behaviour (keep the photo).
export const LISTING_RENDER_FIELDS = ["agency", "propertyType", "price", "beds", "baths", "sqm", "location"];
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
    // Slide type: "hero" (news composition) | "listing" (property snapshot).
    // Both share the same canonical renderer, image model, dirty/export flow.
    type: "hero",
    category: "Market News",
    headline: "",
    highlight: "",
    date: "",
    dek: "",
    region: "",
    // Listing fields (used when type === "listing"; the positional counter is
    // derived from slide index/total at render time, not stored here).
    agency: "",
    propertyType: "",
    price: "",
    beds: "",
    baths: "",
    sqm: "",
    location: "",
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
  const changedType = "type" in patch && patch.type !== slide.type;
  const renderFields = next.type === "listing" ? LISTING_RENDER_FIELDS : RENDER_TEXT_FIELDS;
  const changedText = keys.some((k) => renderFields.includes(k) && patch[k] !== slide[k]);
  if (changedImage) {
    // New image source/URL → previous source photo and render are void.
    next.sourceImageBase64 = "";
    next.sourceImageMime = "";
    next.resultPng = "";
    next.photoMeta = null;
    next.warning = null;
    next.dirty = true;
  } else if (changedType) {
    // Different composition entirely — drop the old render, keep the photo so a
    // re-render re-composites the same image in the new slide type.
    next.resultPng = "";
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
  const { aiPromptOverride = null, quality = "high", aiProvider = "gemini", idx = 1, total = 1 } = opts;
  const base = slide.type === "listing"
    ? {
        slideType: "listing",
        agency: slide.agency,
        propertyType: slide.propertyType,
        price: slide.price,
        beds: slide.beds,
        baths: slide.baths,
        sqm: slide.sqm,
        location: slide.location,
        idx,
        total,
      }
    : {
        slideType: "hero",
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

// Listing slides bake a positional counter (NN / total) into the image, so any
// change to the slide set (add/delete/move) can invalidate it. Mark every
// listing slide dirty so its counter is regenerated on the next render/export.
function markListingsDirty(state) {
  if (!state.slides.some((s) => s.type === "listing")) return state;
  return { ...state, slides: state.slides.map((s) => (s.type === "listing" ? { ...s, dirty: true } : s)) };
}

// ── Slide-array operations (pure; never mutate input) ───────────────────────
export function addSlide(state, type = "hero") {
  if (state.slides.length >= MAX_SLIDES) return state;
  const slide = emptySlide({ type });
  return markListingsDirty({ ...state, slides: [...state.slides, slide], activeSlideId: slide.id });
}

export function duplicateActive(state) {
  if (state.slides.length >= MAX_SLIDES) return state;
  const idx = state.slides.findIndex((s) => s.id === state.activeSlideId);
  if (idx < 0) return state;
  const copy = duplicateSlide(state.slides[idx]);
  const slides = [...state.slides.slice(0, idx + 1), copy, ...state.slides.slice(idx + 1)];
  return markListingsDirty({ ...state, slides, activeSlideId: copy.id });
}

export function deleteSlide(state, id) {
  if (state.slides.length <= MIN_SLIDES) return state;
  const idx = state.slides.findIndex((s) => s.id === id);
  if (idx < 0) return state;
  const slides = state.slides.filter((s) => s.id !== id);
  const activeSlideId = state.activeSlideId === id
    ? slides[Math.min(idx, slides.length - 1)].id // nearest remaining
    : state.activeSlideId;
  return markListingsDirty({ ...state, slides, activeSlideId });
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
  return markListingsDirty({ ...state, slides });
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

// Human label for a slide — its headline (hero) or location/price/agency
// (listing). Used for export filenames and the ZIP name.
export function slideLabel(slide) {
  if (!slide) return "";
  return slide.type === "listing"
    ? (slide.location || slide.price || slide.agency || "listing")
    : slide.headline;
}

export function slideFilename(index, headlineOrSlide) {
  const label = typeof headlineOrSlide === "object" ? slideLabel(headlineOrSlide) : headlineOrSlide;
  return `${String(index + 1).padStart(2, "0")}-${sanitizeFilename(label, "slide")}.png`;
}

export function zipName(state) {
  return `${sanitizeFilename(slideLabel(state.slides[0]), "carousel")}-carousel.zip`;
}
