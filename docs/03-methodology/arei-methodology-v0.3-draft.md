# AREI · Cape Verde Real Estate Index
## Methodology — Draft v0.3

**Document:** AREI-M-001 · v0.3
**Date:** May 2026
**Status:** Draft · internal and limited external use
**Market:** Cape Verde (Market 01)

> This is a draft methodology document. It describes how the Cape Verde Real Estate Index is currently built. It is published for transparency, not precision. Methodology v1.0 will be finalized after broker feedback, source validation, and pipeline quality work are further advanced.

---

## 1. Purpose

This document explains how AREI collects, processes, and publishes the Cape Verde Real Estate Index. The goal is transparency — to make clear what the index measures, how it is built, and where the current limitations are.

Publishing methodology is not optional. An index without disclosed methodology is not an index. It is a number.

This document is a working draft. Where methods are still being refined, that is stated. The intent is to be credible and honest, not to appear more finished than we are.

---

## 2. Scope

**Market:** Cape Verde
**Coverage:** Public asking-price listings from monitored sources across Cape Verde islands
**Islands covered:** Sal, Boa Vista, Santiago, São Vicente, and others where public listing data is available
**Signal type:** Listing-based asking-price index
**Update cadence:** Monthly
**Index start date:** 2026 (initial coverage — historical depth building)

---

## 3. What the index is

The Cape Verde Real Estate Index is a listing-based asking-price index. It tracks asking prices published by brokers and agencies in Cape Verde across monitored public sources. It is updated monthly and published with methodology disclosure.

The index measures the distribution of asking prices in the market as represented by monitored public listings. It is a market signal — a structured view of what the listing market looks like — not a transaction record, a valuation, or a survey.

---

## 4. What the index is not

**Not a transaction-price index.**
The index does not use closing prices, sale prices, or transaction records. Transaction data is not publicly accessible in Cape Verde. All values are based on asking prices as published by brokers and agencies. Asking prices and closing prices may differ.

**Not a valuation.**
The index does not value any individual property. It does not make assessments of market value, fair value, or investment value. It measures what is being asked, not what properties are worth.

**Not an official index.**
The Cape Verde Real Estate Index is not published by a government body, a central bank, a statistics agency, or any regulated financial institution. It is produced by AREI, a private data company.

**Not a complete picture of the market.**
The index covers public listing data from monitored sources. It does not cover private sales, off-market transactions, direct developer sales, or listings that do not appear on monitored sources. Coverage is expanding.

**Not a guaranteed-accurate source.**
Listing data contains errors. Prices are sometimes wrong, stale, or duplicated. The methodology is designed to catch and filter these, but it does not eliminate them entirely. See Section 15 (Known Limitations).

---

## 5. Data sources

The Cape Verde Real Estate Index is built from public listing data collected from monitored sources in the Cape Verde market.

**Source types:**
- Broker and agency websites (primary)
- Property portals with Cape Verde coverage
- Structured public feeds where available
- Registered source partnerships where established

**Current source count:** 17 sources mapped and quality-graded as of v0.3.

**Source registry:** Each source is assigned a source ID and tracked for listing volume, freshness, completeness, and feed reliability. The source registry is maintained internally and expanded as new sources are identified.

**Source quality grades:** Sources are graded based on structural quality, field completeness, and data freshness. Grade affects source reliability score, which feeds into listing scoring.

*A summary of source types and grade distribution will be included in the methodology v1.0 appendix.*

---

## 6. Record fields

Each listing ingested from a monitored source becomes a record. The following fields are extracted and normalized where available:

| Field | Description | Required for index eligibility |
|---|---|---|
| Asking price | Published asking price in the listing currency | Yes |
| Currency | Currency of the asking price | Yes |
| Square meters | Gross internal area or advertised area | Yes |
| Location | Island, municipality, or named area | Yes |
| Property type | Apartment, villa, land, commercial, other | Preferred |
| Broker / agency | Name of the listing broker or agency | Yes |
| Source | Origin source (site or feed) | Yes |
| Listing URL | Direct link to the source listing | Yes |
| Images | Whether the listing includes images | Scored |
| Listing date | Date first observed or published | Preferred |
| Last updated | Date of most recent change observed | Preferred |

Fields marked "Preferred" improve the record's completeness score but are not required for index eligibility. Fields marked "Yes" are required.

---

## 7. Source mapping

Before ingestion begins, each source is mapped. Mapping involves:

1. Identifying the source's listing structure (HTML layout, API, feed format)
2. Locating the relevant fields for each record type
3. Documenting known limitations of the source (missing fields, inconsistent formats, pagination behaviour)
4. Assigning a source ID and initial quality grade

Source maps are maintained in the source registry and updated when source structure changes. When a source structure breaks, the source is flagged for re-mapping before ingestion resumes.

Cape Verde has 17 mapped sources at v0.3. Not all sources are active at any given time — some are paused for re-mapping, some are low-quality and monitored but not index-eligible.

---

## 8. Ingest

Ingest is the process of collecting raw listing data from each mapped source.

**Method:** Scheduled crawl. Each active source is crawled on a regular schedule to detect new listings, price changes, and removed listings.

**Structured feeds:** Where a source provides a structured feed (XML, JSON, CSV), the feed is used in preference to HTML parsing. Structured feeds are more reliable and produce cleaner records.

**Raw record storage:** Each raw ingest produces a raw record. Raw records are stored before processing. This allows the pipeline to reprocess records if normalization or scoring rules change.

**Ingest failure handling:** If an ingest run fails for a source, the source is flagged. The most recent successful ingest remains in the dataset until the issue is resolved. Stale sources are tracked separately from fresh sources.

*Pipeline reliability is in active development at v0.3. Middle-layer validation — the ability to isolate and diagnose ingest failures per source — is in progress.*

---

## 9. Normalization

Raw records contain inconsistent field formats. Normalization converts them into a standard structure.

**Price normalization:**
- Prices are extracted and converted to a common currency (EUR) using exchange rates at the time of ingest.
- Prices that appear to be per-square-metre rather than total are flagged and excluded pending review.
- Prices that fall outside a plausible range for the market type and location are flagged for review.

**Area normalization:**
- Square metre figures are extracted. Where only range values are given (e.g. "80–120m²"), the midpoint is used and the record is flagged as approximate.
- Area figures that appear implausibly small or large are flagged.

**Location normalization:**
- Location strings are mapped to a standardised geography: island → municipality → named area.
- Listings with only island-level location are indexed at island level.
- Listings with no locatable geography are excluded from the index.

**Property type normalization:**
- Property type strings are mapped to a standard taxonomy: apartment, villa, townhouse, land, commercial, other.
- Where property type cannot be determined, it is recorded as unknown.

**AI-assisted extraction:**
Where structured field extraction fails or is absent, AI-assisted extraction is used to identify price, area, location, and property type from listing text and titles. AI-extracted fields are flagged and given a lower field confidence weight.

---

## 10. Deduplication

Listings frequently appear across multiple sources — the same property listed by the same broker on their website, a portal, and an aggregator simultaneously.

**Deduplication approach:**
Duplicate detection runs across all ingested records using a combination of:
- Price match within a defined tolerance
- Area match within a defined tolerance
- Location match at island or municipality level
- Broker or agency name match

When two or more records match on these criteria, they are grouped. The highest-quality record in the group (based on field completeness and source reliability) is kept as the canonical record. Others are flagged as duplicates and excluded from the index.

**Duplicate risk score:**
Each record receives a duplicate risk score. High duplicate risk indicates the record may be a duplicate of another record in the dataset. Records with high duplicate risk but no confirmed canonical counterpart are held pending review rather than excluded automatically.

**Known limitation:** Cross-source deduplication at v0.3 is not complete. Some duplicates may remain in the dataset, particularly where the same listing appears with minor price differences across sources. This is a priority improvement for v1.0.

---

## 11. Scoring

Each normalized, deduplicated record is scored before index eligibility is assessed.

**Completeness score (0–100):**
Measures how many of the required and preferred fields are present and populated. A record with all required fields and all preferred fields scores 100. A record with only the minimum required fields scores lower.

**Freshness score:**
Based on the time since the listing was last observed or updated. Listings not seen in the past 30 days are considered stale. Stale listings receive a reduced freshness score and may be excluded from the active index pending confirmation that the listing is still live.

**Image coverage:**
Whether the listing includes images. Listings with images are scored higher — image presence is a proxy for listing quality and broker engagement.

**Source reliability score:**
Each source has a reliability score based on its historical data quality, field completeness, and structural stability. Listings from higher-reliability sources receive a higher source reliability contribution to their overall score.

**Overall record score:**
A weighted combination of the above. The weighting at v0.3 is:
- Completeness: 40%
- Freshness: 30%
- Source reliability: 20%
- Image coverage: 10%

*Weights will be reviewed and may change in v1.0 based on empirical analysis of score distributions.*

---

## 12. Index eligibility

A record is index-eligible if it meets all of the following:

1. All required fields are present (price, currency, area, location, broker, source, URL)
2. Price and area are within the plausible range for the market and property type
3. Location is resolvable to at least island level
4. The record is not flagged as a duplicate
5. The listing is not stale (last observed within 30 days, or confirmed still live)
6. Overall record score is above the minimum threshold

*The minimum score threshold at v0.3 is under review. The current threshold is set conservatively to prioritise data quality over coverage volume.*

Records that do not meet eligibility are excluded from the index but retained in the raw dataset. They may become eligible if they are updated or if the scoring rules change.

---

## 13. Publication rules

**Index value:**
The Cape Verde Real Estate Index value is derived from the distribution of asking prices per square metre across index-eligible records in the current month's active dataset.

The index reports:
- Median asking price per square metre (overall market)
- Median asking price per square metre by island (Sal, Boa Vista, Santiago, São Vicente)
- Total index-eligible listing count
- Month-on-month movement where at least two consecutive months of data are available

**Minimum sample threshold:**
An island-level index value is only published if the minimum sample threshold for that island is met. If the sample is too small, the island-level value is suppressed and only the market-level value is published.

*Minimum sample thresholds are in review for v1.0 and will be published as part of the full methodology.*

**Publication cadence:** Monthly. Index values are updated at the end of each calendar month from the active dataset at that date.

**Historical series:** Index values are retained and will be published as a historical series as the dataset matures. At v0.3, the historical series is in its early months.

---

## 14. Disclosure language

The following disclosure must appear on every published index value, in any medium:

> Based on monitored public asking-price listings. Not transaction prices or valuations. Methodology v0.3 — draft. Subject to revision.

Shortened form for space-constrained contexts:

> Listing-based asking-price index. Not transaction prices. Methodology v0.3 draft.

Do not publish an index value without one of these disclosures. This applies to the public index surface, investor materials, briefings, and any third-party reference.

---

## 15. Known limitations

These are real limitations of the methodology at v0.3. They are stated here as part of the transparency commitment.

**Asking price ≠ transaction price.**
The index measures what is being asked, not what is being paid. In markets where negotiation is common, the gap between asking and closing prices can be significant. This index does not close that gap.

**Coverage is not complete.**
17 sources are mapped. This does not represent all property listings in Cape Verde. Off-market sales, direct developer transactions, and listings that do not appear on monitored sources are not captured.

**Duplication may persist.**
Cross-source deduplication is not fully resolved at v0.3. Some duplicate listings may inflate apparent inventory. Deduplication improvements are in progress.

**Source quality is uneven.**
Some sources produce high-quality, consistently structured listings. Others are inconsistent, poorly structured, or updated infrequently. Source quality variation affects the reliability of records from different parts of the market.

**AI field extraction introduces uncertainty.**
Where structured extraction fails, AI-assisted extraction is used. AI-extracted fields carry more uncertainty than structured fields. These records are flagged internally but the uncertainty is not always visible in the published index.

**Historical series is short.**
At v0.3, the dataset covers a small number of months. Month-on-month comparisons are available where data exists, but multi-year trend analysis is not yet possible. Historical depth grows with each month of operation.

**Island-level samples may be small.**
Some islands have fewer listings. Small samples produce less stable index values. Island-level values with small samples are suppressed or clearly marked as low-sample.

---

## 16. Path to methodology v1.0

Methodology v1.0 is the target. The following must be resolved before v1.0 is published:

**Source validation.**
All 17 mapped sources reviewed for structural quality, field completeness, and reliability grade. Source registry documented and publishable.

**Deduplication improvement.**
Cross-source deduplication refined to reduce false positives and residual duplicates. Duplicate risk score validated against a manually reviewed sample.

**Score threshold calibration.**
Minimum index eligibility score threshold set empirically based on the distribution of scores in the live dataset. Documented and justified.

**Sample threshold definition.**
Island-level minimum sample thresholds defined and published. Suppression logic documented.

**AI extraction audit.**
AI-extracted field quality reviewed against manually verified records. Confidence weighting adjusted based on observed error rates.

**Broker feedback incorporated.**
Methodology reviewed against feedback from Cape Verde brokers. Known data quality issues from the broker perspective documented and addressed where possible.

**Historical series established.**
At least six months of index-eligible data available to publish a meaningful historical series.

**External review.**
Methodology reviewed by at least one external party with data and index knowledge before publication. Review findings documented.

---

*AREI-M-001 · Draft v0.3 · May 2026*
*Not for use as a final or authoritative methodology. Subject to revision.*
*Methodology v1.0 expected after broker validation and pipeline quality work.*
