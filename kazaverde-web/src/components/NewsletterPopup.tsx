import { useState, useEffect, type FormEvent } from "react";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./NewsletterPopup.css";

const STORAGE_KEY = "kv_nl_popup";

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setVisible(true), 8000);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable — skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      // silent
    }
    setVisible(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const [supaResult] = await Promise.all([
        arei.subscribeNewsletter(trimmed),
        notifyFormspree({ email: trimmed, source: "newsletter-popup" }),
      ]);
      if (supaResult.ok) {
        setStatus("success");
        try {
          localStorage.setItem(STORAGE_KEY, "subscribed");
        } catch {
          // silent
        }
        setTimeout(() => setVisible(false), 2800);
      } else {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (!visible) return null;

  return (
    <div className="nlp-overlay" role="dialog" aria-modal="true" aria-label="Newsletter signup" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="nlp-card">
        <button className="nlp-close" onClick={dismiss} aria-label="Close" type="button">
          ×
        </button>
        <div className="nlp-overline">Market Brief</div>
        <h2 className="nlp-heading">Stay ahead of Cape Verde's property market.</h2>
        <p className="nlp-desc">
          Monthly updates on listings data, price shifts, island activity, and market news — delivered to your inbox.
        </p>
        {status === "success" ? (
          <div className="nlp-success">You're subscribed!</div>
        ) : (
          <form className="nlp-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="nlp-input"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              aria-label="Your email"
              autoFocus
            />
            <button
              type="submit"
              className="nlp-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending…" : <>Subscribe <span aria-hidden="true">[→]</span></>}
            </button>
          </form>
        )}
        {status === "error" && <div className="nlp-error">{errorMsg}</div>}
        <div className="nlp-fine">No spam. Unsubscribe anytime.</div>
      </div>
    </div>
  );
}
