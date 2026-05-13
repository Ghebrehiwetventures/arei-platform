# AREI Broker Tool: Competitive Landscape Research

**Date:** May 13, 2026  
**Objective:** Map the competitive landscape for real estate broker tools in African and emerging markets to inform the design and positioning of AREI's broker-facing product.

---

## 1. Executive Summary

- **No purpose-built broker tool exists for small real estate agencies in Sub-Saharan Africa.** The market is wide open. Small agencies (3–10 people) manage their entire business with Excel/Google Sheets, WhatsApp groups, and memory. There is no dominant, affordable, WhatsApp-native tool built for this segment.

- **The closest existing tools are regional, not pan-African.** PropCon (South Africa, ~$13/mo) and CRM Africa (Kenya/Uganda) are the only purpose-built tools found, and both are limited to single sub-regions with no AI and limited WhatsApp integration.

- **Brazilian tool ImobiBrasil proves the model works at ~$10/mo.** It uses AI to parse WhatsApp voice notes and text to auto-fill property listings, syndicates to local portals, and targets small agencies. This is the closest reference architecture for what AREI should build.

- **Socia (Portugal) proves the AI-first vision.** An AI operating system for RE agents with unified inbox across WhatsApp/email/SMS, AI lead qualification, and marketing material generation. Portugal-specific, pricing not public.

- **Enterprise tools (Casafari, Propertybase, kvCORE) are irrelevant for AREI's target market.** They cost $400–$1,400+/month, require MLS/European portal infrastructure, and solve problems African agencies don't have yet.

- **General-purpose CRMs (HubSpot, Zoho, Pipedrive) are overbuilt.** Agencies use ~20% of CRM features they pay for. 83% of executives say getting staff to use the CRM is the hardest part. These tools lack listing management and African portal syndication.

- **WhatsApp CRM tools (Kommo, Callbell) are the nearest competitive set but miss listings.** They handle messaging well but don't manage property listings, publish agency pages, or syndicate to local portals.

- **Portuguese-speaking African markets (Cape Verde, Angola, Mozambique) have zero broker tools.** This is an uncontested entry point if AREI supports Portuguese from day one.

- **The real competitor is Google Sheets + WhatsApp + Facebook.** Any tool must beat this combination on speed, simplicity, and mobile-first UX with zero setup time.

- **AREI's wedge: free or near-free, WhatsApp-first, AI-assisted listing creation, simple agency page, structured data as the business model.** Not a CRM replacement. A daily workflow layer.

---

## 2. Competitor Table

### 2A. Enterprise / Global RE Broker Tools

| Field | Casafari | Propertybase | Follow Up Boss | ListGlobally / Properstar | Idealista Tools |
|---|---|---|---|---|---|
| **Website** | casafari.com | propertybase.com | followupboss.com | listglobally.com / properstar.com | idealista.com |
| **Geography** | Europe (20+ countries), UAE, USA, Mexico, Brazil | 60 countries (US-heavy, luxury brands) | US only (owned by Zillow) | 60+ countries, Swiss HQ | Spain, Portugal, Italy only |
| **Target customer** | Mid-to-large agencies, investors, developers | Enterprise brokerages (Sotheby's, Forbes Global) | US agents and teams (2–50+) | Agencies wanting intl buyer exposure | Agents in Southern Europe |
| **Main features** | CRM, market intelligence, AVM, portal distribution, website builder, AI | Salesforce-based CRM, IDX websites, MLS integration | Lead routing, follow-up automation, call tracking | Portal syndication to 100+ portals, auto-translation | Portal listings, HCPro CRM, agent branding |
| **Pricing** | Free CRM (limited). Paid tiers not public | GO: $399–$1,399/mo (5 users). SF Edition: ~$799+/mo | Grow: $58/mo. Pro: $416/mo. Platform: $1,000/mo | ~€200/mo (50 listings), ~€320/mo (100 listings) | ~€200–500/mo portal subscriptions |
| **Complexity** | Medium-High | High | Low-Medium | Low | Low-Medium |
| **WhatsApp** | Yes (sharing, buttons on pages) | No | No (third-party only) | No | Unclear |
| **Listing management** | Yes | Yes | Limited (status tracking only) | No (syndication only) | Yes (idealista portal only) |
| **Lead inbox / CRM** | Yes (full CRM with funnels) | Yes (Salesforce-powered) | Yes (core product, best-in-class) | No | Yes (HCPro) |
| **Agency website** | Yes (10+ templates, multi-language) | Yes (luxury IDX websites) | No (funnel builder only) | No | Partial (branded profile page) |
| **Portal distribution** | Yes (100+ portals via Feedcruncher) | Yes (US MLS-centric) | No | Yes (this IS the product) | Idealista IS the portal |
| **AI features** | Yes (AVM, deduplication, NLP, predictive) | Minimal | Yes (call summaries, suggested tasks) | Yes (Azure OpenAI for search/translation) | Emerging (ChatGPT app, March 2026) |
| **Relevance to AREI** | Medium (study architecture, but irrelevant for Africa) | Low | Low (US-only) | Medium (potential integration partner for intl distribution) | Low |

### 2B. CRM Tools Used in Real Estate

| Field | HubSpot | Zoho CRM | Pipedrive | Bitrix24 | Freshsales | kvCORE/BoldTrail | Wise Agent |
|---|---|---|---|---|---|---|---|
| **Website** | hubspot.com | zoho.com | pipedrive.com | bitrix24.com | freshworks.com | insiderealestate.com | wiseagent.com |
| **Geography** | Global | Global | Global | Global | Global (India origin) | US/Canada | US |
| **Target** | SMB to enterprise | SMB to mid-market | SMB | SMB to mid-market | SMB | Enterprise brokerages | Small US teams |
| **Pricing** | Free / $20/user/mo+ | Free / $14/user/mo+ | $14/user/mo+ | Free / $49/mo (5 users) | Free / $9/user/mo+ | $499+/mo | $49/mo (5 users) |
| **Complexity** | Medium-High | High | Medium | High | Medium | Very High | Medium |
| **WhatsApp** | Yes (Pro+ only, $100+/mo) | Yes | Third-party only | Yes (extra cost) | Yes (native) | No | No |
| **Listing management** | No | Partial | No | Partial | No | Yes | Yes |
| **Lead/CRM** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Agency website** | No | No | No | No | No | Yes | No |
| **Portal distribution** | No | No | No | No | No | Yes (US MLS) | No |
| **AI features** | Yes | Yes | Yes | Yes | Yes | Yes | Minimal |
| **Relevance to AREI** | Low (overbuilt) | Low (overbuilt) | Low | Low | Medium (cheapest, WhatsApp) | Low | Low |

### 2C. Africa / LatAm / Portuguese-Market Tools

| Field | PropCon | CRM Africa | ImobiBrasil | Socia | EasyBroker | Pulppo |
|---|---|---|---|---|---|---|
| **Website** | propcon.co.za | crmafrica.com | imobibrasil.com.br | socia.pt | easybroker.com | pulppo.com |
| **Geography** | South Africa only | Kenya, Uganda, Rwanda, Zambia | Brazil | Portugal | Mexico, LatAm | Mexico, Colombia |
| **Target** | Small SA agencies | Small African agencies | Small Brazilian agencies | Portuguese agents | LatAm agencies (35K+ agents) | LatAm brokerages |
| **Pricing** | R230/mo (~$13 USD) | Not public | From R$55/mo (~$10 USD) | Not public | ~$18 USD/mo | Commission-based |
| **Complexity** | Low | Low-Medium | Low | Medium | Low | Medium |
| **WhatsApp** | Yes (bulk WhatsApp) | No/Limited | Yes (AI parses WhatsApp voice/text) | Yes (unified inbox) | Yes (sharing) | Yes (integrated CRM) |
| **Listing management** | Yes | Yes | Yes (AI auto-fill) | Yes | Yes | Yes |
| **Lead/CRM** | Yes | Yes | Yes | Yes (AI qualification) | Yes | Yes |
| **Agency website** | Yes | No | Yes | Unclear | Yes | Yes |
| **Portal distribution** | Yes (Property24, Gumtree) | No | Yes (ZAP, VivaReal, OLX) | Unclear | Yes (local portals) | Yes |
| **AI features** | No | No | Yes (WhatsApp voice-to-listing) | Yes (strong - lead qualification, marketing) | No | Limited |
| **Relevance to AREI** | **High** (proves Africa pricing) | **High** (direct African competitor) | **High** (best reference model) | **High** (proves AI-first vision) | Medium (LatAm benchmark) | Medium |

### 2D. WhatsApp CRM / Lightweight Tools

| Field | Kommo | Callbell | Leadsales | WATI | Respond.io | Interakt |
|---|---|---|---|---|---|---|
| **Website** | kommo.com | callbell.eu | leadsales.io | wati.io | respond.io | interakt.shop |
| **Geography** | Global (strong LatAm) | EU / LatAm | LatAm | Global (Asia focus) | Global | India/Asia |
| **Target** | SMBs, sales teams | Support/sales teams | LatAm SMBs | SMBs (no-code) | Multichannel teams | Budget teams |
| **Pricing** | $15/user/mo (6-mo min) | $15/agent/mo | $97/mo (3 users) | ~$39/mo (3 users) | $79/mo | ~$11/mo |
| **Complexity** | Medium | Low | Low | Low-Medium | Medium | Low |
| **WhatsApp** | Yes (core) | Yes (core) | Yes (core) | Yes (core) | Yes (core) | Yes (core) |
| **Listing management** | No | No | No | No | No | No |
| **Lead/CRM** | Yes (pipeline) | No (shared inbox only) | Yes (funnels) | Partial | Yes | Partial |
| **Agency website** | No | No | No | No | No | No |
| **Portal distribution** | No | No | No | No | No | No |
| **AI features** | Yes | Limited | Limited | Yes | Yes | Limited |
| **Relevance to AREI** | Medium (WhatsApp benchmark) | Low | Low | Medium (API provider option) | Medium | Medium (cheapest) |

---

## 3. Deep Dives

### Casafari (casafari.com)

**What they promise:** A complete real estate operating system — market intelligence, CRM, portal distribution, website builder, and AI-powered valuations across 20+ European countries.

**What they actually offer:** A data-heavy platform built on aggregating listings from 100+ portals, deduplicating properties, and providing comparative market analysis. The CRM and website builder appear secondary to the market intelligence product. Free CRM tier exists but is limited to 3 portal exports.

**Strengths:** Deepest market data in Europe. Strong AI (automated valuations, property matching, predictive analytics). Portal distribution via Feedcruncher is genuinely powerful. Website builder with lead capture.

**Weaknesses:** Zero African data coverage. European portal network irrelevant in Africa. Pricing is opaque and likely high for paid tiers. Platform complexity suits mid-to-large agencies, not 5-person shops.

**Why a small African agency wouldn't use it:** No African market data. No African portal integrations. Too complex. Likely too expensive. Solves problems (European MLS fragmentation) that don't exist in Africa.

**What AREI should learn:** The architecture of data aggregation + CRM + portal distribution + website builder + AI is the right blueprint. Casafari proves this bundle works. But AREI should build it simple-first and for African data, not try to replicate Casafari's complexity.

---

### Socia (socia.pt)

**What they promise:** An AI operating system for real estate agents. Unified communications, automated lead qualification, AI-generated marketing materials, and intelligent workflow management.

**What they actually offer:** A Portugal-focused platform with a unified inbox (WhatsApp, email, SMS, phone calls in one place), AI that qualifies and scores leads, AI that generates property descriptions and marketing content, and workflow automation. Appears to be a newer entrant positioning as AI-first.

**Strengths:** AI-first approach is genuinely differentiated. Unified inbox solves a real agent pain point. Portuguese-language market focus means they understand Lusophone workflows.

**Weaknesses:** Portugal-only. Pricing not public (likely premium positioning). No evidence of African market interest. May be early-stage with limited scale.

**Why a small African agency might not use it:** Not available in Africa. Likely priced for European agents. Portuguese-language focus is relevant for Cape Verde/Angola/Mozambique, but the tool itself doesn't serve those markets.

**What AREI should learn:** The AI-first vision is right. Unified inbox is a killer feature. If AREI can deliver even 30% of Socia's AI capability at a fraction of the price for Portuguese-speaking African markets, that's a wide-open opportunity.

---

### Follow Up Boss (followupboss.com)

**What they promise:** The best lead follow-up system for US real estate agents. Speed-to-lead, automated routing, and no leads falling through the cracks.

**What they actually offer:** A genuinely well-designed lead management CRM focused exclusively on the US market. Integrates with Zillow, Realtor.com, and 250+ US lead sources. Strong action plans, call tracking, and AI-generated call summaries. Owned by Zillow since 2023.

**Strengths:** Best-in-class UX for lead follow-up. Fast onboarding. AI features are practical (call summaries, suggested replies). Known for ease of use relative to competitors.

**Weaknesses:** US-only lead source integrations. No listing management. No portal distribution. No native WhatsApp. No international presence. Owned by Zillow, so strategy is US-centric.

**Why a small African agency wouldn't use it:** Everything about it assumes the US market — Zillow leads, MLS, US phone systems. No WhatsApp. No listing management. Pricing starts at $58/mo for a single user.

**What AREI should learn:** Speed-to-lead matters everywhere. The core insight — agents lose leads because they respond too slowly — is universal. AREI should build lead notification and quick-response via WhatsApp as a core feature. Follow Up Boss proves that doing one thing well (lead follow-up) can sustain a business.

---

### Propertybase (propertybase.com)

**What they promise:** An end-to-end real estate platform for luxury brands and enterprise brokerages. Built on Salesforce.

**What they actually offer:** A Salesforce-based CRM with IDX websites, lead management, and MLS integration. Serves major luxury brands (Sotheby's, Forbes Global Properties). GO edition targets smaller teams but still starts at $399/mo.

**Strengths:** Enterprise-grade. Salesforce ecosystem. Luxury brand credibility. 60-country presence.

**Weaknesses:** Extremely expensive ($399+/mo minimum). High implementation complexity. No WhatsApp. US MLS-centric. The Salesforce dependency means customization requires technical expertise.

**Why a small African agency wouldn't use it:** Cost alone disqualifies it. A 5-person agency in Nairobi is not paying $400/mo for CRM software. The Salesforce architecture is overkill. No relevant portal integrations for Africa.

**What AREI should learn:** AREI should be the anti-Propertybase. Everything Propertybase does expensively and complexly, AREI should do simply and cheaply. The fact that Propertybase serves 60 countries proves global demand exists — it just doesn't serve small agencies.

---

### ListGlobally / Properstar (listglobally.com / properstar.com)

**What they promise:** International property distribution to 100+ portals across 60+ countries, with automatic translation into 25 languages.

**What they actually offer:** A syndication-only service. You feed listings in, they push them out to partner portals worldwide. Auto-translates descriptions. Properstar is the consumer-facing search engine, ListGlobally is the distribution platform for agents.

**Strengths:** Genuinely global reach. Simple product (syndication only). Month-to-month pricing. Auto-translation is useful.

**Weaknesses:** Not a CRM or full platform. Only useful if you need international buyer exposure. African portal coverage is unclear. Doesn't help with daily operations.

**Why a small African agency might use it:** If they have properties that attract international buyers (coastal properties in Cape Verde, luxury in Cape Town), ListGlobally could provide international exposure. But it doesn't help with daily operations.

**What AREI should learn:** ListGlobally could be a potential integration partner rather than a competitor. AREI handles local operations, ListGlobally handles international distribution for agencies that need it. This could be a paid add-on feature later.

---

### PropCon (propcon.co.za) — South Africa

**What they promise:** Property management software for South African estate agencies. Listing management, CRM, website, and portal syndication.

**What they actually offer:** A functional but basic tool at R230/mo (~$13 USD) that syndicates listings to Property24 and Gumtree, includes bulk WhatsApp messaging, provides a basic agency website, and offers CRM functionality. South Africa only.

**Strengths:** Proves the model works at African price points. Functional listing-to-portal pipeline. WhatsApp integration exists. Low complexity.

**Weaknesses:** South Africa only. No AI. UI appears dated based on available information. Limited to SA portals. No evidence of expansion plans.

**What AREI should learn:** PropCon is proof of concept that small African agencies will pay ~$13/mo for a listing + CRM + portal syndication tool. AREI should study PropCon's feature set closely and aim to offer more (AI, better UX, multi-country) at a similar or lower price point.

---

### ImobiBrasil (imobibrasil.com.br) — Brazil

**What they promise:** Complete real estate management system with AI that turns WhatsApp conversations into property listings.

**What they actually offer:** From R$55/mo (~$10 USD). AI reads WhatsApp text and voice messages to auto-fill property listing data. Syndicates to ZAP, VivaReal, OLX, and other Brazilian portals via XML. 15+ years in market. Targets small agencies.

**Strengths:** Best reference model for AREI. Proves AI-assisted listing creation works at $10/mo. WhatsApp-native workflow. Portal syndication to local portals. Affordable. Long track record.

**Weaknesses:** Brazil only. Portuguese only. No evidence of international ambitions. Limited AI sophistication compared to Socia.

**What AREI should learn:** This is the single most important reference product. ImobiBrasil proves that: (a) AI-assisted listing creation from WhatsApp works, (b) small agencies will pay ~$10/mo, (c) local portal syndication is a key feature, (d) you don't need enterprise complexity to win. AREI should aim to be "ImobiBrasil for Africa" with better AI and multi-country support.

---

### EasyBroker (easybroker.com) — Mexico/LatAm

**What they promise:** Simple real estate software for LatAm agents. CRM, website, MLS collaboration.

**What they actually offer:** A clean, simple tool at ~$18/mo with 35,000+ agents. CRM, listing management, agency websites, WhatsApp sharing, and inter-agency MLS-style collaboration. Well-designed for the LatAm market.

**Strengths:** Simple and affordable. Large agent base proves adoption. Good UX for the price point. WhatsApp integration (sharing, not full CRM). MLS collaboration is a differentiator.

**Weaknesses:** LatAm only. Limited AI. WhatsApp integration is basic (sharing links, not full inbox management).

**What AREI should learn:** EasyBroker is the right complexity level. Simple, affordable, focused on daily workflows. The MLS collaboration feature (agents sharing listings across agencies) could be relevant for AREI later. $18/mo price point works for LatAm — Africa may need to be lower ($5–15/mo).

---

## 4. Pricing and Complexity Analysis

### Tier 1: Enterprise Tools ($400+/mo)

| Tool | Price | Target | Daily value for small agency |
|---|---|---|---|
| Propertybase | $399–$1,399/mo | Luxury enterprise | None — cost prohibitive, wrong market |
| kvCORE/BoldTrail | $499+/mo | US enterprise brokerages | None — US MLS dependent |
| Casafari (paid) | Not public (likely €200+/mo) | European mid-large agencies | None — no African data |

**Verdict:** Completely irrelevant for AREI's target market. These tools solve problems that don't exist for a 5-person agency in Nairobi or Praia.

### Tier 2: Mid-Market CRM Tools ($50–200/mo for a team)

| Tool | Price for 5-person team | What they get | What they don't get |
|---|---|---|---|
| HubSpot (Pro) | ~$500/mo | CRM, email, WhatsApp (Pro+) | Listing management, portal syndication |
| Zoho CRM | ~$70/mo | CRM, some RE templates | Listing management, portal syndication |
| Follow Up Boss | ~$58–416/mo | Lead follow-up, US integrations | Listings, WhatsApp, portals |
| Wise Agent | $49/mo flat | RE-specific CRM, transaction mgmt | WhatsApp, non-US portals |

**Verdict:** Overkill and still incomplete. These tools cost $50–500/mo and still don't cover listing management or local portal syndication. Agencies would need to pay for CRM + a separate listing tool + WhatsApp API, totaling $100–200+/mo for a fragmented stack.

### Tier 3: Lightweight/Affordable Tools ($10–50/mo)

| Tool | Price | What they offer | Gap |
|---|---|---|---|
| PropCon | ~$13/mo | Listings, CRM, portals (SA only) | No AI, SA only |
| ImobiBrasil | ~$10/mo | Listings, AI, portals (Brazil only) | Brazil only |
| EasyBroker | ~$18/mo | Listings, CRM, website (LatAm) | LatAm only, basic WhatsApp |
| Kommo | $15/user/mo | WhatsApp CRM | No listings, no portals |
| Freshsales | $9/user/mo | CRM, WhatsApp | No listings, no portals |

**Verdict:** This is AREI's competitive tier. These tools prove the price point ($10–20/mo) and the feature scope (simple, focused, regional). But none covers Africa, and none combines listings + WhatsApp CRM + portal syndication + AI in one tool.

### Tier 4: Free/DIY Solutions (the real competition)

| Tool | Price | What agencies actually do |
|---|---|---|
| Google Sheets | Free | Listing database, lead tracker |
| WhatsApp Business | Free | All communication, group inquiries |
| Facebook Page | Free | Agency "website," listing showcase |
| Google Calendar | Free | Showing schedules |
| Google Drive | Free | Photos, documents |

**Verdict:** This is what small African agencies actually use today. The combined cost is $0. To win, AREI must offer enough incremental value over this stack that agencies see it as worth even $5–15/mo — or it must be free with value that makes the agency's life measurably easier.

### What small agencies actually need daily

Based on research across markets, the daily workflow of a 3–10 person agency is remarkably consistent: receive leads (WhatsApp, calls, portal inquiries), check which listings match, respond to the lead, follow up with leads who didn't respond, update listing status when something sells or rents, occasionally add new listings, share listings with potential buyers. Everything else (market analytics, AVM, transaction management, document generation) is weekly or monthly at best.

---

## 5. Opportunity for AREI

### The Wedge

AREI's entry point is not competing with Casafari or HubSpot. The wedge is replacing the Google Sheets + WhatsApp + Facebook stack that small African agencies use today, with a tool that is marginally better at each task and dramatically better at connecting them.

**What to offer first:** A free or near-free tool that does three things better than Sheets + WhatsApp + Facebook: (1) keeps listings and leads in one place, (2) connects incoming WhatsApp inquiries to the right listing, (3) gives the agency a clean public listing page they can share.

**What to avoid:** Building a "full CRM." Adding features before usage. Charging before value is proven. Requiring desktop-only workflows. Building for large brokerages. Trying to replicate European portal networks.

### Why simple beats complex

The data is clear: teams use only ~20% of CRM features they pay for, and 83% of executives say getting staff to use the CRM is the hardest part. In markets with 71% mobile penetration among RE professionals and 42% of small firms lacking IT infrastructure for full CRM adoption, complexity is the enemy of adoption.

Every feature AREI doesn't build is a reason for an agent not to be confused. The product should feel like WhatsApp with a listing tab, not like Salesforce with a WhatsApp plugin.

### How AREI can win by being free/simple/useful

The playbook is: give away the workflow tool, capture structured market data as the real product.

- **Free tier:** Unlimited listings, basic lead inbox, public agency page, WhatsApp quick-reply links. This costs AREI almost nothing to operate and generates listing data.
- **Paid tier ($5–15/mo):** WhatsApp broadcast, portal syndication to local portals, AI-assisted listing creation, performance analytics.
- **Data value:** Every listing entered, every lead tracked, every price update creates structured property market data that AREI can aggregate. This is the business model, not SaaS subscriptions.

### How broker usage creates structured market data

When an agent adds a listing, AREI gets: property type, location, price, size, photos, listing date. When a lead comes in, AREI gets: demand signal for that property type/location. When a listing is updated (price drop, marked as sold), AREI gets: market velocity data. When an agency publishes their page, AREI gets: supply data for that market.

None of this requires the agent to think about "data." They're just managing their daily workflow. AREI structures the data in the background.

---

## 6. Recommended V0 Feature Set

### Must Have (launch requirements)

1. **Property listing database** — Add listings from mobile. Photo upload. Basic fields (type, location, price, bedrooms, size, description). Status tracking (available, reserved, sold/rented).
2. **WhatsApp click-to-chat per listing** — Each listing gets a WhatsApp link that opens a pre-filled message. When a buyer clicks, the agent knows exactly which listing they're asking about.
3. **Lead inbox** — Simple list of inquiries linked to listings. Who asked, when, about what property, current status (new, contacted, showing scheduled, closed).
4. **Public agency page** — Clean, mobile-optimized page showing the agency's active listings. Shareable URL. No setup required beyond adding listings.
5. **Mobile-first UI** — Entire product usable from a smartphone. Agents work from phones, not desktops.

### Should Have (weeks 2–6 after launch)

6. **WhatsApp follow-up templates** — Pre-written messages agents can send with one tap: "Still interested?", "Price reduced on [listing]", "New listing matching your search."
7. **Basic performance dashboard** — Listings count, leads this week, response time, top-performing listings. Simple numbers, not analytics.
8. **AI-assisted listing creation** — Agent describes a property in WhatsApp or voice note, AI extracts structured fields and creates a draft listing. (Reference: ImobiBrasil proves this works.)
9. **Multi-language support** — Portuguese and English from day one. French for West Africa in v1.

### Later (after validating with pilot agencies)

10. **Local portal syndication** — Push listings to Property24, BuyRentKenya, PropertyPro, Meqasa, etc. This requires portal-by-portal integration.
11. **WhatsApp broadcast** — Send listing updates to segmented buyer lists. Requires WhatsApp Business API.
12. **Inter-agency listing sharing** — Allow agencies to share listings with each other (MLS-lite). Creates network effects.
13. **AI lead qualification** — Auto-score leads based on message content, response patterns, budget match.

### Do Not Build Yet

- Market intelligence / comparable sales analysis (requires massive data first)
- Transaction management / document generation (agencies handle this offline)
- Commission tracking / accounting (different problem, different product)
- Desktop-first features (agents use phones)
- Complex reporting / BI dashboards (agencies don't use them)
- Integration with European/US portals (not the target market)
- Video tours / virtual staging (nice-to-have, not daily workflow)

---

## 7. Broker Interview Questions

These questions are designed to validate assumptions with real agency owners and agents in target markets. Conduct in person or via WhatsApp voice call. Use local language where possible.

### Current tools and workflow (questions 1–5)

1. Walk me through a normal day. When a new lead contacts you, what happens step by step?
2. Where do you keep your list of properties? (Notebook, phone, Excel, app, other?)
3. How do buyers typically find you and contact you? (WhatsApp, call, portal, walk-in, referral?)
4. Do you use any software or app to manage your properties or clients? If yes, which one? If no, why not?
5. How do you keep track of which buyers are interested in which properties?

### Lead management and follow-up (questions 6–10)

6. When you get a new inquiry, how quickly do you usually respond? What determines response speed?
7. Do you ever lose track of a lead — someone contacts you and you forget to follow up? How often does that happen?
8. How do you follow up with buyers who didn't respond the first time? Do you have a system or do you just remember?
9. How many active buyer conversations are you managing at any given time?
10. What is the most frustrating part of communicating with buyers?

### WhatsApp workflow (questions 11–13)

11. How do you use WhatsApp for your business today? (Sending listings, receiving inquiries, groups, broadcasts?)
12. When a buyer messages you on WhatsApp about a property, how do you match their message to the right listing?
13. Do you ever send bulk messages to buyers about new listings or price changes? How?

### Listing and publishing (questions 14–16)

14. How do you publish your listings? (Online portal, social media, physical signs, newspaper, other?)
15. Do you have a website or online page for your agency? If not, would you want one?
16. How do you update listing information when something changes (price drop, property sold)?

### Pain and willingness to change (questions 17–20)

17. What is the single biggest time-waster in your daily work?
18. If a free app could do one thing for you, what would you want it to do?
19. Would you try a free tool that helps you manage listings and leads from your phone? What would make you stop using it?
20. How would you feel about your listing data being part of a larger market database, if it meant you got free tools and better market visibility in return?

---

## 8. Strategic Recommendation

### Should AREI build this?

**Yes.** The market gap is confirmed across four research dimensions: (a) no purpose-built broker tool exists for small African agencies, (b) the closest analogues (PropCon, ImobiBrasil) prove the model works at $10–13/mo in comparable markets, (c) the competitive landscape is dominated by overbuilt, overpriced tools designed for US/European enterprise brokerages, and (d) the structured data generated by broker usage directly feeds AREI's core business.

The risk of building is low because the V0 feature set is small (listing database, lead inbox, WhatsApp links, public page, mobile UI) and the operational cost per agency is near-zero. The risk of not building is higher — someone else will eventually fill this gap, and they won't share the data with AREI.

### What should the first pilot promise be?

"A free app that helps you manage your property listings and buyer leads from your phone, with a public page you can share with anyone."

That's it. No mention of CRM, AI, analytics, portal syndication, or data. The pilot is about daily utility: can we make your day slightly easier?

The pilot should target 10–20 agencies across 2–3 markets (recommendation: Nairobi, Praia, Lagos) for 90 days. Success metric: daily active usage (agent opens the app and does something at least 4 days per week).

### What should the product NOT promise?

- Not a replacement for their existing portal subscriptions
- Not a market intelligence platform (yet)
- Not a transaction management system
- Not a CRM in the traditional sense (no pipeline stages, no forecasting, no reporting)
- Not a tool that requires desktop access or training
- Not a tool that requires internet connectivity for basic tasks (offline listing access matters)

### What is the sharpest positioning?

**"The simplest way to run your agency from your phone."**

Not "the most powerful." Not "AI-powered." Not "the future of real estate." Simple. Phone. Your agency. Today.

The positioning deliberately avoids: (a) competing with enterprise tools on features, (b) leading with AI (impressive but not the daily value prop), (c) leading with data (that's AREI's value, not the broker's), (d) sounding like every other PropTech pitch.

The competitive advantage is not features — it's relevance. AREI's tool is built for a 5-person agency in a market that nobody else is building for. That's the wedge.

---

## Sources

### Company/tool websites referenced
- Casafari: https://casafari.com
- Propertybase: https://propertybase.com
- Follow Up Boss: https://followupboss.com
- ListGlobally: https://listglobally.com
- Properstar: https://properstar.com
- Idealista: https://idealista.com
- HubSpot: https://hubspot.com
- Zoho CRM: https://zoho.com
- Pipedrive: https://pipedrive.com
- Bitrix24: https://bitrix24.com
- Freshsales: https://freshworks.com
- kvCORE: https://insiderealestate.com
- Wise Agent: https://wiseagent.com
- PropCon: https://propcon.co.za
- CRM Africa: https://crmafrica.com
- ImobiBrasil: https://imobibrasil.com.br
- Socia: https://socia.pt
- EasyBroker: https://easybroker.com
- Pulppo: https://pulppo.com
- Kommo: https://kommo.com
- Callbell: https://callbell.eu
- Leadsales: https://leadsales.io
- WATI: https://wati.io
- Respond.io: https://respond.io
- Interakt: https://interakt.shop

### Portal references
- Property24 (South Africa): https://property24.com
- BuyRentKenya: https://buyrentkenya.com
- PropertyPro (Nigeria): https://propertypro.ng
- Meqasa (Ghana): https://meqasa.com
- Imovirtual (Portugal): https://imovirtual.com
- ZAP Imóveis (Brazil): https://zapimoveis.com.br

### Industry data referenced
- RE CRM adoption statistics: LLC Buddy / RE CRM Software Statistics 2025
- NAR Technology Survey: https://www.nar.realtor/research-and-statistics
- PropTech market size ($40B, 16% CAGR): Market Growth Reports
- TheClose - Best RE Software 2026: https://theclose.com/real-estate-software/
- WhatsApp Business API: Meta for Developers
- Respond.io WhatsApp API provider comparison: https://respond.io/blog/best-whatsapp-api-providers

### Methodology note
This research was conducted via web search of company websites, pricing pages, app store listings, review sites, and industry publications in May 2026. Pricing figures are as published at time of research. Where pricing was not publicly available, this is noted as "not public." Assumptions are clearly labeled. This is strategic research, not a commercial endorsement of any tool.
