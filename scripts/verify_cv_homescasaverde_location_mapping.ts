import { Client } from "pg";
import { parseLocation } from "../core/locationMapper";
import { resolveCvIslandRecovery } from "../core/cvIslandRecovery";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({ connectionString });
  await client.connect();

  const { rows } = await client.query<{
    id: string;
    source_url: string | null;
    title: string | null;
    description: string | null;
  }>(
    `
      WITH latest_run AS (
        SELECT started_at
        FROM public.ingest_runs
        WHERE market = 'cv'
          AND status = 'completed'
        ORDER BY started_at DESC
        LIMIT 1
      )
      SELECT id, source_url, title, description
      FROM public.listings
      WHERE source_id = 'cv_homescasaverde'
        AND coalesce(is_stale, false) = false
        AND coalesce(is_superseded, false) = false
        AND coalesce(last_seen_at, first_seen_at) >= (SELECT started_at FROM latest_run)
        AND review_reasons @> array['MISSING_ISLAND_MAPPING']::text[]
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 1
    `
  );

  await client.end();

  if (rows.length === 0) {
    console.log("No current HomesCasaVerde MISSING_ISLAND_MAPPING rows found.");
    return;
  }

  const sample = rows[0];
  const parsedFromTitle = parseLocation(sample.title ?? undefined, "cv");
  const recovery = resolveCvIslandRecovery({
    id: sample.id,
    sourceId: "cv_homescasaverde",
    title: sample.title,
    description: sample.description,
    sourceUrl: sample.source_url,
    rawIsland: null,
    rawCity: null,
  });

  console.log(
    JSON.stringify(
      {
        sample,
        parsedFromTitle,
        recovery,
      },
      null,
      2
    )
  );

  if (parsedFromTitle.island !== "Sal") {
    throw new Error("Expected parseLocation(title) to resolve HomesCasaVerde sample to Sal");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
