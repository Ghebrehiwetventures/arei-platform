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

test("treats a cap of 0 as the default instead of disabling demotion forever", () => {
  // cap=0 is out of range -> falls back to 0.5; 2/10 = 0.2 <= 0.5 -> allowed
  assert.equal(isDemotionWithinThreshold(2, 8, 0), true);
  // and 6/10 = 0.6 > 0.5 -> still blocked, not silently disabled
  assert.equal(isDemotionWithinThreshold(6, 4, 0), false);
});

test("treats a cap above 1 as the default instead of never blocking", () => {
  // cap=2 is out of range -> falls back to 0.5; 6/10 = 0.6 > 0.5 -> blocked
  assert.equal(isDemotionWithinThreshold(6, 4, 2), false);
});
