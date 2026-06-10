const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register/transpile-only");

const { resolveIslandRecovery } = require("../core/islandRecovery");

const cases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/islandRecovery.cases.json"), "utf-8")
);
const golden = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/islandRecovery.golden.json"), "utf-8")
);
const goldenByName = new Map(golden.map((g) => [g.name, g.output]));

// Golden master: the config-driven engine must reproduce, byte-for-byte, the
// behavior of the former hardcoded core/cvIslandRecovery.ts across every branch.
test("island recovery reproduces the golden master for every case", () => {
  for (const c of cases) {
    const expected = goldenByName.get(c.name);
    assert.ok(expected, `missing golden output for case ${c.name}`);
    const actual = resolveIslandRecovery(c.input, "cv");
    assert.deepEqual(actual, expected, `case ${c.name}`);
  }
});

// Spot assertions kept readable (these mirror the original cvIslandRecovery tests).
test("resolves Cabo House Tortuga Beach Resort listings to Santa Maria, Sal", () => {
  const result = resolveIslandRecovery(
    {
      id: "chp_cfc6e9876a76",
      sourceId: "cv_cabohouseproperty",
      title: "Charming Detached Villa For Sale Tortuga Beach Resort",
      description: "A villa in the prestigious Tortuga Beach Resort.",
      sourceUrl:
        "https://www.cabohouseproperty.com/properties/villa/sale/ground-first/charming-detached-villa-for-sale-tortuga-beach-resort",
      rawIsland: "Villa, Sale",
    },
    "cv"
  );

  assert.deepEqual(result, {
    kind: "resolved",
    island: "Sal",
    city: "Santa Maria",
    confidence: "high",
    rule: "cabohouseproperty:tortuga_beach_resort",
    matchedText: "Tortuga Beach Resort",
  });
});

test("globallistings country-only resolves a single island token from the page title (medium)", () => {
  const result = resolveIslandRecovery(
    {
      id: "gl_demo",
      sourceId: "cv_globallistings",
      rawIsland: "Cape Verde",
      pageTitleHint: "Luxury homes in Boa Vista",
    },
    "cv"
  );
  assert.equal(result.kind, "resolved");
  assert.equal(result.island, "Boa Vista");
  assert.equal(result.confidence, "medium");
  assert.equal(result.rule, "globallistings:page_title_single_island");
});

test("unknown source with unparseable location yields no_match", () => {
  const result = resolveIslandRecovery(
    { id: "u1", sourceId: "cv_unknown", title: "A house", rawIsland: "unparseable-zzz" },
    "cv"
  );
  assert.deepEqual(result, { kind: "no_match" });
});
