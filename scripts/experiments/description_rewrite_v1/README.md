# AI description rewrite — feasibility study + production backfill

Three-phase study (2026-04-26 → 2026-04-27) testing whether AI-rewritten English descriptions in AREI voice beat the existing `listings.description` (raw scraped text) and `listings.rendered_description_en` (legacy it→en machine translation, only present on Gabetti listings).

## Outcome

**Approved for production.** Claude Sonnet 4.6 with prompt v1.2 deployed via `scripts/backfill_ai_descriptions.ts` on 2026-04-27. 380/380 indexable listings with `LENGTH(description) > 500` populated in `listings.ai_descriptions.en`.

Frontend (`kazaverde-web`) does NOT yet consume the field — `Detail.tsx` still reads `description` / `description_html` and runs a runtime client-side translation. Wiring this is a separate task tracked outside this folder.

## Files in this folder

| File | Purpose |
|---|---|
| `run.ts` | v1 study (frozen). 30 listings, all from `cv_gabetticasecapoverde` — turned out to be unrepresentative (Gabetti is 7.7% of catalogue). |
| `run_v1_1.ts` | v1.1 study (frozen). 30 listings stratified across 7 sources by production share. Identified two regressions: meta-commentary on conflicts/missing data, and dropped "Cape Verde" geography. |
| `run_v1_2.ts` | v1.2 study (frozen). Adds two prompt fixes for the v1.1 regressions. Same sample composition. Supports `--ids=...` for targeted spot-check. |
| `rate.html` | Single-file manual rating UI. Drop a study CSV in, fill rating fields per listing, export a new CSV with ratings appended. Auto-saves to localStorage. |
| `verify_v1_1_pool.ts` | Pre-flight check used to size the v1.1 sample (per-source listing counts + property_type fill rate). |
| `output/*.csv` | Per-run study outputs (one row per listing, original + Claude + GPT side-by-side). |
| `output/*.meta.json` | Per-run metadata: prompt text, model versions, sample stats, listing IDs. |
| `output/backfill-*.summary.json` | Production backfill run summaries. |

## Production backfill

The backfill script is at the repository root: [`scripts/backfill_ai_descriptions.ts`](../../backfill_ai_descriptions.ts). Run with `npx ts-node --transpile-only scripts/backfill_ai_descriptions.ts`. Idempotent — already-populated listings skip unless `--force`. See script comment block for flag reference.

Schema for the backing column lives in [`migrations/025_add_ai_descriptions.sql`](../../../migrations/025_add_ai_descriptions.sql).

## Prompt version history

- **v1**: initial AREI voice prompt.
- **v1.1**: same prompt, new sample composition (multi-source, weighted).
- **v1.2**: adds (a) silent conflict-handling — no meta-commentary about the writing process when source/structured data conflict or info is missing, and (b) mandatory "Cape Verde" mention regardless of whether the source text names the country.
