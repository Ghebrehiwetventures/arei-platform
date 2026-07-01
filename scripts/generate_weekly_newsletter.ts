/**
 * Cape Verde Real Estate Index weekly newsletter draft generator.
 *
 * Produces local HTML + plaintext drafts for human review. It never sends mail.
 *
 * Usage:
 *   npx ts-node --transpile-only scripts/generate_weekly_newsletter.ts
 *   npx ts-node --transpile-only scripts/generate_weekly_newsletter.ts --date 2026-06-30
 *   npx ts-node --transpile-only scripts/generate_weekly_newsletter.ts --analytics data/weekly-analytics.json
 */
import * as fs from "fs";
import * as path from "path";
import { getSupabaseClient } from "../core/supabaseClient";

const SITE_URL = "https://capeverderealestateindex.com";
const FONT = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface NewsletterSubscriberRow {
  body: string | null;
  meta: { locale?: string } | null;
  created_at: string;
}

interface ListingRow {
  id: string;
  title: string | null;
  island: string | null;
  city: string | null;
  price: number | null;
  currency: string | null;
  property_type: string | null;
  bedrooms: number | null;
  image_urls: string[] | null;
  source_url: string | null;
  first_seen_at: string | null;
}

interface MarketNewsRow {
  title: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
  category: string;
  snippet: string;
}

interface AnalyticsInput {
  visits?: number;
  visitors?: number;
  pageViews?: number;
  topPages?: Array<{ path: string; views?: number; visitors?: number }>;
  listingClicks?: Array<{ listingId?: string; path?: string; clicks: number }>;
  note?: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { date?: string; analytics?: string; outDir?: string } = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--date") out.date = args[++i];
    else if (arg === "--analytics") out.analytics = args[++i];
    else if (arg === "--out-dir") out.outDir = args[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: npx ts-node --transpile-only scripts/generate_weekly_newsletter.ts [--date YYYY-MM-DD] [--analytics file.json] [--out-dir dir]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function readAnalytics(filePath?: string): AnalyticsInput | null {
  if (!filePath) return null;
  const abs = path.resolve(filePath);
  const raw = fs.readFileSync(abs, "utf8");
  const parsed = JSON.parse(raw) as JsonValue;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--analytics must point to a JSON object");
  }
  return parsed as unknown as AnalyticsInput;
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPrice(row: ListingRow): string {
  if (!row.price) return "Price on request";
  const currency = row.currency || "EUR";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(row.price);
}

function listingLocation(row: ListingRow): string {
  return [row.city, row.island].filter(Boolean).join(", ") || "Cape Verde";
}

function listingHref(id: string): string {
  return `${SITE_URL}/listing/${encodeURIComponent(id)}`;
}

function extractListingId(click: { listingId?: string; path?: string }): string | null {
  if (click.listingId) return click.listingId;
  const match = click.path?.match(/\/listing\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function fetchRows(periodStart: string, periodEndExclusive: string, analytics: AnalyticsInput | null) {
  const sb = getSupabaseClient();

  const [
    subscriberCount,
    newSubscriberNotifications,
    latestSubscriberNotifications,
    totalListings,
    newListings,
    latestListings,
    allListingStats,
    latestNews,
    periodNews,
  ] = await Promise.all([
    sb.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
    sb.from("admin_notifications").select("id", { count: "exact", head: true }).eq("event_type", "newsletter.new_subscriber").gte("created_at", periodStart).lt("created_at", periodEndExclusive),
    sb.from("admin_notifications").select("body,meta,created_at").eq("event_type", "newsletter.new_subscriber").order("created_at", { ascending: false }).limit(8),
    sb.from("v1_feed_cv").select("id", { count: "exact", head: true }),
    sb.from("v1_feed_cv").select("id,title,island,city,price,currency,property_type,bedrooms,image_urls,source_url,first_seen_at").gte("first_seen_at", periodStart).lt("first_seen_at", periodEndExclusive).order("first_seen_at", { ascending: false }).limit(8),
    sb.from("v1_feed_cv").select("id,title,island,city,price,currency,property_type,bedrooms,image_urls,source_url,first_seen_at").order("first_seen_at", { ascending: false }).limit(8),
    sb.from("v1_feed_cv").select("island,source_id"),
    sb.from("market_news").select("title,source_name,source_url,published_at,category,snippet").eq("status", "published").order("published_at", { ascending: false }).limit(6),
    sb.from("market_news").select("title,source_name,source_url,published_at,category,snippet").eq("status", "published").gte("published_at", periodStart).lt("published_at", periodEndExclusive).order("published_at", { ascending: false }).limit(6),
  ]);

  const errors = [
    subscriberCount.error,
    newSubscriberNotifications.error,
    latestSubscriberNotifications.error,
    totalListings.error,
    newListings.error,
    latestListings.error,
    allListingStats.error,
    latestNews.error,
    periodNews.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e?.message).join("; "));
  }

  const clickedIds = (analytics?.listingClicks ?? [])
    .map(extractListingId)
    .filter((id): id is string => !!id);
  let clickedListings: ListingRow[] = [];
  if (clickedIds.length > 0) {
    const { data, error } = await sb
      .from("v1_feed_cv")
      .select("id,title,island,city,price,currency,property_type,bedrooms,image_urls,source_url,first_seen_at")
      .in("id", clickedIds);
    if (error) throw new Error(`clicked listing lookup failed: ${error.message}`);
    clickedListings = (data ?? []) as ListingRow[];
  }

  const sourceIds = new Set<string>();
  const byIsland = new Map<string, number>();
  for (const row of (allListingStats.data ?? []) as Array<{ island: string | null; source_id: string | null }>) {
    if (row.source_id) sourceIds.add(row.source_id);
    if (row.island) byIsland.set(row.island, (byIsland.get(row.island) ?? 0) + 1);
  }

  return {
    activeSubscriberCount: subscriberCount.count ?? 0,
    newSubscriberCount: newSubscriberNotifications.count ?? 0,
    latestSubscribers: (latestSubscriberNotifications.data ?? []) as NewsletterSubscriberRow[],
    totalListingCount: totalListings.count ?? 0,
    newListings: ((newListings.data ?? []) as ListingRow[]),
    latestListings: ((latestListings.data ?? []) as ListingRow[]),
    sourceCount: sourceIds.size,
    topIslands: Array.from(byIsland.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4),
    latestNews: (periodNews.data?.length ? periodNews.data : latestNews.data ?? []) as MarketNewsRow[],
    clickedListings,
  };
}

function renderLockup(): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;padding-right:13px;line-height:0;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="3" width="14" height="14" stroke="#0A0A0A" stroke-width="1.4" stroke-linecap="square"/>
            <rect x="6.5" y="6.5" width="14" height="14" stroke="#0A0A0A" stroke-width="1.4" stroke-linecap="square"/>
            <rect x="10" y="10" width="9" height="9" fill="#0A0A0A"/>
          </svg>
        </td>
        <td style="vertical-align:middle;">
          <span style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0A0A0A;">Cape&nbsp;Verde</span>
          <span style="font-family:${FONT};font-size:12px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase;color:#5E5D5B;">&nbsp;Real&nbsp;Estate&nbsp;Index</span>
        </td>
      </tr>
    </table>`;
}

function renderMetric(label: string, value: string, detail: string): string {
  return `
    <td width="33.33%" style="padding:0 8px 14px 0;vertical-align:top;">
      <p style="margin:0 0 4px;font-family:${FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8A8884;line-height:1.4;">${escapeHtml(label)}</p>
      <p style="margin:0 0 2px;font-family:${FONT};font-size:26px;font-weight:600;color:#0A0A0A;line-height:1.1;">${escapeHtml(value)}</p>
      <p style="margin:0;font-family:${FONT};font-size:12px;color:#5E5D5B;line-height:1.45;">${escapeHtml(detail)}</p>
    </td>`;
}

function renderSectionTitle(title: string): string {
  return `
    <tr><td style="padding:34px 0 14px;">
      <h2 style="margin:0;font-family:${FONT};font-size:18px;font-weight:600;color:#0A0A0A;line-height:1.25;">${escapeHtml(title)}</h2>
    </td></tr>`;
}

function renderListing(row: ListingRow, meta?: string): string {
  return `
    <tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;">
      <a href="${listingHref(row.id)}" style="font-family:${FONT};font-size:15px;font-weight:600;color:#0A0A0A;text-decoration:none;line-height:1.35;">${escapeHtml(row.title || "Untitled listing")}</a>
      <p style="margin:5px 0 0;font-family:${FONT};font-size:13px;color:#5E5D5B;line-height:1.5;">${escapeHtml(listingLocation(row))} · ${escapeHtml(formatPrice(row))}${meta ? ` · ${escapeHtml(meta)}` : ""}</p>
    </td></tr>`;
}

function renderNews(row: MarketNewsRow): string {
  return `
    <tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;">
      <a href="${escapeHtml(row.source_url)}" style="font-family:${FONT};font-size:15px;font-weight:600;color:#0A0A0A;text-decoration:none;line-height:1.35;">${escapeHtml(row.title)}</a>
      <p style="margin:5px 0 0;font-family:${FONT};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8A8884;line-height:1.4;">${escapeHtml(row.category)} · ${escapeHtml(row.source_name)}</p>
      <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:#5E5D5B;line-height:1.55;">${escapeHtml(row.snippet)}</p>
    </td></tr>`;
}

function renderHtml(params: {
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  data: Awaited<ReturnType<typeof fetchRows>>;
  analytics: AnalyticsInput | null;
}): string {
  const { issueDate, periodStart, periodEnd, data, analytics } = params;
  const listingsForMain = data.newListings.length ? data.newListings : data.latestListings;
  const clickMap = new Map((analytics?.listingClicks ?? []).map((c) => [extractListingId(c), c.clicks]));
  const clicked = data.clickedListings
    .map((row) => ({ row, clicks: clickMap.get(row.id) ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Cape Verde Real Estate Index weekly brief — ${escapeHtml(issueDate)}</title>
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    a { text-decoration:none; }
  </style>
</head>
<body bgcolor="#F2F0EC" style="margin:0;padding:0;background-color:#F2F0EC;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2F0EC" style="background-color:#F2F0EC;">
<tr><td align="center" style="padding:48px 24px 56px;">
  <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">
    <tr><td style="padding-bottom:42px;">${renderLockup()}</td></tr>
    <tr><td style="padding-bottom:12px;">
      <p style="margin:0;font-family:${FONT};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#8A8884;line-height:1.4;">Weekly brief · ${escapeHtml(periodStart)} to ${escapeHtml(periodEnd)}</p>
    </td></tr>
    <tr><td style="padding-bottom:18px;">
      <h1 style="margin:0;font-family:${FONT};font-size:34px;font-weight:600;letter-spacing:-0.6px;color:#0A0A0A;line-height:1.12;">Cape Verde property market, this week.</h1>
    </td></tr>
    <tr><td style="padding-bottom:30px;">
      <p style="margin:0;font-family:${FONT};font-size:16px;color:#3A3A3A;line-height:1.6;">New listings, subscriber movement, market news and performance notes from the Cape Verde Real Estate Index.</p>
    </td></tr>

    <tr><td style="padding-bottom:10px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          ${renderMetric("Active subscribers", formatNumber(data.activeSubscriberCount), `+${formatNumber(data.newSubscriberCount)} this period`)}
          ${renderMetric("Tracked listings", formatNumber(data.totalListingCount), `${formatNumber(data.sourceCount)} tracked sources`)}
          ${renderMetric("Site visits", analytics?.visits != null ? formatNumber(analytics.visits) : "Needs data", analytics ? "From analytics input" : "Add Netlify/GA export")}
        </tr>
      </table>
    </td></tr>

    ${renderSectionTitle(data.newListings.length ? "New Listings" : "Latest Listings")}
    ${listingsForMain.slice(0, 5).map((row) => renderListing(row)).join("") || `<tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;"><p style="margin:0;font-family:${FONT};font-size:14px;color:#5E5D5B;line-height:1.5;">No listing rows returned for this period.</p></td></tr>`}

    ${renderSectionTitle("Latest Market News")}
    ${data.latestNews.slice(0, 4).map(renderNews).join("") || `<tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;"><p style="margin:0;font-family:${FONT};font-size:14px;color:#5E5D5B;line-height:1.5;">No published market news returned.</p></td></tr>`}

    ${renderSectionTitle("Most Clicked Listings")}
    ${clicked.length ? clicked.map(({ row, clicks }) => renderListing(row, `${formatNumber(clicks)} clicks`)).join("") : `<tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;"><p style="margin:0;font-family:${FONT};font-size:14px;color:#5E5D5B;line-height:1.5;">No listing-click export provided. Add an analytics JSON file with listingClicks to fill this section.</p></td></tr>`}

    ${renderSectionTitle("Audience And Inventory Notes")}
    <tr><td style="padding:14px 0;border-top:1px solid #E2E0DB;">
      <p style="margin:0 0 8px;font-family:${FONT};font-size:14px;color:#3A3A3A;line-height:1.55;">Top inventory islands: ${escapeHtml(data.topIslands.map(([island, count]) => `${island} (${count})`).join(" · ") || "No island data")}.</p>
      <p style="margin:0 0 8px;font-family:${FONT};font-size:14px;color:#3A3A3A;line-height:1.55;">Latest subscribers: ${escapeHtml(data.latestSubscribers.slice(0, 5).map((s) => s.body || "Masked subscriber").join(" · ") || "No subscriber rows")}.</p>
      <p style="margin:0;font-family:${FONT};font-size:13px;color:#8A8884;line-height:1.55;">Draft only. Data claims should be checked before sending; external newsletter sends require founder approval.</p>
    </td></tr>

    <tr><td style="padding:34px 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #E2E0DB;font-size:0;line-height:0;">&nbsp;</td></tr></table>
    </td></tr>
    <tr><td style="padding-bottom:10px;">
      <p style="margin:0;font-family:${FONT};font-size:12px;color:#8A8884;line-height:1.6;">Cape Verde Real Estate Index is not a broker. We collect public listings from local agencies, portals and property websites so buyers can understand the market more easily.</p>
    </td></tr>
    <tr><td>
      <p style="margin:0;font-family:${FONT};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#AFADA8;line-height:1.6;">&copy; 2026 &middot; <a href="https://www.africarealestateindex.com/" style="color:#AFADA8;text-decoration:none;">Powered by Africa Real Estate Index</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(params: {
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  data: Awaited<ReturnType<typeof fetchRows>>;
  analytics: AnalyticsInput | null;
}): string {
  const { issueDate, periodStart, periodEnd, data, analytics } = params;
  const listingsForMain = data.newListings.length ? data.newListings : data.latestListings;
  const lines = [
    `Cape Verde Real Estate Index weekly brief — ${issueDate}`,
    `${periodStart} to ${periodEnd}`,
    "",
    `Active subscribers: ${formatNumber(data.activeSubscriberCount)} (+${formatNumber(data.newSubscriberCount)} this period)`,
    `Tracked listings: ${formatNumber(data.totalListingCount)} across ${formatNumber(data.sourceCount)} sources`,
    `Site visits: ${analytics?.visits != null ? formatNumber(analytics.visits) : "Needs analytics export"}`,
    "",
    data.newListings.length ? "New listings" : "Latest listings",
    ...listingsForMain.slice(0, 5).map((row) => `- ${row.title || "Untitled listing"} — ${listingLocation(row)} — ${formatPrice(row)} — ${listingHref(row.id)}`),
    "",
    "Latest market news",
    ...data.latestNews.slice(0, 4).map((row) => `- ${row.title} — ${row.source_name} — ${row.source_url}`),
    "",
    "Notes",
    `Top inventory islands: ${data.topIslands.map(([island, count]) => `${island} (${count})`).join(", ") || "No island data"}`,
    `Latest subscribers: ${data.latestSubscribers.slice(0, 5).map((s) => s.body || "Masked subscriber").join(", ") || "No subscriber rows"}`,
    "",
    "Draft only. Human approval is required before any external send.",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs();
  const issue = args.date ? startOfUtcDay(new Date(`${args.date}T00:00:00Z`)) : startOfUtcDay(new Date());
  if (Number.isNaN(issue.getTime())) throw new Error("--date must be YYYY-MM-DD");

  const periodEndExclusive = addDays(issue, 1);
  const periodStart = addDays(periodEndExclusive, -7);
  const issueDate = isoDate(issue);
  const analytics = readAnalytics(args.analytics);
  const data = await fetchRows(periodStart.toISOString(), periodEndExclusive.toISOString(), analytics);

  const outDir = path.resolve(args.outDir ?? "tmp/newsletter-drafts");
  fs.mkdirSync(outDir, { recursive: true });

  const html = renderHtml({
    issueDate,
    periodStart: isoDate(periodStart),
    periodEnd: issueDate,
    data,
    analytics,
  });
  const text = renderText({
    issueDate,
    periodStart: isoDate(periodStart),
    periodEnd: issueDate,
    data,
    analytics,
  });

  const htmlPath = path.join(outDir, `cvrei-weekly-${issueDate}.html`);
  const textPath = path.join(outDir, `cvrei-weekly-${issueDate}.txt`);
  fs.writeFileSync(htmlPath, html, "utf8");
  fs.writeFileSync(textPath, text, "utf8");

  console.log(`[newsletter] wrote ${htmlPath}`);
  console.log(`[newsletter] wrote ${textPath}`);
  if (!analytics) {
    console.log("[newsletter] analytics not provided; visits and most-clicked listings are placeholders.");
  }
}

main().catch((err) => {
  console.error(`[newsletter] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
