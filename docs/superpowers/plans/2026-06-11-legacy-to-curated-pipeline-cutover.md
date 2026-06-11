# Legacy → Curated pipeline cutover — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the curated `kv_curated.listings` ingest as a scheduled, config-driven, capped-concurrency GitHub Actions workflow, then retire the legacy CV ingest pipeline after a parallel-run soak.

**Architecture:** A discovery script reads `markets/*/sources.yml` and emits the `{market, source}` pairs with `lifecycleOverride: IN`; a new workflow consumes that as a capped matrix and runs `npm run ingest:curated` per source (live writes). A new demotion fraction-guard in `runMarketSource.ts` prevents partial-fetch breakage from stripping live listings. After a ~1 week soak with legacy still running, the legacy chain + workflow are deleted.

**Tech Stack:** TypeScript, ts-node (transpile-only), `node:test` (`.cjs` tests), GitHub Actions, Postgres (pooler via `createPostgresClient`), js-yaml.

**Spec:** `docs/superpowers/specs/2026-06-11-legacy-to-curated-pipeline-cutover-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `core/configLoader.ts` | Source config schema | Modify: add `removal_max_fraction?` field |
| `core/pipeline/runMarketSource.ts` | Curated ingest orchestrator | Modify: add `isDemotionWithinThreshold` + wire guard at apply site |
| `scripts/ingest_to_curated.ts` | CLI entry + test re-exports | Modify: re-export `isDemotionWithinThreshold` |
| `scripts/list_ingest_sources.ts` | Matrix discovery (markets→IN sources) | Create |
| `tests/demotionThreshold.test.cjs` | Unit tests for the guard fn | Create |
| `tests/listIngestSources.test.cjs` | Unit tests for discovery fn | Create |
| `.github/workflows/curated-ingest.yml` | Scheduled curated ingest + translation | Create |
| `arei-admin/<agency-data-view>` | Stale banner on Agency data tab | Modify |
| Legacy files (Task 9) | Removed after soak | Delete |

**Test runner:** `node --test tests/<file>.test.cjs` (tests register ts-node themselves). Typecheck: `npx tsc --noEmit`.

---

## Task 1: Add `removal_max_fraction` to the source config schema

**Files:**
- Modify: `core/configLoader.ts:193`

- [ ] **Step 1: Add the field next to `removal_detection`**

In `core/configLoader.ts`, inside `interface SourceConfig`, immediately after the `removal_detection?: boolean;` block (line ~193), add:

```typescript
  /** Safety cap for unattended demotion. If the fraction of a source's
   *  published rows that would be demoted to 'removed' in a single run exceeds
   *  this value, demotion is skipped for that source and logged for human
   *  review. Defaults to 0.5 when unset. Set per-source for noisy catalogues. */
  removal_max_fraction?: number;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add core/configLoader.ts
git commit -m "feat(config): add removal_max_fraction source guard field"
```

---

## Task 2: Add the demotion threshold guard function (TDD)

A pure function decides whether a source's demotion batch is within the safe fraction. Pure + exported so it is unit-testable without a DB.

**Files:**
- Modify: `core/pipeline/runMarketSource.ts` (add exported function near `shouldRunRemovalDetection`, ~line 585)
- Modify: `scripts/ingest_to_curated.ts` (re-export for tests)
- Test: `tests/demotionThreshold.test.cjs`

- [ ] **Step 1: Write the failing test**

Create `tests/demotionThreshold.test.cjs`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { isDemotionWithinThreshold } = require("../scripts/ingest_to_curated");

test("allows demotion when removed fraction is at or below the cap", () => {
  // 2 removed of 10 published total = 0.2 <= 0.5
  assert.equal(isDemotionWithinThreshold(2, 8, 0.5), true);
});

test("blocks demotion when removed fraction exceeds the cap", () => {
  // 6 removed of 10 published total = 0.6 > 0.5
  assert.equal(isDemotionWithinThreshold(6, 4, 0.5), false);
});

test("allows demotion exactly at the cap", () => {
  // 5 removed of 10 = 0.5 == 0.5
  assert.equal(isDemotionWithinThreshold(5, 5, 0.5), true);
});

test("defaults the cap to 0.5 when maxFraction is undefined", () => {
  assert.equal(isDemotionWithinThreshold(6, 4, undefined), false);
  assert.equal(isDemotionWithinThreshold(2, 8, undefined), true);
});

test("never blocks when nothing would be removed", () => {
  assert.equal(isDemotionWithinThreshold(0, 0, 0.5), true);
  assert.equal(isDemotionWithinThreshold(0, 10, 0.5), true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/demotionThreshold.test.cjs`
Expected: FAIL — `isDemotionWithinThreshold is not a function`.

- [ ] **Step 3: Implement the function**

In `core/pipeline/runMarketSource.ts`, immediately after the `shouldRunRemovalDetection` function (ends ~line 585), add:

```typescript
/** Default cap when a source does not set removal_max_fraction. */
export const DEFAULT_REMOVAL_MAX_FRACTION = 0.5;

/**
 * Returns true when demoting `removedCount` rows is safe given the source's
 * total published rows (`removedCount + retainedPublishedCount`). Blocks the
 * batch when the removed fraction exceeds `maxFraction` (default 0.5). A batch
 * that removes nothing is always allowed.
 */
export function isDemotionWithinThreshold(
  removedCount: number,
  retainedPublishedCount: number,
  maxFraction: number | undefined
): boolean {
  if (removedCount <= 0) return true;
  const cap = maxFraction ?? DEFAULT_REMOVAL_MAX_FRACTION;
  const publishedTotal = removedCount + retainedPublishedCount;
  if (publishedTotal <= 0) return true;
  return removedCount / publishedTotal <= cap;
}
```

- [ ] **Step 4: Re-export from the CLI entry for tests**

In `scripts/ingest_to_curated.ts`, add `isDemotionWithinThreshold` and `DEFAULT_REMOVAL_MAX_FRACTION` to the existing `export { ... } from "../core/pipeline/runMarketSource";` block:

```typescript
export {
  buildKvCuratedUpsertQuery,
  buildFindRemovedPublishedRowsQuery,
  buildDemoteRemovedPublishedRowsQuery,
  reconcileListingIdsBySourceUrl,
  resolveSourceCurrency,
  shouldRunRemovalDetection,
  isDemotionWithinThreshold,
  DEFAULT_REMOVAL_MAX_FRACTION,
} from "../core/pipeline/runMarketSource";
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/demotionThreshold.test.cjs`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add core/pipeline/runMarketSource.ts scripts/ingest_to_curated.ts tests/demotionThreshold.test.cjs
git commit -m "feat(pipeline): add demotion fraction-threshold guard"
```

---

## Task 3: Wire the guard into the demotion apply site

The apply site is `runMarketSource.ts:1058-1061`. The denominator (total published rows for the source) is `publishedIds.size + removedPublishedRows.length`: published rows still present in the fetch, plus published rows now absent.

**Files:**
- Modify: `core/pipeline/runMarketSource.ts:1058-1061`

- [ ] **Step 1: Replace the demotion apply block**

Replace the current block (lines ~1058-1061):

```typescript
  if (removedPublishedRows.length > 0) {
    const demoted = await demoteRemovedPublishedRows(sourceId, activeIds);
    console.log(`[Removed-gate] Demoted ${demoted.length} published listings to publish_status='removed'.`);
  }
```

with:

```typescript
  if (removedPublishedRows.length > 0) {
    const retainedPublished = publishedIds.size;
    const withinThreshold = isDemotionWithinThreshold(
      removedPublishedRows.length,
      retainedPublished,
      sourceConfig.removal_max_fraction
    );
    if (!withinThreshold) {
      const total = removedPublishedRows.length + retainedPublished;
      const pct = ((removedPublishedRows.length / total) * 100).toFixed(0);
      const cap = sourceConfig.removal_max_fraction ?? DEFAULT_REMOVAL_MAX_FRACTION;
      console.log(
        `\n[Removed-gate][GUARD] SKIPPING demotion for ${sourceId}: ` +
        `${removedPublishedRows.length}/${total} published rows (${pct}%) would be removed, ` +
        `exceeding removal_max_fraction=${cap}. Leaving rows published. Review manually:`
      );
      for (const row of removedPublishedRows) {
        console.log(`  ! ${row.id} ${row.source_url_primary ?? ""}`);
      }
    } else {
      const demoted = await demoteRemovedPublishedRows(sourceId, activeIds);
      console.log(`[Removed-gate] Demoted ${demoted.length} published listings to publish_status='removed'.`);
    }
  }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (`isDemotionWithinThreshold`, `DEFAULT_REMOVAL_MAX_FRACTION`, and `sourceConfig` are all already in scope in this function.)

- [ ] **Step 3: Run the existing curated test suite to confirm no regression**

Run: `node --test tests/ingestToCurated.test.cjs tests/runMarketSourceHealth.test.cjs tests/demotionThreshold.test.cjs`
Expected: PASS (all).

- [ ] **Step 4: Dry-run smoke against one real source**

Run (requires `.env` with `DATABASE_URL`):

```bash
MARKET_ID=cv SOURCE_ID=cv_nhakaza DRY_RUN=1 npm run ingest:curated
```

Expected: completes; `[Removed-gate]` line prints; no rows written (`[DRY_RUN] No rows written.`). The guard branch only triggers if removal candidates exceed the cap — fine if it does not trigger here.

- [ ] **Step 5: Commit**

```bash
git add core/pipeline/runMarketSource.ts
git commit -m "feat(pipeline): apply demotion guard at removed-gate apply site"
```

---

## Task 4: Source discovery script (TDD)

Emits the matrix payload from `markets/*/sources.yml`. A pure function does the filtering; the CLI wrapper prints JSON for GitHub Actions.

**Files:**
- Create: `scripts/list_ingest_sources.ts`
- Test: `tests/listIngestSources.test.cjs`

- [ ] **Step 1: Write the failing test**

Create `tests/listIngestSources.test.cjs`:

```javascript
const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { selectInSources, discoverIngestSources } = require("../scripts/list_ingest_sources");

test("selectInSources keeps only lifecycleOverride === 'IN'", () => {
  const sources = [
    { id: "a_in", lifecycleOverride: "IN" },
    { id: "b_drop", lifecycleOverride: "DROP" },
    { id: "c_observe", lifecycleOverride: "OBSERVE" },
    { id: "d_unset" },
    { id: "e_in2", lifecycleOverride: "IN", removal_max_fraction: 0.3 },
  ];
  const result = selectInSources("cv", sources);
  assert.deepEqual(result, [
    { market: "cv", source: "a_in" },
    { market: "cv", source: "e_in2" },
  ]);
});

test("discoverIngestSources reads real cv config and includes known IN sources", () => {
  const all = discoverIngestSources(["cv"]);
  const ids = all.map((e) => e.source);
  assert.ok(ids.includes("cv_nhakaza"), "expected cv_nhakaza in IN set");
  assert.ok(ids.includes("cv_remax"), "expected cv_remax in IN set");
  assert.ok(!ids.includes("cv_rightmove"), "cv_rightmove is DROP, must be excluded");
  for (const entry of all) {
    assert.equal(entry.market, "cv");
    assert.equal(typeof entry.source, "string");
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/listIngestSources.test.cjs`
Expected: FAIL — cannot find module `../scripts/list_ingest_sources`.

- [ ] **Step 3: Implement the script**

Create `scripts/list_ingest_sources.ts`:

```typescript
// scripts/list_ingest_sources.ts
//
// Emits the GitHub Actions matrix of {market, source} pairs to ingest:
// every source with lifecycleOverride: IN across the given markets (or all
// markets under markets/ when none are passed). Pure selection logic is
// exported for tests; the CLI prints JSON for `fromJSON()` in the workflow.

import * as fs from "fs";
import * as path from "path";
import { loadSourcesConfig, SourceConfig } from "../core/configLoader";

export interface IngestMatrixEntry {
  market: string;
  source: string;
}

/** Filter one market's sources down to the IN set as matrix entries. */
export function selectInSources(
  marketId: string,
  sources: Pick<SourceConfig, "id" | "lifecycleOverride">[]
): IngestMatrixEntry[] {
  return sources
    .filter((s) => s.lifecycleOverride === "IN")
    .map((s) => ({ market: marketId, source: s.id }));
}

/** Every market directory under markets/ that has a sources.yml. */
export function listMarketIds(): string[] {
  const marketsDir = path.resolve(__dirname, "../markets");
  return fs
    .readdirSync(marketsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(marketsDir, name, "sources.yml")))
    .sort();
}

/** Discover IN sources across the given markets (default: all markets). */
export function discoverIngestSources(marketIds?: string[]): IngestMatrixEntry[] {
  const markets = marketIds && marketIds.length > 0 ? marketIds : listMarketIds();
  const out: IngestMatrixEntry[] = [];
  for (const marketId of markets) {
    const result = loadSourcesConfig(marketId);
    if (!result.success || !result.data) {
      console.error(`[discover] skipping ${marketId}: ${result.error ?? "no data"}`);
      continue;
    }
    out.push(...selectInSources(marketId, result.data.sources));
  }
  return out;
}

if (require.main === module) {
  // Optional CLI arg: comma-separated market ids. Default: all markets.
  const arg = process.argv[2];
  const marketIds = arg ? arg.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const entries = discoverIngestSources(marketIds);
  // GitHub Actions matrix shape: { include: [ {market, source}, ... ] }
  process.stdout.write(JSON.stringify({ include: entries }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/listIngestSources.test.cjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify the CLI emits valid matrix JSON**

Run: `npx ts-node --transpile-only scripts/list_ingest_sources.ts cv`
Expected: single-line JSON like `{"include":[{"market":"cv","source":"cv_terracaboverde"},...]}` containing the 10 IN cv sources and none of the DROP ones.

- [ ] **Step 6: Commit**

```bash
git add scripts/list_ingest_sources.ts tests/listIngestSources.test.cjs
git commit -m "feat(pipeline): config-driven ingest source discovery for CI matrix"
```

---

## Task 5: New scheduled workflow `curated-ingest.yml`

Three jobs: `discover` (emits matrix), `ingest` (capped matrix, live per-source writes), `translate` (relocated translation backfill, runs once after ingest).

**Files:**
- Create: `.github/workflows/curated-ingest.yml`

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/curated-ingest.yml`:

```yaml
name: Curated Ingest

on:
  schedule:
    - cron: "0 */12 * * *" # every 12h; new inventory needs manual promotion, so no 6h urgency
  workflow_dispatch:
    inputs:
      markets:
        description: "Markets to ingest: comma-separated ids (e.g. cv or cv,zm), or 'all' for every market. Scheduled/blank = cv."
        required: false
        default: "cv"

concurrency:
  group: curated-ingest
  cancel-in-progress: false

jobs:
  discover:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.gen.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - id: gen
        env:
          MARKETS_INPUT: ${{ github.event.inputs.markets }}
        run: |
          # Initial cutover scope is CV only — the other markets' IN sources are
          # not yet validated against the curated path. Scheduled runs pass no
          # input, so default to cv. 'all' is the sentinel for every market
          # (empty arg to the generic discovery script). Broaden this default as
          # each market is validated; the discovery script itself stays generic.
          MARKETS="${MARKETS_INPUT:-cv}"
          if [ "$MARKETS" = "all" ]; then MARKETS=""; fi
          MATRIX=$(npx ts-node --transpile-only scripts/list_ingest_sources.ts "$MARKETS")
          echo "matrix=$MATRIX" >> "$GITHUB_OUTPUT"
          echo "$MATRIX"

  ingest:
    needs: discover
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 3
      matrix: ${{ fromJSON(needs.discover.outputs.matrix) }}
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Random jitter
        run: sleep $((RANDOM % 120))
      - name: Curated ingest (${{ matrix.market }}/${{ matrix.source }})
        env:
          MARKET_ID: ${{ matrix.market }}
          SOURCE_ID: ${{ matrix.source }}
        run: npm run ingest:curated

  translate:
    needs: ingest
    if: ${{ always() && needs.ingest.result != 'cancelled' }}
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Translate listing descriptions
        continue-on-error: true
        run: npx ts-node --transpile-only scripts/backfill_ai_descriptions_for_language.ts --all --limit=50
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `npx ts-node --transpile-only -e "const y=require('js-yaml');const fs=require('fs');y.load(fs.readFileSync('.github/workflows/curated-ingest.yml','utf8'));console.log('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Confirm required secrets exist in the repo**

Run: `gh secret list 2>/dev/null || echo "check secrets manually in repo settings"`
Expected: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` present. (`cv-autopilot.yml` already uses the two API keys; `DATABASE_URL` is the pooler URL the curated path needs — add it if absent.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/curated-ingest.yml
git commit -m "feat(ci): scheduled config-driven curated ingest workflow"
```

- [ ] **Step 5: First manual run (soak begins)**

After merge to the working branch's deploy target, trigger once manually and watch:

```bash
gh workflow run "Curated Ingest" -f markets=cv
gh run watch
```

Expected: `discover` emits 10 cv entries; `ingest` runs them ≤3 at a time; per-source logs show `[Removed-gate]` behavior; `translate` runs once. Legacy `cv-autopilot.yml` stays enabled in parallel during the soak.

---

## Task 6: Public-reader audit for `public.listings`

Confirm no public-facing consumer reads the soon-frozen legacy table. Investigation task — record findings in the spec.

**Files:**
- Modify: `docs/superpowers/specs/2026-06-11-legacy-to-curated-pipeline-cutover-design.md` (append findings)

- [ ] **Step 1: Grep for live readers**

Run:

```bash
grep -rn 'public\.listings\|from("listings")\|from(.listings.)\|\bv1_feed' \
  arei-admin kazaverde-web packages supabase core 2>/dev/null | grep -v node_modules
```

- [ ] **Step 2: Classify each hit**

For each match, record: file, whether it is **public-facing** (kazaverde-web, edge/cron, public SDK) or **internal** (arei-admin). Append a "Public-reader audit (2026-06-11)" section to the spec listing each reader and its classification.

- [ ] **Step 3: Decision gate**

- If **only internal** readers (expected: `arei-admin` agencyDataConsole): proceed; Task 7 adds the stale banner.
- If a **public-facing** reader is found: STOP. This exceeds "accept stale, flag loudly" scope — surface to the owner before any deletion. Note it in the spec and do not proceed to Task 9.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-06-11-legacy-to-curated-pipeline-cutover-design.md
git commit -m "docs(spec): record public.listings reader audit findings"
```

---

## Task 7: Stale banner on the Agency data tab

Flag that `public.listings`-derived numbers are frozen as of the cutover date.

**Files:**
- Modify: the Agency data view component (locate in Step 1)

- [ ] **Step 1: Locate the view's render root**

Run:

```bash
grep -rn "AgencyDataConsoleView\|Agency data\|getAgencyListingQuality" arei-admin | grep -v node_modules
```

Identify the component that renders the Agency data tab (per the spec, `AgencyDataConsoleView`, wired in `arei-admin/app.tsx`). Open it and find the top of its returned JSX.

- [ ] **Step 2: Add a banner constant + render it**

At the top of the view component's returned JSX (immediately inside the outermost wrapper element), insert a banner. Use the existing styling idiom of the file; if the file uses inline styles, use:

```tsx
<div
  style={{
    background: "#F2F0EC",
    border: "1px solid #C44A3A",
    color: "#0A0A0A",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  }}
>
  ⚠ Source data frozen as of 2026-06-11. The legacy <code>public.listings</code> feed
  is no longer updated; these quality numbers are historical. Live inventory lives in
  <code>kv_curated.listings</code>.
</div>
```

(If the file uses a CSS/className system instead of inline styles, match that idiom and use the brand tokens: bone `#F2F0EC`, coral `#C44A3A`, ink `#0A0A0A`.)

- [ ] **Step 3: Typecheck the admin app**

Run: `npm run --prefix arei-admin build 2>/dev/null || npx tsc --noEmit -p arei-admin`
Expected: PASS (no new type errors). If neither command exists, run the admin dev server (`npm run dev`) and confirm the tab renders the banner.

- [ ] **Step 4: Commit**

```bash
git add arei-admin
git commit -m "feat(admin): stale-data banner on Agency data tab pre-cutover"
```

---

## Task 8: Soak verification (gate before deletion)

No code. Run during the ~1 week parallel-run window. Do NOT start Task 9 until every check passes for several consecutive scheduled runs.

- [ ] **Step 1: Per-source freshness advancing**

```bash
psql "$DATABASE_URL" -c "select source_id_primary, max(last_verified_at) from kv_curated.listings group by 1 order by 1;"
```
Expected: `max(last_verified_at)` within the last cadence window for every IN source.

- [ ] **Step 2: Live feed counts stable**

```bash
psql "$DATABASE_URL" -c "select count(*) from public.v1_feed_cv;"
psql "$DATABASE_URL" -c "select source_id, count(*) from public.v1_feed_cv group by 1 order by 1;"
```
Expected: no unexplained drops vs. the pre-soak baseline. Investigate any decrease against the source pages.

- [ ] **Step 3: No wrongful mass demotions**

Review each scheduled run's per-source logs for `[Removed-gate][GUARD] SKIPPING` (guard tripped — investigate that source) and for large `Demoted N` counts.

- [ ] **Step 4: All sources green**

Confirm the `ingest` matrix shows per-source success across consecutive runs. Triage any persistently failing source before deletion.

- [ ] **Step 5: Record sign-off**

Append a "Soak sign-off (date)" note to the spec confirming the window passed, then proceed to Task 9.

---

## Task 9: Delete the legacy pipeline (post-soak only)

Only after Task 8 sign-off. This is the irreversible step.

**Files:**
- Delete: `core/ingestCv.ts`, `core/ingestCv.ts.backup`, `core/ingestCv.ts.save`, `core/preflightCv.ts`, `core/preflightCvIngest.ts`, `core/reportCv.ts`, `core/ingestCvGeneric.ts`
- Delete: `.github/workflows/cv-autopilot.yml`
- Modify: `package.json` (remove `pipeline:cv`, `ingest:cv`, `report:cv`)

- [ ] **Step 1: Confirm no live importers remain**

Run:

```bash
grep -rn "ingestCv\|preflightCv\|preflightCvIngest\|reportCv\|ingestCvGeneric" \
  --include=*.ts --include=*.tsx --include=*.cjs --include=*.mjs --include=*.json --include=*.yml \
  . 2>/dev/null | grep -v node_modules | grep -v "docs/superpowers"
```
Expected: only matches inside the files being deleted, the npm scripts being removed, and historical docs. If any other live file imports them, STOP and resolve first.

- [ ] **Step 2: Delete the legacy files**

```bash
git rm core/ingestCv.ts core/ingestCv.ts.backup core/ingestCv.ts.save \
  core/preflightCv.ts core/preflightCvIngest.ts core/reportCv.ts core/ingestCvGeneric.ts \
  .github/workflows/cv-autopilot.yml
```

- [ ] **Step 3: Remove the legacy npm scripts**

In `package.json`, delete the `pipeline:cv`, `ingest:cv`, and `report:cv` entries. Leave the generic `pipeline`/`ingest`/`report` and `ingest:curated` scripts.

- [ ] **Step 4: Typecheck + full test suite**

Run:

```bash
npx tsc --noEmit
node --test tests/*.test.cjs
```
Expected: PASS. (If a test imported the deleted modules, it was legacy-only — remove it in the same commit and note it.)

- [ ] **Step 5: Confirm the scheduled curated workflow is the only ingest cron**

Run: `ls .github/workflows/`
Expected: `curated-ingest.yml` present; `cv-autopilot.yml` gone. Other workflows (market-news, pulse-digest, source-health) untouched.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(pipeline): delete legacy CV ingest chain + autopilot after curated cutover"
```

---

## Self-review notes

- **Spec coverage:** §1 discovery → Task 4; §2 workflow + cadence + translation relocation → Task 5; §3 demotion guard → Tasks 1–3; §4 audit + banner → Tasks 6–7; §5 deletion → Task 9; §6 soak/rollback → Task 8 (+ kill-switch is `gh workflow disable "Curated Ingest"`, no code).
- **Type consistency:** `isDemotionWithinThreshold(removedCount, retainedPublishedCount, maxFraction)` defined in Task 2, called identically in Task 3; `discoverIngestSources` / `selectInSources` consistent between Task 4 impl and tests; matrix shape `{include:[{market,source}]}` matches `fromJSON` consumption in Task 5.
- **Manual kill-switch (rollback):** `gh workflow disable "Curated Ingest"` halts unattended runs instantly; legacy stays available until Task 9.
```
