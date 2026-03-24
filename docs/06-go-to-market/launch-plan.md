# Launch Plan

Last updated: 2026-03-24

## Purpose

This document is the canonical launch and learning plan for KazaVerde.

It defines launch readiness, tracks what still blocks a stronger public launch, and makes the go / no-go decision explicit.

## Current Launch Context

KazaVerde is already live, but it is not yet main-stage ready.

This plan exists to move KazaVerde from:
- live but partial

to:
- fully functional
- strategically consistent
- SEO-ready
- legally cleaner
- operationally stable

Canonical deployment assumptions for launch:
- app path: `/kazaverde-web`
- production project: `kazaverde-web`
- production success is only verified when the intended change is visible on `https://kazaverde.com`

Detailed deployment truth lives in `docs/kazaverde_deploy_contract.md`.

## Launch Goal

The goal is not to claim a launch status too early.

The goal is to make KazaVerde a coherent, truthful, and operationally credible Cape Verde public surface.

## Definition Of Done

KazaVerde is considered ready for main stage when all of the following are true:

### Data

- CV KPI targets are met or intentionally re-baselined.
- Public consumer feed matches the intended public inventory.
- Listing images are reliable and fast enough for normal browsing on mobile and desktop.

### Product

- The site has one clear position.
- If KazaVerde is a read-only index / data portal, all marketplace-like language and dead-end CTAs are removed or intentionally redesigned.
- All core pages use real live data where they claim to do so.
- Portuguese is available at launch quality, not partial quality.

### SEO / Distribution

- Search Console is connected and verified.
- Sitemap and robots are correct.
- Indexation status is measured, not guessed.

### Legal / Trust

- Cookie policy exists if tracking or cookies require it.
- Privacy policy and newsletter consent flow are clear.
- Newsletter confirmation experience matches the product brand.

### Ops

- Deploy flow is current and documented.
- Critical docs are not stale.
- Launch status is tracked from this file.
- Production deploy success is verified on `https://kazaverde.com`, not on preview URLs.

## Current Status Snapshot

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

Feed contract status:

- canonical launch feed is `public.v1_feed_cv`
- public feed count is `461` after removing stub and test rows
- stub and test sources `cv_source_1` and `cv_source_2` are excluded from the launch feed
- raw visible vs public feed split is explicitly reported in KPI output

## Product status

Current product is useful, but not yet clean:

- core consumer pages read launch feed via `arei-sdk` and the `v1_feed_cv` path
- launch-truth copy cleanup is applied across core consumer surfaces, including Home, Market, Detail, Footer, About, and Saved UX
- `/saved` is enabled for local-browser saved behavior and misleading sync CTA is removed
- remaining launch work is now mostly quality, compliance, and distribution, not feed contract ambiguity

## Launch Workstreams

### 1. Positioning and product truth

- Keep the primary product position explicit and consistent.
- Recommended position: transparent Cape Verde property index / market data portal.
- Remove or rewrite anything that implies broker, marketplace, or owner-listing workflow unless it is actually functional and intentional.

### 2. Data quality and feed trust

- Keep the launch feed contract stable unless a concrete bug is found.
- Keep KPI reporting precise about raw visible inventory vs public feed inventory.
- Resolve or consciously accept KPI misses with clear thresholds.

### 3. Image reliability and browsing quality

- Fix image loading and perceived performance.
- Improve display-image reliability for real browsing conditions.
- Verify fast gallery scrolling and image switching on mobile.

### 4. Portuguese quality

- Ship Portuguese intentionally, not partially.
- Audit navigation, page copy, forms, newsletter, metadata, empty states, and legal pages.
- Decide whether blog and supporting surfaces launch bilingually or with explicit fallback.

### 5. Legal, privacy, and newsletter trust

- Clarify newsletter consent flow.
- Confirm privacy posture.
- Add cookie policy if current tracking or cookies require it.
- Ensure the confirmation experience matches the KazaVerde brand.

### 6. SEO and distribution baseline

- Verify Google Search Console ownership.
- Submit sitemap.
- Check actual index coverage.
- Confirm canonical tags, metadata, and open graph coverage.

## Open Blockers

The main blockers before a stronger public launch are:

1. Positioning drift is not fully eliminated across all public-facing surfaces.
2. Price coverage remains below the target threshold unless consciously re-baselined.
3. Image reliability and performance are still not strong enough for confident browsing.
4. Portuguese launch quality is not fully locked.
5. Legal, privacy, newsletter, and cookie obligations are not yet fully closed.
6. SEO readiness is still partly assumed rather than verified through Search Console and index evidence.

Image reliability and performance remain a real launch blocker.

## Launch Decision / Go-No-Go

## Current decision

Do not call KazaVerde main-stage ready yet.

Current recommendation:
- no-go for a stronger main-stage launch claim
- continue in soft live / controlled iteration mode

## Go threshold

KazaVerde is ready for a go decision only when all of the following are true:

- all critical blockers are resolved or consciously accepted with explicit rationale
- KPI misses are resolved or intentionally re-baselined
- public feed contract remains stable and monitored
- image performance is fixed
- Portuguese is live at acceptable quality
- legal and trust items are live
- Search Console is connected and checked

## No-go logic

If those conditions are not met, the project should remain in controlled iteration rather than claiming a stronger launch state.

## Launch Sequencing

Recommended order:

1. Keep feed logic frozen unless a concrete bug is found.
2. Resolve image reliability and performance first.
3. Finish remaining product-truth gaps.
4. Lock Portuguese quality.
5. Close legal, privacy, and newsletter trust work.
6. Verify SEO baseline and index evidence.

## Post-Launch Learning Plan

After main-stage launch, the next goal is not feature sprawl. The next goal is real learning.

Early post-launch learning should focus on:
- whether the current positioning is understood by users
- whether the feed remains trustworthy in real usage
- whether image and browsing quality hold under normal traffic
- whether SEO and discovery produce meaningful demand signals
- which product improvements are justified by actual usage rather than assumption

The iPhone app v2 should not be treated as a website launch blocker.

It becomes rational only after:
- the website is strategically stable
- the data and feed contract are stable
- image performance is solved
- Portuguese is live
- analytics and Search Console provide real usage data
- at least 4 to 8 weeks of stable post-launch learning exist

## Reporting And Ownership

This file should remain the single canonical launch plan.

Launch-relevant truth should not live only in:
- chat residue
- temporary notes
- isolated work logs

Every material launch change should be reflected here, in the launch risk register, or in the decision log as appropriate.

## Relationship To Other Canonical Docs

- `docs/05-quality-control/launch-risks.md` is the canonical launch risk register.
- `docs/03-product/mvp-scope.md` defines what belongs inside the current MVP.
- `docs/03-product/v2-roadmap.md` defines what should wait until after launch stabilization.
- `docs/kazaverde_deploy_contract.md` defines deployment verification truth.
