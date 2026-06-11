import assert from "node:assert/strict";
import { buildPublishSelectedSql, normalizePublishIds } from "./reviewQueueDevApi.mjs";

assert.deepEqual(
  normalizePublishIds([" scv_a ", "", "scv_a", 42, "scv_b"]),
  ["scv_a", "scv_b"],
);

const publish = buildPublishSelectedSql(["scv_a", "scv_b"]);

assert.deepEqual(publish.ids, ["scv_a", "scv_b"]);
assert.match(publish.sql, /publish_status = 'published'/);
assert.match(publish.sql, /first_published_at = COALESCE\(first_published_at, now\(\)\)/);
assert.ok(publish.sql.includes("source_id_primary LIKE 'cv\\_%' ESCAPE '\\'"));
assert.match(publish.sql, /publish_status = 'needs_review'/);

console.log("reviewQueueDevApi tests passed");
