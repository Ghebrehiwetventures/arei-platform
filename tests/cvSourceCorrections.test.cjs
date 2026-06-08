const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { applyCvSourceCorrections } = require("../core/pipeline/cvSourceCorrections");

test("moves REMAX villa plot TotalArea to land_area_sqm", () => {
  const listing = {
    id: "rmx_730061001-17",
    sourceId: "cv_remax",
    title: "T2 Villa at Viveiro Golf Club",
    description: "This magnificent 1224.63 m² plot awaits your vision.",
    detailUrl: "https://www.remax.cv/en/listings/house/for-sale/santa-maria/730061001-17",
    area_sqm: 1224.63,
    imageUrls: [],
  };

  applyCvSourceCorrections(listing);

  assert.equal(listing.property_type, "villa");
  assert.equal(listing.area_sqm, null);
  assert.equal(listing.land_area_sqm, 1224.63);
});

test("keeps REMAX apartment TotalArea as property area", () => {
  const listing = {
    id: "rmx_apartment",
    sourceId: "cv_remax",
    title: "One-bedroom apartment with sea view",
    description: "A 70.95 square metre apartment.",
    detailUrl: "https://www.remax.cv/en/listings/condo/apartment/for-sale/santa-maria/example",
    area_sqm: 70.95,
    imageUrls: [],
  };

  applyCvSourceCorrections(listing);

  assert.equal(listing.area_sqm, 70.95);
  assert.equal(listing.land_area_sqm, undefined);
});
