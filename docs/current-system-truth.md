# Current System Truth

This file says what is actually true today.

It is not a strategy doc.
It is not a target architecture doc.
It is the shortest honest map of what is real in this repo right now.

## What actually runs today

- Root admin dev starts `arei-admin/` from `package.json`.
- Root KazaVerde dev starts `kazaverde-web/` from `package.json`.
- Root CV pipeline runs:
  - `core/preflightCv.ts`
  - `core/ingestCv.ts`
  - `core/reportCv.ts`
- Scheduled automation runs the same CV chain in `.github/workflows/cv-autopilot.yml`.

Trust these files first:
- `package.json`
- `.github/workflows/cv-autopilot.yml`

## What is canonical today

### Frontend truth for KazaVerde

For the live KazaVerde consumer app, the canonical read path today is:

- `migrations/009_canonical_v1_feed_cv.sql`
- `packages/arei-sdk/src/client.ts`
- `kazaverde-web/src/lib/arei.ts`

Practical truth:
- `kazaverde-web/` reads through `packages/arei-sdk/`
- `packages/arei-sdk/src/client.ts` is hardcoded to `v1_feed_cv`
- this is canonical for the current public consumer app
- this is not yet a generic multi-market frontend contract

### Governance and stated constraints

The main documentation-level truth lives in:

- `docs/GOVERNANCE.md`
- `docs/04-platform/tooling-handoff.md`

Practical truth:
- these docs are the right place to understand stated rules
- implementation does not fully match them yet

## What exists but is not the main production path

### Generic ingest path

`core/ingestMarket.ts` is real code.
It is not the root or scheduled production ingest path today.

Treat it as:
- real: yes
- active development: likely yes
- canonical production path today: no

Check:
- `core/ingestMarket.ts`
- `package.json`
- `.github/workflows/cv-autopilot.yml`

### Generic fetch/config infrastructure

These are real and matter:
- `core/genericFetcher.ts`
- `core/configLoader.ts`
- `markets/`

Do not overread them.
They do not prove that production ingest is already generic.

## What is misleadingly named or positioned

### `packages/arei-sdk/`

This package is useful and active.
It is also misleading by name if read casually.

Why:
- it sounds like a generic shared AREI query layer
- today it is hardcoded to `v1_feed_cv`

### `arei-admin/`

This is an active internal app.
It is not a clean system of record.

Why:
- `arei-admin/data.ts` prefers live Supabase reads
- then falls back to report JSON
- then falls back to mock data

### `core/`

`core/` contains both active pipeline code and ambiguous lineage.

Treat these with caution:
- `core/ingestCv.ts.backup`
- `core/ingestCv.ts.save`
- `core/ingestCvGeneric.ts`

Do not assume they are current just because they live next to active files.

## What a new engineer should trust first

Read these first if you want to know what is real:

1. `package.json`
2. `.github/workflows/cv-autopilot.yml`
3. `migrations/009_canonical_v1_feed_cv.sql`
4. `kazaverde-web/src/lib/arei.ts`
5. `packages/arei-sdk/src/client.ts`
6. `core/ingestCv.ts`
7. `arei-admin/data.ts`

Why:
- they show what actually runs
- they show what the frontend actually reads
- they show where admin truth is being reconstructed

## What a new engineer should treat with caution

- `core/ingestMarket.ts`
  - real, but not the main production path today
- `packages/arei-sdk/`
  - active, but not generic in practice
- `arei-admin/data.ts`
  - active, but not a canonical source of truth
- backup and transitional ingest files in `core/`
  - present, but ambiguous

## Bottom line

Today’s repo truth is:

- the real ingest path is still the CV-specific chain
- the real frontend contract is still `v1_feed_cv`
- the admin is useful, but it reconstructs truth from mixed sources
- generic platform work exists, but it is not yet the repo’s single operational truth
