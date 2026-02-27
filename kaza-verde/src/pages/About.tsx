import { useDocumentMeta } from "../hooks/useDocumentMeta";
import NewsletterCta from "../components/NewsletterCta";
import { MARKET_STATS, ISLANDS } from "../lib/demo-data";
import "./About.css";

const SECTIONS = [
  {
    title: "What KazaVerde Is",
    body: "KazaVerde is a property listing index for Cape Verde. We aggregate publicly available property listings from multiple sources, normalize them into a consistent format, and present them in a single searchable interface. Every listing links directly to its original source — we are a read-only index, not a broker or marketplace.",
  },
  {
    title: "Where the Data Comes From",
    body: null,
    list: [
      "Local real estate agency websites",
      "International property portals with Cape Verde listings",
      "Developer and resort sales pages",
      "Classified listing sites with property sections",
    ],
    note: "We do not disclose individual source domains to protect the integrity of our crawling infrastructure. Each listing clearly identifies its source by name and links to the original page.",
  },
  {
    title: "Update Cadence",
    body: 'Our automated crawlers check each source at minimum once every 48 hours. Some high-volume sources are checked more frequently. The "Last checked" date on each listing reflects the most recent successful verification.',
  },
  {
    title: "Deduplication and Normalization",
    body: "Properties that appear on multiple sources are deduplicated using a combination of address matching, price matching, image fingerprinting, and specification comparison. Normalization includes: converting all prices to euros (€), standardizing size to square meters (m²), mapping location data to island and city, and extracting structured specifications from unstructured listing descriptions.",
  },
];

const BADGES = [
  { name: "Verified Price", desc: "The listing had a clearly extractable numeric price. Listings where the price could not be extracted are marked 'Price on request'." },
  { name: "Verified Specs", desc: "Bedrooms, bathrooms, and/or size were present as structured data or could be reliably extracted from the listing description." },
  { name: "Verified Location", desc: "The island and city/area could be confirmed from the listing data. Some listings only specify the island without a specific city." },
];

export default function About() {
  useDocumentMeta("About", "How KazaVerde works. Data sources, update cadence, deduplication, and transparency.");
  const coveredIslands = ISLANDS.filter((i) => i.count > 0).map((i) => i.name);

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

      {/* Badges */}
      <div className="mi-section anim-fu delay-35">
        <h3>Verified Badges Explained</h3>
        <div className="sub">Badges reflect data quality, not property quality.</div>
        <div className="badge-grid">
          {BADGES.map((b) => (
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
          sales, and listings on sources we don't yet track are not included.
        </p>
        <div className="coverage-box">
          <div className="coverage-label">Current Coverage</div>
          <div className="coverage-value">
            {MARKET_STATS.totalInventory} listings across {MARKET_STATS.sources} sources on{" "}
            {coveredIslands.length} islands:{" "}
            <span className="coverage-islands">{coveredIslands.join(", ")}</span>
          </div>
          <div className="coverage-note">
            These numbers reflect current index state and update automatically as sources are crawled.
          </div>
        </div>
      </div>

      <NewsletterCta />
    </>
  );
}
