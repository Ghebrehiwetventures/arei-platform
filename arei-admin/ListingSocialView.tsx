import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { supabaseAuth } from "./supabase";

interface Listing {
  id: string;
  source_id: string;
  source_name: string;
  title: string;
  price: number | null;
  price_period: string;
  island: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  description: string | null;
  image_urls: string[];
  cover_image_url: string | null;
  source_url: string | null;
  listing_url: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabaseAuth.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type SchedulePattern = "1_per_day" | "2_per_day" | "3_per_week";
type ListingSortKey = "latest" | "title_asc" | "price_asc" | "price_desc" | "images_desc" | "source_asc";

const SCHEDULE_PATTERNS: { value: SchedulePattern; label: string; desc: string }[] = [
  { value: "1_per_day",   label: "1 / day",    desc: "Every day at 10:00" },
  { value: "2_per_day",   label: "2 / day",    desc: "Daily at 10:00 & 19:00" },
  { value: "3_per_week",  label: "3 / week",   desc: "Mon · Wed · Fri at 10:00" },
];

const LISTING_SORT_OPTIONS: { value: ListingSortKey; label: string }[] = [
  { value: "latest",      label: "Newest" },
  { value: "title_asc",   label: "Title A-Z" },
  { value: "price_asc",   label: "Price low-high" },
  { value: "price_desc",  label: "Price high-low" },
  { value: "images_desc", label: "Most images" },
  { value: "source_asc",  label: "Agency A-Z" },
];

function nextSlot(pattern: SchedulePattern, takenISO: string[]): Date {
  const taken = new Set(takenISO.map((s) => new Date(s).toISOString().slice(0, 16)));
  const now = new Date();

  for (let day = 0; day <= 30; day++) {
    const base = new Date(now);
    base.setDate(base.getDate() + day);

    let hours: number[] = [];
    if (pattern === "1_per_day") {
      hours = [10];
    } else if (pattern === "2_per_day") {
      hours = [10, 19];
    } else {
      const dow = base.getDay(); // 0=Sun
      if (dow !== 1 && dow !== 3 && dow !== 5) continue;
      hours = [10];
    }

    for (const h of hours) {
      const candidate = new Date(base);
      candidate.setHours(h, 0, 0, 0);
      if (candidate <= now) continue;
      const key = candidate.toISOString().slice(0, 16);
      if (!taken.has(key)) return candidate;
    }
  }
  // fallback: 24h from now
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function compareNullablePrice(a: Listing, b: Listing, dir: "asc" | "desc"): number {
  const aMissing = a.price == null;
  const bMissing = b.price == null;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return dir === "asc" ? a.price! - b.price! : b.price! - a.price!;
}

function sortListings(listings: Listing[], sortBy: ListingSortKey): Listing[] {
  return [...listings].sort((a, b) => {
    if (sortBy === "title_asc") return (a.title || a.id).localeCompare(b.title || b.id);
    if (sortBy === "price_asc") return compareNullablePrice(a, b, "asc");
    if (sortBy === "price_desc") return compareNullablePrice(a, b, "desc");
    if (sortBy === "images_desc") return (b.image_urls?.length || 0) - (a.image_urls?.length || 0);
    if (sortBy === "source_asc") return (a.source_name || a.source_id).localeCompare(b.source_name || b.source_id);
    return b.id.localeCompare(a.id);
  });
}

function previewImageUrl(url: string, size = 220): string {
  if (!url) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${size}&h=${size}&fit=cover&output=jpg&q=82`;
}

function formatPriceEUR(price: number | null): string {
  return price
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price)
    : "POA";
}

async function apiFetch<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeaders()) as Record<string, string> };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch("/api/social-listing", {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed ${res.status}`);
  return data as T;
}

interface QueueItem {
  id: string;
  listing_id: string;
  listing_title: string | null;
  caption: string;
  image_urls: string[];
  scheduled_at: string;
  status: "pending" | "published" | "failed";
  error_message: string | null;
  post_id: string | null;
  permalink: string | null;
  channels: string[] | null;
}

interface PublishedPost {
  id: string;
  listing_id: string;
  external_post_id: string;
  permalink: string | null;
  caption: string;
  image_urls: string[];
  published_at: string;
}

// ── Listing browser row — visual replacement for the old <select> listbox.
//    Thumbnail + title + island·price + image count per row, so the operator
//    can actually scan inventory instead of reading truncated titles. ───────
function ListingRow({
  listing,
  active,
  onPick,
}: {
  listing: Listing;
  active: boolean;
  onPick: () => void;
}) {
  const cover = listing.cover_image_url || listing.image_urls?.[0] || "";
  const count = listing.image_urls?.length ?? 0;
  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors border ${
        active
          ? "border-border-strong bg-surface-2"
          : "border-transparent hover:bg-surface-2/60"
      }`}
    >
      <div className="relative w-11 h-11 flex-shrink-0 rounded overflow-hidden bg-surface-3">
        {cover && (
          <img
            src={previewImageUrl(cover, 88)}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        )}
        {active && <div className="absolute inset-0 ring-2 ring-inset ring-accent rounded" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-foreground truncate leading-tight">
          {listing.title || listing.id}
        </div>
        <div className="text-[11px] text-foreground-muted font-mono truncate mt-0.5">
          {[listing.island, formatPriceEUR(listing.price)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="text-[10px] text-foreground-subtle font-mono flex-shrink-0 tabular-nums">
        {count} img
      </div>
    </button>
  );
}

// ── Post preview — a lightweight, honest render of what ships.
//    Cover image (1:1), navigable carousel (prev/next on hover desktop,
//    swipe-arrows on mobile), dot indicators + counter, and the caption's
//    opening with truncation. Uses the real IG avatar + handle so the
//    operator sees what subscribers will see. ─────────────────────────────
const IG_HANDLE = "capeverderealestateindex";
const IG_AVATAR = "/cvrei-ig-avatar.png";

function PostPreview({
  images,
  caption,
  channels,
}: {
  images: string[];
  caption: string;
  channels: string[];
}) {
  const [idx, setIdx] = useState(0);
  // Snap back to first image when the selection changes underneath.
  useEffect(() => {
    if (idx >= images.length) setIdx(0);
  }, [images.length, idx]);

  const trimmed = caption.trim();
  const current = images[idx];
  const hasMany = images.length > 1;

  const go = (delta: number) => {
    if (!hasMany) return;
    setIdx((i) => (i + delta + images.length) % images.length);
  };

  return (
    <div className="surface-1 rounded border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <img
          src={IG_AVATAR}
          alt=""
          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
        />
        <div className="text-xs font-mono text-foreground truncate">{IG_HANDLE}</div>
        <div className="ml-auto label-style flex-shrink-0">Preview</div>
      </div>
      <div className="relative aspect-square bg-surface-3 group">
        {current ? (
          <img
            src={previewImageUrl(current, 640)}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground-subtle text-xs font-mono">
            No image selected
          </div>
        )}
        {hasMany && (
          <>
            {/* Counter pill — current / total */}
            <div className="absolute top-2 right-2 bg-black/65 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums">
              {idx + 1}/{images.length}
            </div>
            {/* Prev / next — visible on hover (desktop) and always on touch.
                Sized small so they never cover the photo's subject. */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 text-white text-sm font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 max-lg:opacity-100 transition-opacity"
            >‹</button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/55 hover:bg-black/75 text-white text-sm font-mono flex items-center justify-center opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 max-lg:opacity-100 transition-opacity"
            >›</button>
            {/* Dot indicators — current one is brighter/larger. */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {images.slice(0, 10).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={`rounded-full transition-all ${i === idx ? "w-1.5 h-1.5 bg-white" : "w-1 h-1 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="px-3 py-2.5">
        {trimmed ? (
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap line-clamp-3">
            <span className="font-mono font-medium">{IG_HANDLE}</span> {trimmed}
          </p>
        ) : (
          <p className="text-xs text-foreground-subtle">Caption preview will appear here.</p>
        )}
        {channels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {channels.map((c) => (
              <span
                key={c}
                className="text-[10px] font-mono text-foreground-muted capitalize px-1.5 py-0.5 rounded bg-surface-2"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ListingSocialView() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [published, setPublished] = useState<PublishedPost[]>([]);
  const [igConfigured, setIgConfigured] = useState(false);
  const [ttConfigured, setTtConfigured] = useState(false);
  const [channels, setChannels] = useState<string[]>(["instagram"]);
  const [search, setSearch] = useState("");
  const [listingSort, setListingSort] = useState<ListingSortKey>("latest");
  const [selectedId, setSelectedId] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const didDragRef = useRef(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>(
    () => (localStorage.getItem("ig_schedule_pattern") as SchedulePattern) || "1_per_day"
  );
  const [scheduleTime, setScheduleTime] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [editingQueueId, setEditingQueueId] = useState<string | null>(null);
  const editLoadRef = useRef<QueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [permalink, setPermalink] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Mobile only: the browser collapses to a summary chip once a listing is
  // picked, so the operator isn't scrolling past 400 rows to reach the
  // composer. Ignored at lg+ where the browser is always shown via CSS.
  const [mobilePickerOpen, setMobilePickerOpen] = useState(true);

  const publishPanelRef = useRef<HTMLDivElement | null>(null);

  const selected = listings.find((l) => l.id === selectedId) || null;
  const allImages = selected?.image_urls || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matching = !q
      ? listings
      : listings.filter(
          (l) =>
            l.title?.toLowerCase().includes(q) ||
            l.island?.toLowerCase().includes(q) ||
            l.source_name?.toLowerCase().includes(q)
        );
    return sortListings(matching, listingSort);
  }, [listings, search, listingSort]);

  const loadState = () => {
    return Promise.all([
      apiFetch<{ listings: Listing[]; published: PublishedPost[]; instagram: { configured: boolean }; tiktok: { configured: boolean } }>("GET"),
      apiFetch<{ items: QueueItem[] }>("POST", { action: "list_queue" }),
    ]).then(([{ listings: ls, published: ps, instagram, tiktok }, { items }]) => {
      setListings(ls);
      setPublished(ps || []);
      setIgConfigured(instagram.configured);
      setTtConfigured(tiktok?.configured ?? false);
      setQueue(items || []);
      if (ls.length > 0 && !ls.find((l) => l.id === selectedId)) {
        setSelectedId(ls[0].id);
      } else if (ls.length === 0) {
        setSelectedId("");
      }
    });
  };

  useEffect(() => {
    loadState()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filtered.length === 0) {
      if (selectedId) setSelectedId("");
      return;
    }

    if (!filtered.some((l) => l.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setPermalink("");
    setError("");
    setNotice("");

    // Loading a queued post for editing — use its saved caption/images
    // instead of regenerating.
    const edit = editLoadRef.current;
    if (edit && edit.listing_id === selectedId) {
      setCaption(edit.caption);
      setSelectedImages(edit.image_urls.slice(0, 10));
      editLoadRef.current = null;
      return;
    }

    // Manual listing pick — not editing anything.
    setEditingQueueId(null);
    setCaption("");
    const imgs = listings.find((l) => l.id === selectedId)?.image_urls || [];
    setSelectedImages(imgs.slice(0, 10));

    setCaptionLoading(true);
    apiFetch<{ caption: string }>("POST", { action: "generate_caption", listingId: selectedId })
      .then(({ caption: c }) => setCaption(c))
      .catch((err) => setError(err.message))
      .finally(() => setCaptionLoading(false));
  }, [selectedId]);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(url)) return prev.filter((u) => u !== url);
      if (prev.length >= 10) return prev; // hard cap at Instagram limit
      return [...prev, url];
    });
  };

  const moveSelectedImage = (position: number, direction: -1 | 1) => {
    setSelectedImages((prev) => {
      const nextIndex = position + direction;
      if (position < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[position], next[nextIndex]] = [next[nextIndex], next[position]];
      return next;
    });
  };

  const handleDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragIndex === null) return;
    let closest = dragIndex;
    let closestDist = Infinity;
    selectedImages.forEach((_, idx) => {
      const el = cellRefs.current[idx];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientX - cx) + Math.abs(e.clientY - cy);
      if (dist < closestDist) { closestDist = dist; closest = idx; }
    });
    if (closest !== dragIndex) didDragRef.current = true;
    setDropIndex(closest);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      setSelectedImages((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dropIndex, 0, moved);
        return next;
      });
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  // "Publish now" enqueues for immediate background sending (scheduled_at = now)
  // and returns instantly — the cron picks it up within ~a minute. No 20-30s wait.
  const handlePublish = async () => {
    if (!selectedId || !caption.trim() || selectedImages.length < 2) return;
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await apiFetch("POST", {
        action: "queue_carousel",
        listingId: selectedId,
        imageUrls: selectedImages,
        caption: caption.trim(),
        scheduledAt: new Date().toISOString(),
        listingTitle: selected?.title || null,
        channels,
      });
      setNotice("Sending in the background — it'll appear in Published within a minute. You can keep working.");
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedId || !caption.trim() || selectedImages.length < 2 || !scheduleTime) return;
    setScheduling(true);
    setError("");
    setNotice("");
    try {
      if (editingQueueId) {
        await apiFetch("POST", {
          action: "update_queue",
          queueId: editingQueueId,
          listingId: selectedId,
          imageUrls: selectedImages,
          caption: caption.trim(),
          scheduledAt: new Date(scheduleTime).toISOString(),
        });
        setNotice("Queue item updated.");
        setEditingQueueId(null);
      } else {
        await apiFetch("POST", {
          action: "queue_carousel",
          listingId: selectedId,
          imageUrls: selectedImages,
          caption: caption.trim(),
          scheduledAt: new Date(scheduleTime).toISOString(),
          channels,
        });
        setNotice("Added to queue.");
      }
      setShowSchedule(false);
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  const handleEditQueueItem = (item: QueueItem) => {
    setEditingQueueId(item.id);
    setScheduleTime(toDatetimeLocal(new Date(item.scheduled_at)));
    setShowSchedule(true);
    setError("");
    setNotice("");
    if (selectedId === item.listing_id) {
      // Same listing already selected — the [selectedId] effect won't fire.
      setCaption(item.caption);
      setSelectedImages(item.image_urls.slice(0, 10));
    } else {
      editLoadRef.current = item;
      setSelectedId(item.listing_id);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingQueueId(null);
    setShowSchedule(false);
    setNotice("");
  };

  const handleRemoveFromQueue = async (id: string) => {
    try {
      await apiFetch("POST", { action: "remove_from_queue", queueId: id });
      setQueue((prev) => prev.filter((q) => q.id !== id));
      if (editingQueueId === id) setEditingQueueId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const applyNextSlot = (pattern: SchedulePattern) => {
    const taken = queue.filter((q) => q.status === "pending").map((q) => q.scheduled_at);
    setScheduleTime(toDatetimeLocal(nextSlot(pattern, taken)));
  };

  const handlePatternChange = (p: SchedulePattern) => {
    setSchedulePattern(p);
    localStorage.setItem("ig_schedule_pattern", p);
    applyNextSlot(p);
  };

  // Pick a listing from the browser. On mobile this also collapses the
  // browser so the composer is immediately in view.
  const pickListing = (id: string) => {
    setSelectedId(id);
    setMobilePickerOpen(false);
  };

  const pickRandom = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    pickListing(pick.id);
  };

  const openScheduleFromBar = () => {
    if (!showSchedule) applyNextSlot(schedulePattern);
    setShowSchedule(true);
    publishPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return <div className="py-12 text-foreground-muted font-mono">Loading listings...</div>;
  }

  const channelIsConfigured = channels.some((c) =>
    c === "instagram" ? igConfigured : c === "tiktok" ? ttConfigured : false
  );
  const canPublish = channelIsConfigured && channels.length > 0 && selectedId && caption.trim() && selectedImages.length >= 2 && !publishing;
  const canSchedule = channels.length > 0 && selectedId && caption.trim() && selectedImages.length >= 2 && scheduleTime && !scheduling;

  const selectedCover = selected?.cover_image_url || allImages[0] || "";

  return (
    <div className="space-y-6 pb-28 lg:pb-6">
      <section>
        <div className="label-style mb-1">Marketing &gt; Instagram</div>
        <h2 className="text-2xl font-semibold text-foreground font-mono mb-1">Marketing</h2>
        <p className="text-sm text-foreground-muted">
          Pick a listing, select images, and publish or schedule an Instagram carousel.
        </p>
      </section>

      {(error || notice) && (
        <section className="space-y-2">
          {error && <div className="border border-red bg-red/10 text-red p-3 text-sm font-mono">{error}</div>}
          {notice && (
            <div className="border border-green bg-green/10 text-green p-3 text-sm font-mono">
              {notice}
              {permalink && (
                <a href={permalink} target="_blank" rel="noopener noreferrer" className="ml-3 underline">
                  Open on Instagram
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* Mobile: collapsed-browser summary chip — tap to reopen the picker. */}
      {selected && !mobilePickerOpen && (
        <button
          type="button"
          onClick={() => setMobilePickerOpen(true)}
          className="lg:hidden w-full flex items-center gap-3 surface-1 rounded border border-border p-2 text-left"
        >
          <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-surface-3">
            {selectedCover && (
              <img src={previewImageUrl(selectedCover, 80)} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-foreground truncate">{selected.title || selected.id}</div>
            <div className="text-[11px] text-foreground-muted font-mono truncate mt-0.5">
              {[selected.island, formatPriceEUR(selected.price)].filter(Boolean).join(" · ")}
            </div>
          </div>
          <span className="text-[11px] font-mono text-accent flex-shrink-0">Change ›</span>
        </button>
      )}

      {/* ── Studio grid ───────────────────────────────────────────────
          One instance of each block (the image grid's drag refs require a
          single grid), reflowed via CSS:
            mobile : single column (A → B → C), sticky action bar below
            lg     : [browser | composer], preview/publish under composer
            xl     : [browser | composer | preview+publish]
          Each column gets a matching label header on lg+ so the three
          panels share a top baseline — "boxes with aligned windows".    */}
      <section className="grid grid-cols-1 gap-4 items-start lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* A · Listing browser */}
        <div
          className={`${mobilePickerOpen ? "block" : "hidden"} lg:block surface-1 rounded border border-border lg:sticky lg:top-4 lg:row-span-2 xl:row-span-1`}
        >
          <div className="label-style px-3 pt-3 pb-1.5 hidden lg:block">Browse</div>
          <div className="p-3 border-b border-border space-y-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, island, agency…"
              className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono w-full rounded"
            />
            <div className="flex items-center gap-2">
              <select
                value={listingSort}
                onChange={(e) => setListingSort(e.target.value as ListingSortKey)}
                className="bg-background border border-border text-foreground px-2 py-1.5 text-xs font-mono rounded flex-1 min-w-0"
              >
                {LISTING_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={pickRandom}
                disabled={filtered.length === 0}
                title="Pick a random listing"
                className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 text-foreground-muted hover:text-foreground hover:border-[#8ECFBF]/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono flex-shrink-0"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
                Random
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="label-style">Listings</span>
              <span className="text-[11px] font-mono text-foreground-subtle tabular-nums">
                {filtered.length}/{listings.length}
              </span>
            </div>
          </div>
          <div className="p-2 space-y-0.5 overflow-y-auto max-h-[55vh] lg:max-h-[calc(100vh-240px)]">
            {filtered.map((l) => (
              <ListingRow
                key={l.id}
                listing={l}
                active={l.id === selectedId}
                onPick={() => pickListing(l.id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-foreground-muted font-mono p-3 text-center">No listings match.</div>
            )}
          </div>
        </div>

        {/* B · Composer — metadata + image picker + caption */}
        <div className="space-y-4 min-w-0">
          <div className="label-style hidden lg:block">Compose</div>
          {selected && (
            <div className="surface-1 rounded border border-border p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs font-mono">
                <div><span className="text-foreground-muted">Source</span><br />{selected.source_name}</div>
                <div><span className="text-foreground-muted">Island</span><br />{selected.island}</div>
                <div><span className="text-foreground-muted">Price</span><br />{formatPriceEUR(selected.price)}</div>
                <div><span className="text-foreground-muted">Specs</span><br />
                  {[
                    selected.bedrooms ? `${selected.bedrooms}bd` : null,
                    selected.bathrooms ? `${selected.bathrooms}ba` : null,
                    selected.area_sqm ? `${Math.round(selected.area_sqm)}m²` : null,
                  ].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono border-t border-border mt-3 pt-3">
                <a
                  href={selected.listing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green truncate hover:underline"
                >
                  ↗ capeverderealestateindex.com
                </a>
                {selected.source_url && (
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted truncate hover:underline hover:text-foreground"
                  >
                    ↗ {selected.source_name}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Image selection */}
          {allImages.length > 0 && (
            <div className="surface-1 rounded border border-border p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="text-sm sm:text-xs font-mono text-foreground-muted">
                  <span className="text-foreground">{selectedImages.length}</span> / {allImages.length} selected · max 10
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3 text-xs sm:text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedImages(allImages.slice(0, 10))}
                    className="min-h-10 rounded border border-border px-3 text-foreground-muted hover:text-foreground hover:bg-surface-2 sm:min-h-0 sm:border-0 sm:p-0"
                  >
                    Select 10
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedImages([])}
                    className="min-h-10 rounded border border-border px-3 text-foreground-muted hover:text-foreground hover:bg-surface-2 sm:min-h-0 sm:border-0 sm:p-0"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div
                className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-1.5 touch-none"
                onPointerMove={handleDragMove}
                onPointerUp={handleDragEnd}
                onPointerCancel={handleDragEnd}
              >
                {[
                  ...selectedImages,
                  ...allImages.filter((u) => !selectedImages.includes(u)),
                ].map((url) => {
                  const position = selectedImages.indexOf(url);
                  const active = position >= 0;
                  const isDragging = dragIndex === position && active;
                  const isDropTarget = dropIndex === position && dragIndex !== null && dragIndex !== position && active;
                  return (
                    <div
                      key={url}
                      ref={active ? (el) => { cellRefs.current[position] = el; } : undefined}
                      className={`relative aspect-square overflow-hidden rounded ${
                        active ? "cursor-grab" : ""
                      } ${isDragging ? "opacity-40 ring-2 ring-foreground" : ""} ${
                        isDropTarget ? "ring-2 ring-green" : ""
                      }`}
                      onPointerDown={active ? (e) => {
                        e.preventDefault();
                        didDragRef.current = false;
                        setDragIndex(position);
                        setDropIndex(position);
                      } : undefined}
                    >
                      <img
                        src={previewImageUrl(url)}
                        alt=""
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          if (didDragRef.current) { didDragRef.current = false; return; }
                          toggleImage(url);
                        }}
                        className="w-full h-full object-cover cursor-pointer select-none"
                      />
                      {!active && (
                        <div className="absolute inset-0 bg-background/40 pointer-events-none rounded" />
                      )}
                      {active && (
                        <>
                          <div className="absolute inset-0 ring-2 ring-inset ring-green pointer-events-none rounded" />
                          {/* No order badge — position is already conveyed by the
                              grid order (selected tiles are sorted to the front),
                              so a numbered chip would just add visual noise. */}
                          {/* Mobile reorder — small corner chips, never cover the photo body.
                              Long-press drag on the tile still works as the primary gesture. */}
                          <div className="absolute top-1 right-1 flex gap-0.5 sm:hidden">
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); moveSelectedImage(position, -1); }}
                              disabled={position === 0}
                              className="w-6 h-6 rounded-full bg-background/85 text-foreground text-xs font-mono leading-none flex items-center justify-center disabled:opacity-30"
                              aria-label="Move image earlier"
                            >‹</button>
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); moveSelectedImage(position, 1); }}
                              disabled={position === selectedImages.length - 1}
                              className="w-6 h-6 rounded-full bg-background/85 text-foreground text-xs font-mono leading-none flex items-center justify-center disabled:opacity-30"
                              aria-label="Move image later"
                            >›</button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedImages.length < 2 && (
                <p className="text-amber text-[11px] font-mono mt-2">Select at least 2 images.</p>
              )}
              {selectedImages.length >= 2 && (
                <p className="text-foreground-muted text-[11px] font-mono mt-2">Drag to reorder on desktop · use ‹ › on mobile.</p>
              )}
            </div>
          )}

          {/* Caption */}
          <div className="surface-1 rounded border border-border p-4 space-y-3">
            <div className="label-style">
              Caption
              {captionLoading && <span className="ml-2 text-foreground-muted font-normal normal-case">generating...</span>}
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={10}
              className="w-full bg-background border border-border text-foreground p-3 text-sm font-mono leading-relaxed rounded"
              placeholder={captionLoading ? "Generating caption..." : "Select a listing"}
            />
            {editingQueueId && (
              <div className="flex items-center justify-between gap-3 border border-green/40 bg-green/10 text-green px-3 py-2 text-[11px] font-mono rounded">
                <span>Editing a queued post — make changes, then Save changes below.</span>
                <button type="button" onClick={cancelEdit} className="underline hover:no-underline">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* C · Preview + publish */}
        <div
          ref={publishPanelRef}
          className="space-y-4 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-4"
        >
          <div className="label-style hidden xl:block">Preview &amp; publish</div>
          <PostPreview images={selectedImages} caption={caption} channels={channels} />

          <div className="surface-1 rounded border border-border p-4 space-y-3">
            {/* Channel selector */}
            <div>
              <div className="label-style mb-2">Channels</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "instagram", label: "Instagram", configured: igConfigured },
                  { id: "tiktok",    label: "TikTok",    configured: ttConfigured },
                ].map(({ id, label, configured }) => {
                  const checked = channels.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] font-mono cursor-pointer select-none transition-colors ${
                        checked
                          ? "border-foreground text-foreground bg-surface-1"
                          : "border-border text-foreground-muted hover:border-foreground/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() =>
                          setChannels((prev) =>
                            prev.includes(id)
                              ? prev.filter((c) => c !== id)
                              : [...prev, id]
                          )
                        }
                      />
                      <span>{label}</span>
                      <span className={configured ? "text-green" : "text-foreground-muted opacity-50"}>
                        {configured ? "●" : "○"}
                      </span>
                    </label>
                  );
                })}
              </div>
              {channels.length === 0 && (
                <p className="text-amber text-[11px] font-mono mt-1.5">Select at least one channel.</p>
              )}
            </div>

            {/* Desktop actions (mobile uses the sticky bottom bar) */}
            <div className="hidden lg:flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!canPublish}
                className="flex-1 min-w-[140px] px-4 py-2.5 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
              >
                {publishing ? "Sending…" : `Publish now (${selectedImages.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!showSchedule) applyNextSlot(schedulePattern);
                  setShowSchedule((v) => !v);
                }}
                disabled={selectedImages.length < 2 || !caption.trim() || channels.length === 0}
                className="px-4 py-2.5 text-sm font-semibold rounded border border-border text-foreground hover:bg-surface-1 transition-all disabled:opacity-40 font-mono"
              >
                Schedule
              </button>
            </div>

            {showSchedule && (
              <div className="border border-border rounded p-3 space-y-3 bg-background">
                <div className="label-style">Post frequency</div>
                <div className="grid grid-cols-3 gap-2">
                  {SCHEDULE_PATTERNS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handlePatternChange(p.value)}
                      className={`px-2 py-2 text-[11px] font-mono rounded border text-left transition-all ${
                        schedulePattern === p.value
                          ? "border-foreground text-foreground bg-surface-1"
                          : "border-border text-foreground-muted hover:border-foreground/40"
                      }`}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-foreground-muted mt-0.5 text-[10px]">{p.desc}</div>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="label-style mb-1">Next slot <span className="font-normal normal-case text-foreground-muted">(override if needed)</span></div>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="bg-background border border-border text-foreground px-3 py-2 text-sm font-mono rounded w-full"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSchedule}
                    disabled={!canSchedule}
                    className="flex-1 px-4 py-2 text-sm font-semibold rounded bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-40 font-mono"
                  >
                    {scheduling ? "Saving..." : editingQueueId ? "Save changes" : "Add to queue"}
                  </button>
                  {editingQueueId && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[11px] font-mono text-foreground-muted hover:text-foreground"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Queue ─────────────────────────────────────────────────────────
          Pending + recently failed posts. Published items drop off (they
          surface in the Published grid below). */}
      {queue.length > 0 && (() => {
        const activeQueue = queue.filter((i) => i.status === "pending" || i.status === "failed");
        const failedCount = queue.filter((i) => i.status === "failed").length;
        if (activeQueue.length === 0) return null;
        return (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground font-mono">
              Queue ({activeQueue.length})
            </h3>
            {failedCount > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Remove ${failedCount} failed item${failedCount > 1 ? "s" : ""} from queue?`)) return;
                  try {
                    await apiFetch("POST", { action: "clear_failed" });
                    await loadState();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : String(err));
                  }
                }}
                className="text-[11px] font-mono text-red hover:text-red/70 transition-colors"
              >
                Clear failed ({failedCount})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {activeQueue.map((item) => (
              <div key={item.id} className="surface-1 border border-border rounded p-3 text-xs font-mono flex items-start justify-between gap-4">
                <div className="flex gap-3 items-start min-w-0">
                  {item.image_urls?.[0] && (
                    <img
                      src={previewImageUrl(item.image_urls[0], 96)}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="text-foreground truncate">{item.listing_title || item.listing_id}</div>
                    <div className="text-foreground-muted mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{new Date(item.scheduled_at).toLocaleString()} · {item.image_urls.length} images</span>
                      {(item.channels ?? ["instagram"]).map((ch) => (
                        <span key={ch} className="px-1 py-0.5 rounded bg-surface-2 text-[10px] text-foreground-muted capitalize">{ch}</span>
                      ))}
                    </div>
                    {item.error_message && (
                      <div className={`mt-0.5 truncate ${item.status === "failed" ? "text-red" : "text-amber"}`}>
                        {item.error_message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === "pending" ? "bg-amber/20 text-amber" :
                    item.status === "published" ? "bg-green/20 text-green" :
                    "bg-red/20 text-red"
                  }`}>{item.status}</span>
                  {item.status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditQueueItem(item)}
                        className={`transition-colors ${editingQueueId === item.id ? "text-green" : "text-foreground-muted hover:text-foreground"}`}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(item.id)}
                        className="text-foreground-muted hover:text-red transition-colors"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {item.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFromQueue(item.id)}
                      title="Remove failed item"
                      className="text-red/60 hover:text-red transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        );
      })()}

      {published.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-foreground font-mono">Published ({published.length})</h3>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Clear all published history? Listings will reappear in the picker.")) return;
                try {
                  await apiFetch("POST", { action: "clear_published" });
                  await loadState();
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                }
              }}
              className="text-[11px] font-mono text-foreground-muted hover:text-red transition-colors"
            >
              Reset history
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {published.map((post) => (
              <div key={post.id} className="surface-1 border border-border rounded p-3 text-xs font-mono space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-foreground truncate flex-1" title={post.listing_id}>{post.listing_id}</div>
                  <div className="text-foreground-muted whitespace-nowrap">
                    {new Date(post.published_at).toLocaleDateString()}
                  </div>
                </div>
                {post.image_urls?.[0] && (
                  <img
                    src={previewImageUrl(post.image_urls[0], 360)}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full aspect-square object-cover rounded"
                  />
                )}
                <div className="text-foreground-muted line-clamp-2">{post.caption.split("\n")[0]}</div>
                <div className="flex items-center gap-3 pt-1">
                  {post.permalink && (
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-green hover:underline">
                      ↗ Instagram
                    </a>
                  )}
                  <a
                    href={`https://www.capeverderealestateindex.com/listing/${post.listing_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground-muted hover:text-foreground hover:underline"
                  >
                    ↗ Listing
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky action bar — the publish decision is always reachable
          without scrolling to the bottom of a long form. */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 surface-1 border-t border-border px-3 py-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish}
          className="flex-1 px-4 py-2.5 text-sm font-semibold rounded bg-foreground text-background disabled:opacity-40 font-mono"
        >
          {publishing ? "Sending…" : `Publish now (${selectedImages.length})`}
        </button>
        <button
          type="button"
          onClick={openScheduleFromBar}
          disabled={selectedImages.length < 2 || !caption.trim() || channels.length === 0}
          className="px-4 py-2.5 text-sm font-semibold rounded border border-border-strong text-foreground disabled:opacity-40 font-mono"
        >
          Schedule
        </button>
      </div>
    </div>
  );
}
