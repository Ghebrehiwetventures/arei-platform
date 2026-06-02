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

// Fields the deep reviewer may diagnose. Subset of the row that maps to real
// curated columns and is meaningful to recover from the source page.
const DIAGNOSABLE_FIELDS = [
  "island", "city", "property_type",
  "bedrooms", "bathrooms", "price",
  "property_size_sqm", "land_area_sqm",
];

const FETCH_STATUSES = new Set(["ok", "failed", "skipped"]);
const MISSING_FIELD_STATUSES = new Set(["scraper_missed", "absent_at_source", "uncertain"]);
const UNMAPPED_TYPES = new Set(["numeric", "integer", "text", "boolean"]);
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;

const DESCRIPTION_MAX = 2000;

function isConfidence(n) {
  return typeof n === "number" && n >= 0 && n <= 1;
}

function validateMissingFieldReport(report) {
  if (!Array.isArray(report)) throw new Error("missing_field_report must be an array");
  for (const e of report) {
    if (!e || typeof e !== "object" || Array.isArray(e)) throw new Error("missing_field_report entry must be an object");
    if (typeof e.field !== "string" || e.field.length === 0) throw new Error("missing_field_report.field must be a non-empty string");
    if (!MISSING_FIELD_STATUSES.has(e.status)) throw new Error("missing_field_report.status must be scraper_missed|absent_at_source|uncertain");
    if (e.status !== "scraper_missed" && e.found_value !== undefined) throw new Error("found_value is only allowed when status is scraper_missed");
    if (!isConfidence(e.confidence)) throw new Error("missing_field_report.confidence must be a number in [0,1]");
    if (e.evidence !== undefined && typeof e.evidence !== "string") throw new Error("missing_field_report.evidence must be a string");
  }
}

function validateUnmappedFields(fields) {
  if (!Array.isArray(fields)) throw new Error("unmapped_fields must be an array");
  for (const f of fields) {
    if (!f || typeof f !== "object" || Array.isArray(f)) throw new Error("unmapped_fields entry must be an object");
    if (typeof f.label !== "string" || f.label.length === 0) throw new Error("unmapped_fields.label must be a non-empty string");
    if (typeof f.value !== "string" || f.value.length === 0) throw new Error("unmapped_fields.value must be a non-empty string");
    if (typeof f.suggested_column !== "string" || !SNAKE_CASE.test(f.suggested_column)) throw new Error("unmapped_fields.suggested_column must be snake_case");
    if (!UNMAPPED_TYPES.has(f.type)) throw new Error("unmapped_fields.type must be numeric|integer|text|boolean");
    if (!isConfidence(f.confidence)) throw new Error("unmapped_fields.confidence must be a number in [0,1]");
  }
}

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

function buildDeepReviewPrompt(row) {
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

  const nullFields = DIAGNOSABLE_FIELDS.filter((f) => {
    const v = row[f];
    return v === null || v === undefined || v === "";
  });

  const system = [
    "You are a data-quality diagnostician for a Cape Verde real-estate listings feed.",
    "A listing row has some empty fields. Your job is to determine, for each empty field,",
    "WHY it is empty by reading the ORIGINAL source page.",
    "",
    "Use the web_fetch tool on the source_url to read the live listing page.",
    "If the page cannot be fetched, set fetch_status to \"failed\" and diagnose from the",
    "description text only. If there is no source_url, set fetch_status to \"skipped\".",
    "Otherwise set fetch_status to \"ok\".",
    "",
    "For each field in FIELDS TO DIAGNOSE, add one entry to missing_field_report:",
    "- status \"scraper_missed\": the value IS on the page/description. Return found_value and a short evidence quote.",
    "- status \"absent_at_source\": the page genuinely does not state this value.",
    "- status \"uncertain\": you cannot tell.",
    "Only include found_value when status is \"scraper_missed\". No guessing — evidence or absent_at_source/uncertain.",
    "When a recovered value maps to one of these columns, ALSO put it in suggested_patch:",
    PATCH_FIELDS.join(", ") + ".",
    "",
    "Separately, list any value present on the page that has NO column above in unmapped_fields,",
    "e.g. terrace area, year built, pool, parking. suggested_column must be snake_case.",
    "",
    "Output JSON only. No prose outside the JSON. Schema:",
    "{",
    '  "verdict": "publish" | "hold" | "hide",',
    '  "confidence": number (0..1),',
    '  "reasons": string[],',
    '  "suggested_patch": { ...mappable recovered values... },',
    '  "fetch_status": "ok" | "failed" | "skipped",',
    '  "missing_field_report": [ { "field": string, "status": "scraper_missed"|"absent_at_source"|"uncertain", "found_value"?: any, "evidence"?: string, "confidence": number } ],',
    '  "unmapped_fields": [ { "label": string, "value": string, "suggested_column": string, "type": "numeric"|"integer"|"text"|"boolean", "confidence": number } ],',
    '  "hide_reason"?: string',
    "}",
    "",
    "Valid islands (use exactly these spellings): " + CV_ISLANDS.join(", "),
    "Valid property_type values: " + PROPERTY_TYPES.join(", "),
  ].join("\n");

  const fieldsToDiagnose = nullFields.length > 0 ? nullFields.join(", ") : "(none — all diagnosable fields are populated)";

  const user = [
    "SOURCE",
    "title: " + (row.title ?? ""),
    "source_url: " + (row.source_url_primary ?? "(no source url)"),
    "description:",
    description,
    "",
    "STRUCTURED FIELDS",
    JSON.stringify(structured, null, 2),
    "",
    "FIELDS TO DIAGNOSE",
    fieldsToDiagnose,
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
  if (json.fetch_status !== undefined && !FETCH_STATUSES.has(json.fetch_status)) {
    throw new Error("fetch_status must be ok|failed|skipped");
  }
  if (json.missing_field_report !== undefined) validateMissingFieldReport(json.missing_field_report);
  if (json.unmapped_fields !== undefined) validateUnmappedFields(json.unmapped_fields);
  return json;
}

const VALID_PUBLISH_STATUS = new Set(["needs_review", "published", "hidden"]);

function buildPatchSql(id, patch, publishStatus) {
  const assigns = [];
  const values = [];
  let i = 1;

  for (const [k, v] of Object.entries(patch || {})) {
    if (!PATCH_FIELDS.includes(k)) throw new Error("unknown patch key: " + k);
    if (v === undefined) throw new Error("patch value for " + k + " is undefined; use null to nullify");
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
      // Parameterless clauses (coalesce/now()) do not advance i. Only value-bound
      // assignments increment it, so $i still points to the WHERE id slot below.
      assigns.push("first_published_at = coalesce(first_published_at, now())");
    }
  }

  if (assigns.length === 0) throw new Error("nothing to update");

  // Parameterless — does not consume $i.
  assigns.push("updated_at = now()");
  values.push(id);

  const text =
    "UPDATE kv_curated.listings SET " + assigns.join(", ") +
    " WHERE id = $" + i + " RETURNING *";
  return { text, values };
}

module.exports = {
  buildReviewPrompt,
  buildDeepReviewPrompt,
  parseAndValidateVerdict,
  buildPatchSql,
  CV_ISLANDS,
  PROPERTY_TYPES,
  PATCH_FIELDS,
  DIAGNOSABLE_FIELDS,
};
