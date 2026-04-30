# KazaVerde SEO Article Machine v1

Last updated: 2026-04-30

## Purpose

This document defines the operating process for producing KazaVerde SEO articles.

The goal is to turn search opportunities into credible, useful, data-aware articles without weakening KazaVerde's positioning as an independent Cape Verde real estate index.

This is a process document only. It does not define app behavior, routing, schema, sitemap changes, or article implementation details.

## Why We Need a Machine, Not One-Off Articles

KazaVerde should not publish isolated SEO articles whenever a tool suggests a keyword.

The article process needs a repeatable machine because every useful topic has several risks:

- search intent can be misunderstood
- old tax or legal information can be repeated as current
- external sources can conflict
- AI tools can invent confidence where KazaVerde has incomplete coverage
- index data can support asking-price observations but not full-market or closing-price claims
- generic buyer guides can dilute the brand instead of building trust

The machine exists to separate signal from noise before anything reaches the repo.

Good output should be:

- search-informed
- data-aware
- externally checked
- honest about coverage limits
- useful to real buyers
- aligned with KazaVerde's neutral index role

## Inputs

### Okara

Okara is used to identify SEO opportunities, technical visibility gaps, search intent patterns, and competitor/content gaps.

Okara is an input, not the editor and not the source of truth.

### Gemini Research

Gemini is used for external research, freshness checks, source discovery, and fact-checking against current public information.

It should be especially useful for tax, legal, visa, tourism, macro, and source-specific claims that may change over time.

### Google Search Console

Google Search Console is used to understand live search performance.

Use it to identify:

- queries that already show impressions
- pages with weak click-through rate
- article updates that may be easier than new content
- indexing status after publication
- ranking movement after refreshes

### Reddit, Facebook, and Community Signals

Community signals are used to understand real buyer language, anxieties, objections, and recurring questions.

These signals should inform topic framing and article usefulness. They should not be treated as verified facts.

### KazaVerde Index Data

KazaVerde index data is the internal truth layer for asking-price observations, source coverage, island-level patterns, listing counts, property types, and data-health limits.

Index data should be used carefully:

- it supports observed listing and asking-price claims
- it does not prove full market coverage
- it does not prove closing prices
- it does not replace legal, tax, or municipal verification

### Market Interviews

Market interviews with buyers, operators, brokers, developers, lawyers, tax advisors, or local experts are used to sharpen judgment.

Interview notes can inform questions, objections, and practical buyer guidance. They should not become hard claims unless the source, context, and verification standard are clear.

## Tool Roles

| Tool or owner | Role |
|---|---|
| Okara | SEO opportunity radar |
| Gemini | External research, freshness, and fact-checking |
| KazaVerde data | Internal truth layer |
| ChatGPT | Strategy, editorial judgment, and prompt design |
| Claude / Codex | Repo implementation |
| Mikael | Final approval |

No tool should own the full article lifecycle.

The operating model is:

- Okara finds opportunities
- Gemini checks the outside world
- KazaVerde data checks what the index can actually support
- ChatGPT shapes the strategy and editorial brief
- Claude/Codex implements approved repo changes
- Mikael approves publication judgment

## Article Pipeline

### 1. Topic Intake

Capture the article idea, source, target query, audience, and why it matters now.

Each topic should start with a clear decision question:

- publish a new article
- update an existing article
- create a landing page later
- park the idea
- reject the idea

### 2. Search Intent Check

Validate what the searcher likely wants.

Classify the intent before drafting:

- cost and tax understanding
- market orientation
- island or location comparison
- legal or residency research
- buyer checklist
- property-type comparison
- investment/tourism context

If the intent does not match KazaVerde's role, park or reject the topic.

### 3. Claim Map

Before writing, list the claims the article wants to make.

Separate claims into categories:

- KazaVerde data claims
- legal or tax claims
- visa or residency claims
- tourism or macro claims
- broker or source claims
- evergreen educational claims

Every number, legal statement, market statement, and ranking-like statement must have an owner and verification path.

### 4. KazaVerde Data Verification

Check what the index can support.

Verify:

- island coverage
- source coverage
- listing counts
- asking-price medians or ranges
- property-type mix
- snapshot date
- known missing sources or weak coverage areas

Use careful framing:

- "observed listings"
- "asking prices"
- "KazaVerde index snapshot"
- "tracked sources"
- "coverage is expanding"

Avoid:

- "the whole market"
- "all properties"
- "closing prices"
- "verified market value"
- "best island" unless the ranking logic is explicit and defensible

### 5. External Fact-Check

Use Gemini and source review to verify claims outside KazaVerde's index.

Prioritize primary or high-quality sources for:

- tax law
- legal process
- visa and residency rules
- tourism arrivals
- flight capacity
- government policy
- macroeconomic data

If a claim cannot be verified, remove it or mark the article as `needs external fact-check`.

### 6. Editorial Rewrite

Rewrite the article for usefulness, accuracy, and KazaVerde tone.

The article should sound:

- calm
- practical
- buyer-aware
- specific
- honest about limits
- independent

Avoid generic AI buyer-guide language, vague optimism, and unsupported confidence.

### 7. Repo Implementation

Claude/Codex should only be used for final repo implementation after the topic, facts, article structure, and publication decision are approved.

Implementation should stay scoped to the approved article or documentation change.

For this process, Codex is not the strategy owner and should not invent new claims during implementation.

### 8. PR Review

Every article PR should be reviewed against the publication gates before merge.

Review should check:

- unsupported numbers
- overbroad market claims
- legal or tax advice risk
- source quality
- internal data consistency
- cannibalization with existing articles
- metadata and internal links
- whether the article actually satisfies the target search intent

### 9. Post-Publish Indexing and Monitoring

After publication:

- request indexing in Google Search Console when appropriate
- confirm the page is reachable on production
- monitor impressions, clicks, query shape, and crawl/index status
- record whether the article needs refresh, expansion, or consolidation

Do not judge success from publication alone. The machine includes monitoring.

## Claim Categories

### KazaVerde Data Claims

Claims based on KazaVerde's index, including observed asking prices, listing counts, source coverage, island-level snapshots, and property-type patterns.

Required standard:

- snapshot date
- coverage caveat
- asking-price language
- no full-market claim unless coverage is proven

### Legal and Tax Claims

Claims about property taxes, transfer taxes, ownership taxes, notary process, registration, lawyer involvement, or buyer obligations.

Required standard:

- current source check
- no legal advice
- no outdated law
- no exact buyer-cost total unless the assumptions are explicit

### Visa and Residency Claims

Claims about stay length, residency, remote work, digital nomads, visas, citizenship, or relocation rules.

Required standard:

- current official or high-quality source
- date-aware wording
- no immigration advice
- clear instruction to verify with the relevant authority or professional

### Tourism and Macro Claims

Claims about visitor growth, demand, airports, flights, GDP, inflation, investment, hotel pipeline, or rental demand.

Required standard:

- reliable external source
- date and geography clarity
- no automatic conversion from tourism growth to property-price growth
- no yield claims without a verified basis

### Broker and Source Claims

Claims about brokers, developers, portals, source reliability, inventory, or market coverage.

Required standard:

- neutral language
- no broker rankings
- no endorsement unless explicitly approved
- no claim that KazaVerde has complete source coverage

### Evergreen Educational Claims

Claims explaining buyer concepts such as asking price vs closing price, due diligence, island comparison, off-plan risk, or how to read listings.

Required standard:

- useful and plain language
- no fabricated examples
- no legal/tax advice
- link back to KazaVerde's role as an index where relevant

## Article Statuses

| Status | Meaning |
|---|---|
| idea | Captured but not yet assessed |
| researching | Search intent, sources, and article angle are being investigated |
| needs data | KazaVerde index checks are required before drafting or publication |
| needs external fact-check | External claims need current source verification |
| drafted | A working draft exists but has not passed editorial review |
| editorial review | The article is being checked for tone, structure, usefulness, and risk |
| ready for repo | Approved for implementation |
| PR open | Repo implementation is under review |
| published | Live on production |
| needs refresh | Existing article requires update, correction, or expansion |
| parked | Useful idea, but not ready or not current priority |
| rejected | Do not pursue under current positioning or verification standard |

## Publication Gates

No article should publish unless it passes these gates:

- no unsupported numbers
- no full market coverage claims
- no closing price claims unless verified
- no broker rankings
- no legal or tax advice
- no AI-slop generic buyer guides

Additional guardrails:

- use "asking price" when using listing data
- use "observed" when using index snapshots
- state relevant limitations clearly
- prefer updating an existing useful article over creating a weaker duplicate
- remove claims that cannot be verified quickly

## Refresh Cadence

| Article type | Cadence |
|---|---|
| Tax and legal | Monthly or when law changes |
| Data and index articles | Quarterly or after major source onboarding |
| Tourism and macro articles | Quarterly |
| Evergreen buyer guides | Semiannual |

Refreshes should check:

- whether the article still matches search intent
- whether laws, rates, or official guidance changed
- whether KazaVerde source coverage changed
- whether Search Console shows new query demand
- whether internal links and related articles need updates

## Immediate May Workflow

The May operating sequence is:

1. Finish live checks for recent SEO and article changes.
2. Run a fresh Okara and Google Search Console audit.
3. Choose the next tax/costs article or decide whether an existing article should be updated.
4. Use Gemini for external fact-checking before drafting final claims.
5. Use Codex only for final repo implementation after the article decision, source checks, and editorial direction are approved.

The priority is not volume.

The priority is a small number of high-trust articles that compound search visibility without creating cleanup work later.
