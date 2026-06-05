import assert from "node:assert/strict";
import { briefingHasRequiredSnapshot } from "arei-sdk";

// Helpers to build minimal snapshot rows.
const islandRow = (island) => ({ island, listing_count: 1 });
const allRow = () => ({ island: "ALL", listing_count: 10 });

// Missing / unpublished snapshot → not renderable.
assert.equal(briefingHasRequiredSnapshot([]), false, "empty set is unavailable");
assert.equal(briefingHasRequiredSnapshot(null), false, "null is unavailable");
assert.equal(briefingHasRequiredSnapshot(undefined), false, "undefined is unavailable");

// Island rows present but the 'ALL' aggregate missing → malformed, unavailable.
assert.equal(
  briefingHasRequiredSnapshot([islandRow("Sal"), islandRow("Boa Vista")]),
  false,
  "island rows without the ALL aggregate are unavailable",
);

// Complete snapshot (aggregate present) → renderable.
assert.equal(
  briefingHasRequiredSnapshot([allRow(), islandRow("Sal")]),
  true,
  "set containing the ALL aggregate is available",
);
assert.equal(
  briefingHasRequiredSnapshot([allRow()]),
  true,
  "aggregate-only set is available",
);

console.log("briefingSnapshot tests passed");
