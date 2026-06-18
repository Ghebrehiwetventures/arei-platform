import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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
    "Get new Cape Verde listings, island updates and simple property market notes by email.",
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
            <DLayersMark size={36} />
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
              <div className="mu-copy">
                <p className="mu-eyebrow">Market updates</p>
                <h1 id="market-updates-title">Find Cape Verde homes for sale in one place.</h1>
                <p className="mu-subcopy">
                  Get new listings, island updates and simple market notes by email.
                </p>
              </div>

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
                <p className="mu-disclosure">
                  Cape Verde Real Estate Index is not a broker. We collect public listings from local
                  agencies, portals and property websites so buyers can understand the market more easily.
                </p>
              </form>
            </>
          )}

          <section className="mu-points" aria-label="What this is">
            <div className="mu-point">
              <h2>Browse homes</h2>
              <p>Listings from across Cape Verde.</p>
            </div>
            <div className="mu-point">
              <h2>Compare islands</h2>
              <p>Sal, Boa Vista, Santiago and São Vicente are different markets.</p>
            </div>
            <div className="mu-point">
              <h2>Get updates</h2>
              <p>New listings and market notes by email.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
