/**
 * Audit Terra Cabo Verde image reliability against the public consumer feed.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/terra_image_reliability_audit.ts
 *   MAX_IMAGES_PER_LISTING=5 npx ts-node --transpile-only scripts/terra_image_reliability_audit.ts
 */
import { createClient } from "@supabase/supabase-js";

const PUBLIC_SUPABASE_URL =
  process.env.PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://bhqjdzjtiwckfuteycfl.supabase.co";

const PUBLIC_SUPABASE_KEY =
  process.env.PUBLIC_SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_fFm5NsC3cWLYr_Wnx9OLWQ_Ytmnn-Wd";

const VIEW = process.env.PUBLIC_FEED_VIEW || "v1_feed_cv";
const SOURCE_ID = process.env.SOURCE_ID || "cv_terracaboverde";
const MAX_IMAGES_PER_LISTING = parseInt(process.env.MAX_IMAGES_PER_LISTING || "3", 10);
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || "4000", 10);
const SAMPLE_LIMIT = parseInt(process.env.SAMPLE_LIMIT || "0", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "12", 10);

type ProbeStatus = "ok" | "dead" | "blocked" | "timeout" | "invalid_url" | "error";

interface FeedRow {
  id: string;
  title: string | null;
  image_urls: string[] | null;
}

interface ProbeResult {
  url: string;
  status: ProbeStatus;
  httpCode?: number;
  contentType?: string | null;
}

interface ListingAudit {
  id: string;
  title: string | null;
  checked: ProbeResult[];
}

function classifyResponse(status: number): ProbeStatus {
  if (status >= 200 && status < 300) return "ok";
  if (status === 403) return "blocked";
  if (status === 404 || status === 410) return "dead";
  return "error";
}

async function probeImage(url: string): Promise<ProbeResult> {
  if (!url || !url.startsWith("http")) {
    return { url, status: "invalid_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AREI image audit)",
        Referer: "https://www.kazaverde.com/",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    clearTimeout(timer);

    return {
      url,
      status: classifyResponse(response.status),
      httpCode: response.status,
      contentType: response.headers.get("content-type"),
    };
  } catch (error: unknown) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      return { url, status: "timeout" };
    }

    return { url, status: "error" };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker())
  );

  return results;
}

async function main() {
  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY);
  let query = supabase
    .from(VIEW)
    .select("id,title,image_urls")
    .eq("source_id", SOURCE_ID)
    .order("id", { ascending: true });

  if (SAMPLE_LIMIT > 0) {
    query = query.limit(SAMPLE_LIMIT);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as FeedRow[];
  const audits = await mapWithConcurrency(rows, CONCURRENCY, async (row): Promise<ListingAudit> => {
    const urls = (row.image_urls ?? []).slice(0, MAX_IMAGES_PER_LISTING);
    const checked = await Promise.all(urls.map((url) => probeImage(url)));

    return {
      id: row.id,
      title: row.title,
      checked,
    };
  });

  const withUrls = audits.filter((row) => row.checked.length > 0);
  const firstBad = withUrls.filter((row) => row.checked[0]?.status !== "ok");
  const allBadChecked = withUrls.filter((row) => row.checked.every((result) => result.status !== "ok"));
  const anyOkChecked = withUrls.filter((row) => row.checked.some((result) => result.status === "ok"));

  const statusCounts = audits.flatMap((row) => row.checked).reduce<Record<ProbeStatus, number>>(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { ok: 0, dead: 0, blocked: 0, timeout: 0, invalid_url: 0, error: 0 }
  );

  console.log(JSON.stringify({
    generated_at: new Date().toISOString(),
    view: VIEW,
    source_id: SOURCE_ID,
    max_images_per_listing: MAX_IMAGES_PER_LISTING,
    concurrency: CONCURRENCY,
    listings_checked: audits.length,
    with_image_urls: withUrls.length,
    first_image_bad: firstBad.length,
    all_checked_bad: allBadChecked.length,
    any_checked_ok: anyOkChecked.length,
    probe_status_counts: statusCounts,
    sample_broken_listings: allBadChecked.slice(0, 12).map((row) => ({
      id: row.id,
      title: row.title,
      checked: row.checked.map((result) => ({
        status: result.status,
        httpCode: result.httpCode,
        url: result.url,
      })),
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error("terra_image_reliability_audit failed", error);
  process.exit(1);
});
