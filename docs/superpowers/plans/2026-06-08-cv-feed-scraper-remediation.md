# CV Feed Scraper Remediation Implementation Plan

> **Historical execution record (completed).** Implemented in commits
> `27fd06a`..`c014c4c`. Its REMAX `TotalArea` fix originally shipped as a
> CV-specific module `core/pipeline/cvSourceCorrections.ts`; that was later
> refactored to be **config-driven and market-agnostic** (commit `1f89394`) — the
> logic now lives in `core/pipeline/sourceCorrections.ts`, driven by a
> `corrections:` block in `markets/cv/sources.yml`. Read the file/path references
> below as the state at execution time, not the current architecture; the live
> method is `docs/02-data-engine/source-investigation-loop.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the audited CV scraper issues for images, area semantics, Homes Casa Verde city recovery, and Ocean Property 24 truncated titles, then verify corrected source outputs without writing production data.

**Architecture:** Strengthen the existing generic detail extractor and source configuration first, then add one small CV source-correction module for REMAX's ambiguous `TotalArea`. Keep curated row construction schema-compatible by carrying explicit `land_area_sqm` through the working listing. Verification ends with focused tests and `DRY_RUN=1 REPORT_JSON=1` source runs; production ingest remains founder-gated.

**Tech Stack:** TypeScript, Node test runner, Cheerio, config-driven `markets/cv/sources.yml`, direct Postgres status reads through the existing dry-run ingest path.

**Spec:** `docs/superpowers/specs/2026-06-08-cv-feed-scraper-remediation-design.md`

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `core/detail/plugins/genericDetail.ts` | Correct comma-thousands area parsing and retain authoritative image candidates. |
| `core/pipeline/enrich.ts` | Conservative detail-title upgrade for explicitly truncated list titles. |
| `core/pipeline/cvSourceCorrections.ts` | CV-only source corrections, initially REMAX plot-area semantics. |
| `core/pipeline/runMarketSource.ts` | Apply title/source corrections and carry explicit land area into curated rows. |
| `core/pipeline/propertyType.ts` | Recognize explicit development-opportunity land wording. |
| `markets/cv/sources.yml` | Narrow image selectors; add Homes Casa Verde location and Simply Cape Verde property-type extraction. |
| `tests/genericDetail.test.cjs` | Area, image selector, location, and property-type regression coverage. |
| `tests/pipelineEnrich.test.cjs` | Truncated-title upgrade behavior. |
| `tests/cvSourceCorrections.test.cjs` | REMAX plot-area correction behavior. |
| `tests/propertyType.test.cjs` | Development-opportunity land classification. |
| `reports/curated/*.json` | Gitignored dry-run source verification outputs. |

## Guardrails

- No cross-source dedupe changes.
- No source-authored title rewriting.
- No direct SQL `UPDATE`, `INSERT`, or `DELETE`.
- No `publish_status` changes.
- No non-dry-run ingest in this plan.
- Stop after verified dry-run reports and present the evidence for founder approval.

### Task 1: Correct comma-thousands area parsing

**Files:**
- Modify: `core/detail/plugins/genericDetail.ts`
- Test: `tests/genericDetail.test.cjs`

- [ ] **Step 1: Add the failing area regression test**

Append:

```js
test("parses comma-thousands square-metre values as thousands, not decimals", () => {
  const plugin = createGenericDetailPlugin("cv_simplycapeverde", {
    selectors: {
      description: ".property-description",
    },
    spec_patterns: {
      area: [
        "(\\d[\\d,]*(?:\\.\\d+)?)\\s*(?:m[²2]|sqm)",
      ],
    },
  });

  const result = plugin.extract(`
    <div class="property-description">
      Set on 20,000 m² (2 hectares) of land near Mindelo.
    </div>
  `, "https://simplycapeverde.com/property/development-opportunity");

  assert.equal(result.areaSqm, 20000);
});
```

- [ ] **Step 2: Run the regression test and confirm failure**

Run:

```bash
node --test tests/genericDetail.test.cjs --test-name-pattern="comma-thousands"
```

Expected: FAIL because the current parser returns `20`.

- [ ] **Step 3: Implement locale-aware numeric normalization**

In `parseAreaTextSqm`, replace the comma-only branch with:

```ts
  if (numeric.includes(",") && numeric.includes(".")) {
    numeric = numeric.lastIndexOf(",") > numeric.lastIndexOf(".")
      ? numeric.replace(/\./g, "").replace(",", ".")
      : numeric.replace(/,/g, "");
  } else if (numeric.includes(",")) {
    const parts = numeric.split(",");
    numeric = parts.length > 1 && parts.slice(1).every((part) => part.length === 3)
      ? parts.join("")
      : numeric.replace(",", ".");
  }
```

Keep the existing square-foot conversion and minimum-area floor unchanged.

- [ ] **Step 4: Run focused and full detail tests**

Run:

```bash
node --test tests/genericDetail.test.cjs --test-name-pattern="comma-thousands"
node --test tests/genericDetail.test.cjs
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add core/detail/plugins/genericDetail.ts tests/genericDetail.test.cjs
git commit -m "fix(cv): parse comma-thousands property areas"
```

### Task 2: Tighten EstateCV and Homes Casa Verde image extraction

**Files:**
- Modify: `markets/cv/sources.yml`
- Test: `tests/genericDetail.test.cjs`

- [ ] **Step 1: Add failing config-driven image tests**

Add one test per source using `loadMarketConfig("cv")` and the real source detail config.

Homes Casa Verde fixture:

```js
test("Homes Casa Verde keeps the large current-listing gallery image and excludes similar listings", () => {
  const source = loadMarketConfig("cv").sources.find((s) => s.id === "cv_homescasaverde");
  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const html = `
    <div class="property-detail-gallery">
      <img
        src="https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/current-584x438.jpg"
        srcset="https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/current-584x438.jpg 584w,
                https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/current-2048x1536.jpg 2048w">
    </div>
    <div class="similar-listings">
      <img class="wp-post-image" src="https://www.homescasaverde.com/wp-content/uploads/2026/06/other-property.jpg">
    </div>`;
  const result = plugin.extract(html, "https://www.homescasaverde.com/property/current");
  assert.deepEqual(result.imageUrls, [
    "https://spcdn.shortpixel.ai/spio/ret_img,q_cdnize,to_auto,s_webp:avif/www.homescasaverde.com/wp-content/uploads/2026/06/current-2048x1536.jpg",
  ]);
});
```

EstateCV fixture:

```js
test("EstateCV ignores page chrome uploads and keeps property gallery images", () => {
  const source = loadMarketConfig("cv").sources.find((s) => s.id === "cv_estatecv");
  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <header><img src="https://estatecv.com/wp-content/uploads/2024/08/cropped-Estate-logo-small-1.png"></header>
    <div class="gallery">
      <img class="gallery__img" src="https://estatecv.com/wp-content/uploads/2024/09/unit-445x331.jpg"
        srcset="https://estatecv.com/wp-content/uploads/2024/09/unit-445x331.jpg 445w,
                https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg 1440w">
    </div>
  `, "https://estatecv.com/en/properties/apartments/unit");
  assert.deepEqual(result.imageUrls, [
    "https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg",
  ]);
});
```

- [ ] **Step 2: Run both tests and confirm failure**

Run:

```bash
node --test tests/genericDetail.test.cjs --test-name-pattern="Homes Casa Verde keeps|EstateCV ignores"
```

Expected: Homes Casa Verde includes the similar-listing image and/or the thumbnail; EstateCV's broad fallback admits page uploads.

- [ ] **Step 3: Narrow source selectors and disable unsafe fallbacks**

Update `cv_homescasaverde.detail`:

```yaml
      image_fallback: false
      selectors:
        images: ".property-detail-gallery img, .property-gallery .slick-slide img, .property-gallery .swiper-slide img"
```

Update `cv_estatecv.detail`:

```yaml
      image_fallback: false
      selectors:
        images: "img.gallery__img, .property__gallery .swiper-slide img, .property__gallery .gallery img"
```

Do not filter shared development renders solely because their URLs or hashes repeat.

- [ ] **Step 4: Ensure detail output uses size-aware dedupe before its 20-image limit**

Import `dedupeImageUrls` from `../../fetcher/parse/images` in `genericDetail.ts` and change the return field to:

```ts
imageUrls: dedupeImageUrls(imageUrls).slice(0, 20),
```

- [ ] **Step 5: Run image and full detail tests**

Run:

```bash
node --test tests/genericDetail.test.cjs --test-name-pattern="Homes Casa Verde keeps|EstateCV ignores|ShortPixel"
node --test tests/genericDetail.test.cjs
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add core/detail/plugins/genericDetail.ts markets/cv/sources.yml tests/genericDetail.test.cjs
git commit -m "fix(cv): scope property detail image extraction"
```

### Task 3: Recover Homes Casa Verde city and Simply Cape Verde land type

**Files:**
- Modify: `markets/cv/sources.yml`
- Modify: `core/pipeline/propertyType.ts`
- Test: `tests/genericDetail.test.cjs`
- Test: `tests/propertyType.test.cjs`

- [ ] **Step 1: Add failing location and property-type tests**

Add to `tests/genericDetail.test.cjs`:

```js
test("Homes Casa Verde extracts the detail address block for city recovery", () => {
  const source = loadMarketConfig("cv").sources.find((s) => s.id === "cv_homescasaverde");
  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <div class="property-address">
      <ul>
        <li>City: Santa Maria</li>
        <li>State/county: Sal</li>
        <li>Area: Vila Verde</li>
      </ul>
    </div>
  `, "https://www.homescasaverde.com/property/vila-verde");
  assert.match(result.location, /Santa Maria/);
  assert.match(result.location, /Sal/);
});
```

Add:

```js
test("Simply Cape Verde extracts Land from the Houzez property-type row", () => {
  const source = loadMarketConfig("cv").sources.find((s) => s.id === "cv_simplycapeverde");
  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);
  const result = plugin.extract(`
    <ul class="property-overview-data">
      <li><strong>20,000 m²</strong><span class="hz-meta-label">Land Area</span></li>
      <li><strong>Land</strong><span class="hz-meta-label">Property Type</span></li>
    </ul>
  `, "https://simplycapeverde.com/property/development-opportunity");
  assert.equal(result.areaSqm, 20000);
  assert.equal(result.propertyType, "land");
});
```

Add to `tests/propertyType.test.cjs`:

```js
test("extractPropertyType: explicit development opportunity resolves to land", () => {
  assert.equal(
    extractPropertyType("Fabulous Development Opportunity - Prime Cape Verde Property"),
    "land",
  );
});
```

- [ ] **Step 2: Run tests and confirm failures**

Run:

```bash
node --test tests/genericDetail.test.cjs --test-name-pattern="address block|Houzez property-type"
node --test tests/propertyType.test.cjs --test-name-pattern="development opportunity"
```

Expected: location/property type are absent and the title falls through to `property`.

- [ ] **Step 3: Add source config selectors**

For Homes Casa Verde:

```yaml
        location: ".property-address, .property-address-wrap, .block-content-wrap .property-address"
```

For Simply Cape Verde `spec_table.label_map`:

```yaml
          area: ["area size", "land area", "area", "size", "área", "superfície"]
          property_type: ["property type", "type"]
```

- [ ] **Step 4: Add the explicit land phrase**

Add `"development opportunity"` and `"development site"` to the `LAND` keyword list in `core/pipeline/propertyType.ts`.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
node --test tests/genericDetail.test.cjs
node --test tests/propertyType.test.cjs
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add markets/cv/sources.yml core/pipeline/propertyType.ts tests/genericDetail.test.cjs tests/propertyType.test.cjs
git commit -m "fix(cv): recover city and land metadata"
```

### Task 4: Upgrade only explicitly truncated detail titles

**Files:**
- Modify: `core/pipeline/enrich.ts`
- Modify: `core/pipeline/runMarketSource.ts`
- Create: `tests/pipelineEnrich.test.cjs`

- [ ] **Step 1: Add failing title-upgrade tests**

Create:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
require("ts-node/register/transpile-only");

const { applyExtractResultToListing } = require("../core/pipeline/enrich");

test("upgrades an explicitly truncated list title from detail extraction", () => {
  const listing = {
    id: "op24_test",
    sourceId: "cv_oceanproperty24",
    title: "Charming Apartment with Sea View in Leme Bed...",
    imageUrls: [],
  };
  applyExtractResultToListing(listing, {
    success: true,
    title: "Charming Apartment with Sea View in Leme Bedje - Santa Maria, Sal Island",
  }, { applyTruncatedTitleUpgrade: true });
  assert.equal(
    listing.title,
    "Charming Apartment with Sea View in Leme Bedje - Santa Maria, Sal Island",
  );
});

test("does not replace a complete title merely because the detail title is longer", () => {
  const listing = {
    id: "complete",
    sourceId: "cv_example",
    title: "Complete listing title",
    imageUrls: [],
  };
  applyExtractResultToListing(listing, {
    success: true,
    title: "Complete listing title | Example Agency",
  }, { applyTruncatedTitleUpgrade: true });
  assert.equal(listing.title, "Complete listing title");
});
```

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
node --test tests/pipelineEnrich.test.cjs
```

Expected: FAIL because `applyTruncatedTitleUpgrade` is not implemented.

- [ ] **Step 3: Add the conservative option**

Extend `ApplyOptions`:

```ts
applyTruncatedTitleUpgrade?: boolean;
```

Add:

```ts
  const currentTitle = listing.title?.trim() || "";
  const explicitlyTruncated = /(?:\.\.\.|…)$/.test(currentTitle);
  if (
    options.applyTruncatedTitleUpgrade &&
    explicitlyTruncated &&
    extract.title &&
    extract.title.length > currentTitle.length
  ) {
    listing.title = extract.title.replace(/\s+\|\s+[^|]+$/, "").trim();
    wasEnriched = true;
  }
```

Keep the existing broad `applyTitleUpgrade` behavior unchanged for `core/ingestMarket.ts`.

- [ ] **Step 4: Enable it in the curated source path**

Change `runMarketSource.ts`:

```ts
applyExtractResultToListing(listing, extractResult, {
  applyTruncatedTitleUpgrade: true,
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
node --test tests/pipelineEnrich.test.cjs
node --test tests/genericDetail.test.cjs
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add core/pipeline/enrich.ts core/pipeline/runMarketSource.ts tests/pipelineEnrich.test.cjs
git commit -m "fix(cv): upgrade truncated detail titles"
```

### Task 5: Preserve REMAX plot area as land area

**Files:**
- Create: `core/pipeline/cvSourceCorrections.ts`
- Modify: `core/pipeline/runMarketSource.ts`
- Create: `tests/cvSourceCorrections.test.cjs`

- [ ] **Step 1: Add failing source-correction tests**

Create:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
require("ts-node/register/transpile-only");

const { applyCvSourceCorrections } = require("../core/pipeline/cvSourceCorrections");

test("moves REMAX villa plot TotalArea to land_area_sqm", () => {
  const listing = {
    id: "rmx_730061001-17",
    sourceId: "cv_remax",
    title: "T2 Villa at Viveiro Golf Club",
    description: "This magnificent 1224.63 m² plot awaits your vision.",
    detailUrl: "https://www.remax.cv/en/listings/house/for-sale/santa-maria/730061001-17",
    area_sqm: 1224.63,
    imageUrls: [],
  };
  applyCvSourceCorrections(listing);
  assert.equal(listing.property_type, "villa");
  assert.equal(listing.area_sqm, null);
  assert.equal(listing.land_area_sqm, 1224.63);
});

test("keeps REMAX apartment TotalArea as property area", () => {
  const listing = {
    id: "rmx_apartment",
    sourceId: "cv_remax",
    title: "One-bedroom apartment with sea view",
    description: "A 70.95 square metre apartment.",
    detailUrl: "https://www.remax.cv/en/listings/condo/apartment/for-sale/santa-maria/example",
    area_sqm: 70.95,
    imageUrls: [],
  };
  applyCvSourceCorrections(listing);
  assert.equal(listing.area_sqm, 70.95);
  assert.equal(listing.land_area_sqm, undefined);
});
```

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
node --test tests/cvSourceCorrections.test.cjs
```

Expected: FAIL because the correction module does not exist.

- [ ] **Step 3: Implement the CV-only correction**

Create `core/pipeline/cvSourceCorrections.ts`:

```ts
import { extractPropertyType } from "./propertyType";

export interface CvCorrectableListing {
  sourceId: string;
  title?: string;
  description?: string;
  detailUrl?: string;
  property_type?: string;
  area_sqm?: number | null;
  land_area_sqm?: number | null;
}

export function applyCvSourceCorrections(listing: CvCorrectableListing): void {
  if (listing.sourceId !== "cv_remax" || listing.area_sqm == null) return;
  const propertyType =
    listing.property_type || extractPropertyType(listing.title, listing.detailUrl);
  const text = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();
  const plotArea = /\b(?:plot|land parcel|lot)\b/.test(text);
  if (!plotArea || !/^(?:villa|house)$/.test(propertyType)) return;

  listing.property_type = propertyType;
  listing.land_area_sqm = listing.area_sqm;
  listing.area_sqm = null;
}
```

- [ ] **Step 4: Carry explicit land area through row assembly**

Add `land_area_sqm?: number | null` to `WorkingListing`.

After detail enrichment and before row construction:

```ts
for (const listing of listings) applyCvSourceCorrections(listing);
```

Build rows with:

```ts
property_size_sqm: isLand ? null : (listing.area_sqm ?? null),
land_area_sqm: listing.land_area_sqm ?? (isLand ? (listing.area_sqm ?? null) : null),
```

- [ ] **Step 5: Run focused and adjacent tests**

Run:

```bash
node --test tests/cvSourceCorrections.test.cjs
node --test tests/genericFetcherJsonApi.test.cjs
node --test tests/propertyType.test.cjs
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add core/pipeline/cvSourceCorrections.ts core/pipeline/runMarketSource.ts tests/cvSourceCorrections.test.cjs
git commit -m "fix(cv): preserve REMAX plot area semantics"
```

### Task 6: Run the complete local verification suite

**Files:** None

- [ ] **Step 1: Run focused remediation tests together**

```bash
node --test \
  tests/genericDetail.test.cjs \
  tests/pipelineEnrich.test.cjs \
  tests/cvSourceCorrections.test.cjs \
  tests/propertyType.test.cjs \
  tests/genericFetcherJsonApi.test.cjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run TypeScript checking**

```bash
npx tsc --noEmit
```

Expected: exit code 0. If repository-wide pre-existing errors occur, record them and run the narrow test suite plus imports through `ts-node`; do not conceal failures.

- [ ] **Step 3: Confirm scope**

```bash
git diff --name-only 88c1ed1..HEAD
```

Expected: only the files listed by Tasks 1-5 plus this implementation plan.

### Task 7: Verify affected sources with read-only dry runs

**Files:**
- Output: `reports/curated/cv_cv_estatecv.json`
- Output: `reports/curated/cv_cv_homescasaverde.json`
- Output: `reports/curated/cv_cv_simplycapeverde.json`
- Output: `reports/curated/cv_cv_oceanproperty24.json`
- Output: `reports/curated/cv_cv_remax.json`

- [ ] **Step 1: Run each affected source in dry-run/report mode**

Run each command separately:

```bash
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_estatecv npx ts-node --transpile-only scripts/ingest_to_curated.ts
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_homescasaverde npx ts-node --transpile-only scripts/ingest_to_curated.ts
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_simplycapeverde npx ts-node --transpile-only scripts/ingest_to_curated.ts
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_oceanproperty24 npx ts-node --transpile-only scripts/ingest_to_curated.ts
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_remax npx ts-node --transpile-only scripts/ingest_to_curated.ts
```

Expected: each exits 0, reports `[DRY_RUN] No rows written`, and writes its gitignored JSON report.

- [ ] **Step 2: Verify representative corrected records**

Use a throwaway read-only checker or `node -e` against the report JSONs to assert:

```js
// Homes Casa Verde audit IDs
city === "Santa Maria";

// Simply Cape Verde audit ID
id === "scv_91a229b6b544";
property_type === "land";
property_size_sqm === null;
land_area_sqm === 20000;

// Ocean Property 24
!title.endsWith("...");

// REMAX audit IDs
property_size_sqm === null;
land_area_sqm > 1000;

// Image sources
no image URL selected as cover ends in "-445x331.jpg" when a larger same-base variant exists;
Homes Casa Verde rows do not share a newly scraped unrelated current-page cover pattern.
```

Print a concise per-source result summary and delete any throwaway checker.

- [ ] **Step 3: Re-run the audit heuristics against dry-run outputs**

Compare the dry-run outputs to the original audit IDs and record:

- affected IDs corrected,
- affected IDs missing from current source,
- residual source-authored issues,
- any source fetch failures.

Do not query or mutate curated rows for remediation.

- [ ] **Step 4: Stop for founder gate**

Report the dry-run evidence and explicitly state that production rows remain unchanged. Do not run a non-dry-run ingest until the founder approves it.

## Plan Self-Review

- **Spec coverage:** images → Task 2; area parsing/type → Tasks 1, 3, 5; city → Task 3; titles → Task 4; verification → Tasks 6-7.
- **Scope:** dedupe and source-authored text remain excluded.
- **Write safety:** Task 7 uses `DRY_RUN=1`; no production ingest is included.
- **Type consistency:** explicit `land_area_sqm` is introduced once in `CvCorrectableListing` and `WorkingListing`, then consumed by row assembly.
- **No placeholders:** all code paths, commands, and assertions are explicit.
