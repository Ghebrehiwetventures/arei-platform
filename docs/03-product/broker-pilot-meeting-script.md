# Broker Pilot — Meeting Script

**Format:** 1-on-1 or small group. Screen share recommended.  
**Duration:** 20–30 minutes (10 demo, 10 Q&A, 10 next steps)  
**Audience:** Agency principal or senior broker  
**Goal:** Get them excited to submit 3–5 listings for the pilot and agree to a follow-up

---

## Before the meeting

- Apply migrations 031–033 and seed data (see `broker-pilot-demo-setup.md`)
- Open `http://localhost:5173` with the admin app running
- Navigate to **Broker Pilot** tab — confirm demo agency loads with 8 listings
- Have a second browser tab open with `kazaverde.com` (the public index) to show what the published surface looks like

---

## 1. Context (2 minutes)

**What to say:**

> "Thanks for making time. I want to show you something we've been building — it's early, but it's far enough along to be worth your reaction.
>
> You know the problem: buyers searching for property in Cape Verde — or Ghana, Morocco, anywhere on the continent — can't find a single reliable place to search. They land on dozens of different sites, half the listings are outdated, prices are missing, photos are broken.
>
> We're building the Africa Real Estate Index. One index, every market, live data. The same way you'd look up a stock — the listing exists once, correctly, and every buyer finds it.
>
> Cape Verde is our first market. We've already indexed [X] listings. But indexed listings from scrapers only get us so far. The best data comes directly from agencies like yours. That's why you're here."

---

## 2. Show the agency profile (2 minutes)

Navigate to the **Broker Pilot** tab. The demo agency "Archipelago Real Estate" is pre-selected.

**What to say:**

> "This is what your agency looks like in the system. Name, contact, description, website. This is the profile that will appear next to any listing attributed to your agency.
>
> When a buyer finds one of your properties on the Index, they'll see this — your name, your contact, a link to your site. Your brand, not ours.
>
> We control what appears publicly. You control the data."

**Point out:**
- The agency name and public display name
- Contact information
- The market tag (Cape Verde)

---

## 3. Show the listing quality overview (3 minutes)

Scroll to the listing list. Show the stat tiles (Draft / For review / Published).

**What to say:**

> "When you submit listings to us, this is what you'll see. Every listing goes through a quality check before it's published.
>
> This isn't arbitrary. Buyers leave the Index when they hit a listing with no price, or three broken photos. Our quality check is the gatekeeper that keeps the Index trustworthy."

Click on a weak listing — the "Missing price" apartment or the "Missing photos" land plot.

> "This listing can't go live yet. Look — no price. Price is required because listings without a price are excluded from search results. Buyers won't click on 'Price on request' when they're comparing 40 listings.
>
> See this ✗? That's the system telling you exactly what's missing before you even ask for review. Fix it, and you can send it."

Expand the listing to show the quality checklist.

> "Required checks must pass before you can even request a review from us. Recommended checks improve ranking and visibility — they're not blockers, but they matter."

---

## 4. Show the intake form — adding a listing (3 minutes)

Click **+ Add listing**.

**What to say:**

> "Adding a listing is straightforward. We've kept the form to what actually matters — no 40-field forms, no upload portals. Fill in the fields you have. The checklist on the right updates live."

Start typing in the title field. Show the live quality checklist updating.

> "As you fill in each field, the checklist updates. You know exactly where you stand before you hit submit.
>
> For photos, you paste the URLs from wherever you host them — your website, Dropbox, anywhere. We don't touch the photos; we just reference them.
>
> When all required checks are green, this button becomes active." Point to "Mark ready for review."

Close the form without saving.

---

## 5. Show the public preview (2 minutes)

Expand the published villa listing (3-bedroom Sal Rei villa).

**What to say:**

> "Once we approve a listing, this is how it looks on the Index. This is a preview — the real card on kazaverde.com will look similar."

Open `kazaverde.com` in the second tab briefly.

> "Your agency name is there. Your listing, your price, your photos. We attribute it clearly. Buyers who contact us about this listing, we direct to you.
>
> We don't take commission. We don't capture the lead and sell it back to you. The Index is a data product — buyers see the listing, they contact the agency directly."

---

## 6. Show the review flow (1 minute, optional)

Expand the "Ready for review" listing (4-bed Rabil villa).

**What to say:**

> "When a listing is ready, you mark it for review. We look at it. If everything checks out, we publish. If we need something, we'll be in touch.
>
> Right now this is manual — we'll review within 24 hours. As the pilot scales, this becomes more automated. But in V0, you have a direct line to us."

Don't dwell on Publish / Reject buttons — those are admin controls, not broker-facing.

---

## 7. What Verified Agency means (1 minute)

**What to say:**

> "In the pilot, your agency is invited, not yet verified. Verification means your listings get a badge on the Index — it signals to buyers that the data came directly from the agency, not a scraper.
>
> To become verified, you submit your first listings through this system, we publish them, and we confirm the agency relationship. It's a simple process.
>
> We're doing this with five agencies in Cape Verde right now. There are slots. Once they're filled, the next agencies go on a waitlist."

---

## 8. What the broker gets (1 minute)

Summarise clearly:

> "Here's what you get from the pilot:
> - Your listings on the Africa Real Estate Index, with your branding
> - A quality checklist before publication — you know exactly what buyers see
> - Attribution: every listing links back to your agency
> - Direct buyer contact — we don't intermediate
> - Verified Agency status once the pilot listings are live
>
> What we ask: submit 3–5 listings through this form. Give us honest data — price, photos, size. We handle the rest."

---

## 9. What is not yet built (1 minute — be honest)

**What to say:**

> "I want to be straight about where we are. This is a pilot. A few things aren't built yet:
>
> - You don't have your own login. Right now I'm showing you an admin simulation — in a later version, you'd log in yourself and manage your listings directly.
> - There's no notification when a listing is approved or rejected. We'll message you directly for now.
> - Analytics — you won't see how many buyers viewed your listings yet. That's coming.
>
> None of that blocks the core thing: getting your listings on the Index and in front of buyers. That part works today."

---

## 10. Close and next steps (3 minutes)

**What to say:**

> "I'd like to get 3–5 of your listings into this before our next call. Ideally your strongest listings — the ones you'd put on the front page of your website.
>
> I can walk you through the form on this call if you have them handy, or I can send you the link and you fill them in. Whichever is easier."

**Aim to agree on:**
- [ ] Number of listings they'll submit (target: 3–5)
- [ ] Who from their team will submit them (Maria / Carlos / themselves)
- [ ] A follow-up date to review what went live
- [ ] Any reservations to address before follow-up

---

## Common objections and responses

**"We already list on [other portal]."**
> "That's fine — the Index doesn't require exclusivity. We want your data to be correct wherever it appears. If it's on our Index and on your site, buyers find it in more places."

**"We don't want buyers bypassing us."**
> "The listing points to you. We don't have a CRM that captures buyer contact details and sells them as leads. The buyer finds the listing on the Index and calls your number."

**"Our photos are on our website — we can't move them."**
> "You don't need to. Paste the URL from your website. That's all we need."

**"What happens when a listing sells?"**
> "You tell us, we mark it sold. It disappears from the public feed within 24 hours. That's one of the submission types — 'Availability update'. You don't need to log in and delete anything."

**"This is very basic."**
> "Yes. V0.1 is deliberately narrow. It does one thing — gets your listings live on the Index with correct data. We build from here."

**"How do buyers actually find this?"**
> "kazaverde.com — the Cape Verde Real Estate Index. It's live today. [Open tab.] This is where your listings appear once we publish them."

---

## After the meeting

- Send a follow-up within 24 hours confirming what was agreed
- If they're ready to submit: share the intake workflow (this is currently admin-only — you'll submit on their behalf using their data, or run the admin screen with them via video call)
- Log the outcome in Agency Console → update relationship status accordingly
- If they're not ready: note follow-up date in `next_follow_up_at`

---

## What not to show

- The **Agency Console** tab — this has internal CRM data (lead quality, internal notes, outreach status). Not for broker eyes.
- The **Agency Data Console** tab — pipeline quality scoring and correction review queue. Internal tool.
- Reviewer notes on individual listings — these are admin-only, never for broker.
- The `claimed_status` or `data_partner_status` fields anywhere.
