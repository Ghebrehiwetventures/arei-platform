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

// Pick a few image-backed listings for the proof stack, preferring island
// variety so the sample reads as "across Cape Verde" rather than one town.
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
        setPreviewListings(pickPreviewListings([...pool.values()], 3));
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
        <div className="mu-hero-grid">
          <div className="mu-lead">
            <div className="mu-lockup" aria-label="Cape Verde Real Estate Index">
              <DLayersMark size={38} />
              <span>
                <strong>Cape Verde</strong>
                <span>Real Estate Index</span>
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

          <aside className="mu-proof" aria-label="A sample of homes on the index">
            <div className="mu-proof-stack">
              {previewListings.length > 0
                ? previewListings.map((listing) => <Card key={listing.id} l={listing} bare />)
                : [0, 1, 2].map((i) => <ProofSkeleton key={i} />)}
            </div>
          </aside>
        </div>
      </section>

      <section className="mu-benefits" aria-label="What you’ll get">
        <div className="mu-benefits-inner">
          <div className="mu-benefits-grid">
            <div className="mu-benefit">
              <span className="mu-benefit-mark" aria-hidden="true" />
              <h3>New listings</h3>
              <p>Properties for sale across Cape Verde, gathered into one searchable place.</p>
            </div>
            <div className="mu-benefit">
              <span className="mu-benefit-mark" aria-hidden="true" />
              <h3>Island context</h3>
              <p>Short notes on places, prices and what is changing in the market.</p>
            </div>
            <div className="mu-benefit">
              <span className="mu-benefit-mark" aria-hidden="true" />
              <h3>Buyer notes</h3>
              <p>Clear reminders that asking prices are not the same as sale prices.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
