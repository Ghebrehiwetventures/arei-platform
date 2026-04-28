# Visual Identity — AREI

Status: `living document`
Last updated: 2026-04-28
Decision reference: `docs/09-decisions/decision-log.md` (2026-04-28 — Cross-product visual alignment)

This is the brand & visual language reference for AREI products. It complements `docs/04-platform/design-tokens-discovery.md`, which catalogs the technical tokens. This doc describes the *intent* behind those tokens.

The rule: **visual släktskap, inte uniformitet.** Each product shares structural language but keeps its own voice.

---

## 1. KazaVerde — muted teal-sage / KazaVerde green

KazaVerde's accent is a *muted teal-sage*. Calm, natural, slightly coastal, premium. It is the visual signal of the consumer brand and is **not interchangeable with generic teal**.

Canonical values (do not drift):

- Primary `#8ecfbf` (`--kv-green`)
- Hover `#7ec0b0` (`--kv-green-hover`)
- Soft `#b6dfd2` (`--kv-green-soft`)
- Deep editorial `#2d4a42` (`--kv-green-deep`)
- Tint `rgba(142, 207, 191, 0.18)` (`--kv-green-tint`)

**Source of truth:** `kazaverde-web/src/styles/globals.css`. Other apps reference these values; they do not redefine them.

What this color *is not*: bright cyan, startup blue, Tailwind teal, lime/grass green, generic SaaS turquoise. If a swatch starts looking like any of those, it has drifted.

---

## 2. AREI as data-first, institutional, premium

AREI as an organization (the parent of KazaVerde and future market verticals) presents itself as **institutional, data-first, premium**. This shapes both the landing site and admin.

- **Institutional** — the visual language is closer to Bloomberg or a research publication than to a consumer real-estate startup. Generous whitespace, restrained color, mono-dominant type.
- **Data-first** — numbers and tables are first-class citizens. Charts, indices, and counts are the hero, not lifestyle imagery.
- **Premium** — quiet confidence, not loud marketing. No hero gradients, no animated emojis, no growth-hack visuals.

The KazaVerde sage appears in AREI surfaces as a *quiet thread* of identity — a small accent, an active state, an index marker — never as a dominant fill.

---

## 3. The three surfaces and how they differ

| | KazaVerde | AREI landing | AREI admin |
|---|---|---|---|
| **Audience** | Consumer / investor browsing listings | Institutional, investors, partners | Internal operators |
| **Voice** | Editorial, calm, real | Institutional, data-first, premium | Functional, dense, dashboard-readable |
| **Primary accent** | KazaVerde green `#8ecfbf` | Same sage, used sparingly as institutional accent | Currently amber `#d97706` (legacy; refresh deferred) |
| **Dark mode** | None — light only by design | None | Full light + dark |
| **Type** | IBM Plex Mono dominant; IBM Plex Sans for prose | IBM Plex Mono only | Inter + JetBrains Mono |
| **Density** | Editorial, generous whitespace | Editorial, generous whitespace | Dense, compact for ops |
| **Imagery** | Photographic listings, no overlays | Sparse, data-led | None — UI only |

Read this table as: KazaVerde and landing are siblings (editorial twins, different jobs). Admin is a cousin (functional, family resemblance through neutrals and type, but its own grammar).

---

## 4. Typography

- **Mono — IBM Plex Mono** is the primary face across KazaVerde and AREI landing. It carries the data-first, neutral, editorial tone. Used for UI, labels, headings, all numerical data.
- **Sans — IBM Plex Sans** is reserved for long-form prose (descriptions, articles).
- **Admin** uses Inter + JetBrains Mono for higher legibility in dense dashboards. This is a deliberate divergence; do not "fix" it unless admin's role changes.

Weights: 400 / 500 / 600. Avoid heavier weights — they break the institutional restraint.

Sizing scale is responsive and deliberately small at the lower end (down to 9px for chrome labels in KazaVerde). Resist inflating type sizes for "polish" — small + precise reads as serious.

---

## 5. Color principles

1. **Neutrals dominate.** Page is `#fafafa`. Type is `#0a0a0a` (or `#111113` in admin). The sage is an accent, not a fill.
2. **One accent per surface.** Don't stack the sage on top of competing accents. Category accents (ocean `#8eb4cf`, lavender `#b48ecf`) exist in KazaVerde for tagging only; they are not brand colors.
3. **Semantic colors are quiet.** Success, warning, error use muted, low-saturation tones (e.g. admin's `#059669` green, `#dc2626` red, `#d97706` amber). Never chartreuse, never neon.
4. **Dividers are barely there.** Black at 8% / 15% / 30% opacity. A line should *suggest* structure, not enforce it.
5. **Backgrounds are warm whites, not cold grays.** `#fafafa`, `#f2f0ec`, `#ffffff`. No bluish neutrals.
6. **No gradients on brand surfaces.** Flat fills only. Gradients belong to consumer marketing tropes we are deliberately not part of.

---

## 6. Imagery

- **KazaVerde:** photographic listings, owner-supplied or scraped from sources. No filters, no diagonal hatch overlays, no color washes. The image *is* the value — overlays obscure it.
- **AREI landing:** sparse imagery. Data visualizations and typographic compositions over photography. When photography appears, it is editorial and uncropped.
- **AREI admin:** none. Admin is purely UI.

---

## 7. Tonality in UI

- **Be specific, not promotional.** "1,054 listings, 432 visible, refreshed 14 min ago" beats "Vibrant marketplace of properties!"
- **Use uppercase eyebrow labels sparingly** (`MARKET`, `ISLAND`, `LIVE`) for chrome. Body remains sentence case.
- **Numbers are never abbreviated** ("382 listings", not "382+"). Trust comes from precision.
- **Prefer short, declarative sentences.** No exclamation marks. No rhetorical questions in copy.
- **Admit gaps.** "No data for this market yet" is better than fake placeholders. The product's credibility depends on it.
- **Microcopy errs toward calm.** Loading states say "Loading…", not "Hold tight!" Empty states explain *why*, not *try harder*.

---

## 8. What we avoid

- Generic teal, bright cyan, startup blue, lime green, SaaS turquoise. The sage is specific.
- Gradients, drop shadows beyond `0 1px 2px` subtlety, glassmorphism, neumorphism.
- Stock illustrations, hand-drawn doodles, emoji-as-icons.
- Rounded "pill" CTAs the size of pillows. Buttons are 8px radius, restrained.
- Hero animations that delay the user seeing data.
- Lifestyle imagery that doesn't represent actual listings.
- Marketing-tone copy ("Discover!", "Unlock!", "Effortless!"). It collapses the institutional positioning.
- One unified accent across all three apps. Each surface has its appropriate accent in the same family.
- "Disrupting" anything in copy. We are aggregating data, not disrupting markets.

---

## Maintenance

- Token values: see `docs/04-platform/design-tokens-discovery.md` and `kazaverde-web/src/styles/globals.css`.
- When this doc and live code diverge, **the live KazaVerde code is the source of truth for the sage palette.** This doc reflects what KazaVerde does.
- Update this doc when a deliberate identity decision is made; not when a token is added. Tokens are technical; identity is editorial.

---

## Shared vs product-specific (Phase 2 baseline)

Phase 2 deliberately stops short of code-level token sharing. We document the canonical values, point each app's CSS at the source of truth via comments, and leave the existing per-app variable namespaces untouched. This keeps drift visible without forcing a migration.

### Shared across all AREI products

These values appear in two or more apps with the same intent. They should not drift.

| Concern | Value(s) | Notes |
|---|---|---|
| Page background | `#fafafa` | KV `--kv-white`, admin `--color-background`, landing `--white` |
| Warm tint | `#f2f0ec` | KV `--kv-off-white`, landing `--off-white` (admin n/a) |
| Primary ink | `#0a0a0a` | KV `--kv-black`, landing `--black`. Admin uses `#111113` — accepted minor drift, not worth migrating |
| Meta gray | `#888` / `#888888` | KV + landing |
| Mono font | `IBM Plex Mono` (with `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` fallback) | KV + landing. Admin uses JetBrains Mono — deliberate, see below |
| Sans font | `IBM Plex Sans` | KV. Landing is mono-only by design |
| Divider, light surface | `rgba(0,0,0,0.15)` | KV `--kv-rule`, landing `--rule` |
| Button/input radius | `8px` | All three, currently hard-coded — not yet tokenized |
| Content max-width | `~1200px` | KV `--kv-content-w`, landing inline |
| Nav height | `52px` | KV + landing |
| KazaVerde sage primary | `#8ecfbf` | KV `--kv-green`, landing `--green` (mirrored — see `kazaverde-web/src/styles/globals.css`) |
| KazaVerde sage deep | `#2d4a42` | KV `--kv-green-deep`, landing `--deep-green` (mirrored) |

### Intentionally product-specific (do not unify)

| Concern | KazaVerde | arei-admin | arei-landing | Why |
|---|---|---|---|---|
| Brand accent | sage `#8ecfbf` | amber `#d97706` (light), `#f59e0b` (dark) | sage `#8ecfbf` (used sparingly) | Admin is internal/operational; KV + landing carry brand |
| Dark mode | none | full | none | KV + landing are light-only by design |
| Typeface | IBM Plex Mono + Sans | Inter + JetBrains Mono | IBM Plex Mono only | Admin chose JetBrains for dashboard density |
| Semantic color tokens | minimal | full set (`--color-green/red/amber`, light + dark) | minimal | Only admin renders error/warning states |
| Spacing scale | full (`--kv-s-1..12`) | none (Tailwind utilities) | none (inline) | Acceptable — not currently a drift risk |

### Source of truth

| Concern | Source of truth | File |
|---|---|---|
| KazaVerde sage palette | KazaVerde | `kazaverde-web/src/styles/globals.css` |
| AREI visual identity (rules, principles, tonality) | this document | `docs/04-platform/visual-identity.md` |
| Cross-product token audit (technical state) | discovery doc | `docs/04-platform/design-tokens-discovery.md` |
| Product decisions about visual scope | decision log | `docs/09-decisions/decision-log.md` |

When a value lives in more than one app, **KazaVerde wins.** Other apps mirror; never the other way.

---

## How to make future visual changes

The flow depends on what's changing:

**1. Adjusting the KazaVerde sage palette (rare, identity-level)**
- Update `kazaverde-web/src/styles/globals.css` first.
- Update `arei-landing/index.html` `:root` block (mirror values verbatim).
- Update the canonical hex references in this doc and in `design-tokens-discovery.md`.
- Land all three changes in one PR. Do not let them drift across days.

**2. Adjusting a shared neutral / typography / radius value**
- Update KazaVerde first.
- Update arei-admin and arei-landing in the same PR.
- Document the change in `design-tokens-discovery.md`.

**3. Changing only one app's product-specific token (e.g. admin's amber accent)**
- Edit only that app.
- If it's a deliberate identity move, add a decision-log entry.
- Do not touch the other apps.

**4. Adding a brand-new shared token**
- First, justify why it's shared. If only one app needs it today, add it there.
- If two apps need it: add to both, mirror the value, comment-link in both files.
- A `packages/design-tokens` build step is a Phase 3+ consideration — only justified if the comment-mirror approach starts producing real drift.

**5. Tonality / copy / imagery rules**
- Edit this doc (`visual-identity.md`).
- These rules are editorial, not enforced by code.

**Anti-rules (don't):**
- Don't refactor variable names across apps for "cleanliness." Per-app namespaces are accepted overhead.
- Don't introduce a shared CSS file imported by all three apps without first justifying the abstraction in a decision-log entry.
- Don't redeclare KazaVerde's sage in another app under a new variable name; mirror the existing values and comment-link.
- Don't elevate admin's amber to "AREI accent." It is product-specific.
