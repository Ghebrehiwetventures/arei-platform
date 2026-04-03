# `cv_homescasaverde` sqm verification

Date: 2026-04-02

Status: `verified: sqm correct`

## Verified path

- `cv_homescasaverde` does not have source-specific sqm extraction logic.
- Sqm currently comes from the generic detail extractor via `markets/cv/sources.yml` `detail.spec_patterns.area`.
- The generic detail extractor reads the detail page body text, extracts the first matching area value, and writes it to `listing.area_sqm`.
- CV ingest then maps non-land listings to `property_size_sqm` and leaves `land_area_sqm` as `null`.

## Sample results

- `2 Bed 2nd Floor Luxury Apartment for Sale, Ficus, Vila Verde`
  Visible page value: `112 m² Area Size`
  Extracted result: `area_sqm=112`
  Mapping: `property_size_sqm=112`, `land_area_sqm=null`

- `Stunning 3 Bed Villa with Wide Ocean Views, Melia Tortuga`
  Visible page value: `184.5 m² Area Size`
  Extracted result: `area_sqm=184.5`
  Mapping: `property_size_sqm=184.5`, `land_area_sqm=null`

- `Melia Tortuga 2 Bed Penthouse for Sale`
  Visible page value: `89 m² Area Size`
  Extracted result: `area_sqm=89`
  Mapping: `property_size_sqm=89`, `land_area_sqm=null`

These sampled mappings are correct because the tested listings are not land listings, so the current ingest rule routes `area_sqm` to `property_size_sqm`.

## Risk note

- Homes Casa Verde JSON-LD exposes `floorSize.unitText` as `"SQFT"` on sampled pages.
- The numeric values currently match the visible on-page `m²` values.
- Current extraction is safe because it does not rely on that JSON-LD unit for sqm.
- Treat this as a source-specific future watch item, not a current fix.

## Final verdict

`cv_homescasaverde source clear for sqm. No patch required.`
