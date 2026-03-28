# Repository Root Map

This file is the quick orientation map for the AREI repo.

## Active Apps

- `arei-admin/`
  - Internal admin and operations surface.
  - Deploy/config surface: `arei-admin/package.json`, `arei-admin/vercel.json`
- `kazaverde-web/`
  - Current public Cape Verde consumer app.
  - Deploy/config surface: `kazaverde-web/package.json`, `kazaverde-web/vercel.json`

## Pipeline And Infra

- `core/`
  - Ingestion, normalization, preflight, reporting, and write paths.
- `markets/`
  - Market-specific YAML source and location config.
- `migrations/`
  - Database/view migrations.
- `scripts/`
  - Operational scripts, backfills, checks, and utilities.
- `.github/`
  - CI/automation workflows.

## Shared Package

- `packages/arei-sdk/`
  - Shared query package used by consumer surfaces.

## Legacy Or Placeholder Areas

- `archive/web/`
  - Historical Lovable-export placeholder. Not an active app.
- `archive/supabase/`
  - Archived temp-only Supabase CLI metadata. Not infra source of truth.
- `scripts/experiments/`
  - Ad hoc experiments and probes kept out of root to reduce false signals.

## Root Config Files

- `package.json`
  - Root task entrypoints.
  - `npm run dev` starts `arei-admin`
  - `npm run dev:kaza` starts `kazaverde-web`
  - pipeline scripts run from here
- `tsconfig.json`
  - Root TypeScript config for `core/` and `markets/`
- `vercel.json`
  - Root Vercel config for the repo-root KazaVerde build path
- `STATUS.yml`
  - Small governance/status marker, not an app config

## Root Docs

- `docs/`
  - Main documentation tree
- `docs/04-platform/tooling-handoff.md`
  - Best detailed repo orientation doc
- `docs/06-go-to-market/launch-plan.md`
  - KazaVerde launch planning doc

## Practical Rule

If something is not under `arei-admin/`, `kazaverde-web/`, `core/`, `markets/`, `migrations/`, `packages/arei-sdk/`, `scripts/`, or `.github/`, do not assume it is active or authoritative without checking first.
