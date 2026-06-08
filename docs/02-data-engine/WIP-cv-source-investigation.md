# 🚧 WIP — CV Source Investigation Tracker (TEMPORARY — DELETE WHEN DONE)

> **This is a throwaway working doc.** It is NOT a reference. Do not link it from
> other docs. Delete the file once every source below is resolved and the fixes
> are folded into the engine/config + the spec
> (`docs/superpowers/specs/2026-06-04-smart-extraction-engine-design.md`).

## Purpose

Go through **every CV source one by one** and, for each field gap, decide the
**root cause**:

- 🔧 **SCRAPER** — the value IS on the listing page but our extractor missed it.
  Fixable in `core/detail/plugins/genericDetail.ts` (engine) or `sources.yml` (config).
- 🌐 **SOURCE** — the value is genuinely absent on the original listing. Not our
  bug; nothing to fix (it's a real data floor).
- ◑ **MIXED** — some of both.
- ❓ **TODO** — not yet investigated.

> Example to settle: *37 simplycapeverde listings missing area — scraper or source?*
> Open a few of the spot-check URLs below. If the page shows "m²" but our value is
> null → 🔧 SCRAPER. If the page never states an area → 🌐 SOURCE.

## Provenance

- Branch: `codex/source-ops-dev`
- Generated: 2026-06-04, **live curated path** in DRY_RUN (no DB writes, no AI):
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=<id> npx ts-node --transpile-only scripts/ingest_to_curated.ts`
- Full per-listing data (image URLs, area, beds/baths, price, location, source URL):
  `reports/curated/cv_cv_<source>.json` (gitignored).
- Counts below are over **all kept rows** (the report's `listings[]`); the
  curated stdout coverage only counted *new* rows, so numbers here are larger.

## How to investigate one source

```bash
# 1. Re-run a single source, regenerating its rich report
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_<source> \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts

# 2. Open the report and the spot-check URLs; compare page vs extracted value
#    reports/curated/cv_cv_<source>.json

# 3. To test extraction against a saved page (see source-troubleshooting.md §1):
#    save the detail page to /tmp/probe.html, run scripts/_diag.ts
```

Verdict recipe per field: **open the listing's `source_url`** → is the field
shown on the page? **Yes + we have null** = 🔧 SCRAPER. **No** = 🌐 SOURCE.

---

## Progress rollup

- [ ] cv_terracaboverde
- [x] cv_simplycapeverde
- [x] cv_ccoreinvestments
- [x] cv_homescasaverde
- [x] cv_capeverdeproperty24
- [x] cv_cabohouseproperty
- [x] cv_estatecv
- [ ] cv_oceanproperty24
- [ ] cv_nhakaza
- [ ] Cross-cutting image issues

Next operational steps:
1. Retry the completed `cv_ccoreinvestments` freshness ingest only when its
   hostname is reachable; its last two zero-row attempts made no writes.
2. Resolve [GitHub issue #361](https://github.com/Ghebrehiwetventures/arei-platform/issues/361)
   before any `cv_cabohouseproperty` live ingest. MalCare currently blocks the
   headless fetch with HTTP 403; require a fresh non-zero dry run afterward.
3. Await confirmation before the first post-fix live ingest for
   `cv_estatecv`; the investigation and direct database comparison are
   complete.
4. Investigate `cv_oceanproperty24` after the EstateCV live-ingest decision.

---

## cv_terracaboverde — n=35 (healthy control)

| field | missing | verdict | notes |
|---|---|---|---|
| price | 0/35 | ✅ | |
| bedrooms | 2/35 | ❓ | |
| bathrooms | 0/35 | ✅ | |
| area | 0/35 | ✅ | |

Spot-check (beds):
- https://www.terracaboverde.com/properties/seafront-penthouse-with-panoramic-oceanfront-terrace
- https://www.terracaboverde.com/properties/villa-with-private-pool-and-large-outdoor-patio

---

## cv_simplycapeverde — n=77 — DONE 2026-06-05

Status: ✅ **Resolved for current v1 ingest.** Engine fixes landed, source was
ingested to `kv_curated.listings`, and the 21 net-new rows are intentionally
held as `needs_review` until manually promoted in the KazaVerde review UI.

| field | missing | verdict | notes |
|---|---|---|---|
| price | 12/77 | ✅ ACCEPTED | Numeric `price = null` is valid when the source is sold/POA/no visible price. Public KazaVerde renders null as "Price on request"; review UI should not count this as a scraper gap. JSON-LD price fallback fixed the confirmed scraper miss. |
| bedrooms | 3/77 | ✅ ACCEPTED | Corrected JSON-LD all-row pass found 0/3 missing-bedroom rows with `numberOfBedrooms`. A few legacy pages express beds in title/description only; acceptable pending future AI field extraction. |
| bathrooms | 5/77 | ✅ ACCEPTED | Corrected JSON-LD all-row pass found 0/5 missing-bathroom rows with `numberOfBathroomsTotal`. Some legacy pages contain bathroom text in prose; acceptable pending future AI field extraction. |
| area | 37/77 | ✅ ACCEPTED | For missing-area rows, 0/37 had JSON-LD `floorSize`; missing area is a real source floor. The real scraper bug was SqFt being treated as sqm on area-present rows; fixed in engine. |

Engine fixes landed:
- ✅ Pinterest share-button URLs (`pinterest.com/pin/create/button`) rejected by generic detail image filter.
- ✅ SimplyCV badge/site images (`wp-content/uploads/2023/01/Group-18-Copy.png`) rejected by generic detail image filter.
- ✅ Real-estate JSON-LD fallback for title, images, bedrooms, bathrooms, area, and `offers.price`.
- ✅ JSON-LD `floorSize.unitText = SqFt` converted to sqm before curated output.
- ✅ Houzez/spec-table/prose `SqFt` area values converted to sqm before curated output.

Verification evidence:
- Unit tests added around JSON-LD fallback, bad image filtering, and SqFt conversion.
- `node --test tests/genericDetail.test.cjs tests/genericFetcherJsonApi.test.cjs tests/ingestToCurated.test.cjs` passed.
- Corrected all-row pass using full browser headers: JSON-LD present on 60/77 rows; JSON-LD `floorSize` parsed on 26/77 rows; 0/37 missing-area rows had JSON-LD `floorSize`; 26 area-present rows had JSON-LD SqFt values.
- Post-fix DRY_RUN report: `pinterest=0`, `Group-18-Copy=0`; Branco Sea sample `678 SqFt -> 63 sqm`; JSON-LD-only Tortuga price sample `68500`.
- Live/dry-run compare after fix: current dry run has 77 rows; live curated/feed had 57 published rows; 21 dry-run rows were not in curated DB; 1 old live row was no longer in source/dryrun and its source URL returned 404.
- Ingest run completed for `SOURCE_ID=cv_simplycapeverde`: 77 fetched/enriched, 56 already-published rows skipped by status gate, 21 upserted as `needs_review`.
- Post-ingest DB verification: `kv_curated.listings` has 57 `published` + 21 `needs_review` rows for `cv_simplycapeverde`; `public.v1_feed_cv` remains 57 rows for this source until review promotion.
- Published-row freshness rerun on 2026-06-06:
  `REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_simplycapeverde npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 77 rows, enriched 77/77, refreshed 61 current published rows with
  status and existing AI descriptions preserved, demoted 1 absent published row
  (`scv_8f62bb91a9ed`) to `removed`, and upserted 77 rows with 0 failures.
  Direct Postgres verification after the run: all 77 current source rows exist
  in curated as 61 `published` + 16 `needs_review`; 1 older row is `removed`;
  `public.v1_feed_cv` has 61 rows for this source. No promotions were made.

Operational notes worth carrying forward:
- Current curated ingest freshness rule: rows that still appear in the latest
  successful source fetch are upsert-refreshed even when already `published`.
  `publish_status`, `first_seen_at`, `first_published_at`, and existing
  `ai_descriptions` are preserved on conflict; source-derived fields
  (price/specs/images/description/source URL/last_verified_at) are refreshed.
  New rows still enter as `needs_review`.
- Published rows that disappear from a latest successful source fetch should be
  demoted to `removed`, not `needs_review`. Dry runs report these as removal
  candidates; zero-row/failed fetches must not demote anything.
- Null price does not mean "bad row" by itself. In this system, `price = null` maps to `price_status = 'price_on_request'` in the curated feed view and displays as "Price on request" on KazaVerde.
- The `/review` KazaVerde dev route is the current local review surface. It can filter source/status, select multiple `needs_review` rows, and publish selected rows through the local dev-only `POST /__kv-review/publish` endpoint. Promotion to `published` is live.
- Do not publish rows just to test the button. Use empty publish requests or query-only checks for endpoint smoke tests.
- For this source, remaining beds/baths misses that are only in title/prose are intentionally deferred to the planned AI title/description field extraction.
- Short `curl -A Mozilla/5.0` returns 406 on this site; use default curl or the full Simply headers from `core/detail/enrich.ts` for diagnostics.

Spot-check (area):
- https://simplycapeverde.com/property/tortuga-resort-2-bed-apartment-hotel-block-with-2-balconies
- https://simplycapeverde.com/property/melia-dunas-studio-apartment-sea-views-large-balcony
- https://simplycapeverde.com/property/2-bed-apartment-for-sale-in-sal-tortuga-beach-resort

---

## cv_ccoreinvestments — n=84 — DONE 2026-06-05

Status: ✅ **Resolved for current v1 ingest.** Fresh 2026-06-05 dry-run found
one additional scraper/config gap: CCore's Casafari/Proppy detail bar can expose
area behind either `i.proppy-icon-gross-area-24-custom + span` or
`i.proppy-icon-home-32 + span`. Both are now configured. Current remaining gaps
are source floors, land/project nulls, or acceptable title/description-only
semantics.

| field | missing | verdict | notes |
|---|---|---|---|
| price | 1/84 | ✅ ACCEPTED | `ccore_760370` has no visible numeric price and RealEstateListing JSON-LD `offers` has `priceCurrency` but no `price`; treat as source/POA, not a scraper gap. |
| bedrooms | 8/84 | ✅ ACCEPTED | 3 land rows correctly null residential fields after the `Lots` land-classification fix; 4 studio/store rows have no structured bedroom count (`Studio`/store semantics only); 1 project row exposes `Units: 3`, not a unit bedroom count. Acceptable pending future AI title/description extraction for title-only studio semantics. |
| bathrooms | 4/84 | ✅ ACCEPTED | 3 are land rows; 1 is a multi-unit development page exposing `Units: 3` rather than per-unit bathrooms. No scraper bug remains. |
| area | 4/84 | ✅ ACCEPTED | Fixed CCore detail-bar area extraction for both gross-area and home-icon variants; all-row area coverage improved from 79/84 to 80/84 in this pass. Remaining checked pages have no numeric area in the detail bar; their SVG/checkmark rows are amenities, not area. |

Engine/config fixes landed:
- ✅ Generic detail plugin supports `detail.selectors.area` and parses comma-decimal
  sqm values from structured selector text.
- ✅ `cv_ccoreinvestments` config now maps area to
  `.detailsBar__list i.proppy-icon-gross-area-24-custom + span` and
  `.detailsBar__list i.proppy-icon-home-32 + span`.
- ✅ Property-type heuristic classifies plural `lots` as `land`, so land rows do
  not retain bogus residential bedroom/bathroom values.

Verification evidence:
- First fresh dry run with network access: 84 fetched, 84 enriched, 0 skipped,
  71 already-published rows status-gated, 13 writable in dry-run only.
- Source-page probes:
  - `ccore_839806` detail bar showed `1 1 55,56 m2`; pre-fix report had
    `area=null`, post-fix report has `property_size_sqm=56`.
  - `ccore_838362` detail bar showed `2 2 166,58 m2`; post-fix report has
    `property_size_sqm=167`.
  - `ccore_831269` studio detail bar showed bathroom + `36,5 m2` but no bed
    icon; post-fix report has `bathrooms=1`, `property_size_sqm=37`,
    `bedrooms=null`.
  - `ccore_824599` detail bar showed `2 2 64,85 m2` behind
    `i.proppy-icon-home-32`; pre-fix report had `area=null`, post-fix report
    has `property_size_sqm=65`.
  - `ccore_760370` JSON-LD `offers` has no `price`; no visible numeric price was
    found on the page.
  - Remaining checked area-null rows (`ccore_839337`, `ccore_836640`,
    `ccore_829033`, `ccore_820099`) had no numeric detail-bar area. The
    `ccore_836640` and `ccore_820099` extra detail-bar row is an SVG +
    checkmark amenity row, not a size value.
- Tests:
  `node --test tests/genericDetail.test.cjs tests/propertyType.test.cjs` passed.
- Post-fix DRY_RUN report:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  produced 84 rows, 0 skipped, 71 status-gated published rows, 13 dry-run
  writable rows, and wrote `reports/curated/cv_cv_ccoreinvestments.json`.
- Post-fix coverage in the report:
  all rows: price 83/84, bedrooms 76/84, bathrooms 80/84, area 80/84,
  images >=1 84/84, images >=3 84/84.
  New dry-run writable rows: price 13/13, bedrooms 12/13, bathrooms 13/13,
  area 11/13, images >=1 13/13, images >=3 13/13.
- Direct Postgres compare (`DATABASE_URL`, not Supabase JS/REST):
  `kv_curated.listings` currently has 91 `cv_ccoreinvestments` rows
  (71 `published`, 1 `needs_review`, 19 `removed`); `public.v1_feed_cv` has 71
  rows for this source. The fresh dry run has 84 current source rows. The 13
  dry-run rows not in curated/feed are the dry-run writable rows. 20 older
  curated rows are no longer in the fresh source output; 19 are already
  `removed` and 1 is `needs_review`. No feed rows are missing from the fresh
  dry-run source set. No publish-status changes were made.
- Actual ingest run:
  `REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 86 rows, enriched 86/86, skipped 0, status-gated 71 published rows,
  generated AI descriptions for 15 rows, and upserted 15 rows as `needs_review`
  with 0 write failures. The two rows that appeared after the dry-run snapshot
  were `ccore_840239` and `ccore_840228`.
- Post-ingest report coverage:
  all rows: price 85/86, bedrooms 78/86, bathrooms 82/86, area 81/86,
  images >=1 86/86, images >=3 86/86.
  Writable rows: price 15/15, bedrooms 14/15, bathrooms 15/15, area 12/15,
  images >=1 15/15, images >=3 15/15, AI descriptions 15/15.
- Post-ingest DB verification:
  `kv_curated.listings` has 106 `cv_ccoreinvestments` rows
  (71 `published`, 16 `needs_review`, 19 `removed`); `public.v1_feed_cv` remains
  71 rows. All 86 latest report rows exist in `kv_curated`; 15 latest source
  rows are absent from `v1_feed_cv` because they remain `needs_review`. No
  publish-status promotions were made.
- Published-row freshness rerun attempted twice on 2026-06-06, but the exact
  configured source URL (`https://www.ccoreinvestments.com/en/list?page=1`)
  failed at the network/DNS layer and both ingests returned 0 rows with
  `fetch_failed_page_1`. The zero-row safety gate disabled removal detection and
  performed no writes. Direct Postgres verification remained unchanged:
  82 `published`, 5 `needs_review`, 19 `removed`; `public.v1_feed_cv` has 82
  rows. Retry when the source hostname is reachable.

Spot-check (area):
- https://www.ccoreinvestments.com/en/property-detail/flats-for-sale-t1-t2-t0-studios-beach-antonio-sousa-santa-maria-sal-island-cape-verde/839806
- https://www.ccoreinvestments.com/en/property-detail/apartments-for-sale-in-antonio-sousa-beach-santa-maria-cape-verde-sal-island-2-bedroom-apartment-for-sale-in-santa-maria-sal-island/839337

---

## cv_homescasaverde — n=62 — DONE 2026-06-05

> ⚠️ **REOPENED & RE-FIXED 2026-06-05 (area).** The "✅ ACCEPTED" area row below
> was wrong. After ingest, **40/58 area-bearing rows were corrupted to ~1/10.76
> of their true value** (e.g. `hcv_3298681ed1f3` Melia Tortuga penthouse showed
> `8` sqm; real area is `87.41 m²`). Root cause: Houzez emits the on-page
> **square-meter** figure in JSON-LD but mislabels the unit as `"SQFT"`
> (`floorSize: {value: 87.41, unitText: "SQFT"}`). `genericDetail.ts` let
> JSON-LD `floorSize` **unconditionally override** the correctly-parsed
> structured `87.41 m²` overview value, then applied a bogus ft²→m² conversion
> (`87.41 × 0.0929 ≈ 8`). This is the only field whose JSON-LD fallback
> overrode structured DOM data — beds/baths already gate behind `=== null`.
> **Fix:** JSON-LD `floorSize` is now a fallback only (applied iff `areaSqm`
> is still null), so the structured on-page m² value wins. Verified: new unit
> test `tests/genericDetail.test.cjs` ("keeps structured sqm area when JSON-LD
> floorSize mislabels the same value as SQFT"); real saved page + real
> `markets/cv/sources.yml` config now extracts `areaSqm = 87`; full suite
> `node --test tests/` = 49/49 pass. simplycapeverde's genuine SqFt JSON-LD
> path is unaffected (it has no structured area, so the fallback still fires →
> `678 SqFt → 63 sqm` test still passes). The corrective Homes Casa Verde
> re-ingest was completed and live values were verified through direct Postgres.

Status: ✅ **Resolved for current v1 ingest.** Fresh 2026-06-05 dry-run found
two scraper bugs and one extraction-precedence bug:

- ShortPixel CDN `srcset` values contain commas inside the URL path
  (`ret_img,q_cdnize,to_auto,...`). The generic detail plugin was splitting on
  commas manually, producing junk images such as `/property/q_cdnize` and
  `/property/to_auto` on every current Homes Casa Verde row.
- Homes Casa Verde Houzez overview values are rendered as previous sibling
  values followed by label list items, e.g. `151.75 m²` then `Area Size`. The
  generic `spec_table` resolver only looked inside/after the label, so it missed
  source-visible structured area values.
- Structured overview area could be overwritten later by description regex area
  matches. Example: the entire-building page shows `859 m² Area Size` in the
  overview, but prose also says `544m² corner plot`; structured area must win.

| field | missing | verdict | notes |
|---|---|---|---|
| price | 0/62 | ✅ ACCEPTED | Fresh dry run has numeric price coverage on all current source rows. |
| bedrooms | 4/62 | ✅ ACCEPTED | Remaining nulls are non-residential/complex cases: two land rows, one commercial office, and one entire-building investment page with no single residential bedroom count. |
| bathrooms | 3/62 | ✅ ACCEPTED | Remaining nulls are two land rows and the entire-building page, where floor-level prose/layout is not a single unit bathroom count. |
| area | 2/62 | ✅ FIXED / SOURCE FLOOR | Coverage is 60/62. The JSON-LD `SQFT` override was fixed and corrected values were written by the live re-ingest. Remaining nulls are source floors: one page shows `TBA m² Area Size`; one duplex page has no area label/value in the overview. |
| images | 0 junk / 62 rows | ✅ FIXED | ShortPixel comma/srcset fragmentation fixed; final report has 0 `/property/q_cdnize`, `/property/to_auto`, or `/property/s_webp:avif` junk image URLs. |

Engine fixes landed:
- ✅ Generic detail plugin parses `srcset` with `parse-srcset` instead of manual
  comma splitting, so ShortPixel CDN URLs are kept whole.
- ✅ Generic image filtering no longer rejects the legitimate `shortpixel.ai`
  CDN as a generic tracking `pixel.*` image.
- ✅ Generic `spec_table` value resolution supports previous-sibling value /
  label pairs used by Homes Casa Verde Houzez overview rows.
- ✅ Regex area fallback no longer overwrites a structured selector/spec-table
  area value.
- ✅ Curated upsert now refreshes source-derived fields for existing published
  rows while preserving `publish_status`, first-seen/published timestamps, and
  existing AI descriptions.
- ✅ Removed-row demotion query casts its timestamp parameter consistently, so
  notes and `last_verified_at` can be updated in one Postgres statement.

Verification evidence:
- Initial sandboxed dry run failed to launch Puppeteer and wrote a zero-row
  safety report; rerun with browser/network access was required for valid
  evidence.
- Pre-fix fresh dry run:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_homescasaverde npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 62 rows, enriched 62/62, skipped 0, status-gated 9 published rows,
  and had all-row coverage: price 62/62, bedrooms 58/62, bathrooms 59/62,
  area 51/62, images >=1 62/62, images >=3 62/62. Image audit found 182
  suspicious ShortPixel/junk entries and every row had junk fragments.
- Source-page DOM probes with the same headless browser path confirmed:
  - `hcv_ce1584d7161e` overview showed `2 Bedrooms`, `3 Bathrooms`,
    `151.75 m² Area Size`; pre-fix report had `area=null`, post-fix has
    `property_size_sqm=152`.
  - `hcv_1439dd3146ef` overview showed `3 Bedrooms`, `1 Bathroom`,
    `120 m² Area Size`; post-fix has `property_size_sqm=120`.
  - `hcv_ab5889781d21` overview showed `3 Bedrooms`, `3 Bathrooms`,
    `133 m² Area Size`; post-fix has `property_size_sqm=133`.
  - `hcv_66d431a4ad07` overview showed `1 Bathroom`,
    `56.62 m² Area Size`, `Office, Commercial`; post-fix has
    `property_size_sqm=57`, `bathrooms=1`, `bedrooms=null` as expected.
  - `hcv_96b97eaf392d` overview showed `859 m² Area Size`; post-fix extractor
    keeps `property_size_sqm=859` instead of the prose `544m²` plot mention.
  - Residual missing-area rows checked: `hcv_e6bb812bf2bc` shows `TBA m² Area
    Size`; `hcv_a615295a7053` has no overview area label/value. Treat both as
    source floors.
- Tests:
  `node --test tests/ingestToCurated.test.cjs tests/genericDetail.test.cjs tests/propertyType.test.cjs`
  passed after adding coverage for ShortPixel `srcset`, previous-sibling
  overview values, structured-area precedence over prose regex matches,
  published-row refresh upserts, and removed-row timestamp casting.
- Final post-fix dry run:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_homescasaverde npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 62 rows, enriched 62/62, skipped 0, status-gated 9 published rows,
  and reported 53 dry-run writable rows with no writes.
- Final report coverage:
  all rows: price 62/62, bedrooms 58/62, bathrooms 59/62, area 60/62,
  images >=1 62/62, images >=3 62/62.
  New dry-run writable rows: price 53/53, bedrooms 51/53, bathrooms 51/53,
  area 51/53, images >=1 53/53, images >=3 53/53.
- Direct Postgres compare (`DATABASE_URL`, not Supabase JS/REST):
  `kv_curated.listings` currently has 53 `cv_homescasaverde` rows
  (15 `published`, 38 `needs_review`); `public.v1_feed_cv` has 15 rows for this
  source. The fresh dry run has 62 current source rows. Six published feed rows
  are absent from the latest successful source fetch and are dry-run removal
  candidates only. Sixteen current dry-run rows are not yet in curated; 53
  current dry-run rows are absent from `v1_feed_cv` because they are not
  published. No publish-status promotions or live writes were made.
- Follow-up ingest freshness rule change before live ingest: published rows
  that are still present in the latest source fetch are no longer skipped by the
  upsert. They remain `published`, but source-derived fields are refreshed.
  Existing AI descriptions are preserved and no new AI text is generated for
  already-published rows.
- Actual ingest run:
  `REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_homescasaverde npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 62 rows, enriched 62/62, skipped 0, refreshed 9 current published
  rows with status preserved, generated AI descriptions for 16 eligible
  non-published rows, demoted 6 absent published rows to `removed`, and upserted
  62 rows with 0 write failures. No promotions were made.
- Post-ingest DB verification:
  `kv_curated.listings` has 69 `cv_homescasaverde` rows
  (9 `published`, 54 `needs_review`, 6 `removed`); `public.v1_feed_cv` has 9
  rows for this source. All 62 latest source rows exist in `kv_curated`; current
  source rows are split as 9 `published` + 53 `needs_review`. Verified sample
  refreshed values include `hcv_66d431a4ad07` as published commercial area
  `57`, `hcv_2fa8df61ad6e` as published land area `699`, `hcv_96b97eaf392d`
  area `859`, `hcv_ab5889781d21` area `133`, and `hcv_ce1584d7161e` area `152`.
  Post-ingest image audit found 0 ShortPixel fragment/junk URLs.
- Fresh live verification on 2026-06-06 through `DATABASE_URL`/direct Postgres:
  `kv_curated.listings` has 69 rows (57 `published`, 6 `needs_review`, 6
  `removed`) and `public.v1_feed_cv` has 57 Homes Casa Verde rows. The known
  corrupted sample `hcv_3298681ed1f3` is `87` sqm in curated and the live feed;
  other checked values are `120`, `133`, `152`, `57`, and `859` sqm as
  expected. No current non-removed Homes Casa Verde row has a suspicious area
  between 1 and 19 sqm. The corrective re-ingest is complete.

Spot-check (area):
- https://www.homescasaverde.com/property/exceptional-poolside-melia-tortuga-apartment-for-sale
- https://www.homescasaverde.com/property/3-bed-paradise-beach-penthouse-stunning-ocean-views
- https://www.homescasaverde.com/property/2-bed-2nd-floor-luxury-apartment-for-sale-ficus-vila-verde

---

## cv_capeverdeproperty24 — n=41 — DONE 2026-06-06

Status: ✅ **Resolved for current v1 ingest.** The OSProperty hypothesis was
correct for legacy detail pages:
structured fields existed in `#propertydetails .corefields` as
`.fieldlabel + .fieldvalue`, but the source had no `spec_table` configuration.
All 41 current listing pages were fetched and compared against every missing
price, bedroom, bathroom, area, and image field.

| field | pre-fix missing | post-fix missing | verdict | notes |
|---|---:|---:|---|---|
| price | 18/41 | 18/41 | 🌐 SOURCE | Every null-price page shows `Call for details price`; no numeric source price was found. |
| bedrooms | 33/41 | 21/41 | ◑ MIXED / ACCEPTED | OSProperty structured extraction recovered 12 rows. Residuals are land/commercial/project/multi-unit cases or values expressed only through titles/prose (`T1`, studio, one-/two-/three-bedroom wording), acceptable pending AI title/description extraction. |
| bathrooms | 37/41 | 24/41 | ◑ MIXED / ACCEPTED | OSProperty structured extraction recovered 13 rows. Residuals are non-residential/source floors or prose-only bathroom semantics, including multi-room hospitality properties without one unit-level count. |
| any area | 35/41 historical | 24/41 | ◑ MIXED / ACCEPTED | OSProperty structured extraction recovered 11 residential area rows. Final coverage is 14 `property_size_sqm` + 3 `land_area_sqm`; remaining pages either omit area or state it only in prose/project descriptions. |
| images | 0/41 current | 0/41 | ✅ | Fresh runs have 41/41 rows with source-scoped images; the older all-image failure no longer reproduces. |

Fixes landed:
- ✅ `cv_capeverdeproperty24.detail.spec_table` now maps OSProperty `Bed`,
  `Bath`, and `Square meter` fields inside `#propertydetails .corefields`.
- ✅ Ingest identity reconciliation now reuses an existing same-source,
  same-URL curated ID before status/removal checks, preferring published rows.
  This prevents title/price hash churn from demoting a still-live published row
  and inserting a replacement as `needs_review`.
- ✅ Focused regression tests cover both OSProperty extraction from source
  config and same-URL published-row identity preservation.

Verification evidence:
- Baseline command:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_capeverdeproperty24 npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 41 rows from 5 pages, enriched 41/41 with 0 failures, and wrote no
  data. Baseline coverage: price 23/41, bedrooms 8/41, bathrooms 4/41,
  residential area 3/41, images 41/41.
- Every current page was batch-fetched and its dedicated price element,
  OSProperty `.fieldlabel + .fieldvalue` pairs, and listing description were
  compared with the report. Legacy examples:
  - `brl10-2`: `Bed 1`, `Bath 1`, `Square meter 60.00 sqmt`.
  - `pds-th-5-por-do-sol-2`: `Bed 2`, `Bath 3`, `Square meter 185.00 sqmt`.
  - `cl-d-tr-trilocale-1d-3`: `Bed 2`, `Bath 1`, `Square meter 86.00 sqmt`.
  - `pds-b2-2`: `Bed 1`, `Bath 1`, `Square meter 46.00 sqmt`.
- Newer-page evidence includes source/prose-only semantics:
  `Nos Kasa do Rei` shows call-for-price and room-by-room prose;
  `Exclusive Villa with Private Pool` describes bedrooms/bathrooms only in
  prose; `Sun Dream Apartamento Boa Vista T1` exposes `T1` in title/prose;
  land/commercial pages correctly have no residential bed/bath expectation.
- Tests:
  `node --test tests/genericDetail.test.cjs tests/genericFetcherJsonApi.test.cjs tests/ingestToCurated.test.cjs tests/propertyType.test.cjs`
  passed 41/41.
- Final post-fix dry run fetched 41 rows, enriched 41/41 with 0 failures, and
  produced coverage: price 23/41, bedrooms 20/41, bathrooms 17/41,
  residential area 14/41, land area 3/41, any area 17/41, images 41/41.
- The first DB comparison exposed three false removal candidates whose source
  URLs were still current but whose title/price-derived IDs had changed:
  `brl10-2`, `pds-b8-2`, and `pds-b2-2`. After the identity fix, the final dry
  run reconciled exactly those three IDs, recognized all 36 existing rows as
  published, and reported **no published listings missing**.
- Direct Postgres comparison through `DATABASE_URL` (not Supabase JS/REST):
  `kv_curated.listings` has 36 rows, all `published`;
  `public.v1_feed_cv` has the same 36 rows. The final dry run has 41 rows:
  all 36 curated/feed IDs are present, and 5 rows are genuinely new
  (`Nos Kasa do Rei`, `Nos Kasa North`, `Ca' Povocao Velha`,
  `Exclusive Villa with Private Pool`, `Sea View Apartments`).
  A live ingest would refresh the 36 published rows in place and insert only
  those 5 new rows as `needs_review`; it would not promote or demote rows.
- Live ingest after explicit approval:
  `REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_capeverdeproperty24 npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 41 rows, enriched 41/41 with 0 failures, reconciled the 3 changed
  generated IDs to their existing published same-URL rows, found no removal
  candidates, generated AI descriptions for the 5 genuinely new rows, and
  upserted 41/41 with 0 failures.
- Direct Postgres verification after the live ingest:
  `kv_curated.listings` has 41 rows split as 36 `published` + 5
  `needs_review`; `public.v1_feed_cv` remains exactly the 36 published rows.
  All five new rows have AI descriptions and remain out of the feed. No rows
  were promoted or demoted.
- Verified refreshed published samples:
  `cvp24_079f28315dc6` (`brl10-2`) is 1 bed, 1 bath, 60 sqm;
  `cvp24_a8b1163a0c14` (`pds-b8-2`) is 1 bed, 1 bath, 58 sqm;
  `cvp24_59545a1c01f9` (`pds-b2-2`) is 1 bed, 1 bath, 46 sqm; and
  `cvp24_9423e529fb60` is 2 beds, 3 baths, 185 sqm.

Spot-check:
- https://capeverdeproperty24.com/en/todas-as-propriedades/nos-kasa-do-rei
- https://capeverdeproperty24.com/en/todas-as-propriedades/nos-kasa-north
- https://capeverdeproperty24.com/en/todas-as-propriedades/casa-morna
- https://capeverdeproperty24.com/en/brl10-2
- https://capeverdeproperty24.com/en/pds-th-5-por-do-sol-2

---

## cv_cabohouseproperty — n=12 — DONE 2026-06-06

Status: ⚠️ **Investigation and extraction fixes complete; live ingest blocked by
source firewall.** The source uses a MyHome `/featured/` sale subset, so absence
from the fetch is not authoritative evidence of removal. On 2026-06-08, MalCare
returned HTTP 403 to the headless runner. Track the blocker in
[GitHub issue #361](https://github.com/Ghebrehiwetventures/arei-platform/issues/361).

| field | missing | verdict | notes |
|---|---|---|---|
| price | 1/12 | ✅ SOURCE | The whole-building page displays `Contact us for price`; numeric null is correct/POA. |
| bedrooms | 2/12 | ✅ SOURCE / N/A | The whole-building page has no single building-level bedroom count and the land listing is non-residential. The other 10 rows expose authoritative MyHome bedroom attributes. |
| bathrooms | 2/12 | ✅ SOURCE / N/A | Same two non-unit rows as bedrooms. The other 10 rows expose authoritative MyHome bathroom attributes. |
| area | 0/12 | ✅ SCRAPER FIXED | MyHome attribute `m2` now wins over prose. The land page exposes two plot sizes; current row uses the first plot's `157.03 sqm` rather than plot identifier `441`. |
| images | 0/12 | ✅ | All 12 rows have at least 3 images. |

Root causes and fixes:
- ✅ **SCRAPER:** Cabo House MyHome detail pages expose area, bedrooms, and
  bathrooms in `.mh-estate__section--attributes`, but the source config only
  scanned description prose. This caused missing beds/baths/areas and a false
  `7 sqm` apartment area from a balcony sentence even though the structured
  area was `70,57`.
- ✅ **SCRAPER:** Generic structured-area parsing previously selected the first
  number in `Plot 441: 157.03 sqm`, producing `441 sqm`. It now prefers the
  number bound to an area unit and falls back to the first number only when no
  unit-bound value exists.
- ✅ **RESOLVER:** The two current skipped rows had generic list-page locations
  (`Villa, Sale` / `Sale, Ground`) and their scoped descriptions did not include
  `Santa Maria` or `Sal` early enough for the generic resolver. Verified
  source-specific landmarks now resolve `Tortuga Beach Resort` and
  `Porto Antigo` to Santa Maria, Sal.
- ✅ **STATUS SAFETY:** `https://www.cabohouseproperty.com/featured/?offer-type=sale`
  is a featured subset, not a complete catalogue. Three published rows absent
  from the subset still had live HTTP 200 detail pages. Added
  `removal_detection: false` for this source and a generic per-source gate, so
  a live ingest cannot auto-demote rows based only on absence from this subset.

Fresh evidence:
- Initial valid dry run before fixes:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_cabohouseproperty npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  fetched 12, enriched 12/12, kept 10, and skipped 2 for unresolved island
  (`chp_cfc6e9876a76`, `chp_573e1b0d1937`). Coverage was price 9/10,
  bedrooms 3/10, bathrooms 3/10, area 8/10, images >=1 and >=3 10/10.
- Source-page audit covered all 12 current detail pages. Every residential row
  had MyHome attributes for beds/baths/area. Examples:
  `chp_e20c19e1f995` = 2 beds, 1 bath, 70.57 sqm (not the 7 sqm balcony);
  `chp_755a0b71000a` = 1 bed, 1 bath, 43.8 sqm;
  `chp_c9fe8222a22e` = 2 beds, 1 bath, 71.34 sqm;
  `chp_573e1b0d1937` = 1 bed, 1 bath, 54.42 sqm;
  `chp_cfc6e9876a76` = 3 beds, 3 baths, 246 sqm.
- Successful post-fix dry run fetched 12, enriched 12/12, kept 12, skipped 0,
  and refreshed 2 existing published rows in dry-run simulation only. Coverage:
  price 11/12, bedrooms 10/12, bathrooms 10/12, area 12/12,
  images >=1 12/12, images >=3 12/12. No writes or promotions occurred.
- The final land parser and removal-gate changes are covered by focused tests.
  A subsequent report regeneration attempt returned an empty page, then a
  navigation timeout; a direct availability probe later returned HTTP `000`
  after 75 seconds. All zero-row attempts made no writes and removal detection
  remained disabled. Retry the exact dry run when the source is reachable
  before authorizing live ingest.
- Follow-up on 2026-06-08: the exact dry run was attempted twice and both runs
  returned 0 listings from one successful page parse (`stop: empty_listings`).
  No writes or removals occurred. A direct rendered-DOM Chromium diagnostic
  established the real response: HTTP 403, 336 bytes of HTML, zero property
  links/MyHome elements, and body text `MalCare Firewall — Blocked because of
  Malicious Activities`.
- The zero-row classification also exposed an engine observability defect:
  `core/fetchHeadless.ts` currently returns `statusCode: 200` after rendering
  any HTML, even when `page.goto()` received HTTP 403. It also waits for the
  Elementor-specific `.e-loop-item` selector although Cabo House uses MyHome.
  Issue #361 records investigation options and acceptance criteria for
  propagating the real status and classifying firewall/interstitial pages as
  blocked fetches rather than empty catalogues.
- Tests:
  `node --test tests/genericDetail.test.cjs tests/cvIslandRecovery.test.cjs tests/ingestToCurated.test.cjs tests/propertyType.test.cjs tests/runMarketSourceHealth.test.cjs`
  passed 48/48; `git diff --check` passed.

Direct Postgres comparison (`DATABASE_URL`, not Supabase JS/REST):
- `kv_curated.listings` has 5 rows for this source, all `published`;
  `public.v1_feed_cv` has the same 5 rows.
- Two current dry-run rows already exist and retain the same IDs for the same
  URLs: `chp_0b22e43d2537` and `chp_cfc6e9876a76`. No same-URL ID mismatch was
  found.
- Ten current rows are net-new and absent from curated/feed; a live ingest
  would insert them as `needs_review`, not publish them.
- Three older published/feed rows are absent from the featured subset:
  `chp_37d8820086a9`, `chp_b33e7c42dd6f`, and `chp_c1c618b0a1b0`.
  Their detail URLs returned HTTP 200 during the investigation, so treating
  them as removal candidates would be unsafe. The new source-level removal
  gate prevents demotion.
- Existing published rows have AI descriptions and historical
  first-seen/published timestamps. The tested upsert path preserves status,
  existing AI descriptions, and those timestamps while refreshing
  source-derived fields. No database writes were made in this investigation.

Spot-check:
- https://www.cabohouseproperty.com/properties/apartments/sale/2/excellent-investment-property-near-hilton-hotel
- https://www.cabohouseproperty.com/properties/building/sale/various-floors/building-for-sale-in-santa-maria-investment-opportunity
- https://www.cabohouseproperty.com/properties/villa/sale/ground-first/charming-detached-villa-for-sale-tortuga-beach-resort
- https://www.cabohouseproperty.com/properties/apartments/sale/ground/porto-antigo-bright-sea-view-apartment
- https://www.cabohouseproperty.com/properties/land/sale/ground/building-land-santa-maria-two-adjacent-plots

---

## cv_estatecv — n=166 — INVESTIGATION COMPLETE 2026-06-08

Status: ✅ **Resolved for a confirmation-gated live ingest.** No live write was
performed. The final authoritative dry run fetched the complete non-zero
catalogue, enriched every row, and produced no skipped rows, detail failures,
or removal candidates.

Commands:

```bash
DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_estatecv \
  npx ts-node --transpile-only scripts/ingest_to_curated.ts

node --test tests/genericDetail.test.cjs tests/propertyType.test.cjs \
  tests/pipelineDetailRetry.test.cjs tests/ingestToCurated.test.cjs
```

Fresh before/after evidence:

| field | fresh pre-fix present | post-fix present | post-fix missing | verdict |
|---|---:|---:|---:|---|
| price | 129/166 | 100/166 | 66/166 | ◑ MIXED/ACCEPTED |
| bedrooms | 120/166 | 122/166 | 44/166 | ◑ MIXED/ACCEPTED |
| bathrooms | 0/166 | 45/166 | 121/166 | ◑ MIXED/ACCEPTED |
| any area | 112/166 | 164/166 | 2/166 | ◑ MIXED/ACCEPTED |
| images ≥1 | 166/166 | 166/166 | 0/166 | ✅ |
| images ≥3 | 162/166 | 163/166 | 3/166 | 🌐 SOURCE |

The lower numeric-price count is a correctness improvement, not a regression.
The old detail selector crossed into related-listing cards and assigned their
prices to POA listings. Current page comparison found 64 missing-price rows
with negotiated/POA text and two land rows priced per square metre rather than
with a total asking price. The one current report price whose detail summary
has no price is visible on the catalogue card.

Field verdicts from the 166-page source audit:

- **Bedrooms:** the 44 nulls are 40 land, three commercial, and one house; none
  exposes a defensible total bedroom count. The penthouse prose counts that
  were previously missed are now extracted.
- **Bathrooms:** 45 source-derivable totals are now extracted, including word
  counts and “each/both bedrooms have an en-suite” phrasing. The 121 remaining
  nulls are 40 land, three commercial, 32 houses, and 46 apartments. Their
  pages either omit bathrooms or mention only a partial suite/bathroom fact,
  not a defensible property total; those are acceptable pending AI field
  extraction. One historical apparent miss now redirects to a different
  Apartment E page whose current content has no bathroom total.
- **Area:** the two remaining nulls are source ranges, `300–3000 m²` and
  `10000–60000 m²`, which must not be collapsed to one exact area. Delta 07's
  localized `Celková užitná plocha: 367,64 m²` now yields `368 m²`, while its
  `200 m²` plot row no longer wins. The Carvoeiros page is internally
  contradictory (`200 000 m²` in its primary summary and `to 20000 m²` in a
  later duplicate row), so it is classified MIXED and retains the primary
  source value.
- **Images:** every row has at least one image. The three rows below the
  three-image quality threshold expose only one or two listing images on the
  source page.

Engine/config fixes:

- Kept headless fetching for the paginated catalogue, but configured detail
  pages for direct HTTP and added one EstateCV-only retry for transient detail
  failures.
- Added structured detail price/summary-table extraction, word-number
  bedroom/bathroom parsing, conservative en-suite bathroom inference, grouped
  area-number parsing, range rejection, structured-area precedence over
  conflicting JSON-LD, and localized usable-area labels.
- Made exact spec labels win before contained aliases so generic `area` cannot
  select `Plot area` ahead of `Total usable area`.
- Resolved `/lands/` URLs as `land` and `/offices/` URLs as `commercial`
  before generic title heuristics.

Fetch, pagination, and location evidence:

- Final dry run: 166 listings from 20 pages; authoritative stop reason
  `empty_listings`.
- Detail extraction: 166/166 succeeded, zero retries needed in the final run,
  zero failures, zero skipped rows.
- The one fresh pre-fix failure,
  `https://estatecv.com/en/properties/lands/stavebni-pozemky-na-sao-nicolau`,
  returned HTTP 200 on immediate direct retry and succeeded in repeated
  post-fix runs. Classification: transient headless/detail behavior, not a
  block, bad URL, or empty catalogue.
- Multi-island resolution produced no unknown island:
  Santiago 120, Boa Vista 15, Maio 15, São Nicolau 10, Fogo 5, São Vicente 1.

Tests:

- Added focused regressions for EstateCV HTTP detail selection and retry,
  current price/spec markup, word-count and inferred bathrooms, grouped areas,
  ranges, JSON-LD conflicts, usable-area versus plot-area selection, localized
  labels, and URL-based land/commercial classification.
- Focused safety suite passed 53/53:
  `tests/genericDetail.test.cjs`, `tests/propertyType.test.cjs`,
  `tests/pipelineDetailRetry.test.cjs`, and
  `tests/ingestToCurated.test.cjs`.

Direct Postgres comparison (`DATABASE_URL`, not Supabase JS/REST):

- `kv_curated.listings` has 150 rows, all `published`;
  `public.v1_feed_cv` has the same 150 rows, all published, approved, and
  indexable.
- All 150 existing rows were recognized as published by the dry run. Their AI
  descriptions and first-seen/published/last-verified timestamps are present;
  the tested upsert path preserves status, timestamps, and existing AI text.
- Sixteen current catalogue rows are net-new and absent from curated/feed;
  they remain `needs_review` in the dry-run report. Nothing is promoted during
  testing.
- No curated row is absent from the current catalogue, so there are no false
  removal candidates.
- One generated ID was reconciled by same-source URL:
  `ecv_2b05162dee4d → ecv_7c9a7d084966` for the A03 apartment. The final report
  and database have no same-URL ID mismatch.

Source-page evidence:

- https://estatecv.com/en/properties/apartments/duargema-house-of-diaspora-s01-mezonet-3kk
- https://estatecv.com/en/properties/apartments/duargema-house-of-diaspora-s02-mezonet-3kk
- https://estatecv.com/en/properties/houses/duargema-delta-07
- https://estatecv.com/en/properties/lands/stavebni-pozemky-na-sao-nicolau
- https://estatecv.com/en/properties/lands/zemedelske-pozemky-na-sao-nicolau
- https://estatecv.com/en/properties/lands/building-plot-for-sale-carvoeiros-sao-nicolau

Remaining work: obtain confirmation, perform the live EstateCV ingest, then
verify that the 150 published rows remain published and the 16 additions enter
as `needs_review`.

---

## cv_oceanproperty24 — n=12

| field | missing | verdict | notes |
|---|---|---|---|
| price | 0/12 | ✅ | |
| bedrooms | 3/12 | ❓ | |
| bathrooms | 1/12 | ❓ | |
| area | 1/12 | ❓ | |

Spot-check:
- https://www.oceanproperty24.com/properties/new-project-alert-idra  (beds,baths,area)
- https://www.oceanproperty24.com/properties/studio-apartment-for-sale-in-vila-verde-resort-pepper-community  (beds — studio = 0 beds? source issue)

---

## cv_nhakaza — n=3 (rentals; tiny)

| field | missing | verdict | notes |
|---|---|---|---|
| price | 0/3 | ✅ | |
| bedrooms | 1/3 | ❓ | |
| bathrooms | 0/3 | ✅ | |
| area | 3/3 | ❓ | |

Known issue: 3 image URLs are `nhakaza.cv/file.php` (no extension) — verify they resolve to real images.

Spot-check:
- https://nhakaza.cv/arrendar-apartamento/achada-st-ant-nio-santiago/apartamento-t1-100-equipado/?view_page=show_ad&id=1603
- https://nhakaza.cv/arrendar-moradia/palmarejo-praia-santiago/moradia-duplex-t3-com-garagem-e-quintal-perto-da-praia-de-kebra-canela/?view_page=show_ad&id=1607

---

## Cross-cutting image issues

| issue | sources | count | verdict | fix location |
|---|---|---|---|---|
| Pinterest share buttons (`pinterest.com/pin/create/button`) | cv_simplycapeverde | 73 | 🔧 SCRAPER | universal junk-URL reject in image path |
| ShortPixel CDN URL fragmented on commas (`/property/q_cdnize`, `/to_auto`, doubled host) | cv_homescasaverde | ~112 across 56 listings | 🔧 SCRAPER | comma/srcset split must not break URLs containing commas |
| `file.php` no-extension image URLs | cv_nhakaza | 3 | ❓ | verify resolve |

Confirmed NOT issues (false positives, do not "fix"):
- `spcdn.shortpixel.ai/...jpg` — real homescasaverde CDN images.
- `...WhatsApp-Image-2025...jpeg` — real listing photos (filename only).
