import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ListingCard } from "arei-sdk";
import DLayersMark from "../components/DLayersMark";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import { FAQ_ENTRIES } from "../lib/faq-data";
import { Card } from "./Listings";
import "./Listings.css";
import "./MarketUpdates.css";

// Card width incl. gap, and the minimum fill-set width. We repeat the listings
// until one fill-set is wider than this (wider than any realistic viewport),
// so the marquee never runs out of cards mid-scroll regardless of how many
// listings loaded.
const MARQUEE_CARD_W = 280;
const MARQUEE_MIN_SET_W = 4200;

// Split the FAQ into two independent columns so each accordion expands without
// dragging the other column's rows — and so the block matches How it works' width.
const FAQ_HALF = Math.ceil(FAQ_ENTRIES.length / 2);
const FAQ_COLUMNS = [FAQ_ENTRIES.slice(0, FAQ_HALF), FAQ_ENTRIES.slice(FAQ_HALF)];

function hasImage(listing: ListingCard) {
  return Boolean(listing.image_urls?.[0] || listing.image_url);
}

// Pick image-backed listings for the marquee, preferring island variety so the
// ribbon reads as "across Cape Verde" rather than one town.
function pickPreviewListings(cards: ListingCard[], count: number): ListingCard[] {
  const picked: ListingCard[] = [];
  const seenIds = new Set<string>();
  const seenIslands = new Set<string>();

  const tryAdd = (card: ListingCard) => {
    if (picked.length >= count || seenIds.has(card.id) || !hasImage(card)) return;
    picked.push(card);
    seenIds.add(card.id);
    if (card.island) seenIslands.add(card.island);
  };

  for (const card of cards) {
    if (card.island && !seenIslands.has(card.island)) tryAdd(card);
  }
  for (const card of cards) tryAdd(card);

  return picked;
}

function ProofSkeleton() {
  return (
    <div className="kv-lcard kv-lcard-skeleton" aria-hidden="true">
      <div className="kv-lc-img" />
      <div className="kv-lc-body">
        <div className="kv-lc-topline">
          <span className="kv-skel-line kv-skel-xs" />
          <span className="kv-skel-line kv-skel-xs kv-skel-short" />
        </div>
        <div className="kv-skel-line kv-skel-price" />
        <div className="kv-skel-line kv-skel-wide" />
      </div>
    </div>
  );
}

function captureAttribution(): { source: string; [key: string]: string } {
  const params = new URLSearchParams(window.location.search);
  const out: { source: string; [key: string]: string } = {
    source: "market-updates",
    page: window.location.pathname,
  };
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) out[key] = value;
  }
  if (document.referrer) out.referrer = document.referrer;
  return out;
}

export default function MarketUpdates() {
  useDocumentMeta(
    "Cape Verde Property Market Updates",
    "Get new Cape Verde listings, island updates and simple property market notes by email.",
  );

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewListings, setPreviewListings] = useState<ListingCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      arei.getFeaturedListings().catch(() => null),
      arei.getListings({ page: 1, pageSize: 24 }).catch(() => null),
    ])
      .then(([curated, listRes]) => {
        if (cancelled) return;
        const pool = new Map<string, ListingCard>();
        for (const listing of curated ?? []) pool.set(listing.id, listing);
        for (const listing of listRes?.data ?? []) pool.set(listing.id, listing);
        setPreviewListings(pickPreviewListings([...pool.values()], 10));
      })
      .catch(() => {
        if (!cancelled) setPreviewListings([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Campaign landing page for ad traffic — keep it out of the search index
  // (noindex), but follow links so it still passes equity to /listings, /market.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, follow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const attribution = captureAttribution();
      const [result] = await Promise.all([
        arei.subscribeNewsletter(trimmed),
        notifyFormspree({ email: trimmed, ...attribution }),
      ]);

      if (!result.ok) {
        setStatus("error");
        setErrorMsg("Could not subscribe. Try again later.");
        return;
      }

      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Could not subscribe. Try again later.");
    }
  };

  const hasListings = previewListings.length > 0;

  // Build the marquee track: repeat the listings into a fill-set wider than any
  // viewport, then lay that fill-set down twice. One animated track scrolls
  // translateX(-50%) — exactly one fill-set — so the loop is always seamless.
  const fillReps = hasListings
    ? Math.max(1, Math.ceil(MARQUEE_MIN_SET_W / (previewListings.length * MARQUEE_CARD_W)))
    : 0;
  const fillCards = hasListings
    ? Array.from({ length: fillReps }, () => previewListings).flat()
    : [];
  const trackCards = hasListings ? [...fillCards, ...fillCards] : [];

  return (
    <div className="mu-page">
      <main className="mu-main">
      <section className="mu-hero" aria-labelledby="market-updates-title">
        <div className="mu-hero-inner">
          {status === "success" ? (
            <div className="mu-success" role="status">
              <p className="mu-success-title">You’re subscribed.</p>
              <p className="mu-success-text">
                We’ll send Cape Verde property updates and market notes.
              </p>
              <div className="mu-actions" aria-label="Next steps">
                <Link className="mu-action-primary" to="/listings">See all listings</Link>
                <Link className="mu-action-secondary" to="/market">Explore market data</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mu-eyebrow">Market updates</p>
              <h1 id="market-updates-title">Find Cape Verde homes for sale in one place.</h1>
              <p className="mu-subcopy">
                Get new listings, island updates and simple market notes by email.
              </p>

              <form className="mu-form" onSubmit={handleSubmit} noValidate>
                <label className="mu-visually-hidden" htmlFor="market-updates-email">
                  Email address
                </label>
                <div className="mu-form-row">
                  <input
                    id="market-updates-email"
                    type="email"
                    required
                    placeholder="Email address"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={status === "submitting"}
                    autoComplete="email"
                  />
                  <button type="submit" disabled={status === "submitting"}>
                    {status === "submitting" ? "Sending…" : "Get updates"}
                  </button>
                </div>
                {status === "error" && <p className="mu-error">{errorMsg}</p>}
                <p className="mu-microcopy">Free. Unsubscribe anytime.</p>
                <p className="mu-disclosure">
                  Cape Verde Real Estate Index is not a broker. We collect public listings from local
                  agencies, portals and property websites so buyers can understand the market more easily.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="mu-showcase" aria-label="A sample of homes on the index">
        <div className={`mu-marquee${hasListings ? "" : " mu-marquee--static"}`}>
          <div
            className="mu-marquee-track"
            style={hasListings ? { animationDuration: `${fillCards.length * 3}s` } : undefined}
          >
            {hasListings
              ? trackCards.map((listing, i) => (
                  <Card key={i} l={listing} bare sourceOnly />
                ))
              : [0, 1, 2, 3, 4].map((i) => <ProofSkeleton key={i} />)}
          </div>
        </div>
      </section>

      <section className="mu-how" aria-label="How it works">
        <div className="mu-how-inner">
          <h2 className="mu-how-eyebrow">How it works</h2>
          <div className="mu-how-grid">
            <div className="mu-step">
              <span className="mu-step-n" aria-hidden="true">01</span>
              <h3>We collect public listings</h3>
              <p>From local agencies, portals and property sites across the islands.</p>
            </div>
            <div className="mu-step">
              <span className="mu-step-n" aria-hidden="true">02</span>
              <h3>We track them by island</h3>
              <p>Indexed so Sal, Boa Vista, Santiago and São Vicente are easy to compare.</p>
            </div>
            <div className="mu-step">
              <span className="mu-step-n" aria-hidden="true">03</span>
              <h3>You get updates by email</h3>
              <p>New listings and simple market notes — free, unsubscribe anytime.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mu-faq" aria-label="Common buyer questions">
        <div className="mu-faq-inner">
          <h2 className="mu-faq-eyebrow">Common buyer questions</h2>
          <div className="mu-faq-list">
            {FAQ_COLUMNS.map((column, ci) => (
              <div className="mu-faq-col" key={ci}>
                {column.map((entry) => (
                  <details className="mu-faq-item" key={entry.question}>
                    <summary>{entry.question}</summary>
                    <p>{entry.answer}</p>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>

      <footer className="mu-footer">
        <div className="mu-footer-inner">
          <div className="mu-lockup mu-footer-lockup" role="img" aria-label="Cape Verde Real Estate Index">
            <DLayersMark size={28} />
            <span className="mu-lk-wide" aria-hidden="true">
              <strong>Cape Verde</strong>
              <span className="mu-lk-desc">Real Estate Index</span>
            </span>
            <span className="mu-lk-stack" aria-hidden="true">
              <span>Cape Verde</span>
              <span>Real Estate</span>
              <span>Index</span>
            </span>
          </div>
          <p className="mu-footer-copy">
            © 2026 ·{" "}
            <a
              className="mu-footer-poweredby"
              href="https://www.africarealestateindex.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Powered by Africa Real Estate Index ↗
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
