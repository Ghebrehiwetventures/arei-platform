# Eloy Onboarding

This repo is an AREI data-engine + product repo with one live public consumer surface today: KazaVerde for Cape Verde.

Do not come in assuming this is already a clean generic multi-market platform.

## What this repo is for

- `kazaverde-web/`: current public consumer app
- `arei-admin/`: internal admin and operations surface
- `core/`: ingest, preflight, normalization, enrichment, reporting, writes
- `packages/arei-sdk/`: current frontend query layer for KazaVerde
- `markets/`: market-specific YAML source and location config

## What each main area does

### `kazaverde-web`

Current public app for Cape Verde.
It reads listings through `packages/arei-sdk/`, not directly from raw tables.

Read first:
- `kazaverde-web/src/App.tsx`
- `kazaverde-web/src/lib/arei.ts`
- `kazaverde-web/src/pages/`

### `arei-admin`

Internal operations/admin UI.
Important: it does not sit on one clean operational contract.

Today it mixes:
- live Supabase reads
- ingest report artifact fallback
- mock fallback

Read first:
- `arei-admin/app.tsx`
- `arei-admin/data.ts`
- `arei-admin/api/auth.js`

### `core`

Pipeline and ingest code.
This is where the biggest architectural contradictions live.

Important current truth:
- `core/ingestCv.ts` is still the active root and scheduled ingest path
- `core/ingestMarket.ts` exists, but is not the default production path today

Read first:
- `core/ingestCv.ts`
- `core/preflightCv.ts`
- `core/reportCv.ts`
- `core/genericFetcher.ts`
- `core/configLoader.ts`

### `packages/arei-sdk`

Current frontend query layer for KazaVerde.

Important current truth:
- active: yes
- useful: yes
- generic: no
- `packages/arei-sdk/src/client.ts` is hardcoded to `v1_feed_cv`

### `markets`

YAML config for sources and locations by market.
Useful for understanding intended config-driven direction.
Do not assume config alone defines what production ingest actually does.

## What the real ingest flow is today

Trust this flow first:

1. `core/preflightCv.ts`
2. `core/ingestCv.ts`
3. `core/reportCv.ts`

Why:
- root scripts call this chain in `package.json`
- scheduled automation runs this chain in `.github/workflows/cv-autopilot.yml`

## Where frontend truth comes from

For KazaVerde today, trust this stack:

1. `migrations/009_canonical_v1_feed_cv.sql`
2. `packages/arei-sdk/src/client.ts`
3. `kazaverde-web/src/lib/arei.ts`

That is the real public consumer read contract.

## Where admin truth comes from

There is no single clean answer.

`arei-admin/data.ts` resolves data in this order:

1. live Supabase reads from `listings`
2. local ingest report JSON
3. mock data

Do not treat admin output as automatically canonical without checking which path it came from.

## What not to assume

- Do not assume `core/ingestMarket.ts` is the production ingest path.
- Do not assume `packages/arei-sdk/` is market-agnostic.
- Do not assume admin status values come from a canonical backend contract.
- Do not assume docs and implementation are fully aligned.
- Do not assume files in `core/` are current just because they are nearby.

## First files to read

1. `docs/current-system-truth.md`
2. `package.json`
3. `.github/workflows/cv-autopilot.yml`
4. `migrations/009_canonical_v1_feed_cv.sql`
5. `kazaverde-web/src/lib/arei.ts`
6. `packages/arei-sdk/src/client.ts`
7. `core/ingestCv.ts`
8. `arei-admin/data.ts`
9. `docs/GOVERNANCE.md`

## Parts of the repo that are easy to misunderstand

### `core/ingestMarket.ts`

Easy mistake:
- assume it is the production ingest path because it looks like the generic future

Reality:
- it is real work
- it is not the root or scheduled default path today

### `packages/arei-sdk/`

Easy mistake:
- assume the package name means a generic AREI-wide frontend contract already exists

Reality:
- current implementation is CV-specific

### `arei-admin/`

Easy mistake:
- treat admin as the system of record

Reality:
- it is useful
- it reconstructs truth from mixed sources

### backup/transitional files in `core/`

Easy mistake:
- read them as equally current

Reality:
- some are ambiguous lineage, not clear production truth

## Bottom line

If you only keep four things in your head:

1. the real ingest path today is still CV-specific
2. the real frontend contract today is `v1_feed_cv`
3. the admin is not a canonical source of truth
4. generic platform work exists, but it is not yet the repo’s single operational truth
