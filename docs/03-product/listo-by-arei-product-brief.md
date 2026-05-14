# Listo by AREI — Product Brief

**Working name:** Listo by AREI *(working name only — final name TBD; see naming note below)*  
**App/package name:** arei-broker  
**Stage:** Concept → V0 pilot  
**Last updated:** 2026-05-13 (Market Access module added)

> **Naming note:** "Listo by AREI" is a working product name used for UI copy, docs, and internal discussion. The final name depends on domain availability, trademark checks, language checks across target markets, and broker feedback. Do not rename folders, packages, or database concepts to "listo" until the name is confirmed.

---

## 1. Product thesis

Most real estate agencies in African and emerging markets run on WhatsApp, phone calls, and personal relationships. They do not have a shared listing database. They do not have a lead inbox. They lose buyer enquiries because there is no structured place for leads to land. When someone asks "do you have anything in [location]?", the answer is a WhatsApp forward — a photo, a voice note, a price. There is no link to share. No professional page. No follow-up system.

The tools designed to solve this (Casafari, enterprise CRM platforms, portal back-offices) are built for European and US markets. They are too complex, too expensive, and too far from the workflows these agencies actually use. But they are not the real competition.

**The real competitor is Google Sheets + WhatsApp + Facebook.** That combination costs nothing, runs on a phone, and requires zero training. Any tool that replaces it must be faster, simpler, and more useful — not more powerful. The positioning is not "better than Casafari." It is: **"The simplest way to run your agency from your phone."**

Listo by AREI meets agencies where they are — WhatsApp-first, mobile-first, low-friction — and gives them the basics they are missing: a structured listing catalogue, a lead inbox, and a professional public agency page they can share.

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

Design principle: **one screen, one job**. No configuration wizard. No tutorial. A broker should be able to add a listing in under three minutes from their phone.

**Mobile-first is a V0 requirement, not later polish.** Agents work from phones. 71% of real estate professionals in the target markets use mobile as their primary device. If the product is not fully usable on a smartphone at launch, it will not be used. Every page, form, and flow must be designed for a 390px screen before a desktop layout is considered.

Complexity that this product deliberately avoids in V0:
- Automated valuation
- Portal distribution (publishing to third-party sites)
- Document management
- Complicated pipeline stages
- Team/role management
- API integrations
- Native mobile app (mobile web is the target; a native app is a later decision)

---

## 4. What brokers get (free in V0 pilot)

- **Listings catalogue** — add, edit, and manage listings with photos, price, location, status
- **Shareable listing links** — a clean URL for each listing the broker can send via WhatsApp or copy into a message
- **Public agency page** — a simple hosted page showing the agency's active listings and contact details
- **Lead inbox** — buyer enquiries linked to listings, with name, phone, email, message
- **WhatsApp workflow** — one-click WhatsApp CTA on listings and agency page; prefilled messages; mark lead as contacted
- **Follow-up tracking** — set a follow-up date on a lead; see overdue follow-ups at a glance
- **Listing status** — mark listings as active, reserved, sold, or inactive to keep the catalogue current
- **Market Access** — browse, search, and filter public listings across the AREI market; understand what is currently available; compare their own listings with similar market listings at a glance

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
| **Market** | Browse and search public active listings; filter by island, price range, property type, bedrooms; see a simple market overview count |

**Leads table (new — needed for V0):**  
The current schema has no leads table. A `leads` table is needed before the Leads module can be built. See §10 (data model notes).

**Navigation (broker-facing) — options under review:**

Two nav structures are under consideration. Neither is final until tested with brokers. See §8.2 for full rationale.

**Option A:**
```
Inbox | Listings | Market | More
```
"More" drawer: Performance, Website, Profile.

**Option B (preferred starting point):**
```
Today | Leads | Listings | Market
```
Website and Profile accessible via a top-right agency/settings menu.

Do not lock a nav structure before piloting. See §8.2.

---

## 8. Market Access module

### What it is

Market Access gives brokers visibility into what is currently available across the AREI market — not just their own listings. It is a read-only view of the same public listing data that powers AREI's public index surfaces (e.g. kazaverde.com for Cape Verde).

The framing is **market visibility for brokers**, not an intelligence product. A broker should be able to check: "What 3-bed villas are currently listed in Sal? What is the typical asking price?" They should be able to answer a buyer enquiry with real market context, not guesswork.

This creates an explicit and fair give-and-take:
- Brokers contribute structured listing data to AREI.
- Brokers get operational tools **and** visibility into the full market they are operating in.

### Two worlds

The broker workspace has two distinct areas:

**My Agency**
- My listings
- My leads (Inbox)
- My agency page (Website)
- My performance

**Market**
- All active public listings across the AREI market
- Comparable listings to my own
- Simple market overview

These worlds must remain visually and conceptually separate. "My Agency" is the broker's operational workspace. "Market" is a read-only market window. Brokers never edit or claim Market listings.

### Answered product questions

**1. Should Market be a main bottom nav item?**  
Yes. Market is a distinct daily-use job — not a configuration screen. Brokers who are preparing a buyer meeting or responding to an enquiry will open Market regularly. It belongs in the primary bottom nav. The open question is which other items share the bar — see §8.2.

**2. Should Website/Profile move to settings/more?**  
Yes. Website and Profile are set-and-forget configuration screens. They should not occupy a primary nav slot. Whether they live in a "More" drawer (Option A) or a top-right agency/settings menu (Option B) is an open question. See §8.2.

**3. What is the minimum useful Market V0?**  
See §8.1 below.

**4. What data source should Market use?**  
`broker.market_listings_view` — a broker-safe wrapper view over `public.v1_feed_cv`, created in migration 037.

`public.v1_feed_cv` is the canonical public feed that powers kazaverde.com. It contains only curated, approved, published listings. `broker.market_listings_view` selects a fixed broker-safe column subset from it and grants SELECT to `anon` and `authenticated`, matching the public site's access model.

Product rule: **what buyers can already see on the live public site can also be shown inside the broker tool as Market Access.** The live site already has sufficient listing volume for this to be useful. The key issue is not volume — it is using the correct live/public feed.

**Do not use `broker_pilot_listings` as the Market Access source.** That table holds the broker's own agency listings (the My Agency side). It is not the public market feed.

Do not use raw pipeline tables, scraper snapshots, or admin-only diagnostic views. Do not create a new market dataset.

**5. What must not be exposed?**  
- Lead contact details from any agency's `leads` table  
- `reviewer_notes`, `reviewed_by`, `reviewed_at` on any listing  
- `claimed_status`, `data_partner_status`, `source_ids` on agencies  
- `agency_relationships` CRM data  
- `agency_data_quality_snapshots` and `listing_data_issues` tables  
- Any other agency's lead volume or enquiry data  
- Price history (reserved for future paid Intelligence tier)  
- Internal quality scores

**6. What belongs in future paid Intelligence instead?**  
See §8.3 below.

---

### 8.1 Market V0 — minimum useful scope

| Capability | V0 scope |
|---|---|
| **Browse listings** | Paginated list of active public listings across the market |
| **Search** | Keyword search (location name, listing title) |
| **Filter: island/location** | Dropdown or chip filter by island (Sal, Santiago, etc.) |
| **Filter: price range** | Min/max price inputs |
| **Filter: property type** | Apartment, Villa, Land, Commercial (matching listing types) |
| **Filter: bedrooms** | Optional — include if data coverage is sufficient |
| **Market summary tile** | "N active listings in [island]" — simple count, no charts |
| **Listing detail (read-only)** | Photos, price, location, property type, size, agency name |
| **Share a listing** | Copy link or WhatsApp share — so broker can forward to a buyer |
| **Comparable view** | From a broker's own listing: "See similar listings in the market" — filtered by same island + property type, nearby price range |

What is explicitly **not** in Market V0:
- Price history charts
- Price per sqm benchmarks
- Trend lines or YoY comparisons
- Alerts or saved searches
- Exports
- Any form of AVM or valuation estimate

### 8.2 Navigation options — not final until tested

**Do not lock a nav structure before piloting with brokers.** Two options are on the table:

---

**Option A: Inbox | Listings | Market | More**

```
Inbox | Listings | Market | More
```

"More" drawer: Performance, Website, Profile.

- Familiar CRM-style pattern
- "Inbox" maps clearly to the lead workflow brokers already know from WhatsApp
- "More" is a necessary compromise — four items is the practical mobile bottom-nav limit

---

**Option B (preferred starting point): Today | Leads | Listings | Market**

```
Today | Leads | Listings | Market
```

Website and Profile accessible via a top-right agency/settings menu (avatar or gear icon).

- **Today** — daily action hub: overdue follow-ups, new leads, listing activity since last visit. Gives brokers a single place to start their day without hunting across tabs.
- **Leads** — dedicated buyer follow-up tab. Separates lead management from listing management, which is more accurate to how brokers think ("my buyers" vs "my properties").
- **Listings** — own agency inventory, unchanged.
- **Market** — all visible market listings, unchanged.
- Website and Profile move to a persistent top-right menu — consistent with how mobile apps handle account and settings, and these are genuinely infrequent actions.

Option B is more ambitious — it requires a Today screen that doesn't exist yet. But it better reflects the daily broker workflow and avoids the "More" drawer problem.

---

**Decision:** Test Option B in V0.2 pilot. Fall back to Option A if Today screen proves too complex to build before the first agency demo. Do not present either as final to brokers — treat nav as an explicit open variable during the pilot.

### 8.3 Future paid Intelligence tier (not V0, not V1)

These features belong in a future Intelligence product, likely a separate SKU or a paid upgrade within the broker app. They require data at scale and deliberate UX design to be useful:

| Feature | Why it is premium, not free |
|---|---|
| Price history over time | Requires longitudinal data; not available at launch |
| Price per sqm benchmarks by location | Requires sufficient listing density to be statistically meaningful |
| Saved searches + alerts | Requires notification infrastructure |
| CSV / data exports | Enables data re-use; appropriate as a paid feature |
| Advanced comparable analysis | Goes beyond simple visibility into analytical tooling |
| Market reports (PDF/share) | Packaged output for investor or buyer meetings |
| Absorption rate / time-on-market | Requires sold + inactive status history at scale |
| Investor-grade analytics | Out of scope for the agency operational tool |

These features will be clearly labelled in the UI when they appear: "Available in AREI Intelligence" or similar. The free tier must remain genuinely useful without them.

---

## 9. V1 roadmap

| Feature | Notes |
|---|---|
| Broker self-login | Magic link via agency email; Supabase Auth broker role |
| Mobile-responsive polish | V0 is mobile-first by design; V1 refines responsive breakpoints and adds touch-optimised interactions |
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
| Market: saved searches | Save a filter combination; return to it quickly |
| Market: comparable alerts | Notify broker when a new listing matches their own listing's profile |

**Future paid / Intelligence tier (V2+):**

| Feature | Notes |
|---|---|
| Price history charts | Requires longitudinal data at scale |
| Price per sqm benchmarks | Requires listing density to be meaningful |
| Alerts | New listing alerts matching saved criteria |
| Data exports | CSV/XLSX of market listings |
| Advanced comparables | Comparable analysis beyond simple filter matching |
| Market reports | Packaged PDF/share output for buyer or investor meetings |
| Absorption rate / time-on-market | Requires historical status data |
| Investor-grade analytics | Separate product consideration |

---

## 10. Data model notes

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

## 11. Interview questions for broker meetings

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

## 12. Competitive context

> Full competitive landscape research: `docs/03-product/broker-tool-competitive-landscape-2026.md`

### What this product is competing against

**The real competitor is Google Sheets + WhatsApp + Facebook Pages.** That is what small agencies in Cape Verde, Nairobi, and Lagos use today. Combined cost: $0. Any tool that replaces this stack must win on speed, simplicity, and mobile usability — not on features.

Enterprise tools (Casafari, Propertybase, kvCORE) are irrelevant for this market. They cost $400–$1,400/month, require MLS/European portal infrastructure, and solve problems small African agencies do not have. This product is not a Casafari replacement.

General-purpose CRMs (HubSpot, Zoho, Pipedrive) are overbuilt. Teams use roughly 20% of CRM features they pay for. Building a "full CRM" is not the goal. Building something simpler than a spreadsheet is.

WhatsApp CRM tools (Kommo, Callbell) handle messaging but do not manage listings, publish agency pages, or generate structured property data. Close but not complete.

### Reference products (not targets)

**ImobiBrasil** (Brazil, ~$10/mo) is the strongest practical reference. It uses AI to parse WhatsApp voice notes into property listings, syndicates to local portals, and targets small agencies. Proven model, right price point, right complexity level. AREI's V0 is roughly "ImobiBrasil for Africa — without the AI, with the structured data angle."

**Socia** (Portugal) proves the AI-first vision: unified inbox across WhatsApp/email/SMS, AI lead qualification, AI-generated marketing materials. Not the immediate target — this is V2+ ambition. Do not position V0 as an AI product.

**PropCon** (South Africa, ~$13/mo) proves African agencies will pay for a simple listing + CRM + portal syndication tool. Functional proof of concept, no AI, SA only.

### Positioning

> "The simplest way to run your agency from your phone."

Not "the most powerful." Not "AI-powered." Not "the future of real estate." Simple. Phone. Your agency. Today.

### What not to build in V0

- Market intelligence or comparable sales analysis (requires data scale first)
- Transaction management or document generation
- Commission tracking or accounting
- Desktop-first features
- Complex reporting or BI dashboards
- Portal syndication (V1 feature, after proving daily utility)
- AI-assisted listing creation (V1, reference: ImobiBrasil architecture)
- Anything that requires training or a configuration wizard

### How AREI wins

The data generated by broker usage is the real business value — every listing entered is a structured market data point. This is AREI's background value proposition, not the broker's. Do not lead with data, analytics, or market intelligence in the broker-facing product. The broker pitch is: **daily utility**. The AREI business case is: structured market data at scale.

---

## 13. What this product is not (summary)

- Not a portal (Listo does not aggregate listings from multiple agencies for a buyer to browse — that's kazaverde.com)
- Not a valuation tool
- Not a document management system
- Not a mortgage or finance calculator
- Not a competitor to the agencies' own websites (it complements them)
- Not a complex CRM with pipeline stages and reporting
- **Market Access is not an intelligence product** — it is market visibility. Price history, benchmarks, and analytics belong in a future paid Intelligence tier, not in the free broker workspace
- **Market Access is not a buyer-facing portal** — brokers may share individual listings with buyers, but the Market tab is a broker-facing tool for market awareness, not a consumer product

---

## 14. Relationship to the AREI admin tools

The admin-side tools (Agency Console, Agency Data Console, Broker Pilot Preview) are **internal AREI infrastructure**. They are used by AREI staff to:

- Track agency relationships
- Review and approve listings before they appear on the public index
- Run data quality checks
- Apply editorial controls

These tools are **not** visible to brokers. They should not influence the broker product's design or language.

The broker sees Listo. AREI sees the admin tools. The Supabase backend is shared, but the surfaces are completely separate.

---

## 15. Open questions

- **Product name:** "Listo by AREI" is the working name. Confirm before launch. Check trademark conflicts.
- **Domain:** `listo.arei.io` or `listo.kazaverde.com` (Cape Verde pilot only)?
- **Language:** Portuguese-first or English-first for the Cape Verde market?
- **Pricing:** Free forever? Freemium? Subscription for V1 features?
- **Leads table migration:** Which migration number? Apply before building leads module.
- **Listing page hosting:** Where does `listo.arei.io/agency-slug/listing-id` resolve?
- **Market data source — resolved:** `arei-broker` Market tab reads from `broker.market_listings_view` (migration 037), a broker-safe wrapper over `public.v1_feed_cv`. Decision closed.
- **Market share link:** When a broker shares a Market listing with a buyer, where does the link resolve — the AREI public surface (kazaverde.com) or a Listo-hosted listing page? Resolve before building share flow.
- **Agency name display in Market:** Should the listing agency's name be visible in Market, or should it be anonymised? Current lean: show agency name, as it enables broker-to-broker referrals and is consistent with how AREI public surfaces work.
- **Intelligence tier timing:** When does the paid Intelligence tier become viable? Requires meaningful data density (likely 500+ active listings and 12+ months of history). Do not surface Intelligence features until the data supports them.
