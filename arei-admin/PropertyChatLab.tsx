// Property Chat Lab — internal prototype for the future WhatsApp Property
// Assistant. Chat-style UI, deterministic parser+matcher, no LLM, no WhatsApp
// API. Loads Cape Verde listings from the same source as the rest of admin.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getListings } from "./data";
import type { Listing } from "./types";
import {
  respondToPropertyChat,
  type ChatState,
  type ChatTurn,
  type ListingMatch,
} from "./assistant";

const CV_MARKET_ID = "cv";
const LISTING_POOL_SIZE = 500;

const INITIAL_STATE: ChatState = {
  intent: { keywords: [] },
  lastMatches: [],
  turns: [
    {
      role: "assistant",
      text:
        "Tell me what kind of Cape Verde property you're looking for. I can suggest listings by island, city, budget, bedrooms, size, and keywords like sea view or beachfront.",
    },
  ],
};

const SUGGESTIONS: string[] = [
  "2 bedroom apartment in Sal under 200k",
  "cheap land in Santiago",
  "beachfront villa in Boa Vista under 500000",
  "apartment in Santa Maria with at least 80 sqm",
  "only sea view",
  "send me the links",
];

function formatPrice(n: number | null | undefined, currency?: string): string {
  if (n == null) return "Price on request";
  const cur = currency || "EUR";
  const sym = cur === "EUR" ? "€" : `${cur} `;
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}k`;
  return `${sym}${n}`;
}

const CONFIDENCE_LABEL: Record<ListingMatch["confidence"], { text: string; className: string }> = {
  strong: { text: "Strong match", className: "bg-green-muted text-green" },
  partial: { text: "Partial match", className: "bg-surface-2 text-foreground-muted" },
  possible: { text: "Possible match", className: "bg-surface-2 text-foreground-subtle" },
};

function ListingCard({ match }: { match: ListingMatch }) {
  const l = match.listing;
  const isLand = l.property_type?.toLowerCase().includes("land");
  const conf = CONFIDENCE_LABEL[match.confidence];
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-[12px] mt-2">
      <div className="flex gap-3">
        {l.images?.[0] ? (
          <img
            src={l.images[0]}
            alt=""
            aria-hidden="true"
            className="w-20 h-20 rounded object-cover flex-shrink-0 bg-surface-2"
          />
        ) : (
          <div className="w-20 h-20 rounded bg-surface-2 flex items-center justify-center text-foreground-subtle text-[10px]">
            No image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-foreground truncate flex-1">
              {l.title || `Listing ${l.id}`}
            </div>
            <span
              className={
                "text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap " +
                conf.className
              }
            >
              {conf.text}
            </span>
          </div>
          <div className="text-foreground-muted mt-0.5">
            {formatPrice(l.price, l.currency)}
            {l.area_sqm ? ` · ${l.area_sqm} sqm` : ""}
            {match.pricePerSqm != null ? ` · €${match.pricePerSqm}/sqm` : ""}
          </div>
          <div className="text-foreground-muted">
            {[l.city, l.island].filter(Boolean).join(", ") || "—"}
            {l.property_type ? ` · ${l.property_type}` : ""}
            {l.bedrooms != null && !isLand ? ` · ${l.bedrooms} bed` : ""}
          </div>
          <div className="text-foreground-subtle mt-0.5 truncate">
            Source: {l.sourceName}
          </div>
          {match.reasons.length > 0 && (
            <div className="text-foreground-subtle mt-1 italic truncate">
              Match: {match.reasons.join(" · ")}
            </div>
          )}
          {match.unknownFields.length > 0 && (
            <div className="text-foreground-subtle mt-0.5 text-[11px]">
              Missing: {match.unknownFields.join(", ")}
            </div>
          )}
          {l.sourceUrl && (
            <a
              href={l.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-foreground underline hover:no-underline mt-1 inline-block"
            >
              View source ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={
          "max-w-[80%] rounded-2xl px-3 py-2 text-[13px] " +
          (isUser
            ? "bg-foreground text-primary-foreground rounded-br-sm"
            : "bg-surface-2 text-foreground rounded-bl-sm")
        }
      >
        <div className="whitespace-pre-wrap">{turn.text}</div>
        {turn.matches && turn.matches.length > 0 && (
          <div className="mt-1">
            {turn.matches.map((m) => (
              <ListingCard key={m.listing.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IntentDebug({ state }: { state: ChatState }) {
  const i = state.intent;
  return (
    <details className="rounded-lg border border-border border-dashed bg-transparent p-3 text-[11px] text-foreground-subtle">
      <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-foreground-subtle">
        Debug · parsed intent
      </summary>
      <pre className="whitespace-pre-wrap font-mono leading-snug mt-2 text-foreground-muted">
        {JSON.stringify(i, null, 2)}
      </pre>
      <div className="mt-2 text-foreground-muted">
        Last matches: {state.lastMatches.length}
      </div>
    </details>
  );
}

export function PropertyChatLabView() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatState>(INITIAL_STATE);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getListings(
          CV_MARKET_ID,
          1,
          LISTING_POOL_SIZE,
          { approved: true },
          "id",
          "asc"
        );
        if (cancelled) return;
        if (res.data.length === 0) {
          // Fallback: try without the approved filter so the lab is usable
          // even on environments where approval flags aren't set yet.
          const all = await getListings(
            CV_MARKET_ID,
            1,
            LISTING_POOL_SIZE,
            {},
            "id",
            "asc"
          );
          if (cancelled) return;
          setListings(all.data);
        } else {
          setListings(res.data);
        }
      } catch (e) {
        if (!cancelled) setLoadError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [chat.turns.length]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const result = respondToPropertyChat({
      message: trimmed,
      state: chat,
      listings,
    });
    setChat(result.state);
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  const reset = () => setChat(INITIAL_STATE);

  const headerStatus = useMemo(() => {
    if (loading) return "Loading Cape Verde listings…";
    if (loadError) return `Error loading listings: ${loadError}`;
    return `${listings.length} listings loaded`;
  }, [loading, loadError, listings.length]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[18px] font-semibold text-foreground tracking-tight">
          Property Chat Lab
        </h1>
        <div className="text-[12px] text-foreground-muted mt-1 max-w-[680px]">
          Internal simulation of a future WhatsApp-style property assistant for
          KazaVerde. It uses our existing Cape Verde listings and answers in a
          chat thread. This is a rule-based V0 — it is <em>not</em> connected
          to WhatsApp yet and does not call an LLM.
        </div>
        <div className="text-[11px] text-foreground-subtle mt-1.5 flex items-center gap-2">
          <span
            className={
              "inline-block w-1.5 h-1.5 rounded-full " +
              (loading
                ? "bg-foreground-subtle"
                : loadError
                ? "bg-red-500"
                : "bg-green")
            }
          />
          <span>{headerStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="flex flex-col h-[70vh] rounded-lg border border-border bg-background">
          <div
            ref={threadRef}
            className="flex-1 overflow-y-auto p-4"
          >
            {chat.turns.map((t, i) => (
              <MessageBubble key={i} turn={t} />
            ))}
          </div>
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
            <span className="text-[10px] uppercase tracking-wider text-foreground-subtle self-center mr-1">
              Try
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-[11px] px-2 py-1 rounded-full border border-border text-foreground-muted hover:bg-surface-2 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-3 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              placeholder={
                loading ? "Loading listings…" : "Message the property assistant"
              }
              className="flex-1 bg-surface rounded-full px-4 py-2 text-[13px] outline-none border border-border focus:border-foreground-muted"
            />
            <button
              onClick={() => send(draft)}
              disabled={loading || !draft.trim()}
              className="px-3 py-2 text-[12px] font-medium rounded-full bg-foreground text-primary-foreground disabled:opacity-50"
            >
              Send
            </button>
            <button
              onClick={reset}
              className="px-3 py-2 text-[12px] font-medium rounded-full border border-border text-foreground-muted hover:bg-surface-2"
              title="Reset conversation"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <IntentDebug state={chat} />
        </div>
      </div>
    </div>
  );
}
