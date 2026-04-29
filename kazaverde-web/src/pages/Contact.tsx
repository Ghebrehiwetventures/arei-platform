import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { notifyFormspree } from "../lib/formspree";
import NewsletterCta from "../components/NewsletterCta";
import "./Contact.css";

const VALID_TOPICS = new Set([
  "general",
  "listing",
  "source",
  "unsubscribe",
  "partnership",
  "press",
]);

export default function Contact() {
  const [searchParams] = useSearchParams();
  const initialTopic = (() => {
    const t = searchParams.get("topic");
    return t && VALID_TOPICS.has(t) ? t : "general";
  })();
  useDocumentMeta(
    "Contact — KazaVerde",
    "Get in touch with KazaVerde. Listing corrections, source attribution requests, partnerships — we read everything.",
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(initialTopic);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (trimmedMessage.length < 10) {
      setStatus("error");
      setErrorMsg("Please add a few more details so we can help.");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const result = await notifyFormspree({
        email: trimmedEmail,
        source: `contact-${topic}`,
        name: name.trim(),
        topic,
        message: trimmedMessage,
      });
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
    <div className="kv-contact">
      <header className="kv-contact-head">
        <div className="kv-contact-head-inner">
          <div className="kv-contact-eyebrow">Contact</div>
          <h1 className="kv-contact-title">Get in touch.</h1>
          <p className="kv-contact-lede">
            Listing corrections, source attribution requests, partnerships,
            press, or general questions — drop us a note. We read everything
            and reply within a few working days.
          </p>
        </div>
      </header>

      <section className="kv-contact-body">
        <div className="kv-contact-body-inner">
          {status === "success" ? (
            <div className="kv-contact-success">
              <div className="kv-contact-success-icon" aria-hidden="true">✓</div>
              <h2 className="kv-contact-success-head">Message received.</h2>
              <p className="kv-contact-success-sub">
                Thanks for reaching out. We'll reply to <b>{email}</b> within a
                few working days.
              </p>
            </div>
          ) : (
            <form className="kv-contact-form" onSubmit={handleSubmit} noValidate>
              <div className="kv-contact-row">
                <label className="kv-contact-field">
                  <span className="kv-contact-field-lbl">Name</span>
                  <input
                    type="text"
                    className="kv-contact-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name (optional)"
                  />
                </label>

                <label className="kv-contact-field">
                  <span className="kv-contact-field-lbl">Email</span>
                  <input
                    type="email"
                    className="kv-contact-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </label>
              </div>

              <label className="kv-contact-field">
                <span className="kv-contact-field-lbl">Topic</span>
                <select
                  className="kv-contact-select"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  <option value="general">General question</option>
                  <option value="listing">Listing correction or removal</option>
                  <option value="source">Source / agent attribution</option>
                  <option value="unsubscribe">Unsubscribe / data removal</option>
                  <option value="partnership">Partnership / business</option>
                  <option value="press">Press / media</option>
                </select>
              </label>

              <label className="kv-contact-field">
                <span className="kv-contact-field-lbl">Message</span>
                <textarea
                  className="kv-contact-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Tell us what you need…"
                  required
                />
              </label>

              <button
                type="submit"
                className="kv-contact-submit"
                disabled={status === "submitting"}
              >
                <span>{status === "submitting" ? "Sending…" : "Send message"}</span>
                <span aria-hidden="true">→</span>
              </button>

              {status === "error" && (
                <div className="kv-contact-error">{errorMsg}</div>
              )}

              <p className="kv-contact-fine">
                We'll only use your email to reply to this enquiry. No marketing,
                no sharing — see <a href="/privacy">Privacy</a> for the full policy.
              </p>
            </form>
          )}
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
