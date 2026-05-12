# Brand Guidelines v1.0 — Authored Source

This directory contains the **authored source files** for AREI Brand Guidelines v1.0.
These JSX components are the canonical brand specification.

They were authored as a self-contained React app that renders the brand guidelines
as a single-page HTML document. The original distribution is the "Kazaverde 2.0"
asset bundle (May 2026). We import only the source files here; the bundled HTML
(1.6 MB) is intentionally excluded.

## Read order for an agent

If you need to understand AREI's design system, read these files in this order:

1. **`manual/manual-core.jsx`** — top-level structure, what sections exist
2. **`manual/manual-01-foundations.jsx`** — cover, brand idea, architecture, logo & mark, country lockup system, **color system** (§06)
3. **`bg/foundations.jsx`** — codified color palette, typography specimens, spacing scale, motion
4. **`bg/dataviz.jsx`** — canonical chart treatment (time-series, sparkline, coverage map)
5. **`bg/marks.jsx` + `bg/logo-system.jsx`** — mark geometry, lockup system
6. **`bg/strategy.jsx`** — brand strategy & positioning
7. **`manual/manual-02-product.jsx`** — product application (web, mobile, reports)
8. **`manual/manual-03-collateral.jsx`** — collateral application (social, print, email)

## What these files prove

The canonical color palette (manual-01-foundations.jsx §06):

| Name | Hex | Role |
|---|---|---|
| Ink | `#0A0A0A` | Primary text, master surfaces, KPI numbers |
| Paper | `#FFFFFF` | Default surface — cards, reports, web body |
| Bone | `#FAFAFA` | Page ground — slightly warmer than pure white |
| Off-white | `#F2F0EC` | Secondary surface — sidebars, alt rows |
| Sage | `#8ECFBF` | Brand accent on ink — ticker glyphs, on-dark mark |
| Sage deep | `#2D4A42` | Editorial dark — chart highlights, positive deltas |
| Gray 500 | `#888888` | Captions, eyebrow labels, table dividers |
| Coral | `#C44A3A` | Negative deltas, do-not stamps |

The canonical pairing rules (§06.2):
- **Master surfaces:** ink ground + sage mark + sage deep secondary
- **Editorial / paper:** paper or bone ground + ink type + off-white as alt row
- **Data delta:** sage deep for positive, coral for negative

Forbidden uses (§06.3):
- Country flag palettes
- Gradients (solid only)
- High-saturation accents (no magenta, electric blue, **lime**)
- Coral on ink (paper only, never hero)

## How this relates to the rest of the brand docs

- **`docs/brand/README.md`** — concise brand summary, links here for the source
- **`docs/brand/audit-2026-05-12.md`** — reconciliation between this canonical source and current implementations
- **`docs/04-platform/visual-identity.md`** — cross-product rules, tonality, principles (older doc — cross-check against this source on conflict)
- **`docs/04-platform/design-tokens-discovery.md`** — pre-brand-pass technical token inventory, **superseded**

## Maintenance

When brand guidelines v2 is released:
1. Replace these source files with the v2 source
2. Update `docs/brand/audit-2026-05-12.md` (or open a new dated audit)
3. Update `docs/brand/README.md`
4. Mark divergences for migration

**Do not edit these files in place.** They are an authoritative external artifact. If a rule is wrong, that's a brand-team conversation, not a code change.
