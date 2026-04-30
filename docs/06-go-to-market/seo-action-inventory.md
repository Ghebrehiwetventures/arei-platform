# KazaVerde SEO Action Inventory

Last updated: 2026-04-30

## Purpose

This document captures the current SEO, GEO, content, and search-visibility action inventory for KazaVerde.

It is an operating document, not a publication plan. Its job is to keep tool-generated suggestions from Okara, Gemini, Grok, Search Console, and future SEO tools in one place so we can separate:

- what is already done
- what should be implemented soon
- what needs verification first
- what should be parked
- what should be rejected

KazaVerde should use SEO tools as research inputs, not as editors or source-of-truth systems.

## Product positioning guardrail

KazaVerde is an independent Cape Verde real estate index. It aggregates publicly observed listings from tracked sources and links back to original sources.

KazaVerde is not:

- a broker
- an agency
- a marketplace
- a legal advisor
- a complete market registry
- a source of closing-price data unless explicitly documented later

All SEO and content work must respect these constraints.

## Completed or recently addressed

### Homepage SEO and structured data

Status: done

Implemented in recent homepage SEO work:

- homepage H1 now targets `Cape Verde real estate`
- homepage meta description targets Cape Verde real estate search intent
- unqualified `every property` / `all properties` claims were removed or softened
- `verified` language was softened where legal verification is not performed
- Organization and WebSite JSON-LD were added to the homepage
- FAQPage JSON-LD was moved away from the homepage and attached to the route where FAQ content is visibly rendered

### Data-led property prices article

Status: done

Implemented article:

- `cape-verde-property-prices-by-island`
- framed as KazaVerde index observation, not full-market truth
- uses asking prices only, not closing prices
- clearly states source coverage is incomplete and expanding
- preserves caveats around legal verification and market coverage
- wide table was replaced with editorial island stat cards

Follow-up notes:

- Frozen medians should be treated as an April 2026 snapshot.
- Refresh quarterly or when source coverage materially changes.
- Maio price-floor pattern should be checked with the data pipeline owner before tightening wording.
- Santiago / Boa Vista mix claims should eventually be verified with property-type and location cuts.

## Okara action inventory

Okara identified a technically strong site with a visibility/content gap. Key areas:

### Already addressed

- Main keyword missing from H1/meta: addressed.
- Organization + WebSite schema: addressed.
- FAQ schema: corrected so schema matches visible content.

### Still relevant

| Action | Priority | Status | Decision |
|---|---:|---|---|
| Add H1 tags to listing pages where missing | High | Open | Needs technical audit before implementation |
| Add canonical tags to listing pages | Medium | Open | Important; verify route/canonical behavior first |
| Add hreflang and language meta | High | Deferred | Portuguese public rollout is not May scope; do technical discovery only |
| Add robots.txt directives for AI bots | High | Open | Evaluate carefully; do not block useful discovery accidentally |
| Add llms.txt or AI crawler guidance | Medium | Open | Candidate, but should be deliberate and accurate |
| Fix CLS / image dimension issues | High | Open | Technical SEO; should be handled through frontend QA |
| Improve image alt text | High | Open | Useful, but must avoid fabricated image descriptions |
| Add breadcrumbs / RealEstateListing schema | High | Partial | Listing structured data exists; breadcrumb status needs audit |
| Create island landing pages | High | Partial | Sal and Boa Vista exist; Santiago and others need data/SEO prioritization |
| Add author/E-E-A-T signals | High | Open | Needed, but must be honest and not fake authority |
| Build backlink campaign | High | Open | Later May/June, after key pages are stable |
| Submit to Bing Webmaster Tools / IndexNow | Medium | Open | Useful low-effort task |
| Add market statistics/report page | High | Open | Should wait until snapshots and data-health are stable |

## Content and article pipeline

### Operating rule

Okara/Gemini/Grok may provide:

- topic ideas
- search intent
- competitor gaps
- external research leads
- social/community opportunities

They must not be used to publish articles directly.

Every article must pass:

1. Fit check: does it match KazaVerde positioning?
2. Claim check: which facts and numbers are unsupported?
3. Data check: what can KazaVerde actually support from the index?
4. External verification: what needs primary or high-quality sources?
5. Cannibalization check: should this update an existing article instead?
6. Decision: publish soon, revise first, needs data, update existing, park, or reject.

### Current strongest content themes

| Theme | Decision | Notes |
|---|---|---|
| 2026 property tax reform / buying costs | High priority | Strong buyer intent; must be source-verified before writing |
| New development vs resale | High priority | Strong link to off-plan risk, Nos Ilhas, CCore, and developer inventory |
| Tourism growth and Sal / Boa Vista | High priority but needs external validation | Requires tourism data, flight/visitor data, and careful yield wording |
| Cape Verde vs Portugal / Atlantic islands | Medium-high | Good international SEO; requires external market data validation |
| Seaside property under €100K | Medium-high but risky | Strong intent; needs index query and careful location/coastal definition |
| Digital nomad / long-stay property | Medium | Useful for community/social, not core SEO before stronger buyer pages |
| Thin-island articles: Fogo, Maio, Santo Antão, São Vicente, Brava | Park | Source coverage too weak for strong standalone market claims |
| Q1 market report | Park | Requires stable snapshots and source-health history |
| Best agents / agency rankings | Reject for now | Conflicts with neutral index positioning unless verified agency dataset exists |

## Tax reform research packet

Status: source-verified enough for planning, not yet article-ready.

Working conclusion:

Cape Verde's real estate tax framework changed on 1 January 2026. The previous Single Property Tax (IUP) was replaced by two separate codes:

- ITI: Real Estate Transfer Tax / Property Transfer Tax
- IPI: Real Estate Ownership Tax / Property Ownership Tax

High-quality sources used for planning:

- PwC: `https://www.pwc.pt/en/pwcinforfisco/flash/cabo-verde/real-estate-taxes-reform-new-tax-codes.html`
- PwC Tax Summaries: `https://taxsummaries.pwc.com/cabo-verde/individual/other-taxes`
- BTOC: `https://www.btoc.com.cv/en/post/the-iup-ends-welcome-to-iti-and-ipi-cape-verde-s-new-real-estate-tax-reform`
- Carla Monteiro & Associados: `https://cmalex.net/cape-verde-approves-new-iti-code-property-transfer-tax/`
- Official Gazette reference from research packet: `https://boe.incv.cv/Bulletins/View?id=85812`

Verified planning facts:

- Law No. 54/X/2025 approved the ITI Code.
- Law No. 55/X/2025 approved the IPI Code.
- Both entered into force on 1 January 2026.
- IUP was repealed as part of the reform.
- IPI general rate is 0.1% for properties, except land at 0.15% according to PwC.
- ITI generally applies to the taxable value of property transfers, with a general 1% rate according to BTOC and CMALex summaries.
- ITI scope is broader than traditional purchase/sale and includes economically equivalent transfer mechanisms, including certain promissory contracts, assignment of contractual positions, and irrevocable powers of attorney.
- IPI includes higher rates/surcharges for unfinished main facades and vacant, derelict, or degraded urban properties.

Claims to avoid until rechecked:

- do not cite old IUP transfer rates as current law
- do not mix old IUP rates with new ITI/IPI rates
- do not claim exact buyer cost totals without a worked example and source note
- do not present KazaVerde as providing legal or tax advice
- do not overstate the effect of tax reform on actual closing prices unless transaction data is available

Recommended buyer-safe article angle:

`Cape Verde property taxes and buying costs in 2026: what buyers need to verify`

Editorial framing:

- explain that the 2026 reform separates transfer tax from ownership tax
- explain that asking price is not the same as taxable value or closing price
- explain what buyers should ask a lawyer/notary/municipality to verify
- keep examples simple and caveated
- link to the buying guide, mistakes guide, and listings/market pages

## Social and community notes

Okara identified Reddit opportunities, including digital nomad and affordable coastal town threads.

Decision:

- do not start aggressive Reddit outreach yet
- first ensure homepage, article, and core pages are stable
- respond as a helpful founder/person, not as a brand bot
- answer the question first; link only if directly useful

## Near-term execution order

1. Verify live deployment after recent SEO/content PRs.
2. Request indexing for the new article in Google Search Console.
3. Run fresh Okara audit after deploy.
4. Verify the 2026 tax reform facts from primary/high-quality sources.
5. Decide whether to update existing tax/buying articles or create a new canonical buying-costs article.
6. Only then use Claude/Codex for repo implementation.

## Open questions

- Should KazaVerde create a dedicated canonical `buying costs` article or update the existing buying/tax articles?
- Should frozen data-snapshot articles be refreshed quarterly, monthly, or only after major source coverage changes?
- Should KazaVerde add an `llms.txt` file, and what exact instructions should it contain?
- Should AI crawler access be encouraged or restricted?
- How should Portuguese pages be scoped once V1 stabilizes?
