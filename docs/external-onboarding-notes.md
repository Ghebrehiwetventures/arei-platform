# External Onboarding Notes

Read this before touching anything important.

## Biggest mismatches between claimed architecture and actual execution

- The repo has a generic-looking ingest path in `core/ingestMarket.ts`, but the root scripts and scheduled workflow still run the CV-specific chain:
  - `core/preflightCv.ts`
  - `core/ingestCv.ts`
  - `core/reportCv.ts`
- The repo talks like it has a shared frontend query layer, but `packages/arei-sdk/src/client.ts` is hardcoded to `v1_feed_cv`.
- Governance pushes config-driven behavior, but the active CV ingest path still contains source-specific behavior in code.

## Where truth is reconstructed instead of consumed directly

- `arei-admin/data.ts` does not consume one canonical operational contract.
- It reconstructs admin truth from:
  1. live Supabase reads
  2. ingest report JSON
  3. mock fallback

## Where naming overstates reality

- `packages/arei-sdk/`
  - sounds generic
  - currently CV-scoped
- `core/ingestMarket.ts`
  - sounds like the main ingest future
  - not the default production path today

## What should be clarified in conversation before assigning real work

1. Is `core/ingestMarket.ts` the intended successor, or just a provisional side path?
2. Should admin be treated as a convenience UI or as an operational source of truth?
3. Is `packages/arei-sdk/` expected to stay CV-scoped for now, or is multi-market frontend work actually imminent?

## Short warning

Do not trust the cleanest-sounding abstraction first.
Trust the files that actually run first:

- `package.json`
- `.github/workflows/cv-autopilot.yml`
- `migrations/009_canonical_v1_feed_cv.sql`
- `core/ingestCv.ts`
- `arei-admin/data.ts`
