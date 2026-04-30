# KazaVerde Authority-Building Checklist

Last updated: 2026-04-30

## Purpose

This checklist defines the first authority-building workstream for KazaVerde GEO and AI-search visibility.

The goal is to make KazaVerde easier for search engines, AI answer engines, and serious buyers to understand as a credible Cape Verde real estate index.

This is a docs-only operating checklist. Do not use it as approval to change app code, routes, sitemap, package files, scraper logic, data pipelines, or `blog-data.ts`.

## Why GEO and AI Visibility Depends on External Authority

KazaVerde cannot earn durable GEO visibility from on-site SEO alone.

AI answer engines and search systems look for repeated external signals that a brand, dataset, or source is real, useful, and trusted. For KazaVerde, those signals should show that:

- KazaVerde exists outside its own website
- KazaVerde is associated with Cape Verde real estate, property search, and market data
- other credible sites can discover and cite KazaVerde
- the company explains its data model and limitations clearly
- citations point to useful pages, not just the homepage

The objective is not backlink volume. The objective is a small set of high-quality, consistent authority signals that reinforce the same positioning everywhere:

KazaVerde is an independent Cape Verde real estate index that aggregates publicly observed, source-linked listings and market context.

## Backlink Targets

Prioritize relevance, trust, and editorial fit.

### High-priority targets

- Cape Verde relocation guides and expat resources
- Cape Verde travel, long-stay, and digital nomad websites
- Africa real estate, proptech, and investment newsletters
- Portuguese-language or Cape Verde-focused business publications
- real estate market data blogs and directories
- diaspora community sites with Cape Verde property or relocation sections
- legal, tax, or relocation advisors who publish Cape Verde buyer resources
- founder/operator interviews on African tech, real estate, or data products

### Medium-priority targets

- property research resource lists
- startup directories with a proptech or data category
- local business directories with editorial review
- university or research resource pages about Cape Verde markets
- podcasts or newsletters covering African market infrastructure
- partner pages from tools, agencies, or advisors KazaVerde actually works with

### Link destinations to request

Use the most relevant landing page instead of always asking for homepage links.

- homepage: broad brand/entity references
- `/listings`: Cape Verde property-search references
- `/market`: data, index, or market-stat references
- `/about`: methodology, trust, or source-model references
- relevant blog/article URLs: tax, buying costs, island comparison, or market explainers

### Quality rules

- prefer one real editorial link over many weak directory links
- prefer named context over bare homepage links
- avoid paid links unless clearly marked and strategically justified
- avoid link exchanges that look artificial
- track source, URL, anchor text, target page, status, and date contacted

## Profiles to Create or Update

Profiles should use consistent naming, description, URL, and positioning.

### Core profiles

- Google Business Profile if the operating model and address rules are appropriate
- Bing Places if a legitimate business profile can be maintained
- LinkedIn company page
- founder LinkedIn profile with KazaVerde role and website
- X/Twitter profile if actively maintained
- Facebook page if used for buyer/community presence
- Instagram profile if listing discovery and visual content become active

### Product and startup profiles

- Crunchbase
- Wellfound
- Product Hunt, only when there is a credible launch moment
- BetaList or similar startup directories, if positioning can stay serious
- relevant African startup or proptech directories

### Data and developer trust profiles

- GitHub organization or repo profile, if public-facing technical work is intentional
- Vercel project/team public references only if appropriate
- documentation links from any public technical writeups

### Profile copy standard

Use a consistent short description:

KazaVerde is an independent Cape Verde real estate index. It aggregates publicly observed, source-linked property listings and market context across Cape Verde.

Avoid:

- marketplace claims
- broker or agency language
- "all properties" or full-market coverage claims
- legal or investment advice positioning
- fake team scale or fake office presence

## Directories and Submissions

Use directories selectively. The benchmark is whether a real buyer, journalist, advisor, or AI crawler could reasonably treat the listing as a useful signal.

### Submit selectively to

- Cape Verde business directories with editorial standards
- real estate resource directories
- proptech startup directories
- African startup directories
- relocation and expat resource directories
- curated SaaS/tool directories if they accept real estate data/search products
- Bing Webmaster Tools
- Google Search Console, already used for indexing and monitoring

### Candidate directory fields

Prepare a reusable submission packet:

- name: KazaVerde
- category: Real estate data / property search / Cape Verde real estate
- URL: `https://kazaverde.com`
- short description
- longer description
- founder/operator contact
- logo
- social links
- location/market served: Cape Verde
- disclaimer: independent index, not a broker or legal advisor

### Submission tracking

Track every submission with:

- directory name
- URL
- target page submitted
- status
- login owner
- submission date
- approval date
- renewal or update date
- notes on quality

## Pages Needing Stronger Citations

The pages most likely to influence GEO visibility need clearer source support and internal authority links.

### `/about`

Needs stronger citation support for:

- how source-linked indexing works
- how KazaVerde differs from a broker or marketplace
- update cadence
- coverage limits
- what is and is not verified

### `/market`

Needs stronger citation support for:

- asking price vs transaction price
- index methodology
- sample limits
- island-level median calculations
- tourism or macro context if referenced

### Listing detail pages

Needs trust reinforcement through:

- original source attribution
- visible source link
- clear "public listing data only" disclaimer
- internal links to all listings, island listings, market, and about/methodology context

### Tax, legal, and buying-cost articles

Need citations from:

- official Cape Verde sources where available
- PwC, major advisory firms, or other high-quality tax summaries
- legal firms with Cape Verde-specific writeups
- official gazette or legislation references where practical

### Island and buyer-guide articles

Need citations from:

- KazaVerde index snapshots
- tourism data sources where tourism demand is discussed
- official or reputable travel/airport sources where flight access is discussed
- internal links to methodology and market pages

## About and Methodology Trust Improvements

The About/methodology layer should make KazaVerde easy to cite.

### Add or strengthen

- a plain-language explanation of the index model
- source-linked listing policy
- update cadence
- deduplication explanation
- asking-price caveat
- no closing-price claim
- no legal verification claim
- no broker/agency/marketplace claim
- contact path for corrections
- short founder/operator note, if approved
- methodology update date
- link from `/market` to methodology context
- link from listing detail pages to About/methodology context

### Trust language to use

- "tracked public listings"
- "source-linked listings"
- "asking prices"
- "observed in the KazaVerde index"
- "coverage is expanding"
- "not a broker, agency, marketplace, legal advisor, or complete market registry"

### Trust language to avoid

- "verified properties" unless the verification standard is defined
- "all Cape Verde properties"
- "complete market coverage"
- "closing prices"
- "best broker"
- "guaranteed investment"

## Bing Webmaster Tools and IndexNow Setup Steps

### Bing Webmaster Tools

1. Create or confirm a Bing Webmaster Tools account.
2. Add `https://kazaverde.com`.
3. Verify ownership using the cleanest supported method:
   - DNS TXT record, preferred if domain access is available
   - meta tag, only if a code change is approved separately
   - file upload, only if operationally clean
4. Submit `https://kazaverde.com/sitemap.xml`.
5. Check crawl errors, indexed URLs, and discovered pages.
6. Confirm that key pages are discoverable:
   - `/`
   - `/listings`
   - `/market`
   - `/about`
   - priority articles
   - selected listing detail pages
7. Review Bing keyword impressions monthly.

### IndexNow

1. Decide whether IndexNow is worth implementing for KazaVerde now or after core SEO stabilizes.
2. Generate an IndexNow API key.
3. Host the key file at the required public URL, if implementation is approved.
4. Submit changed URLs when pages are created, updated, or removed.
5. Start with manual or low-risk submission before automating.
6. Avoid submitting noisy listing churn until the policy is clear.
7. Document which URL types are eligible for IndexNow:
   - homepage updates
   - article updates
   - market page updates
   - major listing detail updates, only if approved

Implementation of IndexNow requires a separate technical task. This checklist does not authorize route, sitemap, package, or app-code changes.

## What Not To Do

Do not use authority-building shortcuts that weaken trust.

- no spam backlinks
- no fake reviews
- no generic directory blasts
- no AI-generated comments
- no Reddit self-promotion
- no private blog network links
- no paid link schemes
- no fake local-office claims
- no fake broker partnerships
- no mass forum posting
- no automated social replies pretending to be human

Community participation should be useful first. If a KazaVerde link is not directly helpful to the question, do not post it.

## 30-Day Authority Plan

### Week 1: Foundation

- finalize KazaVerde profile copy
- prepare logo, short description, long description, and founder/contact details
- audit `/about`, `/market`, and top articles for missing citations
- create a backlink/submission tracker
- verify Google Search Console status
- add or verify Bing Webmaster Tools

### Week 2: Profile and Directory Baseline

- update LinkedIn company profile
- update founder LinkedIn reference to KazaVerde
- create or update one to three credible startup/product profiles
- submit to a small number of relevant Cape Verde, proptech, or relocation directories
- avoid broad directory blasts

### Week 3: Citation and Trust Pass

- strengthen citations on `/about`, `/market`, and priority tax/buying-cost content
- add clearer methodology language where needed
- identify pages that need external source review before publication or refresh
- document any claims that should be softened or removed

### Week 4: Editorial Outreach

- identify 10 high-fit backlink or mention targets
- send personalized outreach to 3-5 targets
- pitch KazaVerde as a source-linked Cape Verde property index, not as a broker
- prepare one founder/operator quote or short data note for publications
- review Search Console and Bing signals at the end of the month

### End-of-month review

Record:

- profiles created or updated
- directories submitted
- links earned
- citations improved
- pages refreshed
- indexing changes
- next 30-day priorities

Success means a cleaner authority footprint, not a large backlink count.
