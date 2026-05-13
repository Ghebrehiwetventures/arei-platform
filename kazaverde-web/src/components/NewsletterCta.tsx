import { useState, type FormEvent } from "react";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./NewsletterCta.css";

interface Props {
  overline?: string;
  heading?: React.ReactNode;
  description?: string;
}

export default function NewsletterCta({
  overline = "Market Brief",
  heading = "Cape Verde property market updates, without the noise.",
  description = "Source-linked updates on listings data, price shifts, island activity, source coverage, and market news affecting Cape Verde's property market.",
}: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
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
        notifyFormspree({ email: trimmed, source: "newsletter" }),
      ]);
      if (supaResult.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="nl-cta anim-fu delay-4">
      <div className="nl-cta-inner">
        <div className="nl-overline">{overline}</div>
        <h2>{heading}</h2>
        <p>{description}</p>
        {status === "success" ? (
          <div className="nl-success">You're subscribed!</div>
        ) : (
          <form className="nl-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="nl-input"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "submitting"}
              aria-label="Your email"
            />
            <button
              type="submit"
              className="nl-submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending..." : <>Subscribe <span aria-hidden="true">[→]</span></>}
            </button>
          </form>
        )}
        {status === "error" && <div className="nl-error">{errorMsg}</div>}
        <div className="nl-fine">
          No spam. Unsubscribe anytime.
        </div>
      </div>
    </div>
  );
}
