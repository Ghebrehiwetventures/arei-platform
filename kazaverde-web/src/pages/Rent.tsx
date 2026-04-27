import { useState, type FormEvent } from "react";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { arei } from "../lib/arei";
import { notifyFormspree } from "../lib/formspree";
import "./Rent.css";

/* /rent — two-sided marketplace waitlist.
   The eventual platform supports both renting and listing out. We
   open the waitlist now (pre-launch) so we can build trust first
   and onboard once supply + tooling are ready.
   ──────────────────────────────────────────────────────────────
   The hero offers two paths:
     - "Looking to rent" — tenants signal demand
     - "Have a property to list" — landlords/owners signal supply
   Both submit through subscribeNewsletter for now. Source-tag
   segmentation needs an SDK extension; until then we re-segment
   at launch by emailing each cohort separately. The UI clearly
   communicates which side the signup belongs to, and the chosen
   intent is shown in the success state. */

type Intent = "rent" | "list";

const INTENT_COPY: Record<Intent, {
  heading: string;
  sub: string;
  placeholder: string;
  cta: string;
  successHead: string;
  successSub: string;
}> = {
  rent: {
    heading: "Looking to rent in Cape Verde?",
    sub: "Tell us where you're heading and what kind of stay you have in mind. We'll let you know the day matching listings open.",
    placeholder: "you@example.com",
    cta: "Join renter waitlist",
    successHead: "You're on the renter waitlist.",
    successSub: "We'll email <b>{email}</b> the day rentals open. No spam in between.",
  },
  list: {
    heading: "Have a property to rent out?",
    sub: "Owners and managers can register interest now. We're onboarding supply ahead of launch — early sources help us shape pricing tools and the contract layer.",
    placeholder: "you@example.com",
    cta: "Register property interest",
    successHead: "You're on the owner waitlist.",
    successSub: "We'll reach <b>{email}</b> with onboarding details ahead of launch.",
  },
};

export default function Rent() {
  useDocumentMeta(
    "Rent · List your property — KazaVerde",
    "A two-sided rentals marketplace for Cape Verde — coming soon. Join the waitlist as a renter or as an owner.",
  );

  const [intent, setIntent] = useState<Intent>("rent");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedAs, setSubmittedAs] = useState<Intent | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  const handleIntent = (next: Intent) => {
    if (next === intent) return;
    setIntent(next);
    setStatus("idle");
    setErrorMsg("");
  };

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
        notifyFormspree({ email: trimmed, source: `rent-${intent}` }),
      ]);
      if (supaResult.ok) {
        setSubmittedAs(intent);
        setSubmittedEmail(trimmed);
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMsg("Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const renterPromises = [
    "Long-stay leases, monthly stays, and seasonal rentals — all in one index.",
    "Source-attributed listings with clear contract terms before you commit.",
    "Median rent benchmarks by island and segment so you can spot fair pricing.",
    "Direct messaging with owners — no middlemen taking cuts.",
  ];

  const ownerPromises = [
    "Reach renters who arrive ready to sign — pre-screened intent, not just clicks.",
    "Pricing benchmarks per island and segment so you can list at the market.",
    "Contracts and payment rails handled inside the platform at launch.",
    "Optional management add-on for absentee owners — vetted local partners.",
  ];

  const promises = intent === "rent" ? renterPromises : ownerPromises;
  const copy = INTENT_COPY[intent];

  return (
    <div className="kv-rent">
      <header className="kv-rent-head">
        <div className="kv-rent-head-inner">
          <div className="kv-rent-eyebrow">Rentals platform · Coming soon</div>
          <h1 className="kv-rent-title">
            A rentals marketplace for Cape&nbsp;Verde — for renters and owners alike.
          </h1>
          <p className="kv-rent-lede">
            We're building a two-sided platform that connects people looking to
            rent with owners who have property to list. We open it once the
            supply, contract, and trust layers are ready. Register interest
            below — whichever side you're on.
          </p>

          <div className="kv-rent-form-block">
            {/* Intent picker — native select sized like a form field so
                the choice reads as the first input on the form. Mono,
                paper bg, chevron via background-image. Heading + sub
                update on change so the user sees confirmation of which
                cohort they're joining. */}
            <label className="kv-rent-intent-field">
              <span className="kv-rent-intent-field-lbl">I'm a</span>
              <select
                className="kv-rent-intent-select"
                value={intent}
                onChange={(e) => handleIntent(e.target.value as Intent)}
                aria-label="Waitlist intent"
              >
                <option value="rent">Renter — looking for a place</option>
                <option value="list">Owner — have a property to list</option>
              </select>
            </label>
            <h2 className="kv-rent-form-head">{copy.heading}</h2>
            <p className="kv-rent-form-sub">{copy.sub}</p>

            {status === "success" && submittedAs ? (
              <div className="kv-rent-form-success">
                <span className="kv-rent-form-success-icon" aria-hidden="true">✓</span>
                <div>
                  <div className="kv-rent-form-success-head">
                    {INTENT_COPY[submittedAs].successHead}
                  </div>
                  <div
                    className="kv-rent-form-success-sub"
                    dangerouslySetInnerHTML={{
                      __html: INTENT_COPY[submittedAs].successSub.replace(
                        "{email}",
                        submittedEmail,
                      ),
                    }}
                  />
                </div>
              </div>
            ) : (
              <form className="kv-rent-form" onSubmit={handleSubmit} noValidate>
                <input
                  type="email"
                  className="kv-rent-form-input"
                  placeholder={copy.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "submitting"}
                  aria-label="Your email"
                  required
                />
                <button
                  type="submit"
                  className="kv-rent-form-submit"
                  disabled={status === "submitting"}
                >
                  <span>{status === "submitting" ? "Joining…" : copy.cta}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            )}
            {status === "error" && (
              <div className="kv-rent-form-error">{errorMsg}</div>
            )}
            <div className="kv-rent-form-fine">
              One launch email per cohort. No spam, no marketing — unsubscribe in one click.
            </div>
          </div>

          <div className="kv-rent-meta">
            <span><b>Q3 2026</b> target launch</span>
            <span>Free to use</span>
          </div>
        </div>
      </header>

      <section className="kv-rent-body">
        <div className="kv-rent-body-inner">
          <div className="kv-rent-cols">
            <div className="kv-rent-col-head">
              <div className="kv-rent-col-eyebrow">
                {intent === "rent" ? "What we'll offer renters" : "What we'll offer owners"}
              </div>
              <h2 className="kv-rent-col-title">
                {intent === "rent"
                  ? "A clearer way to find a place to live."
                  : "A direct line to qualified renters."}
              </h2>
              <p className="kv-rent-col-sub">
                {intent === "rent"
                  ? "Today the rental market in Cape Verde lives in WhatsApp groups, Facebook Marketplace threads, and a handful of fragmented listing sites. We're pulling supply, contracts, and benchmarks into one source-attributed view."
                  : "Most Cape Verde owners advertise across three or four platforms with no shared standard. We're building a single channel with verified contract templates, transparent pricing, and pre-qualified renter demand."}
              </p>
            </div>

            <div className="kv-rent-promise">
              <div className="kv-rent-promise-head">
                {intent === "rent" ? "What you'll get on day one" : "What we're building for owners"}
              </div>
              <ul className="kv-rent-promise-list">
                {promises.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Closing band — the broader monthly index update, NOT a second
          rentals waitlist. The hero already captures rent/list intent;
          this is the same general newsletter shipped on every page so
          visitors who aren't ready to commit to either rentals cohort
          can still stay close to the sales index. */}
      <NewsletterCta
        overline="Monthly update"
        heading={<>One email a month. Everything that changed on the index.</>}
        description="New sales listings, median-price shifts, island activity, sources added. Separate from the rentals waitlist above — no overlap, unsubscribe in one click."
      />
    </div>
  );
}
