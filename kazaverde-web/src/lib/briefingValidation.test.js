import assert from "node:assert/strict";
import { validateBriefingForPublish } from "arei-sdk";

// A complete, publish-ready edition.
const valid = {
  title: "Cape Verde Listing Index — May 2026",
  period: "May 2026",
  slug: "2026-05",
  snapshot_date: "2026-05-31",
  executive_summary: "Inventory rose while median asking prices held flat.",
  commentary: "A longer editorial paragraph providing market context.",
  key_takeaways: ["Inventory up 8%", "Median flat at €185k", "Sal leads supply"],
};

assert.deepEqual(validateBriefingForPublish(valid), [], "complete edition has no errors");

// Each required field, when blank, produces an error.
assert.ok(validateBriefingForPublish({ ...valid, title: "" }).length > 0, "missing title blocks");
assert.ok(validateBriefingForPublish({ ...valid, executive_summary: "  " }).length > 0, "blank summary blocks");
assert.ok(validateBriefingForPublish({ ...valid, commentary: null }).length > 0, "missing commentary blocks");
assert.ok(validateBriefingForPublish({ ...valid, snapshot_date: "" }).length > 0, "missing snapshot date blocks");

// Takeaway count: < 3 and > 5 both block; 3..5 pass.
assert.ok(
  validateBriefingForPublish({ ...valid, key_takeaways: ["only", "two"] }).length > 0,
  "two takeaways blocks",
);
assert.ok(
  validateBriefingForPublish({ ...valid, key_takeaways: ["1", "2", "3", "4", "5", "6"] }).length > 0,
  "six takeaways blocks",
);
assert.deepEqual(
  validateBriefingForPublish({ ...valid, key_takeaways: ["a", "b", "c", "d", "e"] }),
  [],
  "five takeaways pass",
);

// Blank / whitespace-only takeaways are not counted toward the 3-5 minimum.
assert.ok(
  validateBriefingForPublish({ ...valid, key_takeaways: ["real", "  ", ""] }).length > 0,
  "blank takeaways do not count",
);

// methodology_note is optional — absence does not block.
assert.deepEqual(
  validateBriefingForPublish(valid),
  [],
  "no methodology_note is still valid",
);

console.log("briefingValidation tests passed");
