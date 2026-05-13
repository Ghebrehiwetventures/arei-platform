# Broker Pilot Workspace — Demo Setup Guide

**Audience:** AREI founding team  
**Purpose:** Get a live, demo-ready Broker Pilot Workspace running before a broker meeting  
**Time required:** ~10 minutes (migrations + seed + verify)

---

## Prerequisites

- Access to the Supabase project dashboard (SQL Editor)
- The `arei-admin` app running locally (`npm run dev` inside `arei-admin/`)
- Migration files and seed file from this repo

---

## Step 1 — Apply migrations in order

Open the Supabase dashboard → SQL Editor. Run each migration in order. **Do not skip any.**

### 031 — Agency Console

Contents: `migrations/031_agency_console.sql`

Creates `agencies` and `agency_relationships` tables with RLS.

```
Supabase SQL Editor → New query → paste file contents → Run
```

Expected output: no errors. Tables visible in Table Editor.

### 032 — Agency Data Console

Contents: `migrations/032_agency_data_console.sql`

Creates `agency_listing_links`, `agency_listing_submissions`, `listing_data_issues`, `agency_data_quality_snapshots`.

### 033 — Broker Pilot Workspace

Contents: `migrations/033_broker_pilot_workspace.sql`

Adds `contact_person` column to `agencies`. Creates `broker_pilot_listings`.

**Safe on existing database.** Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS`.

---

## Step 2 — Verify migrations ran correctly

In the Supabase SQL Editor, run:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'agencies',
    'agency_relationships',
    'agency_listing_links',
    'agency_listing_submissions',
    'listing_data_issues',
    'agency_data_quality_snapshots',
    'broker_pilot_listings'
  )
order by table_name;
```

Expected: 7 rows returned.

Also check `contact_person` was added:

```sql
select column_name from information_schema.columns
where table_schema = 'public'
  and table_name = 'agencies'
  and column_name = 'contact_person';
```

Expected: 1 row returned.

---

## Step 3 — Apply the demo seed

Contents: `migrations/seeds/broker_pilot_demo_seed.sql`

This inserts:
- 1 demo agency ("Archipelago Real Estate")
- 1 internal CRM relationship record
- 8 pilot listings in mixed quality states
- 3 listing submissions (pending / approved / rejected)

```
Supabase SQL Editor → New query → paste file contents → Run
```

Safe to re-run. All inserts use `ON CONFLICT (id) DO NOTHING` with fixed UUIDs.

---

## Step 4 — Verify seed data

```sql
-- Check agency exists
select id, agency_name, contact_person, claimed_status
from agencies
where id = '11111111-0000-0000-0000-000000000001';

-- Check listings loaded with correct statuses
select title, publish_status, price,
       array_length(image_urls, 1) as photo_count
from broker_pilot_listings
where agency_id = '11111111-0000-0000-0000-000000000001'
order by created_at;

-- Check listing status distribution
select publish_status, count(*)
from broker_pilot_listings
where agency_id = '11111111-0000-0000-0000-000000000001'
group by publish_status;

-- Check submissions
select submission_type, status
from agency_listing_submissions
where agency_id = '11111111-0000-0000-0000-000000000001';
```

Expected listing counts: `draft` = 5, `ready_for_review` = 1, `published` = 2.  
Expected submissions: 1 submitted, 1 approved, 1 rejected.

---

## Step 5 — Open the Broker Pilot Workspace

1. Start the admin app: `npm run dev` inside `arei-admin/`
2. Navigate to `http://localhost:5173` (or wherever Vite binds)
3. Authenticate if required (admin auth gate)
4. Click **Broker Pilot** in the left sidebar

The page will:
- Auto-select "Archipelago Real Estate (DEMO)" from the agency dropdown
- Load 8 pilot listings
- Show stat tiles: 5 draft, 1 for review, 2 published

---

## Step 6 — Confirm the demo flow works

Walk through this checklist before showing to a broker:

**Agency profile card:**
- [ ] Agency name, contact name, email, phone visible
- [ ] Website link renders
- [ ] No CRM fields visible (no relationship status, no lead quality, no internal notes)

**Listing list:**
- [ ] 8 listings appear
- [ ] Status badges render (Draft / Ready for review / Published)
- [ ] Quality issue chips appear on weak listings (red "1 required", amber "2 recommended")

**Expand a draft listing with issues (e.g. "Missing price" apartment):**
- [ ] Quality checklist shows ✗ on price, ✓ on photos and location
- [ ] "Mark ready for review" button is disabled with tooltip

**Expand the "Ready for review" listing (4-bed Rabil villa):**
- [ ] All quality checks are green
- [ ] Publish / Reject / Return to draft buttons are active
- [ ] Reviewer notes field is visible and labelled "Admin only"
- [ ] Public preview card renders correctly

**Intake form (+ Add listing):**
- [ ] Form opens with agency contact pre-filled
- [ ] Live quality checklist in sidebar updates as you type
- [ ] "Ready for review" indicator appears when all required checks pass
- [ ] Saving creates a new draft listing in the list

**Status transitions:**
- [ ] Publish the "Ready for review" listing → status changes to Published
- [ ] Return it to draft → status changes to Draft

---

## Resetting demo data

To wipe and re-seed, uncomment and run the **RESET BLOCK** at the bottom of `migrations/seeds/broker_pilot_demo_seed.sql`, then re-apply the seed from Step 3.

The reset block runs deletes in dependency order (submissions → pilot_listings → relationships → agency). It only deletes rows with the fixed demo UUIDs — it does not touch any other data.

---

## What the demo does NOT show

These are intentionally out of scope for V0.1:

- Broker login or external access (demo is admin simulation only)
- Email or WhatsApp notifications when status changes
- Automated image hosting (photo URLs are entered manually)
- Buyer enquiry inbox
- Analytics or reporting dashboards

These are real features. They are excluded because V0.1 is a pilot to validate the data loop, not a production system.

---

## Agency Console and Agency Data Console

Two other tabs are live in the admin:

**Agency Console** (sidebar: "Agency Console") — internal CRM. Shows relationship status, lead quality, internal notes. Use this to manage your agency outreach. Never show this to a broker.

**Agency Data Console** (sidebar: "Agency Data Console") — listing quality for pipeline (scraped) listings. Shows which listings are missing data, and lets you review agency-submitted corrections. This is where the 3 demo submissions appear.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "No agencies yet" on Broker Pilot page | Seed not applied | Run seed SQL |
| Listings don't load | Migration 033 not applied | Apply migrations in order |
| `contact_person` column error | Migration 033 not applied | Apply 033 |
| Build error after migration changes | Not a migration issue | Run `npx tsc --noEmit` in `arei-admin/` |
| Picsum photos show generic images | Expected behaviour | Picsum returns placeholder images by seed — this is correct for demo |
