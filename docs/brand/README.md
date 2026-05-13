# AREI Brand — Source of Truth

This directory is the canonical brand reference for all AREI products.
When docs conflict, this directory wins over older per-product visual guidance.

## Start here (agent / engineer entry point)

If you are arriving fresh and need to understand the AREI design system:

1. **`source/README.md`** — index of authored brand guidelines v1.0 source files (JSX) with read order
2. **`source/manual/manual-01-foundations.jsx`** — canonical brand: cover, brand idea, architecture, logo & mark, country lockup, **color system §06**
3. **`source/bg/foundations.jsx`** — codified color tokens, typography specimens, spacing
4. **`audit-2026-05-12.md`** — current reconciliation between canonical brand v1 and live implementations; lists known divergences and the planned PR sequence
5. This file (`README.md`) — concise summary below

The canonical brand source files live in `source/` because they were authored as
JSX components and rendered to a standalone HTML brand guide. They are the
single source of truth for color, typography, mark geometry, and pairing rules.

---

## D·Layers mark

**Canonical asset:** `docs/brand/assets/d-layers-mark.svg`

Geometry (from AREI Brand Guidelines v1.0):
- Three overlapping squares staggered toward bottom-right
- Back square: stroke only (no fill)
- Middle square: stroke only (no fill)
- Front square: solid fill, no stroke
- `viewBox="0 0 24 24"`, `stroke-width="1.4"`, `stroke-linecap="square"`

**Do not redraw from memory.** Do not substitute bars, diamonds, opacity-faded rects, or any other approximation. Use the SVG file directly.

The original AREI Brand Guidelines (standalone HTML, ~1.7 MB bundled app) is the authoritative source for any future geometry change. Store it in the shared design drive and update this SVG if the mark ever changes.

Current implementations that must stay in sync with `d-layers-mark.svg`:

| File | Location |
|---|---|
| `arei-admin/app.tsx` | `DLayersMark` component |
| `arei-admin/sourceHealthReport.tsx` | inline SVG in HTML export header |

---

## Typography

| Face | Use |
|---|---|
| IBM Plex Mono | UI labels, headings, numbers, nav, all data |
| IBM Plex Sans | Long-form prose only |

Weights: 400 / 500 / 600. Do not go heavier — breaks the institutional tone.

---

## Color tokens

| Role | Value | Notes |
|---|---|---|
| KazaVerde sage (primary accent) | `#8ecfbf` | Shared across all AREI products |
| Deep green | `#2d4a42` | Editorial headings, active states |
| Page background | `#f7f6f2` (light) / `#0d0d0b` (dark) | Warm whites, not cold grays |
| Foreground | `#111110` (light) / `#edecea` (dark) | |
| Border | `#dddbd5` (light) / `#2e2e2b` (dark) | Hairlines only — dividers suggest, not enforce |
| Green (semantic) | `#2e7d52` | Success / healthy states only |
| Amber (semantic) | `#92600a` | Warning / degraded states only |
| Red (semantic) | `#b91c1c` | Error / critical states only |

Amber (`#92600a`) is a **severity-only semantic color** in admin — it is not a brand accent. Do not promote it to an accent role.

---

## Product alignment

All AREI products — admin, landing, reports, future CRM/broker tooling — share this brand system. Per-product accents exist within the sage family; the type system (IBM Plex) and neutrals are shared.

| Product | Accent | Dark mode | Notes |
|---|---|---|---|
| KazaVerde (consumer) | sage `#8ecfbf` | none — light only | Source of truth for sage palette |
| AREI admin | sage `#8ecfbf` | full | |
| AREI landing | sage `#8ecfbf`, used sparingly | none — light only | |
| Future CRM / broker | sage family | TBD | Follow this README |

---

## Superseded guidance

The following guidance is **stale** and superseded by this directory:

- Admin-specific amber accent as primary — amber is severity only
- Inter + JetBrains Mono as admin fonts — replaced by IBM Plex Sans + Mono (aligned 2026-05)
- Any per-product mark that is not `d-layers-mark.svg`

See also: `docs/04-platform/visual-identity.md` (cross-product rules and principles).
