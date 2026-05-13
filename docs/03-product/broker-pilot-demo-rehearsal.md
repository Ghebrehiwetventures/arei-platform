# Broker Pilot Workspace — Demo Rehearsal Report

**Rehearsal date/time:** 2026-05-12, 19:03 UTC  
**Rehearsed by:** Claude (automated end-to-end verification)  
**Environment:** arei-admin dev server, port 5200, connected to live Supabase (bhqjdzjtiwckfuteycfl)  
**Migrations applied:** 031, 032, 033  
**Seed applied:** broker_pilot_demo_seed.sql

---

## What worked

### Database
- All 7 required tables created and accessible via REST: `agencies`, `agency_relationships`, `agency_listing_links`, `agency_listing_submissions`, `listing_data_issues`, `agency_data_quality_snapshots`, `broker_pilot_listings`
- Demo agency loaded: Archipelago Real Estate (DEMO), contact Maria da Silva, Cape Verde
- 8 pilot listings seeded with correct status distribution: 5 draft, 1 ready_for_review, 2 published
- 3 submissions seeded: 1 submitted, 1 approved, 1 rejected
- Internal CRM record created (agency_relationships) — never exposed to broker surface

### Broker Pilot Workspace (BrokerPilotView)
- **Pilot banner** renders correctly: amber "PILOT WORKSPACE" label with admin simulation disclaimer
- **Agency selector** auto-selects Archipelago Real Estate (DEMO) on load
- **Agency profile card** renders: name, public display name (Archipelago Real Estate), Cape Verde, description, Maria da Silva, email, phone, WhatsApp — all correct
- **Stat tiles** show accurate counts: Draft 5 / For Review 1 / Published 2
- **Listing list** shows all 8 listings with thumbnails, prices, locations, status badges
- **Quality issue chips** display correctly on weak listings:
  - "1 required" chip on missing-price apartment and missing-photos land plot
  - "1 recommended" chip on missing-sqm townhouse
  - ✓ on fully complete listings

### Quality checklist (expanded panel)
- **Missing price listing**: ✗ Price included (with detail), ✓ Photos, ✓ Location — "Mark ready for review" button **disabled** as expected
- **Ready-for-review listing** (4-bed Rabil villa): all 6 checks ✓, Publish / Reject / Return to draft buttons **enabled**
- Reviewer notes field labelled "Admin only, not visible to broker" in every expanded panel

### Public preview card
- Hero image renders (picsum placeholder images load correctly)
- Photo count badge ("1 / 6") visible on corner
- "PREVIEW" label overlaid on image
- Price, spec chips (bed/bath/m²), title, location, description clip all render correctly
- Agency attribution: "ARCHIPELAGO REAL ESTATE · AREI INDEX" at card footer
- No internal fields anywhere in the preview

### Status transitions (all verified with live Supabase writes)
- **draft → ready_for_review**: clicked "Mark ready for review" on fully-passing listing → status updated, button set changed
- **ready_for_review → published**: clicked "Publish" → Published count went from 2 to 3, For Review dropped to 0
- **published → draft**: clicked "Return to draft" → listing returned to draft, "Mark ready for review" button re-appeared and was enabled
- **draft → ready_for_review** (restore): re-marked ready for review → back to original seed state

### Intake form (IntakeFormModal)
- Opens via "+ Add listing" button, no crash
- Contact fields pre-filled from agency: Maria da Silva, demo@archipelago-cv.example, +238 991 0000
- Live quality checklist updates on every keystroke:
  - Typing price: ✗ Price → ✓ Price (instant)
  - Typing island: ✗ Location → ✓ Location (instant)
  - Photo URL count indicator updates in real time
  - Char count under description updates in real time
- "Cancel" closes form without side effects

### Admin review flow (AgencyDataConsoleView)
- Review queue tab loads, shows the pending `update_existing` submission correctly
- Agency name, submission type (Update), listing reference, date all render
- Proposed changes payload displayed: Notes, Price (295000), Currency (EUR)
- "Reviewer notes (internal, never shown to agency)" label correct
- **Approve**: wrote reviewer notes "Price correction verified. Updated in pipeline.", clicked Approve → status badge changed to "Approved", notes saved to Supabase and persisted (verified via REST API query)
- **Reject** and **Needs more info** buttons confirmed present and enabled on pending submissions

### Broker-safe surface audit
Zero instances of any forbidden field found in BrokerPilotView at any point:

| Field | Present in rendered page |
|---|---|
| `meeting_booked` (relationship_status) | ✗ Not found |
| `AREI Founding Team` (internal_notes content) | ✗ Not found |
| `very receptive` (internal_notes content) | ✗ Not found |
| `data exclusivity` (internal_notes content) | ✗ Not found |
| `lead_quality` | ✗ Not found |
| `relationship_owner` | ✗ Not found |
| `data_partner_status` | ✗ Not found |
| `claimed_status` | ✗ Not found |

`reviewer_notes` is rendered only as a textarea (value not in `innerText`) inside the admin-labelled "Publish status" section. The text "Admin only, not visible to broker" label confirmed present.

---

## What failed / issues found

### 1. Env var setup requires manual step before first run
**Severity:** Operational (not a bug)  
The `vite.config.ts` sets `envDir: ".."` — Vite reads `.env` files from the worktree root, not from `arei-admin/`. The `.env.local` must be placed at the worktree/repo root (one level above `arei-admin/`), not inside `arei-admin/` itself. If it is in the wrong place, the app loads but React fails to mount with "supabaseUrl is required."

**Fix applied:** `.env.local` placed at the worktree root. Documented in setup guide.

### 2. Agency Data Console listing quality shows zeros for demo agency
**Severity:** Demo note (expected behaviour, not a bug)  
The "Listing quality" tab in AgencyDataConsoleView shows 0 listings and 0 quality score for the demo agency because the agency has `source_ids = '{}'` — it has no scraped pipeline listings linked. The quality console is designed for pipeline listings (scraped), not pilot listings. The data is correct; the demo agency has no scraped sources.

**Demo handling:** Navigate away from "Listing quality" tab immediately. The "Review queue" tab is the relevant demo target for AgencyDataConsoleView. Or explain: "This tab shows listings we already found from your website. Since we just created your agency record, this will populate once we link your sources."

### 3. "Open submissions" stat tile shows 0 in AgencyDataConsoleView
**Severity:** Visual (cosmetic)  
The tile counts from `agency_data_quality_snapshots` which is written by `writeAgencyQualitySnapshot()`. This function is only called when listing quality rows are loaded — which requires `source_ids`. Since the demo agency has no source IDs, the snapshot is never written and the tile stays at 0, even though there are 3 real submissions in the review queue.

**Demo handling:** The review queue tab shows the submissions correctly. Do not highlight the stat tile during the demo. The tile will populate naturally once source IDs are linked.

### 4. Stale listing not flagged in pilot quality checklist
**Severity:** Minor (known design decision)  
The seeded Studio apartment (Praia, Santiago) is 90 days old but the pilot quality checklist (`computePilotQualityChecks`) does not include a staleness check — that check lives in the pipeline quality scoring (`agencyDataConsole.ts`). The listing still demonstrates age visually via its `created_at` date but no quality chip appears for it.

**Demo handling:** Do not highlight the stale listing as a "stale" quality example. Use it as a general draft listing. Staleness detection in the pilot feed is V1 scope.

---

## Screenshots needed before broker meeting

None strictly required — the demo runs live. However, for backup (in case of internet outage or Supabase downtime):

- [ ] Screenshot of agency profile card
- [ ] Screenshot of quality checklist with ✗ on missing price
- [ ] Screenshot of quality checklist with all ✓ (ready for review listing)
- [ ] Screenshot of public preview card
- [ ] Screenshot of intake form with live checklist sidebar

---

## Final checklist before broker meeting

**Setup (do once, ~10 minutes):**
- [x] Migrations 031, 032, 033 applied to Supabase
- [x] Demo seed applied
- [x] `.env.local` placed at repo root (above `arei-admin/`)
- [ ] Run `npm run dev` inside `arei-admin/` and confirm app loads at `http://localhost:5200` (or default port)
- [ ] Confirm "Archipelago Real Estate (DEMO)" appears in agency selector
- [ ] Confirm listing count: 8 listings, Draft 5 / For Review 1 / Published 2
- [ ] Open kazaverde.com in a second browser tab (public surface reference)

**Pre-meeting checks (5 minutes before):**
- [ ] Dev server is running and not showing a blank screen
- [ ] Broker Pilot tab is active in the sidebar
- [ ] Agency selector shows "Archipelago Real Estate (DEMO)"
- [ ] 8 listings visible
- [ ] Quality issue chips visible on at least 2 draft listings
- [ ] "Ready for review" badge visible on the 4-bed Rabil villa

**Tabs to have open:**
1. `http://localhost:5200` → Broker Pilot tab
2. `kazaverde.com` → public surface (for "this is what buyers see")

**Tabs to keep closed / hidden:**
- Agency Console tab (internal CRM — not for broker)
- Agency Data Console tab (open only if asked, go straight to Review Queue)
- Any raw Supabase dashboard views

---

## Recommended meeting flow

Based on this rehearsal, the following sequence takes approximately 12 minutes and covers all demo goals:

1. **(2 min)** Context: what AREI is, why you're here — see meeting script
2. **(1 min)** Show agency profile card — "this is how you appear on the Index"
3. **(2 min)** Show listing list — point to quality chips on weak listings, explain required vs recommended
4. **(1 min)** Expand missing-price listing — show disabled "Mark ready for review", explain why
5. **(1 min)** Expand Rabil villa (ready for review) — show all ✓, active Publish button, public preview
6. **(1 min)** Click Publish — watch stat tiles update live, listing badge changes
7. **(2 min)** Open intake form — fill title/price/island, show live checklist updating in real time
8. **(2 min)** Close / wrap — what you get, pilot ask, next steps

Restore the published listing to ready_for_review after the demo if planning to show another broker the same data.

---

## Known limitations to disclose if asked

| Question | Honest answer |
|---|---|
| "Can I log in myself?" | Not yet — this is an admin simulation. Your own login is V1. We're demoing the workflow first. |
| "Will I get notified when you approve?" | Not automatically yet. We'll message you directly in the pilot. Notifications are V1. |
| "Where are my actual listings from my website?" | They show in a separate tab (Agency Data Console → Listing quality). We link your website source once we've confirmed the relationship. |
| "How long until it's live after you approve?" | Same day. Once we publish, it appears on kazaverde.com immediately. |
| "Can other agencies see my listings?" | All published listings appear on the public index. Your data belongs to you — AREI attributes it to your agency. |
| "What happens to photos?" | We reference your photo URLs directly. We don't copy or host them. If your website is down, the photos won't display. |
| "Is this just Cape Verde?" | Cape Verde is market one. The platform is designed for every African market. |

---

## Remaining blockers before showing to a real broker

**None.** The demo is ready.

The only operational requirement before each meeting is starting the dev server and confirming the app loads. Everything else is live data in Supabase.

To reset the demo data between broker meetings, run the reset block in `migrations/seeds/broker_pilot_demo_seed.sql` then re-apply the seed.
