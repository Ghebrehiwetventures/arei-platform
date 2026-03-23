import { getSupabaseClient } from "../core/supabaseClient";

type TerraRow = {
  id: string;
  canonical_id: string;
  image_urls: string[] | null;
  updated_at: string | null;
  last_seen_at: string | null;
  is_stale: boolean | null;
  is_superseded: boolean | null;
};

function score(row: TerraRow): [number, number, number, string] {
  const seenRecently = row.last_seen_at ? 1 : 0;
  const liveRow = row.is_stale ? 0 : 1;
  const imageCount = row.image_urls?.length ?? 0;
  return [seenRecently, liveRow, imageCount, row.updated_at ?? ""];
}

function pickWinner(rows: TerraRow[]): TerraRow {
  return rows.slice().sort((a, b) => {
    const [seenA, liveA, imgA, updatedA] = score(a);
    const [seenB, liveB, imgB, updatedB] = score(b);
    if (seenB !== seenA) return seenB - seenA;
    if (liveB !== liveA) return liveB - liveA;
    if (imgB !== imgA) return imgB - imgA;
    return updatedB.localeCompare(updatedA);
  })[0];
}

async function main() {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("listings")
    .select("id, canonical_id, image_urls, updated_at, last_seen_at, is_stale, is_superseded")
    .eq("source_id", "cv_terracaboverde")
    .not("canonical_id", "is", null)
    .or("is_superseded.eq.false,is_superseded.is.null");

  if (error) throw new Error(`Fetch error: ${error.message}`);

  const rows = (data ?? []) as TerraRow[];
  const byCanonical = new Map<string, TerraRow[]>();
  for (const row of rows) {
    if (!byCanonical.has(row.canonical_id)) byCanonical.set(row.canonical_id, []);
    byCanonical.get(row.canonical_id)!.push(row);
  }

  const duplicateGroups = [...byCanonical.entries()].filter(([, group]) => group.length > 1);
  let superseded = 0;

  for (const [, group] of duplicateGroups) {
    const winner = pickWinner(group);
    const losers = group.filter((row) => row.id !== winner.id);
    for (const loser of losers) {
      const { error: updateError } = await sb
        .from("listings")
        .update({ is_superseded: true })
        .eq("id", loser.id);

      if (updateError) {
        throw new Error(`Failed to supersede ${loser.id}: ${updateError.message}`);
      }
      superseded += 1;
    }
  }

  console.log(`Terra duplicate groups processed: ${duplicateGroups.length}`);
  console.log(`Terra rows marked superseded: ${superseded}`);
  console.log("Verification query:");
  console.log("select canonical_id, count(*) from public.listings where source_id = 'cv_terracaboverde' and coalesce(is_superseded,false) = false group by canonical_id having count(*) > 1;");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
