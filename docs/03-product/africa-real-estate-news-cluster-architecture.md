# Africa Real Estate News Cluster Architecture

Last updated: 2026-06-04

## Purpose

This document defines the product and data architecture foundation for a future Africa Real Estate News product surface.

It is an architecture document only. It does not authorize a public frontend launch, production database migration, production write, navigation change, paywall, crowdfunding flow, email-sending flow, or change to the current Cape Verde `/market-news` rendering.

## Product Definition

Africa Real Estate News is a future AREI product surface for source-linked real estate market intelligence across African countries.

Its job is to help property buyers, sellers, owners, brokers, investors, and future capital-product users understand what is happening in African real estate markets without forcing them to read scattered local press, government releases, broker updates, infrastructure announcements, and policy notices one by one.

The product is not a newspaper, not a content farm, not investment advice, and not a full-article republishing product. It is a factual, source-attributed market intelligence layer.

The core product principle is:

> The user should see story clusters first, not duplicate article cards.

## Definitions

**Article**

One source article from one publisher, RSS feed, manual URL import, or similar discovery channel. An article preserves source attribution and links out to the original publisher.

**Story cluster**

One underlying real-world event that may be reported by multiple articles. A cluster is the primary user-facing unit.

Example:

- Cluster title: Ghana launches major affordable housing project
- Country: Ghana
- Topics: housing, construction, policy
- Articles: source A, source B, source C
- Market relevance note: neutral context explaining why the event may matter, without forecasting impact

**Country page**

A country-specific feed of story clusters relevant to one country.

**Topic**

A normalized product taxonomy for filtering clusters:

- housing
- construction
- infrastructure
- policy
- finance
- tourism/hospitality
- commercial real estate
- land
- investment

## How This Differs From Current CVREI News

The current Cape Verde Real Estate Index News implementation is an article-level curated link feed. It stores and renders each published `market_news` row as an independent item.

That model is acceptable for a narrow manually curated Cape Verde feed, but it does not scale cleanly to an Africa-wide news product because different publishers often report the same event. If every article appears as its own public card, the product quickly feels repetitive and scraped.

Africa Real Estate News should instead use a cluster-first read model:

- public country pages render story clusters
- clusters contain one or more source articles
- articles remain visible as source links and evidence
- users see the event first, then the supporting sources

The existing `/market-news` page should remain unchanged until a reviewed cluster implementation is ready.

## Why Duplicates Happen Today

The current news deduplication model is URL-based. It can detect the same URL, or a normalized URL variant, but it cannot reliably detect the same real-world event reported by different publishers.

Common duplicate patterns:

- a government announcement is republished by several local newspapers
- a trade publication and local newspaper cover the same housing project
- Google News RSS returns a Google redirect URL while a manual import uses the publisher URL
- English and local-language sources report the same event with different titles
- a project has one article about financing, another about launch, and another about government participation
- syndication changes titles and snippets while preserving the same underlying facts

Article-level deduplication is necessary but insufficient. The product needs story-level clustering.

## Why Story Clusters Are Required

Story clusters solve three product problems:

1. They reduce repetitive user experience by grouping duplicate coverage under one event.
2. They create a better intelligence product because multiple sources become supporting evidence rather than clutter.
3. They create a stronger editorial workflow because the curator reviews the event, not only the article.

Cluster-first rendering also improves trust. A cluster can show source count, source names, and direct source links while keeping the AREI summary short and neutral.

## Proposed Database Model

This is a proposed model for a future implementation PR. It should not be applied as a migration until reviewed and approved.

### `news_articles`

Stores one source article or feed item.

Proposed fields:

- `id`
- `title`
- `original_title`
- `source_id`
- `source_name`
- `source_url`
- `canonical_url`
- `resolved_url`
- `published_at`
- `first_seen_at`
- `language`
- `country_code`
- `source_country_code`
- `snippet`
- `image_url`
- `ingestion_source`
- `raw_feed_meta`
- `status` (`candidate`, `published`, `hidden`, `archived`)
- `relevance_score`
- `created_at`
- `updated_at`

Notes:

- `source_url` is the link shown to the user.
- `canonical_url` is the normalized dedup key.
- `resolved_url` is the final publisher URL after redirects where resolution is available.
- `snippet` must remain short and must not copy substantial article text.

### `news_story_clusters`

Stores one underlying real-world event.

Proposed fields:

- `id`
- `cluster_title`
- `summary`
- `market_relevance_note`
- `country_code`
- `primary_topic`
- `topics`
- `affected_regions`
- `entities`
- `status` (`candidate`, `published`, `hidden`, `archived`)
- `editorial_priority` (`high`, `standard`)
- `cluster_confidence`
- `first_published_at`
- `latest_published_at`
- `source_count`
- `created_at`
- `updated_at`
- `reviewed_by`
- `reviewed_at`

Notes:

- Public pages should read clusters, not raw articles.
- `summary` is factual context only.
- `market_relevance_note` must be neutral and evidence-bounded.
- `source_count` can be denormalized for read performance, but the link table remains authoritative.

### `news_article_cluster_links`

Connects articles to story clusters.

Proposed fields:

- `cluster_id`
- `article_id`
- `match_method` (`canonical_url`, `resolved_url`, `title_similarity`, `entity_overlap`, `number_overlap`, `topic_overlap`, `manual`, `semantic`)
- `match_score`
- `is_primary_source`
- `created_at`

Notes:

- A cluster can have many articles.
- An article should normally belong to one primary cluster.
- Manual links should be preserved as editorial decisions.

### `news_sources`

Stores publisher and feed metadata.

Proposed fields:

- `id`
- `name`
- `homepage_url`
- `feed_url`
- `source_type`
- `country_scope`
- `language`
- `enabled`
- `reliability_tier`
- `notes`
- `created_at`
- `updated_at`

Notes:

- Source quality should influence review priority, not automatically determine truth.
- Source metadata should support auditability and future source health tooling.

## Clustering Signals

MVP clustering should be conservative. A false merge is worse than leaving two clusters separate for review.

Required early signals:

- canonical URL
- resolved URL
- normalized title similarity
- country/date window
- shared entities
- shared numbers
- topic overlap
- manual merge/split

Semantic matching can be added later, but it is not required for the MVP. It should not be the first or only clustering mechanism because editorial explainability matters.

Suggested conservative matching flow:

1. Exact URL match by `canonical_url`.
2. Exact final publisher match by `resolved_url`.
3. Candidate cluster lookup by country and date window.
4. Score title similarity, shared entities, shared numbers, and topic overlap.
5. Auto-suggest a cluster when confidence is high.
6. Send uncertain matches to admin review.
7. Preserve manual curator decisions.

## Proposed Admin Workflow

The admin workflow should manage clusters as first-class editorial objects.

Required future actions:

- create cluster from article
- add article to cluster
- remove article from cluster
- merge clusters
- split cluster
- override cluster title
- override summary
- override topics
- override country
- override market relevance note
- publish cluster
- hide cluster
- archive cluster

Review flow:

1. Article enters the candidate queue.
2. The system checks URL-level deduplication.
3. The system suggests an existing cluster or proposes a new cluster.
4. Admin reviews article and cluster suggestion.
5. Admin accepts, changes, merges, splits, or creates a cluster.
6. Admin edits the public-facing cluster fields.
7. Admin publishes the cluster when source links, summary, country, topics, and relevance note meet editorial rules.

No article should be auto-published directly to the public Africa Real Estate News feed without a cluster decision.

## MVP Product Scope

The smallest useful MVP should include:

- country pages
- topic filters
- story cluster cards
- source links
- source count
- manual cluster review before public display

Later, but not required for first launch:

- newsletter capture
- saved countries or saved topics
- alerts
- semantic matching
- source quality dashboard
- paid intelligence features

Out of scope for MVP:

- full article copying
- paywall
- investment recommendations
- forecasts
- crowdfunding funnel
- public user accounts
- automatic publishing without review

## Public Cluster Card Requirements

A public cluster card should show:

- cluster title
- country
- topics
- latest update date
- short factual summary
- neutral market relevance note
- source count
- source links

It should not show:

- copied article body
- unsupported claims about price impact
- investment advice
- invented forecasts
- vague hype such as "game changer" or "proves investor confidence"

## Editorial Rules

All Africa Real Estate News output must follow these rules:

- link to original sources
- no full article copying
- short neutral summaries only
- no unsupported causal claims
- no forecasts unless directly sourced
- no investment advice
- distinguish fact from market context
- attribute source facts where appropriate
- use cautious language for indirect relevance
- do not imply comprehensive coverage of a market

Acceptable language:

- "The project adds context for housing supply in Accra."
- "This is relevant background for buyers tracking infrastructure and access."
- "The source says the project includes 1,000 housing units."

Unacceptable language unless directly evidenced:

- "This will increase property prices."
- "This proves investor confidence."
- "This confirms demand is rising."
- "This is a guaranteed opportunity."

## MVP Launch Plan

The launch path should be staged.

### Stage 1: Architecture Approval

Review this document and approve the cluster-first model.

Exit criteria:

- story cluster model accepted
- article and cluster definitions accepted
- editorial rules accepted
- MVP scope accepted

### Stage 2: Data Foundation PR

Implement database tables and minimal internal read/write helpers behind existing admin access.

Exit criteria:

- migrations reviewed
- no public frontend changes
- no current `/market-news` behavior changes
- local or staging verification only

### Stage 3: Admin Cluster Review PR

Add internal tooling to review article-to-cluster suggestions.

Exit criteria:

- admin can create, merge, split, publish, hide, and archive clusters
- manual override works
- no automatic public launch

### Stage 4: Private Content QA

Run the cluster workflow on one or two countries before public launch.

Exit criteria:

- duplicate rate is visibly lower than article feed
- summaries remain short and neutral
- source links are correct
- false merges are rare and fixable
- manual workload is acceptable

### Stage 5: Public MVP Surface

Only after private QA, build country pages that render clusters.

Exit criteria:

- country page reads clusters only
- source links work
- editorial disclaimer is visible
- no full article text is copied
- no paywall, crowdfunding, or investment advice is introduced

## Risks

### Duplicate-Spam Risk

If clustering is weak, the product will feel like a scraped feed. This is the primary product risk.

Mitigation:

- cluster-first public rendering
- conservative matching
- manual merge/split workflow
- source count instead of repeated article cards

### False-Merge Risk

Different events may look similar, especially recurring government programs or phased construction announcements.

Mitigation:

- avoid aggressive auto-merge
- require country/date/entity/number agreement
- preserve manual split action
- show match reasons in admin

### Copyright Risk

Copying too much source text creates legal and trust risk.

Mitigation:

- short summaries only
- no full article bodies
- source links required
- summaries written in AREI language, not copied source prose

### Editorial Overclaim Risk

AI or humans may overstate the market impact of a news item.

Mitigation:

- strict editorial rules
- no unsupported forecasts
- separate factual summary from relevance note
- human review before publication

### Source Quality Risk

Source coverage and reliability will vary by country.

Mitigation:

- maintain `news_sources`
- track source reliability
- label coverage limits
- do not claim comprehensive country coverage

### Operational Load Risk

Manual clustering can become a bottleneck.

Mitigation:

- start with few countries
- prioritize high-relevance topics
- use suggestions to assist, not replace, review
- defer newsletter and paid products until workflow quality is proven

## Launch Criteria

Do not launch the public Africa Real Estate News frontend until:

- clusters exist as first-class data objects
- public feed renders clusters, not raw articles
- admin can merge and split clusters
- article source links are preserved
- editorial rules are enforced in workflow
- at least one country has enough reviewed clusters to feel useful
- duplicate article cards are not the dominant experience
- summaries are short, neutral, and source-bounded
- product copy clearly states that AREI links to sources and does not republish full articles

## First Implementation PR Recommendation

After this document is reviewed and approved, the first implementation PR should be:

**News cluster data foundation**

Recommended scope:

- add reviewed migrations for `news_articles`, `news_story_clusters`, `news_article_cluster_links`, and `news_sources`
- add indexes for country, topic, status, date, canonical URL, resolved URL, and cluster links
- add row-level security consistent with existing admin/public patterns
- add type definitions and internal data helpers
- add no public frontend
- add no public nav
- do not modify current `/market-news` rendering
- do not touch email sending, paywall, crowdfunding, Pulse, or Market Briefing work

The implementation should stop at a safe internal foundation. Public product work should wait until the data model and admin cluster workflow are reviewed.
