const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { selectInSources, discoverIngestSources } = require("../scripts/list_ingest_sources");

test("selectInSources keeps only lifecycleOverride === 'IN'", () => {
  const sources = [
    { id: "a_in", lifecycleOverride: "IN" },
    { id: "b_drop", lifecycleOverride: "DROP" },
    { id: "c_observe", lifecycleOverride: "OBSERVE" },
    { id: "d_unset" },
    { id: "e_in2", lifecycleOverride: "IN", removal_max_fraction: 0.3 },
  ];
  const result = selectInSources("cv", sources);
  assert.deepEqual(result, [
    { market: "cv", source: "a_in" },
    { market: "cv", source: "e_in2" },
  ]);
});

test("discoverIngestSources reads real cv config and includes known IN sources", () => {
  const all = discoverIngestSources(["cv"]);
  const ids = all.map((e) => e.source);
  assert.ok(ids.includes("cv_nhakaza"), "expected cv_nhakaza in IN set");
  assert.ok(ids.includes("cv_remax"), "expected cv_remax in IN set");
  assert.ok(!ids.includes("cv_rightmove"), "cv_rightmove is DROP, must be excluded");
  for (const entry of all) {
    assert.equal(entry.market, "cv");
    assert.equal(typeof entry.source, "string");
  }
});
