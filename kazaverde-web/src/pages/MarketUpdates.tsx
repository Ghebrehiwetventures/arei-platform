import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ListingCard } from "arei-sdk";
import DLayersMark from "../components/DLayersMark";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import { Card } from "./Listings";
import "./Listings.css";
import "./MarketUpdates.css";

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

  return (
    <main className="mu-page">
      <section className="mu-hero" aria-labelledby="market-updates-title">
        <div className="mu-hero-inner">
          <div className="mu-lockup" role="img" aria-label="Cape Verde Real Estate Index">
            <DLayersMark size={36} />
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
          <div className="mu-marquee-set">
            {hasListings
              ? previewListings.map((listing) => <Card key={listing.id} l={listing} bare />)
              : [0, 1, 2, 3, 4].map((i) => <ProofSkeleton key={i} />)}
          </div>
          {hasListings && (
            <div className="mu-marquee-set" aria-hidden="true">
              {previewListings.map((listing) => <Card key={`dup-${listing.id}`} l={listing} bare />)}
            </div>
          )}
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
    </main>
  );
}
