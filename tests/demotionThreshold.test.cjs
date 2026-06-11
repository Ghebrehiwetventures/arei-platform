const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { isDemotionWithinThreshold } = require("../scripts/ingest_to_curated");

test("allows demotion when removed fraction is at or below the cap", () => {
  // 2 removed of 10 published total = 0.2 <= 0.5
  assert.equal(isDemotionWithinThreshold(2, 8, 0.5), true);
});

test("blocks demotion when removed fraction exceeds the cap", () => {
  // 6 removed of 10 published total = 0.6 > 0.5
  assert.equal(isDemotionWithinThreshold(6, 4, 0.5), false);
});

test("allows demotion exactly at the cap", () => {
  // 5 removed of 10 = 0.5 == 0.5
  assert.equal(isDemotionWithinThreshold(5, 5, 0.5), true);
});

test("defaults the cap to 0.5 when maxFraction is undefined", () => {
  assert.equal(isDemotionWithinThreshold(6, 4, undefined), false);
  assert.equal(isDemotionWithinThreshold(2, 8, undefined), true);
});

test("never blocks when nothing would be removed", () => {
  assert.equal(isDemotionWithinThreshold(0, 0, 0.5), true);
  assert.equal(isDemotionWithinThreshold(0, 10, 0.5), true);
});
