import assert from "node:assert/strict";
import { deriveBriefingConfidence, isBaselineEdition } from "arei-sdk";

// Helpers to build minimal snapshot rows.
const all = (o) => ({ island: "ALL", index_eligible_count: 0, price_coverage_pct: null, sqm_coverage_pct: null, ...o });
const isl = (island, eligible) => ({ island, index_eligible_count: eligible, price_coverage_pct: null, sqm_coverage_pct: null });

// ── deriveBriefingConfidence ────────────────────────────────────────────────

// No ALL row → null.
assert.equal(deriveBriefingConfidence([isl("Sal", 10)]), null, "no ALL row → null");
assert.equal(deriveBriefingConfidence([]), null, "empty → null");

// High: eligible>=50 AND price>=60 AND sqm>=50
let c = deriveBriefingConfidence([all({ index_eligible_count: 80, price_coverage_pct: 65, sqm_coverage_pct: 55 })]);
assert.equal(c.level, "high", "meets all high thresholds");
assert.equal(c.indexEligibleCount, 80, "exposes raw eligible count");
assert.equal(c.priceCoveragePct, 65, "exposes raw price coverage");

// Just missing sqm for high → falls to medium (eligible>=20, price>=40)
c = deriveBriefingConfidence([all({ index_eligible_count: 80, price_coverage_pct: 65, sqm_coverage_pct: 40 })]);
assert.equal(c.level, "medium", "high sqm not met → medium");

// Medium: eligible>=20 AND price>=40
c = deriveBriefingConfidence([all({ index_eligible_count: 25, price_coverage_pct: 45, sqm_coverage_pct: 10 })]);
assert.equal(c.level, "medium", "meets medium thresholds");

// Low: otherwise (thin sample)
c = deriveBriefingConfidence([all({ index_eligible_count: 8, price_coverage_pct: 20, sqm_coverage_pct: 5 })]);
assert.equal(c.level, "low", "thin sample → low");

// Null coverage is treated as 0 (cannot reach high/medium).
c = deriveBriefingConfidence([all({ index_eligible_count: 100, price_coverage_pct: null, sqm_coverage_pct: null })]);
assert.equal(c.level, "low", "null coverage → low");

// smallSampleIslands counts public islands below 5 eligible; ignores ALL + sentinels.
c = deriveBriefingConfidence([
  all({ index_eligible_count: 60, price_coverage_pct: 70, sqm_coverage_pct: 60 }),
  isl("Sal", 40),
  isl("Maio", 3),
  isl("Fogo", 2),
  isl("__hidden_for_dedup__", 1),
]);
assert.equal(c.smallSampleIslands, 2, "Maio + Fogo are small-sample; sentinel excluded");

// ── isBaselineEdition ───────────────────────────────────────────────────────
assert.equal(isBaselineEdition("2026-06-03", []), true, "only edition → baseline");
assert.equal(isBaselineEdition("2026-06-03", ["2026-07-01"]), true, "only later editions → still baseline");
assert.equal(isBaselineEdition("2026-07-01", ["2026-06-03"]), false, "an earlier edition exists → not baseline");

console.log("briefingConfidence tests passed");
