// Pure helpers for the kv_curated listing reviewer.
// No DB, no network, no env — so this file is unit-testable in isolation.

const CV_ISLANDS = [
  "Boa Vista", "Brava", "Fogo", "Maio", "Sal",
  "Santiago", "Santo Antão", "São Nicolau", "São Vicente",
];

// Canonical property_type values the model may emit. Mirrors
// core/pipeline/propertyType.ts. "property" is the pipeline's catch-all
// fallback for rows where no keyword matched — keep it in the allow-list
// so the model doesn't feel forced to invent a replacement when the source
// text is genuinely ambiguous.
const PROPERTY_TYPES = [
  "property",
  "villa", "apartment", "house", "townhouse", "penthouse",
  "studio", "bungalow", "maisonette", "duplex", "land", "commercial",
];

const PATCH_FIELDS = [
  "bedrooms", "bathrooms", "property_type",
  "island", "city",
  "price", "property_size_sqm", "land_area_sqm",
];

const DESCRIPTION_MAX = 2000;

function buildReviewPrompt(row) {
  const description = (row.description ?? "").length > DESCRIPTION_MAX
    ? row.description.slice(0, DESCRIPTION_MAX) + "\n…(truncated)"
    : (row.description ?? "");

  const structured = {
    island: row.island ?? null,
    city: row.city ?? null,
    property_type: row.property_type ?? null,
    bedrooms: row.bedrooms ?? null,
    bathrooms: row.bathrooms ?? null,
    price: row.price ?? null,
    currency: row.currency ?? null,
    property_size_sqm: row.property_size_sqm ?? null,
    land_area_sqm: row.land_area_sqm ?? null,
    image_urls_count: Array.isArray(row.image_urls) ? row.image_urls.length : 0,
    publish_status: row.publish_status ?? null,
  };

  const system = [
    "You are a publish-readiness reviewer for a Cape Verde real-estate listings feed.",
    "Compare the SOURCE TEXT (title + description) against the STRUCTURED FIELDS.",
    "",
    "Output JSON only. No prose outside the JSON. The schema is:",
    "{",
    '  "verdict": "publish" | "hold" | "hide",',
    '  "confidence": number (0..1),',
    '  "reasons": string[],            // 1-5 short bullets',
    '  "suggested_patch": {            // any subset; omit keys you are not changing',
    '    "bedrooms"?: number|null, "bathrooms"?: number|null,',
    '    "property_type"?: string, "island"?: string, "city"?: string|null,',
    '    "price"?: number|null,',
    '    "property_size_sqm"?: number|null, "land_area_sqm"?: number|null',
    "  },",
    '  "hide_reason"?: string         // present only when verdict === "hide"',
    "}",
    "",
    'Rules for suggested_patch: only suggest a field if it is DIRECTLY supported by the source text. If unsure, OMIT the field. No guessing.',
    'verdict = "hide" when the source text says the listing is reserved, sold, withdrawn, or off market. Put the matched phrase in hide_reason.',
    'verdict = "hold" when there is at least one fixable mismatch the operator should review before publishing.',
    'verdict = "publish" only when the row is internally consistent AND has a non-null source URL, a valid island, and at least one image.',
    "",
    "Valid islands (use exactly these spellings): " + CV_ISLANDS.join(", "),
    "Valid property_type values: " + PROPERTY_TYPES.join(", "),
  ].join("\n");

  const user = [
    "SOURCE TEXT",
    "title: " + (row.title ?? ""),
    "source_url: " + (row.source_url_primary ?? ""),
    "description:",
    description,
    "",
    "STRUCTURED FIELDS",
    JSON.stringify(structured, null, 2),
  ].join("\n");

  return { system, user };
}

const VERDICTS = new Set(["publish", "hold", "hide"]);

function stripCodeFence(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return trimmed;
}

function parseAndValidateVerdict(raw) {
  let json;
  try {
    json = JSON.parse(stripCodeFence(raw));
  } catch (e) {
    throw new Error("verdict was not valid JSON: " + e.message);
  }

  if (!json || typeof json !== "object") throw new Error("verdict is not an object");
  if (!VERDICTS.has(json.verdict)) throw new Error("verdict must be publish|hold|hide");
  if (typeof json.confidence !== "number" || json.confidence < 0 || json.confidence > 1) {
    throw new Error("confidence must be a number in [0,1]");
  }
  if (!Array.isArray(json.reasons) || json.reasons.length === 0 || !json.reasons.every(r => typeof r === "string")) {
    throw new Error("reasons must be a non-empty string[]");
  }
  if (json.suggested_patch == null || typeof json.suggested_patch !== "object" || Array.isArray(json.suggested_patch)) {
    throw new Error("suggested_patch must be an object");
  }
  for (const key of Object.keys(json.suggested_patch)) {
    if (!PATCH_FIELDS.includes(key)) {
      throw new Error("unknown patch key: " + key);
    }
  }
  if (json.verdict === "hide" && json.hide_reason != null && typeof json.hide_reason !== "string") {
    throw new Error("hide_reason must be a string");
  }
  return json;
}

const VALID_PUBLISH_STATUS = new Set(["needs_review", "published", "hidden"]);

function buildPatchSql(id, patch, publishStatus) {
  const assigns = [];
  const values = [];
  let i = 1;

  for (const [k, v] of Object.entries(patch || {})) {
    if (!PATCH_FIELDS.includes(k)) throw new Error("unknown patch key: " + k);
    assigns.push(k + " = $" + i);
    values.push(v);
    i++;
  }

  if (publishStatus != null) {
    if (!VALID_PUBLISH_STATUS.has(publishStatus)) {
      throw new Error("publish_status must be one of " + [...VALID_PUBLISH_STATUS].join("|"));
    }
    assigns.push("publish_status = $" + i);
    values.push(publishStatus);
    i++;
    if (publishStatus === "published") {
      assigns.push("first_published_at = coalesce(first_published_at, now())");
    }
  }

  if (assigns.length === 0) throw new Error("nothing to update");

  assigns.push("updated_at = now()");
  values.push(id);

  const text =
    "UPDATE kv_curated.listings SET " + assigns.join(", ") +
    " WHERE id = $" + i + " RETURNING *";
  return { text, values };
}

module.exports = {
  buildReviewPrompt,
  parseAndValidateVerdict,
  buildPatchSql,
  CV_ISLANDS,
  PROPERTY_TYPES,
  PATCH_FIELDS,
};
