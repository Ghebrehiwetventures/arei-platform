# Broker Pilot Workspace — V0.1

**Status:** V0.1 — Admin simulation. Demo-ready. No broker auth required.  
**UI label:** Broker Pilot (sidebar) / Broker Pilot Workspace (page heading)  
**Parent brand:** AREI  
**Business surface:** Broker Tools (one of three AREI product surfaces)

---

## Agency Console vs Broker Pilot Workspace

These are two different things with different purposes.

| | Agency Console | Broker Pilot Workspace |
|---|---|---|
| **Primary user** | AREI admin | Simulates broker/agency user |
| **Purpose** | Internal CRM — track agencies, outreach, partnerships | Demonstrate the broker data loop |
| **Core data** | Agency profiles + internal relationship notes | Agency profile + pilot listing submissions |
| **Internal notes visible?** | Yes (admin-only section) | No |
| **Listing table** | Pipeline listings (scraped) | Pilot listings (directly submitted) |
| **Status** | Internal tool | Demo-ready for broker meetings |

The Agency Console is infrastructure. The Broker Pilot Workspace is the product demo.

---

## What V0.1 proves

1. **The broker data loop works end-to-end** — an agency can submit a listing and AREI can review and publish it without a scraper.

2. **Quality enforcement before publication** — brokers see exactly what is missing and why before asking for review. This sets expectations up front.

3. **AREI controls publication** — broker listings never go live automatically. A human approves them.

4. **The agency has a presence on AREI** — the agency profile card shows how the agency is represented.

5. **Demo script for broker meetings:**  
   "Here is your agency profile. Here is how we add one of your listings. Here is the quality check before it goes live. Here is how it will appear on AREI. Once we approve it, it is published."

---

## What is intentionally out of scope

- Broker login or external access
- Magic link auth
- Multi-user agencies
- Automated image hosting or upload (paste URLs for now)
- Email or WhatsApp notifications on status changes
- Complex RLS for external broker roles
- Lead inbox or buyer enquiries
- Billing or subscriptions
- Broker-specific branding
- Analytics dashboards
- Multi-market listing management

These are real features. They are excluded because V0.1 is a pilot, not a product. The goal is to validate the loop, not to build the full system.

---

## Data model

### Reused from Agency Console (031)

`public.agencies` — fully reused. Agency profile card reads from here.  
One new column added: `contact_person` (migration 033).

`agencies` columns surfaced in the Broker Pilot:
- `agency_name`, `public_display_name`
- `contact_person`, `email`, `phone`, `whatsapp`
- `logo_url`, `description`, `market_code`, `website`

Columns **not surfaced** in broker-facing components:
- `claimed_status`, `data_partner_status` (internal classification)
- Anything from `agency_relationships` (never crosses the boundary)

### New table: `broker_pilot_listings` (migration 033)

One row per pilot listing submitted by or on behalf of an agency.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `agency_id` | uuid | FK to agencies |
| `market_code` | text | Default `cv` |
| `title` | text | Listing title (required) |
| `price` | numeric | Asking price |
| `currency` | text | Default `EUR` |
| `property_type` | text | Villa, Apartment, Land… |
| `island` | text | Cape Verde island |
| `city` | text | City or area |
| `bedrooms` | integer | |
| `bathrooms` | integer | |
| `property_size_sqm` | numeric | |
| `description` | text | Public-facing description |
| `image_urls` | text[] | Array of photo URLs |
| `source_url` | text | Agency's own listing URL (optional) |
| `contact_name` | text | Per-listing contact override |
| `contact_email` | text | Per-listing contact override |
| `contact_phone` | text | Per-listing contact override |
| `publish_status` | text | See status lifecycle below |
| `reviewer_notes` | text | **Admin-only.** Never render to brokers. |
| `reviewed_by` | text | Admin-only. |
| `reviewed_at` | timestamptz | Admin-only. |

This is **not** `agency_listing_submissions`. Submissions (032) are corrections to existing pipeline listings. Pilot listings are net-new listings not yet in the pipeline.

---

## Quality checklist

Runs client-side in the intake form (live feedback as broker fills in fields) and in the listing detail panel.

| Check | Severity | Pass condition |
|---|---|---|
| Price included | Required | `price > 0` |
| At least 3 photos | Required | `image_urls.length >= 3` |
| Location specified | Required | `island` or `city` not null |
| Description (100+ chars) | Recommended | `description.length >= 100` |
| Property size (sqm) | Recommended | `property_size_sqm > 0` |
| Contact details | Recommended | `contact_email` or `contact_phone` present |

A listing may only advance to `ready_for_review` when all Required checks pass. The UI enforces this with a disabled button and tooltip.

---

## Publish status lifecycle

```
draft
  ↓  [broker marks ready — requires all required checks passing]
ready_for_review
  ↓  [AREI admin reviews]
  ├── published   (approved — visible on public surface)
  └── rejected    (feedback in reviewer_notes — admin only)

Any status → draft  (return to edit)
```

`reviewer_notes` is stored with the listing record. It is **admin-only** and must never be rendered in any broker-facing component. This is enforced in code: the `BrokerPilotView` only renders the field inside the "admin-only" labelled section of the status controls panel.

---

## Admin UI

**File:** `arei-admin/BrokerPilotView.tsx`  
**Data layer:** `arei-admin/pilotData.ts`  
**Navigation:** "Broker Pilot" in admin sidebar

### Page structure

1. **Pilot Workspace banner** — clearly labels this as an admin simulation
2. **Agency selector** — dropdown; all agencies from `agencies` table
3. **Agency profile card** — broker-safe: name, contact, website, description. No CRM fields.
4. **Pilot listing stats** — draft / ready for review / published counts
5. **Pilot listings list** — expandable rows:
   - Thumbnail, title, price, location
   - Quality issue summary chips (required / recommended failures)
   - Publish status badge
6. **Expanded listing row:**
   - **Quality checklist** — all checks with pass/fail and guidance
   - **Status controls** — mark ready for review / publish / reject / return to draft
   - **Reviewer notes field** — admin only, labelled clearly
   - **Listing data summary** — all fields at a glance
   - **Public preview card** — visual mockup of how the listing appears on AREI
7. **Intake form modal** — create or edit a listing:
   - All listing fields
   - Live quality checklist in the sidebar of the form
   - "Ready for review" indicator when all required checks pass

---

## What would be needed for true broker login

1. **Supabase Auth broker role** — a `broker` role with column-level grants
2. **RLS policy on `broker_pilot_listings`** — broker can SELECT/INSERT/UPDATE only where `agency_id` matches their agency
3. **RLS on `agencies`** — broker can SELECT only their own agency row
4. **Column grants** — strip `reviewer_notes`, `reviewed_by`, `reviewed_at` from broker role grants (or use a view)
5. **Magic link flow** — invite broker via email using `agencies.email`, send them a Supabase magic link
6. **Agency verification** — verify the broker actually represents the agency before granting access
7. **`claimed_status` update** — when broker claims their agency, update to `claimed` then `verified`
8. **Separate frontend surface** — the broker sees only their own agency; no admin navigation

None of this requires changing the data model. The tables are designed for it.

---

## Security notes

- `reviewer_notes`, `reviewed_by`, `reviewed_at` must never render in any broker-facing component
- V0.1 RLS: anon SELECT/INSERT/UPDATE (admin SPA pattern). Protected by the admin auth gate at the app layer.
- No `agency_relationships` data of any kind reaches `BrokerPilotView`
- The `AgencyProfileCard` component only renders broker-safe fields; its prop type is `Agency` (not `AgencyWithRelationship`)
- See `docs/04-platform/security-baseline.md` for the broader security model
