import assert from "node:assert/strict";
import { isInternalIslandRow, isPublicIslandRow } from "arei-sdk";

// Internal sentinel rows (must never appear publicly).
assert.equal(isInternalIslandRow("__hidden_for_dedup__"), true, "dedup sentinel is internal");
assert.equal(isInternalIslandRow("__anything__"), true, "any __-prefixed row is internal");
assert.equal(isInternalIslandRow("Sal"), false, "real island is not internal");
assert.equal(isInternalIslandRow("ALL"), false, "ALL aggregate is not a sentinel");

// Public island breakdown: real islands only — excludes ALL + sentinels.
assert.equal(isPublicIslandRow("Sal"), true, "real island is public");
assert.equal(isPublicIslandRow("Boa Vista"), true, "real island with space is public");
assert.equal(isPublicIslandRow("ALL"), false, "ALL aggregate excluded from breakdown");
assert.equal(isPublicIslandRow("__hidden_for_dedup__"), false, "dedup sentinel excluded from breakdown");

// End-to-end: filtering a mixed snapshot leaves only real islands.
const rows = [
  { island: "ALL" },
  { island: "__hidden_for_dedup__" },
  { island: "Sal" },
  { island: "Boa Vista" },
];
const publicIslands = rows.filter((r) => isPublicIslandRow(r.island)).map((r) => r.island);
assert.deepEqual(publicIslands, ["Sal", "Boa Vista"], "only real islands remain");

console.log("briefingIslands tests passed");
