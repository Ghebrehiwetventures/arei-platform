# AREI — Instagram News Post · Grundrecept (v1)

The repeatable formula for AREI market-news posts on Instagram (and cross-posted
to Facebook). Distilled from what works on comparable accounts
(timeouttravel, portugal_passion, nostress.houses, aiqon.ai) reconciled with the
AREI brand system (ink / sage / Plex).

Principle: **institutional credibility that still stops the scroll.** Bold like a
news account, restrained like a research desk. Never the cheap red-banner look.

---

## 1. Format

**Carousel, 3–5 slides.** Carousels get the most reach on IG and let us prove
value beyond the headline.

**v1 = 2 slides** (Hero + What happened). Keep it lean — the caption carries
context and CTA. "Why it matters", a data slide, and a CTA slide are **v1.1+**
(only add once the lean format is proven; more slides risk over-explaining,
which works against AREI's measured tone).

| Slide | Purpose | Scope |
|-------|---------|-------|
| 1 · Hero | The hook: photo + headline | **v1** |
| 2 · What happened | 2–3 factual bullets, photo + ink zone | **v1** |
| 3 · Why it matters | context / analysis, AREI's voice | v1.1 (optional) |
| 4 · Data | one chart/number, flat-ink bg for sharpness | v1.1 (when we have a number) |
| 5 · CTA | follow + link in bio | v1.1 (last) |

Aspect ratio **1080 × 1350** (4:5 portrait). Outer margin 64–80px.

---

## 2. Slide anatomy

### Hero (slide 1)
- **Full-bleed photo** (AI or stock), ink gradient overlay (0 → ~0.95 bottom).
- Top-left: sage live-dot + `CABO VERDE · <DATE>` (Plex Mono, bone).
- Top-right: D-Layers mark (bone).
- **Banner**: sage box, `MARKET NEWS` (or category) — Plex Sans Bold, ink text.
- **Headline**: Plex Sans **Bold**, ~96–104px, bottom-anchored, letter-spacing −3.
  - **One key phrase highlighted in sage** (the entities: place, number, action).
- Swipe cue: small sage `SLIDE FÖR MER` / `SWIPE →`.

### Detail slides (2–3)
- **Photo background** + strong ink overlay (~0.82) for readability.
  (Flat ink `#0A0A0A` only for a data slide where numbers must be razor-sharp.)
- Sage kicker heading (`What happened` / `Why it matters`), ~64–68px, with a
  thin sage rule under it.
- Body: sage square bullets + bone Plex Sans, ~37px, 2–3 bullets max.
- Slide counter top-right `02 / 03` (Plex Mono).
- Footer: mark + `arei.so` + `swipe →`.

### CTA (last slide)
- Photo bg + overlay. Big sales line with a sage highlight.
- Sage CTA bar: `→ Link in bio`.
- `Follow @arei.index · arei.so` + mark.

---

## 3. Typography
- **Headlines / bullets / banner**: IBM Plex Sans (Bold for headlines, Medium for body).
- **Meta / kicker / counters / CTA handle**: IBM Plex Mono (SemiBold, letter-spaced).
- Arrows (`→`) must use **Plex Mono** (Sans lacks the glyph).

## 4. Color
- Surface: ink `#0A0A0A`. Text: bone `#FAFAFA`.
- Accent / highlight / banner / bullets: sage `#8ECFBF`.
- Secondary panels: sage deep `#2D4A42`. Muted meta: gray `#888888`.
- **No** red/yellow/blue news-template colors. Highlight is always sage.

## 5. Tag / category system
- Default tag = **category**: `AVIATION`, `REAL ESTATE`, `POLICY`,
  `INFRASTRUCTURE`, `TOURISM`, `MARKET NEWS` (generic fallback).
- Reserve `BREAKING` for genuinely major, time-sensitive stories so it keeps
  its weight.

## 6. Keyword highlight rule
Highlight the **entities that carry the news** — a place, a number, an action
verb — never a whole line. One highlight per headline. Always sage.

## 7. Caption formula
```
<One-line restatement of the headline>.

What happened: <1–2 sentences>.
Why it matters: <1–2 sentences, AREI's measured voice>.

Full briefing & data → link in bio.

[Image: <source> | AI illustration]
#capeverde #caboverde #realestate #<island> #marketnews
```
- Always credit the image source. For AI images label **"AI illustration"** —
  honesty protects credibility for a data brand.
- CTA in caption + link in bio (URLs on the image are not clickable).

## 8. Image sourcing
- **AI (`gpt-image-1`)** for atmospheric / generic motifs (ocean, coast, sky,
  aviation). Prompt for **textless, no fake landmarks, editorial color grade.**
- **Stock (Shutterstock/Adobe)** for location-specific hero shots (Sal, Santa
  Maria, Mindelo, Praia) where authenticity matters.
- Never let AI invent a recognizable real place — reserve real places for real photos.

## 9. Distribution
- Publish to Instagram (existing Graph API flow).
- **Auto cross-post the same carousel + caption to the Facebook Page** (same
  Graph API / token). [On the build list.]
- Source content + "what happened" / "why it matters" from the existing
  `market_news` pipeline.

---

### Open decisions to lock before coding the template
1. Carousel vs single — **recommend carousel**.
2. Detail slides photo-bg vs flat-ink — **recommend photo-bg (flat-ink for data)**.
3. Banner wording — category default + BREAKING reserved.
4. Swipe cue on hero — **recommend yes**.
