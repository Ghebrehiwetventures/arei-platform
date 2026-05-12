# CLAUDE.md

Start with `docs/document-precedence.md`.
When documents conflict, follow the higher-precedence document.
For repo execution rules, use `docs/operations/execution-protocol.md`.
For founder/business operations, use `docs/operations/founder-operating-runbook.md`.
Documentation never overrides live state, current code, or verified output.

## Brand & design system

For visual identity, color palette, typography, mark geometry, and any design
question across AREI products (landing, admin, kazaverde-web / Cape Verde Real
Estate Index, reports):

1. **Start with** `docs/brand/README.md` (concise entry + read order).
2. **Canonical source** lives in `docs/brand/source/` — these are the authored
   JSX files for AREI Brand Guidelines v1.0. They are the single source of
   truth for color, type, mark, and pairing rules.
3. **Current reconciliation status** is in `docs/brand/audit-2026-05-12.md` —
   it lists divergences between the canonical brand and live implementations,
   with a sequenced PR plan to close them.
4. Cross-product rules: `docs/04-platform/visual-identity.md` (older — verify
   against `docs/brand/source/` on any conflict).

The canonical color palette is 8 tokens: `#0A0A0A` ink, `#FFFFFF` paper,
`#FAFAFA` bone, `#F2F0EC` off-white, `#8ECFBF` sage, `#2D4A42` sage deep,
`#888888` gray 500, `#C44A3A` coral. Sage on ink is the master-surface
treatment. High-saturation accents (magenta, electric blue, lime) are
explicitly forbidden — use sage and sage deep, not arbitrary greens.
