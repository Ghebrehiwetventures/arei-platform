import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { formatSourceLabel, isNewListing } from "../lib/format";
import { getLocalizedTitle } from "../lib/i18n-listings";
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
type ViewMode = "grid" | "list";

const PAGE_SIZE = 9;

function priceOptionLabel(value: PriceBucket | "", t: ReturnType<typeof useTranslation>["t"]): string {
  const labels: Record<PriceBucket | "", string> = {
    "": t("listings.anyPrice"),
    under_100k: t("listings.under100"),
    "100k_250k": t("listings.between100250"),
    "250k_500k": t("listings.between250500"),
    over_500k: t("listings.over500"),
  };
  return labels[value];
}

function sortOptionLabel(value: SortKey, isPt: boolean): string {
  const labels: Record<SortKey, string> = isPt
    ? {
        newest: "Mais recentes primeiro",
        "price-asc": "Preço — baixo para alto",
        "price-desc": "Preço — alto para baixo",
        "size-desc": "Área — maior primeiro",
      }
    : {
        newest: "Newest first",
        "price-asc": "Price — low to high",
        "price-desc": "Price — high to low",
        "size-desc": "Size — largest first",
      };
  return labels[value];
}
const VIEW_STORAGE_KEY = "kv:listings:view";

function readInitialView(searchParams: URLSearchParams): ViewMode {
  const fromUrl = searchParams.get("view");
  if (fromUrl === "list" || fromUrl === "grid") return fromUrl;
  if (typeof window !== "undefined") {
    try {
      const fromStorage = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (fromStorage === "list" || fromStorage === "grid") return fromStorage;
    } catch {
      // localStorage may be unavailable (private mode); fall through.
    }
  }
  return "grid";
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return "Price on request";
  return new Intl.NumberFormat("en", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function relTime(iso: string | null | undefined, isPt: boolean): string {
  if (!iso) return isPt ? "indexado recentemente" : "indexed recently";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return isPt ? "indexado recentemente" : "indexed recently";
  const days = Math.max(0, Math.round((Date.now() - t) / 86_400_000));
  if (days === 0) return isPt ? "indexado hoje" : "indexed today";
  if (days === 1) return isPt ? "indexado há 1 dia" : "indexed 1d ago";
  return isPt ? `indexado há ${days} dias` : `indexed ${days}d ago`;
}

export default function Listings() {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  useDocumentMeta(
    t("listings.metaTitle"),
    t("listings.metaDescription")
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const initialIsland = searchParams.get("island") || "";

  // Filter state
  const [island, setIsland] = useState(initialIsland);
  const [type, setType] = useState<string>("");
  const [beds, setBeds] = useState<number>(0);
  const [priceBucket, setPriceBucket] = useState<PriceBucket | "">("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>(() => readInitialView(searchParams));

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

  // Sync ?view= to URL + localStorage. Default ("grid") drops the param
  // so existing /listings links stay clean.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (view === "list") next.set("view", "list");
    else next.delete("view");
    setSearchParams(next, { replace: true });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VIEW_STORAGE_KEY, view);
      } catch {
        // ignore storage failures
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

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
      } catch {
        if (cancelled) return;
        setCards([]);
        setTotal(0);
        setTotalPages(0);
        setError(t("common.liveDataUnavailable"));
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
  const lastUpdated = new Date().toLocaleDateString(isPt ? "pt-PT" : "en-GB", {
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
    ? priceOptionLabel(priceBucket, t)
    : t("listings.price");

  const typeLabel = type ? t(`listings.${type}`) : t("listings.anyType");
  const bedsLabel = beds ? `${beds}+ ${beds === 1 ? t("listings.onePlus").replace("1+ ", "") : t("detail.bedrooms").toLowerCase()}` : t("detail.bedrooms");
  const islandLabel = island || t("listings.anyIsland");
  const sortLabel = sortOptionLabel(sort, isPt);

  const shownCount = total;
  const canLoadMore = page < totalPages;

  return (
    <>
      {/* HERO — slim. Brand voice now lives on /; this is just a
          page identifier + count. */}
      <section className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">{t("common.allListings")}</div>
          <h1>{t("listings.title")}</h1>
          <div className="kv-hero-meta">
            <div><b>{(indexTotal || total).toLocaleString(i18n.language === "pt" ? "pt-PT" : "en")}</b>&nbsp; {t("common.listings")}</div>
            <div><b>{Math.max(islands.length, 1)}</b>&nbsp; {t("home.islands")}</div>
            <div className="kv-hero-meta-updated">{t("detail.lastChecked")} <b>{lastUpdated}</b></div>
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
                  <div className="kv-pop-h">{t("listings.island")}</div>
                  <Option
                    selected={!island}
                    onClick={() => {
                      setIsland("");
                      setOpenPop("");
                    }}
                  >
                    {t("listings.anyIsland")} <span className="kv-ct">{total || ""}</span>
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
                  <div className="kv-pop-h">{t("listings.type")}</div>
                  <Option
                    selected={!type}
                    onClick={() => {
                      setType("");
                      setOpenPop("");
                    }}
                  >
                    {t("listings.anyType")}
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
                      {t(`listings.${k}`)}
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
                  <div className="kv-pop-h">{t("listings.price")} (EUR)</div>
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
                        {priceOptionLabel(p.value, t)}{" "}
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
                  <div className="kv-pop-h">{t("detail.bedrooms")}</div>
                  {BEDS_OPTIONS.map((b) => (
                    <Option
                      key={b}
                      selected={beds === b}
                      onClick={() => {
                        setBeds(b);
                        setOpenPop("");
                      }}
                    >
                      {b === 0 ? t("listings.anyBeds") : `${b}+ ${t("detail.bedrooms").toLowerCase()}`}
                    </Option>
                  ))}
                </PopOver>
              )}
            </div>

            {hasAnyFilter && (
              <button type="button" className="kv-field kv-clear" onClick={clearAll}>
                {t("listings.clearFilters")} ×
              </button>
            )}
          </div>

          <div className="kv-filter-spacer" />
          <div className="kv-filter-result">
            <b>{shownCount}</b> {shownCount === 1 ? t("landing.listing") : t("landing.listings")}
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
        <div className="kv-section-head">
          <div>
            <span className="kv-ey">{t("common.results")}</span>
            <h2>{t("listings.sub")}</h2>
          </div>

          {/* Mobile-only count — paired with sort on a single row.
              Hidden on desktop (count lives in the filter bar instead). */}
          <div className="kv-section-head-count" aria-hidden="true">
            <b>{shownCount}</b> {shownCount === 1 ? t("landing.listing") : t("landing.listings")}
          </div>

          <div className="kv-sort-wrap">
            <button
              type="button"
              className="kv-sort"
              onClick={(e) => stopAndToggle(e, "sort")}
            >
              <span className="kv-sort-prefix">{isPt ? "Ordenar " : "Sort "}</span><b>{sortLabel}</b> ▾
            </button>
            <div className="kv-view-toggle" role="group" aria-label={isPt ? "Modo de visualização" : "View mode"}>
              <button
                type="button"
                className="kv-view-toggle-btn"
                aria-label={isPt ? "Vista em grelha" : "Grid view"}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <GridIcon />
              </button>
              <button
                type="button"
                className="kv-view-toggle-btn"
                aria-label={isPt ? "Vista em lista" : "List view"}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <ListIcon />
              </button>
            </div>
            {openPop === "sort" && (
              <PopOver className="kv-pop-right" onClickInside={(e) => e.stopPropagation()}>
                <div className="kv-pop-h">{isPt ? "Ordenar" : "Sort"}</div>
                {SORT_OPTIONS.map((s) => (
                  <Option
                    key={s.value}
                    selected={sort === s.value}
                    onClick={() => {
                      setSort(s.value);
                      setOpenPop("");
                    }}
                  >
                    {sortOptionLabel(s.value, isPt)}
                  </Option>
                ))}
              </PopOver>
            )}
          </div>
        </div>

        {error ? (
          <div className="kv-empty" role="status" aria-live="polite">
            <strong>{t("common.liveDataUnavailable")}</strong>
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
          <ListingGridSkeleton />
        ) : visible.length === 0 ? (
          <div className="kv-empty">
            <strong>{t("listings.noResults")}</strong>
            {t("listings.noResultsHint")}
            {hasAnyFilter && (
              <button
                type="button"
                className="kv-pager-btn kv-empty-clear"
                onClick={clearAll}
              >
                {t("listings.clearFilters")} ×
              </button>
            )}
          </div>
        ) : (
          view === "list" ? (
            <div className="kv-list">
              {visible.map((l) => (
                <ListingRow key={l.id} l={l} />
              ))}
            </div>
          ) : (
            <div className="kv-grid">
              {visible.map((l) => (
                <Card key={l.id} l={l} />
              ))}
            </div>
          )
        )}

        {/* PAGER */}
        {!error && total > 0 && (
          <div className="kv-pager">
            <div>
              {t("listings.showing", { count: visible.length ? `1–${visible.length}` : "0", total: total.toLocaleString(i18n.language === "pt" ? "pt-PT" : "en") })}
            </div>
            {canLoadMore && (
              <button
                type="button"
                className="kv-pager-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? t("listings.loading") : "Load more [↓]"}
              </button>
            )}
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

function ListingGridSkeleton() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-label={t("listings.loading")}>
      <div className="kv-grid kv-grid-skeleton" aria-hidden="true">
        {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <div className="kv-lcard kv-lcard-skeleton" key={i}>
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
                <span className="kv-skel-line kv-skel-xs" />
              </div>
              <div className="kv-lc-provenance">
                <span className="kv-skel-line kv-skel-xs" />
                <span className="kv-skel-line kv-skel-xs kv-skel-short" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="kv-sr-only">{t("listings.loading")}</span>
    </div>
  );
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
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  // NEW = indexed within the last 7 days (single source of truth in lib/format).
  // Drops the previous "first two cards always look new" hack.
  const isNew = l.is_new || isNewListing(l.first_seen_at);
  const typeKey = l.property_type?.toLowerCase();
  const typeLabel = typeKey ? t(`listings.${typeKey}`, { defaultValue: TYPES[typeKey] || capitalize(l.property_type || "") }) : "";
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
    if (l.bedrooms != null) specs.push({ label: t("detail.bedrooms").toLowerCase(), value: l.bedrooms === 0 ? t("listings.studio") : l.bedrooms });
    if (l.bathrooms != null && l.bathrooms > 0) specs.push({ label: t("detail.bathrooms").toLowerCase(), value: l.bathrooms });
    if (l.land_area_sqm != null) specs.push({ label: "m²", value: l.land_area_sqm });
  }

  const localizedTitle = getLocalizedTitle(l, i18n.language).title;

  return (
    <Link className="kv-lcard" to={`/listing/${l.id}`}>
      <div className="kv-lc-img" style={bgStyle}>
        {isNew && <span className="kv-lc-flag">{t("listings.new")}</span>}
      </div>
      <div className="kv-lc-body">
        <div className="kv-lc-topline">
          <span>{typeLabel}</span>
          {location && <span className="kv-lc-loc">{location}</span>}
        </div>
        <div className="kv-lc-price">{l.price == null ? t("detail.price") : fmtPrice(l.price)}</div>
        <div className="kv-lc-title">{localizedTitle}</div>
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
          <span>{t("listings.source")} {formatSourceLabel(l.source_id)}</span>
          <span>{relTime(l.first_seen_at, isPt)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ────────────────────────────────────────────────────── */

function ListingRow({ l }: { l: ListingCard }) {
  const { i18n, t } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const isNew = l.is_new || isNewListing(l.first_seen_at);
  const typeKey = l.property_type?.toLowerCase();
  const typeLabel = typeKey ? t(`listings.${typeKey}`, { defaultValue: TYPES[typeKey] || capitalize(l.property_type || "") }) : "";
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
  const specs: { label: string; value: number | string }[] = [];
  if (isLand) {
    if (l.land_area_sqm != null) specs.push({ label: "m²", value: l.land_area_sqm });
  } else {
    if (l.bedrooms != null) specs.push({ label: t("detail.bedrooms").toLowerCase(), value: l.bedrooms === 0 ? t("listings.studio") : l.bedrooms });
    if (l.bathrooms != null && l.bathrooms > 0) specs.push({ label: t("detail.bathrooms").toLowerCase(), value: l.bathrooms });
    if (l.land_area_sqm != null) specs.push({ label: "m²", value: l.land_area_sqm });
  }

  const localizedTitle = getLocalizedTitle(l, i18n.language).title;

  return (
    <Link className="kv-list-row" to={`/listing/${l.id}`}>
      <div className="kv-list-row-media" style={bgStyle}>
        {isNew && <span className="kv-lc-flag">{t("listings.new")}</span>}
      </div>
      <div className="kv-list-row-body">
        <div className="kv-list-row-head">
          <div className="kv-list-row-price">{l.price == null ? t("detail.price") : fmtPrice(l.price)}</div>
          {typeLabel && <div className="kv-list-row-type">{typeLabel}</div>}
        </div>
        <div className="kv-list-row-title">{localizedTitle}</div>
        {location && <div className="kv-list-row-loc">{location}</div>}
        {specs.length > 0 && (
          <div className="kv-list-row-specs">
            {specs.map((s) => (
              <span key={s.label}>
                <b>{s.value}</b> {s.label}
              </span>
            ))}
          </div>
        )}
        <div className="kv-list-row-meta">
          <span>{t("listings.source")} {formatSourceLabel(l.source_id)}</span>
          <span>{relTime(l.first_seen_at, isPt)}</span>
        </div>
      </div>
    </Link>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="5" height="5" stroke="currentColor" />
      <rect x="8.5" y="0.5" width="5" height="5" stroke="currentColor" />
      <rect x="0.5" y="8.5" width="5" height="5" stroke="currentColor" />
      <rect x="8.5" y="8.5" width="5" height="5" stroke="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="1.5" width="13" height="2.5" stroke="currentColor" />
      <rect x="0.5" y="5.75" width="13" height="2.5" stroke="currentColor" />
      <rect x="0.5" y="10" width="13" height="2.5" stroke="currentColor" />
    </svg>
  );
}
