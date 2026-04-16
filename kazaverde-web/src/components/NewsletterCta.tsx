import { useState, type FormEvent } from "react";
import { arei } from "../lib/arei";
import "./NewsletterCta.css";

interface Props {
  overline?: string;
  heading?: React.ReactNode;
  description?: string;
}

export default function NewsletterCta({
  overline = "Monthly Property Index",
  heading = <>Cape Verde <em>market intelligence</em></>,
  description = "Median prices by island, inventory trends, new development alerts, and regulatory changes.",
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
      const result = await arei.subscribeNewsletter(trimmed);
      if (result.ok) {
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
      <div className="nl-overline">{overline}</div>
      <h2>{heading}</h2>
      <p>{description}</p>
      {status === "success" ? (
        <div className="nl-success">You're subscribed! We'll be in touch.</div>
      ) : (
        <form className="nl-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="nl-input"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "submitting"}
          />
          <button
            type="submit"
            className="nl-submit"
            disabled={status === "submitting"}
          >
            {status === "submitting" ? "SENDING..." : "SUBSCRIBE"}
          </button>
        </form>
      )}
      {status === "error" && <div className="nl-error">{errorMsg}</div>}
      <div className="nl-fine">Free. Unsubscribe anytime. No spam, just data.</div>
    </div>
  );
}
