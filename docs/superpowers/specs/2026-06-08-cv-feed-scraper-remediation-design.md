# CV Feed Scraper Remediation Design

**Date:** 2026-06-08
**Status:** Ready for implementation planning
**Type:** C (data/pipeline task) per `docs/operations/execution-protocol.md`

## Objective

Fix the scraper-side issues found in `docs/02-data-engine/cv-feed-audit-2026-06-08.md` for the published Cape Verde feed, then verify the affected source outputs before any production data change is made.

This remediation covers:

- EstateCV and Homes Casa Verde image extraction quality.
- REMAX and Simply Cape Verde area semantics.
- Homes Casa Verde city recovery.
- Ocean Property 24 title truncation.
- A verification pass that proves the affected source outputs improved.

This remediation does not cover:

- Cross-source duplicate consolidation.
- Source-authored weak titles, repeated development/unit titles, or missing descriptions.
- Automatic demotion or publish-status changes.
- Direct SQL updates to curated listings.

## Findings Being Remediated

The audit found these scraper-side issues:

| Area | Affected source(s) | Remediation target |
| --- | --- | --- |
| Images | `cv_estatecv`, `cv_homescasaverde` | Prefer larger gallery/srcset images and avoid related/similar listing images polluting the current listing gallery. |
| Area | `cv_remax` | Treat `TotalArea` as land/plot area for REMAX villa/house listings whose source text describes a plot, rather than writing it to `property_size_sqm`. |
| Area | `cv_simplycapeverde` | Parse comma-thousands areas such as `20,000 m²` as `20000`, classify land/development opportunities as land where appropriate, and avoid `20 m²` property-size output. |
| City | `cv_homescasaverde` | Recover `Santa Maria` from detail-page address blocks when the list card only resolves island/resort. |
| Title | `cv_oceanproperty24` | Use detail-page title when list-page title is truncated with ellipsis and detail title is longer. |

## Design

### Image Extraction

Use the existing detail image pipeline rather than adding source-specific post-processing in ingestion.

`core/detail/plugins/genericDetail.ts` already extracts `srcset` candidates and de-duplicates with `dedupeImageUrls`. The remediation should strengthen source config and generic extraction behavior:

- Keep extracting all usable image candidates from selected gallery containers.
- Prefer larger WordPress/ShortPixel variants through the existing `dedupeImageUrls` size-selection logic.
- Narrow Homes Casa Verde selectors to the current listing's gallery/carousel containers and exclude similar-listing cards.
- Narrow EstateCV selectors so logo/header uploads do not become source candidates, while keeping true gallery/upload images.
- Add tests that reproduce the audit pattern: thumbnail variant first, larger srcset/gallery variant available, and related-listing images present elsewhere on the page.

### Area Semantics

Use existing property-type and area fields; do not add schema.

- For REMAX JSON API listings, map area into `area_sqm` only when it represents built/living area. For villa/house records whose description says the total area is a plot, classify the property as land-bearing by setting `land_area_sqm` through existing row assembly behavior. The least invasive route is to add source-aware logic before curated row assembly, because the REMAX API field name `TotalArea` is ambiguous.
- For Simply Cape Verde detail enrichment, rely on `parseAreaTextSqm` to correctly parse comma-thousands values and allow the detail extraction to override the list value. Add a test for `20,000 m²`.
- Strengthen property type inference for land/development language so `Fabulous Development Opportunity` is not treated as a `house`.

### City Recovery

Homes Casa Verde detail pages expose address text with `City: Santa Maria` and `State/county: Sal`. The generic detail plugin can already return `location`; the source config should add a detail location selector that captures the address block. The existing location resolver should then parse the detail location and retain `city = Santa Maria`.

If the generic selector cannot reliably isolate the address block, add a narrow source hook in `markets/cv/locationHooks.ts` for Homes Casa Verde resort pages where the source URL/title/description contains `Vila Verde` or `Paradise Beach`, resolving to `Sal / Santa Maria`.

### Ocean Property 24 Titles

`core/pipeline/enrich.ts` supports title upgrades only when the caller opts in. The affected ingest path should enable title upgrade from detail extraction for config-driven enrichment, or add a safe rule that upgrades only when the current title ends with `...` or `…` and the detail title is longer.

The rule should be conservative:

- Preserve existing titles unless they are explicitly truncated.
- Strip site suffixes such as `| Ocean Property 24` if present.
- Add tests showing a truncated OP24 card title is replaced by the full detail title.

### Verification

Verification should be source-output based before any production write:

- Run focused unit tests for image de-duplication, area parsing/property-type, location recovery, and title upgrade.
- Run dry-run or report-only source fetches for the affected sources where existing scripts support that mode.
- Produce a small verification report under `reports/feed-audit/` or console output showing affected source IDs now emit corrected city, area, title, and image candidates.

Any production ingest or publish-status change remains a separate founder decision. If an ingest is needed to refresh curated rows, run it only after the code-level fix is verified and only with the normal project ingest command, not ad hoc SQL.

## Acceptance Criteria

- EstateCV and Homes Casa Verde detail extraction prefers large gallery images over thumbnail variants for representative audit examples.
- Homes Casa Verde detail extraction no longer pulls related/similar listing images into the current listing gallery in the representative test.
- REMAX plot/villa area no longer lands as built `property_size_sqm` for the representative audit cases.
- Simply Cape Verde `20,000 m²` parses to `20000` and is represented as land/development area, not `20 m²` built area.
- Homes Casa Verde affected rows resolve `city = Santa Maria`.
- Ocean Property 24 truncated titles upgrade to full detail titles.
- All changes are covered by focused tests and a source-output verification pass.
- No dedupe changes, no source-authored title policy changes, no direct DB writes, and no publish-status changes are included.

## Risks And Limits

- Some EstateCV shared development render images were classified as false positives in the audit; the fix should not suppress legitimate shared renders solely because multiple units use them.
- Homes Casa Verde pages may expose multiple carousels; selector changes must avoid dropping true listing images.
- REMAX `TotalArea` semantics may vary by listing type; source-aware handling must be limited to clear plot/land language or house/villa cases to avoid losing legitimate apartment area.
- Existing published rows will not change until the normal ingest/update path refreshes them.
