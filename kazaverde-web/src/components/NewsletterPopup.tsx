import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { arei } from "../lib/arei";
import "./NewsletterPopup.css";

const DISMISSED_KEY = "kazaverde-newsletter-popup-dismissed-at";
const SUBSCRIBED_KEY = "kazaverde-newsletter-popup-subscribed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const SUBSCRIBE_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 18000;
const REQUIRED_INTERACTIONS = 2;

function readRecentTimestamp(key: string, maxAgeMs: number) {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(key);
  if (!raw) return false;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && Date.now() - parsed < maxAgeMs;
}

export default function NewsletterPopup() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  const [isSuppressed, setIsSuppressed] = useState(() => {
    return (
      readRecentTimestamp(DISMISSED_KEY, DISMISS_FOR_MS) ||
      readRecentTimestamp(SUBSCRIBED_KEY, SUBSCRIBE_FOR_MS)
    );
  });
  const [isVisible, setIsVisible] = useState(false);
  const [hasDelayElapsed, setHasDelayElapsed] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [hasScrolledEnough, setHasScrolledEnough] = useState(false);
  const [canDismissFromBackdrop, setCanDismissFromBackdrop] = useState(false);

  useEffect(() => {
    if (isSuppressed || isLanding) return undefined;

    const timer = window.setTimeout(() => {
      setHasDelayElapsed(true);
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [isLanding, isSuppressed]);

  useEffect(() => {
    if (isSuppressed || isLanding) return undefined;

    const countInteraction = () => {
      setInteractionCount((current) => Math.min(current + 1, REQUIRED_INTERACTIONS));
    };

    const handleScroll = () => {
      if (hasScrolledEnough) return;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 320) {
        setHasScrolledEnough(true);
        countInteraction();
      }
    };

    const handlePointerDown = () => countInteraction();
    const handleKeyDown = () => countInteraction();

    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasScrolledEnough, isLanding, isSuppressed]);

  useEffect(() => {
    if (isSuppressed || status === "success" || isLanding) return;
    setInteractionCount((current) => Math.min(current + 1, REQUIRED_INTERACTIONS));
  }, [isLanding, isSuppressed, pathname, status]);

  useEffect(() => {
    if (isSuppressed || isVisible || status === "success" || isLanding) return;
    if (!hasDelayElapsed || interactionCount < REQUIRED_INTERACTIONS) return;
    setIsVisible(true);
  }, [hasDelayElapsed, interactionCount, isLanding, isSuppressed, isVisible, status]);

  useEffect(() => {
    if (!isVisible) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setCanDismissFromBackdrop(false);

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissPopup();
      }
    };

    const dismissGuardTimer = window.setTimeout(() => {
      setCanDismissFromBackdrop(true);
    }, 350);

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      window.clearTimeout(dismissGuardTimer);
    };
  }, [isVisible]);

  useEffect(() => {
    if (status !== "success") return undefined;

    const timer = window.setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [status]);

  const dismissPopup = () => {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setIsSuppressed(true);
    setIsVisible(false);
  };

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
      const result = await arei.subscribeNewsletter(trimmed);
      if (result.ok) {
        window.localStorage.setItem(SUBSCRIBED_KEY, String(Date.now()));
        setIsSuppressed(true);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  if (isLanding || !isVisible) return null;

  return (
    <div className="nl-popup-root" role="dialog" aria-modal="true" aria-labelledby="nl-popup-title">
      <button
        className="nl-popup-backdrop"
        type="button"
        aria-label="Close newsletter popup"
        onClick={() => {
          if (canDismissFromBackdrop) dismissPopup();
        }}
      />
      <div className="nl-popup-card anim-fu">
        <button className="nl-popup-close" type="button" aria-label="Close popup" onClick={dismissPopup}>
          <span aria-hidden="true">+</span>
        </button>

        <div className="nl-popup-overline">Monthly Property Index</div>
        <h2 id="nl-popup-title">
          Cape Verde <em>market intelligence</em>
        </h2>
        <p className="nl-popup-description">
          Receive monthly pricing signals, new development alerts, and key regulatory updates across Cape Verde.
        </p>

        {status === "success" ? (
          <div className="nl-popup-success">
            <strong>You're in.</strong> The next market update will arrive by email.
          </div>
        ) : (
          <form className="nl-popup-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="nl-popup-input"
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={status === "submitting"}
            />
            <button type="submit" className="nl-popup-submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Sending..." : "Get the index"}
            </button>
          </form>
        )}

        {status === "error" && <div className="nl-popup-error">{errorMsg}</div>}

        <div className="nl-popup-trust">
          Free monthly update. Unsubscribe anytime. No spam, just market data.
        </div>
      </div>
    </div>
  );
}
