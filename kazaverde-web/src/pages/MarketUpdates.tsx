import { useState, type FormEvent } from "react";
import DLayersMark from "../components/DLayersMark";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./MarketUpdates.css";

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
    "Subscribe for source-linked listings, island notes and property market signals from Cape Verde Real Estate Index.",
  );

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
            <h1 id="market-updates-title">Get Cape Verde property market updates.</h1>
            <p className="mu-subcopy">
              Source-linked listings, island notes and property market signals from Cape Verde Real Estate Index.
            </p>
          </div>

          <div className="mu-card">
            {status === "success" ? (
              <div className="mu-success" role="status">
                You’re subscribed. We’ll send Cape Verde property updates and market notes.
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
            <p className="mu-disclosure">
              CVREI is not a broker. We organize public, source-linked property information to make the market easier to understand.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
