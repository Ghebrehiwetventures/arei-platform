import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import "./About.css";

const SECTIONS = [
  {
    title: "What KazaVerde Is",
    body: "KazaVerde is a read-only property index for Cape Verde. We collect publicly accessible listing data from tracked source pages, normalize it into a consistent format, and present it in a searchable interface. Every listing links back to its original source page. KazaVerde is not a broker, marketplace, or transaction platform.",
  },
  {
    title: "Where the Data Comes From",
    body: null,
    list: [
      "Local real estate agency websites",
      "Developer and resort sales pages",
      "Other publicly accessible source pages that meet our trust and normalization requirements",
    ],
    note: "We do not disclose individual source domains to protect the integrity of our crawling infrastructure. Each listing identifies its source by name and links to the original page. Broader portals may help us discover sources, but they are not treated as automatic truth sources for the public index.",
  },
  {
    title: "Update Cadence",
    body: 'Tracked sources are rechecked regularly. Cadence varies by source, crawl success, and launch priorities. The "Last checked" date on each listing reflects the most recent successful verification of that public record.',
  },
  {
    title: "Deduplication and Normalization",
    body: "Where duplicate public listings are detected, KazaVerde keeps one current public record rather than showing every duplicate variant. Normalization may include currency conversion for display, standardizing size units, mapping location data to canonical island and city names where reliable, and extracting structured specifications when the source supports it. Missing fields stay missing rather than being guessed.",
  },
];

const QUALITY_NOTES = [
  { name: "Price on request", desc: "A listing can remain in the public index even when the source does not expose a numeric price clearly enough for reliable extraction." },
  { name: "Partial location", desc: "Some listings support island-level location confidently, but not a specific city or area. KazaVerde does not fill in missing location detail by guesswork." },
  { name: "Source-first links", desc: "If you want to verify the latest public version of a listing, use the source link on the detail page. KazaVerde is a read-only index, not the original publisher." },
];

export default function About() {
  useDocumentMeta("About", "How KazaVerde works. Data sources, update cadence, deduplication, and transparency.");

  return (
    <>
      <section className="ah anim-fu delay-1">
        <div className="ov">About KazaVerde</div>
        <h1>How the <em>index</em> works</h1>
        <p>
          Where the data comes from, what we do with it, and why transparency matters
          more than volume.
        </p>
      </section>

      {SECTIONS.map((sec, i) => (
        <div className="mi-section anim-fu" style={{ animationDelay: `${0.15 + i * 0.05}s` }} key={sec.title}>
          <h3>{sec.title}</h3>
          {sec.body && <p className="about-body">{sec.body}</p>}
          {sec.list && (
            <ul className="about-list">
              {sec.list.map((item) => (
                <li key={item}>
                  <span className="dot" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {sec.note && <p className="about-note">{sec.note}</p>}
        </div>
      ))}

      {/* Quality notes */}
      <div className="mi-section anim-fu delay-35">
        <h3>How We Handle Incomplete Data</h3>
        <div className="sub">Neutral fallbacks are better than fake certainty.</div>
        <div className="badge-grid">
          {QUALITY_NOTES.map((b) => (
            <div className="badge-card" key={b.name}>
              <div className="badge-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <strong>{b.name}</strong>
              </div>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coverage */}
      <div className="mi-section anim-fu delay-4" style={{ borderColor: "var(--bd2)" }}>
        <h3>Coverage Statement</h3>
        <p className="about-body">
          <strong>KazaVerde does not claim full market coverage.</strong> Our index represents
          a meaningful sample of publicly advertised properties, but off-market deals, private
          sales, and listings on sources we do not currently track are not included.
        </p>
        <div className="coverage-box">
          <div className="coverage-label">Current Coverage</div>
          <div className="coverage-value">
            Inventory and island coverage are shown on the Listings and Market pages, based on
            the current launch feed contract.
          </div>
          <div className="coverage-note">
            We avoid static coverage numbers here to prevent stale reporting.
          </div>
        </div>
      </div>

      <NewsletterCta />
    </>
  );
}
