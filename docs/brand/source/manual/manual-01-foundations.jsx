/* ══════════════════════════════════════════════════════════
   AREI BRAND GUIDELINES · SECTIONS 1-6
   01 Cover · 02 Brand idea · 03 Architecture
   04 Logo & mark · 05 Country lockup system · 06 Color
   ══════════════════════════════════════════════════════════ */

/* ───────── 01 · COVER ────────────────────────────────── */
function Cover() {
  const cv = MARKETS[2]; // Cape Verde as the headline example
  return (
    <section className="page cover" data-screen-label="01 Cover">
      <div className="page-grid">
        <div className="cover-meta">
          <div className="t-eyebrow">AREI · IDENTITY</div>
          <div style={{ marginTop: 14 }}>
            <Mark size={56} />
          </div>
        </div>
        <div className="cover-edition">
          <div className="t-eyebrow">Volume 01 · v1.0 · May 2026</div>
        </div>

        <div className="cover-title">
          <h1>Brand<br/>Guidelines.</h1>
          <div className="cover-subtitle">
            <span>Africa Real Estate Index</span>
            <span>—</span>
            <span>Identity, language &amp; system</span>
          </div>
        </div>

        <div className="cover-feature">
          <div style={{ background: "var(--kv-paper)", padding: 56, border: "1px solid var(--kv-rule)" }}>
            <PrimaryLockup m={cv} h={84} />
          </div>
          <div className="cover-feature-cap">
            <span>Primary lockup · Cape Verde Real Estate Index</span>
            <span>D · LAYERS · LOCKED MARK</span>
          </div>
        </div>

        <div className="cover-foot">
          <div>
            <div className="t-label">Issued by</div>
            <div className="cover-foot-val">AREI · Master research &amp; methodology</div>
          </div>
          <div>
            <div className="t-label">Audience</div>
            <div className="cover-foot-val">Designers · Developers · Agencies · Contributors</div>
          </div>
          <div>
            <div className="t-label">Status</div>
            <div className="cover-foot-val">v1.0 candidate · pending final approval</div>
          </div>
          <div>
            <div className="t-label">Document</div>
            <div className="cover-foot-val">AREI-BG-001 · v1.0</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── 02 · BRAND IDEA ──────────────────────────── */
function BrandIdea() {
  const layers = [
    { n: "L1", t: "Records",     d: "Listings, transactions, public registries — the raw market footprint." },
    { n: "L2", t: "Methodology", d: "Verification, sample frame, formula. The act of turning records into a measure." },
    { n: "L3", t: "Signal",      d: "The published index point. The today-value the market reads." },
  ];
  return (
    <section className="page" data-screen-label="02 Brand idea">
      <SectionHead
        num="02 · BRAND IDEA"
        title="Records, methodology, signal."
        lede="AREI is not a place, a portal, or a feed. It is a system that turns market records into a verified, published signal. Every visual decision in this manual answers to that idea."
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "start" }}>
        <div className="bg-card" style={{ padding: 40 }}>
          <div className="t-label">The mark, read in three layers</div>
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
            <Mark size={140} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
            {layers.map(l => (
              <div key={l.n} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 16, alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: "var(--kv-green-deep)" }}>{l.n}</span>
                <div>
                  <div style={{ fontFamily: "var(--kv-mono)", fontSize: 14, fontWeight: 600, color: "var(--kv-black)" }}>{l.t}</div>
                  <div style={{ fontFamily: "var(--kv-sans)", fontSize: 13, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 4 }}>{l.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 28, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.3, color: "var(--kv-black)" }}>
            "Market data, verified method, published index."
          </div>
          <p style={{ fontFamily: "var(--kv-sans)", fontSize: 15, lineHeight: 1.7, color: "var(--kv-ink-700)", marginTop: 24, maxWidth: 560 }}>
            The mark says <i>system</i>, not <i>place</i>. Each country index inherits the same three layers; only the country name on line 1 of the lockup changes. This is what makes AREI a family — not a flag-and-monument set of national brands.
          </p>
          <div style={{ marginTop: 32, padding: "24px 28px", borderLeft: "2px solid var(--kv-black)", background: "var(--kv-off-white)" }}>
            <div className="t-label">What AREI is</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--kv-ink-700)", marginTop: 8 }}>
              Listing-based market data, monitored asking-price coverage, published with disclosed methodology — for Africa and its individual property markets.
            </div>
            <div className="t-label" style={{ marginTop: 18 }}>What AREI is not</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--kv-ink-700)", marginTop: 8 }}>
              A transaction-price index, a valuation product, or a buy/sell recommendation. The visual identity must never imply otherwise.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── 03 · BRAND ARCHITECTURE ──────────────────── */
function Architecture() {
  return (
    <section className="page" data-screen-label="03 Architecture">
      <SectionHead
        num="03 · BRAND ARCHITECTURE"
        title="One family. Seven indices. One methodology owner."
        lede="AREI is the master brand and the methodology owner. Each country market identity is a member of the same family, distinguished only by the country name on line 1 of the lockup. There are no sub-brands beyond this rule."
      />

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 40, alignItems: "stretch", border: "1px solid var(--kv-rule)" }}>
        {/* Left: master */}
        <div style={{ padding: 32, background: "var(--kv-black)", color: "var(--kv-green)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="t-label" style={{ color: "rgba(255,255,255,0.55)" }}>Master · Methodology owner</div>
            <div style={{ marginTop: 28 }}>
              <PrimaryLockup m={MARKETS[0]} h={56} fg="var(--kv-green)" />
            </div>
          </div>
          <div style={{ marginTop: 32, fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.78)" }}>
            Owns research, methodology, publication, the master mark and the lockup system. Appears as the publisher line on every country index.
          </div>
        </div>

        {/* Right: family */}
        <div style={{ padding: 32 }}>
          <div className="t-label">Country market identities</div>
          <div style={{
            marginTop: 24, display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
            border: "1px solid var(--kv-rule)",
          }}>
            {MARKETS.slice(1).map((m, i) => (
              <div key={m.code} style={{
                padding: "28px 22px",
                borderRight: (i % 3 !== 2) ? "1px solid var(--kv-rule)" : "none",
                borderBottom: i < 3 ? "1px solid var(--kv-rule)" : "none",
                minHeight: 150, display: "flex", alignItems: "center",
              }}>
                <PrimaryLockup m={m} h={36} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legacy */}
      <div style={{
        marginTop: 32, padding: "20px 28px",
        border: "1px dashed var(--kv-rule)", background: "var(--kv-off-white)",
        display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "center",
      }}>
        <div className="t-label">Legacy / transitional</div>
        <div style={{ fontFamily: "var(--kv-sans)", fontSize: 13, lineHeight: 1.65, color: "var(--kv-ink-700)" }}>
          <b style={{ color: "var(--kv-black)", fontFamily: "var(--kv-mono)", letterSpacing: "0.04em" }}>KazaVerde</b> &nbsp;— consumer-facing legacy mark, sunsetting. Not part of the core AREI identity system. Reference only; do not use in new collateral.
        </div>
      </div>
    </section>
  );
}

/* ───────── 04 · LOGO & MARK ──────────────────────────── */
function LogoMark() {
  return (
    <section className="page" data-screen-label="04 Logo &amp; mark">
      <SectionHead
        num="04 · LOGO &amp; MARK"
        title="D · Layers. The locked master mark."
        lede="A stack of three offset squares, frontmost filled. Records, methodology, signal — three layers in plan view. Built on a 24-unit grid; hairlines snap at favicon size; identical geometry at every scale."
      />

      {/* Anatomy + clear space */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
        <div className="bg-card" style={{ padding: 56, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
          <Mark size={200} />
        </div>
        <div className="bg-card" style={{ padding: 36 }}>
          <div className="t-label">Anatomy</div>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Grid",    "24 × 24 base. Geometry is whole-unit."],
              ["Stroke",  "1.4 units. Square line cap. No rounding."],
              ["Layers",  "Three squares: 14, 14, 9 units."],
              ["Offset",  "3.5 units between rear and middle layers."],
              ["Fill",    "Front layer solid. Read it as 'today'."],
            ].map(([k,v]) => (
              <li key={k} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 14, fontFamily: "var(--kv-mono)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>{k}</span>
                <span style={{ fontSize: 12, color: "var(--kv-ink-700)", lineHeight: 1.55 }}>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Clear space + min size */}
      <div className="subhead"><span className="subhead-kicker">04.2</span><span>Clear space &amp; minimum sizes</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Plate title="Clear space" sub="Minimum margin equals the height of one mark on every side." tag="X · X · X · X" minH={220}>
          <div style={{ position: "relative", display: "inline-block", padding: 64 }}>
            <span style={{ position: "absolute", inset: 0, border: "1px dashed rgba(0,0,0,0.25)" }} />
            <Mark size={64} />
          </div>
        </Plate>

        <Plate title="Minimum sizes" sub="Below 16px the mark loses its hairline rhythm. Below 12px use a single solid square fallback." tag="16 / 24 / 40 / 64 px" minH={220}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 32 }}>
            {[16, 24, 40, 64].map(s => (
              <div key={s} style={{ textAlign: "center" }}>
                <Mark size={s} />
                <div style={{ marginTop: 10, fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)", letterSpacing: "0.1em" }}>{s}px</div>
              </div>
            ))}
          </div>
        </Plate>
      </div>

      {/* Color variants */}
      <div className="subhead"><span className="subhead-kicker">04.3</span><span>Color variants</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { bg: "var(--kv-paper)",      fg: "var(--kv-black)",      label: "On paper" },
          { bg: "var(--kv-off-white)",  fg: "var(--kv-black)",      label: "On off-white" },
          { bg: "var(--kv-black)",      fg: "var(--kv-green)",      label: "On ink · sage mark" },
          { bg: "var(--kv-green-deep)", fg: "var(--kv-green)",      label: "On deep green" },
        ].map(v => (
          <Plate key={v.label} bg={v.bg} title={v.label} minH={160}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Mark size={64} color={v.fg} />
            </div>
          </Plate>
        ))}
      </div>

      {/* Do / Don't */}
      <div className="subhead"><span className="subhead-kicker">04.4</span><span>Do / don't</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Plate title="Use the mark at locked geometry" tag="DO" minH={160}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><Mark size={56} /></div>
        </Plate>
        <Plate title="Don't recolor outside the palette" sub="Flags, tints, gradients are not permitted." tag="DON'T" minH={160}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative" }}>
            <Mark size={56} color="#c44a3a" />
            <span style={{ position: "absolute", inset: "20% 8%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-8deg)" }} />
          </div>
        </Plate>
        <Plate title="Don't rotate or skew" tag="DON'T" minH={160}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative" }}>
            <div style={{ transform: "rotate(18deg)" }}><Mark size={56} /></div>
            <span style={{ position: "absolute", inset: "20% 8%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-8deg)" }} />
          </div>
        </Plate>
        <Plate title="Don't outline or stroke-weight changes" tag="DON'T" minH={160}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", position: "relative" }}>
            <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3.5" strokeLinecap="square">
              <rect x="3" y="3" width="14" height="14" />
              <rect x="6.5" y="6.5" width="14" height="14" />
              <rect x="10" y="10" width="9" height="9" fill="#0a0a0a" stroke="none" />
            </svg>
            <span style={{ position: "absolute", inset: "20% 8%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-8deg)" }} />
          </div>
        </Plate>
      </div>
    </section>
  );
}

/* ───────── 05 · COUNTRY LOCKUP SYSTEM ────────────────── */
function CountryLockupSystem() {
  return (
    <section className="page" data-screen-label="05 Country lockup">
      <SectionHead
        num="05 · COUNTRY LOCKUP SYSTEM"
        title="One lockup. Country name on line 1. Everything else holds."
        lede="The primary lockup is a three-line ceremonial stack. Country name (dominant). REAL ESTATE (lighter). INDEX (lighter). The descriptor is fixed; only the country line changes. The compact lockup is the same family on a single line, for product surfaces."
      />

      {/* Construction diagram */}
      <div className="bg-card" style={{ padding: 48 }}>
        <div className="t-label">Construction</div>
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "auto 1fr", gap: 56, alignItems: "center" }}>
          <PrimaryLockup m={MARKETS[2]} h={112} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--kv-mono)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--kv-green-deep)" }}>L1</span>
              <span style={{ fontSize: 13, color: "var(--kv-black)" }}>Country name &nbsp;<span style={{ color: "var(--kv-gray-500)" }}>· dominant weight (600) · variable</span></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--kv-green-deep)" }}>L2</span>
              <span style={{ fontSize: 13, color: "var(--kv-black)" }}>REAL ESTATE &nbsp;<span style={{ color: "var(--kv-gray-500)" }}>· descriptor (400) · fixed</span></span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--kv-green-deep)" }}>L3</span>
              <span style={{ fontSize: 13, color: "var(--kv-black)" }}>INDEX &nbsp;<span style={{ color: "var(--kv-gray-500)" }}>· descriptor (400) · fixed</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of all 7 */}
      <div className="subhead"><span className="subhead-kicker">05.2</span><span>Primary lockup · seven indices</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", border: "1px solid var(--kv-rule)" }}>
        {MARKETS.map((m, i) => (
          <div key={m.code} style={{
            padding: "44px 36px",
            background: m.master ? "var(--kv-black)" : "var(--kv-paper)",
            color: m.master ? "var(--kv-green)" : "var(--kv-black)",
            borderRight: (i % 2 === 0) ? "1px solid var(--kv-rule)" : "none",
            borderBottom: i < MARKETS.length - 2 ? "1px solid var(--kv-rule)" : "none",
            minHeight: 180, display: "flex", alignItems: "center", gap: 32,
          }}>
            <div style={{ flex: 1 }}>
              <PrimaryLockup m={m} h={48} fg={m.master ? "var(--kv-green)" : "var(--kv-black)"} />
            </div>
            <div style={{ textAlign: "right", opacity: 0.6 }}>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase" }}>0{i + 1}</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.06em", marginTop: 4 }}>{m.short}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Compact */}
      <div className="subhead"><span className="subhead-kicker">05.3</span><span>Compact lockup · product surfaces</span></div>
      <div style={{ border: "1px solid var(--kv-rule)" }}>
        {MARKETS.map((m, i) => (
          <div key={m.code} style={{
            padding: "20px 28px",
            borderBottom: i < MARKETS.length - 1 ? "1px solid var(--kv-rule)" : "none",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: i % 2 === 0 ? "var(--kv-paper)" : "var(--kv-off-white)",
          }}>
            <CompactLockup m={m} size={13} />
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>
              Nav · footer · mobile header · app bar
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── 06 · COLOR SYSTEM ─────────────────────────── */
function ColorSystem() {
  const swatches = [
    { name: "Ink",         hex: "#0A0A0A", role: "Primary text, master surfaces, KPI numbers", contrast: "AAA on paper", fg: "#fafafa" },
    { name: "Paper",       hex: "#FFFFFF", role: "Default surface — cards, reports, web body", contrast: "Pair with ink", fg: "#0a0a0a" },
    { name: "Bone",        hex: "#FAFAFA", role: "Page ground — slightly warmer than pure white", contrast: "Pair with ink", fg: "#0a0a0a" },
    { name: "Off-white",   hex: "#F2F0EC", role: "Secondary surface — sidebars, alt rows, legacy notes", contrast: "Pair with ink", fg: "#0a0a0a" },
    { name: "Sage",        hex: "#8ECFBF", role: "Brand accent on ink — ticker glyphs, on-dark mark", contrast: "AA on ink", fg: "#0a0a0a" },
    { name: "Sage deep",   hex: "#2D4A42", role: "Editorial dark — chart highlights, secondary surfaces", contrast: "AA on paper", fg: "#fafafa" },
    { name: "Gray 500",    hex: "#888888", role: "Captions, eyebrow labels, table dividers", contrast: "Body neutral", fg: "#fafafa" },
    { name: "Coral",       hex: "#C44A3A", role: "Negative deltas, do-not stamps. Use sparingly.", contrast: "AA on paper", fg: "#fafafa" },
  ];
  return (
    <section className="page" data-screen-label="06 Color">
      <SectionHead
        num="06 · COLOR SYSTEM"
        title="Black, paper, off-white, sage. One restrained family."
        lede="Subtle market accent tones only. The palette stays inside one tonal family — calm, data-first, premium. Country indices do not get individual brand colors."
      />

      {/* Swatch grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid var(--kv-rule)" }}>
        {swatches.map((s, i) => (
          <div key={s.name} style={{
            background: s.hex, color: s.fg,
            padding: "28px 24px", minHeight: 240,
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            borderRight: (i % 4 !== 3) ? "1px solid var(--kv-rule)" : "none",
            borderBottom: i < 4 ? "1px solid var(--kv-rule)" : "none",
          }}>
            <div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>{s.name}</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 400, letterSpacing: "0.04em", marginTop: 8 }}>{s.hex}</div>
            </div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.55, opacity: 0.85 }}>
              <div>{s.role}</div>
              <div style={{ marginTop: 6, fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>{s.contrast}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pairing rules */}
      <div className="subhead"><span className="subhead-kicker">06.2</span><span>Pairing rules</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { t: "Master surfaces", d: "Ink ground · sage mark · sage deep secondary. Used for ticker rows, hero modules and dark report covers.", swatch: ["#0A0A0A", "#8ECFBF", "#2D4A42"] },
          { t: "Editorial / paper",  d: "Paper or bone ground · ink type · off-white as alt row. The default for reports, web body, and most documents.", swatch: ["#FAFAFA", "#0A0A0A", "#F2F0EC"] },
          { t: "Data delta",         d: "Sage deep for positive movement. Coral for negative — sparingly. Never red-on-green next to each other.", swatch: ["#2D4A42", "#C44A3A", "#888888"] },
        ].map(p => (
          <div key={p.t} className="bg-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", gap: 0 }}>
              {p.swatch.map(c => <span key={c} style={{ width: 32, height: 32, background: c, border: "1px solid var(--kv-rule)" }} />)}
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 600, marginTop: 14 }}>{p.t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 6 }}>{p.d}</div>
          </div>
        ))}
      </div>

      {/* Don't */}
      <div className="subhead"><span className="subhead-kicker">06.3</span><span>Forbidden uses</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          ["Country flag palettes", "Never use national colours to brand a country index."],
          ["Gradients",             "Solid colour only. No tonal gradients on backgrounds or marks."],
          ["High-saturation accents", "No magenta, electric blue, lime. Stay inside the family."],
          ["Coral on ink",          "Coral is for paper surfaces and small deltas. Never as a hero colour."],
        ].map(([t, d]) => (
          <div key={t} style={{ padding: 20, background: "var(--kv-warn-tint, rgba(196,74,58,0.10))", border: "1px solid rgba(196,74,58,0.35)" }}>
            <StatusStamp kind="dont" />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 12, fontWeight: 600, marginTop: 10 }}>{t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 4 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, {
  Cover, BrandIdea, Architecture, LogoMark, CountryLockupSystem, ColorSystem,
});
