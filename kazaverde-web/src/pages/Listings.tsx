import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatSourceLabel, isNewListing } from "../lib/format";
import type { ListingCard, PriceBucket } from "arei-sdk";
import "./Listings.css";

const TYPES: Record<string, string> = {
  apartment: "Apartment",
  villa: "Villa",
  house: "House",
  land: "Land",
};

const PRICE_OPTIONS: { value: PriceBucket | ""; label: string }[] = [
  { value: "", label: "Any price" },
  { value: "under_100k", label: "Under €100K" },
  { value: "100k_250k", label: "€100K – €250K" },
  { value: "250k_500k", label: "€250K – €500K" },
  { value: "over_500k", label: "€500K +" },
];

const BEDS_OPTIONS = [0, 1, 2, 3, 4];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price — low to high" },
  { value: "price-desc", label: "Price — high to low" },
  { value: "size-desc", label: "Size — largest first" },
];

type SortKey = "newest" | "price-asc" | "price-desc" | "size-desc";

const PAGE_SIZE = 9;

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "Price on request";
  return new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return "indexed recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "indexed recently";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return "indexed today";
  if (days === 1) return "indexed 1d ago";
  return `indexed ${days}d ago`;
}

export default function Listings() {
  useDocumentMeta(
    "Cape Verde Properties for Sale",
    "Every home for sale in Cape Verde, in one place. We index public listings from the agents working the islands, clean the data, and show you the market."
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const initialIsland = searchParams.get("island") || "";

  // Filter state
  const [island, setIsland] = useState(initialIsland);
  const [type, setType] = useState<string>("");
  const [beds, setBeds] = useState<number>(0);
  const [priceBucket, setPriceBucket] = useState<PriceBucket | "">("");
  const [sort, setSort] = useState<SortKey>("newest");

  // Popover state
  const [openPop, setOpenPop] = useState<"" | "island" | "type" | "price" | "beds" | "sort">("");

  // Pagination state — we accumulate pages for "Load more"
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState<ListingCard[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [islands, setIslands] = useState<{ island: string; count: number }[]>([]);
  const [indexTotal, setIndexTotal] = useState(0);
  const [priceCounts, setPriceCounts] = useState<Record<string, number>>({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    arei.getIslandOptions().then(setIslands).catch(() => {});
    // Fetch the unfiltered index total once so the hero stays stable.
    arei
      .getListings({ page: 1, pageSize: 1 })
      .then((r) => setIndexTotal(r.total))
      .catch(() => {});
    // Fetch price-bucket counts in parallel (server supports priceBucket filter).
    const buckets: PriceBucket[] = ["under_100k", "100k_250k", "250k_500k", "over_500k"];
    Promise.all(
      buckets.map((b) =>
        arei
          .getListings({ page: 1, pageSize: 1, priceBucket: b })
          .then((r) => [b, r.total] as const)
          .catch(() => [b, 0] as const)
      )
    ).then((pairs) => setPriceCounts(Object.fromEntries(pairs)));
  }, []);

  // Reset pagination when any server-side filter changes
  useEffect(() => {
    setPage(1);
    setCards([]);
  }, [island, priceBucket, type, beds]);

  // Sync ?island= to URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (island) next.set("island", island);
    else next.delete("island");
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [island]);

  // Fetch data for current page
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await arei.getListings({
          page,
          pageSize: PAGE_SIZE,
          island: island || undefined,
          priceBucket: priceBucket || undefined,
          propertyType: type || undefined,
          minBeds: beds || undefined,
        });
        if (cancelled) return;
        setCards((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (e) {
        if (cancelled) return;
        console.error("[Listings] Failed to load listings", e);
        setCards([]);
        setTotal(0);
        setTotalPages(0);
        setError("We could not load listings right now. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, island, priceBucket, type, beds, retryCount]);

  // Close any open popover on outside click.
  // Target-aware: clicks inside a filter chip wrap, the sort wrap, or
  // the popover itself are ignored. Safari iOS occasionally bubbles a
  // synthetic click to document even when React's stopPropagation runs,
  // which would close the sheet in the same tick it opened.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target?.closest(".kv-field-wrap, .kv-sort-wrap, .kv-pop")) return;
      setOpenPop("");
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // All filters are server-side now; only sort runs on the accumulated set.
  const visible = applyClientSort(cards, sort);

  // Meta stats for the hero
  const lastUpdated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const hasAnyFilter = island || type || beds > 0 || priceBucket;

  const clearAll = () => {
    setIsland("");
    setType("");
    setBeds(0);
    setPriceBucket("");
  };

  const stopAndToggle = (e: React.MouseEvent, key: typeof openPop) => {
    e.stopPropagation();
    setOpenPop((cur) => (cur === key ? "" : key));
  };

  const priceLabel = priceBucket
    ? PRICE_OPTIONS.find((p) => p.value === priceBucket)?.label || "Price"
    : "Price";

  const typeLabel = type ? TYPES[type] : "Any type";
  const bedsLabel = beds ? `${beds}+ bed` : "Bedrooms";
  const islandLabel = island || "All islands";
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label || "Newest first";

  const shownCount = total;
  const canLoadMore = page < totalPages;

  return (
    <>
      {/* HERO — slim. Brand voice now lives on /; this is just a
          page identifier + count. */}
      <section className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">All listings</div>
          <h1>The full Cape Verde index.</h1>
          <div className="kv-hero-meta">
            <div><b>{(indexTotal || total).toLocaleString("en")}</b>&nbsp; listings indexed</div>
            <div><b>{Math.max(islands.length, 1)}</b>&nbsp; islands covered</div>
            <div className="kv-hero-meta-updated">Last updated <b>{lastUpdated}</b></div>
          </div>
        </div>
      </section>

      {/* STICKY FILTER BAR */}
      <div className="kv-filters">
        <div className="kv-filters-inner">
          <div className="kv-filter-group">
            {/* Island */}
            <div className="kv-field-wrap">
              <button
                type="button"
                className={`kv-field${island ? " active" : ""}`}
                onClick={(e) => stopAndToggle(e, "island")}
              >
                <span>{islandLabel}</span>
                <span className="kv-caret">▾</span>
              </button>
              {openPop === "island" && (
                <PopOver onClickInside={(e) => e.stopPropagation()}>
                  <div className="kv-pop-h">Island</div>
                  <Option
                    selected={!island}
                    onClick={() => {
                      setIsland("");
                      setOpenPop("");
                    }}
                  >
                    All islands <span className="kv-ct">{total || ""}</span>
                  </Option>
                  {islands.map((i) => (
                    <Option
                      key={i.island}
                      selected={island === i.island}
                      onClick={() => {
                        setIsland(i.island);
                        setOpenPop("");
                      }}
                    >
                      {i.island} <span className="kv-ct">{i.count}</span>
                    </Option>
                  ))}
                </PopOver>
              )}
            </div>

            {/* Type */}
            <div className="kv-field-wrap">
              <button
                type="button"
                className={`kv-field${type ? " active" : ""}`}
                onClick={(e) => stopAndToggle(e, "type")}
              >
                <span>{typeLabel}</span>
                <span className="kv-caret">▾</span>
              </button>
              {openPop === "type" && (
                <PopOver onClickInside={(e) => e.stopPropagation()}>
                  <div className="kv-pop-h">Type</div>
                  <Option
                    selected={!type}
                    onClick={() => {
                      setType("");
                      setOpenPop("");
                    }}
                  >
                    Any type
                  </Option>
                  {Object.entries(TYPES).map(([k, v]) => (
                    <Option
                      key={k}
                      selected={type === k}
                      onClick={() => {
                        setType(k);
                        setOpenPop("");
                      }}
                    >
                      {v}
                    </Option>
                  ))}
                </PopOver>
              )}
            </div>

            {/* Price */}
            <div className="kv-field-wrap">
              <button
                type="button"
                className={`kv-field${priceBucket ? " active" : ""}`}
                onClick={(e) => stopAndToggle(e, "price")}
              >
                <span>{priceLabel}</span>
                <span className="kv-caret">▾</span>
              </button>
              {openPop === "price" && (
                <PopOver onClickInside={(e) => e.stopPropagation()}>
                  <div className="kv-pop-h">Price (EUR)</div>
                  {PRICE_OPTIONS.map((p) => {
                    const count = p.value ? priceCounts[p.value] : indexTotal;
                    return (
                      <Option
                        key={p.value || "any"}
                        selected={priceBucket === p.value}
                        onClick={() => {
                          setPriceBucket(p.value);
                          setOpenPop("");
                        }}
                      >
                        {p.label}{" "}
                        {count != null && count > 0 && <span className="kv-ct">{count}</span>}
                      </Option>
                    );
                  })}
                </PopOver>
              )}
            </div>

            {/* Beds */}
            <div className="kv-field-wrap">
              <button
                type="button"
                className={`kv-field${beds ? " active" : ""}`}
                onClick={(e) => stopAndToggle(e, "beds")}
              >
                <span>{bedsLabel}</span>
                <span className="kv-caret">▾</span>
              </button>
              {openPop === "beds" && (
                <PopOver onClickInside={(e) => e.stopPropagation()}>
                  <div className="kv-pop-h">Bedrooms</div>
                  {BEDS_OPTIONS.map((b) => (
                    <Option
                      key={b}
                      selected={beds === b}
                      onClick={() => {
                        setBeds(b);
                        setOpenPop("");
                      }}
                    >
                      {b === 0 ? "Any" : `${b}+ bedrooms`}
                    </Option>
                  ))}
                </PopOver>
              )}
            </div>

            {hasAnyFilter && (
              <button type="button" className="kv-field kv-clear" onClick={clearAll}>
                Clear all ×
              </button>
            )}
          </div>

          <div className="kv-filter-spacer" />
          <div className="kv-filter-result">
            <b>{shownCount}</b> {shownCount === 1 ? "listing" : "listings"}
          </div>
        </div>
      </div>

      {/* Mobile-only backdrop — visible whenever any filter popover is
          open. Sits below the popover sheet, above the page content,
          so a tap on listings/cards behind closes the popover via the
          existing document-click handler instead of triggering the
          card's navigation. Portaled to <body> so it shares a stacking
          context with the portaled popover. Hidden on desktop via CSS. */}
      {openPop &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="kv-pop-backdrop" aria-hidden="true" />,
          document.body,
        )}

      {/* RESULTS */}
      <section className="kv-section">
        <div
          className="kv-section-head"
          data-count={`${shownCount} ${shownCount === 1 ? "listing" : "listings"}`}
        >
          <div>
            <span className="kv-ey">Results</span>
            <h2>Browse every listing, cleaned and indexed.</h2>
          </div>

          <div className="kv-sort-wrap">
            <button
              type="button"
              className="kv-sort"
              onClick={(e) => stopAndToggle(e, "sort")}
            >
              Sort by <b>{sortLabel}</b> ▾
            </button>
            {openPop === "sort" && (
              <PopOver className="kv-pop-right" onClickInside={(e) => e.stopPropagation()}>
                <div className="kv-pop-h">Sort</div>
                {SORT_OPTIONS.map((s) => (
                  <Option
                    key={s.value}
                    selected={sort === s.value}
                    onClick={() => {
                      setSort(s.value);
                      setOpenPop("");
                    }}
                  >
                    {s.label}
                  </Option>
                ))}
              </PopOver>
            )}
          </div>
        </div>

        {error ? (
          <div className="kv-empty" role="status" aria-live="polite">
            <strong>We could not load listings right now.</strong>
            Please try again.
            <button
              type="button"
              className="kv-pager-btn"
              style={{ marginTop: 16 }}
              onClick={() => setRetryCount((c) => c + 1)}
            >
              Retry
            </button>
          </div>
        ) : loading && cards.length === 0 ? (
          <div className="kv-empty"><strong>Loading listings…</strong></div>
        ) : visible.length === 0 ? (
          <div className="kv-empty">
            <strong>No listings match.</strong>
            Try widening the filters.
          </div>
        ) : (
          <div className="kv-grid">
            {visible.map((l) => (
              <Card key={l.id} l={l} />
            ))}
          </div>
        )}

        {/* PAGER */}
        {!error && total > 0 && (
          <div className="kv-pager">
            <div>
              Showing <b>{visible.length ? `1–${visible.length}` : "0"}</b> of <b>{total.toLocaleString("en")}</b>
            </div>
            {canLoadMore ? (
              <button
                type="button"
                className="kv-pager-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more [↓]"}
              </button>
            ) : (
              <div />
            )}
            <div>
              Page <b>{page}</b> / <b>{Math.max(1, totalPages)}</b>
            </div>
          </div>
        )}
      </section>

      <NewsletterCta />
    </>
  );
}

/* ────────────────────────────────────────────────────── */

function applyClientSort(cards: ListingCard[], sort: SortKey): ListingCard[] {
  switch (sort) {
    case "price-asc":
      return [...cards].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "price-desc":
      return [...cards].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case "size-desc":
      return [...cards].sort(
        (a, b) => (b.land_area_sqm ?? 0) - (a.land_area_sqm ?? 0)
      );
    default:
      // newest — server default; leave order as-is
      return cards;
  }
}

/* ────────────────────────────────────────────────────── */

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

function PopOver({
  children,
  className,
  onClickInside,
}: {
  children: React.ReactNode;
  className?: string;
  onClickInside?: (e: React.MouseEvent) => void;
}) {
  const isMobile = useIsMobile();
  const node = (
    <div className={`kv-pop${className ? " " + className : ""}`} onClick={onClickInside}>
      {children}
    </div>
  );
  // On mobile the popover is a fixed bottom-sheet. Render it via a portal
  // into <body> so it escapes the .kv-filter-group overflow-x + mask-image
  // ancestor — Safari iOS clips position:fixed inside such containers,
  // which is why taps on the chip looked like they did nothing.
  if (isMobile && typeof document !== "undefined") {
    return createPortal(node, document.body);
  }
  return node;
}

function Option({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`kv-pop-opt${selected ? " sel" : ""}`}
      onClick={onClick}
      role="button"
    >
      {children}
    </div>
  );
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function Card({ l }: { l: ListingCard; index?: number }) {
  // NEW = indexed within the last 7 days (single source of truth in lib/format).
  // Drops the previous "first two cards always look new" hack.
  const isNew = l.is_new || isNewListing(l.first_seen_at);
  const typeLabel = l.property_type ? TYPES[l.property_type.toLowerCase()] || capitalize(l.property_type) : "";
  const location = [l.city, l.island].filter(Boolean).join(", ");
  const imgUrl = l.image_urls?.[0] || l.image_url;

  const bgStyle: React.CSSProperties = imgUrl
    ? {
        backgroundImage: `url("${imgUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundImage: "linear-gradient(135deg, #c9d4c8 0%, #a8bea4 100%)" };

  const isLand = (l.property_type || "").toLowerCase() === "land";

  // Build only the specs we actually have data for. Empty placeholders
  // ("— bed") read as broken; better to omit silently.
  const specs: { label: string; value: number | string }[] = [];
  if (isLand) {
    if (l.land_area_sqm != null) specs.push({ label: "m²", value: l.land_area_sqm });
  } else {
    if (l.bedrooms != null) specs.push({ label: "bed", value: l.bedrooms === 0 ? "Studio" : l.bedrooms });
    if (l.bathrooms != null && l.bathrooms > 0) specs.push({ label: "bath", value: l.bathrooms });
    if (l.land_area_sqm != null) specs.push({ label: "m²", value: l.land_area_sqm });
  }

  return (
    <Link className="kv-lcard" to={`/listing/${l.id}`}>
      <div className="kv-lc-img" style={bgStyle}>
        {isNew && <span className="kv-lc-flag">New</span>}
      </div>
      <div className="kv-lc-body">
        <div className="kv-lc-topline">
          <span>{typeLabel}</span>
          {location && <span className="kv-lc-loc">{location}</span>}
        </div>
        <div className="kv-lc-price">{fmtPrice(l.price)}</div>
        <div className="kv-lc-title">{l.title}</div>
        {specs.length > 0 && (
          <div className="kv-lc-specs">
            {specs.map((s) => (
              <span key={s.label}>
                <b>{s.value}</b> {s.label}
              </span>
            ))}
          </div>
        )}
        <div className="kv-lc-provenance">
          <span>via {formatSourceLabel(l.source_id)}</span>
          <span>{relTime(l.first_seen_at)}</span>
        </div>
      </div>
    </Link>
  );
}
