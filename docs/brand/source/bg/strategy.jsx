/* ══════════════════════════════════════════════════════════
   STRATEGY · VOICE · PILLARS · RECOMMENDATION · CHECKLIST
   The non-component sections of the guide.
   ══════════════════════════════════════════════════════════ */

function NumberedList({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr",
          gap: 20,
          padding: "20px 0",
          borderBottom: i === items.length - 1 ? "none" : "1px solid var(--kv-rule-soft)",
          alignItems: "baseline",
        }}>
          <span style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", color: "var(--kv-gray-500)" }}>0{i + 1}</span>
          <div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 16, fontWeight: 500, color: "var(--kv-black)", marginBottom: 6 }}>{it.title}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--kv-ink-700)" }}>{it.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Brand architecture diagram — master + sub-brands */
function BrandArchitecture({ which }) {
  return (
    <div className="bg-card" style={{ padding: 36, background: "var(--kv-off-white)" }}>
      {/* Master */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <div style={{ background: "var(--kv-black)", color: "var(--kv-white)", padding: "20px 28px", minWidth: 280, textAlign: "center" }}>
          <Lockup which={which} variant="primary" size="md" on="ink" />
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 12 }}>
            MASTER · INSTITUTIONAL
          </div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 8, lineHeight: 1.5 }}>
            African Real Estate Index — research, methodology, B2B
          </div>
        </div>
      </div>
      {/* Connector */}
      <div style={{ width: 1, height: 32, background: "var(--kv-rule-strong)", margin: "0 auto" }} />
      {/* Sub-brands */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { name: "Cape Verde Real Estate Index", role: "MARKET · CONSUMER", desc: "Verified listings + market index for Cape Verde", surface: "var(--kv-paper)", live: true, fg: "var(--kv-black)" },
          { name: "Nigeria Real Estate Index",  role: "MARKET · 2026 PIPELINE", desc: "Nigeria — pattern naming, not committed", surface: "var(--kv-paper)", live: false, fg: "var(--kv-ink-400)" },
          { name: "+ next market",  role: "MARKET · 2026 PIPELINE", desc: "Kenya / Ghana — [Country] Real Estate Index", surface: "var(--kv-paper)", live: false, fg: "var(--kv-ink-400)" },
        ].map((b, i) => (
          <div key={i} style={{ background: b.surface, border: `1px solid ${b.live ? "var(--kv-black)" : "var(--kv-rule)"}`, padding: 22, position: "relative" }}>
            {b.live && <div style={{ position: "absolute", top: -8, right: 16, background: "var(--kv-green)", color: "var(--kv-black)", fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", padding: "3px 8px", border: "1px solid var(--kv-black)" }}>LIVE</div>}
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", color: b.fg, marginBottom: 16 }}>{b.name}</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase", marginBottom: 8 }}>{b.role}</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: b.live ? "var(--kv-ink-700)" : "var(--kv-ink-400)", lineHeight: 1.55 }}>{b.desc}</div>
            {b.live && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--kv-rule)", display: "flex", alignItems: "center", gap: 8 }}>
                <Lockup which={which} variant="powered" size="sm" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", lineHeight: 1.6, maxWidth: 720 }}>
        <b style={{ color: "var(--kv-black)" }}>Endorsed-monolith model.</b> Sub-brands lead in-market, AREI signs the work. The "powered by AREI" lockup is the only mandatory cross-brand tag.
        Country names use the <b style={{ color: "var(--kv-black)" }}>kaza-</b> prefix only when the local linguistic fit is natural; otherwise the market gets its own name and AREI underwrites it.
      </div>
    </div>
  );
}

/* Voice — always / never / examples */
function VoiceRules() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="bg-card" style={{ padding: 24 }}>
        <span className="t-eyebrow" style={{ color: "var(--kv-green-deep)" }}><b>ALWAYS</b></span>
        <div style={{ marginTop: 16, fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.85, color: "var(--kv-ink-700)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 14px" }}>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>Lead with the number; let the prose follow.</span>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>State methodology beside every claim — sample size, source, period.</span>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>Use the language a serious analyst would use to a serious client.</span>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>Disclose what we don't know as plainly as what we do.</span>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>Localise: prices in EUR <i>and</i> CVE; place names in their local form.</span>
            <span style={{ color: "var(--kv-green-deep)" }}>+</span><span>Speak in plurals — "markets", "listings", "buyers" — not "users".</span>
          </div>
        </div>
      </div>
      <div className="bg-card" style={{ padding: 24 }}>
        <span className="t-eyebrow" style={{ color: "var(--kv-accent-coral)" }}><b>NEVER</b></span>
        <div style={{ marginTop: 16, fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.85, color: "var(--kv-ink-700)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 14px" }}>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>Hype, urgency, "limited time", FOMO.</span>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>"Disrupting", "revolutionising", "Africa rising", "next frontier".</span>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>Stock-photo Africa: silhouettes, drums, sunsets, "vibrant", "untapped".</span>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>Crypto, blockchain, "tokenisation", "Web3" — even if it's the rails.</span>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>Forecasts in marketing copy. Numbers are observed, not predicted.</span>
            <span style={{ color: "var(--kv-accent-coral)" }}>—</span><span>Emoji, exclamation marks, ALL CAPS for emphasis.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyCompare() {
  const rows = [
    {
      bad: "Discover the hottest new beachfront properties in vibrant Cape Verde — your dream home awaits!",
      good: "Sal · 412 verified listings · €2,180/m² median, March 2026. Filter by parish, price, m²; verification status visible on every record.",
    },
    {
      bad: "We're disrupting African real estate with cutting-edge AI and blockchain technology.",
      good: "We index Cape Verde's residential market and publish the methodology. The data is open, the listings are verified, the pricing has receipts.",
    },
    {
      bad: "🌍🏠 Africa rising! Don't miss out on this once-in-a-lifetime investment opportunity!",
      good: "CVREI rose 1.1 points in March, the eighth consecutive monthly increase. Movement is concentrated in Sal (+3.4% MoM); Santiago is flat. Read the full briefing.",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="bg-card" style={{ padding: 22, borderColor: "var(--kv-accent-coral)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, background: "var(--kv-accent-coral)" }} />
              <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "var(--kv-accent-coral)" }}>OFF-BRAND</span>
            </div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--kv-ink-700)" }}>{r.bad}</div>
          </div>
          <div className="bg-card" style={{ padding: 22, borderColor: "var(--kv-green-deep)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, background: "var(--kv-green-deep)" }} />
              <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: "var(--kv-green-deep)" }}>ON-BRAND</span>
            </div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--kv-black)" }}>{r.good}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* Content pillars */
function ContentPillars() {
  const pillars = [
    { code: "P01", name: "Index updates",       cadence: "monthly",   formats: "Data drop · LinkedIn carousel · X card", desc: "CVREI release with the headline number, prior-period delta, and one chart of context." },
    { code: "P02", name: "Methodology",         cadence: "quarterly", formats: "Briefing PDF · Long-form post",          desc: "How the index is calculated, what changed, why we trust the sample. Versioned. Public." },
    { code: "P03", name: "Verified listings",   cadence: "rolling",   formats: "CVREI grid · IG feed",               desc: "Each new verified listing earns a card. Verified = paperwork checked, vendor confirmed, price posted." },
    { code: "P04", name: "Local explainers",    cadence: "biweekly",  formats: "Article · X thread",                     desc: "Property tax, foreign-buyer law, IBI equivalent, deed registration. Boring on purpose." },
    { code: "P05", name: "Founder voice",       cadence: "biweekly",  formats: "LinkedIn post · Newsletter",             desc: "Why we're building this, what we found this week, what we got wrong. First-person, signed." },
    { code: "P06", name: "Market briefings",    cadence: "quarterly", formats: "Report PDF · Webinar",                   desc: "30-page diagnostic of one location: supply, transactions, risk, regulation. Sponsorable." },
    { code: "P07", name: "Operator interviews", cadence: "monthly",   formats: "Article · Audio",                        desc: "Notaries, agents, regulators, expat buyers. People who actually transact." },
    { code: "P08", name: "Data corrections",    cadence: "as-needed", formats: "Disclosure post",                        desc: "When we get a number wrong we say so, in writing, with the corrected figure. Trust comes from this." },
    { code: "P09", name: "Expansion notes",     cadence: "quarterly", formats: "Brief",                                  desc: "What we're learning about the next market — not a launch announcement, a working note." },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--kv-rule)", border: "1px solid var(--kv-rule)" }}>
      {pillars.map(p => (
        <div key={p.code} style={{ background: "var(--kv-paper)", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--kv-green-deep)" }}>{p.code}</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--kv-gray-500)", border: "1px solid var(--kv-rule)", padding: "2px 7px" }}>{p.cadence}</span>
          </div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 500, color: "var(--kv-black)", marginBottom: 10, letterSpacing: "-0.01em" }}>{p.name}</div>
          <div style={{ fontFamily: "var(--kv-sans)", fontSize: 13, lineHeight: 1.55, color: "var(--kv-ink-700)", marginBottom: 14 }}>{p.desc}</div>
          <div style={{ paddingTop: 12, borderTop: "1px solid var(--kv-rule-soft)", fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>
            {p.formats}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Production checklist */
function Checklist() {
  const groups = [
    { name: "Identity", items: [
      { t: "Final logo SVG (icon + lockup variants, 5 surfaces)", p: "P0", d: "1d" },
      { t: "Favicon set (16/32/48/180/512)",                       p: "P0", d: "0.5d" },
      { t: "Market lockups: Cape Verde Real Estate Index, +1 future market", p: "P1", d: "1d" },
      { t: "Print master with bleed/mark guides",                  p: "P2", d: "0.5d" },
    ]},
    { name: "Type & color", items: [
      { t: "Inter hosted self-served (woff2)",                      p: "P0", d: "0.5d" },
      { t: "Token CSS published to /static/tokens.css",            p: "P0", d: "0.5d" },
      { t: "Color tokens audited for AA on every surface",         p: "P1", d: "1d" },
    ]},
    { name: "Components", items: [
      { t: "CVREI site components codified in Storybook",          p: "P1", d: "3d" },
      { t: "AREI dashboard components — same library",             p: "P1", d: "3d" },
      { t: "Status pill / KPI strip / data table primitives",      p: "P0", d: "1d" },
    ]},
    { name: "Data viz", items: [
      { t: "CVREI chart React component, single source",           p: "P0", d: "2d" },
      { t: "Sparkline primitive — 80×22 + 160×44 sizes",           p: "P1", d: "0.5d" },
      { t: "Coverage grid — markets + status, JSON-driven",        p: "P1", d: "1d" },
    ]},
    { name: "Templates", items: [
      { t: "Social: LI 1200×628, X 1200×1200, IG 1080×1350/1920",  p: "P0", d: "1d" },
      { t: "Quarterly report InDesign / PDF master",               p: "P1", d: "3d" },
      { t: "Briefing email template (HTML + plaintext)",           p: "P1", d: "1d" },
    ]},
    { name: "Voice & content", items: [
      { t: "Editorial calendar Q1 — 9 pillars, 12 weeks",          p: "P0", d: "1d" },
      { t: "Disclosures + corrections SOP (public)",                p: "P0", d: "0.5d" },
      { t: "Press one-pager — index + methodology",                p: "P2", d: "0.5d" },
    ]},
  ];
  const pColor = (p) => p === "P0" ? "var(--kv-green-deep)" : p === "P1" ? "var(--kv-accent-ocean)" : "var(--kv-gray-500)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
      {groups.map(g => (
        <div key={g.name} className="bg-card" style={{ padding: 24 }}>
          <span className="t-eyebrow"><b>{g.name}</b></span>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
            {g.items.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 14, alignItems: "center", padding: "12px 0", borderBottom: i === g.items.length - 1 ? "none" : "1px solid var(--kv-rule-soft)" }}>
                <input type="checkbox" style={{ width: 14, height: 14, accentColor: "var(--kv-black)", margin: 0 }} />
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 12, color: "var(--kv-ink-700)", lineHeight: 1.5 }}>{it.t}</span>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: pColor(it.p), border: `1px solid ${pColor(it.p)}`, padding: "2px 6px" }}>{it.p}</span>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", letterSpacing: "0.06em" }}>{it.d}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { NumberedList, BrandArchitecture, VoiceRules, CopyCompare, ContentPillars, Checklist });
