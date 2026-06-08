const test = require("node:test");
const assert = require("node:assert/strict");

require("ts-node/register/transpile-only");

const { applyExtractResultToListing } = require("../core/pipeline/enrich");

test("upgrades an explicitly truncated list title from detail extraction", () => {
  const listing = {
    id: "op24_test",
    sourceId: "cv_oceanproperty24",
    title: "Charming Apartment with Sea View in Leme Bed...",
    imageUrls: [],
  };

  applyExtractResultToListing(listing, {
    success: true,
    title: "Charming Apartment with Sea View in Leme Bedje - Santa Maria, Sal Island",
  }, { applyTruncatedTitleUpgrade: true });

  assert.equal(
    listing.title,
    "Charming Apartment with Sea View in Leme Bedje - Santa Maria, Sal Island",
  );
});

test("does not replace a complete title merely because the detail title is longer", () => {
  const listing = {
    id: "complete",
    sourceId: "cv_example",
    title: "Complete listing title",
    imageUrls: [],
  };

  applyExtractResultToListing(listing, {
    success: true,
    title: "Complete listing title | Example Agency",
  }, { applyTruncatedTitleUpgrade: true });

  assert.equal(listing.title, "Complete listing title");
});
