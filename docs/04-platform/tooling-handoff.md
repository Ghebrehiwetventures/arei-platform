# Tooling Handoff

Last updated: 2026-03-21

## Purpose

This document explains how a new tool, agent, or contributor should understand and work in this repo without losing strategic context.

It is intentionally tool agnostic. The repo must remain legible across Codex, ChatGPT, Claude, Cursor, and future tools.

## First principles

Before changing anything, a new tool should understand six things:

1. This is not a generic SaaS app.
2. AREI is the parent platform and data engine.
3. KazaVerde is the current public Cape Verde consumer surface driven by AREI.
4. AREI Admin is the internal operational product and is not a public consumer brand.
5. Governance and trust rules outrank convenience.
6. Important project knowledge should end up in canonical repo docs, not stay in chat residue.

## Read these files first

In this order:

1. `ROOT_MAP.md`
1. `docs/GOVERNANCE.md`
2. `docs/AREI_master_documentation_architecture.md`
3. `docs/AREI_documentation_audit.md`
4. `docs/06-go-to-market/brand-architecture.md`
5. `docs/02-data-engine/data-trust-rules.md`
6. `docs/03-product/mvp-scope.md`
7. `docs/05-quality-control/launch-risks.md`
8. `docs/06-go-to-market/launch-plan.md`

If working on strategy or product direction next, also read:
- `docs/01-strategy/vision.md`
- `docs/01-strategy/cape-verde-beachhead.md`
- `docs/03-product/v2-roadmap.md`
- `docs/09-decisions/decision-log.md`

## Canonical working model

Treat the repo as having four active layers:

### 1. Data engine

Key areas:
- `core/`
- `markets/`
- `migrations/`
- `scripts/`

Purpose:
- source ingest
- normalization
- dedup-related behavior
- market-specific configuration via YAML and related config files

### 2. Consumer product surface

Key area:
- `kazaverde-web/`

Purpose:
- current KazaVerde frontend
- reads normalized public data through `arei-sdk`
- public brand: `KazaVerde`
- technical app identifier: `kazaverde-web/`

### 3. Shared query layer

Key area:
- `packages/arei-sdk/`

Purpose:
- typed access to `v1_feed_*` views
- consumer apps should use this rather than direct table access
- internal technical component, not a public-facing brand

### 4. Admin / support surfaces

Key area:
- `arei-admin/`

Purpose:
- internal or admin workflows
- not the canonical public consumer launch surface
- canonical product name: `AREI Admin`
- technical identifier: `arei-admin/`

## Current app and deploy truth

Canonical naming:
- parent platform: `AREI`
- internal ops product: `AREI Admin`
- Cape Verde consumer surface: `KazaVerde`
- default endorsement language: `Powered by AREI`

Technical and deployment identifiers:
- current repo identifier: `arei-platform`
- KazaVerde app path: `kazaverde-web/`
- KazaVerde production project: `kazaverde-web`
- admin app path and project: `arei-admin/`
- shared package: `packages/arei-sdk/`

Public brand and domain:
- public product name: `KazaVerde`
- production domain: `https://kazaverde.com`

Deploy truth:
- a Vercel preview URL is not production success
- success requires verification on `https://kazaverde.com`

## How to orient quickly in code

### Repo root

Useful commands and entry points:
- `package.json`
- `npm run dev` for admin
- `npm run dev:kaza` for KazaVerde
- `npm run pipeline:cv`
- `ROOT_MAP.md`

### Consumer frontend

Start with:
- `kazaverde-web/src/App.tsx`
- `kazaverde-web/src/pages/`
- `kazaverde-web/src/lib/arei.ts`
- `kazaverde-web/src/lib/transforms.ts`

Look here to verify current product truth:
- `Home.tsx`
- `Listings.tsx`
- `Detail.tsx`
- `Saved.tsx`
- `Market.tsx`
- `About.tsx`
- `Sell.tsx`
- `Rent.tsx`

### Data and feed truth

Start with:
- `docs/FEED_CONTRACT.md`
- `core/`
- `migrations/009_canonical_v1_feed_cv.sql`
- `packages/arei-sdk/src/client.ts`

### Market configuration

Start with:
- `markets/cv/`
- `markets/*/README.md`
- `markets/*/sources.yml`
- `markets/*/locations.yml`

## What the tool must not assume

Do not assume:
- the project is primarily a marketplace
- old chat decisions are canonical if they are not reflected in repo docs
- broader feature ambition automatically outranks governance
- current public copy is perfectly aligned with documented strategy
- an old markdown file is canonical just because it exists

## Current contradictions that must stay visible

When working in this repo, keep these contradictions explicit:

1. The preferred strategic framing is now reflected on core product surfaces, but some editorial or legacy copy may still carry older aggregator-style language.
2. Governance is stricter than some remaining editorial or legacy explanations of data sources and dedup logic.
3. Some market-intelligence surfaces are still approximate rather than historically grounded.
4. The admin surface is hardened, but it still relies on temporary shared-secret auth and should remain internal-only.

Do not silently normalize these contradictions away in reasoning. Either resolve them in code/docs or record them as decisions or risks.

## How changes should be documented

Every substantial project thread should end in at least one of these places:
- canonical doc update
- decision log entry
- roadmap update
- launch risk update

Do not let important truth live only in:
- chat memory
- PR descriptions
- temporary work notes

## How to handle legacy docs

The repo contains older docs from PoC, migration, and earlier framing phases.

Treat them as:
- source material
- historical context
- migration input for canonical docs

Do not treat them as automatic current truth when a newer canonical doc exists.

## Working rules for tools

1. Read canonical docs before proposing major product or strategy changes.
2. Check the code before making claims about current behavior.
3. Prefer explicit contradictions over false coherence.
4. If a change affects trust, update trust docs.
5. If a change affects launch readiness, update launch risks or launch plan.
6. If a change affects future direction, update roadmap or decision log.
7. Keep documentation tool agnostic and repo-centered.

## Minimum handoff summary

If a future tool needs the shortest possible orientation, it should retain this:

AREI is a data platform, not a generic SaaS.
KazaVerde is the current Cape Verde read-only index surface driven by AREI.
AREI Admin is the internal operational surface.
Governance, trust rules, MVP scope, and launch risks are canonical.
The repo still contains visible contradictions that should be resolved explicitly, not ignored.
