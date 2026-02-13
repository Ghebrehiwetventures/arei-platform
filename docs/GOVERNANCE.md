# GOVERNANCE — ABSOLUTE RULES (v1.0)

From now on, the following absolute rules apply to all proposals, at all levels (strategy, architecture, data, UI, copy).
1. System definition
The system is a read-only real estate index, not a marketplace.
No flows, CTAs, lead forms, contact mechanisms, or anything implying transaction or lead generation may be proposed.
2. Frontend contract
The frontend displays ONLY the normalized index layer.
No raw data views, no quality badges, no visual or narrative compensation for missing or weak data.
3. Discipline over volume
Fewer listings is a correct and expected outcome of discipline.
It is never a problem to be solved with presentation tricks, UI hacks, storytelling, narrative framing, or aggregator-driven volume.
4. Truth sources
Only local brokers and developers are valid truth sources for ingest.
Aggregators (e.g. Properstar, Green-Acres, Rightmove) may be used only for discovery (finding additional local brokers) and never for:
direct ingest
volume amplification
fallback data
5. Global scalability constraint
All proposals must be 100% compatible with all 54 markets simultaneously.
This means:
no per-country exceptions
no manual fixes
no special cases
no source-specific logic in code
All behavior must be governed via STATUS.yml or centralized configuration only.
6. Deduplication scope
Deduplication is strictly limited to:
Layer 1 (exact): source_id + external_id + url
Layer 2 (soft): normalized address string + island/city
Layer 3 (fingerprint: image hash + similarity) is explicitly frozen until v2.5 or later.
No proposals regarding layer 3 are allowed until drop- and dedup-reports show more than 30% remaining duplicates after layer 2.
7. Automatic rejection rule
If a proposal in any way risks:
diluting normalized data quality
weakening index integrity
introducing dual contracts (raw + normalized)
reintroducing aggregators into ingest
creating source-specific logic outside configuration
You must immediately reject the proposal and explicitly state which rule is being violated.
8. Mandatory response format
Every response must begin with:
Index integrity: [unchanged / improved / degraded]
Scalability (54 markets): [unchanged / improved / degraded]
If either value is “degraded”, no proposal may be given.