/* ══════════════════════════════════════════════════════════
   AREI BRAND GUIDELINES · SECTIONS 7-12
   07 Typography · 08 Web identity · 09 Mobile identity
   10 Data &amp; methodology language · 11 Data visualization
   12 Reports &amp; brochures
   ══════════════════════════════════════════════════════════ */

/* ───────── 07 · TYPOGRAPHY ──────────────────────────── */
function Typography() {
  const scale = [
    { name: "Display",    size: 72, weight: 400, family: "Mono", use: "Report covers · hero numerals · cover titles" },
    { name: "Headline",   size: 38, weight: 400, family: "Mono", use: "Section openers · index pages" },
    { name: "Title",      size: 22, weight: 500, family: "Mono", use: "Subheads · KPI labels · chart titles" },
    { name: "Body",       size: 15, weight: 400, family: "Sans", use: "Lede paragraphs · methodology text · captions" },
    { name: "Label",      size: 11, weight: 600, family: "Mono", use: "Eyebrow labels · table headers · metadata" },
    { name: "Micro",      size: 9,  weight: 600, family: "Mono", use: "Document IDs · metadata strips · tags" },
  ];

  return (
    <section className="page" data-screen-label="07 Typography">
      <SectionHead
        num="07 · TYPOGRAPHY"
        title="Inter. Editorial, civic, calm."
        lede="One family carries everything — identity, headlines, labels, numerics and reading copy. Roles are differentiated by weight, letter-spacing and tabular numerals, not by switching typefaces. Institutional by design — readable at scale, neutral in tone."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="bg-card" style={{ padding: 36 }}>
          <div className="t-label">Display &amp; data</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 96, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.95, marginTop: 18, color: "var(--kv-black)" }}>
            Aa &nbsp;<span style={{ fontSize: 60, opacity: 0.55 }}>116.4</span>
          </div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", letterSpacing: "0.1em" }}>
            <span>Inter · 400 / 500 / 600 · caps + tracking · tabular numerals</span>
            <span>licensed · OFL</span>
          </div>
        </div>
        <div className="bg-card" style={{ padding: 36 }}>
          <div className="t-label">Reading copy</div>
          <div style={{ fontFamily: "var(--kv-sans)", fontSize: 96, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 0.95, marginTop: 18, color: "var(--kv-black)" }}>
            Aa &nbsp;<span style={{ fontSize: 60, opacity: 0.55 }}>Body.</span>
          </div>
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", letterSpacing: "0.1em" }}>
            <span>Inter · 400 / 500 · reading sizes, normal tracking</span>
            <span>licensed · OFL</span>
          </div>
        </div>
      </div>

      <div className="subhead"><span className="subhead-kicker">07.2</span><span>Type scale</span></div>
      <div style={{ border: "1px solid var(--kv-rule)" }}>
        {scale.map((s, i) => (
          <div key={s.name} style={{
            display: "grid", gridTemplateColumns: "120px 1fr 200px",
            alignItems: "baseline", padding: "22px 28px",
            borderBottom: i < scale.length - 1 ? "1px solid var(--kv-rule)" : "none",
            background: i % 2 === 0 ? "var(--kv-paper)" : "var(--kv-off-white)",
          }}>
            <div>
              <div className="t-label">{s.name}</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", marginTop: 4, letterSpacing: "0.1em" }}>
                {s.family} · {s.weight} · {s.size}px
              </div>
            </div>
            <div style={{
              fontFamily: s.family === "Mono" ? "var(--kv-mono)" : "var(--kv-sans)",
              fontSize: s.size, fontWeight: s.weight,
              letterSpacing: s.size > 30 ? "-0.02em" : "0",
              color: "var(--kv-black)", lineHeight: 1.05,
            }}>
              The mark says system, not place.
            </div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, color: "var(--kv-ink-700)", lineHeight: 1.55 }}>{s.use}</div>
          </div>
        ))}
      </div>

      <div className="subhead"><span className="subhead-kicker">07.3</span><span>Numerals &amp; tabular settings</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Plate title="Tabular numerals · Mono" sub="font-variant-numeric: tabular-nums slashed-zero. Index values, deltas, table cells." minH={180}>
          <div style={{ fontFamily: "var(--kv-mono)", fontVariantNumeric: "tabular-nums slashed-zero", fontSize: 36, color: "var(--kv-black)", lineHeight: 1.4 }}>
            <div>116.4 &nbsp; +1.1</div>
            <div>108.0 &nbsp; +0.4</div>
            <div>099.7 &nbsp; −0.2</div>
          </div>
        </Plate>
        <Plate title="Date &amp; period syntax" sub="Mono small caps for periods. Always month-first; abbreviate with apostrophe." minH={180}>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 14, lineHeight: 1.9, color: "var(--kv-black)" }}>
            <div><span style={{ color: "var(--kv-gray-500)" }}>PERIOD ·</span> &nbsp; MAR 2026</div>
            <div><span style={{ color: "var(--kv-gray-500)" }}>SHORT ·</span> &nbsp;&nbsp; MAR'26</div>
            <div><span style={{ color: "var(--kv-gray-500)" }}>VOLUME ·</span> &nbsp; VOL.02 · Q1 2026</div>
            <div><span style={{ color: "var(--kv-gray-500)" }}>FILE ID ·</span> &nbsp; AREI-CV-MAR26</div>
          </div>
        </Plate>
      </div>
    </section>
  );
}

/* ───────── 08 · WEB IDENTITY ────────────────────────── */
function WebIdentity() {
  return (
    <section className="page" data-screen-label="08 Web identity">
      <SectionHead
        num="08 · WEB IDENTITY"
        title="Editorial web. The masthead is the brand."
        lede="Public web surfaces lead with the country lockup at editorial scale. The current product is listings inventory, source coverage and methodology — index values are reserved as a future pattern. Color enters only as accent on dark hero modules and chart strokes."
      />

      <Plate title="Homepage masthead · 1440 desktop" sub="Country lockup at editorial scale · current product is listings, coverage, methodology" tag="WEB" full minH={520}>
        <div style={{ width: "100%", height: 520, background: "var(--kv-bone, #fafafa)", padding: "44px 64px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 24, borderBottom: "1px solid var(--kv-rule)" }}>
            <CompactLockup m={MARKETS[2]} size={13} />
            <div style={{ display: "flex", gap: 32, fontFamily: "var(--kv-mono)", fontSize: 12, color: "var(--kv-ink-700)" }}>
              <span>Listings</span><span>Coverage</span><span>Methodology</span><span>Reports</span><span>Subscribe</span>
            </div>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 64, alignItems: "center", paddingTop: 40 }}>
            <div>
              <div className="t-label" style={{ marginBottom: 18 }}>// CAPE VERDE · MAR 2026</div>
              <PrimaryLockup m={MARKETS[2]} h={72} />
              <p style={{ fontFamily: "var(--kv-sans)", fontSize: 17, lineHeight: 1.5, color: "var(--kv-ink-700)", marginTop: 28, maxWidth: 540 }}>
                Listing-based market data for Cape Verde property — monitored sources, verified weekly, published by AREI.
              </p>
            </div>
            <div style={{ background: "var(--kv-paper)", border: "1px solid var(--kv-rule)", padding: 28 }}>
              <div className="t-label">Coverage · Mar 2026</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 16, fontFamily: "var(--kv-mono)" }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>1,284</div>
                  <div style={{ fontSize: 10, color: "var(--kv-gray-500)", marginTop: 6, letterSpacing: "0.1em" }}>VERIFIED LISTINGS</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>16</div>
                  <div style={{ fontSize: 10, color: "var(--kv-gray-500)", marginTop: 6, letterSpacing: "0.1em" }}>MONITORED LOCATIONS</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>4</div>
                  <div style={{ fontSize: 10, color: "var(--kv-gray-500)", marginTop: 6, letterSpacing: "0.1em" }}>ISLANDS</div>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1 }}>12</div>
                  <div style={{ fontSize: 10, color: "var(--kv-gray-500)", marginTop: 6, letterSpacing: "0.1em" }}>SOURCES</div>
                </div>
              </div>
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", lineHeight: 1.6 }}>
                Monitored asking-price listings.<br/>Not transaction prices or valuations.
              </div>
            </div>
          </div>
        </div>
      </Plate>

      <div className="subhead"><span className="subhead-kicker">08.2</span><span>Page anatomy · current product top bars</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Plate title="Nav bar · compact country lockup" sub="Mint hero ground · current product entry surface" tag="WEB · CURRENT" minH={80} pad={0} full>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 28px", height: 80, background: "var(--kv-green)" }}>
            <CompactLockup m={MARKETS[2]} size={11} />
            <div style={{ display: "flex", gap: 22, fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", color: "var(--kv-black)" }}>
              <span>LISTINGS</span><span>METHODOLOGY</span><span>REPORTS</span>
            </div>
          </div>
        </Plate>
        <Plate title="Coverage strip · publisher rail" sub="Listings, sources, locations — the current product surface" tag="DARK · CURRENT" minH={80} pad={0} full>
          <div style={{ display: "flex", alignItems: "center", padding: "0 28px", height: 80, background: "var(--kv-black)", color: "var(--kv-paper)", gap: 22 }}>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)" }}>CAPE VERDE</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 13 }}>1,284 verified listings</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-green)" }}>· 16 locations · 12 sources</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em" }}>MAR 2026 · LISTING-BASED</span>
          </div>
        </Plate>
      </div>

      {/* Future pattern — index ticker */}
      <div className="subhead"><span className="subhead-kicker">08.3</span><span>Future pattern · index value rail</span></div>
      <Plate
        title="Index ticker · future pattern"
        sub="Reserved for future use, after historical coverage and methodology mature. Not an active product surface today."
        tag="FUTURE PATTERN"
        minH={120} pad={0} full
      >
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 28px", height: 80, background: "var(--kv-black)", color: "var(--kv-paper)", gap: 22, opacity: 0.5 }}>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)" }}>CVREI</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 18 }}>116.4</span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-green)" }}>+1.1 MoM</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.16em" }}>METHODOLOGY V0.3</span>
          </div>
          <div style={{
            position: "absolute", top: 8, right: 8,
            padding: "3px 8px", background: "var(--kv-warn)", color: "var(--kv-paper)",
            fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>FUTURE PATTERN · NOT ACTIVE</div>
          <div style={{ padding: "12px 28px", fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)", lineHeight: 1.6, borderTop: "1px solid var(--kv-rule)" }}>
            Index-value tickers are documented for future release only. Today's surfaces lead with listings inventory, source coverage and verification — see 08.2.
          </div>
        </div>
      </Plate>

      {/* Footer / disclaimer band */}
      <div className="subhead"><span className="subhead-kicker">08.4</span><span>Footer · disclaimer band</span></div>
      <Plate title="Site-wide footer" sub="Disclosure is its own named section — never buried in © text" tag="SITE-WIDE" full minH={360}>
        <div style={{ background: "var(--kv-black)", color: "var(--kv-paper)", padding: "44px 56px", display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 36 }}>
            <div>
              <CompactLockup m={MARKETS[2]} size={13} fg="var(--kv-paper)" />
              <div style={{ marginTop: 18, fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.7)", maxWidth: 360 }}>
                Independent listing-based market data for Cape Verde property — asking-price trends, inventory visibility and source coverage across the archipelago.
              </div>
            </div>
            {[
              ["INDEX", ["Latest release", "Methodology", "Historical series", "Subscribe"]],
              ["LISTINGS", ["All listings", "By island", "Featured this week", "Source coverage"]],
              ["ABOUT AREI", ["Master research", "Coverage roadmap", "Press", "Contact"]],
            ].map(([h, items]) => (
              <div key={h}>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>{h}</div>
                {items.map(l => (
                  <div key={l} style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "rgba(255,255,255,0.78)", marginBottom: 7 }}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 20 }}>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 10, textTransform: "uppercase" }}>Disclosure</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", maxWidth: 820 }}>
              <b style={{ color: "var(--kv-paper)" }}>CVREI Listing Index</b> is based on monitored public asking-price listings. It is not a transaction-price index, a valuation, or investment advice.
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)" }}>© 2026 · POWERED BY <span style={{ color: "var(--kv-paper)", fontWeight: 600 }}>AREI</span></span>
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)" }}>METHODOLOGY V0.3 · LISTING-BASED · MAR 2026</span>
          </div>
        </div>
      </Plate>
    </section>
  );
}

/* ───────── 09 · MOBILE IDENTITY ─────────────────────── */
function MobileIdentity() {
  const Burger = ({ color = "var(--kv-black)" }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 1.5, background: color }} />)}
    </div>
  );

  return (
    <section className="page" data-screen-label="09 Mobile identity">
      <SectionHead
        num="09 · MOBILE IDENTITY"
        title="On phone, the app bar carries mark + country only."
        lede="The full compact lockup is too wide for a phone header. On mobile app bars, use mark + COUNTRY at 11px mono. The 'REAL ESTATE INDEX' descriptor lives below — as page context, hero text, or section identity. The full lockup may still appear in mobile hero or report contexts, but never forced into the nav."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, justifyItems: "center" }}>
        {/* Phone 1 — Cape Verde index · home */}
        <PhoneFrame label="Cape Verde · home">
          <div style={{ background: "var(--kv-green)", padding: "18px 22px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <MobileAppBarLockup m={MARKETS[2]} size={11} />
              <Burger />
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", color: "var(--kv-black)", opacity: 0.7, marginTop: 22, textTransform: "uppercase" }}>
              Real Estate Index
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.15, marginTop: 14, color: "var(--kv-black)" }}>
              Cape Verde<br/>real estate,<br/>aggregated<br/>in one place
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, lineHeight: 1.55, color: "var(--kv-black)", marginTop: 16 }}>
              Independent listings data platform — aggregated from local agencies, portals and property websites.
            </div>
            <div style={{ marginTop: 22, background: "var(--kv-black)", color: "var(--kv-paper)", padding: "12px 16px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em" }}>
              BROWSE ALL LISTINGS <span>→</span>
            </div>
            <div style={{ marginTop: 14, fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-black)", textDecoration: "underline" }}>Read this month's briefing →</div>
          </div>
          <div style={{ padding: "18px 22px", background: "var(--kv-paper)" }}>
            <div className="t-label">Coverage · Mar 2026</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 24, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.1, marginTop: 8 }}>16 locations<br/><span style={{ color: "var(--kv-gray-500)" }}>4 islands · 12 sources</span></div>
            <div style={{ marginTop: 10, fontFamily: "var(--kv-mono)", fontSize: 8, color: "var(--kv-gray-500)", lineHeight: 1.5 }}>Monitored asking-price listings · verified weekly.</div>
          </div>
        </PhoneFrame>

        {/* Phone 2 — Listings inventory page (current product) */}
        <PhoneFrame label="Cape Verde · listings">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid var(--kv-rule)" }}>
            <MobileAppBarLockup m={MARKETS[2]} size={11} />
            <Burger />
          </div>
          <div style={{ padding: "22px 22px 18px" }}>
            <div className="t-label">Cape Verde</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.16em", color: "var(--kv-gray-500)", marginTop: 4, textTransform: "uppercase" }}>Real Estate Index — Listings</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.2, marginTop: 14 }}>
              1,284 verified listings, monitored across 4 islands.
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--kv-rule)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontFamily: "var(--kv-mono)", fontSize: 11 }}>
              <div>
                <div style={{ fontSize: 8, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Sources</div>
                <div style={{ marginTop: 4 }}>12 monitored</div>
              </div>
              <div>
                <div style={{ fontSize: 8, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Verified</div>
                <div style={{ marginTop: 4 }}>weekly cadence</div>
              </div>
              <div>
                <div style={{ fontSize: 8, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Locations</div>
                <div style={{ marginTop: 4 }}>16 markets</div>
              </div>
              <div>
                <div style={{ fontSize: 8, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Methodology</div>
                <div style={{ marginTop: 4 }}>v0.3 · public</div>
              </div>
            </div>
            <div style={{ paddingTop: 14, marginTop: 18, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 8, color: "var(--kv-gray-500)", lineHeight: 1.6 }}>
              Listing-based market signal. Not transaction prices or valuations.
            </div>
          </div>
          <div style={{ marginTop: "auto", padding: "14px 18px", borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", color: "var(--kv-ink-700)" }}>
            <span>LISTINGS</span><span>METHODOLOGY</span><span>REPORTS</span>
          </div>
        </PhoneFrame>

        {/* Phone 3 — AREI homepage (master) */}
        <PhoneFrame label="AREI · master homepage">
          <div style={{ background: "#9bc985", padding: "18px 22px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <MobileAppBarLockup m={MARKETS[0]} size={11} />
              <span style={{ fontFamily: "var(--kv-mono)", fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", color: "var(--kv-black)", border: "1px solid var(--kv-black)", padding: "4px 7px" }}>INVESTOR ENQUIRY</span>
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", color: "var(--kv-black)", opacity: 0.7, marginTop: 22, textTransform: "uppercase" }}>
              Africa Real Estate Index
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 21, fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.18, marginTop: 12, color: "var(--kv-black)" }}>
              Africa's property<br/>data is everywhere.<br/>We bring it<br/>together.
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, lineHeight: 1.55, color: "var(--kv-black)", marginTop: 16 }}>
              Pulled together, cleaned, and made searchable. Starting with Cape Verde.
            </div>
            <div style={{ marginTop: 22, background: "var(--kv-black)", color: "var(--kv-paper)", padding: "12px 16px", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.14em" }}>
              CAPE VERDE INDEX [→]
            </div>
            <div style={{ marginTop: 12, fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-black)", textDecoration: "underline" }}>Investor enquiry →</div>
          </div>
          <div style={{ padding: "18px 22px", background: "var(--kv-paper)" }}>
            <div className="t-label">The gap</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.3, marginTop: 8 }}>
              If you're an investor looking at Africa, you can't see the market.
            </div>
          </div>
        </PhoneFrame>
      </div>

      {/* Hero / report context — full lockup is permitted here */}
      <div className="subhead"><span className="subhead-kicker">09.2</span><span>Full lockup · mobile hero &amp; report contexts</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, justifyItems: "center" }}>
        <PhoneFrame label="Mobile report cover">
          <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <MobileAppBarLockup m={MARKETS[2]} size={10} />
            <span style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.16em", color: "var(--kv-gray-500)" }}>Q1'26</span>
          </div>
          <div style={{ flex: 1, padding: "18px 22px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--kv-off-white)" }}>
            <div>
              <PrimaryLockup m={MARKETS[2]} h={26} />
              <div style={{ marginTop: 24, fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Q1 Briefing</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 17, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.1, marginTop: 8 }}>
                Asking prices,<br/>inventory,<br/>coverage.
              </div>
            </div>
            <div style={{ paddingTop: 10, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 7, color: "var(--kv-gray-500)", lineHeight: 1.55 }}>
              Monitored asking-price listings. Not transactions.
            </div>
          </div>
        </PhoneFrame>

        <PhoneFrame label="Section identity">
          <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--kv-rule)" }}>
            <MobileAppBarLockup m={MARKETS[2]} size={10} />
            <Burger />
          </div>
          <div style={{ padding: "32px 22px", flex: 1 }}>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>// Methodology</div>
            <div style={{ marginTop: 22 }}>
              <PrimaryLockup m={MARKETS[2]} h={22} />
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 14, fontWeight: 500, lineHeight: 1.35, marginTop: 22 }}>
              What this index measures, and what it does not.
            </div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 11, lineHeight: 1.65, color: "var(--kv-ink-700)", marginTop: 12 }}>
              The country lockup may anchor a section opener — but it sits as page content, not as the app bar.
            </div>
          </div>
        </PhoneFrame>

        <PhoneFrame label="Cramped — DON'T">
          <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--kv-rule)", position: "relative" }}>
            <CompactLockup m={MARKETS[5]} size={9} />
            <Burger />
            <span style={{ position: "absolute", inset: 0, border: "1.5px solid var(--kv-warn)" }} />
          </div>
          <div style={{ padding: 22, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-warn)", letterSpacing: "0.16em", textAlign: "center", lineHeight: 1.6 }}>
              MARK + COUNTRY +<br/>REAL ESTATE INDEX<br/>WILL NOT FIT.<br/><br/><span style={{ color: "var(--kv-gray-500)" }}>Use mark + COUNTRY only.</span>
            </div>
          </div>
        </PhoneFrame>
      </div>

      <div className="subhead"><span className="subhead-kicker">09.3</span><span>Mobile rules</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          ["App bar: mark + COUNTRY only", "On mobile, the app bar carries the mark and the country at 11px mono. Never force the full 'REAL ESTATE INDEX' descriptor into a phone header."],
          ["Descriptor lives below the bar", "'REAL ESTATE INDEX' appears as page context, hero text, or section identity — directly under the app bar or in the hero block."],
          ["Full lockup for hero & report",  "The full three-line lockup may anchor mobile report covers and section openers. Never inside a nav bar."],
        ].map(([t, d]) => (
          <div key={t} style={{ padding: 22, border: "1px solid var(--kv-rule)" }}>
            <StatusStamp kind="do" />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 6 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PhoneFrame({ label, children }) {
  return (
    <div>
      <div style={{
        width: 270, height: 540, background: "var(--kv-paper)",
        border: "1px solid var(--kv-rule)", borderRadius: 28,
        overflow: "hidden", boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ height: 24, background: "var(--kv-bone, #fafafa)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <span style={{ width: 60, height: 4, background: "rgba(0,0,0,0.7)", borderRadius: 2 }} />
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
      </div>
      <div style={{ marginTop: 12, fontFamily: "var(--kv-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--kv-gray-500)", textAlign: "center", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

/* ───────── 10 · DATA &amp; METHODOLOGY LANGUAGE ────── */
function DataLanguage() {
  const pairs = [
    ["Cape Verde prices rose 1.1 pts",   "Tracked asking prices rose 1.1 pts"],
    ["Property values increased",        "Asking-price trend moved up"],
    ["Official price index",             "Listing-based market signal"],
    ["Market value index",               "CVREI Listing Index"],
    ["Transaction index",                "Monitored asking-price listings"],
    ["What homes sold for",              "What sellers are asking"],
    ["Closing price index",              "Asking-price trend, monthly"],
    ["The CVREI is a price index",       "The CVREI Listing Index reflects asking-price movement"],
  ];
  return (
    <section className="page" data-screen-label="10 Data language">
      <SectionHead
        num="10 · DATA &amp; METHODOLOGY LANGUAGE"
        title="State the metric. State what it's based on. Never imply transactions."
        lede="The mandatory disclosure rule: anywhere an index value appears without prose context — KPI cards, social posts, chart titles, dashboards — the methodology line must be paired with it."
      />

      {/* Disclosure rule block */}
      <div style={{ padding: "32px 40px", border: "2px solid var(--kv-black)", background: "var(--kv-off-white)" }}>
        <div className="t-label">Mandatory disclosure · word-for-word</div>
        <div style={{ fontFamily: "var(--kv-mono)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.45, marginTop: 16, color: "var(--kv-black)" }}>
          "Based on monitored asking-price listings.<br/>Not transaction prices or valuations."
        </div>
        <div style={{ marginTop: 20, fontFamily: "var(--kv-sans)", fontSize: 13, lineHeight: 1.65, color: "var(--kv-ink-700)" }}>
          Use this exact phrasing on KPI cards, ticker tiles, chart footers, and any social tile that shows an index value. Variants are permitted only in body prose, where the same two facts must still be stated.
        </div>
      </div>

      {/* Do / don't */}
      <div className="subhead"><span className="subhead-kicker">10.2</span><span>Phrase reference · do / don't</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 32px 1fr", alignItems: "stretch" }}>
        <div>
          <div style={{ padding: "12px 16px", background: "rgba(196,74,58,0.10)", borderTop: "2px solid var(--kv-warn)" }}>
            <StatusStamp kind="dont">DON'T SAY</StatusStamp>
          </div>
          <div style={{ border: "1px solid var(--kv-rule)", borderTop: "none" }}>
            {pairs.map((p, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < pairs.length - 1 ? "1px solid var(--kv-rule)" : "none", fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-ink-700)", textDecoration: "line-through", textDecorationColor: "rgba(196,74,58,0.5)" }}>
                {p[0]}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 50 }}>
          <span style={{ fontFamily: "var(--kv-mono)", fontSize: 16, color: "var(--kv-gray-500)" }}>→</span>
        </div>
        <div>
          <div style={{ padding: "12px 16px", background: "rgba(142,207,191,0.18)", borderTop: "2px solid var(--kv-green-deep)" }}>
            <StatusStamp kind="do">DO SAY</StatusStamp>
          </div>
          <div style={{ border: "1px solid var(--kv-rule)", borderTop: "none" }}>
            {pairs.map((p, i) => (
              <div key={i} style={{ padding: "16px 20px", borderBottom: i < pairs.length - 1 ? "1px solid var(--kv-rule)" : "none", fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-black)", fontWeight: 500 }}>
                {p[1]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tier reminder */}
      <div className="subhead"><span className="subhead-kicker">10.3</span><span>Name tier reminder</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid var(--kv-rule)" }}>
        {[
          { t: "Tier 1", n: "Cape Verde Real Estate Index", role: "Ceremonial", use: "Hero, cover, masthead" },
          { t: "Tier 2", n: "CVREI Listing Index",          role: "Metric",     use: "KPI cards, chart titles" },
          { t: "Tier 3", n: "CVREI",                         role: "Ticker",     use: "Tables, prose, compact" },
          { t: "Tier 4", n: "AREI",                           role: "Publisher",  use: "Powered-by, colophon" },
        ].map((c, i) => (
          <div key={c.t} style={{
            padding: 22,
            borderRight: i < 3 ? "1px solid var(--kv-rule)" : "none",
            background: i % 2 === 0 ? "var(--kv-paper)" : "var(--kv-off-white)",
          }}>
            <div className="t-label">{c.t} · {c.role}</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em", marginTop: 10, color: "var(--kv-black)", lineHeight: 1.3 }}>{c.n}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, color: "var(--kv-ink-700)", marginTop: 8, lineHeight: 1.55 }}>{c.use}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── 11 · DATA VISUALIZATION ──────────────────── */
function DataViz() {
  return (
    <section className="page" data-screen-label="11 Data viz">
      <SectionHead
        num="11 · DATA VISUALIZATION"
        title="Hairlines, sage fills, captioned in mono."
        lede="Charts read as documents, not dashboards. The line stroke is ink. The fill below is sage at 18% opacity. Every chart carries its methodology line beneath the source attribution."
      />

      {/* Line chart */}
      <Plate title="Index time series · monthly" sub="Anchor format for reports and web" tag="LINE" full minH={420}>
        <div style={{ width: "100%", height: 420, background: "var(--kv-bone, #fafafa)", padding: 36, boxSizing: "border-box" }}>
          <div className="t-label">// FIG. 11A · CVREI Listing Index</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 11, color: "var(--kv-gray-500)", marginTop: 4 }}>Monthly · base = Jan 2024 · monitored asking-price listings</div>
          <svg viewBox="0 0 1000 280" style={{ width: "100%", height: 280, marginTop: 12 }}>
            {[100, 105, 110, 115].map(g => {
              const y = 20 + (1 - (g - 98) / 20) * 220;
              return <g key={g}><line x1="50" x2="980" y1={y} y2={y} stroke="rgba(0,0,0,0.08)"/><text x="40" y={y+3} textAnchor="end" style={{fontFamily:"var(--kv-mono)",fontSize:10,fill:"var(--kv-gray-500)"}}>{g}</text></g>;
            })}
            <path d="M50,200 L100,195 L150,190 L200,180 L250,170 L300,160 L350,150 L400,140 L450,130 L500,120 L550,110 L600,98 L650,88 L700,78 L750,68 L800,60 L850,50 L900,40 L950,28 L980,20 L980,250 L50,250 Z" fill="rgba(142,207,191,0.18)"/>
            <path d="M50,200 L100,195 L150,190 L200,180 L250,170 L300,160 L350,150 L400,140 L450,130 L500,120 L550,110 L600,98 L650,88 L700,78 L750,68 L800,60 L850,50 L900,40 L950,28 L980,20" fill="none" stroke="var(--kv-black)" strokeWidth="1.5"/>
            <circle cx="980" cy="20" r="4" fill="var(--kv-black)"/>
          </svg>
          <div style={{ paddingTop: 12, marginTop: 8, borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-gray-500)" }}>
            <span>Source · monitored listing set · Issued by AREI</span>
            <span>Not transaction prices or valuations</span>
          </div>
        </div>
      </Plate>

      {/* KPI patterns + future pattern */}
      <div className="subhead"><span className="subhead-kicker">11.2</span><span>KPI cards &amp; tickers</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Plate title="KPI · primary" sub="Active product · methodology line at foot" tag="ACTIVE" minH={240}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
            <div>
              <div className="t-label">CVREI Listing Index</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 14 }}>116.4</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-green-deep)", marginTop: 8 }}>+1.1 pts MoM</div>
            </div>
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)", lineHeight: 1.6 }}>
              Based on monitored asking-price listings. Not transaction prices.
            </div>
          </div>
        </Plate>
        <Plate title="KPI · on ink" sub="Same content. Sage accents." tag="ACTIVE" bg="var(--kv-black)" minH={240}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", color: "var(--kv-paper)" }}>
            <div>
              <div className="t-label" style={{ color: "rgba(255,255,255,0.55)" }}>CVREI Listing Index</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 14 }}>116.4</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-green)", marginTop: 8 }}>+1.1 pts MoM</div>
            </div>
            <div style={{ paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--kv-mono)", fontSize: 9, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              Based on monitored asking-price listings. Not transaction prices.
            </div>
          </div>
        </Plate>
        <Plate title="Future-pattern tile" sub="High-frequency tickers are NOT a current product" tag="FUTURE PATTERN" minH={240}>
          <div style={{
            position: "relative", height: "100%",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            opacity: 0.55,
          }}>
            <div>
              <div className="t-label">CVREI · 24H</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 14 }}>116.42</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-green-deep)", marginTop: 8 }}>+0.04% · 24H</div>
            </div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)" }}>—</div>
            <div style={{
              position: "absolute", inset: -8,
              border: "1.5px solid var(--kv-warn)",
              transform: "rotate(-1deg)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", top: -10, right: 8,
              padding: "3px 8px", background: "var(--kv-warn)", color: "var(--kv-paper)",
              fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>FUTURE PATTERN · NOT ACTIVE PRODUCT</div>
          </div>
        </Plate>
      </div>

      {/* Forbidden viz */}
      <div className="subhead"><span className="subhead-kicker">11.3</span><span>Forbidden patterns</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          ["Stock-style 24h moves",     "We publish monthly. Never imply intra-day or daily price action."],
          ["Dollar-symbol price tickers", "$ on the index value implies money. The index is points, not currency."],
          ["Live / blinking values",      "No flashing, no live counters, no buy/sell language."],
        ].map(([t,d]) => (
          <div key={t} style={{ padding: 22, background: "rgba(196,74,58,0.10)", border: "1px solid rgba(196,74,58,0.35)" }}>
            <StatusStamp kind="dont" />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 6 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── 12 · REPORTS &amp; BROCHURES ─────────────── */
function ReportsBrochures() {
  return (
    <section className="page" data-screen-label="12 Reports">
      <SectionHead
        num="12 · REPORTS &amp; BROCHURES"
        title="Quarterly briefings. A4 portrait. Cover, contents, charts."
        lede="The flagship publication. Three layouts: cover, methodology overview spread, and chart spread. The cover always carries the country lockup at editorial scale and the publisher line below."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Cover */}
        <Plate title="Q1 briefing · cover" sub="Cape Verde · A4 portrait · 595×842 → shown at 0.65×" tag="REPORT · COVER" full minH={620}>
          <div style={{ width: 386, height: 547, background: "var(--kv-paper)", padding: "34px 36px", boxSizing: "border-box", display: "flex", flexDirection: "column", margin: "24px auto", border: "1px solid var(--kv-rule)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottom: "1px solid var(--kv-rule)" }}>
              <CompactLockup m={MARKETS[2]} size={8} />
              <span style={{ fontFamily: "var(--kv-mono)", fontSize: 7, letterSpacing: "0.2em", color: "var(--kv-gray-500)" }}>VOL.02 · Q1 2026</span>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 36 }}>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.22em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>Q1 Listing Index Briefing</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 30, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1, marginTop: 18, color: "var(--kv-black)" }}>
                Asking prices,<br/>inventory,<br/>coverage.
              </div>
              <div style={{ fontFamily: "var(--kv-sans)", fontSize: 10, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 18, maxWidth: 280 }}>
                Cape Verde, January–March 2026. 16 monitored locations across 4 islands.
              </div>
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: "var(--kv-mono)", fontSize: 7, letterSpacing: "0.18em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>
              <span>Published by AREI</span>
              <span>Listing-based · not transactions</span>
            </div>
          </div>
        </Plate>

        {/* Methodology spread */}
        <Plate title="Methodology spread" sub="Page 02 · disclosure-first" tag="REPORT · INSIDE" full minH={620}>
          <div style={{ width: 386, height: 547, background: "var(--kv-paper)", padding: "30px 32px", boxSizing: "border-box", margin: "24px auto", display: "flex", flexDirection: "column", border: "1px solid var(--kv-rule)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 7.5, letterSpacing: "0.16em", color: "var(--kv-gray-500)" }}>
              <span>02 · METHODOLOGY</span>
              <span>CVREI · Q1 2026</span>
            </div>
            <div style={{ flex: 1, paddingTop: 22 }}>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "var(--kv-gray-500)" }}>// 02</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.25, marginTop: 8 }}>
                What this index measures.
              </div>
              <p style={{ fontFamily: "var(--kv-sans)", fontSize: 10, lineHeight: 1.7, color: "var(--kv-ink-700)", marginTop: 16 }}>
                The Cape Verde Real Estate Index tracks public property listings from monitored sources. Future releases will publish a CVREI Listing Index point — a measure of asking-price movement in the monitored set — once historical coverage matures.
              </p>
              <p style={{ fontFamily: "var(--kv-sans)", fontSize: 10, lineHeight: 1.7, color: "var(--kv-ink-700)", marginTop: 10 }}>
                The index does not, and will not, represent transaction prices, valuations, or official market prices.
              </p>
              <div style={{ marginTop: 22, padding: "12px 14px", borderLeft: "2px solid var(--kv-black)", background: "var(--kv-off-white)" }}>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: "var(--kv-black)", textTransform: "uppercase" }}>Disclosure</div>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-black)", marginTop: 5, lineHeight: 1.6 }}>
                  Listing-based market signal — not investment advice or a buy/sell recommendation.
                </div>
              </div>
            </div>
            <div style={{ paddingTop: 10, borderTop: "1px solid var(--kv-rule)", display: "flex", justifyContent: "space-between", fontFamily: "var(--kv-mono)", fontSize: 7, letterSpacing: "0.14em", color: "var(--kv-gray-500)" }}>
              <span>AREI · MAY 2026</span><span>02 / 24</span>
            </div>
          </div>
        </Plate>
      </div>

      {/* Chart spread */}
      <div className="subhead"><span className="subhead-kicker">12.2</span><span>Chart spread · paired pages</span></div>
      <Plate title="Spread · index series + locations table" sub="A4 portrait · two-page reading order" tag="REPORT · SPREAD" full minH={520}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: 480, gap: 1, background: "var(--kv-rule)", padding: 24 }}>
          {/* Left page */}
          <div style={{ background: "var(--kv-paper)", padding: 28, display: "flex", flexDirection: "column" }}>
            <div className="t-label">// 06 · INDEX SERIES</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 500, marginTop: 8 }}>CVREI · 24-month series</div>
            <svg viewBox="0 0 400 220" style={{ width: "100%", marginTop: 18 }}>
              {[100, 110, 120].map(g => {
                const y = 20 + (1 - (g - 95) / 30) * 180;
                return <line key={g} x1="40" x2="390" y1={y} y2={y} stroke="rgba(0,0,0,0.08)"/>;
              })}
              <path d="M40,150 L80,140 L120,130 L160,120 L200,108 L240,90 L280,72 L320,55 L360,42 L390,30" fill="none" stroke="var(--kv-black)" strokeWidth="1.5"/>
            </svg>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)", paddingTop: 10, borderTop: "1px solid var(--kv-rule)" }}>
              Source · monitored listing set · methodology v0.3 · monitored asking-price listings (not transactions).
            </div>
          </div>
          {/* Right page */}
          <div style={{ background: "var(--kv-paper)", padding: 28, display: "flex", flexDirection: "column" }}>
            <div className="t-label">// 07 · BY LOCATION</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 500, marginTop: 8 }}>16 monitored markets</div>
            <div style={{ marginTop: 18, fontFamily: "var(--kv-mono)", fontSize: 11 }}>
              {[
                ["Praia, Santiago", "118.2", "+1.4"],
                ["Mindelo, S.Vicente", "114.6", "+0.9"],
                ["Sal Rei, Boa Vista", "121.0", "+1.6"],
                ["Espargos, Sal", "117.8", "+1.1"],
                ["Tarrafal, Santiago", "108.4", "+0.6"],
                ["Sta. Maria, Sal", "119.5", "+1.3"],
              ].map((r, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1.5fr 60px 60px",
                  gap: 8, padding: "8px 0",
                  borderBottom: "1px solid var(--kv-rule-soft, rgba(0,0,0,0.08))",
                }}>
                  <span>{r[0]}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r[1]}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--kv-green-deep)" }}>{r[2]}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)", paddingTop: 10, borderTop: "1px solid var(--kv-rule)" }}>
              Asking-price index points · base = Jan 2024 · monitored set.
            </div>
          </div>
        </div>
      </Plate>
    </section>
  );
}

Object.assign(window, {
  Typography, WebIdentity, MobileIdentity, DataLanguage, DataViz, ReportsBrochures,
});
