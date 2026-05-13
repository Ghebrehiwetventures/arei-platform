# Agency Data Console — V0

**Status:** V0 foundation — admin simulation of future broker-facing product  
**Visible product name:** Agency Data Console  
**Parent brand:** AREI  
**Related doc:** [Agency Console V0](agency-console-v0.md) — internal CRM companion

---

## Why the Agency Console was insufficient

The Agency Console (031) is a relationship CRM. It tracks outreach status, priority, follow-up dates, and internal notes. That is useful for AREI's sales and partnership motion.

It does not activate data acquisition. An agency tracked in the CRM contributes nothing to the index. AREI needs a mechanism to:

1. See the quality of listings linked to each agency's sources.
2. Flag missing or weak fields so those issues are visible and actionable.
3. Let agencies (eventually directly, now via admin simulation) submit corrections.
4. Review and approve those corrections before they affect canonical listings.

The Agency Data Console is that mechanism.

---

## Strategic purpose

AREI's competitive moat is data quality and completeness. Brokers and agencies are the authoritative source for most property attributes — price, sqm, availability, photos. The index degrades without a feedback loop from them.

This product creates that feedback loop:

```
Agency data gap detected → Broker sees it → Broker submits correction →
AREI reviews → Correction applied to canonical listing → Index quality improves
```

---

## Three-layer architecture

The full agency data model now has three clearly separated layers:

### Layer 1 — Agency profile (`public.agencies`)
Broker-safe identity: name, contact, website, source links, claimed/verified status.  
Safe to eventually show to agency users.

### Layer 2 — Internal relationship (`public.agency_relationships`)
AREI-only CRM: outreach status, lead quality, internal notes, follow-up dates.  
**Must never be exposed to broker-facing surfaces.**

### Layer 3 — Data contribution (`032_agency_data_console.sql`)
The data acquisition product. Four new tables:
- `agency_listing_links` — connects agencies to listings or sources
- `agency_listing_submissions` — broker-proposed corrections (never directly mutates canonical listings)
- `listing_data_issues` — detected quality problems per listing
- `agency_data_quality_snapshots` — agency-level quality metrics over time

---

## Database tables

**Migration:** `migrations/032_agency_data_console.sql`

### `public.agency_listing_links`

Connects an agency to a source or specific listing.

| Field | Description |
|---|---|
| `agency_id` | FK to `agencies.id` |
| `listing_id` | Nullable — FK to `listings.id` for listing-level links |
| `source_id` | Nullable — pipeline source ID for source-level links |
| `external_listing_id` | Agency's own reference ID if known |
| `relationship_type` | `source_owner` / `claimed` / `submitted` / `verified` |

Use `source_owner` when an agency operates a whole source (e.g. `cv_solprop`). Use `claimed` for individual listings they've claimed ownership of.

### `public.agency_listing_submissions`

Broker-proposed corrections or new listings. **Never directly mutates `public.listings`.**  
All submissions go through AREI review.

| Field | Description |
|---|---|
| `agency_id` | FK to `agencies.id` |
| `listing_id` | The listing being corrected (null for new listings) |
| `submission_type` | `new_listing` / `update_existing` / `availability_update` / `duplicate_report` / `removal_request` |
| `status` | `draft` → `submitted` → `under_review` → `approved` / `rejected` / `needs_more_info` |
| `payload` | JSONB — proposed field values or availability status |
| `reviewer_notes` | AREI admin only — never shown to agencies |

**Payload conventions:**
- `update_existing`: only include fields being changed. E.g. `{ "price": 145000, "bedrooms": 3 }`
- `availability_update`: `{ "availability_status": "sold" }`
- `duplicate_report`: `{ "duplicate_of_id": "abc123", "agency_note": "..." }`
- `removal_request`: `{ "agency_note": "No longer available" }`

### `public.listing_data_issues`

Detected quality problems for each listing. Populated client-side in V0.  
Future: move to a scheduled scan job (similar to `source_health_snapshots` workflow).

| Field | Description |
|---|---|
| `listing_id` | The affected listing |
| `issue_type` | `missing_price` / `missing_sqm` / `missing_bedrooms` / `missing_bathrooms` / `missing_location` / `missing_photos` / `weak_description` / `stale_listing` / `possible_duplicate` / `broken_image` / `suspicious_price` |
| `severity` | `low` / `medium` / `high` |
| `status` | `open` / `fixed` / `ignored` / `submitted_for_review` |

### `public.agency_data_quality_snapshots`

Agency-level quality aggregates. One row per agency per day (upsertable).  
Written when the Agency Data Console page loads for an agency.

| Field | Description |
|---|---|
| `listing_count` | Total listings linked to this agency's sources |
| `missing_price_count` | Listings with no price |
| `missing_sqm_count` | Listings with no property_size_sqm |
| `missing_photo_count` | Listings with no image_urls |
| `stale_listing_count` | Listings not seen in 30+ days |
| `open_issues_count` | Sum of all detected issues |
| `average_quality_score` | Mean score across all agency listings |

---

## Quality scoring (V0)

Client-side scoring function in `arei-admin/agencyDataConsole.ts`:

```
score = 100
- 25  if no price
- 20  if no photos
- 15  if no sqm
- 10  if no bedrooms
- 10  if no bathrooms
- 10  if no location (island + city both null)
- 10  if stale (last_seen_at or updated_at > 30 days ago)
Clamped to 0–100.
```

Replace with a Postgres function or view when scoring logic stabilises.

---

## Admin UI

**Location:** `arei-admin` — "Agency Data Console" tab

**Files:**
- `arei-admin/AgencyDataConsoleView.tsx` — main view
- `arei-admin/agencyDataConsole.ts` — data layer

### View structure

1. **Agency selector** — dropdown of all agencies; linked source IDs shown
2. **Quality overview cards** — listings total, avg score, listings with issues, open submissions, missing price/photos/sqm counts, stale count
3. **Tab: Listing quality** — table sorted by quality score ascending (worst first):
   - Title, price, location, quality score badge, issue chips, submission status, last updated, "Improve data →" action
   - Expanding a row shows the **Correction panel**
4. **Tab: Review queue** — pending submissions for the selected agency (or all agencies)

### Correction panel

Per listing, when expanded:
- Current AREI data summary
- Existing pending submission notice (if any)
- Correction type buttons: Update / Availability update / Duplicate report / Removal request
- Field inputs for the selected correction type
- Agency note field
- "Submit correction" → creates a `submitted` submission record

### Review queue

Per submission card:
- Agency name, submission type, listing ID, submitted date, status
- Proposed change fields
- Agency's note
- Reviewer notes textarea (internal)
- Action buttons: Approve / Needs more info / Reject / Mark under review

---

## Submission workflow

```
Agency identifies issue (or admin simulates it)
  │
  ▼
Submit correction via CorrectionPanel
  │  Creates: agency_listing_submissions (status=submitted)
  ▼
Review queue shows submission to AREI admin
  │
  ├─ Approve   → status=approved  (then admin manually applies to listings)
  ├─ Reject    → status=rejected
  └─ Needs info → status=needs_more_info (visible to broker in future)
```

V0 approval does NOT automatically apply changes to `public.listings`. An AREI admin must manually update the listing after approval. This is intentional — it keeps a human in the loop while the workflow matures.

Future: when volume grows, build a one-click "Apply approved changes" action that writes the payload fields to `public.listings` atomically.

---

## Future broker login plan

When broker auth is added:

1. Create a `broker` Supabase role with limited grants.
2. RLS policy on `agencies`: broker can SELECT only where their user is linked to the agency.
3. RLS policy on `agency_listing_submissions`: broker can INSERT only for their own agency; can SELECT only their own submissions.
4. RLS policy on `agency_listing_links`: read-only for brokers; INSERT/UPDATE blocked.
5. No broker role should ever SELECT from `agency_relationships`.
6. Build a broker login flow (magic link keyed on `agencies.email`).
7. Show the broker a view identical to the Agency Data Console but:
   - No reviewer_notes field
   - No agency selector (they see only their own agency)
   - No ability to review other agencies' submissions

---

## Security notes

- `agency_listing_submissions.reviewer_notes` must never appear in broker-facing UI.
- V0 RLS: anon SELECT/INSERT/UPDATE on all tables (admin SPA anon-client pattern). Acceptable for admin-only V0.
- When broker auth is added: restrict broker role to row-level access (their agency only) and column-level (exclude reviewer_notes).
- Canonical `public.listings` is never writable by any agency-facing operation. Approved submissions are applied manually by AREI admin in V0.
- See `docs/04-platform/security-baseline.md` for broader security framework.

---

## Language guidance

Use contribution-oriented, data-quality language:

✅ "Improve listing data", "Missing fields", "Submit correction", "Verify listing",  
&nbsp;&nbsp;&nbsp;"Update availability", "Data quality score", "Needs review", "Approved"

❌ "Contacted", "Relationship owner", "Lead quality", "Next follow-up"  
(those live in Agency Console CRM, not here)

---

## Remaining gaps / next features

| Gap | Priority | Notes |
|---|---|---|
| Auto-apply approved submissions to `listings` | High | Manual step in V0; needs one-click apply action |
| Broker login (external access) | High | Magic-link on `agencies.email`; scoped RLS |
| Scheduled issue detection job | Medium | Replace client-side detection with daily GH Action |
| Photo upload for listings | Medium | Requires storage bucket (Supabase Storage or external) |
| Duplicate detection tooling | Medium | Cross-listing dedup check in submission flow |
| Quality score in `source_health_snapshots` | Low | Align agency score with existing source health grades |
| Submission diff view (current vs proposed) | Low | Nice UX for review queue — show side-by-side field diff |
| Agency notification on review decision | Future | Email/WhatsApp when submission approved/rejected |
