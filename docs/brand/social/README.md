# AREI Social Media Assets

Planning spec: `docs/brand/social-media-asset-kit.md`
Copy source: `docs/brand/public-profile-language.md`
Brand reference: `docs/brand/README.md`, `docs/brand/source/`

---

## Publish status

| Asset | Status | Notes |
|---|---|---|
| `arei-avatar-1080.png` | **Approved** | Canonical SVG mark via cairosvg, bone background |
| `arei-avatar-400.png` | **Approved** | Downscaled from 1080 master |
| `arei-instagram-profile-1080.png` | **Approved** | Identical to avatar master |
| `arei-x-header-1500x500.png` | **Blocked** | Not committed — see below |
| `arei-linkedin-company-banner-1128x191.png` | **Blocked** | Not committed — see below |
| `arei-linkedin-founder-banner-1584x396.png` | **Blocked** | Not committed — see below |
| `arei-og-image-1200x630.png` | **Blocked** | Not committed — see below |

---

## What is approved

### Avatar / profile images

Three mark-only assets are approved for upload:

- `arei-avatar-1080.png` — use as the source master
- `arei-avatar-400.png` — upload to X/Twitter profile image, LinkedIn company logo
- `arei-instagram-profile-1080.png` — upload to Instagram profile

**Generation method:** `docs/brand/assets/d-layers-mark.svg` rendered directly via
`cairosvg.svg2png()`. No mark geometry was hand-coded or manually reproduced.
Canonical SVG was not modified. Background: bone (`#f2f0ec`). Mark: ink (`#0a0a0a`).

---

## What is blocked

### Text-bearing banners — DO NOT PUBLISH

The following assets are **not committed** and **must not be published**:

- X/Twitter header (1500 × 500)
- LinkedIn company banner (1128 × 191)
- LinkedIn founder banner (1584 × 396)
- Open Graph image (1200 × 630)

**Reason:** Programmatic Pillow/Python rendering does not produce output that
meets the AREI brand standard. Even with IBM Plex Mono, the result is too
heavy and terminal-like — it does not match the AREI visual system in practice.

**Required:** Final banner exports must come from the actual AREI brand system —
i.e., from the authored brand guidelines source in `docs/brand/source/`, exported
via a design tool (Figma or equivalent) using the canonical color tokens,
typography scale, and spacing documented in `docs/brand/source/bg/foundations.jsx`.

Font files (`IBMPlexMono-*.ttf`) are not committed to this repository.
If a generation script is needed in future, fonts should be sourced at runtime
from Google Fonts (the same source as `arei-admin/index.html`) — not committed.

---

## Upload guide (approved assets only)

| Platform | File to upload |
|---|---|
| X/Twitter — profile image | `arei-avatar-400.png` |
| LinkedIn — company logo | `arei-avatar-400.png` |
| Instagram — profile image | `arei-instagram-profile-1080.png` |
| All others | Blocked — do not upload until design exports are produced |

---

## Checks before uploading avatars

- [ ] Circle crop looks clean at 40px diameter
- [ ] Mark centered and not touching the circle edge
- [ ] Background is bone (`#f2f0ec`), not pure white
- [ ] No KazaVerde name visible
