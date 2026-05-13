# Broker Product Architecture

**Status:** V0.1 — admin-hosted pilot preview  
**Working product name:** Listo by AREI  
**Last updated:** 2026-05-12

---

## Overview

There are two distinct surfaces sharing one Supabase backend:

| Surface | Who uses it | What it does |
|---|---|---|
| **AREI Admin** (`arei-admin`) | AREI staff only | CRM, data quality, listing review, editorial approval, pipeline management |
| **Listo by AREI** (`arei-broker`, future) | Agency brokers | Listing management, lead inbox, WhatsApp workflow, public agency page |

These surfaces are separate applications. They share the same Supabase project (`bhqjdzjtiwckfuteycfl`) but have different auth scopes, different RLS policies, and different UX entirely.

---

## Current state — Broker Pilot Preview (admin-hosted)

The Broker Pilot Preview is a tab inside the AREI admin SPA (`arei-admin`). It is not the broker product. It is an admin-operated simulation used to:

1. Demonstrate the listing workflow to agencies during pilot meetings
2. Allow AREI staff to submit listings on behalf of agencies without broker auth
3. Validate the data model and review flow before investing in a separate frontend

**File:** `arei-admin/BrokerPilotView.tsx`  
**Navigation:** "Broker Pilot Preview" in admin sidebar  
**Access:** Admin users only

The admin pilot preview is **internal infrastructure only**. Its UX, language ("quality checks", "review queue", "data console"), and framing are intentionally internal. None of this language should appear in the broker-facing product.

---

## Target state — Listo by AREI (separate surface)

Listo is a simple listing and lead workspace for real estate agencies. See the full product brief:  
`docs/03-product/listo-by-arei-product-brief.md`

### Product modules

| Module | Description |
|---|---|
| **Listings** | Add and manage property listings — price, photos, location, status, shareable link |
| **Inbox** | Buyer lead inbox — name, phone, email, WhatsApp, linked listing, follow-up date |
| **Website** | Public agency page — active listings, contact buttons, WhatsApp CTA |
| **Performance** | Listing views, leads per listing, contact clicks (placeholders in V0) |
| **Profile** | Agency display name, description, contact person, email, phone, WhatsApp |

### Navigation (broker-facing)

```
Inbox | Listings | Website | Performance | Profile
```

### What is deliberately excluded from the broker surface

| Excluded | Reason |
|---|---|
| Data quality dashboard | Internal AREI metric, not a broker daily workflow |
| Review queue | Admin editorial control — broker sees status only |
| Corrections/submissions module | Background mechanism; not the product proposition |
| Pipeline/scraper language | Internal infrastructure; meaningless to brokers |
| Relationship CRM fields | Internal AREI outreach data |
| Verification workflow | Handled admin-side; broker sees the outcome (published/not) |

---

## Separation of responsibilities

| Concern | Admin SPA (`arei-admin`) | Listo (`arei-broker`) |
|---|---|---|
| Agency CRM | ✓ Full access | ✗ Never |
| Internal relationship notes | ✓ Full access | ✗ Never |
| Review queue (submissions) | ✓ Approve / reject / request info | ✗ Never |
| Editorial approval (publish listings) | ✓ Admin controls publication | ✗ Broker cannot publish own listings |
| Agency profile (broker-safe fields) | ✓ Read + edit | ✓ Read and edit own agency |
| Listings | ✓ Full CRUD + status transitions | ✓ CRUD own agency; cannot set published |
| Lead inbox | ✗ Not admin's concern | ✓ Own agency leads only |
| Public agency page | ✗ Not admin's concern | ✓ Own agency |
| Other agencies' data | ✓ Full visibility | ✗ Never — RLS enforces isolation |

---

## Data boundary — what must never cross

The following data must never be accessible in Listo, regardless of implementation:

| Data | Location | Why it must stay admin-only |
|---|---|---|
| `agency_relationships.*` | `agency_relationships` table | Internal CRM — outreach status, lead quality, internal notes |
| `reviewer_notes` | `broker_pilot_listings`, `agency_listing_submissions` | Admin editorial notes |
| `reviewed_by` | both tables | Internal attribution |
| `claimed_status`, `data_partner_status` | `agencies` | Internal pipeline classification |
| `source_ids` | `agencies` | Internal pipeline linkage |
| Any row from `agency_data_quality_snapshots` | that table | Internal quality metrics |
| Any row from `listing_data_issues` | that table | Internal issue tracking |
| Lead contact details | `leads` table (future) | Broker-owned data — must not be indexed or aggregated |

---

## Auth model for Listo

The broker app requires Supabase Auth with a scoped broker role. The following components are needed before Listo can go live with self-service login (V1):

1. **Supabase Auth broker role** — dedicated role with column-level grants on `agencies` and `broker_pilot_listings` (or `agency_listings`)
2. **RLS on listings table** — broker can SELECT/INSERT/UPDATE only where `agency_id` matches their linked agency
3. **RLS on `agencies`** — broker can SELECT only their own agency row; cannot SELECT `claimed_status`, `data_partner_status`, or `source_ids`
4. **RLS on `leads`** — broker can SELECT/INSERT/UPDATE only their own agency's leads; AREI cannot SELECT lead contact details
5. **Column-level security** — `reviewer_notes`, `reviewed_by`, `reviewed_at` on listings and submissions must be stripped from broker role grants
6. **Magic link invite flow** — broker invited via `agencies.email`; Supabase sends magic link; agency record linked to auth user on first sign-in
7. **Broker-to-agency mapping** — `broker_users` or `agency_memberships` table linking `auth.users.id` to `agency_id`

None of this requires changing the current listing data model. The tables in migrations 031–033 are designed for it.

---

## New schema requirements

### `leads` table (not yet created)

Needed before the Inbox module can be built. Full spec in `docs/03-product/listo-by-arei-product-brief.md` §9.

Status values: `new` / `contacted` / `viewing_booked` / `negotiating` / `lost` / `closed`

This table contains **broker-owned data** (buyer contact details). It must never be indexed, aggregated, or exposed in AREI's data layer. RLS must restrict SELECT to the owning agency only, with no anon read.

---

## Deployment

Listo should be a separate Vite project at the repo root (`arei-broker/`), following the existing app convention.

- Deploy to a separate domain: `listo.arei.io` or `listo.kazaverde.com` (TBD)
- Use the same Supabase project but connect as the broker role, not anon
- No sidebar linking to admin views
- No admin chrome

---

## Migration path

```
V0.1 (now)
  AREI staff demo to agencies using BrokerPilotView inside admin SPA
  AREI staff submits listings on behalf of agencies
  No broker auth, no external access
  No leads table yet

V0.2 (next — scaffold)
  Create arei-broker/ app (Listo by AREI)
  Navigation: Inbox | Listings | Website | Performance | Profile
  Listings module: CRUD using broker_pilot_listings (scoped to demo agency)
  Inbox module: requires new leads table migration
  Website module: public agency page (static render from agencies table)
  Performance: placeholder tiles only
  Still admin-operated (no broker login yet)
  Demo-mode agency selector at top of app

V1 (production)
  Full broker self-login (magic link)
  RLS scoped to broker role
  Mobile-optimised UI
  Lead notifications (WhatsApp / email)
  Photo upload (Supabase storage)
  Public listing pages and agency URLs
  Portuguese localisation
  Verified badge on published listings
  Market data light (avg price context)
```

---

## Related documents

- `docs/03-product/listo-by-arei-product-brief.md` — full product brief, target broker, V0 features, V1 roadmap
- `docs/03-product/broker-pilot-workspace-v0.md` — V0.1 admin pilot spec
- `docs/03-product/broker-pilot-demo-setup.md` — how to apply migrations and seed data
- `docs/03-product/verified-agency-listing-policy.md` — Verified Agency and Verified Listing definitions
- `docs/04-platform/security-baseline.md` — broader security model
