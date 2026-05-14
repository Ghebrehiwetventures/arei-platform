# AREI · Social Media Asset Kit

**Status:** Planning doc · assets not yet produced
**Source mark:** `docs/brand/assets/d-layers-mark.svg` — canonical, do not redraw
**Brand reference:** `docs/brand/README.md`, `docs/brand/source/`
**Copy reference:** `docs/brand/public-profile-language.md`

Do not generate assets until this document has been reviewed and the mark geometry confirmed against Brand Guidelines v1.0.

---

## 1. Asset inventory

| Asset | Purpose | Status |
|---|---|---|
| Avatar master | All profile images (source) | Not produced |
| X/Twitter profile image | Twitter avatar | Not produced |
| X/Twitter header | Twitter banner | Not produced |
| LinkedIn company logo | Company page avatar | Not produced |
| LinkedIn company banner | Company page header | Not produced |
| LinkedIn founder banner | Personal profile header | Not produced |
| Instagram profile image | Instagram avatar | Not produced |
| Open Graph image | Link previews (social sharing) | Not produced |

---

## 2. Dimensions

| Asset | Dimensions | Notes |
|---|---|---|
| Avatar / profile image master | 1080 × 1080 px | Source; export down from this |
| X/Twitter profile image | 400 × 400 px | Displayed as circle; safe area: ~340px diameter |
| X/Twitter header | 1500 × 500 px | Top and bottom ~60px cropped on mobile |
| LinkedIn company logo | 400 × 400 px | Square crop; 60px padding minimum |
| LinkedIn company banner | 1128 × 191 px | Very short ratio; text must be large or absent |
| LinkedIn founder banner | 1584 × 396 px | Profile photo overlaps bottom-left ~270px wide |
| Instagram profile image | 1080 × 1080 px | Displayed as circle; safe area: ~900px diameter |
| Open Graph image | 1200 × 630 px | Used by Twitter cards, LinkedIn link previews, iMessage |

---

## 3. Visual rules

**Mark**
- Use `docs/brand/assets/d-layers-mark.svg` as the canonical source. Do not redraw from memory.
- For all avatars: mark centered on bone (`#F2F0EC`) or paper (`#FFFFFF`) background. Mark in ink (`#0A0A0A`).
- Scale mark so it sits within the safe circle area with generous padding — mark is subtle at small sizes; err toward larger.

**Color**
- Avatar/profile: bone (`#F2F0EC`) background, ink (`#0A0A0A`) mark.
- Banners: bone or paper background with ink typography. Sage (`#8ECFBF`) may be used sparingly as a rule/accent element.
- Dark mode variant: ink background (`#0A0A0A`), paper mark (`#FFFFFF`). Produce both where possible.

**Typography**
- IBM Plex Mono for any banner text (labels, descriptors, market callouts).
- IBM Plex Sans for longer prose only (not needed for social assets).
- Weight: 400 or 500. Do not go heavier.

**Photography**
- No photography unless specifically approved in writing.
- No property listing images, interior shots, or architecture photos.
- No flags, maps, palm trees, beaches, Cape Verde landscapes, or skylines.
- No AI/globe/network/connectivity imagery.
- No founder photo on company profiles.

**Tone**
- Institutional, calm, and minimal. Not promotional.
- AREI should not look like a broker, a travel brand, a SaaS startup, or a property marketplace.

---

## 4. Channel-specific recommendations

### X / Twitter

| Element | Recommendation |
|---|---|
| Profile image | D·Layers mark, centered on bone background. No text. |
| Header | Ink background. IBM Plex Mono. One of the copy options (see §5). Left-aligned or centered. Large weight on the hero line. |
| Bio line | *Data acquisition and intelligence infrastructure for African property markets. Market 01: Cape Verde.* |
| Main risk | Header text too small at mobile crop; always check 1500×500 at 375px viewport width. |

### LinkedIn company page

| Element | Recommendation |
|---|---|
| Company logo | D·Layers mark, centered on bone background. No text. |
| Banner | Bone or ink background. Core descriptor in IBM Plex Mono, large. Optionally: `MARKET 01 · CAPE VERDE` in small caps below. Do not crowd. |
| About line | *Data acquisition and intelligence infrastructure for African property markets.* |
| Main risk | LinkedIn company banner ratio (1128×191) is extremely short — text-only or mark-only; no complex layout. |

### LinkedIn founder profile

| Element | Recommendation |
|---|---|
| Banner | Ink background. `AREI` in large IBM Plex Mono. Descriptor in smaller weight below. Profile photo is placed bottom-left by LinkedIn; leave that zone clear. |
| Main risk | Profile photo overlaps bottom-left ~270px — do not place text or mark in that zone. |

### Instagram

| Element | Recommendation |
|---|---|
| Profile image | D·Layers mark on bone background. No text — mark must read cleanly at 60px diameter. |
| Bio | *Structuring Africa's property data into market intelligence. Starting with Cape Verde. Not a broker — infrastructure.* |
| Link text | Cape Verde Real Estate Index → arei.so/cv |
| Main risk | Instagram crops to circle aggressively; test at 40px diameter. No thin strokes at small size — mark stroke-width 1.4 may need to be heavier in a dedicated Instagram-scale version. |

### Open Graph / social sharing

| Element | Recommendation |
|---|---|
| Image | Bone or ink background. Mark top-left or centered. Descriptor text large. URL or `arei.so` bottom-right in small mono. |
| Copy | *Africa's property data is everywhere. We bring it together.* |
| Main risk | Used by link unfurls on X, LinkedIn, iMessage, WhatsApp — must work without any surrounding context. No insider shorthand. |

---

## 5. Copy recommendations

Use these lines verbatim. Do not paraphrase.

**Primary descriptor (use consistently):**
Data acquisition and intelligence infrastructure for African property markets.

**Hero line (opener when space allows):**
Africa's property data is everywhere. We bring it together.

**Strategic frame (banner option B):**
Three surfaces. One engine.

**Market callout:**
Market 01: Cape Verde.

**Combination for banners:**
```
Africa's property data is everywhere.
We bring it together.

MARKET 01 · CAPE VERDE
```

**Short institutional line (footer / small contexts):**
AREI · Data acquisition and intelligence infrastructure for African property markets.

---

## 6. Export checklist

Before publishing any asset:

- [ ] Circle crop test — avatar looks clean at 40px, 60px, and 400px
- [ ] Mobile crop test — header/banner tested at 375px viewport width
- [ ] Dark mode contrast — if producing dark variant, check ink-on-bone and paper-on-ink contrast
- [ ] Small-size legibility — all text readable at intended minimum display size
- [ ] No overclaiming — no transaction-price claims, no index accuracy claims, no "leading" / "largest" language
- [ ] No KazaVerde remnants — check for old brand name in file metadata, alt text, or visible copy
- [ ] No photography — confirm no property, landscape, or lifestyle images included
- [ ] Mark geometry — confirm D·Layers mark matches `d-layers-mark.svg` exactly (three staggered squares)

---

## 7. File naming convention

Store produced assets at:

```
docs/brand/social/arei-avatar-master-1080.png
docs/brand/social/arei-avatar-1080.png
docs/brand/social/arei-avatar-400.png
docs/brand/social/arei-x-header-1500x500.png
docs/brand/social/arei-linkedin-company-logo-400.png
docs/brand/social/arei-linkedin-company-banner-1128x191.png
docs/brand/social/arei-linkedin-founder-banner-1584x396.png
docs/brand/social/arei-instagram-profile-1080.png
docs/brand/social/arei-og-image-1200x630.png
```

Dark mode variants:
```
docs/brand/social/arei-avatar-dark-1080.png
docs/brand/social/arei-x-header-dark-1500x500.png
```

SVG sources (if produced before rasterising):
```
docs/brand/social/src/arei-avatar.svg
docs/brand/social/src/arei-x-header.svg
docs/brand/social/src/arei-og-image.svg
```

---

## Production notes

The canonical mark SVG is at `docs/brand/assets/d-layers-mark.svg`. All assets should be produced in a design tool (Figma, Sketch, or equivalent) using this geometry — not regenerated from code or memory.

The mark was authored at `viewBox="0 0 24 24"` with `stroke-width="1.4"`. At large export sizes the stroke will appear very thin; consider scaling stroke proportionally or using a heavier weight variant specifically for social export. Document any such variant separately — do not modify the canonical SVG.

No assets have been produced yet. This document is the planning and specification layer only.
