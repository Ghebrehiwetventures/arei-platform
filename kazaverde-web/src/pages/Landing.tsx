import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { BLOG_ARTICLES } from "../lib/blog-data";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
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
  /* ~32 chars fits one line in a kv-lcard at desktop widths. Tuned
     against current data; relax if too few candidates pass. */
  const MAX_TITLE_LEN = 32;
  const isShort = (c: ListingCard) => (c.title?.length ?? 99) <= MAX_TITLE_LEN;
  const hasImage = (c: ListingCard) => !!(c.image_urls?.[0] || c.image_url);

  /* Hard requirement: featured cards must have an image. Empty
     placeholder gradients on the homepage hero are worse than
     showing fewer cards. Pipeline should ultimately filter
     image-less listings out of the index entirely. */
  const candidates = cards.filter(hasImage);

  const picked: ListingCard[] = [];
  const seenIslands = new Set<string>();
  const seenSources = new Set<string>();

  // Pass 1: short title + unique island + unique source
  for (const c of candidates) {
    if (picked.length >= n) break;
    if (!isShort(c)) continue;
    if (c.island && !seenIslands.has(c.island) && c.source_id && !seenSources.has(c.source_id)) {
      picked.push(c);
      seenIslands.add(c.island);
      seenSources.add(c.source_id);
    }
  }
  // Pass 2: short title + unique island
  for (const c of candidates) {
    if (picked.length >= n) break;
    if (picked.includes(c) || !isShort(c)) continue;
    if (c.island && !seenIslands.has(c.island)) {
      picked.push(c);
      seenIslands.add(c.island);
    }
  }
  // Pass 3: any short title
  for (const c of candidates) {
    if (picked.length >= n) break;
    if (picked.includes(c)) continue;
    if (isShort(c)) picked.push(c);
  }
  // Pass 4: anything remaining (rare fallback when few short titles)
  for (const c of candidates) {
    if (picked.length >= n) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked;
}

function categoryFor(tags: string[]): "buying" | "market" | "legal" | "tax" {
  const t = tags.map((s) => s.toLowerCase());
  if (t.some((x) => x.includes("legal"))) return "legal";
  if (t.some((x) => x.includes("tax"))) return "tax";
  if (t.some((x) => x.includes("market") || x.includes("yield"))) return "market";
  return "buying";
}

function categoryLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function Landing() {
  useDocumentMeta(
    "KazaVerde — Cape Verde Real Estate",
    "Search Cape Verde real estate listings from tracked public sources. Compare homes across Sal, Boa Vista and other islands with KazaVerde.",
  );

  /* Inject homepage JSON-LD: Organization + WebSite. FAQPage lives on
     /blog where the Q&A is actually rendered — schema must match
     visible page content. */
  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://kazaverde.com";
    const data = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: "KazaVerde",
          url: origin,
          logo: `${origin}/og-default.png`,
          description:
            "KazaVerde is an independent property search and data platform for Cape Verde real estate. It is not a broker or agency.",
        },
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url: origin,
          name: "KazaVerde",
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
        setFeatured(pickFeatured(listRes.data, 3));
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
            Cape&nbsp;Verde real estate, aggregated in one place
          </h1>
          <p className="kv-l-hero-sub">
            An independent property search and data platform — listings aggregated
            from local agencies, portals and property websites across the archipelago.
          </p>
          <div className="kv-l-hero-cta">
            <Link to="/listings" className="kv-btn kv-btn-solid">Browse all listings →</Link>
            <Link to="/market" className="kv-l-hero-cta-ghost">Read this month's index →</Link>
          </div>
        </div>
      </header>

      {/* ═══ FEATURED PROPERTIES — sits directly under the hero so
           visitors land on actual inventory before metrics. ═══ */}
      <section className="kv-l-feat" aria-busy={featured.length === 0}>
        <div className="kv-l-feat-inner">
          <div className="kv-l-mmi-head">
            <div>
              <span className="kv-l-eyebrow">Featured this week · Week of {formatWeekStart()}</span>
              <h2>Three listings worth a closer look.</h2>
              <p>
                Hand-picked from this week's listings — across the archipelago.
                Every card links back to the original source.
              </p>
            </div>
            <Link to="/listings" className="kv-l-section-link">
              {totalListings ? `See all ${totalListings} listings →` : "See all listings →"}
            </Link>
          </div>

          <div className="kv-l-feat-grid">
            {featured.length > 0
              ? featured.map((l) => <Card key={l.id} l={l} />)
              : [0, 1, 2].map((i) => <FeaturedCardSkeleton key={i} />)}
          </div>

          <div className="kv-l-feat-foot">
            <Link to="/listings" className="kv-btn">
              {totalListings ? `Browse all ${totalListings} listings →` : "Browse all listings →"}
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
                Index status · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <h2>Where the Cape Verde index stands today.</h2>
              <p>
                Live counts and medians across every tracked listing on the index.
                Period-over-period movements begin once a full month of snapshots
                accumulates.
              </p>
            </div>
            <Link to="/market" className="kv-l-section-link">Full market data →</Link>
          </div>

          <div className="kv-l-mmi-strip" aria-busy={!mmi}>
            {mmi ? (
              <>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">Median asking price</div>
                  <div className="kv-l-mmi-num">{formatMedian(mmi.medianPrice)}</div>
                  <div className="kv-l-mmi-delta">Across {mmi.pricedCount.toLocaleString("en")} priced listings</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">Total inventory</div>
                  <div className="kv-l-mmi-num">{mmi.total.toLocaleString("en")}</div>
                  <div className="kv-l-mmi-delta">Tracked across the archipelago</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">Added this month</div>
                  <div className="kv-l-mmi-num">{mmi.addedThisMonth.toLocaleString("en")}</div>
                  <div className="kv-l-mmi-delta">First seen since the 1st</div>
                </div>
                <div className="kv-l-mmi-cell">
                  <div className="kv-l-mmi-lbl">Verified-price coverage</div>
                  <div className="kv-l-mmi-num">{mmi.pricedPct}%</div>
                  <div className="kv-l-mmi-delta">Have a public asking price</div>
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
                <div className="kv-l-mmi-notes-head">This month's index activity</div>
                <ul>
                  {mmi?.topIslandByInflow && (
                    <li>
                      <span className="kv-l-mmi-tag">{mmi.topIslandByInflow.name}</span>
                      <span className="kv-l-mmi-body">
                        Largest inflow this month — {mmi.topIslandByInflow.count} new {mmi.topIslandByInflow.count === 1 ? "listing" : "listings"} since the 1st.
                      </span>
                    </li>
                  )}
                  {mmi && mmi.topSourcesByInflow.length > 0 && (
                    <li>
                      <span className="kv-l-mmi-tag">Sources</span>
                      <span className="kv-l-mmi-body">
                        {mmi.topSourcesByInflow
                          .map((s) => `${s.label} added ${s.count}`)
                          .join(" · ")}{" "}
                        since the 1st.
                      </span>
                    </li>
                  )}
                  {mmi?.topPriceBand && (
                    <li>
                      <span className="kv-l-mmi-tag">Price band</span>
                      <span className="kv-l-mmi-body">
                        Most priced inventory sits in <b>{mmi.topPriceBand.label}</b> — {mmi.topPriceBand.pct}% of priced listings ({mmi.topPriceBand.count.toLocaleString("en")} of them).
                      </span>
                    </li>
                  )}
                  {mmi?.topType && (
                    <li>
                      <span className="kv-l-mmi-tag">Mix</span>
                      <span className="kv-l-mmi-body">
                        {mmi.topType.name} dominate at {mmi.topType.pct}% of typed inventory ({mmi.topType.count.toLocaleString("en")} listings).
                      </span>
                    </li>
                  )}
                  {mmi?.topBedroom && (
                    <li>
                      <span className="kv-l-mmi-tag">Layout</span>
                      <span className="kv-l-mmi-body">
                        Most common layout is <b>{mmi.topBedroom.count}-bedroom</b> — {mmi.topBedroom.pct}% of bedroom-tagged listings ({mmi.topBedroom.n.toLocaleString("en")}).
                      </span>
                    </li>
                  )}
                </ul>
                <div className="kv-l-mmi-foot">
                  Live counts from the index · Updated daily as crawlers complete
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
                <div className="kv-l-mmi-notes-head">This month's index activity</div>
                <ul>
                  <li>
                    <span className="kv-l-mmi-tag">Live data</span>
                    <span className="kv-l-mmi-body">
                      Activity notes appear here once there is enough monthly movement to summarize.
                    </span>
                  </li>
                </ul>
                <div className="kv-l-mmi-foot">
                  Live counts from the index · Updated daily as crawlers complete
                </div>
              </>
            )}
          </div>

          {/* Period-over-period moves need stored monthly snapshots
              before we can compute them. Heading + intro live OUTSIDE
              the blur so visitors can read what's coming; only the
              data placeholder is held behind the overlay. */}
          <div className="kv-l-mmi-coming-head">
            <div className="kv-l-mmi-coming-eyebrow">Coming next</div>
            <h3>Median price moves &amp; market velocity.</h3>
            <p>
              Time-series movements — period-over-period asking prices, days on
              market, and per-island deltas — start once we have a full month of
              stored snapshots.
            </p>
          </div>
          <div className="kv-coming kv-coming-slim">
            <div className="kv-coming-content" aria-hidden="true">
              <ul>
                <li><span className="kv-l-mmi-tag">Median</span> Period-over-period asking-price moves.</li>
                <li><span className="kv-l-mmi-tag">Velocity</span> Median days on market and inflow vs removals.</li>
                <li><span className="kv-l-mmi-tag">Segments</span> Per-island, per-property-type price deltas.</li>
              </ul>
            </div>
            <div className="kv-coming-overlay">
              <span className="kv-pill">Coming May 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ GUIDES ═══ */}
      <section className="kv-l-guides">
        <div className="kv-l-guides-inner">
          <div className="kv-l-mmi-head">
            <div>
              <span className="kv-l-eyebrow">Guides &amp; Reports</span>
              <h2>Buying property in Cape Verde, explained.</h2>
              <p>
                Independent explainers on the legal process, island comparisons, tax
                changes, and residence options — written by people who've done it.
              </p>
            </div>
            <Link to="/blog" className="kv-l-section-link">Read all guides →</Link>
          </div>

          <div className="kv-l-guide-grid">
            {guides.map((a) => {
              const cat = categoryFor(a.tags);
              return (
                <Link key={a.slug} to={`/blog/${a.slug}`} className="kv-l-guide">
                  <span className="kv-eyebrow">{categoryLabel(cat)}</span>
                  <div className="kv-l-guide-title">{a.title}</div>
                  <div className="kv-l-guide-excerpt">{a.description}</div>
                  <div className="kv-l-guide-foot">
                    <span>{new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>{a.readTime}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ NEWSLETTER ═══ */}
      <NewsletterCta
        overline="Monthly update"
        heading={<>One email a month. Everything that changed on the index.</>}
        description="New listings, median-price shifts, island activity, sources added. No promotional mail, no listings to feature, no spam — just the month in Cape Verde property."
      />
    </div>
  );
}
