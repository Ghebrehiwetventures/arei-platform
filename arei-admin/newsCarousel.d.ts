// Type declarations for the framework-free logic in newsCarousel.mjs.
// The component imports "./newsCarousel" (TS resolves this .d.ts; Vite bundles
// the .mjs at runtime).

export type ImageSource = "ai" | "pexels" | "url" | "upload";

export interface PhotoMeta {
  photo_provider: string;
  photo_author: string;
  photo_author_url: string;
  photo_source_url: string;
  photo_attribution_text: string;
}

export interface CarouselSlide {
  id: string;
  category: string;
  headline: string;
  highlight: string;
  date: string;
  dek: string;
  region: string;
  imageSource: ImageSource;
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  articleBodyUsed: boolean | null;
  dateWarning: boolean;
  selectedItemId: string | null;
  sourceImageBase64: string;
  sourceImageMime: string;
  resultPng: string;
  promptUsed: string | null;
  basePrompt: string;
  photoMeta: PhotoMeta | null;
  warning: string | null;
  dirty: boolean;
}

export interface CarouselState {
  slides: CarouselSlide[];
  activeSlideId: string;
  caption: string;
}

export interface RenderResult {
  resultPng: string;
  sourceImageBase64?: string;
  sourceImageMime?: string;
  promptUsed?: string | null;
  photoMeta?: PhotoMeta | null;
  warning?: string | null;
  isFresh?: boolean;
}

export interface RenderRequestOpts {
  regenerate?: boolean;
  aiPromptOverride?: string | null;
  quality?: string;
  aiProvider?: string;
}

export const MIN_SLIDES: number;
export const MAX_SLIDES: number;
export const RENDER_TEXT_FIELDS: string[];
export const IMAGE_FIELDS: string[];

export function newId(): string;
export function emptySlide(overrides?: Partial<CarouselSlide>): CarouselSlide;
export function duplicateSlide(slide: CarouselSlide): CarouselSlide;
export function patchSlide(slide: CarouselSlide, patch: Partial<CarouselSlide>): CarouselSlide;
export function applyRenderResult(slide: CarouselSlide, res: RenderResult): CarouselSlide;
export function needsRender(slide: CarouselSlide): boolean;
export function dataUrl(mime: string, base64: string): string;
export function canReuseSource(slide: CarouselSlide, opts?: RenderRequestOpts): boolean;
export function buildRenderRequest(slide: CarouselSlide, opts?: RenderRequestOpts): Record<string, unknown>;
export function addSlide(state: CarouselState): CarouselState;
export function duplicateActive(state: CarouselState): CarouselState;
export function deleteSlide(state: CarouselState, id: string): CarouselState;
export function moveSlide(state: CarouselState, id: string, dir: "left" | "right"): CarouselState;
export function activeSlide(state: CarouselState): CarouselSlide;
export function activeIndex(state: CarouselState): number;
export function updateActive(state: CarouselState, patch: Partial<CarouselSlide>): CarouselState;
export function setSlideById(
  state: CarouselState,
  id: string,
  updater: (s: CarouselSlide) => CarouselSlide,
): CarouselState;
export function setActive(state: CarouselState, id: string): CarouselState;
export function sanitizeFilename(text: string, fallback?: string): string;
export function slideFilename(index: number, headline: string): string;
export function zipName(state: CarouselState): string;
