# AREI Social Media Assets

Generated per `docs/brand/social-media-asset-kit.md`.
Planning spec and visual rules: see that file.
Copy source: `docs/brand/public-profile-language.md`.

---

## Publish status

| Asset | Mark source | Font | Status |
|---|---|---|---|
| `arei-avatar-1080.png` | canonical SVG via cairosvg | — (mark only) | **Publish-ready** |
| `arei-avatar-400.png` | canonical SVG via cairosvg | — (mark only) | **Publish-ready** |
| `arei-instagram-profile-1080.png` | canonical SVG via cairosvg | — (mark only) | **Publish-ready** |
| `arei-x-header-1500x500.png` | canonical SVG via cairosvg | IBM Plex Mono | **Publish-ready** |
| `arei-linkedin-company-banner-1128x191.png` | — (no mark) | IBM Plex Mono | **Publish-ready** |
| `arei-linkedin-founder-banner-1584x396.png` | — (no mark) | IBM Plex Mono | **Publish-ready** |
| `arei-og-image-1200x630.png` | canonical SVG via cairosvg | IBM Plex Mono | **Publish-ready** |

---

## Files and upload targets

| File | Upload to |
|---|---|
| `arei-avatar-1080.png` | Source master for all avatars |
| `arei-avatar-400.png` | X/Twitter profile image, LinkedIn company logo |
| `arei-instagram-profile-1080.png` | Instagram profile image |
| `arei-x-header-1500x500.png` | X/Twitter header/banner |
| `arei-linkedin-company-banner-1128x191.png` | LinkedIn company page banner |
| `arei-linkedin-founder-banner-1584x396.png` | LinkedIn personal/founder profile banner |
| `arei-og-image-1200x630.png` | Open Graph meta tag (`og:image`); Twitter Card, iMessage, WhatsApp previews |

---

## Generation method

**Version:** v2 — canonical SVG rendered directly, no manual geometry reproduction.

**Mark source:** `docs/brand/assets/d-layers-mark.svg`
The canonical SVG was **not modified**. It was passed directly to `cairosvg.svg2png()`
with color substitution applied at the SVG XML level (ink → paper for dark backgrounds).
No mark geometry was hand-coded or manually reproduced.

**SVG renderer:** `cairosvg` 2.8.2 + Cairo 1.18.4 (Homebrew).
The Homebrew cairo library path was required because cairocffi's `dlopen` does not
search `/opt/homebrew/lib` by default on Apple Silicon. A one-line patch was applied
to `cairocffi/__init__.py` to add the absolute path; this does not affect any repo file.

**Font:** IBM Plex Mono Regular 400 + Bold 700.
Files in `fonts/` were downloaded from Google Fonts — the same source as `arei-admin/index.html`.
These files are for asset generation only, not for web deployment.

**Color tokens used (from `docs/brand/source/bg/foundations.jsx`):**

| Token | Hex | Use |
|---|---|---|
| `--kv-black` (ink) | `#0a0a0a` | Mark on light, text on light, dark backgrounds |
| `--kv-paper` | `#ffffff` | Mark on dark |
| `--kv-off-white` (bone) | `#f2f0ec` | Avatar and company banner background |
| `--kv-green` (sage) | `#8ecfbf` | Accent lines, label text |
| `--kv-gray-500` | `#888888` | Secondary/footer text |

---

## Visual approach per asset

**Avatars / Instagram profile** — Bone (`#f2f0ec`) background. Canonical D-Layers mark
centered at 420px rendered size (39% of canvas). No text. Circle-crop safe.

**X/Twitter header** — Ink background. Small mark (88px, paper) top-left. Hero lines
left-aligned in IBM Plex Mono Bold 56pt. `MARKET 01 · CAPE VERDE` in sage, lower-right.

**LinkedIn company banner** — Bone background, ink IBM Plex Mono Bold 26pt, descriptor
centered across two lines. No mark (LinkedIn places the company logo adjacent automatically).

**LinkedIn founder banner** — Ink background. Hero text starts at x=350 to clear the
LinkedIn profile photo safe zone (bottom-left ≈ x < 330, y > 230). Descriptor in sage below.

**Open Graph** — Ink background. Canonical mark (72px, paper) + `AREI` label top-left.
Hero line 1 in paper, hero line 2 in sage. Descriptor in gray. `arei.so` bottom-right.

---

## Checks before uploading

- [ ] Circle crop looks clean at 40px (avatar and Instagram)
- [ ] X header text readable at 375px mobile viewport width
- [ ] LinkedIn founder banner — text clears profile photo bottom-left
- [ ] No KazaVerde name visible in any asset
- [ ] OG image makes sense with no surrounding context (test via link unfurl)
