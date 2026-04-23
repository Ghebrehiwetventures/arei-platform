# Terra Image Reliability Audit

Date: 2026-04-01

Truth class: Verified in data / output

Scope:
- public consumer feed view: `v1_feed_cv`
- source: `cv_terracaboverde`
- probe depth: first 3 `image_urls` per listing
- command: `npx ts-node --transpile-only scripts/terra_image_reliability_audit.ts`

## Summary

- Terra listings checked: `71`
- Terra listings with `image_urls`: `71`
- Listings where the first image failed: `40`
- Listings where the first 3 checked images all failed: `40`
- Listings where at least one of the first 3 checked images worked: `31`

## Probe status counts

- `ok`: `93`
- `dead`: `108`
- `timeout`: `12`
- `blocked`: `0`
- `invalid_url`: `0`
- `error`: `0`

## Product implication

The frontend currently receives `image_urls` for Terra listings, but a material share of those URLs are not display-safe. This means cards and detail pages can render an empty image surface unless the UI resolves a working image or falls back to a stable local asset.

## Sample broken listings

- `tcv_028bb6c4520c` — first 3 checked images returned `404`
- `tcv_04bb5217e68f` — first 3 checked images returned `404`
- `tcv_08491fc587b1` — two `404`, one timeout
- `tcv_0c76d15ce211` — first 3 checked images returned `404`
- `tcv_1894e63131e2` — first 3 checked images returned `404`
- `tcv_26016a3d880d` — first 3 checked images returned `404`

## Recommendation before mirroring

- Use a shared frontend fallback so cards and detail no longer show empty brown placeholders.
- Treat Terra image reliability as a feed-quality issue, not only a frontend issue.
- Exclude Terra listings with no renderable checked image from the public feed if product quality must be protected before mirroring is ready.
