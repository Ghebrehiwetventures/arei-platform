# Design Tokens — Discovery & Minimal Migration Plan

Status: `discovery — not yet executing`
Last updated: 2026-04-28
Decision reference: `docs/09-decisions/decision-log.md` (2026-04-28 entry)

## Frame

We have three frontends in this monorepo:

- `kazaverde-web/` — public consumer site. Identity is established: muted teal-sage / KazaVerde green. Stability and credibility for market is **top priority**.
- `arei-admin/` — internal admin. Functional, dashboard-readable. Currently uses warm amber accent; not load-bearing brand.
- `arei-landing/` — institutional/data-first marketing surface. Currently uses a slightly different green from KazaVerde.

Goal: visual *släktskap*, not uniformity. Share core/structural tokens; keep per-app accents in the same family.

## Where tokens live today

| App | File | Approach |
|---|---|---|
| kazaverde-web | `kazaverde-web/src/styles/globals.css` (lines 11–132) | Vanilla CSS `:root` with `--kv-*` namespace. Mature, comprehensive (color, type, spacing, motion). |
| arei-admin | `arei-admin/index.css` (lines 1–72) | Tailwind v4 `@theme` block, `--color-*` namespace. Light + dark. No spacing tokens. |
| arei-landing | `arei-landing/index.html` (lines 26–40) | Inline `<style>` in HTML, `:root` with `--green`, `--deep-green`, etc. Minimal. |

## Color palette in use

**kazaverde-web** (canonical brand)
- Brand: `#8ecfbf` primary, `#7ec0b0` hover, `#2d4a42` deep, `#b6dfd2` soft, `rgba(142,207,191,0.18)` tint
- Category accents: `#8eb4cf` ocean, `#b48ecf` lavender
- Neutrals: `#fafafa`, `#ffffff`, `#f2f0ec`, `#0a0a0a`
- Dividers: `rgba(0,0,0,0.08/0.15/0.30)`

**arei-admin**
- Accent: amber `#d97706` (light), `#f59e0b` (dark)
- Surfaces (light): `#fafafa`, `#ffffff`, `#f5f5f7`, `#efefef`
- Surfaces (dark): `#0b0b0d`, `#141416`, `#1c1c1f`, `#242428`
- Text: `#111113`, muted `#6b7280`, subtle `#9ca3af`
- Semantic: green `#059669`, red `#dc2626`, amber `#d97706` (light); `#34d399`/`#f87171`/`#fbbf24` (dark)
- Borders: `#e5e7eb`, `#d1d5db`

**arei-landing**
- Accent: `#8ecf8e` (note: *different* from KazaVerde `#8ecfbf` — accidental drift, more lime than sage)
- Deep: `#2d4a3e` (also drifted from KV `#2d4a42`)
- Neutrals: `#fafafa`, `#f2f0ec`, `#0a0a0a`, `#888`

## Typography

| App | Sans | Mono | Notes |
|---|---|---|---|
| kazaverde-web | IBM Plex Sans | IBM Plex Mono | Mono dominates UI; sans for long-form prose |
| arei-admin | Inter | JetBrains Mono | Tailwind defaults for scale |
| arei-landing | — | IBM Plex Mono | Mono-only design |

## Spacing / radius / shadow

- KazaVerde: full 4px-base spacing scale, layout tokens (`--kv-content-w: 1200px`, `--kv-gutter: 24px`, `--kv-nav-h: 52px`), motion easing.
- arei-admin: no spacing tokens; relies on Tailwind utilities. Has `.shadow-sm` recipe.
- arei-landing: inline values, no tokens.

Common values across apps but un-tokenized:
- 8px button/input radius (all three, hard-coded)
- 1200px content width and 52px nav (KV + landing)

## Cross-app analysis

### Duplicated (defined 2+ times, same intent)

| Token | Value | Apps |
|---|---|---|
| Page background | `#fafafa` | All three |
| Primary text | `#0a0a0a` (KV+landing), `#111113` (admin) | Drift |
| Mono font | IBM Plex Mono (KV+landing), JetBrains Mono (admin) | Drift |
| Divider | `rgba(0,0,0,0.15)` | KV + landing |
| Nav height | 52px | KV + landing |
| Content width | ~1120–1200px | KV + landing |
| Button radius | 8px | All three (hard-coded, not tokenized) |
| Meta gray | `#888` | KV + landing |

### Intentionally different (per-app identity)

| Token | KV | admin | landing | Why |
|---|---|---|---|---|
| Brand accent | `#8ecfbf` sage | `#d97706` amber | `#8ecf8e` greenish | Brand identity (admin-amber is legacy default, not deliberate) |
| Dark mode | none | full | none | KV is light-only by design; admin needs dark for ops |
| Mono font | IBM Plex | JetBrains | IBM Plex | Admin chose JB for technical feel |

### Drift that's accidental (not deliberate)

- arei-landing's `#8ecf8e` and `#2d4a3e` are *almost* KazaVerde's sage, suggesting a copy that drifted. Likely should snap to KV's exact values.
- arei-admin's primary text `#111113` vs KV/landing's `#0a0a0a` — small but inconsistent.
- 8px radius hard-coded in three places.

## Minimal migration plan (proposal — not yet approved)

Target the lowest-risk, highest-leverage extraction first. **No `packages/ui`. No big-bang. KazaVerde stays untouched in this round.**

### Phase 0 — Document & decide (this doc + the ADR)
- ADR entry written.
- Discovery written (this file).
- No code changes.

### Phase 1 — Snap arei-landing to KazaVerde core values *(½ day, no shared package)*
- Reason: arei-landing's drift is *accidental*. Snapping it back to KV's exact `#8ecfbf` / `#2d4a42` / `#0a0a0a` and IBM Plex Mono is purely a typo-fix and creates immediate visual släktskap with no abstraction cost.
- Scope: edit `arei-landing/index.html` `<style>` block directly. No new packages.
- Risk: low — landing is small and not load-bearing.
- Verification: side-by-side screenshots vs KazaVerde.

### Phase 2 — Establish a shared *tokens-only* file *(½ day, still no `packages/ui`)*
- Create `packages/design-tokens/tokens.css` (CSS custom-properties only, no JS, no components).
- Contents: only the **safe-to-share** set:
  - IBM Plex Mono / IBM Plex Sans font stacks
  - Neutral grays (`#fafafa`, `#0a0a0a`, `#888`)
  - 4px-base spacing scale
  - 8px radius
  - Standard divider opacities
  - Semantic success/warning/error colors (lifted from arei-admin)
- KazaVerde imports it but **continues to alias** through `--kv-*` so no internal CSS needs to change.
- arei-landing imports it.
- arei-admin imports it; semantic colors come from here, but its `--color-*` aliases stay.
- Risk: low — purely additive; consumers map onto existing names.
- Explicitly **out of scope**: changing KazaVerde's accent, replacing admin's amber, dark-mode harmonization, any React component.

### Phase 3 — arei-admin accent refresh *(½ day, optional, can defer)*
- Replace amber `#d97706` with a sage in the same family but **calibrated for dashboard readability** (likely `#2d4a42` deep at low saturation, used only for active/focus states; not a wholesale recolor).
- Keep neutrals dominant. Semantic colors unchanged.
- Risk: medium (visible to internal users). Worth doing only after Phase 2 lands.

### Phase 4 — Re-evaluate
- Only after Phases 1–3 land and prove out, consider whether `packages/ui` is justified. Likely it isn't yet.

## Constraints / non-negotiables

- KazaVerde identity is not modified. Its `--kv-*` namespace remains the canonical brand source.
- No `packages/ui` in this round.
- No big-bang migration.
- Phases are independently shippable and revertable.
- KazaVerde stability is the priority. Anything that risks KV's launch quality is deferred.

## Open questions for review

1. Is Phase 1 (landing snap-to-KV) acceptable to do as a quick fix even before Phase 2 lands?
2. For Phase 2, should the shared tokens file live at `packages/design-tokens/` or as a flat file at repo root (e.g. `tokens.css`)? Phases of further consolidation may inform this.
3. Phase 3 — does admin actually need an accent refresh now, or can it stay amber for the foreseeable future and we revisit only when admin gets a real UX overhaul?
