# Broker Product Architecture

**Status:** V0.1 — admin-hosted pilot preview  
**Working product name:** Listo by AREI *(working name only — final name TBD)*  
**Last updated:** 2026-05-13 (Market Access module added)

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

### Two-world structure

The broker workspace is organised into two conceptually separate areas:

**My Agency** — the broker's operational workspace
- Inbox (leads)
- Listings (own agency's catalogue)
- Website (public agency page)
- Performance (own listing metrics)
- Profile (agency settings)

**Market** — a read-only view of the full AREI market
- Browse all active public listings
- Search and filter (island, price, property type, bedrooms)
- Market overview (listing counts)
- Comparable listings view (from a broker's own listing)
- Share a market listing with a buyer

These worlds are visually and functionally separate. Brokers never edit or claim Market listings. The Market tab is a window, not a workspace.

### Product modules

| Module | World | Description |
|---|---|---|
| **Listings** | My Agency | Add and manage property listings — price, photos, location, status, shareable link |
| **Inbox** | My Agency | Buyer lead inbox — name, phone, email, WhatsApp, linked listing, follow-up date |
| **Website** | My Agency | Public agency page — active listings, contact buttons, WhatsApp CTA |
| **Performance** | My Agency | Listing views, leads per listing, contact clicks (placeholders in V0) |
| **Profile** | My Agency | Agency display name, description, contact person, email, phone, WhatsApp |
| **Market** | Market | Read-only browse of all active public AREI listings; search, filter, comparable view, share |

### Navigation (broker-facing) — options under review, not final

Two nav structures are under consideration. Do not implement either as final until tested with brokers in a pilot. See `docs/03-product/listo-by-arei-product-brief.md` §8.2 for full rationale.

**Option A:**
```
Inbox | Listings | Market | More
```
"More" drawer: Performance, Website, Profile.

**Option B (preferred starting point):**
```
Today | Leads | Listings | Market
```
Website and Profile via top-right agency/settings menu.

Option B is the preferred starting point because it models the actual broker daily workflow more accurately. Today = action hub for the day. Leads = buyer follow-up as a dedicated space. Option A is the fallback if Today screen proves too complex before the first agency demo.

Website and Profile are set-and-forget in either option — they must not occupy a primary nav slot.

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

## Market Access — data rules

### What the Market tab reads

`arei-broker` Market Access reads from **`broker.market_listings_view`** — a broker-safe wrapper view over `public.v1_feed_cv`, created in migration 037.

`public.v1_feed_cv` is the canonical public feed that powers kazaverde.com. It serves only curated, approved, published listings from `kv_curated.listings`. `broker.market_listings_view` selects a fixed broker-safe column subset from it.

**Data source chain (no raw pipeline access):**
```
kv_curated.listings (published rows)
  → public.v1_feed_cv_curated_preview
  → public.v1_feed_cv
  → broker.market_listings_view   ← arei-broker reads here
```

**Do not use `broker_pilot_listings` as the Market Access data source.** That table holds agency-submitted listings for the My Agency workspace. It is not the public market feed.

**Do not use raw pipeline tables, scraper snapshots, `public.listings` directly, or admin-only diagnostic views.**

**Do not create a new market dataset.**

### broker.market_listings_view — selected columns

Migration: `migrations/037_broker_market_listings_view.sql`

| Column | Purpose |
|---|---|
| `id` | Stable listing identifier |
| `title` | Listing name |
| `description` | Plain-text listing description |
| `price` | Asking price |
| `currency` | Price currency |
| `price_period` | e.g. per month for rentals |
| `price_status` | `ok` or `price_on_request` |
| `country` | Country |
| `island` | Cape Verde island |
| `city` | City/location |
| `latitude` / `longitude` | Public map coordinates |
| `property_type` | Apartment, Villa, Land, etc. |
| `bedrooms` / `bathrooms` | Room counts |
| `property_size_sqm` / `land_area_sqm` | Area |
| `amenities` | Public listing features |
| `image_urls` | Full image array |
| `cover_image_url` | Primary/hero image |
| `source_url` | Original public listing URL (shown on kazaverde.com detail pages) |
| `first_seen_at` | When listing first appeared |
| `updated_at` | Last update timestamp |

**23 columns total.**

Excluded from V0 (with reasoning in migration 037):
- `description_html` — scraped HTML, detail-view only, not needed for browse/search, `dangerouslySetInnerHTML` risk in broker app. Add in V1 if a broker listing detail view is built.
- `ai_descriptions` — JSONB, detail-view only (`DETAIL_COLUMNS_OPTIONAL` in arei-sdk). Not needed for list/card/compare views in Market V0. Add in V1.

All internal diagnostic, scraper metadata, and pipeline columns also excluded. See migration 037 for the full exclusion list.

### What Market may expose

| Field | Expose in Market? |
|---|---|
| Property type, price, location, island | ✓ Yes |
| Bedrooms, bathrooms, sqm | ✓ Yes (where populated) |
| Photos | ✓ Yes |
| Agency name | ✓ Yes — consistent with public index |
| Agency contact (phone/WhatsApp) | ✓ Yes — broker may want to refer a buyer |
| Listing ID / shareable link | ✓ Yes — broker shares with buyers |

### What Market must never expose

| Data | Why |
|---|---|
| `reviewer_notes`, `reviewed_by` | Admin editorial — internal only |
| `claimed_status`, `data_partner_status`, `source_ids` | Internal pipeline classification |
| `agency_relationships.*` | Internal CRM |
| Any other agency's `leads` data | Broker-owned data |
| Lead volumes or enquiry counts per listing (other agencies) | Private demand signal |
| `agency_data_quality_snapshots` | Internal quality metrics |
| Price history | Reserved for future paid Intelligence tier |
| Internal quality scores or review status | Admin-only context |

### RLS requirement

Market Access reads from `public.v1_feed_cv`, which is already publicly readable (anon key) — the same access used by kazaverde.com. No additional RLS work is required for Market Access specifically.

The "own agency only" RLS constraint applies to the My Agency side (`broker_pilot_listings` / `agency_listings`). Market Access is a separate read path against the public feed and does not conflict with it.

The broker app has two distinct read paths:

```
My Agency  →  broker_pilot_listings / agency_listings   (RLS: own agency only)
Market     →  broker.market_listings_view               (public feed, no agency scoping needed)
```

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
  Navigation: Option B preferred (Today | Leads | Listings | Market); fall back to Option A (Inbox | Listings | Market | More) — not locked until pilot feedback
  Listings module: CRUD using broker_pilot_listings (scoped to demo agency)
  Inbox module: requires new leads table migration
  Website module: public agency page (static render from agencies table)
  Performance: placeholder tiles only (in More drawer)
  Market module: read-only browse of active published listings; search + filter
    - Data source: broker.market_listings_view (migration 037, wrapper over public.v1_feed_cv)
    - Do NOT use broker_pilot_listings — that is the broker's own agency listings, not the public market feed
    - Filters: island, price range, property type, bedrooms
    - Market summary tile: active listing count
    - Comparable view: from a broker's own listing, show similar market listings
    - Share: copy link or WhatsApp share of a market listing
    - No price history, no analytics, no exports
  Still admin-operated (no broker login yet)
  Demo-mode agency selector at top of app

V1 (production)
  Full broker self-login (magic link)
  RLS scoped to broker role — including cross-agency SELECT for Market tab
  Mobile-optimised UI
  Lead notifications (WhatsApp / email)
  Photo upload (Supabase storage)
  Public listing pages and agency URLs
  Portuguese localisation
  Verified badge on published listings
  Market: saved searches
  Market: comparable alert (notify when new listing matches broker's listing profile)

Future / Intelligence tier (V2+, paid)
  Price history charts
  Price per sqm benchmarks by location
  Alerts (new listings matching saved criteria)
  Data exports (CSV)
  Advanced comparable analysis
  Market reports
  Investor-grade analytics
  (Requires data density: ~500+ active listings, 12+ months of history)
```

---

## Design principles

These principles follow from the competitive landscape research (`docs/03-product/broker-tool-competitive-landscape-2026.md`) and must be held through all iterations.

### Mobile-first is a V0 requirement

The target user manages their agency from a smartphone. Mobile-first UX is not a V1 enhancement — it is a launch requirement. Every page, form, and interaction must be designed for a 390px screen first. Desktop layouts are secondary.

The real competitor (Google Sheets + WhatsApp + Facebook) is fully mobile. A tool that requires a laptop to use will not be adopted.

### Broker app stays separate from admin

`arei-broker/` and `arei-admin/` share a Supabase backend but must never share frontend code, routes, or chrome. The broker surface has no sidebar link to admin views, no quality-check language, no pipeline terminology. If a feature makes sense only in the admin context, it belongs only in `arei-admin/`.

### Data acquisition is background value — not the broker proposition

AREI's real business case is structured market data generated by broker usage. This must never appear as the primary value proposition in broker-facing copy, onboarding, or UI. The broker pitch is daily utility: listings, leads, WhatsApp follow-up, and a clean public page. The data flywheel is AREI's concern, not the broker's.

### Schema naming: `broker_pilot_listings` is a temporary name

The table `broker_pilot_listings` was named for the V0 pilot phase. In production, this should be renamed to `agency_listings` or `listings`. No new code should treat `broker_pilot_listings` as a permanent API surface. References should use an abstraction layer (e.g. a `brokerData.ts` constant) that can be updated in one place when the table is renamed.

---

## Related documents

- `docs/03-product/listo-by-arei-product-brief.md` — full product brief, target broker, V0 features, Market Access module (§8), V1 roadmap
- `docs/03-product/broker-pilot-workspace-v0.md` — V0.1 admin pilot spec
- `docs/03-product/broker-pilot-demo-setup.md` — how to apply migrations and seed data
- `docs/03-product/verified-agency-listing-policy.md` — Verified Agency and Verified Listing definitions
- `docs/04-platform/security-baseline.md` — broader security model
- `migrations/037_broker_market_listings_view.sql` — broker.market_listings_view (Market Access data source)
