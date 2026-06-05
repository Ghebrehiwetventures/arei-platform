const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { extractPropertyType, LAND_TYPES } = require("../core/pipeline/propertyType");

test("classifies plural lots as land", () => {
  const propertyType = extractPropertyType(
    "Lots in new subdivision - Ilha do Sal - Murdeira",
    "https://www.ccoreinvestments.com/en/property-detail/sal-murdeira/750773"
  );

  assert.equal(propertyType, "land");
  assert.equal(LAND_TYPES.test(propertyType), true);
});
