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

test("can replace a coarse list location with an authoritative detail address", () => {
  const listing = {
    id: "hcv_location",
    sourceId: "cv_homescasaverde",
    title: "Townhouse",
    location: "Paradise Beach",
    imageUrls: [],
  };

  applyExtractResultToListing(listing, {
    success: true,
    location: "City: Santa Maria State/county: Sal Area: Paradise Beach",
  }, { applyLocationUpgrade: true });

  assert.equal(
    listing.location,
    "City: Santa Maria State/county: Sal Area: Paradise Beach",
  );
});

test("can replace list thumbnails with an authoritative detail gallery", () => {
  const listing = {
    id: "ecv_images",
    sourceId: "cv_estatecv",
    title: "Property",
    imageUrls: [
      "https://estatecv.com/wp-content/uploads/2024/09/card-cover-445x331.jpg",
    ],
  };

  applyExtractResultToListing(listing, {
    success: true,
    imageUrls: [
      "https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg",
      "https://estatecv.com/wp-content/uploads/2024/09/kitchen-1440x913.jpg",
    ],
  }, { replaceImagesWithDetail: true });

  assert.deepEqual(listing.imageUrls, [
    "https://estatecv.com/wp-content/uploads/2024/09/unit-1440x913.jpg",
    "https://estatecv.com/wp-content/uploads/2024/09/kitchen-1440x913.jpg",
  ]);
});
