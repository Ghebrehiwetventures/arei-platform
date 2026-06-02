// Pure helpers for the curation workspace endpoints. No DB, no network,
// no env — so this file is unit-testable in isolation. CJS so the
// CommonJS tests in tests/*.test.cjs can require it directly.

const VALID_STATUS = new Set(["all", "published", "needs_review", "hidden"]);

const LIST_COLS = [
  "l.id",
  "l.publish_status",
  "l.title",
  "l.source_id_primary",
  "l.source_url_primary",
  "l.island",
  "l.city",
  "l.property_type",
  "l.bedrooms",
  "l.bathrooms",
  "l.price",
  "l.currency",
  "l.property_size_sqm",
  "l.land_area_sqm",
  "l.image_urls",
  "l.first_seen_at",
  "l.last_verified_at",
  // last_review fields (may be null when the listing has never been reviewed)
  "last_review.verdict     AS last_review_verdict",
  "last_review.confidence  AS last_review_confidence",
  "last_review.hide_reason AS last_review_hide_reason",
  "last_review.created_at  AS last_review_created_at",
].join(", ");

const FROM_AND_JOIN = `FROM kv_curated.listings l
  LEFT JOIN LATERAL (
    SELECT verdict, confidence, hide_reason, created_at
      FROM kv_curated.review_log r
     WHERE r.listing_id = l.id
     ORDER BY r.created_at DESC
     LIMIT 1
  ) last_review ON true`;

function buildListingsQuery(filters) {
  filters = filters || {};
  const where = [];
  const values = [];
  let i = 1;

  if (filters.status && filters.status !== "all") {
    if (!VALID_STATUS.has(filters.status)) throw new Error("status must be one of " + [...VALID_STATUS].join("|"));
    where.push(`l.publish_status = $${i++}`); values.push(filters.status);
  }
  if (filters.source_id) {
    where.push(`l.source_id_primary = $${i++}`); values.push(filters.source_id);
  }
  if (filters.island) {
    where.push(`l.island = $${i++}`); values.push(filters.island);
  }
  if (filters.q) {
    where.push(`(l.title ILIKE $${i} OR l.id ILIKE $${i})`); values.push("%" + filters.q + "%"); i++;
  }
  if (filters.price_min != null) {
    where.push(`l.price >= $${i++}`); values.push(Number(filters.price_min));
  }
  if (filters.price_max != null) {
    where.push(`l.price <= $${i++}`); values.push(Number(filters.price_max));
  }
  if (filters.first_seen_after) {
    where.push(`l.first_seen_at >= $${i++}`); values.push(filters.first_seen_after);
  }
  if (filters.flagged_hide) {
    where.push(`last_review.verdict = 'hide' AND l.publish_status <> 'hidden'`);
  }

  const whereClause = where.length ? "WHERE " + where.join(" AND ") : "";

  // Cap limit at 500 even if a caller asks for more — the page is not paginated.
  const limit = Math.min(Number(filters.limit) || 200, 500);
  const offset = Number(filters.offset) || 0;
  const limitIdx = i++;
  const offsetIdx = i++;

  const text = `
    SELECT ${LIST_COLS}
    ${FROM_AND_JOIN}
    ${whereClause}
    ORDER BY l.first_seen_at DESC NULLS LAST
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countText = `SELECT COUNT(*) ${FROM_AND_JOIN} ${whereClause}`;

  return {
    text,
    values: [...values, limit, offset],
    countText,
    countValues: values,
  };
}

function buildStatsQuery() {
  const text = `
    SELECT
      count(*) filter (where l.publish_status = 'published')   AS live,
      count(*) filter (where l.publish_status = 'needs_review') AS needs_review,
      count(*) filter (
        where l.publish_status = 'needs_review'
          and l.first_seen_at < now() - interval '14 days'
      ) AS needs_review_older_than_14d,
      count(*) filter (where l.first_seen_at >= now() - interval '7 days') AS new_this_week,
      count(*) filter (
        where last_review.verdict = 'hide'
          and l.publish_status <> 'hidden'
      ) AS agent_flagged
    FROM kv_curated.listings l
    LEFT JOIN LATERAL (
      SELECT verdict
        FROM kv_curated.review_log r
       WHERE r.listing_id = l.id
       ORDER BY r.created_at DESC
       LIMIT 1
    ) last_review ON true
  `;
  return { text, values: [] };
}

function buildHistoryQuery(listingId) {
  if (!listingId || typeof listingId !== "string") throw new Error("listing_id is required");
  return {
    text: `
      SELECT id, listing_id, model, verdict, confidence, reasons, suggested_patch, hide_reason, created_at
        FROM kv_curated.review_log
       WHERE listing_id = $1
       ORDER BY created_at DESC
       LIMIT 20
    `,
    values: [listingId],
  };
}

module.exports = { buildListingsQuery, buildStatsQuery, buildHistoryQuery };
