# Agency Console — V0

**Status:** V0 foundation — admin-only, internal use  
**Working internal name:** Agency Console  
**Audience:** AREI staff only — this is not the broker product  
**Parent brand:** AREI

> **Scope note (2026-05-12):** This document describes the internal admin Agency Console used by AREI staff. The broker-facing product is **Listo by AREI** — a separate application with different UX, navigation, and product framing. See `docs/03-product/listo-by-arei-product-brief.md` and `docs/04-platform/broker-product-architecture.md`.

---

## Why it exists

AREI is building a data-first real estate index. Brokers and agencies are the primary data partners. This product is the foundation for a broker-facing console that agencies can eventually use to see how their listings appear in the AREI index, improve listing data quality, claim their profile, and contribute structured data.

V0 is an internal admin tool for managing agency relationships. It is **not** a public-facing broker portal yet.

---

## Product purpose

The Agency Console has two jobs:

1. **Now (V0):** Give AREI admins a structured place to track agencies, outreach, data partnerships, and follow-ups — replacing ad-hoc spreadsheets.

2. **Future:** Evolve into a broker-facing product where agencies can log in and manage their own data presence. See the [Future roadmap](#future-broker-facing-roadmap) section.

---

## Two-layer data model

The core design decision is to keep two clearly separated data layers from day one.

### Layer 1 — Agency profile (`public.agencies`)

This is the broker-safe layer. It contains information that can eventually be shown to agency users: name, contact info, website, linked source IDs, and status fields.

**Fields:**

| Field | Description |
|---|---|
| `id` | UUID primary key |
| `market_code` | Market this agency operates in (default: `cv`) |
| `agency_name` | Internal name used by AREI |
| `public_display_name` | Name shown to the public (optional; defaults to `agency_name`) |
| `website` | Agency website URL |
| `email` | Contact email |
| `phone` | Contact phone |
| `whatsapp` | WhatsApp contact |
| `logo_url` | Logo URL (optional) |
| `description` | Short public-facing description |
| `source_ids` | Array of pipeline source IDs linked to this agency |
| `claimed_status` | `unclaimed` / `invited` / `claimed` / `verified` |
| `data_partner_status` | `none` / `interested` / `active` / `paused` |
| `created_at` / `updated_at` | Timestamps |

### Layer 2 — Internal relationship (`public.agency_relationships`)

This is the internal-only layer. It contains outreach tracking, lead scoring, and internal notes.

**Fields:**

| Field | Description |
|---|---|
| `id` | UUID primary key |
| `agency_id` | FK to `agencies.id` |
| `relationship_status` | `not_contacted` / `contacted` / `replied` / `meeting_booked` / `onboarded` / `rejected` / `dormant` |
| `priority` | `high` / `medium` / `low` |
| `lead_quality` | `unknown` / `strong` / `average` / `weak` |
| `relationship_owner` | AREI team member responsible |
| `last_contacted_at` | Date of last outreach |
| `next_follow_up_at` | Scheduled follow-up date |
| `internal_notes` | Free-text internal notes |
| `created_at` / `updated_at` | Timestamps |

There is a `UNIQUE(agency_id)` constraint — one relationship record per agency.

---

## Database tables

**Migration:** `migrations/031_agency_console.sql`

```
public.agencies              — broker-safe profile data
public.agency_relationships  — internal CRM data (admin-only)
```

**Indexes:**
- `agencies(market_code)`
- `agencies(claimed_status)`
- `agencies(data_partner_status)`
- `agency_relationships(relationship_status)`
- `agency_relationships(priority)`
- `agency_relationships(next_follow_up_at ASC NULLS LAST)`

**RLS:**
- Both tables: anon SELECT/INSERT/UPDATE (matching admin SPA pattern — anon client with no session persistence)
- No DELETE policies on either table — use status fields to retire records
- `agency_relationships` is protected only by the admin auth gate at the app layer in V0

---

## Admin UI

**Location:** `arei-admin` app — "Agency Console" tab in sidebar navigation

**Files:**
- `arei-admin/AgencyConsoleView.tsx` — main view component
- `arei-admin/agencyData.ts` — Supabase data functions
- `arei-admin/types.ts` — TypeScript type definitions (appended)

**Features:**

| Feature | Status |
|---|---|
| Agency table with all key columns | ✅ V0 |
| Search by name, website, or source ID | ✅ V0 |
| Filter by claimed status, data partner status, relationship status, priority | ✅ V0 |
| Summary stat cards (total, active partners, claimed, follow-up due) | ✅ V0 |
| Create agency modal | ✅ V0 |
| Edit agency profile | ✅ V0 |
| Add / edit internal relationship details | ✅ V0 |
| Expandable row with full agency + relationship detail | ✅ V0 |
| Linked source IDs display | ✅ V0 |
| Data quality section (placeholder — see TODO in component) | 🔲 TODO |
| Follow-up date highlighted when overdue | ✅ V0 |
| Internal notes preview in table row | ✅ V0 |

**Data quality TODO:**  
The expandable detail panel includes a placeholder section for source health data. To wire it up, join the linked `source_ids` against the `get_source_quality_stats()` RPC (see `arei-admin/data.ts` → `getDashboardStats()`). Show: listing count, image coverage, price coverage, sqm coverage, health grade.

---

## Future broker-facing roadmap

When AREI is ready to offer this as an external product (separate product name to be decided), the following steps apply:

1. **Authentication:** Add a broker login flow — either Supabase Auth with a separate role, or a magic-link invitation flow keyed on `agencies.email`.

2. **Claimed profile flow:** Build a claim flow where an agency can verify ownership of their profile (e.g. via email code). Update `claimed_status` to `claimed` on success.

3. **Broker dashboard:** Show the agency their own listing data, broken down by source health metrics — listing count, image coverage, price coverage, sqm/beds/baths completeness, data quality score.

4. **Data improvement tools:**
   - Flag listings with missing data (sqm, bedrooms, bathrooms)
   - Upload better photos for specific listings
   - Submit corrections to listing details
   - Add or verify missing field values

5. **Feed submission:** Allow data-partner agencies to submit structured listing feeds (CSV, JSON, or direct API) to improve index coverage.

6. **Visibility insights:** Show agencies how many of their listings are indexed, approved, and appearing in the public feed — with guidance on how to improve.

7. **Data quality score:** Surface an agency-level data quality score, driving a feedback loop that incentivises agencies to improve their data.

**Critical:** When building any broker-facing layer:
- Expose **only** columns from `public.agencies`
- **Never** expose `public.agency_relationships` or any column derived from it to broker-facing queries
- Create a dedicated Supabase view or use column-level RLS grants — do not trust application-layer filtering alone
- `internal_notes` must remain permanently admin-only

---

## Security notes

- `agency_relationships.internal_notes` must **never** appear in a public API endpoint, RLS SELECT policy granted to broker roles, or any query accessible to non-admin users.
- The V0 RLS allows anon SELECT on `agency_relationships` because the admin SPA uses an anon Supabase client. This is acceptable while the app is admin-only and protected by the LoginScreen auth gate.
- When broker auth is added: create a dedicated `broker` role in Supabase, grant SELECT only on `agencies` (not `agency_relationships`), and add a `REVOKE` for `anon` on `agency_relationships`.
- See `docs/04-platform/security-baseline.md` and `docs/05-quality-control/pre-launch-security-checklist.md` for the broader security framework.

---

## Language guidance

This product should feel **neutral, useful, and data-focused**. Avoid:
- Language that positions AREI as a competing property portal
- "Broker tool" in visible copy (internal name only)
- Aggressive portal language ("list with us", "get more leads")

Prefer language around:
- Data quality and transparency
- Listing visibility and index presence
- Verification and accuracy
- Market insight
