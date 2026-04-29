# Decision Log

Last updated: 2026-04-28

## Purpose

This file records canonical project decisions that should not disappear into chats, ad hoc notes, or tool-specific memory.

## Format

Each entry should include:
- date
- decision
- reason
- consequence
- status

Status values:
- `active`
- `superseded`
- `revisited`

## Decisions

### 2026-03-18 — Canonical documentation structure adopted

- Status: `active`
- Decision:
  The project will use the AREI master documentation architecture as the canonical top-level structure for strategy, data engine, product, platform, quality control, go-to-market, commercial, expansion, and decisions.
- Reason:
  Important project truth had become scattered across chats, old markdown files, launch notes, and code context.
- Consequence:
  New canonical docs must be created and maintained in the repo, and legacy docs should be treated as source material rather than automatic truth.

### 2026-03-18 — Trust rules, MVP scope, and launch risks promoted to canonical docs

- Status: `active`
- Decision:
  Data trust rules, MVP scope, and launch risks now live as canonical docs in the numbered AREI structure.
- Reason:
  Launch-critical knowledge needed a stable home that survives tool changes and clarifies current product truth.
- Consequence:
  Future launch, product, and trust discussions should update those docs rather than living only in chat.

### 2026-03-07 — Public launch feed for KazaVerde locked to `public.v1_feed_cv`

- Status: `active`
- Decision:
  The canonical public Cape Verde feed is `public.v1_feed_cv`.
- Reason:
  Launch required one stable public contract rather than ambiguous or shifting feed logic.
- Consequence:
  Consumer product surfaces should use this feed contract and launch reporting must distinguish between raw visible inventory and public feed inventory.

### 2026-03-07 — Price is optional at feed level

- Status: `active`
- Decision:
  Numeric price is not required for inclusion in the public launch feed.
- Reason:
  Excluding all listings without extractable price would weaken coverage too aggressively, while price can still be handled safely in presentation and analytics.
- Consequence:
  The product may show neutral price fallbacks such as "Price on request", and price-based analytics must exclude listings without numeric price.

### 2026-03-07 — Stub and test sources excluded from public launch feed

- Status: `active`
- Decision:
  Stub/test rows such as `cv_source_1` and `cv_source_2` are excluded from the public Cape Verde launch feed.
- Reason:
  Public launch truth must not include placeholder inventory.
- Consequence:
  KPI reporting and launch counts must reflect the stricter public feed, not raw inflated inventory.

### 2026-03-07 — Raw visible inventory and public feed inventory must be reported separately

- Status: `active`
- Decision:
  KPI and launch reporting must explicitly distinguish raw visible CV rows from public feed CV rows.
- Reason:
  The public feed uses stricter gates than raw visible inventory, and collapsing the two creates misleading claims.
- Consequence:
  Count language in docs, product discussions, and launch reporting should remain precise.

### 2026-03-07 — KazaVerde main-stage launch not yet approved

- Status: `active`
- Decision:
  KazaVerde should remain soft live / controlled iteration rather than being treated as fully main-stage ready.
- Reason:
  Launch blockers remained across positioning, image reliability, Portuguese quality, compliance, SEO verification, and product truth cleanup.
- Consequence:
  Launch-risk handling and product cleanup remain higher priority than v2 expansion.

### 2026-03-07 — KazaVerde should be framed as a transparent Cape Verde property index / market data portal

- Status: `active`
- Decision:
  The preferred near-term framing is read-only index / market data portal, not marketplace.
- Reason:
  That framing matches governance, actual current product behavior, and the AREI data-platform thesis more closely than broker or marketplace language.
- Consequence:
  Copy, navigation, and documentation should move toward this framing over time.

### 2026-03-07 — `VIEW ON SOURCE` is the correct detail-page external CTA

- Status: `active`
- Decision:
  Detail pages should use source-directed external CTA rather than misleading direct-contact language.
- Reason:
  The product is a read-only index, not a broker workflow.
- Consequence:
  CTA patterns that imply direct transaction handling should be removed or avoided unless the product model changes explicitly.

### 2026-03-07 — Saved behavior is local-browser only for launch

- Status: `active`
- Decision:
  Saved listings at launch are stored locally in the user browser and should not imply account sync.
- Reason:
  Local save behavior exists, while cross-device persistence does not.
- Consequence:
  Saved UX and copy must stay explicit about local-only behavior.

### 2026-03-07 — Approximate market history must not be presented as measured historical truth

- Status: `active`
- Decision:
  Market trends may only be shown as approximate or coming soon unless backed by real historical data.
- Reason:
  Synthetic history creates false confidence and undermines the market-intelligence thesis.
- Consequence:
  Historical analytics belong in v2 only when the underlying data is real and documented.

### 2026-03-18 — KazaVerde is a beachhead market surface, not the whole company

- Status: `active`
- Decision:
  KazaVerde is the first consumer proof surface for AREI, not the complete identity or scope of the company.
- Reason:
  Strategy and product discussions had started drifting toward treating the current frontend as the whole business.
- Consequence:
  Strategy docs should distinguish AREI platform vision from KazaVerde launch execution.

### 2026-03-18 — Primary navigation no longer promotes sell or rent as current product scope

- Status: `active`
- Decision:
  `SELL`, `RENT`, and `LIST PROPERTY` were removed from the primary KazaVerde navigation.
- Reason:
  Those navigation items conflicted with the documented read-only index positioning and implied marketplace scope the launch product does not currently support.
- Consequence:
  The routes may still exist for explanatory purposes, but they no longer define the core product story.

### 2026-03-18 — SELL and RENT removed from public KazaVerde routing

- Status: `active`
- Decision:
  `SELL` and `RENT` were removed from the public KazaVerde routing surface for now.
- Reason:
  Even as explanatory pages, they continued to signal roadmap and marketplace scope that the current launch should avoid.
- Consequence:
  Seller and rental flows are now treated as future product questions, not public launch surfaces.

### 2026-03-18 — Public product copy moved from aggregator framing toward read-only index framing

- Status: `active`
- Decision:
  Home, About, footer, metadata, and selected editorial copy were revised to describe KazaVerde as a read-only, source-linked property index rather than a generic aggregator.
- Reason:
  Aggregator language and over-broad source/dedup explanations conflicted with governance, trust rules, and the canonical product framing.
- Consequence:
  Remaining copy issues should be treated as explicit cleanup work rather than accepted drift.

### 2026-03-18 — Admin protection now fails closed by default outside local development

- Status: `active`
- Decision:
  `arei-admin` now defaults to protected mode outside local development unless `VITE_ADMIN_PROTECTED=false` is set explicitly.
- Reason:
  The prior behavior made it too easy for the admin surface to remain open because of configuration drift.
- Consequence:
  Production environments must supply valid admin auth secrets or the admin will remain blocked rather than silently open.

### 2026-03-18 — Admin surface is internal-only until mature auth exists

- Status: `active`
- Decision:
  `arei-admin` should be treated as strictly internal until a mature auth model exists.
- Reason:
  The current auth hardening is useful, but it still relies on a shared password and shared session secret rather than a mature identity model.
- Consequence:
  The admin should not be positioned as a broadly exposed public tool at launch.

## Open contradictions requiring explicit future decisions

These are not resolved decisions yet. They are logged here so they stay visible.

### O1. Navigation still suggests broader product scope than governance allows

- Status: `active`
- Decision:
  Closed by current product cleanup. `SELL` and `RENT` are no longer part of public navigation or routing.
- Reason:
  The public launch should not signal marketplace or rental workflows that do not exist.
- Consequence:
  Product positioning is clearer, but future reintroduction would require an explicit new decision.

### O2. Public copy and governance still conflict on source and dedup explanations

- Status: `active`
- Decision:
  No final wording decision yet on how About and trust-facing copy should be revised to match governance.
- Reason:
  Existing explanations mention broader source categories and dedup behavior than current governance supports.
- Consequence:
  Public-facing explanations remain a trust-sensitive cleanup area.

### 2026-04-28 — Cross-product visual alignment: shared core tokens, per-app accents

- Status: `active`
- Decision:
  AREI products (KazaVerde, arei-admin, arei-landing) will share *core/structural* design tokens (typography stack, spacing scale, radius, neutrals, surfaces, shadows, semantic success/warning/error). Each app keeps a *product-appropriate accent* in the same family. KazaVerde's identity (muted teal-sage `#8ecfbf` / `#2d4a42`) is not changed; arei-admin and arei-landing accents may move toward the same family but admin must remain functional and dashboard-readable, and landing must feel institutional, data-first, and premium.
- Reason:
  Visual alignment across products without flattening identity. KazaVerde's brand is specific (muted teal-sage, not generic teal) and load-bearing for market credibility; uniform accent-replacement would dilute it. Three apps currently drift on tokens that should be shared (typography, neutrals) while differing on accents that *should* differ.
- Consequence:
  - No `packages/ui` build yet.
  - No big-bang migration; KazaVerde stability remains top priority.
  - Discovery + a minimal migration plan precede any code change.
  - When unifying anything, the rule is "visuell släktskap, inte uniformitet" — share neutrals/structure, keep brand accents per-app.
