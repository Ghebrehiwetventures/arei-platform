# KazaVerde Launch Plan

Last updated: 2026-03-07

## 1. Goal

KazaVerde is already live, but it is not yet "main stage" ready.

This file is the canonical launch checklist for getting KazaVerde from:

- live but partial

to:

- fully functional
- strategically consistent
- SEO-ready
- legally cleaner
- operationally stable

This plan is based on:

- `docs/kaza-verde-cv-dominated-kpi.md`
- the current `kazaverde-web` app
- current live data/feed state
- outstanding launch concerns raised on 2026-03-06

## Deployment Mapping

- App path: `/kazaverde-web`
- Production project: `kazaverde-web`
- Production is only verified when the intended change is visible on `https://kazaverde.com`

## 2. Definition Of Done

KazaVerde is considered ready for main stage when all of the following are true:

### Data

- CV KPI targets are met or intentionally re-baselined.
- Public consumer feed matches the intended public inventory.
- Listing images are reliable and fast enough for normal browsing on mobile and desktop.

### Product

- The site has one clear position.
- If KazaVerde is a read-only index/data portal, all marketplace-like language and dead-end CTAs are removed or intentionally redesigned.
- All core pages use real live data where they claim to do so.
- Portuguese is available at launch quality, not partial quality.

### SEO / Distribution

- Search Console is connected and verified.
- Sitemap and robots are correct.
- Indexation status is measured, not guessed.
- Blog/content strategy is aligned with the positioning.

### Legal / Trust

- Cookie policy exists if tracking/cookies require it.
- Privacy policy and newsletter consent flow are clear.
- Newsletter confirmation email matches the product brand.

### Ops

- Deploy flow is current and documented.
- Critical docs are not stale.
- Launch checklist is owned and tracked from this file.
- KazaVerde production deploy is only considered successful when the change is verified on `https://kazaverde.com`. A working `*.vercel.app` URL does not count as production verification. See `docs/kazaverde_deploy_contract.md`.

## 3. Current Snapshot

## Launch status

- Live: yes
- Main stage ready: no
- Recommended launch state today: soft live / controlled iteration

## Data status

Current KPI run on 2026-03-07:

- visible CV listings: 529
- unique canonical ids: 514
- location coverage: 95.8 percent
- image coverage: 88.5 percent
- area-or-bedrooms coverage: 85.4 percent
- duplicates: 2.8 percent
- freshness last 30 days: 100 percent
- stable sources: 11

Current KPI misses:

- price coverage: 82.6 percent vs target 95 percent
- image coverage: 88.5 percent vs target 90 percent

Feed contract status (resolved):

- launch feed is `public.v1_feed_cv`
- public feed count is `461` (after removing stub/test rows)
- stub/test sources `cv_source_1` and `cv_source_2` are excluded from the launch feed
- island normalization recovery is applied
- raw visible vs public feed split is now explicitly reported in KPI output

## Product status

Current product is useful, but not yet clean:

- core consumer pages read launch feed via `arei-sdk` (`v1_feed_cv`) path
- launch-truth copy cleanup is applied across core consumer surfaces, including Home, Market, Detail, Footer, About, and Saved UX
- `/saved` is enabled for local-browser saved behavior and misleading sync CTA is removed
- remaining launch work is now mostly quality/compliance/distribution, not feed contract ambiguity

## 4. What Is Left To Do

## P0 - Must Be Done Before Main Stage

### 4.1 Strategy and positioning

- Decide the primary product position and enforce it everywhere.
- Recommended position: transparent Cape Verde property index / market data portal.
- If that remains the position, remove or rewrite anything that implies broker / marketplace / owner-listing workflow unless it is actually functional and intentional.

Status:

- `LIST PROPERTY` now routes to `/sell` (intentional coming soon flow)
- Detail page external CTA now only `VIEW ON SOURCE` (misleading `CONTACT AGENT` removed)
- Footer future items remain visible but are plain non-clickable text
- `SELL` / `RENT` are still coming-soon surfaces and should be kept intentional in copy

### 4.2 Fix the data contract

Completed:

- canonical launch feed locked to `public.v1_feed_cv`
- feed count updated to `461` after conservative stub/test exclusion migration
- KPI reporting now separates raw visible CV rows vs public feed rows
- no further feed logic changes should be made unless a concrete bug is found

### 4.3 Remove fake or stale product claims

Partially completed:

- hardcoded `9 sources` claims removed from core feed consumer pages
- weighted overall median labels now use launch-safe estimated wording
- About coverage block no longer makes demo-based numeric auto-update claims
- Saved sync CTA/copy removed (no fake cross-device sync claim)
- `/saved` route restored for local browser saved behavior, without sync claims

Still open:

- Saved page is still demo-backed for rendering cards (local saved state is real, data surface is not fully feed-backed)
- inventory trend on Market is still approximate and should remain clearly marked as non-historical until real history is used

### 4.4 Portuguese launch quality

- Ship Portuguese intentionally, not partially.
- Audit navigation, page copy, forms, newsletter, blog metadata, empty states, and legal pages.
- Decide whether blog launches in both languages or English first with explicit fallback.

### 4.5 Image reliability and performance

- Fix image loading.
- Store/copy the needed display images under infrastructure we control instead of hotlinking slow third-party sources for the browsing experience.
- Use responsive image sizing, caching, and preloading rules that fit the design.
- Verify fast gallery scrolling and image switching on mobile.

This is a real launch blocker.

### 4.6 Newsletter confirmation experience

- Create a branded email confirmation that matches the KazaVerde design system.
- Confirm the exact subscription lifecycle:
  - form submit
  - confirmation email
  - confirm click
  - welcome / success state
- Ensure consent copy is explicit.

### 4.7 Cookie / privacy / compliance

- Decide whether the current site uses cookies or tracking that require a cookie notice.
- Add cookie policy if needed.
- Add or revise privacy policy.
- Confirm newsletter compliance language.

### 4.8 SEO launch baseline

- Verify Google Search Console ownership.
- Submit sitemap.
- Check actual index coverage.
- Confirm canonical tags, metadata, and open graph coverage.
- Define the core landing pages that should rank first.

Important note:

- We cannot truthfully say "Google indexed" without Search Console or direct index checks.
- Public assets exist (`robots.txt`, `sitemap.xml`, blog pages), but that is not the same as confirmed indexation.

## P1 - Important, But Can Follow Shortly After Main Stage

### 4.9 Mobile gallery UX

- Support swipe on thumbnail / gallery image flows on mobile.
- Review tap targets and gesture conflicts.

### 4.10 Market-data depth

- Add real inventory trend history.
- Add price per sqm where sample quality is sufficient.
- Add better per-island / per-type distribution.

### 4.11 Better context and documentation

- Keep this file as the canonical launch status.
- Revise stale markdown files.
- Add the minimum missing docs needed for execution clarity.

Recommended docs to maintain:

- `launch_plan.md` - canonical launch tracker
- `seo_plan.md` - keyword clusters, landing pages, Search Console, backlinks
- `content_map.md` - article plan and internal linking map
- `legal_checklist.md` - privacy, cookies, newsletter compliance

## P2 - Post Main-Stage Launch

### 4.12 iPhone app v2

Do not treat iPhone app v2 as a website launch blocker.

Recommended trigger for iPhone app v2:

- website is strategically stable
- data/feed contract is stable
- image performance is solved
- Portuguese is live
- Search Console and analytics give us real usage data
- at least 4 to 8 weeks of stable post-launch learning exists

That is the point where the app decision becomes rational instead of premature.

## 5. Anti-Scraping Strategy

Full prevention is not realistic for a public website.

The goal is not "make scraping impossible."
The goal is:

- reduce easy bulk extraction
- make scraping expensive
- protect the highest-value layers
- keep our brand, UX, and update quality ahead of copycats

## Practical anti-scraping plan

### P0

- Do not expose more data than the consumer experience needs.
- Keep raw/internal data private.
- Serve a limited public feed contract.
- Add rate limiting and WAF rules where possible.
- Monitor aggressive traffic patterns and repetitive listing/detail access.
- Avoid any bulk-download or undocumented public data endpoints.

### P1

- Consider bot management / fingerprinting at the edge.
- Consider image hotlink protection where possible.
- Cache aggressively for humans but detect suspicious bulk access patterns.
- Add terms of use and explicit anti-copy language.

### P2

- Add abuse monitoring dashboards.
- Block abusive IP ranges / ASNs when justified.
- Consider signed media delivery if the current architecture supports it cleanly.

Important note:

- If someone really wants to copy a public site, they can.
- The best durable defense is better data freshness, better normalization, better brand trust, and better distribution.

## 6. Recommended Launch Decision

## Do not call it "main stage" yet.

Recommended threshold for main-stage launch:

- all P0 items complete
- KPI misses resolved or consciously accepted with new targets
- public feed contract remains stable (`v1_feed_cv`) and monitored
- image performance fixed
- Portuguese live at acceptable quality
- legal/trust items live
- Search Console connected and checked

## 7. Immediate Next Steps

1. Use this file as the single source of truth.
2. Convert the P0 section into checked tasks with owner + target date.
3. Keep feed logic frozen unless a concrete bug is found.
4. Resolve image reliability/performance first.
5. Finish remaining product-truth gaps (Saved demo surface and market trend labeling).
6. Finish Portuguese, legal/newsletter, and SEO baseline after that.

## 8. Notes For Context Quality

Question raised: how do we improve context?

Answer:

- yes, a few better markdown files help
- but only if they are canonical and maintained
- too many stale markdown files make context worse, not better

The right move is not "more docs everywhere."
The right move is:

- one canonical launch plan
- one SEO plan
- one content map
- one legal checklist
- revise or archive stale docs

## 9. Soft-Launch Distribution Execution

Last updated: 2026-03-24

This section covers earned distribution during the soft-live phase.
It does not assume Google Ads, paid acquisition, or main-stage readiness.

### Current distribution assets

SEO:
- robots.txt and sitemap.xml are live (12 URLs)
- Google Search Console verification meta tag added to index.html
- Search Console ownership verification pending deploy
- useDocumentMeta hook provides title, description, canonical, and OG tags per page
- No analytics wired up yet

Content:
- 6 blog articles live, embedded in blog-data.ts
  1. buying-property-cape-verde-guide (buying process, legal, costs)
  2. which-cape-verde-island-property (island comparison, data-driven)
  3. cape-verde-property-tax-reform-2026 (2026 tax changes)
  4. cape-verde-rental-yields-realistic (investment yields)
  5. cape-verde-green-card-residency (residency-by-investment)
  6. mistakes-buying-property-cape-verde (common buyer mistakes)

Newsletter:
- NewsletterCta component is live on site
- Supabase table captures emails (anon insert-only, dedup on conflict)
- No confirmation email or branded email flow yet
- No email service provider integration (no send capability)

Social:
- No share buttons on blog posts
- OG tags are set per page (title, description, site_name, url)
- No og:image set on blog posts

### Immediate distribution actions (soft-live phase)

#### D1. Search Console baseline

Status: in progress

Steps:
1. Deploy index.html with google-site-verification meta tag
2. Click VERIFY in the open Search Console dialog
3. Submit sitemap at Sitemaps > Add https://kazaverde.com/sitemap.xml
4. Check index coverage after 48 to 72 hours
5. Use URL Inspection to request indexing for the 6 core landing pages:
   - /listings (highest priority, main discovery surface)
   - /market (market data, differentiator)
   - /blog/buying-property-cape-verde-guide (highest search intent article)
   - /blog/cape-verde-property-tax-reform-2026 (timely, 2026-specific)
   - /blog/cape-verde-rental-yields-realistic (investment audience)
   - /blog/which-cape-verde-island-property (comparison intent)

#### D2. Keyword-to-page alignment

The 6 existing articles already cover the strongest Cape Verde property search intents.
No new content is needed before main-stage. The priority is indexation, not volume.

Primary keyword targets per page:
- /blog/buying-property-cape-verde-guide → "buy property cape verde", "cape verde property guide"
- /blog/which-cape-verde-island-property → "cape verde islands property", "sal vs boa vista property"
- /blog/cape-verde-property-tax-reform-2026 → "cape verde property tax 2026", "cape verde ITI tax"
- /blog/cape-verde-rental-yields-realistic → "cape verde rental yield", "cape verde property investment"
- /blog/cape-verde-green-card-residency → "cape verde residency investment", "cape verde green card"
- /blog/mistakes-buying-property-cape-verde → "buying property cape verde mistakes"
- /listings → "cape verde property listings", "cape verde real estate"
- /market → "cape verde property market", "cape verde property prices"

Validation method: after Search Console has 2 weeks of data, check which queries are generating impressions and clicks. Adjust title tags and descriptions if actual search terms diverge from targets.

#### D3. OG image for social sharing

Status: not started

The site sets og:title and og:description per page, but og:image is missing on most pages.
Without og:image, social shares render with no preview image, which significantly reduces click-through.

Fix:
- Create one default OG image (1200x630) with KazaVerde branding and Cape Verde imagery
- Set it as the fallback og:image in useDocumentMeta
- Optionally create per-article OG images later

This is a high-leverage small fix for any manual sharing or backlink outreach.

#### D4. Newsletter growth during soft-live

The newsletter form captures emails but cannot send anything yet.
That is acceptable for soft-live: the goal is to build the subscriber list now and activate sends later.

Growth tactics that work before email sends are active:
- Newsletter CTA is already on the site (good)
- Blog posts should end with a contextual newsletter hook (example: "Get monthly Cape Verde market updates" at the bottom of each article)
- The /market page should include a newsletter CTA since market-data visitors are the highest-intent newsletter audience
- Success message after subscribe should set expectations: "We'll email you when the first Cape Verde Property Index report is ready."

Pre-send newsletter checklist (needed before first send):
1. Choose an email service provider (Resend, Mailchimp, or Loops are reasonable options)
2. Connect it to the Supabase subscriber table or migrate subscribers
3. Create a branded email template matching the KazaVerde design system
4. Write the first newsletter issue (Monthly Property Index format)
5. Add explicit consent language to the subscribe form
6. Add unsubscribe mechanism to comply with anti-spam law

#### D5. Earned backlink targets

No outreach budget is needed. The goal is to earn links from directories and communities where Cape Verde property buyers already look.

Tier 1 — directory and community submissions:
- Cape Verde expat forums (caboverde.com, expat.com/cape-verde)
- Property portal directories that accept free listings (theglobalpropertyguide.com submission)
- Cape Verde tourism and relocation guides
- Portugal/Lusophone investment communities

Tier 2 — content-driven link earning:
- The tax reform article (2026-specific, timely) is the best candidate for earning links from tax and legal blogs
- The buying guide is linkable from relocation and expat resources
- The island comparison article can earn links from travel content

Approach: manual submission to 5 to 10 relevant directories and communities, with a short description that stays within the read-only index positioning. No marketplace or transaction claims.

#### D6. Analytics baseline

Status: not started

No analytics are currently wired up. Without measurement, distribution work cannot be validated.

Minimum viable analytics:
- Add a lightweight analytics tool (Plausible, Umami, or Vercel Analytics)
- Track: page views, referrer sources, top pages, newsletter conversion rate
- Do not add Google Analytics unless specifically needed; privacy-first tools are simpler and better aligned with the compliance posture

This should be done before or alongside the Search Console activation so both SEO and on-site data start accumulating at the same time.

### Distribution work that should wait

The following should not start until main-stage or later:
- Google Ads or any paid acquisition
- Social media accounts or regular posting schedule
- Partnership or co-marketing outreach
- iPhone app v2 (per launch plan section 4.12)
- Multi-language content distribution (wait for Portuguese launch quality)

### What this phase should prove

The soft-live distribution phase should prove:
1. The site can be indexed and discovered through organic search.
2. The existing 6 articles can generate impressions for Cape Verde property search terms.
3. Newsletter signups accumulate without paid traffic.
4. The read-only index positioning holds up in how people find and describe the site.
5. Distribution learning from Market 1 is reusable for future markets.

These are the inputs for deciding when to move to main-stage.
