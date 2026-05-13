# Listo by AREI — Product Brief

**Working name:** Listo by AREI *(working name only — final name TBD; see naming note below)*  
**App/package name:** arei-broker  
**Stage:** Concept → V0 pilot  
**Last updated:** 2026-05-12

> **Naming note:** "Listo by AREI" is a working product name used for UI copy, docs, and internal discussion. The final name depends on domain availability, trademark checks, language checks across target markets, and broker feedback. Do not rename folders, packages, or database concepts to "listo" until the name is confirmed.

---

## 1. Product thesis

Most real estate agencies in African and emerging markets run on WhatsApp, phone calls, and personal relationships. They do not have a shared listing database. They do not have a lead inbox. They lose buyer enquiries because there is no structured place for leads to land. When someone asks "do you have anything in [location]?", the answer is a WhatsApp forward — a photo, a voice note, a price. There is no link to share. No professional page. No follow-up system.

The expensive tools that solve this (Casafari, Agency CRM platforms, portal back-offices) are built for European and US markets. They are too complex, too expensive, and too far from the workflows these agencies actually use.

Listo by AREI offers 80% of the practical value at 20% of the complexity. It meets agencies where they are — WhatsApp-first, mobile-friendly, low-friction — and gives them the basics they are missing: a structured listing catalogue, a lead inbox, and a professional public agency page they can share.

AREI benefits in the background: structured listing data, active/inactive/sold status, price history, lead demand signals, and agency attribution — all feeding into the Africa Real Estate Index. The value exchange is explicit, not hidden. Agencies get a free useful tool. AREI gets structured data.

---

## 2. Target broker

**Primary:** Small to mid-sized real estate agencies in Cape Verde (initial market). Typically 1–10 agents. Owner-operated or family-run. Most listings are residential — villas, apartments, land. Mix of local buyers and international buyers (diaspora, European expats).

**Secondary (V1+):** Agencies in other AREI markets as the platform expands. Same profile: relationship-first, WhatsApp-heavy, underserved by existing software.

**What they are not:** Large franchise brokerages with their own tech teams. Corporate real estate firms. Portals or aggregators.

### Typical agency pain points

- "Our listings exist only in WhatsApp groups and my head."
- "I have to manually copy-paste listing info every time someone asks."
- "We get enquiries on Facebook Messenger, WhatsApp, email — we lose track."
- "We don't have a proper website. We use Instagram, but it's not organised."
- "I want to send a client a professional-looking listing link, not a screenshot."
- "We don't know which listings are getting interest."

---

## 3. Why simple beats complex

This product is not a feature-by-feature replacement for advanced broker software. The product focuses on the simple daily layer most agencies actually need: listings, leads, WhatsApp follow-up, and a clean public page.

An agency with 3 agents does not need automated AVM valuation, market trend reports, or CRM pipeline stages with 15 status fields. They need:

1. A list of their properties — with photos, price, location.
2. Somewhere for leads to land.
3. A way to follow up without losing track.
4. A link they can share on WhatsApp.

Design principle: **one screen, one job**. No configuration wizard. No tutorial. A broker should be able to add a listing in under three minutes.

Complexity that this product deliberately avoids in V0:
- Automated valuation
- Portal distribution (publishing to third-party sites)
- Document management
- Complicated pipeline stages
- Team/role management
- API integrations
- Mobile app (mobile web only in V0)

---

## 4. What brokers get (free in V0 pilot)

- **Listings catalogue** — add, edit, and manage listings with photos, price, location, status
- **Shareable listing links** — a clean URL for each listing the broker can send via WhatsApp or copy into a message
- **Public agency page** — a simple hosted page showing the agency's active listings and contact details
- **Lead inbox** — buyer enquiries linked to listings, with name, phone, email, message
- **WhatsApp workflow** — one-click WhatsApp CTA on listings and agency page; prefilled messages; mark lead as contacted
- **Follow-up tracking** — set a follow-up date on a lead; see overdue follow-ups at a glance
- **Listing status** — mark listings as active, reserved, sold, or inactive to keep the catalogue current

V0 pilot is free. No credit card. No contract. Explicit understanding that listing data is shared with and indexed by AREI (see §6).

---

## 5. What AREI gets

- **Structured listing data** — price, location, property type, size, photos — in a machine-readable format, submitted by the listing agency
- **Listing lifecycle data** — status changes (active → reserved → sold) and price changes, timestamped, attributed to the agency
- **Agency attribution** — every listing has a verified agency attached. No scraped orphan data.
- **Lead demand signals** — which listing types, locations, and price ranges generate buyer enquiries (aggregate and anonymised)
- **Market intelligence** — active supply, price movements, time-to-sale signals as the dataset grows
- **Publisher relationships** — agencies become active data partners rather than passive scrape targets

This data feeds the AREI index and, over time, the intelligence layer that powers market analysis products.

---

## 6. What is explicit in the terms

Agencies must understand and agree to:

1. Their listing data (property details, price, photos, location) will be indexed by AREI and may appear on AREI-powered public surfaces (e.g. kazaverde.com for Cape Verde).
2. AREI does not resell individual listing data to third parties. It uses the data to power its own index and market analysis.
3. Agencies retain ownership of their listing data and can remove listings from Listo at any time.
4. Lead data (buyer names, emails, phone numbers) belongs to the agency. AREI does not use lead contact details.
5. Aggregate demand signals (e.g. "enquiries on 2-bed apartments in Sal rose 15% this quarter") may be used in AREI market reports. No individual contact data.
6. The pilot is free. AREI may introduce pricing in future; agencies will be given notice and the option to export their data.

This should be a short, plain-language agreement — not a 12-page terms of service. Plain English, translated into Portuguese for the Cape Verde market.

---

## 7. V0 features

V0 is admin-operated: an AREI staff member creates the agency account, adds the first listings on the agency's behalf (with the agency's sign-off), and walks through the workspace in a demo meeting. The broker does not log in yet in V0.

| Module | V0 scope |
|---|---|
| **Listings** | Create, edit, status (active/reserved/sold/inactive), photos (URLs), price, location, bedrooms, bathrooms, sqm, description, property type |
| **Leads** | View lead inbox, lead detail (name, phone, email, message, linked listing), status (new/contacted/viewing booked/negotiating/lost/closed), follow-up date, notes |
| **WhatsApp** | One-click WA CTA on listing and agency page, prefilled message with listing link, mark lead as contacted, copy buyer details |
| **Agency website** | Public agency profile page, active listings, contact buttons, WhatsApp CTA, shareable agency URL |
| **Performance** | Listing views (placeholder), leads per listing, WA clicks, contact clicks |
| **Profile** | Agency name, description, contact person, email, phone, WhatsApp, logo URL |

**Leads table (new — needed for V0):**  
The current schema has no leads table. A `leads` table is needed before the Leads module can be built. See §9 (data model notes).

**Navigation (broker-facing):**
```
Inbox | Listings | Website | Performance | Profile
```

---

## 8. V1 roadmap

| Feature | Notes |
|---|---|
| Broker self-login | Magic link via agency email; Supabase Auth broker role |
| Mobile-optimised UI | Current V0 is desktop-first; V1 targets mobile |
| Lead notifications | WhatsApp message or email when a new lead arrives |
| Listing page (public) | Hosted at `listo.arei.io/[agency-slug]/[listing-id]` or similar |
| Agency page (public) | Hosted at `listo.arei.io/[agency-slug]` |
| Photo upload | Direct file upload (S3/Supabase storage); V0 uses URL input |
| Multi-agent accounts | Multiple users per agency |
| Lead import | Import enquiries from WhatsApp/email manually |
| Price history | Track and display price changes on a listing |
| Verified badge | Show "Verified by AREI" on listings that have been reviewed and published |
| Market data light | Simple market context: avg price per sqm in [island], trend vs last quarter |
| CSV export | Export listings and leads |
| Portuguese UI | Full localisation for Cape Verde market |

---

## 9. Data model notes

### Existing tables (reuse)

- `broker_pilot_listings` → reuse as the listing store. Rename to `listings` or `agency_listings` in V1. For V0, reuse as-is.
- `agencies` → agency profile (broker-safe fields only on broker surface)
- `agency_listing_submissions` → available for correction submissions but not the primary product

### New table needed: `leads`

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id),
  listing_id uuid references broker_pilot_listings(id),
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  buyer_whatsapp text,
  message text,
  source text default 'manual', -- 'form' | 'whatsapp' | 'manual' | 'email'
  status text not null default 'new',
  -- 'new' | 'contacted' | 'viewing_booked' | 'negotiating' | 'lost' | 'closed'
  follow_up_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

This table is **broker-owned data** — lead contact details belong to the agency and must never be indexed or included in AREI's public data layer.

---

## 10. Interview questions for broker meetings

Use these to validate the product before building:

**Daily workflow**
1. Walk me through what happens when a new buyer contacts you. How does that enquiry reach you — WhatsApp, phone, email?
2. When someone asks "what do you have available in [location]?" — what do you send them?
3. How do you keep track of who has asked about which property?
4. How do you know when a buyer is ready to move? How do you follow up?

**Listings**
5. Where do your listings currently live? (Instagram, WhatsApp, a website, a spreadsheet?)
6. How many active listings do you have right now?
7. What happens to a listing when it goes under offer? When it sells?
8. Do buyers ever ask for a link to a listing? What do you send?

**Software**
9. Do you use any software for listings or clients right now? What do you like about it? What's annoying?
10. What's the main thing that falls through the cracks in your current process?

**Listo**
11. If you had a simple tool where you could add listings, get buyer enquiries, and share a professional link — what would make you actually use it every day?
12. What would stop you from using it?
13. Would you be willing to have your listings appear on the AREI index? What would you need to know first?

---

## 11. What this product is not

- Not a portal (Listo does not aggregate listings from multiple agencies for a buyer to browse — that's kazaverde.com)
- Not a valuation tool
- Not a document management system
- Not a mortgage or finance calculator
- Not a competitor to the agencies' own websites (it complements them)
- Not a complex CRM with pipeline stages and reporting

---

## 12. Relationship to the AREI admin tools

The admin-side tools (Agency Console, Agency Data Console, Broker Pilot Preview) are **internal AREI infrastructure**. They are used by AREI staff to:

- Track agency relationships
- Review and approve listings before they appear on the public index
- Run data quality checks
- Apply editorial controls

These tools are **not** visible to brokers. They should not influence the broker product's design or language.

The broker sees Listo. AREI sees the admin tools. The Supabase backend is shared, but the surfaces are completely separate.

---

## 13. Open questions

- **Product name:** "Listo by AREI" is the working name. Confirm before launch. Check trademark conflicts.
- **Domain:** `listo.arei.io` or `listo.kazaverde.com` (Cape Verde pilot only)?
- **Language:** Portuguese-first or English-first for the Cape Verde market?
- **Pricing:** Free forever? Freemium? Subscription for V1 features?
- **Leads table migration:** Which migration number? Apply before building leads module.
- **Listing page hosting:** Where does `listo.arei.io/agency-slug/listing-id` resolve?
