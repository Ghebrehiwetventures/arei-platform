# Market Intelligence Pipeline Strategy

Last updated: 2026-05-15

## Purpose

This document defines AREI's market intelligence and news capability, and clarifies the relationship between country site News sections and a possible future standalone *Africa Real Estate Pulse* site.

It is a strategy document. It does not authorize a new public site, a new public brand, or any change to repo, package, or deployment naming. Those remain follow-on decisions and must be reconciled against the canonical brand architecture before they can be acted on.

## Context and scope

- AREI is the master brand and the parent platform.
- Country index sites are the deep, per-market public surfaces. The first live country surface is Cape Verde Real Estate Index, which already runs a curated Market News feed at `/market-news`.
- *Africa Real Estate Pulse* is, at present, an internal working name for the cross-market intelligence capability and a strategic option for a future cross-market public surface. It is not yet a committed product.
- Two domains have been secured:
  - `africarealestatepulse.com` as strategic optionality for a possible cross-market public surface.
  - `africarealestatenews.com` as a defensive asset only, not a product name.

This document supersedes earlier informal framings that treated "Pulse" as either a separate company, a generic news site, or a replacement for the Index product.

## 1. Why this capability matters

External investors looking at African property markets face a structural information problem. Relevant signals are scattered across local government communications, local-language press, tourism and aviation announcements, infrastructure and energy programmes, broker commentary, regulatory updates, banking and credit decisions, multilateral reviews, and informal social channels. The information exists but is fragmented, often local-language, and rarely organised in a way that maps onto an investment thesis.

The market intelligence capability turns that fragmented surface into simple, source-linked context. It is not journalism, not advisory, and not an opinion product. It is a curation and translation layer that lets a non-local investor understand what is happening in a market and why it might matter for property, without having to read four government sites, two regulatory bulletins, and a Portuguese-language trade journal.

The capability is already valuable internally. The strategic question is whether and how it should be exposed externally.

## 2. Current public implementation

The first validation surface is the Market News section on `capeverderealestateindex.com/market-news`. It is a curated link feed with title, source name, date, category, and a short "Why it matters" paragraph for each item. It does not republish full articles. It links back to the original source.

This is the working prototype of the Pulse capability under the Index brand. Cape Verde is the first and only validation market. Pulse must not be expanded to Ghana, Kenya, Nigeria, Morocco, Senegal, or any other market until the Cape Verde workflow has been tightened, evaluated, and meets the validation criteria defined below.

## 3. Public surface model

There are two possible public surfaces for the capability. They are complementary, not competing.

**Surface 1: Country site News sections.** Each country index site carries a News section that gives country-specific market context and routes users to listings, index data, and methodology. Examples:

- Cape Verde Real Estate Index / news (live)
- Ghana Real Estate Index / news (future)
- Kenya Real Estate Index / news (future)

These surfaces are about depth, local credibility, and conversion. A user who already knows they care about Cape Verde lands on the country site and reads country-specific context.

**Surface 2: A possible standalone Africa Real Estate Pulse site.** This would be a cross-market discovery surface for investors who do not yet know which country they care about. It would offer country and category filters, a latest-signals feed across markets, email capture, and routing back to country index sites.

The two surfaces serve different points in the funnel. Country `/news` is depth for converted attention. A standalone Pulse surface would be discovery for uncommitted attention.

## 4. Internal working name

"Pulse" is acceptable as an internal name for the intelligence pipeline and the cross-market capability. External public branding remains an open decision and should not be locked until validation supports it. The internal use of "Pulse" does not authorize a public brand launch.

## 5. Domain decision

- `africarealestatepulse.com` has been secured as a strategic optionality domain. It is not committed to a live public site. It exists so that a future decision to launch a cross-market surface is not blocked by domain availability.
- `africarealestatenews.com` has been secured defensively. It is not a product name and should not be treated as one. It exists to prevent a competitor or squatter from anchoring a generic "African real estate news" surface against AREI.

No separate public site should be built on either domain yet. Both are held as optionality.

## 6. Why a standalone Pulse site could make sense

A cross-market discovery surface can do things that country sites cannot do on their own:

- aggregate signals from multiple African markets in one place
- let an investor filter by country, region, and category before choosing a country focus
- act as a top-of-funnel surface for investors searching at the continent or regional level rather than the country level
- carry a newsletter subscription that builds an investor audience across markets
- route qualified traffic back into specific country index sites
- provide an early demand signal for a future professional intelligence product
- create an SEO surface for broader African property market topics that would not fit cleanly under a single country site

This is not a vanity case for the name. It is a case for a top-of-funnel acquisition and routing surface that the country sites are not structurally able to be.

## 7. Why not to overbuild it yet

The case for the surface is conditional, not proven. Building it prematurely creates real costs:

- Cape Verde Market News must first prove that the workflow produces high-quality, low-hype, source-linked output at a repeatable cadence. A cross-market surface that aggregates a single validated market is not yet meaningful.
- AREI already has multiple brand layers (AREI, AREI Admin, country index brands, the still-active KazaVerde architecture, and the broker tool working name). Adding a fifth or sixth public brand surface before the first validated country surface has reached operating maturity is brand sprawl.
- A separate site creates operational overhead: a separate domain, separate analytics, separate compliance copy, separate editorial templates, separate deploy pipeline, and separate SEO posture.
- The cross-market audience hypothesis is not yet evidenced. See Section 13.

The first version, if built, should be narrow. The decision to build it should be gated on evidence, not on the strength of the name.

## 8. Possible standalone V1

If, after validation, the decision is taken to launch a standalone surface, V1 should be deliberately minimal:

- a single landing page on `africarealestatepulse.com`
- a latest-items feed pulling from the same pipeline that powers country `/news` sections
- a country filter
- a category filter
- a subscribe form for an investor newsletter
- outbound links to the relevant country index site for each item
- clear "by AREI" or "part of AREI" positioning
- no paid accounts
- no user accounts beyond newsletter subscription
- no separate CMS unless the existing pipeline cannot serve cross-market output cleanly
- no complex personalization
- no separate editorial team

V1 exists to test whether the cross-market surface produces measurable discovery, subscription, and traffic routing. It does not exist to be a destination product in its own right.

## 9. Core workflow

The pipeline is the same regardless of which public surface a given item appears on:

1. local source identified (government publication, regulator, local press, multilateral release, sector trade source, infrastructure operator)
2. AI translation and simplification into clear English
3. investor relevance assessment (does this item plausibly affect property market conditions, capital flows, demand, supply, or regulatory cost)
4. human review for accuracy, source verification, simplicity, and absence of overclaim
5. published item, with country and category tagging, routed to the appropriate public surface

The same item may appear on the relevant country `/news` section and, if applicable, on the cross-market surface.

## 10. Item fields

Each published Pulse item carries the following fields:

- Title
- What happened (short factual summary)
- Why it matters (investor-relevant interpretation, clearly distinguished from fact)
- Source name
- Source URL
- Country
- Region (where applicable)
- Category
- Tags
- Confidence level (internal; public visibility is an open decision)
- Review status
- Published status
- Published date

## 11. Editorial principles

- simple English, written for non-specialist international investors
- no hype, no marketing register, no superlatives
- no overclaiming about market direction or returns
- no investment advice, no recommendation, no opinion on whether to buy
- source is always linked and named
- fact and interpretation are clearly distinguished; "What happened" is fact, "Why it matters" is interpretation
- every item is human-reviewed before publication
- items that cannot be sourced or verified are not published

## 12. Cape Verde validation criteria

The Cape Verde Market News surface must demonstrate the following before any cross-market expansion or any decision to build a standalone Pulse site:

- source quality is high and verifiable
- translation quality is consistently accurate
- English is genuinely simple, not consultancy-register
- factual accuracy holds up under spot-check
- "Why it matters" is useful, specific, and free of generic filler
- hype level is low and consistent
- investor context is clear without being prescriptive
- the human review flow is repeatable and not a personal bottleneck
- there is at least an early signal of subscriber interest if the surface is exposed publicly through a subscribe form

These are operating gates, not aspirations. The Pulse capability should not scale past Cape Verde until these are met.

## 13. Cross-market audience validation criteria

A standalone Pulse site should not be built simply because the name is good or the domain is secured. It should be built if, and only if, there is evidence that a cross-market investor audience exists and is reachable.

Validation should include some combination of:

- search volume analysis for broad terms such as *African real estate*, *Africa property investment*, *Cape Verde real estate*, *Ghana real estate*, *Kenya real estate*, *Morocco real estate*
- competitor and adjacent audience mapping (see Section 14)
- newsletter signup tests, run on the existing country site or a minimal landing page
- landing page waitlist tests for `africarealestatepulse.com`
- measured traffic to broad Africa real estate content published on country sites or external surfaces
- direct investor conversations confirming that a cross-market discovery surface would be used

The decision to build is gated on evidence that the cross-market audience is real and reachable, not on the strength of the internal name or the availability of the domain.

## 14. Competitive context

The African property intelligence surface is not empty. Adjacent or partially competing references include:

- Estate Intel (sub-Saharan commercial real estate research)
- Knight Frank Africa (international consultancy research on African markets)
- JLL Africa (international consultancy research on African markets)
- Africa Property News and similar trade press
- local-language and country-specific trade outlets in each market
- multilateral and DFI publications (IMF Article IV reviews, World Bank, AfDB) that produce relevant macro context

The point is not that AREI has no competition. The point is that AREI's defensible position depends on combining things that no current player combines:

- country-level index surfaces with structured listing and price data
- source-linked, simply-written local market context
- listing-based data and methodology
- broker-driven data acquisition feeding the underlying dataset
- investor-facing explanations that are simple without being shallow

Pulse alone, framed as a generic news site, would compete with established research brands and likely lose. Pulse as the cross-market discovery layer on top of a country index and broker data flywheel is a different proposition.

## 15. Future expansion path

After the Cape Verde validation criteria in Section 12 are met, Pulse can be tested in additional markets as evaluation pilots, not full launches. Candidate markets include Ghana, Kenya, Nigeria, Morocco, Senegal, and other markets where AREI has a credible source base.

Each market expansion should be treated as a validation step in its own right: source identification, translation quality, review cadence, and useful "Why it matters" output must all hold up before the market is treated as production.

The cross-market standalone surface is only meaningful once there are at least two validated markets feeding it.

## 16. KazaVerde brand and documentation status

KazaVerde should be treated as legacy context and legacy brand architecture unless and until it is explicitly reactivated as the public brand.

The current strategic direction is:

- AREI as the master brand
- country index sites as the public market surfaces
- Pulse as a possible cross-market intelligence and distribution layer

KazaVerde's current public brand role is under review. This document does not by itself rescind KazaVerde's status as defined in `docs/06-go-to-market/brand-architecture.md` or as referenced in `docs/03-product/mvp-scope.md`, `docs/kaza-verde-cv-dominated-kpi.md`, `docs/kazaverde_deploy_contract.md`, and `docs/kazaverde_release_rules.md`. Those documents continue to exist and continue to describe the live KazaVerde architecture.

The strategic shift away from KazaVerde as the primary public surface, in favour of country-named index sites such as Cape Verde Real Estate Index, should be reconciled in a separate documentation cleanup task. That task should:

- decide whether KazaVerde is formally deprecated, paused, or repositioned
- update `docs/06-go-to-market/brand-architecture.md` accordingly
- update `docs/03-product/mvp-scope.md` accordingly
- decide the fate of `kazaverde.com` and related deployment identifiers
- reconcile any remaining "Powered by AREI" endorsement language

Until that cleanup is done, references to KazaVerde in live docs and code should be treated as legacy context, not as current strategic direction.

## 17. Open decisions

The following decisions are explicitly not made by this document:

- Should the public navigation label on country sites be *News*, *Market News*, or *Pulse*?
- Should *Africa Real Estate Pulse* become a standalone public site after validation?
- Should `africarealestatepulse.com` launch as a minimal landing and subscription page in the interim, or remain dark?
- Should country editions use names such as *Ghana Real Estate Pulse* or *Cape Verde Real Estate Pulse*, or should country surfaces stay under the *Index* name with a `/news` section?
- Should Pulse items be syndicated through the AREI newsletter, a separate Pulse newsletter, or both?
- Should item confidence levels be visible publicly, or remain an internal field?
- Should professional or paid users later receive deeper filtering, archive access, and cross-market search?
- Should KazaVerde be formally deprecated, paused, or repositioned in the separate cleanup task referenced in Section 16?

These decisions should be made deliberately, with evidence, after Cape Verde validation and cross-market audience validation produce signals worth deciding on.
