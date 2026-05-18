import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { useMarketNews } from "../hooks/useMarketNews";
import { MARKET_NEWS_CATEGORIES } from "../lib/market-news-data";
import { formatMedian, formatSourceLabel } from "../lib/format";
import { PRICE_BUCKETS, type PriceBucket, type ListingCard } from "arei-sdk";

const BUCKET_LABEL: Record<PriceBucket, string> = {
  under_100k: "Under €100K",
  "100k_250k": "€100K – €250K",
  "250k_500k": "€250K – €500K",
  over_500k: "Over €500K",
};
const BUCKET_ORDER: PriceBucket[] = ["under_100k", "100k_250k", "250k_500k", "over_500k"];
import { Card } from "./Listings";
import "./Listings.css"; // shares kv-lcard primitives with Listings page
import "./Landing.css";

const GUIDE_TEASER_PT: Record<string, { title: string; description: string }> = {
  "cape-verde-property-prices-by-island": {
    title: "Preços de imóveis em Cabo Verde por ilha",
    description:
      "Medianas de preços pedidos e contagens de anúncios por ilha, retiradas do Cape Verde Real Estate Index.",
  },
  "buying-property-cape-verde-guide": {
    title: "Como comprar imóvel em Cabo Verde",
    description:
      "Um guia passo a passo para compradores estrangeiros, desde NIF e conta bancária até escritura.",
  },
  "which-cape-verde-island-property": {
    title: "Em que ilha de Cabo Verde deve comprar?",
    description:
      "Uma comparação prática entre ilhas, infraestrutura, procura e perfis de comprador.",
  },
};

interface MmiSnapshot {
  medianPrice: number | null;
  total: number;
  pricedCount: number;
  pricedPct: number;
  addedThisMonth: number;
  /* Editorial notes derived from live data — populated when we have
     enough activity (>=1 new listing this month) to make truthful
     statements. Each is null when its source data is too thin. */
  topIslandByInflow: { name: string; count: number } | null;
  topSourcesByInflow: { id: string; label: string; count: number }[];
  topType: { name: string; count: number; pct: number } | null;
  topBedroom: { count: number; pct: number; n: number } | null;
  topPriceBand: { label: string; count: number; pct: number } | null;
}

/* Title-case a property_type slug for display ("apartment" → "Apartments"). */
function pluralizeType(t: string): string {
  const cleaned = t.replace(/[_-]+/g, " ").trim().toLowerCase();
  if (!cleaned) return "Listings";
  const cap = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (cap.endsWith("s")) return cap;
  if (cap.endsWith("y")) return cap.slice(0, -1) + "ies";
  return cap + "s";
}

/* ────────────────────────────────────────────────────────────
   Landing — brand surface for /. Adopted from archive
   cv-landing.html. Splits responsibilities with /listings:
   - / = brand voice + market context + guides + subscribe
   - /listings = the actual property grid + filters
   Hero is intentionally minimal: heading + tagline + meta line.
   The filter row on /listings is the search surface, not the hero.
   ──────────────────────────────────────────────────────────── */

/* Format the Monday of the current week as "April 14, 2026" — used in the
   "Featured this week" eyebrow. */
function formatWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function FeaturedCardSkeleton() {
  return (
    <div className="kv-lcard kv-lcard-skeleton" aria-hidden="true">
      <div className="kv-lc-img" />
      <div className="kv-lc-body">
        <div className="kv-lc-topline">
          <span className="kv-skel-line kv-skel-xs" />
          <span className="kv-skel-line kv-skel-xs kv-skel-short" />
        </div>
        <div className="kv-skel-line kv-skel-price" />
        <div className="kv-skel-line" />
        <div className="kv-skel-line kv-skel-wide" />
        <div className="kv-lc-specs">
          <span className="kv-skel-line kv-skel-xs" />
          <span className="kv-skel-line kv-skel-xs" />
        </div>
        <div className="kv-lc-provenance">
          <span className="kv-skel-line kv-skel-xs" />
          <span className="kv-skel-line kv-skel-xs kv-skel-short" />
        </div>
      </div>
    </div>
  );
}

/* Pick a small editorial set: prefer single-line titles (so the row
   reads tidy with no orphan two-liners), then diversity across island
   and source. Falls back gracefully when data is thin. */
function pickFeatured(cards: ListingCard[], n: number): ListingCard[] {
  const hasImage    = (c: ListingCard) => !!(c.image_urls?.[0] || c.image_url);
  const hasPrice    = (c: ListingCard) => !!(c.price && c.price > 0);
  const hasBedrooms = (c: ListingCard) => !!(c.bedrooms && c.bedrooms > 0);
  const hasBaths    = (c: ListingCard) => !!(c.bathrooms && c.bathrooms > 0);
  const isLand      = (c: ListingCard) => c.property_type?.toLowerCase() === "land";
  const isCommercial = (c: ListingCard) => c.property_type?.toLowerCase() === "commercial";
  const hasIsland   = (c: ListingCard) => !!c.island;

  // Residential: image + price + bedrooms + bathrooms + not land/commercial + island known
  const residential = cards.filter(
    (c) => hasImage(c) && hasPrice(c) && hasBedrooms(c) && hasBaths(c) && !isLand(c) && !isCommercial(c) && hasIsland(c),
  );
  // Land: image + price + island known (no bedrooms requirement)
  const land = cards.filter(
    (c) => hasImage(c) && hasPrice(c) && isLand(c) && hasIsland(c),
  );

  const picked: ListingCard[] = [];
  const seenIslands = new Set<string>();
  const seenSources = new Set<string>();

  const tryAdd = (c: ListingCard) => {
    if (picked.includes(c)) return;
    picked.push(c);
    if (c.island) seenIslands.add(c.island);
    if (c.source_id) seenSources.add(c.source_id);
  };

  // Reserve last slot for one land listing (if available)
  const landSlot = land[0] ?? null;
  const residentialTarget = landSlot ? n - 1 : n;

  // Pass 1: unique island + unique source
  for (const c of residential) {
    if (picked.length >= residentialTarget) break;
    if (c.island && !seenIslands.has(c.island) && c.source_id && !seenSources.has(c.source_id))
      tryAdd(c);
  }
  // Pass 2: unique island
  for (const c of residential) {
    if (picked.length >= residentialTarget) break;
    if (c.island && !seenIslands.has(c.island)) tryAdd(c);
  }
  // Pass 3: any clean residential
  for (const c of residential) {
    if (picked.length >= residentialTarget) break;
    tryAdd(c);
  }
  // Pass 4: relax bathrooms
  const relaxed = cards.filter((c) => hasImage(c) && hasPrice(c) && hasBedrooms(c) && !isLand(c) && !isCommercial(c) && hasIsland(c));
  for (const c of relaxed) {
    if (picked.length >= residentialTarget) break;
    tryAdd(c);
  }

  // Add the land listing last
  if (landSlot) tryAdd(landSlot);

  return picked;
}

function categoryFor(tags: string[]): "buying" | "market" | "legal" | "tax" {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((x) => x.includes("legal"))) return "legal";
  if (t.some((x) => x.includes("tax"))) return "tax";
  if (t.some((x) => x.includes("market") || x.includes("yield"))) return "market";
  return "buying";
}

export default function Landing() {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  useDocumentMeta(
    "Cape Verde Real Estate Index",
    t("landing.metaDescription"),
  );

  /* Inject homepage JSON-LD: Organization + WebSite. FAQPage lives on
     /blog where the Q&A is actually rendered — schema must match
     visible page content. */
  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://capeverderealestateindex.com";
    const data = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: "Cape Verde Real Estate Index",
          url: origin,
          logo: `${origin}/og-default.png`,
          description:
            "Cape Verde Real Estate Index is an independent property search and data platform for Cape Verde real estate, published by AREI. It is not a broker or agency.",
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url: origin,
          name: "Cape Verde Real Estate Index",
          description:
            "Search Cape Verde real estate listings aggregated from local agencies, portals and property websites.",
          publisher: { "@id": `${origin}/#organization` },
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${origin}/listings?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        },
      ],
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.kvJsonld = "home";
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  // Top 3 newest articles for guides preview
  const guides = BLOG_ARTICLES.slice(0, 3);

  const { items: newsItems } = useMarketNews();
  const latestNews = [...newsItems]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const catTone = (c: string) => {
    const i = MARKET_NEWS_CATEGORIES.indexOf(c as (typeof MARKET_NEWS_CATEGORIES)[number]);
    return `var(--kv-cat-${i >= 0 ? i + 1 : 1})`;
  };

  /* Live featured listings + total count for the CTA. Falls back to the
     hardcoded ISLANDS_COUNT/SOURCES_COUNT if Supabase isn't configured. */
  const [featured, setFeatured] = useState<ListingCard[]>([]);
  const [totalListings, setTotalListings] = useState<number | null>(null);
  const [mmi, setMmi] = useState<MmiSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    /* Wider pool (500) lets the diversity passes choose well AND gives
       us enough rows to count "added this month" from first_seen_at
       without a second round-trip. */
    Promise.all([
      arei.getListings({ page: 1, pageSize: 500 }),
      arei.getMarketStats(),
    ])
      .then(([listRes, stats]) => {
        if (cancelled) return;
        setFeatured(pickFeatured(listRes.data, 4));
        setTotalListings(listRes.total);

        const withPrice = stats.islands.filter((i) => i.median_price !== null);
        const weightedSum = withPrice.reduce(
          (s, i) => s + i.median_price! * i.n_price,
          0
        );
        const pricedCount = stats.islands.reduce((s, i) => s + i.n_price, 0);
        const medianPrice =
          pricedCount > 0 ? Math.round(weightedSum / pricedCount) : null;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const newThisMonth = listRes.data.filter((l) => {
          const seen = l.first_seen_at ? new Date(l.first_seen_at) : null;
          return seen ? seen >= monthStart : false;
        });
        const addedThisMonth = newThisMonth.length;

        /* Editorial notes — derived counts from live data. */
        const islandInflow = new Map<string, number>();
        const sourceInflow = new Map<string, number>();
        for (const l of newThisMonth) {
          if (l.island) islandInflow.set(l.island, (islandInflow.get(l.island) ?? 0) + 1);
          if (l.source_id) sourceInflow.set(l.source_id, (sourceInflow.get(l.source_id) ?? 0) + 1);
        }
        const topIsland = [...islandInflow.entries()].sort((a, b) => b[1] - a[1])[0];
        const topIslandByInflow = topIsland
          ? { name: topIsland[0], count: topIsland[1] }
          : null;
        const topSourcesByInflow = [...sourceInflow.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, count]) => ({ id, label: formatSourceLabel(id), count }));

        const typeCounts = new Map<string, number>();
        for (const l of listRes.data) {
          if (l.property_type) {
            typeCounts.set(l.property_type, (typeCounts.get(l.property_type) ?? 0) + 1);
          }
        }
        const topTypeEntry = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        const typedTotal = [...typeCounts.values()].reduce((s, n) => s + n, 0);
        const topType =
          topTypeEntry && typedTotal > 0
            ? {
                name: pluralizeType(topTypeEntry[0]),
                count: topTypeEntry[1],
                pct: Math.round((topTypeEntry[1] / typedTotal) * 100),
              }
            : null;

        /* Bedroom mix — most common bedroom count among listings that
           publish bed counts. Skips studios (0) so the headline is
           about non-studio inventory shape. */
        const bedroomCounts = new Map<number, number>();
        for (const l of listRes.data) {
          if (l.bedrooms != null && l.bedrooms > 0) {
            bedroomCounts.set(l.bedrooms, (bedroomCounts.get(l.bedrooms) ?? 0) + 1);
          }
        }
        const bedroomTotal = [...bedroomCounts.values()].reduce((s, n) => s + n, 0);
        const topBedroomEntry = [...bedroomCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        const topBedroom =
          topBedroomEntry && bedroomTotal > 0
            ? {
                count: topBedroomEntry[0],
                pct: Math.round((topBedroomEntry[1] / bedroomTotal) * 100),
                n: topBedroomEntry[1],
              }
            : null;

        /* Price band — which asking-price bucket holds the most
           inventory. Direct buyer-anchoring signal. */
        const bucketCounts: Record<PriceBucket, number> = {
          under_100k: 0,
          "100k_250k": 0,
          "250k_500k": 0,
          over_500k: 0,
        };
        for (const l of listRes.data) {
          if (l.price == null) continue;
          for (const k of BUCKET_ORDER) {
            const { min, max } = PRICE_BUCKETS[k];
            if (l.price >= min && l.price < max) {
              bucketCounts[k]++;
              break;
            }
          }
        }
        const bucketTotal = Object.values(bucketCounts).reduce((s, n) => s + n, 0);
        const topBucketEntry = (Object.entries(bucketCounts) as [PriceBucket, number][]).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const topPriceBand =
          topBucketEntry && bucketTotal > 0
            ? {
                label: BUCKET_LABEL[topBucketEntry[0]],
                count: topBucketEntry[1],
                pct: Math.round((topBucketEntry[1] / bucketTotal) * 100),
              }
            : null;

        setMmi({
          medianPrice,
          total: stats.total,
          pricedCount,
          pricedPct:
            stats.total > 0 ? Math.round((pricedCount / stats.total) * 100) : 0,
          addedThisMonth,
          topIslandByInflow,
          topSourcesByInflow,
          topType,
          topBedroom,
          topPriceBand,
        });
      })
      .catch(() => {
        /* Silent: reserved shells remain if live data is unavailable. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasMmiNotes = Boolean(
    mmi &&
      (mmi.topIslandByInflow ||
        mmi.topSourcesByInflow.length > 0 ||
        mmi.topType ||
        mmi.topBedroom ||
        mmi.topPriceBand),
  );

  return (
    <div className="kv-landing">
      {/* ═══ HERO — minimal: heading + tagline + meta. Search lives
          on /listings's filter row, not in the hero. ═══ */}
      <header className="kv-l-hero">
        <div className="kv-l-hero-inner">
          <h1 className="kv-l-hero-title">
            {t("landing.heroTitle")}
          </h1>
          <p className="kv-l-hero-sub">
            {t("landing.heroSub")}
          </p>
          <div className="kv-l-hero-cta">
            <Link to="/listings" className="kv-btn kv-btn-solid">{t("landing.browseAll")}</Link>
            <Link to="/market" className="kv-l-hero-cta-ghost">{t("landing.readIndex")}</Link>
          </div>
        </div>
      </header>

      {/* ═══ FEATURED PROPERTIES — sits directly under the hero so
           visitors land on actual inventory before metrics. ═══ */}
      <section className="kv-l-feat" aria-busy={featured.length === 0}>
        <div className="kv-l-feat-inner">
          <div className="kv-l-mmi-head">
            <div>
              <span className="kv-l-eyebrow">{t("landing.featuredEyebrow", { week: formatWeekStart() })}</span>
              <h2>{t("landing.featuredTitle")}</h2>
              <p>
                {t("landing.featuredSub")}
              </p>
            </div>
            <Link to="/listings" className="kv-l-section-link">
              {totalListings ? t("landing.seeAllListings", { count: totalListings }) : t("landing.seeAllListingsFallback")}
            </Link>
          </div>

          <div className="kv-l-feat-grid">
            {featured.length > 0
              ? featured.map((l) => <Card key={l.id} l={l} bare />)
              : [0, 1, 2].map((i) => <FeaturedCardSkeleton key={i} />)}
          </div>

          <div className="kv-l-feat-foot">
            <Link to="/listings" className="kv-btn">
              {totalListings ? t("landing.browseAllCount", { count: totalListings }) : t("landing.browseAll")}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ INDEX STATUS — live snapshot from the DB. Period-over-
           period deltas (and the per-island movements list below) are
           held back behind a coming-soon overlay until we have a full
           month of stored snapshots to compare against. ═══ */}
      <section className="kv-l-mmi">
        <div className="kv-l-mmi-inner">
          <div className="kv-l-mmi-head">
            <div>
              <span className="kv-l-eyebrow">
                {t("landing.indexStatus", { date: new Date().toLocaleDateString(i18n.language === "pt" ? "pt-PT" : "en-US", { month: "long", year: "numeric" }) })}
              </span>
              <h2>{t("landing.statusTitle")}</h2>
              <p>
                {t("landing.statusSub")}
              </p>
            </div>
            <Link to="/market" className="kv-l-section-link">{t("common.fullMarketData")} →</Link>
          </div>

          <div className="kv-l-mmi-strip" aria-busy={!mmi}>
            {mmi ? (
              <>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">{t("landing.medianAskingPrice")}</div>
                  <div className="kv-l-mmi-num">{formatMedian(mmi.medianPrice)}</div>
                  <div className="kv-l-mmi-delta">{t("landing.acrossPriced", { count: mmi.pricedCount.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en") })}</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">{t("landing.totalInventory")}</div>
                  <div className="kv-l-mmi-num">{mmi.total.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en")}</div>
                  <div className="kv-l-mmi-delta">{t("landing.trackedAcross")}</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">{t("landing.addedThisMonth")}</div>
                  <div className="kv-l-mmi-num">{mmi.addedThisMonth.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en")}</div>
                  <div className="kv-l-mmi-delta">{t("landing.firstSeenSince")}</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">{t("landing.verifiedPriceCoverage")}</div>
                  <div className="kv-l-mmi-num">{mmi.pricedPct}%</div>
                  <div className="kv-l-mmi-delta">{t("landing.havePublicPrice")}</div>
                </div>
              </>
            ) : (
              [0, 1, 2, 3].map((i) => (
                <div className="kv-l-mmi-cell is-loading" key={i} aria-hidden="true">
                  <div className="kv-l-mmi-lbl"><span className="kv-skel-line kv-skel-xs" /></div>
                  <div className="kv-l-mmi-num"><span className="kv-skel-line kv-skel-number" /></div>
                  <div className="kv-l-mmi-delta"><span className="kv-skel-line kv-skel-wide" /></div>
                </div>
              ))
            )}
          </div>

          <div className="kv-l-mmi-notes" aria-busy={!mmi}>
            {hasMmiNotes ? (
              <>
                <div className="kv-l-mmi-notes-head">{t("landing.activityHead")}</div>
                <ul>
                  {mmi?.topIslandByInflow && (
                    <li>
                      <span className="kv-l-mmi-tag">{mmi.topIslandByInflow.name}</span>
                      <span className="kv-l-mmi-body">
                        {t("landing.largestInflow", {
                          count: mmi.topIslandByInflow.count,
                          label: mmi.topIslandByInflow.count === 1 ? t("landing.listing") : t("landing.listings"),
                        })}
                      </span>
                    </li>
                  )}
                  {mmi && mmi.topSourcesByInflow.length > 0 && (
                    <li>
                      <span className="kv-l-mmi-tag">{t("landing.sources")}</span>
                      <span className="kv-l-mmi-body">
                        {t("landing.sourcesAdded", {
                          items: mmi.topSourcesByInflow
                            .map((s) => t("landing.sourceAdded", { label: s.label, count: s.count }))
                            .join(" · "),
                        })}
                      </span>
                    </li>
                  )}
                  {mmi?.topPriceBand && (
                    <li>
                      <span className="kv-l-mmi-tag">{t("landing.priceBand")}</span>
                      <span className="kv-l-mmi-body">
                        <Trans i18nKey="landing.pricedInventory" values={{ label: mmi.topPriceBand.label, pct: mmi.topPriceBand.pct, count: mmi.topPriceBand.count.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en") }} components={{ 1: <b /> }} />
                      </span>
                    </li>
                  )}
                  {mmi?.topType && (
                    <li>
                      <span className="kv-l-mmi-tag">{t("landing.mix")}</span>
                      <span className="kv-l-mmi-body">
                        {t("landing.mixBody", { name: mmi.topType.name, pct: mmi.topType.pct, count: mmi.topType.count.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en") })}
                      </span>
                    </li>
                  )}
                  {mmi?.topBedroom && (
                    <li>
                      <span className="kv-l-mmi-tag">{t("landing.layout")}</span>
                      <span className="kv-l-mmi-body">
                        <Trans i18nKey="landing.layoutBody" values={{ count: mmi.topBedroom.count, pct: mmi.topBedroom.pct, n: mmi.topBedroom.n.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en") }} components={{ 1: <b /> }} />
                      </span>
                    </li>
                  )}
                </ul>
                <div className="kv-l-mmi-foot">
                  {t("landing.liveCountsFoot")}
                </div>
              </>
            ) : !mmi ? (
              <>
                <div className="kv-l-mmi-notes-head">
                  <span className="kv-skel-line kv-skel-notes-head" />
                </div>
                <ul className="kv-l-mmi-notes-skeleton" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <li key={i}>
                      <span className="kv-l-mmi-tag"><span className="kv-skel-line kv-skel-xs" /></span>
                      <span className="kv-l-mmi-body"><span className="kv-skel-line kv-skel-wide" /></span>
                    </li>
                  ))}
                </ul>
                <div className="kv-l-mmi-foot"><span className="kv-skel-line kv-skel-wide" /></div>
              </>
            ) : (
              <>
                <div className="kv-l-mmi-notes-head">{t("landing.activityHead")}</div>
                <ul>
                  <li>
                    <span className="kv-l-mmi-tag">Live data</span>
                    <span className="kv-l-mmi-body">
                      {t("landing.noActivity")}
                    </span>
                  </li>
                </ul>
                <div className="kv-l-mmi-foot">
                  {t("landing.liveCountsFoot")}
                </div>
              </>
            )}
          </div>

          {/* Period-over-period moves need stored monthly snapshots
              before we can compute them. Heading + intro live OUTSIDE
              the blur so visitors can read what's coming; only the
              data placeholder is held behind the overlay. */}
          <div className="kv-l-mmi-coming-head">
            <div className="kv-l-mmi-coming-eyebrow">{t("landing.comingEyebrow")}</div>
            <h3>{t("landing.comingTitle")}</h3>
            <p>
              {t("landing.comingSub")}
            </p>
          </div>
          <div className="kv-coming kv-coming-slim">
            <div className="kv-coming-content" aria-hidden="true">
              {/* Decorative chart — static SVG rendered behind the blur overlay
                  to suggest real price/velocity data is being obscured. */}
              <svg
                viewBox="0 0 800 120"
                width="100%"
                height="120"
                preserveAspectRatio="none"
                style={{ display: "block" }}
              >
                {/* horizontal grid rules */}
                <line x1="0" y1="22" x2="800" y2="22" stroke="#C8C4BC" strokeWidth="0.6" />
                <line x1="0" y1="55" x2="800" y2="55" stroke="#C8C4BC" strokeWidth="0.6" />
                <line x1="0" y1="88" x2="800" y2="88" stroke="#C8C4BC" strokeWidth="0.6" />
                {/* y-axis labels */}
                <text x="6" y="20" fontSize="8" fill="#888888" fontFamily="monospace">€440k</text>
                <text x="6" y="53" fontSize="8" fill="#888888" fontFamily="monospace">€390k</text>
                <text x="6" y="86" fontSize="8" fill="#888888" fontFamily="monospace">€340k</text>
                {/* month ticks */}
                <text x="48"  y="114" fontSize="8" fill="#888888" fontFamily="monospace">Jun</text>
                <text x="168" y="114" fontSize="8" fill="#888888" fontFamily="monospace">Aug</text>
                <text x="288" y="114" fontSize="8" fill="#888888" fontFamily="monospace">Oct</text>
                <text x="408" y="114" fontSize="8" fill="#888888" fontFamily="monospace">Dec</text>
                <text x="528" y="114" fontSize="8" fill="#888888" fontFamily="monospace">Feb</text>
                <text x="648" y="114" fontSize="8" fill="#888888" fontFamily="monospace">Apr</text>
                {/* area fill under asking-price line */}
                <path
                  d="M 0,82 C 80,76 150,64 240,60 C 330,56 400,46 490,40 C 570,34 660,28 800,20 L 800,120 L 0,120 Z"
                  fill="#8ECFBF"
                  fillOpacity="0.18"
                />
                {/* asking-price line — sage */}
                <path
                  d="M 0,82 C 80,76 150,64 240,60 C 330,56 400,46 490,40 C 570,34 660,28 800,20"
                  fill="none"
                  stroke="#8ECFBF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* indexed volume / velocity line — sage deep, dashed */}
                <path
                  d="M 0,100 C 70,96 120,90 195,94 C 265,98 315,85 385,82 C 455,79 515,88 585,84 C 645,80 720,73 800,70"
                  fill="none"
                  stroke="#2D4A42"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="5 3"
                />
              </svg>
            </div>
            <div className="kv-coming-overlay">
              <span className="kv-pill">{t("common.comingMay")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ GUIDES ═══ */}
      <section className="kv-l-guides">
        <div className="kv-l-guides-inner">
          <div className="kv-l-mmi-head">
            <div>
              <span className="kv-l-eyebrow">{t("landing.guidesEyebrow")}</span>
              <h2>{t("landing.guidesTitle")}</h2>
              <p>
                {t("landing.guidesSub")}
              </p>
            </div>
            <Link to="/blog" className="kv-l-section-link">{t("common.readAllGuides")} →</Link>
          </div>

          <div className="kv-l-guide-grid">
            {guides.map((a) => {
                  const cat = categoryFor(a.tags);
                  return (
                    <Link key={a.slug} to={`/blog/${a.slug}`} className="kv-l-guide">
                  <span className="kv-eyebrow">{t(`landing.${cat}`)}</span>
                  <div className="kv-l-guide-title">{isPt ? GUIDE_TEASER_PT[a.slug]?.title ?? a.title : a.title}</div>
                  <div className="kv-l-guide-excerpt">{isPt ? GUIDE_TEASER_PT[a.slug]?.description ?? a.description : a.description}</div>
                  <div className="kv-l-guide-foot">
                    <span>{new Date(a.date).toLocaleDateString(isPt ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>{isPt ? a.readTime.replace("min read", "min de leitura") : a.readTime}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ MARKET NEWS PREVIEW ═══ */}
      {latestNews.length > 0 && (
        <section className="kv-l-news">
          <div className="kv-l-news-inner">
            <div className="kv-l-mmi-head">
              <div>
                <span className="kv-l-eyebrow">{t("landing.newsEyebrow")}</span>
                <h2>{t("landing.newsTitle")}</h2>
                <p>{t("landing.newsSub")}</p>
              </div>
              <Link to="/market-news" className="kv-l-section-link">
                {t("landing.seeAllNews")}
              </Link>
            </div>

            <div className="kv-l-news-list">
              {latestNews.map((item) => (
                <article className="kv-l-news-item" key={item.id}>
                  <span
                    className="kv-l-news-item-cat"
                    style={{ "--cat-tone": catTone(item.category) } as CSSProperties}
                  >
                    {item.category}
                  </span>
                  <a
                    className="kv-l-news-item-title"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                  <p className="kv-l-news-item-snippet">{item.snippet}</p>
                  <div className="kv-l-news-item-foot">
                    <span className="kv-l-news-item-foot-date">{new Date(`${item.publishedAt}T00:00:00Z`).toLocaleDateString(isPt ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span>
                    <span className="kv-l-news-item-foot-sep" aria-hidden="true">·</span>
                    <span className="kv-l-news-item-foot-source">{item.sourceName}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ NEWSLETTER ═══ */}
      <NewsletterCta />
    </div>
  );
}
