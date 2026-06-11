const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { applySourceCorrections } = require("../core/pipeline/sourceCorrections");
const { loadSourcesConfig } = require("../core/configLoader");

// Drive the generic correction with the REAL cv_remax config so the test also
// proves the markets/cv/sources.yml wiring, not just the engine in isolation.
const cvSources = loadSourcesConfig("cv").data.sources;
const remax = cvSources.find((s) => s.id === "cv_remax");

test("cv_remax config declares the plot-area reclassification", () => {
  assert.ok(remax, "cv_remax source present");
  assert.deepEqual(remax.corrections.reclassify_area_as_land.when_property_type, [
    "villa",
    "house",
  ]);
});

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

  applySourceCorrections(listing, remax);

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

  applySourceCorrections(listing, remax);

  assert.equal(listing.area_sqm, 70.95);
  assert.equal(listing.land_area_sqm, undefined);
});

test("a source without corrections config is a no-op", () => {
  const listing = {
    title: "T2 Villa plot",
    description: "A large plot.",
    area_sqm: 999,
  };

  applySourceCorrections(listing, { id: "cv_other" });

  assert.equal(listing.area_sqm, 999);
  assert.equal(listing.land_area_sqm, undefined);
});
