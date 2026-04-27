import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import "./Market.css";
import "./Policy.css";

const SECTIONS: {
  eyebrow: string;
  heading: string;
  body?: string;
  list?: string[];
  note?: string;
}[] = [
  {
    eyebrow: "What it is",
    heading: "A read-only Cape Verde property index.",
    body: "KazaVerde collects publicly accessible listing data from tracked source pages, normalises it into a consistent format, and presents it in a searchable interface. Every listing links back to its original source page. KazaVerde is not a broker, marketplace, or transaction platform.",
  },
  {
    eyebrow: "Where the data comes from",
    heading: "Source pages, named but not enumerated.",
    list: [
      "Local real estate agency websites",
      "Developer and resort sales pages",
      "Other publicly accessible source pages that meet our trust and normalisation requirements",
    ],
    note: "We do not disclose individual source domains to protect the integrity of our crawling infrastructure. Each listing identifies its source by name and links to the original page. Broader portals may help us discover sources, but they are not treated as automatic truth sources for the public index.",
  },
  {
    eyebrow: "Update cadence",
    heading: "Regular rechecks, source-by-source.",
    body: 'Tracked sources are rechecked regularly. Cadence varies by source, crawl success, and launch priorities. The "Last checked" date on each listing reflects the most recent successful verification of that public record.',
  },
  {
    eyebrow: "Deduplication & normalisation",
    heading: "One current public record, never guessed fields.",
    body: "Where duplicate public listings are detected, KazaVerde keeps one current public record rather than showing every duplicate variant. Normalisation may include currency conversion for display, standardising size units, mapping location data to canonical island and city names where reliable, and extracting structured specifications when the source supports it. Missing fields stay missing rather than being guessed.",
  },
];

const QUALITY_NOTES = [
  {
    name: "Price on request",
    desc: "A listing can remain in the public index even when the source does not expose a numeric price clearly enough for reliable extraction.",
  },
  {
    name: "Partial location",
    desc: "Some listings support island-level location confidently, but not a specific city or area. KazaVerde does not fill in missing location detail by guesswork.",
  },
  {
    name: "Source-first links",
    desc: "If you want to verify the latest public version of a listing, use the source link on the detail page. KazaVerde is a read-only index, not the original publisher.",
  },
];

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function About() {
  useDocumentMeta(
    "About — KazaVerde",
    "How KazaVerde works. Data sources, update cadence, deduplication, and transparency.",
  );

  return (
    <div className="kv-pol kv-m">
      <header className="kv-hero kv-hero-slim">
        <div className="kv-hero-inner">
          <div className="kv-hero-eyebrow">About KazaVerde</div>
          <h1>How the index works.</h1>
          <p className="kv-hero-sub">
            Where the data comes from, what we do with it, and why
            transparency matters more than volume.
          </p>
        </div>
      </header>

      {SECTIONS.map((sec) => (
        <section className="kv-m-section" key={sec.eyebrow}>
          <div className="kv-m-inner">
            <div className="kv-m-section-head">
              <span className="kv-l-eyebrow">{sec.eyebrow}</span>
              <h2>{sec.heading}</h2>
            </div>
            {sec.body && <p className="kv-pol-prose">{sec.body}</p>}
            {sec.list && (
              <ul className="kv-pol-list">
                {sec.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {sec.note && <div className="kv-pol-pull">{sec.note}</div>}
          </div>
        </section>
      ))}

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Handling incomplete data</span>
            <h2>Neutral fallbacks beat fake certainty.</h2>
          </div>
          <div className="kv-pol-cards">
            {QUALITY_NOTES.map((q) => (
              <div className="kv-pol-card" key={q.name}>
                <div className="kv-pol-card-head">
                  <CheckIcon />
                  {q.name}
                </div>
                <p>{q.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="kv-m-section">
        <div className="kv-m-inner">
          <div className="kv-m-section-head">
            <span className="kv-l-eyebrow">Coverage statement</span>
            <h2>We don't claim full market coverage.</h2>
          </div>
          <div className="kv-pol-pull">
            <strong>KazaVerde does not claim full market coverage.</strong>{" "}
            Our index represents a meaningful sample of publicly advertised
            properties, but off-market deals, private sales, and listings on
            sources we do not currently track are not included.
          </div>
          <div className="kv-pol-coverage">
            <div className="kv-pol-coverage-k">Current coverage</div>
            <div className="kv-pol-coverage-v">
              Inventory and island coverage are shown on the Listings and
              Market pages, based on the current launch feed contract.
            </div>
            <div className="kv-pol-coverage-note">
              We avoid static coverage numbers here to prevent stale
              reporting.
            </div>
          </div>
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
