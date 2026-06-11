# CV Ingest Dry-Run — Field-Gap & Image-Outlier Diagnosis (2026-06-02)

**Run:** `MARKET_ID=cv DRY_RUN=1 DEBUG_GENERIC=1 npx ts-node --transpile-only core/ingestMarket.ts`
**Branch:** `codex/source-ops-dev`
**Mode:** Dry run — no Supabase upsert (`DRY_RUN=1`), OBSERVE sources forced to fetch (`DEBUG_GENERIC=1`).
**Artifacts:** `artifacts/cv_ingest_report.json`, `artifacts/cv_drop_report.json`

## Summary

| Metric | Value |
|--------|-------|
| Total listings | 487 |
| Visible | 401 |
| Hidden | 86 |
| Duplicates removed | 1 |
| Sources in config | 17 |
| Detail enrichment | 481 enriched / 4 failed |

**Source status:** 12 OK, 5 `BROKEN_SOURCE` (all dropped by preflight/config:
`cv_capeverdepropertyuk`, `cv_rightmove`, `cv_globallistings`, `cv_properstar`,
`cv_greenacres` — none fetched, expected).

## Field gaps (missing values) per source

Counts = listings missing that field / total fetched for the source.

| Source | n | price | location | descr | bedrooms | bathrooms | area_sqm | imgs<3 |
|--------|---|-------|----------|-------|----------|-----------|----------|--------|
| cv_terracaboverde | 35 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| cv_simplycapeverde | 77 | 12 | 1 | 0 | 3 | 5 | 37 | 4 |
| cv_ccoreinvestments | 82 | 1 | 0 | 1 | 6 | 4 | 21 | 0 |
| cv_homescasaverde | 57 | 0 | 4 | 0 | 4 | 4 | 38 | 1 |
| cv_capeverdeproperty24 | 41 | 18 | 0 | 0 | 33 | 37 | 35 | 0 |
| cv_cabohouseproperty | 12 | 1 | 0 | 0 | 5 | 8 | 4 | 0 |
| **cv_estatecv** | **166** | **38** | 0 | 4 | **41** | **166** | **54** | 5 |
| cv_oceanproperty24 | 12 | 0 | 0 | 0 | 3 | 1 | 1 | 0 |
| cv_nhakaza | 3 | 0 | 0 | 0 | 1 | 0 | 3 | 3 |

(`cv_source_1/2` are stub test listings.)

### Totals across all 487

| Field | Missing | % |
|-------|---------|---|
| title | 0 | 0% |
| location | 5 | 1% |
| description | 5 | 1% |
| price | 70 | 14% |
| bedrooms | 100 | 21% |
| area_sqm | 195 | 40% |
| bathrooms | 227 | 47% |
| images = 0 | 1 | — |
| 0 < images < 3 | 12 | — |

### Where the gaps concentrate

1. **`cv_estatecv` is the worst offender** (166 listings, our largest source):
   - **bathrooms missing on 100% (166/166)** — the bathroom `spec_pattern` is not
     matching this site at all. Strong signal the selector/regex needs an estatecv-specific
     pattern added to its `detail.spec_patterns`.
   - area_sqm missing 54, bedrooms 41, price 38.
   - All **4 detail-fetch failures** in the run were estatecv listings.
2. **`cv_capeverdeproperty24`** — bedrooms (33/41), bathrooms (37/41), area (35/41),
   price (18/41) all largely missing. Spec extraction effectively not working for this source.
3. **`area_sqm` is broadly weak (40% missing)** — concentrated in estatecv (54),
   homescasaverde (38), simplycapeverde (37), capeverdeproperty24 (35).
4. **Minor:** location/description gaps are negligible (1% each). Titles are 100% present.

## Hidden listings (86) — why

| Violation | Count |
|-----------|-------|
| INVALID_PRICE | 70 |
| INSUFFICIENT_IMAGES | 13 |
| GENERIC_TITLE | 9 |
| DESCRIPTION_TOO_SHORT | 7 |
| DUPLICATE | 1 |

Hidden-by-source: cv_estatecv 42, cv_capeverdeproperty24 18, cv_simplycapeverde 17.
`INVALID_PRICE` is non-blocking for approval ("price on request" is valid), but it dominates
the hidden set and tracks the price-gap sources above.

## Image-URL outlier scan

5,717 image URLs across 487 listings. Host distribution:

```
1519  estatecv.com          228  oceanproperty24.com
1193  cdn.proppy.app        151  cabohouseproperty.com
 990  simplycapeverde.com    73  pinterest.com        ← outlier
 826  terracaboverde.com     48  spcdn.shortpixel.ai  (legit CDN)
 431  capeverdeproperty24.com 6  example.com          (stub data)
 249  homescasaverde.com      3  nhakaza.cv
```

### Confirmed outlier — Pinterest share buttons (ACTION NEEDED)

- **73 URLs of `https://pinterest.com/pin/create/button`**, all from **`cv_simplycapeverde`**.
- These are the "Pin it" social-share button hrefs, captured as images because the
  image selector is too greedy.
- Each affected listing carries **exactly one** Pinterest junk URL mixed in with real
  images (e.g. a 20-image listing = 19 real + 1 Pinterest), so it pollutes galleries but
  rarely empties them.
- **Fix:** add `pinterest.com/pin/create` (and ideally a generic social-share host
  blocklist) to the image reject filter / `reject_url_patterns` for simplycapeverde, or
  tighten its `detail.selectors.images`.

### Not outliers (verified false positives)

- **`spcdn.shortpixel.ai` (48)** — legitimate homescasaverde images served through the
  ShortPixel CDN; real `.jpg` paths are embedded mid-URL
  (`.../www.homescasaverde.com/wp-content/uploads/.../*.jpg`). The "placeholder" / "no
  extension" heuristics false-flagged them on URL shape only.
- **`example.com` (6)** — stub test listings `cv_source_1/2`. Expected.

No data-URIs, no non-HTTP, no invalid hosts, no tiny/icon dimensions detected.

## Drop-report note (read with care)

`cv_drop_report.json` shows `cv_capeverdeproperty24` (41) and `cv_cabohouseproperty` (12)
at `kept_normalized: 0`, mostly `missing_images`. This is misleading: `normalizeOrDrop`
runs **before** detail enrichment (`core/ingestMarket.ts:549` vs enrichment at `:555`),
so sources that hydrate images from the detail page look image-less at normalize time.
Treat the drop report's `missing_images` as a staging artifact, not a true gap, for
detail-enriched sources.

## Recommended next actions (priority order)

1. **`cv_estatecv` bathroom + spec extraction** — 100% bathroom miss on our biggest
   source. Add/repair `detail.spec_patterns` (bathrooms, area, bedrooms) and investigate
   the 4 detail-fetch failures.
2. **`cv_capeverdeproperty24` spec extraction** — bed/bath/area/price all ~85% missing.
3. **Strip Pinterest share-button URLs** from `cv_simplycapeverde` image extraction.
4. **`area_sqm` patterns** — broadly weak (40%); add area regexes across estatecv,
   homescasaverde, simplycapeverde.
