import { loadSourcesConfig, sourceConfigToFetchConfig } from "../core/configLoader";
import { genericPaginatedFetcher } from "../core/genericFetcher";
import { createGenericDetailPlugin } from "../core/detail/plugins/genericDetail";
import { fetchHtml } from "../core/fetchHtml";
import { resolveCvNormalizedLocation } from "../core/cvLocationNormalization";

interface AuditRow {
  id: string;
  title?: string;
  sourceUrl?: string;
  listLocation?: string;
  rawCity?: string;
  rawArea?: string;
  rawIsland?: string;
  normalizedCity?: string;
  normalizedArea?: string;
  normalizedIsland?: string;
}

async function main(): Promise<void> {
  const sourcesResult = loadSourcesConfig("cv");
  if (!sourcesResult.success || !sourcesResult.data) {
    throw new Error(sourcesResult.error || "Failed to load sources config");
  }

  const source = sourcesResult.data.sources.find((s) => s.id === "cv_oceanproperty24");
  if (!source || !source.detail) {
    throw new Error("cv_oceanproperty24 detail config not found");
  }

  const fetchConfig = sourceConfigToFetchConfig(source);
  const listResult = await genericPaginatedFetcher(fetchConfig);
  const plugin = createGenericDetailPlugin(source.id, source.detail, source.price_format);

  const rows: AuditRow[] = [];

  for (const listing of listResult.listings) {
    if (!listing.detailUrl) continue;

    const detailResult = await fetchHtml(listing.detailUrl);
    if (!detailResult.success || !detailResult.html) {
      rows.push({
        id: listing.id,
        title: listing.title,
        sourceUrl: listing.detailUrl,
        listLocation: listing.location,
      });
      continue;
    }

    const extractResult = plugin.extract(detailResult.html, listing.detailUrl);
    const normalized = resolveCvNormalizedLocation({
      id: listing.id,
      sourceId: listing.sourceId,
      title: listing.title,
      description: extractResult.description,
      sourceUrl: listing.detailUrl,
      listLocation: listing.location,
      rawCity: extractResult.rawCity,
      rawArea: extractResult.rawArea,
      rawIsland: extractResult.rawIsland,
    });

    rows.push({
      id: listing.id,
      title: listing.title,
      sourceUrl: listing.detailUrl,
      listLocation: listing.location,
      rawCity: extractResult.rawCity,
      rawArea: extractResult.rawArea,
      rawIsland: extractResult.rawIsland,
      normalizedCity: normalized.city,
      normalizedArea: normalized.area,
      normalizedIsland: normalized.island,
    });
  }

  const affectedRows = rows
    .filter((row) => row.rawCity && row.rawArea && row.rawCity !== row.rawArea)
    .map((row) => ({
      id: row.id,
      title: row.title,
      sourceUrl: row.sourceUrl,
      listLocation: row.listLocation,
      city: row.rawCity,
      area: row.rawArea,
      island: row.rawIsland,
      normalizedCity: row.normalizedCity,
      normalizedArea: row.normalizedArea,
      normalizedIsland: row.normalizedIsland,
    }));

  const target = rows.find((row) => row.id === "op24_89d18f086d75");

  console.log(JSON.stringify({
    sourceId: source.id,
    fetchedListings: listResult.listings.length,
    affectedCount: affectedRows.length,
    affectedRows,
    target,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
