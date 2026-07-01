# Weekly Newsletter Draft

The repo now has a founder-review draft generator for the Cape Verde Real Estate Index weekly email.

It does **not** send email. External newsletter sends remain human-gated under the Execution Protocol and Founder Operating Runbook.

## Run

```bash
npm run newsletter:weekly
npm run newsletter:weekly -- --date 2026-06-30
npm run newsletter:weekly -- --analytics data/weekly-analytics.json
```

Outputs:

- `tmp/newsletter-drafts/cvrei-weekly-YYYY-MM-DD.html`
- `tmp/newsletter-drafts/cvrei-weekly-YYYY-MM-DD.txt`

The HTML follows the active light welcome-email design from `supabase/functions/subscribe/index.ts`: off-white surface, D-layers lockup, black typography, restrained dividers, and no decorative card-heavy layout.

## Included Sections

Verified from Supabase:

- active subscriber count
- new subscribers in the 7-day period
- latest subscribers, masked in the draft
- total public CV listings
- source count
- latest/new listings
- latest published market news
- top inventory islands

Optional from analytics export:

- visits / visitors / page views
- top pages
- most-clicked listings

If analytics is not supplied, the draft keeps those areas as placeholders instead of inventing numbers.

## Analytics Input Format

Create a JSON file like:

```json
{
  "visits": 1240,
  "visitors": 830,
  "pageViews": 3100,
  "topPages": [
    { "path": "/listings", "views": 890 },
    { "path": "/market", "views": 240 }
  ],
  "listingClicks": [
    { "path": "/listing/cv_example_1", "clicks": 42 },
    { "listingId": "cv_example_2", "clicks": 31 }
  ],
  "note": "Manual export from Vercel Analytics / GA4 for the newsletter period."
}
```

Current code has Vercel Analytics and optional GA4 page tracking, but no repo-local analytics table. Until an API/export is wired in, visits and listing-click rankings must come from a manually reviewed export.
