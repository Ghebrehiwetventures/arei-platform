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

function ListingPreviewSkeleton() {
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
    "Find Cape Verde homes for sale in one place and get simple property market updates before you buy.",
  );

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [previewListings, setPreviewListings] = useState<ListingCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      arei.getFeaturedListings().catch(() => null),
      arei.getListings({ page: 1, pageSize: 32 }).catch(() => null),
    ])
      .then(([curated, listRes]) => {
        if (cancelled) return;

        const pool = new Map<string, ListingCard>();
        for (const listing of curated ?? []) pool.set(listing.id, listing);
        for (const listing of listRes?.data ?? []) pool.set(listing.id, listing);

        setPreviewListings(pickPreviewListings([...pool.values()], 8));
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

  return (
    <main className="mu-page">
      <section className="mu-hero" aria-labelledby="market-updates-title">
        <div className="mu-inner">
          <div className="mu-lockup" aria-label="Cape Verde Real Estate Index">
            <DLayersMark size={42} />
            <span>
              <strong>Cape Verde</strong>
              <span>Real Estate Index</span>
            </span>
          </div>

          <div className="mu-copy">
            <p className="mu-eyebrow">Market updates</p>
            <h1 id="market-updates-title">Find Cape Verde homes for sale in one place.</h1>
            <p className="mu-subcopy">
              Browse properties from across the islands, see where each listing came from, and get simple updates before you buy.
            </p>
          </div>

          <div className="mu-card">
            {status === "success" ? (
              <div className="mu-success" role="status">
                <p>You’re subscribed. We’ll send Cape Verde property updates and market notes.</p>
                <div className="mu-next-actions" aria-label="Next steps">
                  <Link className="mu-next-primary" to="/listings">See all listings</Link>
                  <Link className="mu-next-secondary" to="/market">Read the latest market update</Link>
                </div>
              </div>
            ) : (
              <form className="mu-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor="market-updates-email">Email address</label>
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
                    {status === "submitting" ? "Subscribing..." : "Subscribe"}
                  </button>
                </div>
                {status === "error" && <p className="mu-error">{errorMsg}</p>}
              </form>
            )}
          </div>

          <section className="mu-listing-preview" aria-labelledby="market-updates-listings">
            <div className="mu-section-head">
              <div>
                <p className="mu-eyebrow">On the site</p>
                <h2 id="market-updates-listings">A live sample of homes tracked by the index.</h2>
              </div>
              <Link to="/listings">View all homes for sale</Link>
            </div>
            <div className="mu-listing-scroll" aria-label="Sample Cape Verde homes for sale">
              {previewListings.length > 0
                ? previewListings.map((listing) => <Card key={listing.id} l={listing} bare />)
                : [0, 1, 2, 3].map((i) => <ListingPreviewSkeleton key={i} />)}
            </div>
          </section>

          <section className="mu-benefits" aria-label="What you'll get">
            <h2>What you’ll get</h2>
            <div className="mu-benefit-grid">
              <div className="mu-benefit">
                <span>01</span>
                <h3>Homes to browse</h3>
                <p>Properties for sale across Cape Verde, gathered into one searchable place.</p>
              </div>
              <div className="mu-benefit">
                <span>02</span>
                <h3>Island context</h3>
                <p>Short notes on places, prices and what is changing in the market.</p>
              </div>
              <div className="mu-benefit">
                <span>03</span>
                <h3>Buyer reminders</h3>
                <p>Clear reminders that asking prices are not the same as sale prices.</p>
              </div>
            </div>
          </section>

          <p className="mu-why-now">
            Cape Verde is getting global attention. We help you see what is actually for sale and how the market is moving.
          </p>
          <p className="mu-disclosure">
            Cape Verde Real Estate Index is not a broker. We organize public, source-linked property information to make the market easier to understand.
          </p>
        </div>
      </section>
    </main>
  );
}
