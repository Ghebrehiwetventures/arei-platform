// Pure helpers for the kv_curated listing reviewer.
// No DB, no network, no env — so this file is unit-testable in isolation.

const CV_ISLANDS = [
  "Boa Vista", "Brava", "Fogo", "Maio", "Sal",
  "Santiago", "Santo Antão", "São Nicolau", "São Vicente",
];

// Canonical property_type values the model may emit. Mirrors
// core/pipeline/propertyType.ts. Keep in sync when that list changes.
const PROPERTY_TYPES = [
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

module.exports = {
  buildReviewPrompt,
  CV_ISLANDS,
  PROPERTY_TYPES,
  PATCH_FIELDS,
};
