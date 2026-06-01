// Marketing-consent state for the Cape Verde Real Estate Index.
//
// The site is cookieless by default (Vercel Web Analytics). The only thing that
// requires consent is the Meta Pixel, which sets Meta cookies and shares
// page-visit events with Meta. Nothing marketing-related loads until the user
// explicitly opts in via the cookie banner.
//
// Storage keys:
//   kv_consent      — "granted" | "denied"; the marketing decision (this module)
//   kv_cookie_ack   — legacy acknowledgement flag, kept so older visitors who
//                     only ever saw the ack banner aren't re-counted as acked
//                     without a real marketing decision.

const CONSENT_KEY = "kv_consent";
const LEGACY_ACK_KEY = "kv_cookie_ack";

export type Consent = "granted" | "denied" | "unset";

const listeners = new Set<(c: Consent) => void>();

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {
    // localStorage unavailable — treat as undecided
  }
  return "unset";
}

export function hasMarketingConsent(): boolean {
  return getConsent() === "granted";
}

export function setConsent(granted: boolean): void {
  const next: Consent = granted ? "granted" : "denied";
  try {
    localStorage.setItem(CONSENT_KEY, next);
    // Keep the legacy flag in sync so nothing re-prompts on the old key path.
    localStorage.setItem(LEGACY_ACK_KEY, "1");
  } catch {
    // silent — still notify in-memory listeners so the session reflects it
  }
  listeners.forEach((fn) => fn(next));
}

export function onConsentChange(fn: (c: Consent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
