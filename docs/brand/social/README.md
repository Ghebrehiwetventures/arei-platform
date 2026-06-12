# AREI Social Media Assets

Planning spec: `docs/brand/social-media-asset-kit.md`
Copy source: `docs/brand/public-profile-language.md`
Brand reference: `docs/brand/README.md`, `docs/brand/source/`

---

## Approved assets

| File | Dimensions | Use |
|---|---|---|
| `arei-x-banner-1500x500.png` | 1500 × 500 | X/Twitter header image |
| `arei-og-1200x630.png` | 1200 × 630 | AREI link preview / Open Graph image |
| `cvrei-og-1200x630.png` | 1200 × 630 | CVREI link preview / Open Graph image |
| `arei-avatar-ink-1080x1080.png` | 1080 × 1080 | Profile image — ink bg (master) |
| `arei-avatar-ink-400x400.png` | 400 × 400 | Profile image — ink bg (upload size) |
| `arei-avatar-1080.png` | 1080 × 1080 | Profile image — bone bg (master) |
| `arei-avatar-400.png` | 400 × 400 | Profile image — bone bg |
| `arei-instagram-profile-1080.png` | 1080 × 1080 | Instagram profile image |

**Generation method:** HTML/SVG sources in `draft/` rendered via Playwright headless
Chromium at exact pixel dimensions. Existing drafts were rendered with IBM Plex Mono
(Google Fonts) before the 2026-06 move to Inter — regenerate any new or updated
assets with Inter. Mark geometry sourced verbatim from `docs/brand/assets/d-layers-mark.svg`.

---

## Upload guide

| Platform | File |
|---|---|
| X/Twitter — header | `arei-x-banner-1500x500.png` |
| X/Twitter — profile image | `arei-avatar-ink-400x400.png` |
| LinkedIn — company banner | `arei-x-banner-1500x500.png` (crop to 1128×191) |
| LinkedIn — company logo | `arei-avatar-ink-400x400.png` |
| Instagram — profile image | `arei-instagram-profile-1080.png` |
| AREI landing OG | `arei-og-1200x630.png` → deployed as `arei-landing/arei-og.png` |
| CVREI site OG | `cvrei-og-1200x630.png` → deployed as `kazaverde-web/public/cvrei-og.png` |

Use the **ink bg** avatar (`arei-avatar-ink-400x400.png`) on X and LinkedIn — it
matches the ink background of the banner, so the profile photo and header read
as a single cohesive system.

---

## Draft sources

Approved source files in `draft/`:

- `draft/banner-c-marked.html` — X/Twitter banner source
- `draft/og-arei.html` — AREI OG source
- `draft/og-cvrei.html` — CVREI OG source

The following draft directions were explored but not used:

- `draft/banner-a-institutional.html` — rejected
- `draft/banner-b-editorial.html` — rejected

`draft/review.html` is a design review composite, not a production asset.

---

## Color tokens used

| Token | Hex | Role |
|---|---|---|
| Ink | `#0a0a0a` | Background (all banners and OG) |
| Bone | `#f2f0ec` | Primary hero text |
| Sage | `#8ecfbf` | Accent / sub-line |
| Gray 500 | `#888888` | URL / secondary labels |
| Paper | `#ffffff` | Mark geometry on ink |
