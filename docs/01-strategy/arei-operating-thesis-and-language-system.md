# AREI · Operating Thesis & Language System

**Status:** Internal · canonical source of truth
**Audience:** Founding team, early hires, agents working on AREI products
**Sits above:** `docs/01-strategy/AREI_Investor_Briefing_v1.2.md` · `docs/brand/voice-and-language.md`

When this document conflicts with older strategy notes, this document wins.
When this document conflicts with live code or verified data, live state wins.

---

## 1. North Star

**One line:**
AREI builds data acquisition and intelligence infrastructure for African property markets, starting with Cape Verde.

**One paragraph:**
African property markets generate enormous amounts of listing data — broker sites, portals, social channels, informal networks. None of it is structured into a usable market signal. AREI's job is to collect that data, clean it, score it, and publish it as a reliable, methodology-disclosed index. The public surface builds authority and attracts buyers. The broker layer builds source relationships. The professional and institutional layer is the revenue product. One engine. Three surfaces. The asset is the cleaned, scored, historical dataset — not the website.

---

## 2. What AREI is

**Data acquisition layer.**
AREI monitors public listings across broker sites, portals, and registered sources in each market. Listings are ingested, normalized, and scored for completeness and reliability. This is the foundation. Without it, there is no index.

**Intelligence layer.**
Scored, cleaned listing records are assembled into a market signal — the listing-based asking-price index. The methodology is public. The index is updated monthly. This is the credibility product. It is what earns institutional trust over time.

**Public Index Surface.**
The index and browsable listings are available publicly, by country and region. This creates SEO authority, buyer attention, and the top of the funnel. The public surface is free. It is not the revenue product — it is the surface that makes the revenue product possible.

**Broker cooperation layer.**
Brokers who register with AREI get attribution on their listings, distribution to an international buyer audience, and eventually a lead inbox and performance benchmarks. In return, AREI gets better data quality, source relationships, and market coverage. The relationship is exchange, not extraction.

**Professional data product.**
Investors, developers, lenders, advisors, and public institutions need to read markets before making decisions. AREI sells them the tools to do that: market screeners, comparable asking-price data, quarterly briefings, and eventually API access and historical series. This is where revenue comes from.

---

## 3. What AREI is not

These are not close calls. They are structural constraints on what AREI builds and claims.

- **Not a brokerage.** AREI does not represent buyers or sellers. It does not earn transaction commission. It does not negotiate deals.
- **Not a generic property portal.** AREI does not compete with Property24, Lamudi, or local listing sites for consumer leads. It distributes listings from those sources. The value is the index and the intelligence layer on top.
- **Not a CRM company.** Broker Tools exist to improve data quality and source relationships, not to build a full-featured CRM. Scope is intentionally limited in v1.
- **Not a tourism or lifestyle brand.** AREI is a data company. The markets it covers happen to include tourist-facing locations. That does not make AREI a lifestyle product.
- **Not claiming transaction-price coverage.** AREI is explicitly listing-based. It monitors public asking-price listings. It does not have access to closing prices or transaction records in any current market. This is stated in every published value.
- **Not claiming complete market coverage.** Every market has gaps. Source coverage expands over time. Coverage and confidence scores are part of the methodology. Do not imply completeness where it does not exist.

---

## 4. Business model

The model has one structural logic: free tools build the data asset; paid intelligence monetizes it.

**Public Index Surface creates authority, SEO, and buyer attention.**
The index is free to read. It generates organic search traffic, builds the AREI brand as a market reference, and attracts the buyers and researchers who eventually become paying customers.

**Broker Tools create data cooperation and source relationships.**
Broker Tools are free. Brokers get distribution, attribution, and a lead inbox. AREI gets better source coverage, reduced parser dependency, and the relationship infrastructure needed to expand per market. Data quality improves with broker participation. Broker participation improves with useful free tools.

**Professional & Institutional Intelligence is the revenue layer.**
Professional buyers, developers, lenders, and institutional funds pay for the depth that the free surfaces don't offer: market screeners, quarterly briefings, comparable data, historical series, API access. This is where the business makes money.

**The model compounds with markets.**
Each new market adds data. Each new dataset makes the professional product more valuable. A single-market professional product is hard to justify at institutional pricing. A multi-market dataset with historical depth is a different proposition entirely.

**Indicative pricing (subject to market validation):**
- Public / Broker Tools: €0
- Pro Buyer: €29/month
- Broker Pro: €99–299/month
- Professional: €499–999/month
- Institutional / API: €2,000–10,000/month

---

## 5. Three surfaces. One engine.

These are not separate businesses. They are three surfaces powered by one data engine. The engine — the ingestion, normalization, deduplication, scoring, and publication pipeline — is the same for all three.

**Public Index Surface**
*Audience: consumers, diaspora buyers, market observers, search traffic*
The browsable index. Monthly asking-price signal by country and region. Methodology disclosure on every published value. Historical series available. Free.

**Broker Tools**
*Audience: local brokers and agencies*
Listing submission, AI-assisted validation, distribution to the index surface, lead inbox, market performance benchmark. Free. Scope limited to data-related workflows — no CRM, no client management in v1.

**Professional & Institutional Intelligence**
*Audience: investors, developers, lenders, advisors, public institutions*
Market screener, comparable asking-price data, quarterly Listing Index Briefings, confidence scoring, API access, historical series. Paid.

What the free surfaces do for the paid one: they build the dataset, the authority, and the buyer attention that makes institutional intelligence worth buying.

---

## 6. Cape Verde as Market 01

Cape Verde is not the destination. It is the proof market.

It was selected because it is small enough to map deeply, international enough to matter, and fragmented enough for a data layer to create immediate value. Diaspora and European buyer demand is documented. The broker ecosystem is fragmented across 17 mapped sources. Each island behaves as a sub-market, which forces the methodology to handle geographic disaggregation from day one. The index narrative is publishable from the first issue.

The objective in Cape Verde is to validate the playbook:
- Can we map and quality-grade sources reliably?
- Do the parsers produce clean, consistent records?
- Does the methodology hold up to publication?
- Can broker onboarding work in a fragmented market?
- Does the publication cadence hold?

If yes, the same template moves to Ghana as Market 02, then to Nigeria, Morocco, Senegal, Kenya. Each market reuses the same parsers, methodology, brand system, and publication cadence. The brand architecture is already designed for this. Country name on line one of the lockup. Everything else holds.

Cape Verde is unlikely to be a material revenue market in year one. That is by design. The investment in Cape Verde is infrastructure and methodology, not monetization.

---

## 7. Broker cooperation model

Brokers in fragmented markets have a consistent problem: they have listings but limited distribution to international buyers. AREI distributes to exactly the audience they cannot reach themselves — diaspora, foreign buyers, international investors researching online before engaging locally.

**What brokers get:**
- Attribution on their listings, published on the country index surface
- Distribution to an international buyer audience
- Eventually: a lead inbox from index traffic, a performance benchmark against local market data

**What AREI gets:**
- Better data quality: direct listing feeds are cleaner than scraped data
- Source relationships: registered sources are more reliable than anonymous portals
- Faster coverage expansion: source cooperation reduces parser maintenance cost per market

The relationship is structured as exchange, not extraction. Public listings are accessible under standard practice regardless of cooperation — parsers run against public data. But registered source relationships still matter: they reduce cost, improve data quality, and create the trust layer that makes institutional partnerships possible later.

One clarification: Broker Tools are not a lead-gen business for AREI. They exist to improve the data. Leads are a benefit for brokers, not a revenue line for AREI.

---

## 8. Revenue path

**Year one (Cape Verde):** No revenue assumption. The priority is methodology v1.0 published, 17-source registry stable, broker tools onboarding pilots, and the first Listing Index Briefing in market.

**Market two (Ghana):** First realistic professional revenue. Ghana has the buyer density, broker concentration, and diaspora demand to support a paid professional tier. Target: 15+ paying professional customers within 18 months of Ghana launch.

**Markets three through seven:** Each market adds dataset depth and makes the professional product more valuable at institutional pricing. Historical series across four or more markets is a different proposition from a single-market product.

**Revenue does not depend on consumer traffic volume.** A few institutional contracts at €2,000–10,000/month produce more revenue than thousands of free index readers. The free surfaces build the credibility and the dataset that makes those contracts possible. They are not the revenue strategy themselves.

**What the next raise requires:**
- Methodology v1.0 published and cited
- Two country indices live with the same stack
- 15+ paying professional customers in Ghana
- First institutional data partnership signed
- Quarterly Listing Index Briefing established as the reference publication for Cape Verde

---

## 9. Language system summary

Full rules: [`docs/brand/voice-and-language.md`](../brand/voice-and-language.md)

**Voice principle:**
AREI speaks like an institutional data company with a founder's thesis: calm, precise, direct, and readable. Clear before clever. Specific before abstract. No hype, no broker language, no SaaS fluff.

**Core approved phrases:**
- "Africa's property data is everywhere. We bring it together."
- "Data acquisition and intelligence infrastructure for African property markets."
- "The asset is not the website. The asset is the dataset."
- "Cape Verde is Market 01. Not the destination."
- "Three surfaces. One engine."
- "Free tools acquire data. Paid intelligence monetizes it."
- "Based on monitored asking-price listings. Not transaction prices or valuations." *(required on every published index value)*

**Restricted phrases (use only with care):**
- "scored, source-linked published signal" — too stacked; use "clean, sourced market signal"
- "methodology-disclosed" — legal context only; elsewhere say "methodology is public"
- "indexable data objects" — engineering spec only, not investor or product copy
- "data acquisition" — acceptable as a role label; do not use as a generic phrase for "collecting data"

**Banned:**
leverages · ecosystem · seamless · best-in-class · unique proposition · stakeholders · empower · unlock · exciting opportunity · dynamic market · scalable solution · world-class · disrupt

**What never changes regardless of audience:**
- AREI is listing-based. Not transaction prices or valuations.
- AREI does not claim complete market coverage.
- Do not strengthen claims. Do not imply official index status.

---

## 10. Message versions

**1 sentence:**
AREI is data acquisition and intelligence infrastructure for African property markets.

**3 sentences:**
Africa's property data is everywhere. AREI brings it into focus. One engine turns fragmented listings into a scored, published market signal — free to read, valuable to buy.

**30 seconds · broker explanation:**
"AREI is a market data company, not a portal. We publish a monthly asking-price index for African property markets — starting with Cape Verde. When you submit listings through our broker tools, they appear on the Cape Verde Real Estate Index with your name on them. International buyers land on the index, see your listings, and your details. We get better data. You get distribution you can't build yourself."

**30 seconds · investor explanation:**
"African property markets are digitally fragmented — listings are everywhere, but there's no shared benchmark. AREI builds the data infrastructure underneath those markets: we collect, clean, and publish a listing-based asking-price index for each country, starting with Cape Verde. One engine powers three surfaces — a free public index, free broker tools, and a paid professional intelligence product. The asset is the cleaned, scored, historical dataset. Cape Verde proves the system. Ghana is where revenue starts."

**30 seconds · public / user explanation:**
"Africa's property data is everywhere — broker sites, portals, informal listings. AREI brings it into focus. We publish the Cape Verde Real Estate Index: a monthly market signal based on monitored public listings, updated with methodology disclosure, free to read. If you're buying, researching, or investing in African property markets, AREI is where you start."

---

## 11. Weekly drift check

Use these questions at any point when reviewing roadmap decisions, feature requests, or copy changes.

- Are we still building the data engine? Is pipeline work progressing?
- Are we improving data quality? Coverage, completeness scores, parser reliability?
- Are we improving broker and source cooperation? More registered sources, fewer anonymous parses?
- Are we increasing trust in the public index? Methodology documented? Disclosure consistent?
- Are we proving a repeatable model beyond Cape Verde? Is the Ghana playbook advancing?
- Are we drifting into a generic portal? Are we adding consumer-portal features that don't serve the data engine?
- Are we drifting into a CRM? Are Broker Tools expanding into client management, deal tracking, or sales workflows?
- Are we drifting into a lead-gen business? Are we monetizing buyer attention instead of data intelligence?
- Are we claiming more than we have? Any copy implying transaction prices, complete coverage, or official index status?

If the answer to the last three is yes — pause and review before shipping.

---

*AREI-OS-001 · v1.0 · May 2026*
*Next review: before Ghana launch or methodology v1.0 publication, whichever comes first.*
