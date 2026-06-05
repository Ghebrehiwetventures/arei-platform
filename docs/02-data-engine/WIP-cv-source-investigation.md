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
- [ ] cv_homescasaverde
- [ ] cv_capeverdeproperty24
- [ ] cv_cabohouseproperty
- [ ] cv_estatecv
- [ ] cv_oceanproperty24
- [ ] cv_nhakaza
- [ ] Cross-cutting image issues

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

Operational notes worth carrying forward:
- The curated ingest status gate is working: published rows are not overwritten by source re-ingest; new/changed rows enter as `needs_review`.
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

Status: ✅ **Resolved for current v1 ingest.** One real scraper/config gap was
fixed: CCore's Casafari/Proppy detail bar exposes gross area behind
`i.proppy-icon-gross-area-24-custom + span`, but the source config only had
structured selectors for bedrooms/bathrooms. Current remaining gaps are source
floors, land/project nulls, or acceptable title/description-only semantics.

| field | missing | verdict | notes |
|---|---|---|---|
| price | 1/84 | ✅ ACCEPTED | `ccore_760370` has no visible numeric price and RealEstateListing JSON-LD `offers` has `priceCurrency` but no `price`; treat as source/POA, not a scraper gap. |
| bedrooms | 8/84 | ✅ ACCEPTED | 3 land rows correctly null residential fields after the `Lots` land-classification fix; 4 studio/store rows have no structured bedroom count (`Studio`/store semantics only); 1 project row exposes `Units: 3`, not a unit bedroom count. Acceptable pending future AI title/description extraction for title-only studio semantics. |
| bathrooms | 4/84 | ✅ ACCEPTED | 3 are land rows; 1 is a multi-unit development page exposing `Units: 3` rather than per-unit bathrooms. No scraper bug remains. |
| area | 5/84 | ✅ ACCEPTED | Fixed CCore detail-bar gross-area extraction; all-row area coverage improved from 61/84 to 79/84, and new-row area coverage from 4/13 to 11/13. Remaining pages checked have no detail-bar/JSON-LD/description area value. |

Engine/config fixes landed:
- ✅ Generic detail plugin supports `detail.selectors.area` and parses comma-decimal
  sqm values from structured selector text.
- ✅ `cv_ccoreinvestments` config now maps area to
  `.detailsBar__list i.proppy-icon-gross-area-24-custom + span`.
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
  - `ccore_760370` JSON-LD `offers` has no `price`; no visible numeric price was
    found on the page.
  - Remaining checked area-null rows (`ccore_839337`, `ccore_836640`,
    `ccore_829033`, `ccore_824599`, `ccore_820099`) had no detail-bar area,
    no JSON-LD floor size, and no reliable description area value.
- Tests:
  `node --test tests/genericDetail.test.cjs tests/propertyType.test.cjs` passed.
- Post-fix DRY_RUN report:
  `DRY_RUN=1 REPORT_JSON=1 MARKET_ID=cv SOURCE_ID=cv_ccoreinvestments npx ts-node --transpile-only scripts/ingest_to_curated.ts`
  produced 84 rows, 0 skipped, 71 status-gated published rows, 13 dry-run
  writable rows, and wrote `reports/curated/cv_cv_ccoreinvestments.json`.
- Post-fix coverage in the report:
  all rows: price 83/84, bedrooms 76/84, bathrooms 80/84, area 79/84,
  images >=1 84/84, images >=3 84/84.
  New dry-run writable rows: price 13/13, bedrooms 12/13, bathrooms 13/13,
  area 11/13, images >=1 13/13, images >=3 13/13.
- Direct Postgres compare (`DATABASE_URL`, not Supabase JS/REST):
  `kv_curated.listings` currently has 91 `cv_ccoreinvestments` rows
  (90 `published`, 1 `needs_review`); `public.v1_feed_cv` has 90 rows for this
  source. The fresh dry run has 84 current source rows. The 13 dry-run rows not
  in curated/feed are the new writable rows; 20 older curated rows are no longer
  in the fresh source output. No publish-status changes were made.

Spot-check (area):
- https://www.ccoreinvestments.com/en/property-detail/flats-for-sale-t1-t2-t0-studios-beach-antonio-sousa-santa-maria-sal-island-cape-verde/839806
- https://www.ccoreinvestments.com/en/property-detail/apartments-for-sale-in-antonio-sousa-beach-santa-maria-cape-verde-sal-island-2-bedroom-apartment-for-sale-in-santa-maria-sal-island/839337

---

## cv_homescasaverde — n=57

| field | missing | verdict | notes |
|---|---|---|---|
| price | 0/57 | ✅ | |
| bedrooms | 5/57 | ❓ | |
| bathrooms | 4/57 | ❓ | |
| area | 38/57 | ❓ | |

Known issue: 🔧 **comma/srcset splitting bug** — ShortPixel CDN URLs fragmented
into junk (`/property/q_cdnize`, `/to_auto`) across 56 listings. See cross-cutting.

Spot-check (area):
- https://www.homescasaverde.com/property/exceptional-poolside-melia-tortuga-apartment-for-sale
- https://www.homescasaverde.com/property/3-bed-paradise-beach-penthouse-stunning-ocean-views
- https://www.homescasaverde.com/property/2-bed-2nd-floor-luxury-apartment-for-sale-ficus-vila-verde

---

## cv_capeverdeproperty24 — n=41 (badly broken)

| field | missing | verdict | notes |
|---|---|---|---|
| price | 18/41 | ❓ | |
| bedrooms | 33/41 | ❓ | |
| bathrooms | 37/41 | ❓ | |
| area | 35/41 | ❓ | |

Hypothesis: detail spec extraction effectively not configured/working for this CMS (OSProperty).

Spot-check:
- https://capeverdeproperty24.com/en/todas-as-propriedades/nos-kasa-do-rei  (price,baths,area)
- https://capeverdeproperty24.com/en/todas-as-propriedades/nos-kasa-north  (beds,baths,area)
- https://capeverdeproperty24.com/en/todas-as-propriedades/casa-morna  (beds,baths,area)

---

## cv_cabohouseproperty — n=8 (+4 skipped: island unresolved)

| field | missing | verdict | notes |
|---|---|---|---|
| price | 1/8 | ❓ | |
| bedrooms | 4/8 | ❓ | |
| bathrooms | 4/8 | ❓ | |
| area | 0/8 | ✅ | |

Known issue: 🔧 **4/12 fetched listings dropped — "island unresolved"** (location
resolver gap, see source-troubleshooting.md §2.7). Skipped IDs:
`chp_0120a80e1d2e`, `chp_921aa3dd379b`, `chp_a7d324ce42dc`, `chp_b33e7c42dd6f`.

Spot-check:
- https://www.cabohouseproperty.com/properties/apartments/sale/2/excellent-investment-property-near-hilton-hotel  (beds,baths)
- https://www.cabohouseproperty.com/properties/building/sale/various-floors/building-for-sale-in-santa-maria-investment-opportunity  (price)

---

## cv_estatecv — n=166 (largest source; worst bathrooms)

| field | missing | verdict | notes |
|---|---|---|---|
| price | 36/166 | ❓ | |
| bedrooms | 46/166 | ❓ | |
| **bathrooms** | **166/166** | ❓ | 100% missing — almost certainly 🔧 SCRAPER |
| area | 54/166 | ❓ | |

Also: 3–4 detail-fetch failures reproduce here (transient? retry).

Spot-check (price,baths):
- https://estatecv.com/en/properties/apartments/duargema-house-of-diaspora-s01-mezonet-3kk
- https://estatecv.com/en/properties/apartments/duargema-house-of-diaspora-s02-mezonet-3kk

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
