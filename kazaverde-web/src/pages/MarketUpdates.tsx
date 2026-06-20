import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ListingCard } from "arei-sdk";
import DLayersMark from "../components/DLayersMark";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { normalizeLanguage } from "../i18n";
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

// Page copy in the two languages we support. Kept local (not in the global
// i18n.ts) because it's specific to this one campaign page. i18next still owns
// the language *state* — the switch calls i18n.changeLanguage, which persists
// the choice and makes the destination routes (/listings, /market) render in
// the same language.
type Lang = "en" | "pt";
const COPY: Record<Lang, {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  headline: string;
  subcopy: string;
  emailLabel: string;
  submit: string;
  submitting: string;
  microcopy: string;
  disclosure: string;
  errorInvalid: string;
  errorGeneric: string;
  successTitle: string;
  successText: string;
  seeAllListings: string;
  exploreMarket: string;
  nextStepsLabel: string;
  howTitle: string;
  steps: { title: string; body: string }[];
  faqTitle: string;
  sampleLabel: string;
  privacy: string;
}> = {
  en: {
    metaTitle: "Cape Verde Property Market Updates",
    metaDescription:
      "Get new Cape Verde listings, island updates and simple property market notes by email.",
    eyebrow: "Market updates",
    headline: "Find Cape Verde homes for sale in one place.",
    subcopy: "Get new listings, island updates and simple market notes by email.",
    emailLabel: "Email address",
    submit: "Get updates",
    submitting: "Sending…",
    microcopy: "Free. Unsubscribe anytime.",
    disclosure:
      "Cape Verde Real Estate Index is not a broker. We collect public listings from local agencies, portals and property websites so buyers can understand the market more easily.",
    errorInvalid: "Please enter a valid email address.",
    errorGeneric: "Could not subscribe. Try again later.",
    successTitle: "You’re subscribed.",
    successText: "We’ll send Cape Verde property updates and market notes.",
    seeAllListings: "See all listings",
    exploreMarket: "Explore market data",
    nextStepsLabel: "Next steps",
    howTitle: "How it works",
    steps: [
      {
        title: "We collect public listings",
        body: "From local agencies, portals and property sites across the islands.",
      },
      {
        title: "We track them by island",
        body: "Indexed so Sal, Boa Vista, Santiago and São Vicente are easy to compare.",
      },
      {
        title: "You get updates by email",
        body: "New listings and simple market notes — free, unsubscribe anytime.",
      },
    ],
    faqTitle: "Common buyer questions",
    sampleLabel: "A sample of homes on the index",
    privacy: "Privacy",
  },
  pt: {
    metaTitle: "Atualizações do mercado imobiliário de Cabo Verde",
    metaDescription:
      "Receba novos anúncios, novidades das ilhas e notas simples sobre o mercado imobiliário de Cabo Verde por email.",
    eyebrow: "Atualizações do mercado",
    headline: "Encontre casas à venda em Cabo Verde num só lugar.",
    subcopy:
      "Receba novos anúncios, novidades das ilhas e notas simples sobre o mercado por email.",
    emailLabel: "Endereço de email",
    submit: "Receber atualizações",
    submitting: "A enviar…",
    microcopy: "Grátis. Cancele quando quiser.",
    disclosure:
      "O Cape Verde Real Estate Index não é uma agência imobiliária. Reunimos anúncios públicos de agências locais, portais e sites imobiliários para que os compradores compreendam melhor o mercado.",
    errorInvalid: "Introduza um endereço de email válido.",
    errorGeneric: "Não foi possível subscrever. Tente novamente mais tarde.",
    successTitle: "Subscrição confirmada.",
    successText:
      "Vamos enviar-lhe atualizações e notas sobre o mercado imobiliário de Cabo Verde.",
    seeAllListings: "Ver todos os anúncios",
    exploreMarket: "Explorar dados do mercado",
    nextStepsLabel: "Próximos passos",
    howTitle: "Como funciona",
    steps: [
      {
        title: "Reunimos anúncios públicos",
        body: "De agências locais, portais e sites imobiliários em todas as ilhas.",
      },
      {
        title: "Organizamos por ilha",
        body: "Indexados para comparar facilmente Sal, Boa Vista, Santiago e São Vicente.",
      },
      {
        title: "Recebe atualizações por email",
        body: "Novos anúncios e notas simples sobre o mercado — grátis, cancele quando quiser.",
      },
    ],
    faqTitle: "Common buyer questions",
    sampleLabel: "Uma amostra de casas no índice",
    privacy: "Privacidade",
  },
};

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

function captureAttribution(locale: Lang): { source: string; [key: string]: string } {
  const params = new URLSearchParams(window.location.search);
  const out: { source: string; [key: string]: string } = {
    source: "subscribe",
    locale,
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
  const { i18n } = useTranslation();
  const lang: Lang =
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) === "pt" ? "pt" : "en";
  const c = COPY[lang];

  useDocumentMeta(c.metaTitle, c.metaDescription);

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
      setErrorMsg(c.errorInvalid);
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const attribution = captureAttribution(lang);
      const [result] = await Promise.all([
        arei.subscribeNewsletter(trimmed, lang),
        notifyFormspree({ email: trimmed, ...attribution }),
      ]);

      if (!result.ok) {
        setStatus("error");
        setErrorMsg(c.errorGeneric);
        return;
      }

      setEmail("");
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setStatus("error");
      setErrorMsg(c.errorGeneric);
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
          <div className="mu-topbar">
            <div className="mu-lang" role="group" aria-label={lang === "pt" ? "Idioma" : "Language"}>
              <button
                type="button"
                className={`mu-lang-btn${lang === "en" ? " is-active" : ""}`}
                aria-pressed={lang === "en"}
                onClick={() => i18n.changeLanguage("en")}
              >
                EN
              </button>
              <span className="mu-lang-sep" aria-hidden="true">·</span>
              <button
                type="button"
                className={`mu-lang-btn${lang === "pt" ? " is-active" : ""}`}
                aria-pressed={lang === "pt"}
                onClick={() => i18n.changeLanguage("pt")}
              >
                PT
              </button>
            </div>
          </div>

          {status === "success" ? (
            <div className="mu-success" role="status">
              <p className="mu-success-title">{c.successTitle}</p>
              <p className="mu-success-text">{c.successText}</p>
              <div className="mu-actions" aria-label={c.nextStepsLabel}>
                <Link className="mu-action-primary" to="/listings">{c.seeAllListings}</Link>
                <Link className="mu-action-secondary" to="/market">{c.exploreMarket}</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mu-eyebrow">{c.eyebrow}</p>
              <h1 id="market-updates-title">{c.headline}</h1>
              <p className="mu-subcopy">{c.subcopy}</p>

              <form className="mu-form" onSubmit={handleSubmit} noValidate>
                <label className="mu-visually-hidden" htmlFor="market-updates-email">
                  {c.emailLabel}
                </label>
                <div className="mu-form-row">
                  <input
                    id="market-updates-email"
                    type="email"
                    required
                    placeholder={c.emailLabel}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={status === "submitting"}
                    autoComplete="email"
                  />
                  <button type="submit" disabled={status === "submitting"}>
                    {status === "submitting" ? c.submitting : c.submit}
                  </button>
                </div>
                {status === "error" && <p className="mu-error">{errorMsg}</p>}
                <p className="mu-microcopy">{c.microcopy}</p>
                <p className="mu-disclosure">{c.disclosure}</p>
              </form>
            </>
          )}
        </div>
      </section>

      <section className="mu-showcase" aria-label={c.sampleLabel}>
        <div className={`mu-marquee${hasListings ? "" : " mu-marquee--static"}`}>
          <div
            className="mu-marquee-track"
            style={hasListings ? { animationDuration: `${fillCards.length * 4.5}s` } : undefined}
          >
            {hasListings
              ? trackCards.map((listing, i) => (
                  <Card key={i} l={listing} bare sourceOnly noLink />
                ))
              : [0, 1, 2, 3, 4].map((i) => <ProofSkeleton key={i} />)}
          </div>
        </div>
      </section>

      <section className="mu-how" aria-label={c.howTitle}>
        <div className="mu-how-inner">
          <h2 className="mu-how-eyebrow">{c.howTitle}</h2>
          <div className="mu-how-grid">
            {c.steps.map((step, i) => (
              <div className="mu-step" key={i}>
                <span className="mu-step-n" aria-hidden="true">{`0${i + 1}`}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ is English-only (legal/tax content we don't machine-translate),
          so it shows only in English. */}
      {lang === "en" && (
        <section className="mu-faq" aria-label={c.faqTitle}>
          <div className="mu-faq-inner">
            <h2 className="mu-faq-eyebrow">{c.faqTitle}</h2>
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
      )}
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
            <Link className="mu-footer-link" to="/privacy">{c.privacy}</Link>
            <span className="mu-footer-dot" aria-hidden="true"> · </span>
            <span className="mu-footer-legal">
              © 2026 ·{" "}
              <a
                className="mu-footer-poweredby"
                href="https://www.africarealestateindex.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Powered by Africa Real Estate Index{" ↗"}
              </a>
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
