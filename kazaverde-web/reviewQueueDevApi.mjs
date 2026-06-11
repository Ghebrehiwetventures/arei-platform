const VALID_STATUSES = new Set(["needs_review", "published", "hidden"]);

export function normalizeReviewStatus(value) {
  return VALID_STATUSES.has(value) ? value : undefined;
}

export function normalizePublishIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((id) => typeof id === "string" ? id.trim() : "")
        .filter((id) => id.length > 0),
    ),
  ).slice(0, 100);
}

export function buildPublishSelectedSql(ids) {
  const normalizedIds = normalizePublishIds(ids);
  return {
    ids: normalizedIds,
    sql: `
      WITH requested(id) AS (
        SELECT unnest($1::text[])
      ),
      updated AS (
        UPDATE kv_curated.listings
        SET
          publish_status = 'published',
          first_published_at = COALESCE(first_published_at, now()),
          updated_at = now()
        WHERE id = ANY($1::text[])
          AND source_id_primary LIKE 'cv\\_%' ESCAPE '\\'
          AND publish_status = 'needs_review'
        RETURNING id
      )
      SELECT
        requested.id,
        (updated.id IS NOT NULL) AS published
      FROM requested
      LEFT JOIN updated ON updated.id = requested.id
      ORDER BY requested.id
    `,
  };
}
