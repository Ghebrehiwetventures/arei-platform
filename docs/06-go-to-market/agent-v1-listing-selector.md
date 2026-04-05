# Agent V1 Listing Selector

## Objective

Agent V1 is a narrow, review-only listing selector for KazaVerde. It ranks the current Cape Verde listing universe, explains why a listing is worth editorial attention, and suggests a usable content angle. It does not post, publish, or orchestrate downstream agents.

## Current Inputs

Agent V1 reads from current live listing data already used by the admin surface.

Exact inputs in v1:

- `v1_feed_cv_indexable` when available to seed the public and indexable candidate pool
- fallback to `v1_feed_cv` if the indexable view is unavailable
- `listings` rows for the richer listing facts used in scoring
- current listing fields already in repo use:
  - approval state
  - source id, source ref, source url
  - title
  - description
  - image urls
  - island, city, location
  - price, currency, project start price
  - bedrooms, bathrooms, property size sqm
  - property type
  - created and updated timestamps
- derived source quality from the current Cape Verde listing universe:
  - approved coverage by source
  - image coverage by source
  - price coverage by source

## Hard Filters

Listings are excluded before scoring when they are obviously weak or unsafe for editorial selection.

- not approved
- missing source url
- missing usable image
- missing or extremely weak title
- missing usable location label
- status text implies inactive, sold, rented, hidden, draft, or archived

## Soft Scoring Model

The selector uses explicit weighted scoring instead of opaque model behavior.

- Trust: 24
- Visual: 18
- Completeness: 14
- Location: 12
- Value: 10
- Freshness: 8
- Uniqueness: 7
- Post Material: 7

Notes:

- data quality issues reduce score; they do not block selection unless the listing fails a hard filter
- value uses price-per-sqm against the current island median when both price and sqm are present
- uniqueness is relative to the current candidate pool, using normalized title and location signatures
- source quality is derived from current Cape Verde source coverage and folded into trust
- a listing must clear the hard filters and a minimum total score to be recommended

## Output Schema

Each selected listing returns:

- `listingId`
- `rank`
- `totalScore`
- `selectionTheme`
  - `dream`
  - `trust`
  - `opportunity`
- `title`
- `sourceName`
- `sourceUrl`
- `locationLabel`
- `priceLabel`
- `selectedImage`
- `reasons[]`
- `warnings[]`
- `contentAngle`
- `scoreBreakdown[]`

## Repo Location

Smallest clean placement:

- selector logic: `arei-admin/listingSelector.ts`
- selector data wiring: `arei-admin/data.ts`
- review surface: `arei-admin/app.tsx`

Reason:

- this stays inside the admin workflow where operators already review outputs
- it avoids coupling Agent V1 to ingestion jobs
- it keeps the first version inspectable in one PR without migrations or platform work

## Smallest Implementation Plan

1. Add a pure selector module in `arei-admin` with explicit filters and scoring.
2. Load a read-only Cape Verde candidate pool from the current public feed path plus base listings.
3. Render results in the existing admin Agents view with reasons, warnings, and content angle.
4. Keep persistence, autoposting, and multi-agent behavior out of scope.
