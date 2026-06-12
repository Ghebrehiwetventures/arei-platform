/* ══════════════════════════════════════════════════════════
   AREI BRAND GUIDELINES · SECTIONS 13-18
   13 Social · 14 Merch · 15 Photography
   16 Voice · 17 Do/Don't · 18 System overview
   ══════════════════════════════════════════════════════════ */

/* ───────── 13 · SOCIAL MEDIA ────────────────────────── */
function SocialMedia() {
  return (
    <section className="page" data-screen-label="13 Social">
      <SectionHead
        num="13 · SOCIAL MEDIA"
        title="Editorial tiles. No emoji. No exclamation marks."
        lede="Social posts behave like report covers, not adverts. Country lockup at top. Index value as the hero. Methodology line as part of the composition — never a footnote."
      />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 32 }}>
        {/* IG square */}
        <SocialTile w={360} h={360} label="Instagram · 1:1 release tile">
          <div style={{ width: "100%", height: "100%", padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid var(--kv-rule)" }}>
              <CompactLockup m={MARKETS[2]} size={9} />
              <span style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.18em", color: "var(--kv-gray-500)" }}>VOL.02 · MAR 2026</span>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="t-label">CVREI Listing Index</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 96, fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 0.9, marginTop: 8 }}>116.4</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, color: "var(--kv-black)", marginTop: 12, lineHeight: 1.4 }}>Tracked asking prices rose <span style={{ color: "var(--kv-green-deep)" }}>+1.1 pts</span> month-over-month.</div>
            </div>
            <div style={{ paddingTop: 10, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 8, color: "var(--kv-gray-500)", lineHeight: 1.55 }}>
              Methodology: monitored listings, not transaction prices.
            </div>
          </div>
        </SocialTile>

        {/* Story 9:16 + LinkedIn 16:9 stacked */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 24 }}>
          <SocialTile w={180} h={320} label="Story · 9:16">
            <div style={{ width: "100%", height: "100%", padding: "20px 16px", boxSizing: "border-box", background: "var(--kv-black)", color: "var(--kv-paper)", display: "flex", flexDirection: "column", gap: 10 }}>
              <CompactLockup m={MARKETS[2]} size={7} fg="var(--kv-paper)" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>CVREI · MAR'26</div>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 44, fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 0.95, marginTop: 8 }}>116.4</div>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-green)", marginTop: 6 }}>+1.1 pts MoM</div>
              </div>
              <div style={{ paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.18)", fontFamily: "var(--kv-mono)", fontSize: 7, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, letterSpacing: "0.04em" }}>
                Listing-based market signal.<br/>Not transactions.
              </div>
            </div>
          </SocialTile>

          <SocialTile w={520} h={292} label="LinkedIn · 16:9 article header">
            <div style={{ width: "100%", height: "100%", padding: "24px 30px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CompactLockup m={MARKETS[2]} size={10} />
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.18em", color: "var(--kv-gray-500)" }}>Q1 2026 · BRIEFING NO. 02</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="t-label" style={{ fontSize: 8 }}>CVREI Listing Index</div>
                  <div style={{ fontFamily: "var(--kv-mono)", fontSize: 26, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.1, marginTop: 6 }}>
                    Asking prices held<br/>+1.1 in March.
                  </div>
                </div>
                <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, flexShrink: 0 }}>116.4</div>
              </div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 8, color: "var(--kv-gray-500)", paddingTop: 8, borderTop: "1px solid var(--kv-rule)" }}>
                Listing-based market signal · not transaction prices · published by AREI
              </div>
            </div>
          </SocialTile>
        </div>
      </div>

      <div className="subhead"><span className="subhead-kicker">13.2</span><span>Social rules</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          ["No emoji",                  "Tone is institutional. Country flags, charts, pointing-fingers all forbidden."],
          ["No exclamation marks",      "The voice does not exclaim, sell, or hype. Periods only."],
          ["Methodology in-frame",      "The disclosure line is part of the artwork, never a comment-thread footnote."],
        ].map(([t, d]) => (
          <div key={t} className="bg-card" style={{ padding: 22 }}>
            <StatusStamp kind="dont" />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 6 }}>{d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialTile({ w, h, label, children }) {
  return (
    <div>
      <div style={{ width: w, height: h, background: "var(--kv-bone, #fafafa)", border: "1px solid var(--kv-rule)" }}>
        {children}
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.16em", color: "var(--kv-gray-500)", textTransform: "uppercase" }}>{label} · {w}×{h}</div>
    </div>
  );
}

/* ───────── 14 · MERCHANDISE &amp; PHYSICAL ───────────── */
function Merchandise() {
  return (
    <section className="page" data-screen-label="14 Merch">
      <SectionHead
        num="14 · MERCHANDISE &amp; PHYSICAL"
        title="Minimal premium. Mark or compact lockup only."
        lede="Physical objects carry the mark, the compact lockup, or a single tier-3 ticker — never the full three-line stack. Materials are matte. Edges are square. No applied colour beyond the palette."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <Plate title="Embossed notebook · A5" sub="Black cloth · sage foil mark" tag="OBJECT" minH={260}>
          <div style={{ width: 160, height: 220, background: "var(--kv-black)", margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20, boxSizing: "border-box", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)" }}>
            <Mark size={28} color="var(--kv-green)" />
            <div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)" }}>RECORDS · METHODOLOGY · SIGNAL</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: "var(--kv-green)", marginTop: 8 }}>AREI</div>
            </div>
          </div>
        </Plate>

        <Plate title="Tote · 10oz canvas" sub="Bone canvas · ink screen-print" tag="OBJECT" minH={260}>
          <div style={{ width: 180, height: 220, background: "var(--kv-bone, #fafafa)", margin: "0 auto", border: "1px solid var(--kv-rule)", padding: 24, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Mark size={36} />
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.5, color: "var(--kv-black)" }}>
              AREI<br/><span style={{ fontWeight: 400, opacity: 0.55 }}>RECORDS · METHODOLOGY · SIGNAL</span>
            </div>
          </div>
        </Plate>

        <Plate title="Embossed envelope" sub="Off-white card · blind emboss" tag="OBJECT" minH={260}>
          <div style={{ width: 200, height: 130, background: "var(--kv-off-white)", margin: "32px auto", border: "1px solid var(--kv-rule)", padding: 18, boxSizing: "border-box", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Mark size={20} color="rgba(0,0,0,0.4)" />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 7, letterSpacing: "0.18em", color: "var(--kv-gray-500)" }}>AREI · RESEARCH &amp; METHODOLOGY</div>
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 7, color: "var(--kv-gray-500)", marginTop: 2 }}>arei.africa</div>
            </div>
          </div>
        </Plate>

        <Plate title="Conference pin" sub="Brushed brass · 22mm" tag="OBJECT" minH={260}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <div style={{ width: 110, height: 110, borderRadius: "50%", background: "linear-gradient(135deg, #b8a988, #8a7d61)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.15)" }}>
              <Mark size={48} color="#0a0a0a" />
            </div>
          </div>
        </Plate>
      </div>

      <div className="subhead"><span className="subhead-kicker">14.2</span><span>Material rules</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: "1px solid var(--kv-rule)" }}>
        {[
          ["Substrate", "Bone canvas, off-white card, black cloth, brushed brass, untreated wood. No glossy plastics."],
          ["Print",     "Single ink only. Screen-print or blind emboss. No gradients. No photo overlays."],
          ["Type",      "Inter. Engraved or screen — never raised gloss."],
          ["Forbidden", "Country flag colours, mascot illustrations, slogans, ironic copy, country emoji."],
        ].map((c, i) => (
          <div key={c[0]} style={{ padding: 22, borderRight: i < 3 ? "1px solid var(--kv-rule)" : "none" }}>
            <div className="t-label">{c[0]}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 8 }}>{c[1]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────── 15 · PHOTOGRAPHY ─────────────────────────── */
function Photography() {
  return (
    <section className="page" data-screen-label="15 Photography">
      <SectionHead
        num="15 · PHOTOGRAPHY &amp; IMAGERY"
        title="Documentary, restrained. Architecture and ground-truth."
        lede="The image library is editorial, not promotional. Real buildings, real streets, soft natural light. No drone money-shots, no luxury staging, no vibrant filters."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { t: "Architecture · ground level", d: "Eye-level façades, midday or overcast. The building is the subject — not the lifestyle." },
          { t: "Street pattern",              d: "Wide views of monitored locations. People may appear; they are never the subject." },
          { t: "Document · register",         d: "Close-ups of signage, paperwork, plates, cadastre numbers. The data origin." },
        ].map((p, i) => (
          <Plate key={p.t} title={p.t} sub={p.d} tag={`PLATE 0${i+1}`} pad={0} full minH={260}>
            <div style={{
              width: "100%", height: 260, position: "relative", overflow: "hidden",
              background: i === 0
                ? "linear-gradient(135deg, #c9c4ba 0%, #aaa39a 60%, #6f6a62 100%)"
                : i === 1
                ? "linear-gradient(180deg, #b8b6ad 0%, #948f87 100%)"
                : "linear-gradient(180deg, #ddd8cd 0%, #b3ad9f 100%)"
            }}>
              {/* placeholder texture lines to suggest restraint */}
              {Array.from({length: 18}).map((_, k) => (
                <span key={k} style={{
                  position: "absolute", left: 0, right: 0, top: `${k * 6 + 4}%`,
                  height: 1, background: "rgba(0,0,0,0.04)",
                }} />
              ))}
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                justifyContent: "space-between", padding: 18,
                color: "rgba(255,255,255,0.85)", fontFamily: "var(--kv-mono)",
              }}>
                <span style={{ fontSize: 9, letterSpacing: "0.18em" }}>PL.0{i + 1} · DOCUMENTARY</span>
                <span style={{ fontSize: 9, letterSpacing: "0.16em", textAlign: "right", textTransform: "uppercase" }}>placeholder · supply original imagery</span>
              </div>
            </div>
          </Plate>
        ))}
      </div>

      <div className="subhead"><span className="subhead-kicker">15.2</span><span>Treatment &amp; tone</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="bg-card" style={{ padding: 24 }}>
          <StatusStamp kind="do" />
          <ul style={{ listStyle: "none", padding: 0, marginTop: 14, display: "grid", gap: 10, fontFamily: "var(--kv-sans)", fontSize: 13, color: "var(--kv-ink-700)", lineHeight: 1.6 }}>
            <li>— Natural light. Overcast preferred.</li>
            <li>— Calm desaturation; mid-tones, no crushed blacks.</li>
            <li>— Architecture, signage, cadastral context.</li>
            <li>— People only as scale, never as protagonists.</li>
          </ul>
        </div>
        <div className="bg-card" style={{ padding: 24, background: "rgba(196,74,58,0.06)" }}>
          <StatusStamp kind="dont" />
          <ul style={{ listStyle: "none", padding: 0, marginTop: 14, display: "grid", gap: 10, fontFamily: "var(--kv-sans)", fontSize: 13, color: "var(--kv-ink-700)", lineHeight: 1.6 }}>
            <li>— Drone hero shots, golden-hour luxury sweeps.</li>
            <li>— Saturated tropical / "destination" photography.</li>
            <li>— Models, lifestyle pose-outs, agent portraits.</li>
            <li>— Stock photos of currency, keys, handshakes.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────── 16 · VOICE &amp; COPY ──────────────────────── */
function VoiceCopy() {
  return (
    <section className="page" data-screen-label="16 Voice">
      <SectionHead
        num="16 · VOICE &amp; COPY"
        title="Civic register. Plain, exact, never promotional."
        lede="The voice is that of a published institution. Sentences are short and declarative. No marketing verbs. No first-person plural unless attributing methodology to AREI."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          { t: "Plain", d: "Use everyday words. 'Asking prices', not 'price discovery dynamics'." },
          { t: "Exact", d: "State periods, sources, sample sizes. Numbers carry units." },
          { t: "Sober", d: "No exclamation, no superlatives, no urgency cues." },
          { t: "Cited", d: "Every claim points to method or source. 'Per AREI methodology v0.3'." },
        ].map(p => (
          <div key={p.t} className="bg-card" style={{ padding: 28 }}>
            <div className="t-label">{p.t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 14, lineHeight: 1.65, color: "var(--kv-ink-700)", marginTop: 10 }}>{p.d}</div>
          </div>
        ))}
      </div>

      <div className="subhead"><span className="subhead-kicker">16.2</span><span>Sample copy · rewritten</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[
          {
            wrong: "Cape Verde property prices are SOARING 🚀 — buy now before they get even hotter!",
            right: "CVREI Listing Index: 116.4 in March 2026, +1.1 pts month-over-month. Based on monitored asking-price listings — not transactions.",
          },
          {
            wrong: "Our exclusive market value index reveals the true price of homes across the islands.",
            right: "The CVREI Listing Index measures asking-price movement across the monitored set. It does not represent valuations or transaction prices.",
          },
          {
            wrong: "Don't miss out on Africa's hottest real estate market — get the data nobody else has!",
            right: "AREI publishes a monthly listing-based market signal across seven African markets. Methodology is public.",
          },
        ].map((c, i) => (
          <React.Fragment key={i}>
            <div style={{ padding: 20, background: "rgba(196,74,58,0.08)", border: "1px solid rgba(196,74,58,0.3)" }}>
              <StatusStamp kind="dont" />
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, lineHeight: 1.55, color: "var(--kv-ink-700)", marginTop: 12, textDecoration: "line-through", textDecorationColor: "rgba(196,74,58,0.5)" }}>{c.wrong}</div>
            </div>
            <div style={{ padding: 20, background: "rgba(142,207,191,0.15)", border: "1px solid rgba(45,74,66,0.3)" }}>
              <StatusStamp kind="do" />
              <div style={{ fontFamily: "var(--kv-mono)", fontSize: 13, lineHeight: 1.55, color: "var(--kv-black)", marginTop: 12, fontWeight: 500 }}>{c.right}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

/* ───────── 17 · DO / DON'T (visual) ─────────────────── */
function DoDont() {
  return (
    <section className="page" data-screen-label="17 Do/Don't">
      <SectionHead
        num="17 · DO / DON'T"
        title="The visual rules, side by side."
        lede="Decisions you will face on every brief. Match the left column. Avoid the right."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {/* 1 · Lockup */}
        <Plate title="Three-line ceremonial lockup" tag="DO" minH={200}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <PrimaryLockup m={MARKETS[2]} h={56} />
          </div>
        </Plate>
        <Plate title="Don't tilt or stylize the lockup" tag="DON'T" minH={200}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", position: "relative" }}>
            <div style={{ transform: "skewX(-8deg) rotate(-3deg)", filter: "blur(0.4px)" }}>
              <PrimaryLockup m={MARKETS[2]} h={48} fg="#c44a3a" />
            </div>
            <span style={{ position: "absolute", inset: "10% 8%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-3deg)" }} />
          </div>
        </Plate>

        {/* 2 · Index value */}
        <Plate title="Index value with methodology line" tag="DO" minH={200}>
          <div style={{ padding: 6 }}>
            <div className="t-label">CVREI Listing Index</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 10 }}>116.4 <span style={{ fontSize: 16, color: "var(--kv-green-deep)" }}>+1.1</span></div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--kv-rule)", fontFamily: "var(--kv-mono)", fontSize: 9, color: "var(--kv-gray-500)", lineHeight: 1.6 }}>
              Based on monitored asking-price listings.<br/>Not transaction prices or valuations.
            </div>
          </div>
        </Plate>
        <Plate title="Don't show value as a stock price" tag="DON'T" minH={200}>
          <div style={{ padding: 6, position: "relative" }}>
            <div className="t-label">CAPE VERDE INDEX</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 56, fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 10, color: "var(--kv-warn)" }}>$116.42 <span style={{ fontSize: 16 }}>▲0.04%</span></div>
            <div style={{ marginTop: 8, fontFamily: "var(--kv-mono)", fontSize: 10, color: "var(--kv-warn)" }}>↑ LIVE · 24H</div>
            <span style={{ position: "absolute", inset: "0% 0%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-1deg)" }} />
          </div>
        </Plate>

        {/* 3 · Country variant */}
        <Plate title="Same lockup, country line only changes" tag="DO" minH={200}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingLeft: 4 }}>
            <PrimaryLockup m={MARKETS[2]} h={32} />
            <PrimaryLockup m={MARKETS[3]} h={32} />
            <PrimaryLockup m={MARKETS[4]} h={32} />
          </div>
        </Plate>
        <Plate title="Don't invent country sub-brands" tag="DON'T" minH={200}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 4, position: "relative" }}>
            <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 22, color: "#c44a3a" }}>CapeVerdex™</span>
            <span style={{ fontFamily: "Impact, sans-serif", fontSize: 22, color: "#2a6fdb", letterSpacing: "0.04em" }}>NaijaIndex</span>
            <span style={{ fontFamily: "var(--kv-sans)", fontSize: 22, fontWeight: 800, color: "#c44a3a" }}>KENYA<span style={{ color: "#2d4a42" }}>realty</span></span>
            <span style={{ position: "absolute", inset: "-6% 0%", border: "1.5px solid var(--kv-warn)", transform: "rotate(-1deg)" }} />
          </div>
        </Plate>
      </div>
    </section>
  );
}

/* ───────── 18 · SYSTEM OVERVIEW ─────────────────────── */
function SystemOverview() {
  return (
    <section className="page" data-screen-label="18 Overview">
      <SectionHead
        num="18 · SYSTEM OVERVIEW"
        title="The whole identity, on one sheet."
        lede="A ready reference for any contributor: the mark, lockup, palette, type, naming tier, disclosure rule, and primary surfaces — at the smallest legible scale."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* Mark + lockups */}
        <div className="bg-card" style={{ padding: 28 }}>
          <div className="t-label">Mark · D · Layers</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
            <Mark size={72} />
            <CompactLockup m={MARKETS[0]} size={11} />
            <CompactLockup m={MARKETS[2]} size={11} />
            <CompactLockup m={MARKETS[3]} size={11} />
          </div>
          <div style={{ marginTop: 22 }}>
            <div className="t-label">Primary lockup</div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <PrimaryLockup m={MARKETS[2]} h={36} />
              <PrimaryLockup m={MARKETS[3]} h={36} />
            </div>
          </div>
        </div>

        {/* Palette mini */}
        <div className="bg-card" style={{ padding: 28 }}>
          <div className="t-label">Palette</div>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "1px solid var(--kv-rule)" }}>
            {[
              { c: "#0A0A0A", n: "Ink", fg: "#fafafa" },
              { c: "#FAFAFA", n: "Bone", fg: "#0a0a0a" },
              { c: "#F2F0EC", n: "Off-white", fg: "#0a0a0a" },
              { c: "#8ECFBF", n: "Sage", fg: "#0a0a0a" },
              { c: "#2D4A42", n: "Sage deep", fg: "#fafafa" },
              { c: "#888888", n: "Gray 500", fg: "#fafafa" },
              { c: "#C44A3A", n: "Coral", fg: "#fafafa" },
              { c: "#FFFFFF", n: "Paper", fg: "#0a0a0a" },
            ].map((s, i) => (
              <div key={s.c} style={{
                background: s.c, color: s.fg, padding: 12, height: 64,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                borderRight: (i % 4 !== 3) ? "1px solid var(--kv-rule)" : "none",
                borderBottom: i < 4 ? "1px solid var(--kv-rule)" : "none",
              }}>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.75 }}>{s.n}</span>
                <span style={{ fontFamily: "var(--kv-mono)", fontSize: 9, opacity: 0.85 }}>{s.c}</span>
              </div>
            ))}
          </div>
          <div className="t-label" style={{ marginTop: 22 }}>Type</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 12, marginTop: 8 }}>Inter · 400–600</div>
        </div>
      </div>

      {/* Naming tier + disclosure */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="bg-card" style={{ padding: 28 }}>
          <div className="t-label">Naming tier</div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "70px 1fr", rowGap: 10, columnGap: 16, fontFamily: "var(--kv-mono)", fontSize: 12 }}>
            <span style={{ color: "var(--kv-gray-500)" }}>T1 ·</span><span>Cape Verde Real Estate Index <span style={{ color: "var(--kv-gray-500)" }}>· ceremonial</span></span>
            <span style={{ color: "var(--kv-gray-500)" }}>T2 ·</span><span>CVREI Listing Index <span style={{ color: "var(--kv-gray-500)" }}>· metric</span></span>
            <span style={{ color: "var(--kv-gray-500)" }}>T3 ·</span><span>CVREI <span style={{ color: "var(--kv-gray-500)" }}>· ticker / prose</span></span>
            <span style={{ color: "var(--kv-gray-500)" }}>T4 ·</span><span>AREI <span style={{ color: "var(--kv-gray-500)" }}>· publisher / methodology</span></span>
          </div>
        </div>

        <div style={{ padding: 28, background: "var(--kv-black)", color: "var(--kv-paper)" }}>
          <div className="t-label" style={{ color: "rgba(255,255,255,0.55)" }}>Mandatory disclosure</div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 18, fontWeight: 500, lineHeight: 1.5, marginTop: 14 }}>
            "Based on monitored asking-price listings. Not transaction prices or valuations."
          </div>
          <div style={{ fontFamily: "var(--kv-mono)", fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, marginTop: 14 }}>
            Required wherever an index value is shown without prose context.
          </div>
        </div>
      </div>

      {/* Three rules */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
        {[
          { n: "01", t: "State the metric, then what it's based on", d: "Anywhere a number appears without prose context — KPI cards, social tiles, charts — pair it with the methodology line." },
          { n: "02", t: "Use the right tier of name for the surface", d: "Tier-1 ceremonial. Tier-2 metric. Tier-3 ticker. Tier-4 publisher. Don't conflate them." },
          { n: "03", t: "Never speak as if these are transactions",  d: "'Tracked asking prices', not 'prices'. 'Listing-based signal', not 'price index'." },
        ].map(r => (
          <div key={r.n} className="bg-card" style={{ padding: 24 }}>
            <div className="t-label">RULE · {r.n}</div>
            <div style={{ fontFamily: "var(--kv-mono)", fontSize: 15, fontWeight: 500, marginTop: 12, lineHeight: 1.35 }}>{r.t}</div>
            <div style={{ fontFamily: "var(--kv-sans)", fontSize: 12, lineHeight: 1.6, color: "var(--kv-ink-700)", marginTop: 10 }}>{r.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, {
  SocialMedia, Merchandise, Photography, VoiceCopy, DoDont, SystemOverview,
});
