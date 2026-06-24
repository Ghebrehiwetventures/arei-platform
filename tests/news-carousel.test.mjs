import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_SLIDES,
  MAX_SLIDES,
  emptySlide,
  addSlide,
  duplicateActive,
  deleteSlide,
  moveSlide,
  updateActive,
  setSlideById,
  applyRenderResult,
  needsRender,
  buildRenderRequest,
  canReuseSource,
  patchSlide,
  slideFilename,
  sanitizeFilename,
  slideLabel,
  zipName,
} from "../arei-admin/newsCarousel.mjs";

function freshState() {
  const s = emptySlide({ headline: "First" });
  return { slides: [s], activeSlideId: s.id, caption: "" };
}

test("starts with one slide; add appends and activates", () => {
  let st = freshState();
  assert.equal(st.slides.length, MIN_SLIDES);
  st = addSlide(st);
  assert.equal(st.slides.length, 2);
  assert.equal(st.activeSlideId, st.slides[1].id);
});

test("max slides enforced", () => {
  let st = freshState();
  for (let i = 0; i < 20; i++) st = addSlide(st);
  assert.equal(st.slides.length, MAX_SLIDES);
});

test("duplicate copies all content + stabilised source image, new id, inserted after active", () => {
  let st = freshState();
  st = updateActive(st, { headline: "Story A" });
  st = setSlideById(st, st.activeSlideId, (s) => ({
    ...s, sourceImageBase64: "AAAA", sourceImageMime: "image/jpeg", resultPng: "PNG", dirty: false,
  }));
  st = duplicateActive(st);
  assert.equal(st.slides.length, 2);
  const [a, b] = st.slides;
  assert.notEqual(a.id, b.id);
  assert.equal(b.headline, "Story A");
  assert.equal(b.sourceImageBase64, "AAAA");      // stabilised source carried
  assert.equal(b.resultPng, "PNG");
  assert.equal(st.activeSlideId, b.id);            // inserted right after, active
});

test("min slides: cannot delete the last remaining slide", () => {
  const st = freshState();
  const after = deleteSlide(st, st.activeSlideId);
  assert.equal(after.slides.length, 1);
  assert.equal(after, st); // unchanged
});

test("delete selects the nearest remaining slide", () => {
  let st = freshState();
  st = addSlide(st); // slide 2 active
  st = addSlide(st); // slide 3 active
  const id2 = st.slides[1].id;
  st = { ...st, activeSlideId: id2 }; // activate middle
  st = deleteSlide(st, id2);
  assert.equal(st.slides.length, 2);
  // nearest remaining at the same index → old slide 3 now at index 1
  assert.equal(st.activeSlideId, st.slides[1].id);
});

test("reorder left/right swaps and respects bounds", () => {
  let st = freshState();
  st = addSlide(st);
  const [first, second] = st.slides;
  st = moveSlide(st, second.id, "left");
  assert.deepEqual(st.slides.map((s) => s.id), [second.id, first.id]);
  // moving the now-first item further left is a no-op
  const same = moveSlide(st, second.id, "left");
  assert.deepEqual(same.slides.map((s) => s.id), [second.id, first.id]);
});

test("text edit marks dirty but preserves the stabilised source image", () => {
  const s = emptySlide({ sourceImageBase64: "IMG", sourceImageMime: "image/png", resultPng: "OLD", dirty: false });
  const next = patchSlide(s, { headline: "New headline" });
  assert.equal(next.dirty, true);
  assert.equal(next.sourceImageBase64, "IMG"); // preserved
  assert.equal(next.sourceImageMime, "image/png");
});

test("image-source / image-url change clears stabilised source + result", () => {
  const s = emptySlide({ imageSource: "ai", sourceImageBase64: "IMG", sourceImageMime: "image/png", resultPng: "OLD" });
  const a = patchSlide(s, { imageSource: "url" });
  assert.equal(a.sourceImageBase64, "");
  assert.equal(a.resultPng, "");
  assert.equal(a.dirty, true);
  const b = patchSlide(s, { imageUrl: "https://x/y.jpg" });
  assert.equal(b.sourceImageBase64, "");
  assert.equal(b.resultPng, "");
});

test("needsRender: true when dirty or missing result", () => {
  assert.equal(needsRender(emptySlide({ resultPng: "", dirty: false })), true);
  assert.equal(needsRender(emptySlide({ resultPng: "X", dirty: true })), true);
  assert.equal(needsRender(emptySlide({ resultPng: "X", dirty: false })), false);
});

test("deterministic re-render reuses source and does NOT send AI/Pexels flags", () => {
  const s = emptySlide({ headline: "H", sourceImageBase64: "ABC", sourceImageMime: "image/jpeg", imageSource: "ai" });
  assert.equal(canReuseSource(s, {}), true);
  const body = buildRenderRequest(s, {});
  assert.equal(body.useAi, false);
  assert.equal(body.imageSource, "url");
  assert.ok(String(body.imageUrl).startsWith("data:image/jpeg;base64,ABC"));
  assert.equal(body.aiPrompt, undefined);
});

test("regenerate / no-source path sends a fresh AI request", () => {
  const noSrc = emptySlide({ headline: "H", imageSource: "ai", sourceImageBase64: "" });
  const fresh = buildRenderRequest(noSrc, {});
  assert.equal(fresh.useAi, true);
  assert.equal(fresh.imageSource, "ai");

  const withSrc = emptySlide({ headline: "H", imageSource: "ai", sourceImageBase64: "ABC", sourceImageMime: "image/png" });
  const regen = buildRenderRequest(withSrc, { regenerate: true });
  assert.equal(regen.useAi, true);          // explicit regenerate overrides reuse
  assert.equal(regen.imageSource, "ai");
});

test("async render result binds to the captured slide id even after switching active", () => {
  let st = freshState();
  st = addSlide(st); // two slides; slide 2 active
  const targetId = st.slides[0].id; // we 'render' slide 1
  st = { ...st, activeSlideId: st.slides[1].id }; // user switches to slide 2 mid-render
  st = setSlideById(st, targetId, (sl) => applyRenderResult(sl, {
    resultPng: "RENDERED", sourceImageBase64: "SRC", sourceImageMime: "image/png", isFresh: true, promptUsed: "p",
  }));
  assert.equal(st.slides[0].resultPng, "RENDERED"); // applied to the right slide
  assert.equal(st.slides[0].dirty, false);
  assert.equal(st.slides[1].resultPng, "");          // active slide untouched
});

test("export filenames are ordered, numbered and sanitised", () => {
  const headlines = ["Cape Verde’s Blue Economy!", "São Vicente & Sal", ""];
  const names = headlines.map((h, i) => slideFilename(i, h));
  assert.equal(names[0], "01-cape-verdes-blue-economy.png");
  assert.equal(names[1], "02-sao-vicente-sal.png");
  assert.equal(names[2], "03-slide.png"); // empty → fallback, number always present
  // strictly ascending numeric prefixes
  assert.deepEqual(names.map((n) => n.slice(0, 2)), ["01", "02", "03"]);
});

test("sanitizeFilename is UTF-8 safe (ASCII slug, no diacritics/punctuation)", () => {
  assert.equal(sanitizeFilename("Açaí & Café — Praia!"), "acai-cafe-praia");
  assert.equal(sanitizeFilename(""), "slide");
  assert.match(sanitizeFilename("Ωmega 日本 test"), /^[a-z0-9-]+$/);
});

test("zipName derives from the first slide headline", () => {
  let st = freshState();
  st = updateActive(st, { headline: "Cape Verde market" });
  assert.equal(zipName(st), "cape-verde-market-carousel.zip");
});

// ── Listing slide type ──────────────────────────────────────────────────────

test("new slides default to hero; addSlide('listing') creates a listing slide", () => {
  let st = freshState();
  assert.equal(st.slides[0].type, "hero");
  st = addSlide(st, "listing");
  assert.equal(st.slides[1].type, "listing");
  assert.equal(st.activeSlideId, st.slides[1].id);
});

test("switching type clears the old render but keeps the stabilised photo", () => {
  const s = emptySlide({ sourceImageBase64: "IMG", sourceImageMime: "image/jpeg", resultPng: "HERO_PNG", dirty: false });
  const next = patchSlide(s, { type: "listing" });
  assert.equal(next.type, "listing");
  assert.equal(next.resultPng, "");        // different composition
  assert.equal(next.sourceImageBase64, "IMG"); // same photo reused
  assert.equal(next.dirty, true);
});

test("editing a listing render field marks dirty, keeps the photo", () => {
  const s = emptySlide({ type: "listing", sourceImageBase64: "IMG", resultPng: "OLD", dirty: false });
  const next = patchSlide(s, { price: "€95 000" });
  assert.equal(next.dirty, true);
  assert.equal(next.sourceImageBase64, "IMG");
});

test("listing deterministic re-render sends slideType + fields + counter, no AI flags", () => {
  const s = emptySlide({
    type: "listing", agency: "Homes Casa Verde", propertyType: "Apartment",
    price: "€95 000", beds: 2, baths: 1, sqm: 87, location: "Santa Maria, Sal",
    sourceImageBase64: "ABC", sourceImageMime: "image/jpeg",
  });
  const body = buildRenderRequest(s, { idx: 4, total: 9 });
  assert.equal(body.slideType, "listing");
  assert.equal(body.useAi, false);
  assert.equal(body.imageSource, "url");
  assert.equal(body.price, "€95 000");
  assert.equal(body.beds, 2);
  assert.equal(body.idx, 4);
  assert.equal(body.total, 9);
  assert.equal(body.aiPrompt, undefined);
});

test("reorder marks listing slides dirty (positional counter invalidation)", () => {
  let st = freshState();                       // slide 1 = hero
  st = addSlide(st, "listing");                // slide 2 = listing
  st = setSlideById(st, st.activeSlideId, (s) => ({ ...s, dirty: false, resultPng: "X" }));
  st = moveSlide(st, st.activeSlideId, "left"); // move listing to position 1
  const listing = st.slides.find((s) => s.type === "listing");
  assert.equal(listing.dirty, true);           // counter must regenerate
});

test("add/delete marks listing slides dirty (total changed)", () => {
  let st = freshState();
  st = addSlide(st, "listing");
  st = setSlideById(st, st.activeSlideId, (s) => ({ ...s, dirty: false, resultPng: "X" }));
  const listingId = st.activeSlideId;
  st = addSlide(st, "hero");                    // total changed
  assert.equal(st.slides.find((s) => s.id === listingId).dirty, true);
});

test("mixed carousel: listing filenames use location/price, in order", () => {
  const hero = emptySlide({ type: "hero", headline: "Cape Verde is having a global moment" });
  const l1 = emptySlide({ type: "listing", price: "€95 000", location: "Santa Maria, Sal" });
  const l2 = emptySlide({ type: "listing", price: "€89 995", location: "" });
  const slides = [hero, l1, l2];
  const names = slides.map((s, i) => slideFilename(i, s));
  assert.equal(names[0], "01-cape-verde-is-having-a-global-moment.png");
  assert.equal(names[1], "02-santa-maria-sal.png"); // location preferred
  assert.equal(names[2], "03-89-995.png");          // falls back to price
});

test("slideLabel: hero→headline, listing→location/price/agency", () => {
  assert.equal(slideLabel(emptySlide({ type: "hero", headline: "Hi" })), "Hi");
  assert.equal(slideLabel(emptySlide({ type: "listing", location: "Sal", price: "€1" })), "Sal");
  assert.equal(slideLabel(emptySlide({ type: "listing", price: "€95 000" })), "€95 000");
});
