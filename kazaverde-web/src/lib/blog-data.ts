export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  /* Original publication date (datePublished). */
  /* Last factual-edit date (dateModified) — article-owned, never a global
   * constant. Must be a valid ISO date and >= `date`. */
  modifiedAt?: string;
  readTime: string;
  heroImage?: string;
  content: string;
  tags: string[];
  /* Ordered citation ids — resolved against the single canonical registry in
   * sources.data.mjs. Inline <sup class="kv-cite">[n]</sup> markers in `content`
   * use the 1-based position in this list; the Sources section is rendered from
   * the registry (BlogPost.tsx + prerender) so source metadata lives in one place. */
  sourceIds?: string[];
}

const _ALL_BLOG_ARTICLES = [
  {
    slug: "best-real-estate-agents-cape-verde",
    title: "Best Real Estate Agents in Cape Verde 2026? A Neutral, Index-Based Overview",
    description:
      "People search for the best real estate agents in Cape Verde, but no neutral dataset proves who is best. See which Cape Verde real estate agencies and portals the index tracks.",
    date: "2026-05-23",
    modifiedAt: "2026-06-19",
    readTime: "8 min read",
    tags: ["Buying", "Agents", "Guide"],
    content: `<p><em>Last updated: May 2026</em></p>
<p>"Best real estate agents in Cape Verde" is one of the most common searches buyers run before they start looking at property. It is a fair question — but there is no neutral, public dataset that proves which Cape Verde real estate agents are objectively best. The agencies that rank for that phrase are usually the ones describing themselves that way.</p>
<p>This page takes a different approach. The <a href="/listings">Cape Verde Real Estate Index</a> is an independent property data platform that aggregates listings from across the market into one searchable index. We do not rank, endorse, or recommend agents. Instead, this page shows which real estate agencies in Cape Verde and which property portals the index currently tracks, what is publicly visible from their listing coverage, and what buyers should verify for themselves.</p>
<blockquote><p>The Cape Verde Real Estate Index is not an agent, sells nothing, and takes no referral fees. We track listing sources and help buyers compare market visibility — not service quality. Always verify an agency's credentials, fees, and representation, and instruct an independent Cape Verdean lawyer before acting.</p></blockquote>
<hr>
<h2>How to read this page</h2>
<p>A few things worth being clear about before the list:</p>
<ul>
<li><strong>This is not a ranking.</strong> Listing the agencies the index tracks is not a judgment of who is best, and the order on this page carries no meaning.</li>
<li><strong>We only cover sources we track.</strong> If a Cape Verde agency you expect to see is missing, the index has not onboarded their listings yet. Coverage expands continuously.</li>
<li><strong>Listing coverage is not market share.</strong> How many listings a source shows reflects how it publishes online, not how good it is or how much it sells. The live figures on <a href="/market">/market</a> and <a href="/listings">/listings</a> are always authoritative.</li>
<li><strong>Interview notes are the agency's own words.</strong> Where an agency has spoken with us directly, we say so and attribute the claim to them. We have not independently verified every operational detail.</li>
</ul>
<hr>
<h2>Agents and portals currently tracked by the index</h2>
<p>The real estate agencies and portals below are the Cape Verde property sources the index currently tracks, listed in no particular order. Each entry notes what is publicly visible from listing coverage, with additional agency-attributed details where available.</p>
<h3>CCore Investments</h3>
<p><a href="https://www.ccoreinvestments.com">ccoreinvestments.com</a>. When we spoke with the agency, it described itself as active on all four main islands — Sal, Boa Vista, Santiago, and São Vicente — and as Portuguese-speaking and locally rooted. According to the agency, it maintains a local network on each island, with working relationships among promoters, construction companies, lawyers, and rental companies, and works to a fixed 5% commission with no markup above the asking price. Asked what it offers international buyers, the agency told us that knowing "who to trust" is the most valuable thing it provides. These are agency-attributed details, not quality assessments by the index.</p>
<h3>RE/MAX (Sal)</h3>
<p><a href="https://www.remax.cv">remax.cv</a>. According to the agency, the RE/MAX office has been based on Sal for two and a half years and works with a local Cape Verdean business partner for local-market access. The agency told us (in early 2026) that it serves English- and German-speaking buyers — and described German buyers as, in its own experience, the second-largest nationality among its purchasers on Sal — and that it is expanding into Santo Antão listings. These are the agency's own statements to us, dated to that conversation; the index has not independently verified them and they are not quality assessments.</p>
<h3>Terra Cabo Verde</h3>
<p><a href="https://terracaboverde.com">terracaboverde.com</a>. According to its website, Terra Cabo Verde presents itself as a real estate agency based in Sal Rei, Boa Vista, offering brokerage, development, investment, and property services across Boa Vista and Sal. The index tracks listings from this source across multiple islands. These are agency-attributed details, not quality assessments by the index.</p>
<h3>Estate CV</h3>
<p><a href="https://estatecv.com">estatecv.com</a>. The site presents itself as a Cape Verde property partner that helps buyers find second homes and investment properties, with about and team content referencing real estate, investment, and technical property support for Cape Verde sales. Publicly visible listings indicate multi-island coverage, including Santiago, Sal, and Boa Vista. These are agency-attributed details, not quality assessments by the index.</p>
<h3>Homes Casa Verde</h3>
<p><a href="https://www.homescasaverde.com">homescasaverde.com</a>. According to its website, Homes Casa Verde focuses on Cape Verde property, particularly on Sal, listing apartments, villas, and land alongside investment opportunities and buyer guidance. The index tracks listings from this source on Sal and across several other islands. These are agency-attributed details, not quality assessments by the index.</p>
<h3>Cabo House Property</h3>
<p><a href="https://www.cabohouseproperty.com">cabohouseproperty.com</a>. The site presents property for sale in Cape Verde and appears focused on Santa Maria, Sal, with apartments, villas, and land, plus buying guides and property-sales content. Publicly visible listings tracked by the index are concentrated on Sal (Santa Maria). These are agency-attributed details, not quality assessments by the index.</p>
<h3>Ocean Property 24</h3>
<p><a href="https://www.oceanproperty24.com">oceanproperty24.com</a>. According to its website, Ocean Property 24 presents properties in Cape Verde with a focus on Sal and Santa Maria, including apartments, villas, and land, with some listings marketed as luxury real estate. The index tracks listings from this source on Sal. These are agency-attributed details, not quality assessments by the index.</p>
<h3>Cape Verde Property 24</h3>
<p><a href="https://capeverdeproperty24.com">capeverdeproperty24.com</a>. The site presents itself as a property and real estate brokerage portal for Cape Verde, with search and filter tools and listings spanning sale, rent, and buying categories. The index tracks listings from this source across the islands. These are agency-attributed details, not quality assessments by the index.</p>
<h3>Simply Cape Verde</h3>
<p><a href="https://simplycapeverde.com">simplycapeverde.com</a>. According to its website, Simply Cape Verde lists property for sale across Sal, Boa Vista, São Vicente, and the wider archipelago, alongside buyer and investor guidance. Its legal terms appear to reference brokerage activity and Cape Verde registration details. The index tracks listings from this source. These are agency-attributed details, not quality assessments by the index.</p>
<h3>NhaKaza</h3>
<p><a href="https://nhakaza.cv">nhakaza.cv</a>. NhaKaza appears to be a Cape Verdean property classifieds portal where users can advertise, sell, or rent apartments, houses, rooms, land, garages, commercial spaces, and similar property types. Publicly visible listings are often priced in Cape Verdean escudos, which the index normalizes to euros. The index tracks listings from this source across multiple islands.</p>
<p><em>Descriptions are based on publicly available information from each source's own website and on the index's current listing coverage. They are not recommendations or quality assessments.</em></p>
<hr>
<h2>At a glance</h2>
<table>
<thead>
<tr>
<th>Agency / portal</th>
<th>Website</th>
<th>Islands (as tracked by the index)</th>
</tr>
</thead>
<tbody>
<tr><td><strong>CCore Investments</strong></td><td>ccoreinvestments.com</td><td>Sal, Boa Vista, Santiago, São Vicente</td></tr>
<tr><td><strong>RE/MAX (Sal)</strong></td><td>remax.cv</td><td>Sal (expanding to Santo Antão)</td></tr>
<tr><td><strong>Terra Cabo Verde</strong></td><td>terracaboverde.com</td><td>Multiple islands</td></tr>
<tr><td><strong>Estate CV</strong></td><td>estatecv.com</td><td>Santiago, Sal, Boa Vista</td></tr>
<tr><td><strong>Homes Casa Verde</strong></td><td>homescasaverde.com</td><td>Sal-based, multi-island</td></tr>
<tr><td><strong>Cabo House Property</strong></td><td>cabohouseproperty.com</td><td>Sal (Santa Maria)</td></tr>
<tr><td><strong>Ocean Property 24</strong></td><td>oceanproperty24.com</td><td>Sal</td></tr>
<tr><td><strong>Cape Verde Property 24</strong></td><td>capeverdeproperty24.com</td><td>Multiple islands</td></tr>
<tr><td><strong>Simply Cape Verde</strong></td><td>simplycapeverde.com</td><td>Tracked on the index</td></tr>
<tr><td><strong>NhaKaza</strong></td><td>nhakaza.cv</td><td>Multiple islands (local portal)</td></tr>
</tbody>
</table>
<p><em>This list reflects sources tracked as of May 2026 and changes as the index onboards new agents. A source missing from this list has not yet been added — it has not been judged.</em></p>
<hr>
<h2>What buyers should verify independently</h2>
<ul>
<li><strong>Credentials.</strong> A NIF (tax number) on its own does not prove an agency is registered, licensed, qualified, solvent, or authorised. Verify the current commercial registration, the legal entity name, who holds signing authority, the tax identity, and any activity-specific registration or authorisation that current law requires.</li>
<li><strong>Representation.</strong> Agents commonly act for the seller, and dedicated buyer's agents are less common — confirm in writing who the agent represents rather than assuming.</li>
<li><strong>Fees.</strong> Who pays the commission, and how, varies by agreement — confirm the structure in writing before you proceed rather than assuming the seller pays.</li>
<li><strong>Language.</strong> Many agents serving foreign buyers work in English, but do not assume it — confirm the working language, especially in Santiago or São Vicente where Portuguese and Creole matter more.</li>
<li><strong>Independent legal advice.</strong> Whoever you use, instruct your own Cape Verdean lawyer. See <a href="/blog/mistakes-buying-property-cape-verde">7 expensive mistakes to avoid</a>.</li>
</ul>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Who are the best real estate agents in Cape Verde?</h3>
<p>There is no neutral, public dataset that answers this. Any page claiming a definitive list of the best agents is usually self-promotion or an automated directory. The index does not rank agents — it shows which Cape Verde real estate agents and portals it tracks so you can compare them yourself and do your own checks.</p>
<h3>Do I need an agent to buy property in Cape Verde?</h3>
<p>Technically no — you can buy directly from a developer or vendor. Many foreign buyers use an agent for local knowledge and language, but independent Cape Verdean legal advice is strongly recommended either way. See our guide to <a href="/blog/buying-property-cape-verde-guide">buying property in Cape Verde</a>.</p>
<h3>How do I choose between Cape Verde property agents?</h3>
<p>Look past marketing language. Check that the agency is registered in Cape Verde, confirm who it represents and how commission is paid, and ask about its track record with buyers from your country. Whoever you choose, instruct your own lawyer.</p>
<hr>
<h2>The bottom line</h2>
<p>There is no neutral scoreboard of the best real estate agents in Cape Verde, and this page does not try to be one. The index does not rank, endorse, or recommend agents. What it does is track listing sources and help buyers compare what each agency makes publicly visible. Use that as a starting point, then verify each agency's credentials, fees, and who it represents — and instruct an independent Cape Verdean lawyer before you commit to anything.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — The full step-by-step process for foreign buyers</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Expensive Mistakes to Avoid</a> — What catches foreign buyers most often</li>
<li><a href="/blog/cape-verde-property-prices-by-island">Cape Verde Property Prices by Island</a> — What the index currently shows</li>
</ul>
<hr>
<!--SOURCES-->
<p><em>Agency-attributed statements above are the agencies' own words, dated to the interview noted, and have not been independently verified by the index. Agency and portal coverage reflects the source registry the index tracked as of May 2026.</em></p>
<hr>
<p><em>Coverage on this page is based on publicly available listing data monitored by the Cape Verde Real Estate Index as of May 2026, and on direct interviews where noted. The index is independent, takes no referral fees, and does not endorse any agency. This article is for informational purposes only and is not legal or financial advice — always verify an agency's credentials and instruct an independent Cape Verdean lawyer before completing any property transaction.</em></p>
`,
  },
  {
    slug: "cape-verde-property-prices-by-island",
    title: "Cape Verde property prices by island: how to read the index, island by island",
    description:
      "How asking prices differ across Cape Verde's islands, and how to read the live Cape Verde Real Estate Index figures. Based on monitored asking-price listings — not transaction prices or valuations.",
    date: "2026-04-29",
    modifiedAt: "2026-06-19",
    readTime: "5 min read",
    tags: ["Market", "Islands", "Data"],
    sourceIds: ["arei-market", "arei-listings"],
    content: `<p><em>Last updated: April 2026. Figures are read live from the index — see the market data page.</em></p>
<p>Cape Verde is not one property market. It is an archipelago of distinct island markets, each shaped by different levels of foreign demand, tourism infrastructure, and listing activity. A single archipelago-wide average tells you almost nothing.</p>
<p>This guide explains how to read the index island by island. We deliberately do not freeze price figures into this article: asking prices and tracked counts change as listings come and go, so a number printed here would quickly be wrong. The current, reproducible figures live on the <a href="/market">market data</a> page, which is generated from the index's current records.</p>
<blockquote><p><strong>Based on monitored asking-price listings. Not transaction prices or valuations.</strong> The index aggregates publicly listed asking prices — not closing prices, not the full market, and not independently verified. The live <a href="/listings">/listings</a> and <a href="/market">/market</a> pages are always the authoritative source.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup></p></blockquote>
<hr>
<h2>How the islands differ</h2>
<p>A handful of islands carry enough tracked listings for a meaningful median asking price; the rest are too thin to summarise with a single number. What shapes each island's figure:</p>
<ul>
<li><strong>Sal</strong> — the deepest tracked sample. Direct international flights and the Santa Maria resort cluster anchor most of the foreign-buyer activity visible on the index. Inventory skews toward apartments and resort units.</li>
<li><strong>Santiago</strong> — a large sample, but weighted toward Praia city stock rather than resort apartments. A different median here reflects different inventory, not simply a "more expensive island."</li>
<li><strong>Boa Vista</strong> — weighted toward resort apartments and off-plan stock around Sal Rei. The split between new-build and resale asking prices is not something the index can compare without transaction evidence.</li>
<li><strong>São Vicente</strong> — a growing sample centred on Mindelo, urban and residential rather than resort — a different buyer profile to Sal and Boa Vista.</li>
</ul>
<p>For the current median asking price and tracked count per island, open the <a href="/market">market data</a> page and the per-island grids: <a href="/listings?island=Sal">Sal</a>, <a href="/listings?island=Santiago">Santiago</a>, <a href="/listings?island=Boa+Vista">Boa Vista</a>, <a href="/listings?island=S%C3%A3o+Vicente">São Vicente</a>.<sup class="kv-cite"><a href="#src-arei-listings" aria-label="Source 2: AREI listings">[2]</a></sup></p>
<hr>
<h2>The islands with too little tracked data to price</h2>
<p>Several islands appear in the index but have samples too thin to support a reliable median. That may reflect genuinely thin local activity, or simply that the index has not yet onboarded the sources where listings on those islands tend to surface. Maio, São Nicolau, Fogo, Santo Antão, and Brava all fall into this category at present — the live market page suppresses a median where the sample is too small rather than publishing a misleading number.</p>
<p>If you are specifically researching one of these islands, the most useful step is to look at the individual tracked listings on <a href="/listings">/listings</a> and follow the source links rather than rely on an aggregate. Coverage on these islands may deepen as new sources are added.</p>
<hr>
<h2>What drives the differences</h2>
<p>The variation between islands reflects a few structural factors that pre-date any individual listing:</p>
<ul>
<li><strong>Direct flight access.</strong> Sal and Boa Vista have international airports with direct European routes. That underwrites most of the foreign-buyer demand visible in the index.</li>
<li><strong>Sample depth.</strong> Where many listings are tracked, a median is informative; where only a handful are, it is not — which is why thin-sample islands are suppressed rather than priced.</li>
<li><strong>Inventory mix.</strong> Urban stock (Praia) versus resort and off-plan stock (Sal, Boa Vista) shapes each island's headline number more than location alone.</li>
<li><strong>Connectivity gaps.</strong> Santo Antão (ferry only, from São Vicente) and Brava (no airport) sit upstream of any pricing question. Foreign-buyer activity is thinner there, and so is source coverage.</li>
</ul>
<hr>
<h2>How the live figures are produced</h2>
<p>The market data page computes each island's median from the priced, de-duplicated listings the index currently tracks: asking prices are normalised to euros at the official peg; price-on-request records stay in the listing count but are excluded from the median; near-duplicate records across sources are removed before counting; and islands with samples too thin to be meaningful are suppressed rather than published.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup> Because it reads current records, the figure you see is reproducible at the time you view it — and is a monitored asking-price median, not an AREI index value, a transaction price, or a valuation.</p>
<h2>How to use this</h2>
<p>Treat the live figures as a way to narrow a shortlist — not as a forecast, a valuation, or a substitute for going through individual listings, talking to an independent local lawyer, and checking the source page for any property you take seriously.</p>
<p>For the legal and tax mechanics of buying once you have shortlisted, see the <a href="/blog/buying-property-cape-verde-guide">step-by-step buying guide</a>. For an island-by-island comparison framed around lifestyle and use case, see <a href="/blog/which-cape-verde-island-property">Which Cape Verde island</a>. For methodology and source coverage, see <a href="/about">/about</a>.</p>
<hr>
<!--SOURCES-->
<hr>
<p><em>The Cape Verde Real Estate Index is an independent property search and data platform, published by AREI — not a broker, agency, or marketplace. Listings are aggregated from publicly accessible sources we currently track and are not legally verified. Always confirm a property's details with the original agent or seller and your own lawyer before acting.</em></p>`,
  },
  {
    slug: "buying-property-cape-verde-guide",
    title: "How to Buy Property in Cape Verde: A Step-by-Step Guide for Foreign Buyers",
    description: "Foreign buyers can acquire privately owned property in Cape Verde, subject to applicable title, tax, registration, and transaction requirements. A step-by-step guide to the notary-based process, from NIF to the definitive transfer — with primary-source citations.",
    date: "2026-02-27",
    modifiedAt: "2026-06-19",
    readTime: "9 min read",
    tags: ["Buying","Legal","Guide"],
    sourceIds: ["dnre-nif", "bcv-fx", "lei-iti", "lei-ipi", "lei-greencard", "arei-listings"],
    content: `<p><em>Last updated: February 2026. Legal and tax points verified against primary sources on 19 June 2026.</em></p>
<p>Foreign buyers can acquire privately owned property in Cape Verde, subject to applicable title, planning, tax, registration, investment, and transaction-specific requirements. The legal framework draws on Portuguese-derived civil law, which means a structured, notary-based process — provided the paperwork is done right.</p>
<blockquote><p>This is general information, not legal advice. Independent Cape Verdean legal advice is strongly recommended. Cross-border transfer of qualifying sale proceeds runs through authorised financial institutions, subject to tax, anti-money-laundering, foreign-exchange, documentary and — where relevant — investment-registration requirements.<sup class="kv-cite"><a href="#src-bcv-fx" aria-label="Source 2: Banco de Cabo Verde">[2]</a></sup></p></blockquote>
<p>This guide walks through every stage of the buying process, from getting your tax number to the definitive transfer instrument.</p>
<hr>
<h2>Before You Start: What You&#39;ll Need</h2>
<p>Two things must be in place before you can make an offer on any property in Cape Verde.</p>
<p><strong>1. A Cape Verdean NIF (Número de Identificação Fiscal)</strong></p>
<p>The NIF is a tax identification number used in tax and registration procedures. Buyers generally require a NIF; the lawyer, notary, or registry should confirm the requirement for every party to the instrument.</p>
<p>A non-resident individual can request a NIF using a valid passport, and the official service is free. Official service points include the Repartições de Finanças and Casa do Cidadão.<sup class="kv-cite"><a href="#src-dnre-nif" aria-label="Source 1: DNRE NIF guidance">[1]</a></sup> If you are not in the country, the request can generally be handled through a fiscal representative; confirm current document requirements with the service or your lawyer rather than assuming a fixed processing time.</p>
<p><strong>2. A Local Bank Account</strong></p>
<p>A Cape Verdean bank account (Banco Comercial do Atlântico and Caixa Económica are commonly used) is widely used in practice to pay the seller, taxes, charges, and notary fees. Confirm whether one is required for your specific transaction with your bank and advisers. The Cape Verdean escudo (CVE) is pegged to the euro at 1 EUR = 110.265 CVE, which simplifies currency considerations for euro-based buyers.<sup class="kv-cite"><a href="#src-bcv-fx" aria-label="Source 2: Banco de Cabo Verde">[2]</a></sup></p>
<hr>
<h2>The Buying Process: Seven Steps</h2>
<h3>Step 1: Find a Property</h3>
<p>You can search independently, work with an estate agent, or use a source-linked property index like the <a href="/listings">Cape Verde Real Estate Index</a> to compare publicly listed properties across multiple sources and islands. Agents on the ground can be useful for understanding local nuances — different areas of the same island can vary in infrastructure, rental potential, and community fees.</p>
<h3>Step 2: Instruct an Independent Lawyer</h3>
<p>Independent Cape Verdean legal advice is strongly recommended. Instruct a Cape Verdean <em>advogado</em> who is independent from the seller and the estate agent. Your lawyer verifies ownership, checks for outstanding debts and charges, reviews all contracts, and represents you at the notary. If you cannot be physically present, your lawyer can act on your behalf through a power of attorney (<em>procuração</em>), which can be arranged at a notary or a Cape Verde embassy abroad. Agree the scope and fee in writing before instructing.</p>
<h3>Step 3: Make an Offer and Pay the Reservation Deposit</h3>
<p>Once you have agreed a price, you typically sign a reservation agreement and pay a deposit. The amount, and whether the deposit is refundable or forfeited, depend on the signed reservation agreement (or CPCV) and applicable law — read the refund and forfeiture terms carefully before paying, and have your lawyer confirm them.</p>
<h3>Step 4: Due Diligence</h3>
<p>Your lawyer obtains the property records from the competent registry and tax office — typically a <em>certidão de registo predial</em> (land-registry certificate) and a <em>certidão matricial</em> (tax-register/matriz certificate). Between them these establish:</p>
<ul>
<li>The registered owner</li>
<li>The property&#39;s official identification and description</li>
<li>Its assessed value (<em>valor patrimonial / valor matricial</em>)</li>
<li>Any outstanding debts, charges, or mortgages</li>
</ul>
<p>The exact documents required vary by transaction and should be confirmed by counsel and the registry. Your lawyer will also verify that municipal taxes and community charges are settled up to date.</p>
<h3>Step 5: Sign the Promissory Contract (CPCV)</h3>
<p>The <em>Contrato de Promessa de Compra e Venda</em> is a binding agreement between buyer and seller, outlining terms, conditions, timelines, and any specific clauses (for example, appliances in working order, or penalties for seller withdrawal). Do not assume the CPCV is bilingual: if you do not read Portuguese, obtain an accurate translation and ensure the contract identifies which language version governs. Both parties can negotiate and amend the document before signing.</p>
<h3>Step 6: Final Payment and the Definitive Transfer</h3>
<p>The balance is transferred through the agreed banking process. The definitive transfer instrument must satisfy the applicable legal, authentication, tax, and land-registration requirements; the correct instrument (and whether a public deed before a notary is required) should be confirmed by your lawyer, notary, and the registry for the specific transaction. Your lawyer then handles registration so the transfer is recorded in your name.</p>
<h3>Step 7: Post-Purchase Registration</h3>
<p>Your lawyer registers the deed at the Land Registry. You&#39;ll receive a registered ownership certificate. If you plan to apply for residency, your property investment may qualify you — see the section on the Green Card program below.</p>
<hr>
<h2>Costs and Taxes: What to Budget</h2>
<h3>Transaction Costs (at purchase)</h3>
<p>As of January 2026, Cape Verde implemented a significant property tax reform, replacing the old IUP (Imposto Único sobre o Património) system with two new taxes:</p>
<table>
<thead>
<tr>
<th>Cost</th>
<th>Amount</th>
</tr>
</thead>
<tbody><tr>
<td><strong>ITI (Property Transfer Tax)</strong></td>
<td>1% general; 3% in qualifying privileged-tax-regime cases, on the legally assessed base (Código do ITI, art. 11.º)<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 3: Código do ITI, art. 11">[3]</a></sup></td>
</tr>
<tr>
<td><strong>Notary fees</strong></td>
<td>Confirm the current tariff with the notary</td>
</tr>
<tr>
<td><strong>Land-registry registration</strong></td>
<td>Confirm the current tariff with the registry</td>
</tr>
<tr>
<td><strong>Applicable duties or municipal charges</strong></td>
<td>Verify for the specific transaction</td>
</tr>
<tr>
<td><strong>Lawyer fees</strong></td>
<td>Agree with your lawyer in writing before instructing</td>
</tr>
</tbody></table>
<p><strong>Important:</strong> The applicable ITI amount depends on the legally assessed base and the specific transaction — the purchase price does not necessarily equal the ITI base. Before signing, ask a qualified local lawyer to verify the matriz, registo predial, taxable base, tax settlement status, and any surcharge exposure with the municipality.</p>
<h3>Ongoing Annual Costs</h3>
<table>
<thead>
<tr>
<th>Cost</th>
<th>Amount</th>
</tr>
</thead>
<tbody><tr>
<td><strong>IPI (Annual Property Tax)</strong></td>
<td>0.1% general; 0.15% for construction land (special base = 10% of planned buildings) (Código do IPI, arts. 28.º, 23.º)<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 4: Código do IPI">[4]</a></sup></td>
</tr>
<tr>
<td><strong>Condominium/community fees</strong></td>
<td>Varies by development — confirm with the condominium administration</td>
</tr>
<tr>
<td><strong>Utilities</strong></td>
<td>Varies by usage</td>
</tr>
</tbody></table>
<p>The IPI system uses objective valuation criteria. The rate is increased by 25% for vacant, ruined or degraded urban property and by 10% for unfinished principal façades (Código do IPI, art. 24.º), so owners should verify their position locally.<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 4: Código do IPI, art. 24">[4]</a></sup></p>
<h3>If You Sell</h3>
<p>Gains on resale may be taxable in Cape Verde, and the treatment can interact with tax in your home country. Confirm the applicable rate and base, and any double-taxation implications, with a qualified tax adviser before selling.</p>
<hr>
<h2>Financing Options</h2>
<p>Many foreign buyers fund purchases from their own capital or from borrowing in their home country. Local mortgages may be available, but eligibility, rates, loan-to-value, and term depend on each lender&#39;s current published products and underwriting — confirm directly with the bank. See the <a href="/blog/financing-property-cape-verde">financing guide</a> for the factors that drive a decision.</p>
<hr>
<h2>The Green Card: Residency Through Property Investment</h2>
<p>Cape Verde&#39;s Green Card is a renewable residence authorisation for qualifying foreign property investors. The minimum qualifying investment depends on the municipality&#39;s GDP per capita (Lei n.º 30/IX/2018, art. 3.º):<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 5: Lei 30/IX/2018, art. 3">[5]</a></sup></p>
<ul>
<li><strong>€80,000</strong> where the municipality&#39;s GDP per capita is below the national average</li>
<li><strong>€120,000</strong> where it is equal to or above the national average</li>
</ul>
<p>The title is renewable every five years, and for ten years from the second renewal onward (Lei n.º 30/IX/2018, art. 8.º) — it is not permanent and never-expiring. The original framework includes specified tax benefits, kept in force in part under the 2026 ITI and IPI codes, but their application to an individual transaction must be confirmed with counsel and the tax authority. The Green Card does not automatically produce citizenship; naturalisation has its own statutory residence requirement and conditions. See the <a href="/blog/cape-verde-green-card-residency">Green Card guide</a> for detail.<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 5: Lei 30/IX/2018, art. 8">[5]</a></sup></p>
<hr>
<h2>Common Pitfalls to Avoid</h2>
<ul>
<li><strong>Don&#39;t skip the lawyer.</strong> The most expensive mistakes in Cape Verde real estate come from skipping independent legal verification. Title disputes and hidden debts exist.</li>
<li><strong>Check the assessed value (valor patrimonial / matricial).</strong> The officially assessed value may differ from the current market price — especially for properties in developments built during the pre-2008 boom. Property taxes are charged on a legally assessed base, which is not necessarily the purchase price, so have your lawyer confirm the base and any resulting exposure before you commit.</li>
<li><strong>Verify community charges.</strong> If buying in a resort or condominium, confirm that all community charges and maintenance fees are paid up to date. Outstanding fees become the new owner&#39;s problem.</li>
<li><strong>Don&#39;t pay deposits on unfinished developments without legal advice.</strong> Off-plan purchases carry additional risks. Ensure your lawyer reviews the developer&#39;s track record and the contractual protections in place.</li>
<li><strong>Understand what &quot;tourism utility&quot; means.</strong> Properties within resort developments that have been granted &quot;tourism utility&quot; status may qualify for tax benefits, but also come with specific obligations around rental schemes and usage restrictions.</li>
</ul>
<hr>
<h2>Finding Properties</h2>
<p>The Cape Verdean property market is relatively small and fragmented. Listings appear across local agency websites, international portals, developer pages, and classified sites — often with inconsistent formatting, pricing in different currencies, and varying levels of detail.</p>
<p>The <a href="/listings">Cape Verde Real Estate Index</a> aggregates listings from multiple sources into a single, searchable index with normalised pricing (all in euros), standardised specifications, and source-status indicators. Every listing links directly to its original source.</p>
<blockquote><p><strong>Based on monitored asking-price listings. Not transaction prices or valuations.</strong> The index links to source listings; it does not independently verify title, condition, legality, availability, or seller authority.<sup class="kv-cite"><a href="#src-arei-listings" aria-label="Source 6: AREI listings">[6]</a></sup></p></blockquote>
<p><em>Browse current listings on the <a href="/listings">index</a>.</em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Can foreigners buy property in Cape Verde?</h3>
<p>Foreign buyers can acquire privately owned property in Cape Verde, subject to applicable title, planning, tax, registration, investment, and transaction-specific requirements. You will generally need a Cape Verdean NIF (tax number), and independent Cape Verdean legal advice is strongly recommended.</p>
<h3>How much does it cost to buy property in Cape Verde?</h3>
<p>Total transaction costs vary by property, municipality, and transaction structure. Budget separately for ITI, notary and registration costs, legal fees, and any applicable duties or charges, and have your lawyer confirm the full settlement before completion.</p>
<h3>Do I need a lawyer to buy property in Cape Verde?</h3>
<p>Independent Cape Verdean legal advice is strongly recommended, and the lawyer should be independent of the seller. Your lawyer verifies ownership, checks for debts and charges, reviews contracts, and handles registration. Read more about <a href="/blog/mistakes-buying-property-cape-verde">common mistakes to avoid</a>.</p>
<h3>How long does the buying process take?</h3>
<p>There is no fixed statutory timeline. Timing depends on due diligence, document preparation (including any NIF and power of attorney), contract negotiation, and notary and registry scheduling. A power of attorney can help if you cannot be present for every stage.</p>
<h3>Can buying property give me residency in Cape Verde?</h3>
<p>Cape Verde&#39;s <a href="/blog/cape-verde-green-card-residency">Green Card</a> is a renewable residence authorisation for qualifying property investors (€80,000 or €120,000 depending on the municipality&#39;s GDP per capita). It does not automatically lead to citizenship; naturalisation requires the statutory residence period — the nationality-law framework indicates at least five years of legal residence — and all other conditions.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Comparison of the actively listed islands</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — What changed and what it means for buyers</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — Residence through property investment</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. Property, tax, immigration, and exchange-control rules may change and are applied case by case. Always consult a qualified Cape Verdean lawyer before making any property purchase.</em></p>
`,
  },
  {
    slug: "which-cape-verde-island-property",
    title: "Which Cape Verde Island Should You Buy Property On? A Data-Driven Comparison",
    description: "Cape Verde's ten islands each have distinct characters, infrastructure levels, and property markets. Choosing the right island is arguably the most consequential decision you'll...",
    date: "2026-02-25",
    modifiedAt: "2026-06-19",
    readTime: "10 min read",
    tags: ["Islands","Comparison","Data"],
    sourceIds: ["arei-market"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Cape Verde&#39;s ten islands each have distinct characters, infrastructure levels, and property markets. Choosing the right island is arguably the most consequential decision you&#39;ll make as a buyer — it determines your rental potential, lifestyle experience, resale liquidity, and daily logistics.</p>
<p>This guide compares the six islands where property is most actively listed, based on real market data.</p>
<hr>
<h2>The Quick Overview</h2>
<p>Cape Verde&#39;s islands divide into two groups: the Barlavento (windward) islands in the north and the Sotavento (leeward) islands in the south. For property buyers, the practical differences come down to tourism infrastructure, flight connections, rental demand, and price levels.</p>
<table>
<thead>
<tr>
<th>Island</th>
<th>Character</th>
<th>Price Level</th>
<th>Rental Demand</th>
<th>Flight Access</th>
<th>Best For</th>
</tr>
</thead>
<tbody><tr>
<td><strong>Sal</strong></td>
<td>Tourism hub, beaches</td>
<td>Higher</td>
<td>Tourism-driven</td>
<td>International airport, seasonal European routes</td>
<td>Rental investment, holiday homes</td>
</tr>
<tr>
<td><strong>Boa Vista</strong></td>
<td>Beaches, developing</td>
<td>Medium-high</td>
<td>Growing, seasonal peaks</td>
<td>International airport, growing connections</td>
<td>Longer-term growth bet, resort living</td>
</tr>
<tr>
<td><strong>Santiago</strong></td>
<td>Urban, diverse economy</td>
<td>Medium</td>
<td>Mixed (urban + tourism)</td>
<td>International airport (Praia)</td>
<td>Residential, commercial, local market</td>
</tr>
<tr>
<td><strong>São Vicente</strong></td>
<td>Cultural, urban</td>
<td>Medium</td>
<td>Cultural tourism</td>
<td>Cesária Évora Intl (seasonal routes); ferry from Santo Antão</td>
<td>Urban lifestyle, cultural tourism</td>
</tr>
<tr>
<td><strong>Fogo</strong></td>
<td>Volcanic, rural</td>
<td>Low</td>
<td>Niche eco-tourism</td>
<td>Domestic flights</td>
<td>Unique retreats, eco-projects</td>
</tr>
<tr>
<td><strong>Maio</strong></td>
<td>Quiet, undeveloped</td>
<td>Lowest</td>
<td>Very limited</td>
<td>Domestic flights</td>
<td>Seclusion, long-term speculation</td>
</tr>
</tbody></table>
<hr>
<h2>Sal: The Established Market</h2>
<p>Sal is one of Cape Verde&#39;s most developed islands for tourism and carries the deepest tracked listing sample in the index. Amílcar Cabral International Airport handles direct European routes, though specific routes are seasonal and should be checked against current airport and airline schedules. Sal and Boa Vista draw most of Cape Verde&#39;s international tourism; for current, source-attributed visitor volumes consult the Instituto Nacional de Estatística (INE) directly.</p>
<p><strong>Santa Maria</strong>, on Sal&#39;s southern tip, is the centre of gravity — much of the tourism infrastructure, restaurants, and nightlife are concentrated there, and so is foreign-buyer activity.</p>
<p><strong>What the market looks like:</strong> Sal&#39;s tracked inventory is weighted toward apartments and units within resort complexes; standalone villas exist but are less common. For current median asking prices, see <a href="/blog/cape-verde-property-prices-by-island">Cape Verde property prices by island</a> and the live <a href="/market">market data</a> — figures there are monitored asking-price listings, not transaction prices or valuations.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup></p>
<p><strong>Rental potential:</strong> Sal has the most active international tourist-rental demand in Cape Verde, but actual returns vary with location, property quality, scheme terms, and management. Treat any yield figure as a provider quotation to verify, not a market fact.</p>
<p><strong>Things to consider:</strong> Sal is among the more expensive islands to buy on and its market is mature. The island is also relatively flat and arid, which isn&#39;t everyone&#39;s aesthetic preference.</p>
<p><a href="/listings/sal">Browse current Sal properties for sale</a> in the Cape Verde Real Estate Index.</p>
<hr>
<h2>Boa Vista: The Growth Story</h2>
<p>Boa Vista is Cape Verde&#39;s second major tourism island, known for stunning, less-crowded beaches and a more laid-back atmosphere than Sal. It has its own international airport with growing flight connections, and the tourism infrastructure has expanded significantly in recent years.</p>
<p><strong>Sal Rei</strong>, the main town, is the commercial center. Most property development clusters around the coast, with a mix of resort complexes and standalone villas.</p>
<p><strong>What the market looks like:</strong> Headline entry prices are generally lower than on Sal, which is part of Boa Vista&#39;s appeal for beach-island buyers; compare the live per-island asking-price data rather than relying on a fixed discount figure.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup> The development pipeline is active, with several new projects targeting both investors and lifestyle buyers.</p>
<p><strong>Rental potential:</strong> Growing but more seasonal than Sal. As flight connections change and tourism infrastructure matures, rental demand shifts — verify current routes and demand rather than assuming a fixed trajectory. The &quot;where Sal was a decade ago&quot; framing is a marketing comparison, not a measured forecast.</p>
<p><strong>Things to consider:</strong> Less developed infrastructure means fewer restaurants, shops, and services outside the resort zones. This is evolving, but buyers should visit and assess whether the current level of development meets their needs.</p>
<p><a href="/listings/boa-vista">Browse current Boa Vista properties for sale</a> in the Cape Verde Real Estate Index.</p>
<hr>
<h2>Santiago: Beyond Tourism</h2>
<p>Santiago is Cape Verde&#39;s largest and most populated island, home to the capital Praia. It&#39;s the economic, political, and cultural heart of the archipelago — and its property market reflects a broader economy, not just tourism.</p>
<p><strong>What the market looks like:</strong> Santiago offers the widest range of property types, from urban apartments in Praia to rural land and coastal developments. Prices vary enormously depending on location and type. Urban apartments in Praia can be found at lower price points than equivalent beach properties on Sal or Boa Vista, though premium developments exist.</p>
<p><strong>Rental potential:</strong> Mixed. Praia has a business travel market and a growing middle class creating domestic rental demand. Coastal areas like Tarrafal are developing a tourism niche. The rental market is less tourist-dependent than Sal or Boa Vista, which can be either a pro (diversification) or a con (lower peak yields), depending on your strategy.</p>
<p><strong>Things to consider:</strong> Santiago offers the most &quot;real&quot; Cape Verdean experience — it&#39;s where most Cape Verdeans live and work. The infrastructure is more developed in Praia than on most other islands, but the tourism product is less polished. Buyers looking for a residential investment with local market exposure, or who plan to live in Cape Verde, often find Santiago compelling.</p>
<hr>
<h2>São Vicente: The Cultural Capital</h2>
<p>São Vicente is home to Mindelo, widely considered one of Cape Verde&#39;s most culturally vibrant cities. Mindelo is strongly associated with <em>morna</em>, its performance tradition, and Cesária Évora. Morna is recognised as a national Cape Verdean tradition rather than the product of any single island, so Mindelo is best described as a centre of the tradition rather than its definitive birthplace. With its colonial architecture and lively carnival, São Vicente attracts a different kind of visitor — and buyer.</p>
<p><strong>What the market looks like:</strong> The São Vicente market is primarily urban, centered on Mindelo. Property types range from colonial-era houses with renovation potential to modern apartments. Prices are generally moderate compared to Sal.</p>
<p><strong>Rental potential:</strong> Cultural tourism provides a steady stream of visitors, though volumes are lower than Sal or Boa Vista. São Vicente&#39;s appeal is more about lifestyle and authenticity than mass tourism yields. The ferry connection to Santo Antão (Cape Verde&#39;s hiking island) adds to its tourism proposition.</p>
<p><strong>Things to consider:</strong> São Vicente doesn&#39;t have the beach tourism product that drives Sal and Boa Vista&#39;s rental markets. The island is served by Cesária Évora International Airport; available international routes are seasonal and should be checked against current airport and airline schedules, and many visitors still arrive via Sal or Santiago and connect. This shapes the pure-investment case but strengthens the lifestyle case for buyers who value culture over beach resort living.</p>
<hr>
<h2>Fogo: The Volcanic Island</h2>
<p>Fogo is dominated by Pico do Fogo, an active volcano rising nearly 3,000 meters above sea level. The island produces Cape Verde&#39;s famous wine and coffee, and the landscape is dramatically different from the beach islands.</p>
<p><strong>What the market looks like:</strong> The smallest and most niche property market among the commonly listed islands. Properties are affordable, but the market is thin — buying and selling takes longer, and comparable sales data is limited.</p>
<p><strong>Rental potential:</strong> Very niche. Fogo attracts hikers, nature lovers, and travelers looking for an authentic experience. The potential for eco-tourism projects exists, but the market is small and specialized.</p>
<p><strong>Things to consider:</strong> Fogo is for a specific kind of buyer — someone drawn to its unique landscape, willing to accept limited infrastructure and tourism volume, and comfortable with a less liquid investment.</p>
<hr>
<h2>Maio: The Quiet One</h2>
<p>Maio is the least developed of the commonly listed islands, offering pristine beaches, a slow pace of life, and very little tourism infrastructure.</p>
<p><strong>What the market looks like:</strong> The lowest entry prices in Cape Verde. Land and basic properties are available at prices that would be unthinkable on Sal. But the market is extremely thin, and resale can be challenging.</p>
<p><strong>Rental potential:</strong> Minimal at present. Maio&#39;s attraction is potential — if tourism development reaches the island in a meaningful way, early buyers could see significant appreciation. But that&#39;s speculative, with uncertain timing.</p>
<p><strong>Things to consider:</strong> Maio is a long-term bet. It appeals to buyers seeking seclusion, or those willing to speculate on future development. Due diligence is especially important here — verify land ownership carefully and understand the practical challenges of building and maintaining property on an island with limited services.</p>
<hr>
<h2>How to Compare Properties Across Islands</h2>
<p>One of the challenges of the Cape Verdean property market is that listings are scattered across dozens of agency websites, international portals, and developer pages. Prices may be listed in euros, dollars, or escudos. Specifications are often inconsistent. The same property may appear on multiple sites with different descriptions.</p>
<p>The <a href="/listings">Cape Verde Real Estate Index</a> was built to solve this problem. We aggregate listings from multiple sources, normalise all prices to euros, standardise specifications, deduplicate properties that appear on multiple sites, and present everything in a single searchable interface. Every listing links to its original source — we&#39;re a read-only index, not a broker.</p>
<p>Coverage as of May 2026: listings across 9 tracked sources on 6 islands. The live <a href="/market">market data</a> is always the authoritative count.</p>
<p><em>Start your search on the <a href="/listings">index</a>.</em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Which Cape Verde island is best for property investment?</h3>
<p>There is no single best island — it depends on your goal. Sal and Boa Vista see the most international tourist-rental demand and the deepest tracked listing samples; Santiago and São Vicente lean more residential. Compare the live per-island asking-price data and inventory on the <a href="/market">market data</a> page before deciding.</p>
<h3>Which island has the lowest tracked asking prices?</h3>
<p>Smaller, less-developed islands such as Maio and Fogo tend to show lower headline asking prices, but their tracked samples are thin and infrastructure is limited. Compare the current per-island medians on the <a href="/blog/cape-verde-property-prices-by-island">prices-by-island</a> page rather than assuming a ranking — and remember these are asking prices, not transaction prices.</p>
<h3>Can I get rental income from property on any island?</h3>
<p>International tourist-rental demand is concentrated on Sal and (increasingly) Boa Vista; Santiago has a more residential rental market, and the smaller islands have thinner demand. Short-term tourist accommodation may require registration, licensing, tax compliance, and municipal or development-specific approvals — confirm current requirements with the competent authorities and counsel.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Step-by-step buying process for foreign buyers</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — Investment thresholds vary by municipal GDP classification</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>Property markets are dynamic. This article reflects general observations and the index&#39;s tracked listing sample, and should not be relied upon as financial advice. Always conduct your own research and consult local professionals before investing.</em></p>
`,
  },
  {
    slug: "cape-verde-property-tax-reform-2026",
    title: "Cape Verde's 2026 Property Tax Reform: What Changed and What It Means for Buyers",
    description: "On January 1, 2026, Cape Verde implemented its most significant property tax reform in over 25 years. The old Imposto Único sobre o Património (IUP) — a single tax covering both...",
    date: "2026-02-22",
    modifiedAt: "2026-06-19",
    readTime: "8 min read",
    tags: ["Tax","Legal","2026"],
    sourceIds: ["lei-iti", "lei-ipi", "lei-greencard", "arei-market"],
    content: `<p><em>Last updated: February 2026. Rates and effective date verified against the Boletim Oficial on 19 June 2026.</em></p>
<p>On 1 January 2026, Cape Verde implemented its most significant property tax reform in over 25 years. The former Imposto Único sobre o Património (IUP) — a single tax covering both property transfers and annual ownership — has been replaced by two separate, modern tax codes.</p>
<p>If you&#39;re buying, selling, or holding property in Cape Verde, here&#39;s what you need to know.</p>
<hr>
<h2>What Changed</h2>
<p>The reform was enacted through Lei n.º 54/X/2025, which approves the Código do ITI, and Lei n.º 55/X/2025, which approves the Código do IPI — both published in the Boletim Oficial (I Série n.º 46, 6 June 2025) and in force since 1 January 2026.<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 1: Lei 54/X/2025">[1]</a></sup><sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Lei 55/X/2025">[2]</a></sup> They replace the former IUP with two distinct taxes:</p>
<p><strong>ITI (Imposto sobre a Transmissão de Imóveis)</strong> — a transfer tax paid when property changes hands.</p>
<p><strong>IPI (Imposto sobre a Propriedade de Imóveis)</strong> — an annual property tax paid by owners.</p>
<p>This separation brings Cape Verde in line with how most European countries structure property taxation and represents a deliberate modernization of the system to match the country&#39;s evolving real estate and tourism sectors.</p>
<hr>
<h2>ITI: The New Transfer Tax</h2>
<p>The ITI is a municipal tax levied on the transfer of real estate, whether the transfer is for payment or free of charge. Revenue goes directly to the municipality where the property is located.</p>
<h3>Key Details</h3>
<ul>
<li><strong>Rate:</strong> The general ITI rate is 1%. A 3% rate applies where the transferor or acquirer benefits from a privileged-tax regime, as defined in the Código Geral Tributário (Código do ITI, art. 11.º).<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 1: Código do ITI, art. 11">[1]</a></sup></li>
<li><strong>Basis:</strong> The tax is applied to a taxable value set under the code, which is not necessarily the purchase price; it should be verified for the specific property and transaction.</li>
<li><strong>Scope:</strong> The ITI applies to rural, urban, and mixed-use properties. It covers not just full ownership transfers (purchase and sale) but also partial forms of property rights.</li>
<li><strong>Expanded coverage:</strong> Unlike the old IUP, the ITI now captures a broader range of transactions that have the economic effect of a property transfer. This includes successive assignments of contractual positions in promissory purchase agreements and the use of irrevocable powers of attorney — practices previously used to transfer effective control of property without triggering transfer tax. This is a significant anti-avoidance measure.</li>
</ul>
<h3>What This Means for Buyers</h3>
<p><em>Worked example (hypothetical, assumed taxable value):</em> on an assumed taxable value of €150,000, a 1% general ITI rate implies about €1,500 in ITI; a 3% rate may apply in privileged-tax-regime cases. This is an illustrative calculation, not a quoted figure — the purchase price does not necessarily equal the legally assessed ITI base. Total acquisition costs also depend on notary, registration, legal fees, and any applicable duties or municipal charges, so buyers should confirm the full settlement for the specific property.</p>
<p><strong>Timing matters:</strong> Tax settlement is part of completing and registering the transfer. Ensure your lawyer confirms the current payment process and timing with the municipality before completion.</p>
<hr>
<h2>IPI: The New Annual Property Tax</h2>
<p>The IPI replaces the annual ownership component of the old IUP with a more transparent and objectively grounded system.</p>
<h3>Key Details</h3>
<ul>
<li><strong>General rate:</strong> The general IPI rate is 0.1% (Código do IPI, art. 28.º).<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Código do IPI, art. 28">[2]</a></sup></li>
<li><strong>Construction land:</strong> A 0.15% rate applies specifically to <em>terrenos para construção</em> (construction land). Crucially, its special taxable base is set at 10% of the value of the buildings planned for the plot — not the raw land value or the purchase price (Código do IPI, art. 23.º).<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Código do IPI, art. 23">[2]</a></sup></li>
<li><strong>Valuation method:</strong> Properties are assessed on objective criteria by Municipal Assessment Committees (<em>Comissões Municipais de Avaliação</em>), using a uniform methodology — a departure from the old system, where many valuations had not been updated in years and often bore little relationship to market values.</li>
<li><strong>Surcharges:</strong> The IPI rate is increased by 25% for vacant, ruined, or degraded urban property, and by 10% for property whose principal exterior façade is unfinished (Código do IPI, art. 24.º). Owners should verify any exposure with the municipality.<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Código do IPI, art. 24">[2]</a></sup></li>
</ul>
<h3>What This Means for Owners</h3>
<p>For many urban property owners, the 0.1% general IPI rate may be lower than historic IUP bills. The actual amount depends on the taxable value, property type, municipal assessment, and any surcharge exposure.</p>
<p>However, as Municipal Assessment Committees complete new property valuations, assessed values may change. Properties that were significantly undervalued may see their assessments — and therefore their tax obligations — increase.</p>
<hr>
<h2>Why the Reform Happened</h2>
<p>The former IUP framework was created in 1998 and took effect under the applicable implementation timetable. Over time it accumulated problems: property valuations were outdated, often based on pre-2008 assessments that no longer reflected market reality; the structure did not account for modern practices like contractual-position assignments; and the lack of penalties for neglected properties contributed to abandoned buildings in some urban areas.</p>
<p>Cape Verde&#39;s real estate and tourism sectors have grown substantially over that period — through new resort developments, urban expansion, and a growing middle class. For current, source-attributed tourism volumes, consult the Instituto Nacional de Estatística (INE) directly; figures change each reporting period and should be taken from the relevant INE publication rather than a static guide.</p>
<p>The government&#39;s stated goals for the reform are greater tax justice, improved transparency, more efficient collection, and stronger municipal finances — the revenue from both taxes goes directly to local municipalities.</p>
<hr>
<h2>Impact on the Green Card Program</h2>
<p>Cape Verde&#39;s <a href="/blog/cape-verde-green-card-residency">Green Card</a> is a renewable residence authorisation for qualifying foreign property investors (€80,000 where the municipality&#39;s GDP per capita is below the national average, €120,000 where it is equal to or above it). The original framework includes specified tax benefits — exemption from the former IUP and from IRPS (Lei n.º 30/IX/2018, art. 6.º).<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 3: Lei 30/IX/2018, art. 6">[3]</a></sup></p>
<p>The 2026 ITI and IPI codes preserve benefits established under special legislation (Código do ITI, art. 6.º, n.º 3; Código do IPI, art. 11.º, n.º 2), but they preserve those benefits in general terms and do not name the Green Card statute. Whether and how a benefit applies to an individual acquisition must be confirmed with qualified Cape Verdean counsel and the competent tax authority.<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 1: Código do ITI, art. 6 n.º 3">[1]</a></sup><sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Código do IPI, art. 11 n.º 2">[2]</a></sup> Do not assume the benefits automatically disappeared, nor that every Green Card buyer automatically receives them.</p>
<hr>
<h2>What You Should Do</h2>
<ul>
<li><strong>If you&#39;re buying in 2026:</strong> Budget for ITI at the general 1% rate (3% in privileged-tax-regime cases), applied to the legally assessed base rather than necessarily the purchase price — confirm the base and settlement for your transaction.</li>
<li><strong>If you already own property:</strong> Monitor whether your municipality conducts a new property valuation under the IPI framework. Your annual tax bill may change depending on property type, taxable value, and any surcharge exposure.</li>
<li><strong>If you&#39;re selling:</strong> Be aware that the expanded ITI scope covers more types of transactions. Discuss with your lawyer how the new rules apply to your specific situation, particularly if the transaction involves promissory contracts or contractual position assignments.</li>
<li><strong>In all cases:</strong> Work with a Cape Verdean lawyer who is up to date on the new legislation. The reform is substantial, and the interaction between the two new codes and other elements of the tax system (capital gains, inheritance, Green Card benefits) requires professional guidance.</li>
</ul>
<hr>
<h2>Monitoring the Market</h2>
<p>Property tax changes affect pricing and transaction activity. The Cape Verde Real Estate Index tracks public listings across the market and publishes source-linked context, including median <em>asking</em> prices by island and tracked inventory levels.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 4: AREI market data">[4]</a></sup></p>
<p><em>Stay informed at the <a href="/market">market data</a> page.</em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>What is the property transfer tax in Cape Verde?</h3>
<p>Since 1 January 2026, the transfer tax is ITI (Imposto sobre a Transmissão de Imóveis). The general rate is 1%, with a 3% rate in cases involving a qualifying privileged-tax regime. Ask a qualified local lawyer to verify the taxable base and applicable rate before completion.</p>
<h3>What is the annual property tax in Cape Verde?</h3>
<p>The annual property tax is IPI (Imposto sobre a Propriedade de Imóveis). The general rate is 0.1%; a 0.15% rate applies specifically to <em>terrenos para construção</em> (construction land) on a special taxable base set by the law. Statutory uplifts apply to vacant, ruined or degraded urban property and to unfinished principal façades.</p>
<h3>Do Green Card holders get tax benefits?</h3>
<p>The original Green Card framework includes specified tax benefits, and the 2026 ITI and IPI codes preserve remissions established under special legislation. Whether a specific benefit applies to your transaction must be confirmed with a qualified local lawyer and the competent tax authority — it is neither automatically lost nor automatically granted. See the <a href="/blog/cape-verde-green-card-residency">Green Card guide</a>.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full cost breakdown and buying process</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — Tax treatment for property investors</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute tax or legal advice. Tax legislation is subject to change and interpretation, and rates apply to a legally assessed taxable base that is not necessarily the purchase price. Always consult a qualified Cape Verdean tax advisor or lawyer for advice specific to your situation.</em></p>
`,
  },
  {
    slug: "cape-verde-rental-yields-realistic",
    title: "Cape Verde Rental Yields: What to Realistically Expect in 2026",
    description: "Rental yield claims in Cape Verde property marketing range from conservative to wildly optimistic. If you're buying property as an investment, you need to understand what drives...",
    date: "2026-02-19",
    modifiedAt: "2026-06-19",
    readTime: "9 min read",
    tags: ["Investment","Rental","Yields"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Rental yield claims in Cape Verde property marketing range from conservative to wildly optimistic. If you&#39;re buying property as an investment, you need to understand what drives rental income in this market, what the realistic return range looks like, and what costs eat into your gross yield before you see a cent.</p>
<p>This article separates the marketing from the math.</p>
<hr>
<h2>The Two Rental Models</h2>
<p>Property owners in Cape Verde typically earn rental income through one of two models — or sometimes a hybrid of both.</p>
<h3>Hotel Rental Schemes (Managed)</h3>
<p>Many resort and hotel-complex developments in Cape Verde offer a managed rental scheme. You buy a unit within the development, and a management company handles everything: marketing, guest bookings, check-in, cleaning, maintenance, and guest services. When you&#39;re not using the property, it&#39;s rented to tourists as a hotel or holiday apartment.</p>
<p><strong>How the income split works:</strong> The management company takes a percentage of the gross rental income — typically 25–35%, though some schemes take more. From your share, you still need to cover annual service charges, maintenance reserves, and your tax obligations.</p>
<p><strong>Owner usage:</strong> Most schemes allow 4–6 weeks of personal use per year, with additional time bookable subject to availability. Some schemes restrict usage during peak season, which is worth checking — peak season is where most of the income is generated.</p>
<p><strong>Advantages:</strong> Completely hands-off. No need to manage guests, handle maintenance, or even be in the country. The property is maintained and occupied, which prevents deterioration in the tropical climate.</p>
<p><strong>Disadvantages:</strong> You&#39;re dependent on the management company&#39;s competence and marketing reach. Fees are significant. And the terms of the scheme may restrict your ability to use or modify the property.</p>
<h3>Self-Managed Rentals</h3>
<p>Some owners manage their own rentals, either directly or through a local property manager. This is more common with standalone villas or apartments outside resort complexes. You list on platforms like Airbnb or Booking.com, handle (or outsource) guest communication, and arrange cleaning and maintenance independently.</p>
<p><strong>Advantages:</strong> Higher gross yields (no management company taking 25–35%), more flexibility on pricing and usage, and full control over your property.</p>
<p><strong>Disadvantages:</strong> Requires active management, or you need to find and manage a reliable local contact. Marketing, pricing optimization, and guest communication take time. And you&#39;re fully responsible for maintenance — a significant consideration in a tropical, salt-air environment where things deteriorate faster than in temperate climates.</p>
<hr>
<h2>What Yields Actually Look Like</h2>
<p>Here&#39;s where it gets important to distinguish between numbers you&#39;ll see in marketing materials and numbers that reflect after-cost reality.</p>
<h3>Gross Rental Yields</h3>
<p>Industry figures and agency marketing typically cite gross rental yields of 5–8% for Cape Verde, with some claiming 7–12% for prime locations. These figures represent total rental income as a percentage of the property purchase price, before any deductions.</p>
<p>On a €150,000 apartment generating €10,000 in annual rental income, the gross yield is 6.7%.</p>
<h3>Net Yields: Where the Numbers Shrink</h3>
<p>Net yield is what actually matters — it&#39;s what&#39;s left after you subtract all costs from your rental income.</p>
<p>Costs that reduce your gross yield:</p>
<table>
<thead>
<tr>
<th>Cost Category</th>
<th>Typical Range</th>
<th>Notes</th>
</tr>
</thead>
<tbody><tr>
<td>Management company fees</td>
<td>25–35% of gross rental income</td>
<td>Hotel scheme only</td>
</tr>
<tr>
<td>Annual service/community charges</td>
<td>€600–2,000+</td>
<td>Depends on development amenities</td>
</tr>
<tr>
<td>Maintenance reserve</td>
<td>€500–1,000+</td>
<td>Tropical climate accelerates wear</td>
</tr>
<tr>
<td>IPI (annual property tax)</td>
<td>0.1% general; 0.15% for construction land, on a special base</td>
<td>New from Jan 2026</td>
</tr>
<tr>
<td>Utility standing charges</td>
<td>€300–600</td>
<td>Water, electricity minimums</td>
</tr>
<tr>
<td>Insurance</td>
<td>€200–500</td>
<td>Building and contents</td>
</tr>
<tr>
<td>Platform commissions</td>
<td>3–15%</td>
<td>If self-managing via Airbnb etc.</td>
</tr>
<tr>
<td>Void periods</td>
<td>Variable</td>
<td>No property is rented 365 days/year</td>
</tr>
<tr>
<td>Occasional repairs/replacements</td>
<td>Variable</td>
<td>AC units, appliances, furniture</td>
</tr>
</tbody></table>
<p>For a managed scheme, a realistic net yield after all costs is typically in the range of 3–5% — roughly half of the headline gross figure. Self-managed properties can achieve higher net yields, but this requires active effort and reliable local support.</p>
<hr>
<h2>What Drives Rental Income in Cape Verde</h2>
<p>Several factors determine whether a property sits at the top or bottom of the yield range.</p>
<ul>
<li><strong>Island and location:</strong> <a href="/listings/sal">Sal</a> (especially Santa Maria) has the strongest rental demand due to its international airport, tourism infrastructure, and name recognition. <a href="/listings/boa-vista">Boa Vista</a> is growing. Other islands have thinner rental markets.</li>
<li><strong>Proximity to the beach:</strong> Cape Verde&#39;s appeal is fundamentally beaches and sunshine. Properties within walking distance of good beaches command higher rates and better occupancy.</li>
<li><strong>Property quality and presentation:</strong> Well-maintained, nicely furnished properties with modern amenities (reliable WiFi, air conditioning, good kitchen) outperform dated or basic units significantly. The market is becoming more competitive as new developments raise the standard.</li>
<li><strong>Management quality:</strong> In a managed scheme, the management company&#39;s marketing reach, platform presence, and guest service standards directly impact occupancy and rates. A poor management company can turn a great property into a mediocre investment.</li>
<li><strong>Seasonality:</strong> Cape Verde has relatively mild seasonality compared to many Mediterranean destinations — it&#39;s warm year-round. However, European school holidays and winter months (November–April) are peak season. Expect higher rates and occupancy in these periods, with a noticeable dip from May to October.</li>
<li><strong>Flight connections:</strong> Direct flights from major European cities correlate strongly with rental demand. Sal benefits most from this. When new routes are announced (as with easyJet&#39;s 2025 London Gatwick–Sal service), rental demand in the connected destination tends to increase.</li>
</ul>
<hr>
<h2>Red Flags in Rental Yield Projections</h2>
<p>If someone is showing you rental yield numbers to sell you a property, watch for these warning signs:</p>
<ul>
<li><strong>Guaranteed yields that seem too good.</strong> Some developers offer &quot;guaranteed&quot; rental yields for the first few years (often 7–10%). These are typically subsidized from the sale price — you&#39;re essentially paying yourself back. Once the guarantee period ends, actual market yields may be lower. Understand the economics behind any guarantee.</li>
<li><strong>Gross yields presented as net.</strong> Always ask whether quoted yields are gross or net, and what costs are included in the calculation. A 8% gross yield can easily become 3.5% net.</li>
<li><strong>100% occupancy assumptions.</strong> No property achieves 100% occupancy. Realistic projections should assume 60–75% occupancy for well-managed properties in good locations, lower for less-established areas.</li>
<li><strong>Ignoring maintenance costs.</strong> Salt air, humidity, and sun take a toll on buildings and furnishings in Cape Verde. Any projection that doesn&#39;t account for ongoing maintenance and periodic refurbishment is incomplete.</li>
<li><strong>No comparable evidence.</strong> Ask for data on actual rental performance of similar properties in the same development or area. If the developer or agent can&#39;t provide this, the projections are speculative.</li>
</ul>
<hr>
<h2>The Long-Term Picture</h2>
<p>Rental yields are only part of the investment return. Cape Verde property also offers potential capital appreciation as the tourism market grows and infrastructure develops. Tourist arrivals have grown from around 200,000 in the early 2000s to over 1.2 million, and the government targets 1.3 million by 2026. Direct flight connections continue to expand. New hotel and resort developments are raising the destination&#39;s profile.</p>
<p>The currency peg to the euro removes exchange rate risk for eurozone investors and provides stability for others. Political stability — Cape Verde is consistently rated one of Africa&#39;s most democratic countries — reduces country risk.</p>
<p>None of this guarantees returns, but the structural trajectory supports the property market.</p>
<hr>
<h2>Doing Your Research</h2>
<p>Understanding what properties are actually listed for — and how prices compare across islands, locations, and property types — is essential before committing capital.</p>
<p><a href="https://kazaverde.com">Cape Verde Real Estate Index</a> provides a searchable index of Cape Verde property listings with normalized pricing, source-linked detail pages, and market context. Use it to understand the market before you engage with agents or developers.</p>
<p><em>Explore the current market at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>What rental yield can I expect in Cape Verde?</h3>
<p>Gross rental yields of 5–8% are commonly cited, but realistic net yields after all costs (management fees, maintenance, taxes, voids) are typically 3–5% for managed schemes. Self-managed properties can achieve higher net yields with active effort.</p>
<h3>Is Cape Verde good for Airbnb?</h3>
<p>Sal and Boa Vista have strong short-term rental markets driven by European tourism. Properties in Santa Maria (Sal) with beach access and modern amenities perform best. Self-managed Airbnb lets can outperform hotel rental schemes in terms of net yield, but require local support for cleaning, maintenance, and guest management.</p>
<h3>What are the ongoing costs of owning property in Cape Verde?</h3>
<p>Expect annual costs of €2,000–5,000+ depending on the property, including community charges (€600–2,000+), maintenance reserve (€500–1,000+), the new IPI property tax, utilities, and insurance. IPI is generally described as 0.1% for urban property and 0.15% for land, with possible surcharges for vacant, ruined/degraded, or unfinished-facade properties. See our <a href="/blog/cape-verde-property-tax-reform-2026">2026 tax reform guide</a> for updated tax details.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Island Should You Buy On?</a> — Rental demand comparison by island</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Expensive Mistakes to Avoid</a> — Including pitfalls with rental schemes</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — How the new IPI affects your cost calculations</li>
</ul>
<hr>
<p><em>This article is for informational purposes only. Rental yields depend on many factors and past performance does not indicate future results. Always conduct your own due diligence and consult a qualified financial advisor before making investment decisions.</em></p>
`,
  },
  {
    slug: "cape-verde-green-card-residency",
    title: "Cape Verde Green Card: How Residency Through Property Investment Works",
    description: "Cape Verde's Green Card is a renewable residence authorisation for foreign property investors. How the €80,000/€120,000 thresholds, the five- then ten-year renewal cycle, filing, and tax treatment actually work — checked against primary sources.",
    date: "2026-02-16",
    modifiedAt: "2026-06-19",
    readTime: "8 min read",
    tags: ["Residency","Investment","Green Card"],
    sourceIds: ["lei-greencard", "dr-greencard", "lei-iti", "lei-ipi", "lei-nationality", "arei-listings"],
    content: `<p><em>Last updated: February 2026. Legal position verified against primary sources (Boletim Oficial) on 19 June 2026.</em></p>
<p>Cape Verde&#39;s Green Card (<em>Cartão Verde</em>) is a residence authorisation for foreign nationals who invest in real estate on the islands. This guide explains the statutory framework — the renewal cycle, investment thresholds, where applications are filed, the decision process, and the tax treatment — and flags the points that must be confirmed with qualified Cape Verdean counsel.</p>
<blockquote><p>This is editorial guidance, not legal advice. Residency, nationality, and tax rules are governed by Cape Verdean legislation and applied case by case. Confirm your position with qualified Cape Verdean counsel and the competent authorities before acting.</p></blockquote>
<hr>
<h2>What the Green Card Is</h2>
<p>The Green Card is a residence title for holders of a second residence in Cape Verde, established by Lei n.º 30/IX/2018 and its implementing regulation, Decreto-Regulamentar n.º 1/2020.<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018">[1]</a></sup><sup class="kv-cite"><a href="#src-dr-greencard" aria-label="Source 2: Decreto-Regulamentar 1/2020">[2]</a></sup> The statute was created to attract foreign investment in real estate and tourism.<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018">[1]</a></sup></p>
<p><strong>The title is subject to renewal.</strong> The Green Card is renewable every five years, and for ten years from the second renewal onward (Lei n.º 30/IX/2018, art. 8.º).<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018, art. 8">[1]</a></sup> It is not a status that is permanent and never expiring, and it remains tied to the qualifying property investment.</p>
<hr>
<h2>Investment Thresholds</h2>
<p>The minimum qualifying property investment depends on the economic classification of the municipality where you buy (Lei n.º 30/IX/2018, art. 3.º):<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018, art. 3">[1]</a></sup></p>
<table>
<thead>
<tr>
<th>Municipality classification</th>
<th>Minimum qualifying investment</th>
</tr>
</thead>
<tbody><tr>
<td>GDP per capita below the national average</td>
<td>€80,000</td>
</tr>
<tr>
<td>GDP per capita equal to or above the national average</td>
<td>€120,000</td>
</tr>
</tbody></table>
<p>The classification is made at municipal level; island GDP is the fallback only where municipal GDP per capita cannot be calculated (Lei n.º 30/IX/2018, art. 3.º).<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018, art. 3">[1]</a></sup> Which threshold applies to a specific municipality depends on the current official classification, so confirm the applicable figure for your target municipality with your lawyer rather than assuming it from the island or town. The investment must be in real estate located in Cape Verde; the property can be residential, touristic, or commercial.</p>
<hr>
<h2>Tax Treatment</h2>
<p>The original Green Card framework provides specified tax benefits — exemption from the former IUP and from IRPS (Lei n.º 30/IX/2018, art. 6.º).<sup class="kv-cite"><a href="#src-lei-greencard" aria-label="Source 1: Lei 30/IX/2018, art. 6">[1]</a></sup> The 2026 ITI and IPI codes preserve benefits established under special legislation (Código do ITI, art. 6.º, n.º 3; Código do IPI, art. 11.º, n.º 2).<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 3: Código do ITI, art. 6 n.º 3">[3]</a></sup><sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 4: Código do IPI, art. 11 n.º 2">[4]</a></sup> The codes preserve special-legislation benefits in general terms and do not name the Green Card statute, so whether and how a benefit applies to a particular acquisition should be confirmed with qualified Cape Verdean counsel and the competent tax authority. In practice the benefits at issue can include:</p>
<ul>
<li><strong>Transfer tax (ITI):</strong> potential relief on the transfer tax at purchase. The general ITI rate is 1%, with 3% in cases involving a qualifying privileged-tax regime (Código do ITI, art. 11.º).<sup class="kv-cite"><a href="#src-lei-iti" aria-label="Source 3: Código do ITI, art. 11">[3]</a></sup></li>
<li><strong>Annual property tax (IPI):</strong> a possible reduction in the annual property tax for a defined period, where granted by the competent municipal body. The general IPI rate is 0.1% (Código do IPI, art. 28.º).<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 4: Código do IPI, art. 28">[4]</a></sup></li>
<li><strong>Inheritance:</strong> possible relief on transfer tax in <em>mortis causa</em> succession.</li>
</ul>
<p>Do not assume that every benefit automatically disappeared under the 2026 reform, nor that every Green Card buyer automatically receives them. The availability and administrative application of a benefit in an individual transaction must be confirmed with qualified Cape Verdean counsel and the competent tax authority. See the <a href="/blog/cape-verde-property-tax-reform-2026">2026 tax reform guide</a> for how the codes are structured.</p>
<hr>
<h2>Requirements and Application</h2>
<p>Documentation typically requested includes:</p>
<ul>
<li>A valid passport</li>
<li>Criminal record certificates (from your home country and any countries of recent residence)</li>
<li>A health certificate</li>
<li>An international vaccination certificate</li>
<li>Property purchase documentation proving the investment meets the threshold</li>
<li>Bank transfer confirmation showing the funds originated from abroad</li>
<li>Property registration certificates</li>
<li>Construction contract (if the investment is in a property under construction)</li>
</ul>
<p>Under the implementing regulation, Casa do Cidadão is designated as the single counter (Balcão Único Green Card), and the Direção de Estrangeiros e Fronteiras (DEF) is the competent authority for the decision and issuance (Decreto-Regulamentar n.º 1/2020, art. 3.º).<sup class="kv-cite"><a href="#src-dr-greencard" aria-label="Source 2: Decreto-Regulamentar 1/2020, art. 3">[2]</a></sup> The DEF decides on a Green Card application within fifteen days, counted from receipt of the documents specified in the regulation (art. 14.º).<sup class="kv-cite"><a href="#src-dr-greencard" aria-label="Source 2: Decreto-Regulamentar 1/2020, art. 14">[2]</a></sup> That statutory decision window is not the same as an end-to-end timeline: document preparation, routing, any deficiencies, and issuance can add time before and after the decision period runs.</p>
<hr>
<h2>Path to Citizenship</h2>
<p>The Green Card does not automatically produce citizenship. A holder may potentially apply for naturalisation after satisfying the generally applicable statutory residence requirement and all other nationality-law conditions. Citizenship is neither automatic nor guaranteed by the Green Card.<sup class="kv-cite"><a href="#src-lei-nationality" aria-label="Source 5: Lei 33/X/2023">[5]</a></sup></p>
<p>Under the nationality law, naturalisation requires legally residing in Cape Verde for at least five years, alongside the other cumulative statutory conditions (Lei n.º 33/X/2023, art. 13.º, n.º 1, al. a)).<sup class="kv-cite"><a href="#src-lei-nationality" aria-label="Source 5: Lei 33/X/2023, art. 13 n.º 1 a)">[5]</a></sup> &quot;Legal residence&quot; means genuine, documented residence — not merely owning property. Confirm the current conditions with Cape Verdean counsel.</p>
<hr>
<h2>Practical Considerations</h2>
<ul>
<li><strong>This isn&#39;t just a paperwork exercise.</strong> The Green Card is tied to a real investment and is designed for people who will spend time in Cape Verde; authorities can assess whether the residence is genuine.</li>
<li><strong>The property must be a real investment.</strong> It must meet the minimum threshold, be properly registered, and the funds must demonstrably come from abroad.</li>
<li><strong>Tax implications in your home country.</strong> Becoming a tax resident of Cape Verde may affect your tax obligations at home, and Cape Verde&#39;s double-taxation treaty network is limited. Whether a treaty applies to your country of residence should be confirmed with a tax advisor in that country before committing.</li>
<li><strong>Healthcare and services.</strong> Health-care provision varies by island, and many foreign residents maintain international health insurance and plan for travel for specialist care. Confirm current local provision for the specific island you are considering rather than assuming a single nationwide standard.</li>
<li><strong>Cost of living.</strong> Day-to-day costs are generally lower than in much of Western Europe, though imported goods can be expensive and availability varies by island.</li>
</ul>
<hr>
<h2>Finding Properties That Qualify</h2>
<p>Not every listing meets a Green Card threshold — particularly at the €80,000 level, where options are more limited. You can filter <a href="/listings">tracked listings</a> by price range and island to see which monitored asking prices fall within the qualifying bands.</p>
<blockquote><p><strong>Based on monitored asking-price listings. Not transaction prices or valuations.</strong> A listing&#39;s asking price is not the qualifying investment value; your lawyer confirms both the price that counts and the municipal classification that sets your threshold.<sup class="kv-cite"><a href="#src-arei-listings" aria-label="Source 6: AREI listings">[6]</a></sup></p></blockquote>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>How much do I need to invest for Cape Verde residency?</h3>
<p>The qualifying minimum is €80,000 where the municipality&#39;s GDP per capita is below the national average, or €120,000 where it is equal to or above the national average. Island GDP is used only as a fallback where municipal GDP cannot be calculated. The investment must be in Cape Verdean real estate, with funds demonstrably from abroad. Confirm the classification for your target municipality with a lawyer.</p>
<h3>Does the Green Card need to be renewed?</h3>
<p>Yes. The Green Card is renewed every five years initially, and from the second renewal onward the applicable period is ten years. It is not a permanent, never-expiring status, and it stays tied to the qualifying property investment.</p>
<h3>Can I get Cape Verde citizenship through property investment?</h3>
<p>Not automatically. Under the nationality law, naturalisation requires legally residing in Cape Verde for at least five years, plus further cumulative statutory conditions (Lei n.º 33/X/2023, art. 13.º, n.º 1, al. a)); only then may a holder apply. Citizenship is neither automatic nor guaranteed by the Green Card. Confirm the current conditions with Cape Verdean counsel.</p>
<h3>What tax benefits does the Green Card provide?</h3>
<p>The original framework includes specified tax benefits, and the 2026 ITI and IPI codes preserve remissions established under special legislation. Whether a specific benefit applies to your transaction must be confirmed with a qualified local lawyer and the competent tax authority. See the <a href="/blog/cape-verde-property-tax-reform-2026">2026 tax reform guide</a>.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Step-by-step process for qualifying purchases</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — Updated tax framework affecting Green Card benefits</li>
<li><a href="/blog/which-cape-verde-island-property">Which Island Should You Buy On?</a> — Investment thresholds vary by municipal GDP classification</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute legal, immigration, or tax advice. Immigration, nationality, and tax rules may change and are applied case by case. Always consult qualified Cape Verdean counsel and a tax advisor in your home country before making decisions about residency or property investment.</em></p>
`,
  },
  {
    slug: "mistakes-buying-property-cape-verde",
    title: "7 Expensive Mistakes to Avoid When Buying Property in Cape Verde",
    description: "Cape Verde's property market is accessible, the buying process is relatively straightforward, and the legal framework provides solid protections for foreign buyers. But \"relativ...",
    date: "2026-02-13",
    modifiedAt: "2026-06-19",
    readTime: "10 min read",
    tags: ["Buying","Mistakes","Guide"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Cape Verde&#39;s property market is accessible, the buying process is relatively straightforward, and the legal framework provides solid protections for foreign buyers. But &quot;relatively straightforward&quot; doesn&#39;t mean &quot;impossible to get wrong.&quot; The mistakes buyers make here tend to be expensive and entirely avoidable.</p>
<p>This article covers the most common ones.</p>
<hr>
<h2>1. Not Hiring an Independent Lawyer</h2>
<p>This is the single most consequential mistake foreign buyers make in Cape Verde, and it happens more often than you&#39;d think.</p>
<p>Some buyers rely on the seller&#39;s lawyer or the developer&#39;s legal team to handle the transaction. Others skip legal representation entirely, assuming the estate agent or notary will protect their interests. Neither is true.</p>
<p>An independent lawyer — one who works exclusively for you, with no relationship to the seller or agent — will:</p>
<ul>
<li>Verify ownership through the official registry and tax-office records (typically a <em>certidão de registo predial</em> and a <em>certidão matricial</em>)</li>
<li>Check for outstanding debts and mortgages</li>
<li>Review the ITI/IPI position, municipal tax settlement status, and any historic IUP issues before 2026</li>
<li>Verify that community charges are paid</li>
<li>Review all contracts before you sign</li>
<li>Ensure the title transfer is properly registered</li>
</ul>
<p>Agree the lawyer's scope and fee in writing before instructing. The cost of independent legal advice is modest relative to the problems it prevents — potentially the entire value of your investment.</p>
<hr>
<h2>2. Ignoring the Valor Patrimonial</h2>
<p>The <em>Valor Patrimonial</em> is the officially assessed value of a property, set by the local municipality. It can affect property taxes and transfer taxes. Here&#39;s the problem: many properties in Cape Verde — particularly those in developments built during the pre-2008 construction boom — may have municipal values that do not match their current market price.</p>
<p>Why this matters: the taxable value used for ITI and IPI can materially affect your buying and ownership costs. If a property sells for €80,000 but has a higher municipal taxable value, your tax exposure may be higher than expected.</p>
<p>Before agreeing to a purchase price, ask your lawyer to verify the Matriz, Registo Predial, taxable value, tax settlement status, and any surcharge exposure with the municipality. Factor the confirmed position into your total cost calculation, and understand that under the new 2026 IPI system, municipal reassessments may change these values over time.</p>
<hr>
<h2>3. Paying Deposits on Unfinished Developments Without Protection</h2>
<p>Off-plan purchases — buying a property that hasn&#39;t been built yet — can offer lower prices and the ability to choose finishes. They also carry significantly more risk than buying an existing property.</p>
<p>Developers in Cape Verde range from well-capitalized, experienced operators to smaller outfits with limited track records. Construction delays can and do occur, and in some cases — particularly developments started during the pre-2008 boom — projects have stalled entirely, leaving buyers with deposits paid and no property. Model the possibility of delay rather than assuming on-time delivery.</p>
<p>If you&#39;re buying off-plan, your lawyer should verify the developer&#39;s track record and financial stability, ensure the land ownership and building permits are in order, review the contract for protections — stage-payment schedules tied to construction milestones (not arbitrary dates), clear remedies if the developer defaults, and specifications for finishes and quality standards, and confirm whether a bank guarantee protects your deposit. Never pay a lump sum upfront for an unfinished property.</p>
<hr>
<h2>4. Not Understanding the Rental Scheme Terms</h2>
<p>If you&#39;re buying in a resort or hotel complex with a managed rental scheme, the scheme&#39;s terms will significantly impact your returns and your ability to use and control your own property.</p>
<p>Details that buyers frequently overlook:</p>
<ul>
<li><strong>Management fee percentage.</strong> Is it 25%? 30%? 35%? The difference between 25% and 35% of gross rental income is substantial over years of ownership.</li>
<li><strong>Owner usage restrictions.</strong> How many weeks can you use the property per year? Can you use it during peak season, or are you restricted to low-demand periods? If you can only use your property in September (the quietest month), that&#39;s a meaningful limitation.</li>
<li><strong>Exit clauses.</strong> Can you leave the rental scheme? Under what conditions? Some schemes lock owners in for extended periods. If the management company underperforms, being trapped in a scheme with no exit is frustrating and costly.</li>
<li><strong>Maintenance and service charges.</strong> What&#39;s included? What&#39;s extra? How are charges calculated, and how have they changed over time? Ask to see the last 3–5 years of community meeting minutes and financial statements.</li>
<li><strong>Furnishing requirements.</strong> Some schemes require specific furniture packages, regular refurbishment cycles, or adherence to brand standards. Understand these obligations and costs before committing.</li>
</ul>
<hr>
<h2>5. Underestimating Ongoing Costs</h2>
<p>Buying the property is only the beginning. Cape Verde&#39;s tropical maritime climate — warm, humid, salty air — accelerates deterioration of everything from paint and plaster to electrical systems and appliances. Budget for reality, not optimism.</p>
<p>Annual costs that buyers frequently underestimate:</p>
<p>Condominium and service charges are set by the development and tend to increase over time — confirm the current figure and recent history with the condominium administration rather than assuming a market-wide number. Maintenance in a salt-air environment requires more frequent attention than similar properties in temperate climates. Air conditioning units, water heaters, and appliances have shorter lifespans. Even if you&#39;re in a rental scheme, you&#39;re usually responsible for your unit&#39;s contents, appliances, and periodic refurbishment. The new IPI annual property tax (from January 2026) adds a predictable but ongoing obligation. And if you&#39;re not using the property regularly, someone needs to check on it — whether that&#39;s a management company, a local property manager, or a trusted contact.</p>
<p>Build a realistic annual operating budget before you buy, and stress-test your investment return calculations against it.</p>
<hr>
<h2>6. Not Visiting the Island First</h2>
<p>This might seem obvious, but it happens: buyers purchase properties based on online listings, video tours, and agent descriptions without ever visiting the island where they&#39;re buying.</p>
<p>Cape Verde islands vary enormously. The lifestyle on Sal (tourist-oriented, busy, infrastructure in place) is completely different from Maio (quiet, undeveloped, limited services). The &quot;beachfront&quot; location in the listing might be a 20-minute walk on an unpaved road. The &quot;ocean view&quot; might be technically accurate but face a construction site. The &quot;vibrant community&quot; might consist of a few shops and a bar.</p>
<p>Visit before you buy. Spend at least a week on the island. Walk around at different times of day. Eat at local restaurants. Check the water pressure. Try the WiFi. Talk to other foreign property owners. Visit the specific property and its surroundings. Get a feel for what daily life actually looks like, not what it looks like in marketing photos.</p>
<p>If you&#39;re investing remotely and a visit genuinely isn&#39;t possible before committing, at minimum engage a local lawyer and an independent property assessor (not connected to the seller) to inspect the property and report back with photos and video.</p>
<hr>
<h2>7. Assuming Cape Verdean Law Works Like Your Home Country&#39;s</h2>
<p>Cape Verde&#39;s legal system is based on Portuguese law, which functions differently from common law systems (UK, US, Australia) and from many other civil law systems. Assumptions from your home market can lead to expensive surprises.</p>
<p>Examples of differences that catch foreign buyers:</p>
<ul>
<li><strong>Inheritance law.</strong> Cape Verde has rules around forced heirs, though foreign nationals can generally dispose of property freely by testament, provided the will contains a declaration that their personal law governs. But if you die without a valid Cape Verdean will, the estate is distributed according to the law of your country of nationality — which may not match your intentions. Get a Cape Verdean will prepared even if you have one at home.</li>
<li><strong>No double taxation agreements with many countries.</strong> Cape Verde has limited double taxation treaties, meaning income, capital gains, or inheritance from your property may be taxed in both Cape Verde and your home country. Plan for this with a tax advisor who understands both jurisdictions.</li>
<li><strong>The notary and registry system.</strong> The definitive transfer instrument must satisfy the applicable legal, authentication, tax, and land-registration requirements, and a notary (<em>Cartório Notarial</em>) commonly plays a central role as a neutral public official. The correct instrument and procedure for your transaction should be confirmed by your lawyer, notary, and the registry — the process follows specific procedural requirements that your lawyer will navigate.</li>
<li><strong>Power of Attorney.</strong> If you can&#39;t be present for all stages of the transaction, a <em>procuração</em> (power of attorney) is essential. It must be properly notarized and, if executed abroad, may need to be apostilled. Plan for this early — don&#39;t leave it to the last minute.</li>
</ul>
<hr>
<h2>The Common Thread</h2>
<p>Most of these mistakes share a root cause: insufficient preparation and professional advice. Cape Verde property can be a rewarding investment, but the market is small, information is fragmented, and the legal and tax environment requires local expertise.</p>
<p>Do your research. Use tools like the <a href="/listings">Cape Verde Real Estate Index</a> to understand the market landscape — what&#39;s available, at what asking prices, on which islands. Then engage qualified local professionals before committing capital.</p>
<p><em>Browse current listings on the <a href="/listings">index</a>.</em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Is it safe to buy property in Cape Verde as a foreigner?</h3>
<p>Yes, provided you follow proper procedures. Cape Verde&#39;s legal framework, based on Portuguese law, offers strong buyer protections. The key is hiring an independent lawyer, conducting thorough due diligence, and understanding local practices. Read our <a href="/blog/buying-property-cape-verde-guide">step-by-step buying guide</a> for the full process.</p>
<h3>What happens if a developer goes bankrupt?</h3>
<p>This has occurred in Cape Verde, particularly with developments started during the pre-2008 boom. Without proper contractual protections (bank guarantees, stage payments tied to milestones), buyers risk losing their deposits. Always have your lawyer review the developer&#39;s financial standing and ensure contract protections are in place before paying any deposit.</p>
<h3>Do I need to visit Cape Verde before buying?</h3>
<p>We strongly recommend it. Islands vary enormously in lifestyle, infrastructure, and available services. Listings can be misleading — what looks like &quot;beachfront&quot; online may not match expectations on the ground. If a visit is genuinely impossible, engage an independent local assessor to inspect and report back.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — The complete buying process to follow</li>
<li><a href="/blog/which-cape-verde-island-property">Which Island Should You Buy On?</a> — Compare islands before committing</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. Always consult qualified local professionals before purchasing property in Cape Verde.</em></p>
`,
  },
  {
    slug: "sal-vs-santiago-property",
    title: "Sal vs Santiago: Which Cape Verde Island Makes Sense for Property Buyers?",
    description: "Sal and Santiago are Cape Verde's two most active property markets, but they serve fundamentally different buyer profiles. One is built around tourism; the other is the country's...",
    date: "2026-03-10",
    modifiedAt: "2026-06-19",
    readTime: "8 min read",
    tags: ["Sal", "Santiago", "Comparison"],
    sourceIds: ["arei-market", "lei-ipi"],
    content: `<p><em>Last updated: March 2026</em></p>
<p>Sal and Santiago are Cape Verde's two most active property markets, but they serve fundamentally different buyer profiles. One is built around tourism; the other is the country's economic and political capital. Treating them as interchangeable options is a common error.</p>
<p>This comparison breaks down the decision factors so you can match the island to your actual goal.</p>
<hr>
<h2>The Core Difference</h2>
<p>Sal's property market is a tourism derivative. Demand is driven by international visitors, short-term rental activity, and foreign buyers seeking holiday investments. If European tourist arrivals to Cape Verde increase, Sal benefits. If they contract, Sal feels it first.</p>
<p>Santiago's market is more diversified. Demand comes from a functioning domestic economy — Cape Verde's largest city (Praia), government institutions, a growing middle class, business travel, and a modest but developing tourism sector. The market moves with the Capeverdean economy, not just with international flight routes.</p>
<p>This distinction matters more than any individual data point about prices or yields.</p>
<hr>
<h2>Sal: The Tourism Market</h2>
<h3>What the market looks like</h3>
<p>Sal's property activity is concentrated in and around Santa Maria, a beach resort town on the southern tip of the island. It has direct international flights from the UK, Portugal, Germany, the Netherlands, and other European countries — which is the fundamental infrastructure underpinning demand.</p>
<p>Property types are predominantly apartments and units within resort complexes. Standalone villas exist but are less common than on some other islands. For current asking-price context, see the live <a href="/market">market data</a> and <a href="/blog/cape-verde-property-prices-by-island">prices by island</a> — these are monitored asking-price listings, not transaction prices or valuations.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup></p>
<h3>Rental market</h3>
<p>Sal has the strongest short-term rental market in Cape Verde. International tourist volume provides a large pool of potential guests, and the infrastructure to serve them (tour operators, online booking platforms, airport transfers) is mature.</p>
<p>Gross rental yields cited by developers and agents should be treated as provider quotations to verify, not market facts, and net yields are lower once management fees, service charges, maintenance, and the annual IPI are deducted. Ask for the assumptions and the management-fee percentage behind any quoted figure. The general IPI rate is 0.1%, with 0.15% applying specifically to <em>terrenos para construção</em> (construction land) on a special base; the rate is increased by 25% for vacant, ruined or degraded urban property and by 10% for unfinished principal façades (Código do IPI, arts. 23.º, 24.º, 28.º).<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 2: Código do IPI">[2]</a></sup></p>
<p>Seasonality is moderate on Sal relative to other islands — European winter sun demand helps smooth the calendar — but July and August can be slower as European tourists gravitate toward Mediterranean destinations.</p>
<h3>Liquidity</h3>
<p>Sal has an established resale market, ongoing international buyer interest, and real estate agents with marketing reach to European buyers — and it carries the deepest tracked listing sample in the index. In practice that tends to give a wider buyer pool than the more domestically-driven islands if you need to exit, though actual time-to-sell depends on the property, price, and conditions at the time.</p>
<h3>Who Sal suits</h3>
<ul>
<li>Buyers whose primary objective is rental income from tourist lets</li>
<li>Holiday home buyers who want guaranteed access to beach infrastructure and restaurants</li>
<li>Investors who want the most established and liquid market in Cape Verde</li>
<li>Buyers applying for the Green Card (confirm the target municipality's GDP classification — and so the €80,000 or €120,000 threshold — with a lawyer)</li>
</ul>
<hr>
<h2>Santiago: The Diversified Market</h2>
<h3>What the market looks like</h3>
<p>Santiago is Cape Verde's largest island and home to Praia, the capital — a city of around 160,000 people with ministries, embassies, universities, a functioning port, and a broad service economy. The property market reflects this: you'll find urban apartments for residential use, commercial properties, land, coastal developments near Tarrafal, and a growing supply of modern housing targeting the domestic middle class.</p>
<p>Price ranges vary enormously by type and location. Urban apartments in Praia can be found at lower absolute prices than equivalent-quality properties on Sal; coastal and development properties vary widely. The market is less consolidated and therefore less easy to summarize with single-number benchmarks.</p>
<h3>Rental market</h3>
<p>Santiago's rental market divides into two segments that rarely overlap:</p>
<p><strong>Domestic/residential rental:</strong> Praia has a real residential rental market driven by professionals, government workers, university students, and the growing Cape Verdean middle class. This market functions on longer-term leases (typically 6–12 months), lower nightly rates than tourist lets, and is less dependent on international flight availability. It's a more stable income stream but with lower peak yields.</p>
<p><strong>Tourism rental:</strong> Santiago receives international visitors — Praia is a transit hub and has historical sites, and Tarrafal is developing a beach tourism niche — but the tourist volume is substantially lower than Sal. Short-term rental income potential is correspondingly more limited unless the property is in a specific tourist zone.</p>
<h3>Liquidity</h3>
<p>The Santiago resale market is thinner than Sal's for foreign-buyer-targeting properties. If you own an apartment in Praia marketed at the domestic market, your buyer pool is primarily Cape Verdean, which changes the liquidity profile. For foreign investors, this is a real consideration — selling may take longer and may require more local-market engagement than selling on Sal.</p>
<h3>Who Santiago suits</h3>
<ul>
<li>Buyers seeking residential investment with domestic rental demand rather than tourist dependency</li>
<li>Buyers planning to live or spend extended time in Cape Verde (Praia has the most developed urban infrastructure in the archipelago)</li>
<li>Commercial investors or those interested in the local economy beyond tourism</li>
<li>Buyers wanting to enter the market at lower absolute price points for equivalent property quality</li>
<li>Buyers applying for the Green Card (Praia's classification should be verified with a lawyer — some areas of Santiago may qualify at the €80,000 threshold)</li>
</ul>
<hr>
<h2>Side-by-Side Comparison</h2>
<table>
<thead>
<tr>
<th>Factor</th>
<th>Sal</th>
<th>Santiago</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Market driver</strong></td>
<td>International tourism</td>
<td>Domestic economy + local tourism</td>
</tr>
<tr>
<td><strong>Price level</strong></td>
<td>Higher (tourism premium)</td>
<td>Wider range; lower floor</td>
</tr>
<tr>
<td><strong>Short-term rental potential</strong></td>
<td>Strong</td>
<td>Limited outside tourist zones</td>
</tr>
<tr>
<td><strong>Long-term rental demand</strong></td>
<td>Moderate (seasonal)</td>
<td>Steady (residential)</td>
</tr>
<tr>
<td><strong>Resale liquidity</strong></td>
<td>Higher (international buyer pool)</td>
<td>Lower (primarily domestic pool)</td>
</tr>
<tr>
<td><strong>Infrastructure for tourists</strong></td>
<td>Extensive</td>
<td>Moderate; growing</td>
</tr>
<tr>
<td><strong>Urban amenities</strong></td>
<td>Limited (small island)</td>
<td>Extensive (capital city)</td>
</tr>
<tr>
<td><strong>Risk profile</strong></td>
<td>Correlated to European tourism</td>
<td>Correlated to Capeverdean economy</td>
</tr>
</tbody>
</table>
<hr>
<h2>The Decision Framework</h2>
<p>Choose Sal if your primary goal is rental income from tourist lets and you want to operate in Cape Verde's most established, liquid, and internationally visible property market. Accept the tourism-correlated risk profile and the higher entry price.</p>
<p>Choose Santiago if you want exposure to the domestic Capeverdean economy rather than the international tourism cycle, if you're planning to live in or regularly use the country (Praia is far more functional as a full-time city than Santa Maria), or if you're looking for lower absolute entry prices with a residential rental strategy.</p>
<p>Neither island is objectively better. They serve different strategies. The mistake is choosing one when your goals fit the other.</p>
<hr>
<h2>What to Check Before Deciding</h2>
<ul>
<li><strong>Your rental strategy.</strong> Tourist let or residential lease? The answer points to an island almost immediately.</li>
<li><strong>Your use frequency.</strong> Beach holiday or urban stay? Sal serves the former; Santiago the latter.</li>
<li><strong>Your risk tolerance.</strong> Tourism is cyclical. The Capeverdean domestic economy is also small and exposed to global shocks, but its cycle is different from European tourist demand.</li>
<li><strong>Your exit timeline.</strong> If you may need to sell in 5–7 years, Sal's international buyer pool gives you more options.</li>
<li><strong>Green Card eligibility.</strong> If residency is part of the plan, confirm the investment threshold for your specific target location with a qualified lawyer.</li>
</ul>
<hr>
<h2>Browsing Current Listings</h2>
<p><a href="/listings/sal">Browse current Sal properties</a> and <a href="/listings/boa-vista">Boa Vista properties</a> on the Cape Verde Real Estate Index. Santiago listings are included in the main <a href="/listings">search index</a>.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Full six-island comparison</li>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process for foreign buyers</li>
<li><a href="/blog/boa-vista-property-guide">Boa Vista Property Guide</a> — The third option between Sal's prices and Santiago's profile</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Market conditions change. Always consult qualified local professionals before making any property investment.</em></p>
`,
  },
  {
    slug: "off-plan-property-cape-verde-risks",
    title: "Buying Off-Plan Property in Cape Verde: Risks, Protections, and What to Check",
    description: "Off-plan purchases — buying a property before or during construction — are common in Cape Verde, particularly in resort developments on Sal and Boa Vista. The potential advantages...",
    date: "2026-03-17",
    modifiedAt: "2026-06-19",
    readTime: "9 min read",
    tags: ["Off-Plan", "Risk", "Legal"],
    content: `<p><em>Last updated: March 2026</em></p>
<p>Off-plan purchases — buying a property before or during construction — are common in Cape Verde, particularly in resort developments on Sal and Boa Vista. The potential advantages are lower entry prices, stage-payment structures that ease cashflow, and the possibility of capital appreciation before completion. The risks are real and have materialized in this market before.</p>
<p>This guide covers what can go wrong, how to protect yourself, and the specific checks to run before committing to any off-plan purchase.</p>
<hr>
<h2>Why Off-Plan Exists in Cape Verde</h2>
<p>Cape Verde's tourism-driven development model creates a natural demand for off-plan sales. Developers need pre-sales to secure construction financing; buyers want early-access pricing before a development reaches full occupancy and the management rental scheme is established. The transaction is theoretically beneficial to both parties.</p>
<p>The problem is asymmetry of information and risk. The developer knows the project's financial health, construction progress, and contractual obligations. The buyer, especially a foreign buyer purchasing remotely, often does not.</p>
<hr>
<h2>The Main Risks</h2>
<h3>1. Construction Delays</h3>
<p>The most common off-plan problem in Cape Verde is not outright failure — it's delay. A development promised for completion in 18 months takes three years. This has cascading consequences: your capital is committed, you're earning no rental income, the rental market position you bought into may have changed, and any financing arrangements are under strain.</p>
<p>Delays can stem from supply-chain issues (most construction materials are imported), contractor capacity, regulatory approvals, and occasionally developer cashflow problems. Model a range of delay scenarios rather than assuming the stated completion date, and stress-test what a materially later handover would do to your cashflow and rental plans.</p>
<h3>2. Developer Financial Risk</h3>
<p>If a developer becomes insolvent, an off-plan buyer's legal position depends on the specific contract, what is registered, any guarantees or security in place, the payment structure, and applicable insolvency law — it is not automatically that of a secured creditor, and without protections a buyer may rank as an unsecured creditor. Several Cape Verde developments, particularly those started during the pre-2008 tourism boom, stalled or failed when developer financing collapsed, and buyers who had paid deposits or stage payments had limited legal recourse — in some cases losing their funds. Ask your lawyer exactly where you would rank, and what would secure your money, before paying anything.</p>
<p>This risk has not disappeared. Smaller developers with shallow balance sheets, projects dependent on continued pre-sales for construction financing, and developments without bank-guaranteed stage payments all carry meaningful insolvency risk.</p>
<h3>3. Specification Changes</h3>
<p>The finished property may differ from what was sold. Developers have been known to substitute finishes, change unit configurations, reduce common area facilities, or modify the rental scheme terms between sale and completion. Without strong contractual protections, buyers have limited grounds for recourse on changes that fall short of a fundamental breach.</p>
<h3>4. Rental Scheme Changes</h3>
<p>Many off-plan purchases in Cape Verde are sold with a projected rental yield underpinned by a managed rental scheme. The scheme's terms — income split, management fees, allowed personal use, maintenance obligations — may change between purchase and operation. The management company may also change, particularly if the original operator exits or the development is acquired.</p>
<h3>5. Resale Limitations</h3>
<p>Some off-plan contracts restrict resale before completion or during the early years of the rental scheme. If you need to exit before the development is established, you may be limited in your options. Understand the resale conditions before signing.</p>
<h3>6. Legal Title Risk</h3>
<p>In some cases, developers have sold units in developments where the underlying land title was not fully clear or where planning permissions were incomplete. Your lawyer must verify not just the contract, but the developer's clear title to the land and all necessary regulatory approvals before you pay any deposit.</p>
<hr>
<h2>Protections to Demand</h2>
<p>The following protections are not automatically included in off-plan contracts. You need to negotiate for them, and if a developer refuses to provide them, treat that as a significant warning signal.</p>
<h3>Bank Guarantee on Stage Payments</h3>
<p>Ask independent counsel whether an enforceable on-demand guarantee, an escrow or deposit arrangement, registered security, a staged-payment mechanism, or another form of protection is available for the specific project. One strong form is a bank guarantee covering your stage payments, under which a Cape Verdean bank undertakes to return your payments if the developer fails to complete as contracted — but do not assume any such protection is standard or will be offered. Whether it is available depends on the developer and the project.</p>
<p>If no enforceable protection is in place, your financial exposure can be the full amount of any payments made, recoverable only through litigation against a potentially insolvent entity. Treat the absence of any protection as a significant warning signal.</p>
<h3>Stage Payments Tied to Measurable Milestones</h3>
<p>Payment schedules should be tied to verifiable construction milestones — foundation complete, structure complete, shell complete, fit-out complete — not to calendar dates or percentages of time elapsed. Calendar-based payment schedules benefit the developer regardless of construction progress.</p>
<p>Ensure each milestone can be independently verified. Your lawyer or an independent inspector should confirm each stage before you release payment.</p>
<h3>Clear Completion Date with Penalties</h3>
<p>The contract should specify a firm completion date (not a range) and include financial penalties for the developer if that date is missed. Without penalties, the developer has no contractual incentive to prioritize your project. The penalty should be meaningful — a percentage of the contract value per month of delay — not a token amount.</p>
<h3>Specification Schedule Attached to Contract</h3>
<p>The full specification — materials, finishes, appliances, furniture, common area facilities — should be attached to the contract as a binding schedule, not described in marketing brochures. Brochures are not contracts. If the developer changes a specification item, you need the contract to define what it was and create grounds for recourse.</p>
<h3>Clear Rental Scheme Terms</h3>
<p>If you are buying as an investment and the rental scheme is part of the investment case, the scheme's terms must be contractually specified: income split percentage, management fee structure, personal use entitlement, duration of the scheme, and conditions under which it can be modified or terminated. Projected yields in marketing materials are not binding. The contract terms are.</p>
<hr>
<h2>Due Diligence Checklist</h2>
<p>Before committing to any off-plan purchase, your independent lawyer should verify:</p>
<ul>
<li><strong>Developer track record.</strong> Has the developer completed projects of similar size and type before? Visit at least one of their completed developments and speak to owners.</li>
<li><strong>Land title.</strong> The developer must have clear, registered title to the land. Check the CIP (Certidão de Identificação Predial) — the same document used in resale purchases — for the underlying land parcel.</li>
<li><strong>Planning permissions.</strong> All necessary construction and development permits must be in place, not pending. Developments sold with planning approvals "in process" carry regulatory risk.</li>
<li><strong>Construction financing.</strong> How is the construction being funded? A development financed primarily through pre-sales has more execution risk than one with committed bank financing.</li>
<li><strong>Bank guarantee availability.</strong> Can the developer provide a bank guarantee? If not, why not?</li>
<li><strong>Escrow arrangement.</strong> Are stage payments held in escrow by a third party (bank or notary) until milestones are met, rather than going directly to the developer?</li>
<li><strong>Company registration and financial standing.</strong> Verify the developer's corporate status. If the developer is a special purpose vehicle (SPV), understand who the principals are and what their financial standing is.</li>
</ul>
<hr>
<h2>Assessing the Developer</h2>
<p>The most important single variable in an off-plan purchase is developer quality. Everything else — contractual protections, bank guarantees, milestone payments — is risk mitigation. Developer quality is the underlying risk itself.</p>
<p>Questions to ask and verify:</p>
<ul>
<li>How many Cape Verde developments has this developer completed? (Not started — completed.)</li>
<li>Were those developments delivered on time, or with significant delays?</li>
<li>Are the rental schemes on completed developments performing as projected?</li>
<li>Can you speak to existing owners in their completed developments? A developer unwilling to provide references is a warning sign.</li>
<li>What is the developer's relationship with their construction contractor? Are they building in-house or through a general contractor?</li>
</ul>
<hr>
<h2>Payment Structure: A Common Shape</h2>
<p>Off-plan payment structures vary by developer and contract; one illustrative shape, to compare against what you are actually offered, is:</p>
<table>
<thead>
<tr>
<th>Stage</th>
<th>Typical Payment</th>
</tr>
</thead>
<tbody>
<tr>
<td>Reservation / CPCV signing</td>
<td>10–20%</td>
</tr>
<tr>
<td>Construction milestone 1 (foundation/structure)</td>
<td>20–30%</td>
</tr>
<tr>
<td>Construction milestone 2 (shell complete)</td>
<td>20–30%</td>
</tr>
<tr>
<td>Completion / deed signing</td>
<td>Remaining balance</td>
</tr>
</tbody>
</table>
<p>Be cautious of structures that front-load payments heavily before construction milestones are reached, or that require large sums at reservation before contracts are signed and reviewed by your lawyer.</p>
<hr>
<h2>If Things Go Wrong</h2>
<p>If a developer delays, changes specifications, or becomes insolvent, your options depend on the contractual protections you secured upfront. Without a bank guarantee, your primary recourse is legal action in Cape Verdean courts — a slow and costly process even if you ultimately prevail.</p>
<p>Document everything throughout the purchase process: every payment, every piece of correspondence, every milestone. If problems emerge, your lawyer will need a clear paper trail.</p>
<hr>
<h2>The Bottom Line</h2>
<p>Off-plan purchasing in Cape Verde is legitimate and can be financially rational — but the risk profile is materially higher than buying a completed property. The due diligence required is more extensive, the legal protections matter more, and developer quality is the central variable.</p>
<p>Never buy off-plan without an independent Cape Verdean lawyer reviewing the full contract before you sign anything or pay any deposit. The cost of legal advice is modest relative to the capital at risk.</p>
<p><em>Browse current listings on the <a href="/listings">index</a>.</em></p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full process for resale and new-build purchases</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Mistakes Buyers Make in Cape Verde</a> — Common errors and how to avoid them</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. The legal status and protections of an off-plan buyer depend on the contract, registrations, guarantees, and applicable insolvency law. Always consult a qualified Cape Verdean lawyer before entering any property contract.</em></p>
`,
  },
  {
    slug: "cape-verde-property-management-remotely",
    title: "Managing Property in Cape Verde Remotely: A Guide for Foreign Owners",
    description: "Most foreign buyers in Cape Verde do not live on the island where their property is located. Managing a property from another country adds a layer of operational complexity...",
    date: "2026-03-24",
    modifiedAt: "2026-06-19",
    readTime: "8 min read",
    tags: ["Management", "Investment", "Remote"],
    sourceIds: ["lei-ipi"],
    content: `<p><em>Last updated: March 2026</em></p>
<p>Most foreign buyers in Cape Verde do not live on the island where their property is located. Managing a property from another country adds a layer of operational complexity that is easy to underestimate during the buying process and painful to discover afterward.</p>
<p>This guide covers the management options available, what each costs, the risks of remote ownership in Cape Verde's specific climate and market context, and what to look for when selecting a management arrangement.</p>
<hr>
<h2>Why Cape Verde Is Harder to Self-Manage Than Most Markets</h2>
<p>Remote property ownership creates challenges in any market. Cape Verde has several factors that amplify them:</p>
<p><strong>Climate.</strong> The tropical maritime environment — consistent heat, salt air, periodic heavy rain, and high humidity — accelerates deterioration faster than most European climates. Paint, plaster, metalwork, electrical systems, appliances, and outdoor surfaces all degrade faster. A property left unvisited for six months in Cape Verde will show more wear than a comparable property in northern Europe left for the same period.</p>
<p><strong>Distance and logistics.</strong> Physical distance from the islands means that minor issues (a leaking pipe, a broken appliance, an air conditioning unit failure) that could be resolved in a day in your home country can take weeks if there is no competent local party managing the response. Contractors and tradespeople need to be found, scheduled, and supervised — all remotely.</p>
<p><strong>Language.</strong> While many people in the tourism sector speak English, operational property management — communicating with service contractors, local utility providers, municipal offices — is conducted in Cape Verdean Creole and Portuguese. Non-speakers are dependent on intermediaries for almost all operational communication.</p>
<p><strong>Market fragmentation.</strong> There is no MLS-style market infrastructure and relatively few established property management firms with a long track record, so vetting a provider takes more effort than in mature markets. Do not assume a particular licensing or regulatory regime applies to property managers either way — confirm any applicable registration, licensing, or authorisation requirements with the competent authorities rather than relying on an assumption that there are none.</p>
<hr>
<h2>Management Options</h2>
<h3>Option 1: Resort/Hotel Rental Scheme</h3>
<p>The most common arrangement for foreign buyers in resort developments on Sal and Boa Vista. The development's management company handles everything — guest marketing and bookings, check-in, cleaning, maintenance, and minor repairs — in exchange for a percentage of gross rental income.</p>
<p><strong>Management fee:</strong> charged as a percentage of gross rental income, and sometimes structured differently (fixed fee plus percentage, or tiered by occupancy). Fee levels vary by operator — get the exact percentage and structure in writing and read the contract carefully rather than relying on a market-wide figure.</p>
<p><strong>What's covered:</strong> Day-to-day operational management, guest services, and routine cleaning and maintenance, usually including minor repairs below a contractually defined threshold. Major repairs, appliance replacements, and capital expenditure are typically the owner's responsibility — confirm the threshold and exclusions in the contract.</p>
<p><strong>What's not covered:</strong> Owners typically remain responsible for annual community/service charges, insurance, their share of any major building repairs approved by the owners' association, and periodic refurbishment cycles. In some schemes, owners must pay for an approved furniture package and meet refurbishment standards at defined intervals.</p>
<p><strong>Practical reality:</strong> The quality of hotel rental schemes varies enormously between developments and management companies. The same headline fee structure can produce vastly different outcomes depending on the operator's occupancy rates, booking platform relationships, and operational standards. Before buying into a scheme, investigate the specific operator's performance, not just the scheme's structure.</p>
<h3>Option 2: Independent Property Manager</h3>
<p>Outside of resort schemes, individual property managers operate on Sal, Boa Vista, and Santiago. They handle a mix of short-term rental management, property caretaking, and maintenance coordination.</p>
<p><strong>Fee:</strong> usually a percentage of rental income for active short-term-rental management, or a flat monthly fee for caretaking without active rental management; many offer combined packages. Fees vary by provider — ask for a written, dated quotation rather than relying on a typical range.</p>
<p><strong>Advantages over resort schemes:</strong> More flexibility in pricing, listing platforms, and guest selection. You're not locked into a single operator's distribution network. You can list on Airbnb, Booking.com, and other platforms with the manager handling operations.</p>
<p><strong>Disadvantages:</strong> Vetting is harder, and the sector is comparatively informal, with few standard contract formats. Do not assume there is no applicable registration or authorisation requirement — confirm with the competent authorities. A good independent manager is valuable; a poor one can be costly and difficult to exit.</p>
<p><strong>Short-term tourist accommodation:</strong> may require registration, licensing, tax compliance, guest reporting, safety measures, and municipal or development-specific approvals. Confirm current requirements with the competent tourism authority, municipality, tax administration, condominium or development administration, and independent counsel before letting short-term.</p>
<h3>Option 3: Trusted Local Contact</h3>
<p>Some owners, particularly those who visit regularly and have established local networks, manage their properties through a trusted local contact — a neighbor, a Cape Verdean friend, or a local professional who checks on the property and handles minor issues.</p>
<p>This works when the relationship and trust are solid. It is not a substitute for a professional management arrangement if you are trying to generate rental income. It is also fragile — personal circumstances change, and a dependency on a single individual with no formal arrangement creates operational risk.</p>
<hr>
<h2>Costs of Remote Ownership</h2>
<p>Beyond the management fee itself, build a budget around these cost lines. We deliberately do not publish euro ranges for them — amounts vary by development, property, and provider, and a market-wide figure would mislead. Obtain dated written quotations for each:</p>
<table>
<thead>
<tr>
<th>Cost</th>
<th>What to budget for</th>
</tr>
</thead>
<tbody>
<tr>
<td>Property management / rental scheme fee</td>
<td>A percentage of gross rental income (and/or a fixed fee) — get the provider's quotation</td>
</tr>
<tr>
<td>Annual community / service charge</td>
<td>Set by the development — confirm with the condominium administration</td>
</tr>
<tr>
<td>Annual IPI property tax (from Jan 2026)</td>
<td>0.1% general; 0.15% for construction land, on a special base</td>
</tr>
<tr>
<td>Building insurance (owner's portion)</td>
<td>Quote from the insurer / via the condominium</td>
</tr>
<tr>
<td>Contents insurance</td>
<td>Quote from the insurer</td>
</tr>
<tr>
<td>Maintenance reserve</td>
<td>Plan a recurring reserve — the salt-air climate accelerates wear</td>
</tr>
<tr>
<td>Periodic refurbishment</td>
<td>Plan a multi-year refurbishment cycle</td>
</tr>
</tbody>
</table>
<p>Many rental yield figures provided by developers or agents omit several of these cost lines, which inflates the apparent net yield. Build all of them into your model before assessing whether the investment makes sense.</p>
<p>Confirm the IPI position for your property with a qualified local lawyer or municipality, especially if the property is construction land, vacant, ruined or degraded, or has an unfinished principal façade (Código do IPI, arts. 23.º, 24.º, 28.º).<sup class="kv-cite"><a href="#src-lei-ipi" aria-label="Source 1: Código do IPI">[1]</a></sup></p>
<hr>
<h2>Selecting a Management Company</h2>
<p>Whether you're evaluating a resort scheme operator or an independent property manager, the due diligence questions are similar:</p>
<ul>
<li><strong>How many properties do they currently manage on this island?</strong> A manager handling 3 properties has a different capacity and reliability profile than one managing 80.</li>
<li><strong>What is their current occupancy rate for comparable properties?</strong> Ask for documented historical data, not projections. If they can't or won't provide occupancy data for existing properties they manage, that's a warning.</li>
<li><strong>Can you speak to current owners they manage?</strong> References should be from owners with similar property types to yours. Ask owners directly: how responsive is the manager, what problems have occurred, would you use them again?</li>
<li><strong>What is the contract exit mechanism?</strong> How much notice is required to terminate the arrangement? Are there penalties for early exit? What happens to bookings already made if you switch managers?</li>
<li><strong>How are maintenance decisions and costs communicated?</strong> Who approves expenditure above a threshold? How quickly do you receive notifications of issues? How are photos and condition reports shared?</li>
<li><strong>What accounting and reporting do you receive?</strong> Monthly statements showing income, expenditure, and net remittance are a minimum standard. Some operators provide owner portals with real-time visibility; others send PDF statements by email. Know what you're getting.</li>
</ul>
<hr>
<h2>What to Have in Place Before Completion</h2>
<p>Do not wait until after you take ownership to arrange management. Have the management structure agreed and operational from day one:</p>
<ul>
<li>Signed management contract with clear fee structure, scope, and exit terms</li>
<li>Local bank account for receiving rental income and making property-related payments</li>
<li>Buildings and contents insurance confirmed</li>
<li>Key management procedure established (who has keys, how guest access works)</li>
<li>Utility accounts transferred into your name (electricity, water, internet)</li>
<li>Community fees direct debit or standing payment arranged</li>
</ul>
<p>If you're buying off-plan, agree the management arrangement before construction completes so it is operational from the handover date.</p>
<hr>
<h2>Visiting the Property</h2>
<p>Even with a well-run management arrangement in place, plan to visit the property at least once a year. This gives you a current-state view that no photo or report fully replicates, allows you to assess whether the management company's quality matches their reporting, lets you address accumulated maintenance issues in person, and maintains your relationship with the local management team.</p>
<p>The personal use provision in most rental schemes (typically 4–6 weeks per year) serves both holiday and inspection purposes. Use it.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — End-to-end buying process</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Mistakes Buyers Make in Cape Verde</a> — Including management-related errors</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Fee examples are illustrative budgeting categories, not quoted market rates — obtain dated written quotations. Short-term tourist accommodation may carry registration, licensing, tax, guest-reporting, safety, and municipal requirements; confirm these with the competent authorities. Always conduct your own due diligence and consult qualified local professionals.</em></p>
`,
  },
  {
    slug: "financing-property-cape-verde",
    title: "How to Finance a Property Purchase in Cape Verde as a Foreign Buyer",
    description: "Many foreign buyers in Cape Verde fund purchases from their own capital or home-country borrowing. Local mortgages may be available but vary by lender — how to compare them, and the factors that decide whether local borrowing is realistic.",
    date: "2026-03-31",
    modifiedAt: "2026-06-19",
    readTime: "7 min read",
    tags: ["Financing", "Mortgage", "Buying"],
    sourceIds: ["bcv-fx"],
    content: `<p><em>Last updated: March 2026. Reviewed against primary sources on 19 June 2026.</em></p>
<p>Many foreign buyers fund Cape Verde purchases from their own capital or from borrowing in their home country, rather than from a local mortgage. This guide explains the financing routes and the factors that decide whether local borrowing is realistic — without publishing rate or loan-to-value figures we cannot tie to a named, current lender tariff.</p>
<hr>
<h2>How Foreign Buyers Tend to Fund Purchases</h2>
<p>Local mortgage access for non-residents can be limited, lending criteria vary by bank, and processing can be slow — which is why many foreign buyers bring their own capital or borrow against a home-country asset instead. We do not have transaction-level data on the share of buyers who pay cash, so treat &quot;most pay cash&quot; as a widely-repeated impression rather than a measured fact.</p>
<p>If you are not in a position to purchase with cash or near-cash, understanding the alternatives is important before you start the buying process.</p>
<hr>
<h2>Cape Verdean Bank Mortgages</h2>
<p>Local mortgages from Cape Verdean banks may be available to foreign nationals, but the terms make them unattractive for many buyers and they vary by lender and applicant.</p>
<h3>What to confirm with the lender</h3>
<p>Rates, loan-to-value, maximum term, fees, age and income requirements, and processing times are set by each bank&#39;s current published products and underwriting — and change over time. We do not publish generic figures for these here, because a number that is not tied to a named, current lender tariff is not reliable. Ask each lender, in writing, for a dated quotation covering:</p>
<ul>
<li>the published rate (or reference index plus margin) and whether it is fixed or variable;</li>
<li>maximum loan-to-value and the deposit implied;</li>
<li>maximum term and any age limit at maturity;</li>
<li>arrangement, valuation, and early-repayment fees;</li>
<li>the loan currency (typically Cape Verdean escudo, pegged to the euro at 1 EUR = 110.265 CVE<sup class="kv-cite"><a href="#src-bcv-fx" aria-label="Source 1: Banco de Cabo Verde">[1]</a></sup>);</li>
<li>income and residency documentation required for a non-resident;</li>
<li>and that any offer is &quot;subject to underwriting.&quot;</li>
</ul>
<p>Build a dated, like-for-like comparison from those quotations rather than from headline ranges.</p>
<h3>Non-resident complexity</h3>
<p>Cape Verdean banks vary in their willingness to lend to non-residents. Some require proof of an established financial relationship with a Cape Verdean bank before processing a mortgage application, and documentation requirements are typically more extensive for non-residents.</p>
<h3>Currency peg</h3>
<p>The escudo is pegged to the euro at 1 EUR = 110.265 CVE, under an arrangement with Portugal that has supported the peg since the late 1990s.<sup class="kv-cite"><a href="#src-bcv-fx" aria-label="Source 1: Banco de Cabo Verde">[1]</a></sup> This reduces currency risk for euro-based buyers, but the peg is a policy commitment, not an immutable mechanism, and should be factored into long-term planning.</p>
<h3>Which banks lend to foreigners</h3>
<p>Banco Comercial do Atlântico (BCA) and Caixa Económica de Cabo Verde (CECV) are commonly used by foreign property buyers. Both typically require you to open a Cape Verdean bank account before processing a mortgage application. Confirm current lending criteria with the bank and your lawyer, as conditions change.</p>
<hr>
<h2>Financing Through Your Home Country</h2>
<p>For most European buyers, releasing capital from assets at home is more cost-effective than borrowing locally in Cape Verde.</p>
<h3>Home equity release</h3>
<p>If you own property in your home country with significant equity, a remortgage, equity release, or home equity loan may provide funds at rates lower than a Cape Verdean bank mortgage — depending on prevailing rates in your country at the time. The Cape Verdean property serves as the use case for the capital; the loan is secured against your home-country asset.</p>
<p>The practical advantage: lower rates, familiar lending environment, faster processing, and no dependency on Cape Verdean bank criteria. The practical risk: your home-country property is the collateral, not the Cape Verde property.</p>
<h3>Remortgage or equity release</h3>
<p>Similar to the above. If your home property is owned outright or has a low outstanding mortgage, a full remortgage may release a lump sum at current domestic rates. This is particularly common among UK buyers accessing equity built up over years of property appreciation.</p>
<h3>Investment portfolio liquidity</h3>
<p>Some buyers liquidate investment assets (funds, bonds, equities) to fund a Cape Verde purchase, particularly if portfolio returns are modest and a tangible asset with rental income is the preferred allocation. The tax implications of selling investment assets will vary by jurisdiction and should be reviewed with a financial adviser before acting.</p>
<hr>
<h2>Developer Payment Plans (Off-Plan)</h2>
<p>For off-plan purchases specifically, developer payment plans effectively function as short-term financing. Stage payments spread over the construction period (typically 18–36 months) mean you are not required to commit the full purchase price at signing.</p>
<p>A typical structure might require 20% at contract signing, 30–40% across construction milestones, and the balance at completion. For buyers who have the full capital available, this staged commitment can free up liquidity during the construction period. For buyers who do not yet have the full capital, it creates a delivery obligation — you must have the full balance ready by completion, regardless of whether construction ran on schedule.</p>
<p>Read the <a href="/blog/off-plan-property-cape-verde-risks">off-plan risks guide</a> before treating a payment plan as a financing solution.</p>
<hr>
<h2>What to Have in Place Before Making an Offer</h2>
<p>Regardless of your financing route, have the following resolved before making any offer or paying any deposit:</p>
<ul>
<li><strong>Proof of funds or financing commitment.</strong> Know where the full purchase price is coming from. If you're releasing equity from home, have that process underway and a clear timeline for funds availability. Don't make an offer contingent on financing you haven't yet secured.</li>
<li><strong>Cape Verdean bank account open.</strong> You need this for the transaction regardless of financing source. Open it early. BCA and CECV are the standard options for foreign buyers.</li>
<li><strong>NIF (tax number) obtained.</strong> You cannot complete a purchase without it. Get it as early as possible. See the <a href="/blog/buying-property-cape-verde-guide">buying guide</a> for the process.</li>
<li><strong>Transaction cost budget confirmed.</strong> Budget separately for ITI, notary and registration costs, legal fees, and any applicable duties or municipal charges. Current summaries generally describe ITI as 1% of taxable value, with 3% in privileged-tax-regime cases. These are cash costs at completion that cannot be financed.</li>
<li><strong>Foreign exchange plan.</strong> If you are converting from a non-euro currency, account for exchange rate exposure. The CVE is pegged to the euro, so the relevant rate is your home currency against the euro. Consider whether to transfer funds progressively or all at once.</li>
</ul>
<hr>
<h2>The Investment Case With and Without Leverage</h2>
<p>Whether leverage improves the investment case depends on the cost of borrowing relative to your expected net rental yield. Local borrowing is only accretive if your net yield exceeds your all-in borrowing cost. Because local rates are generally higher than realistic net yields on tourist-let property, leverage often does not improve the return — but run the numbers with your own dated lender quotation and a conservative yield assumption rather than a headline figure.</p>
<p>The typical Cape Verde investment case is therefore usually not built on leverage. It rests on the combination of net rental income, any capital appreciation, personal-use value, and (for some buyers) the residency pathway through the <a href="/blog/cape-verde-green-card-residency">Green Card</a>. Model your returns without leverage as the base case, and treat any financing as a cashflow management tool, not a way to amplify an uncertain return.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process including cost breakdown</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — Transaction and annual tax costs under the new system</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Lending conditions, rates, and tax rules change and are set by individual lenders. Always consult qualified professionals and obtain dated written quotations before making financing decisions.</em></p>
`,
  },
  {
    slug: "boa-vista-property-guide",
    title: "Boa Vista Property Guide: What Buyers Need to Know in 2026",
    description: "Boa Vista is Cape Verde's second major tourism island and its second most active property market. It's often positioned as the growth alternative to Sal — lower entry prices...",
    date: "2026-04-07",
    modifiedAt: "2026-06-19",
    readTime: "9 min read",
    tags: ["Boa Vista", "Islands", "Guide"],
    sourceIds: ["arei-market"],
    content: `<p><em>Last updated: April 2026</em></p>
<p>Boa Vista is Cape Verde's second major tourism island and its second most active property market. It's often positioned as the growth alternative to Sal — lower entry prices, developing infrastructure, and the suggestion that it is today where Sal was a decade ago. That framing is partially accurate and partially marketing. This guide separates the two.</p>
<hr>
<h2>Island Overview</h2>
<p>Boa Vista is the third largest island in Cape Verde by area and has its own international airport — Aristides Pereira International Airport, near Rabil — with European routes that are seasonal and best checked against current airport and airline schedules. It is a large, sparsely populated island, with the resident population concentrated in the main town of Sal Rei; for the precise census figure and reference year, consult the Instituto Nacional de Estatística (INE).</p>
<p>The island is characterized by wide, largely empty beaches, extensive sand dunes, and a flat, semi-arid interior. The natural landscape is one of its strongest assets — several beaches are among the finest in the archipelago — but the infrastructure outside resort zones remains limited relative to Sal.</p>
<p>Tourism is the primary economic driver. Outside the resort areas, the local economy is small and services are limited. This context matters for buyers assessing the island for either residential use or investment.</p>
<hr>
<h2>Key Areas for Property Buyers</h2>
<h3>Sal Rei</h3>
<p>The main town and commercial center of Boa Vista. Sal Rei has the island's most functional daily infrastructure — a market, restaurants, banks, pharmacies, and municipal services. It sits on the western coast and has a waterfront with sea views.</p>
<p>Property in Sal Rei is a mix of local residential housing, colonial-era buildings (some with renovation potential), and newer development. It's the most livable option for buyers who want to actually use the island as a base rather than purely as an investment. Prices are generally lower than comparable properties in resort complexes.</p>
<h3>Northern Resort Zone (Chave Beach area)</h3>
<p>The primary concentration of resort developments is in the north of the island, centered around Praia de Chave — a long, undeveloped beach consistently rated as one of Cape Verde's finest. Several large resort and hotel-apartment complexes have been built here or are under development.</p>
<p>This is where most foreign investor activity is concentrated. Properties are predominantly apartments and hotel units within managed complexes, with the associated rental scheme model. Prices and availability vary significantly by development, age, and quality.</p>
<h3>Santa Monica and Southeast</h3>
<p>The southeast of the island — including the dramatic Viana Desert dune fields and the beach at Santa Monica — is largely undeveloped for property. Some land plots exist, but infrastructure is extremely limited. This is a long-term land speculation area rather than an active investment market.</p>
<hr>
<h2>Property Market</h2>
<h3>Price levels</h3>
<p>Headline asking prices on Boa Vista are generally lower than for comparable property on Sal, though the gap narrows for premium beachfront or ocean-view units in high-quality developments. Rather than quote a fixed discount or price band — which would imply a precision the listing data does not support — compare the current per-island figures directly.</p>
<blockquote><p><strong>Based on monitored asking-price listings. Not transaction prices or valuations.</strong> See the live <a href="/listings/boa-vista">Boa Vista listings</a> and the <a href="/blog/cape-verde-property-prices-by-island">prices-by-island</a> guide for current median asking prices by property type.<sup class="kv-cite"><a href="#src-arei-market" aria-label="Source 1: AREI market data">[1]</a></sup></p></blockquote>
<p>Individual properties vary by location, condition, view, and the quality of the development's management and rental scheme.</p>
<h3>Market activity</h3>
<p>The Boa Vista market is active but smaller than Sal's. There is a resale market, but it is thinner — fewer comparable sales, longer time-on-market for some properties, and fewer agents with strong international marketing reach than on Sal. Liquidity is a real consideration if your investment horizon is short or uncertain.</p>
<p>New development activity has continued in recent years, adding supply in the northern resort zone. This expansion is a double-edged signal: it reflects developer confidence in the market, but it also adds competitive supply for both rental and resale.</p>
<hr>
<h2>Rental Market</h2>
<p>Boa Vista's rental market is growing but demonstrably less mature than Sal's. The key variables:</p>
<p><strong>Flight access:</strong> The number of direct European routes to Boa Vista is growing but remains smaller than Sal's. More routes mean more potential guests; fewer routes mean more dependence on the routes that exist. Any significant reduction in a major airline's Boa Vista operations would meaningfully affect occupancy rates.</p>
<p><strong>Seasonality:</strong> European winter sun demand runs October to April, which is strong. Summer occupancy (June–September) is lower than on Sal, as Boa Vista has less established tourism infrastructure to attract non-package visitors. The seasonal gap is more pronounced than on Sal.</p>
<p><strong>Management quality variance:</strong> Because the market is smaller and newer, the range in management company quality is wide. A well-run resort with active European tour operator relationships can achieve solid occupancy; a poorly managed one in the same development cluster will significantly underperform.</p>
<p>Gross yields quoted by developers and agents on Boa Vista should be treated as provider quotations to verify, not market facts — and net yields are lower once management fees, service charges, maintenance, and the annual IPI are deducted. Ask for the assumptions and the management-fee percentage behind any quoted figure before relying on it.</p>
<hr>
<h2>Infrastructure Reality Check</h2>
<p>The infrastructure gap between Boa Vista and Sal is relevant to both lifestyle buyers and investors:</p>
<p><strong>Restaurants and services:</strong> Sal Rei has a reasonable range of restaurants and daily services. Outside the town and established resort zones, options are limited. Buyers who expect the variety and density of Santa Maria (Sal) will be disappointed with what's currently available on Boa Vista.</p>
<p><strong>Healthcare:</strong> Local medical provision is more limited than on the larger islands, and residents may need to travel for specialist or hospital care. Confirm the current facilities and the nearest hospital for your specific area with local sources before relying on them for extended stays.</p>
<p><strong>Internet and utilities:</strong> Connectivity has improved significantly in recent years but remains less reliable in some areas than in Sal's resort zones. Verify specifically for any property you're considering purchasing.</p>
<p><strong>Construction and development:</strong> Active development means some areas of the island are in a transition state — a current view from a property may change as neighboring developments are built. Check what is planned or under construction around any specific property you're considering.</p>
<hr>
<h2>The "Next Sal" Question</h2>
<p>The framing of Boa Vista as "the next Sal" has been used in property marketing for at least fifteen years. It is partially accurate (the island has developed significantly and tourism has grown) and partially an indefinitely deferrable claim. A few honest observations:</p>
<ul>
<li>Boa Vista's tourism growth is real and has continued upward. Direct flight connections have expanded. New hotel and resort capacity has been built and occupied.</li>
<li>However, Sal has also continued to develop, so the gap in tourism infrastructure hasn't closed as dramatically as the "next Sal" framing implies.</li>
<li>The capital appreciation case for Boa Vista is plausible but involves more uncertainty than a Sal investment at equivalent quality and location. Boa Vista buyers are making a more explicit bet on continued tourism growth than Sal buyers are.</li>
<li>Buyers who visited Boa Vista five years ago and are returning will find meaningful improvements. Buyers expecting Sal-level infrastructure today will find a gap that remains real.</li>
</ul>
<hr>
<h2>Who Boa Vista Suits</h2>
<ul>
<li>Buyers who want Sal-style beach island investment at a lower entry price and are comfortable with a less mature market</li>
<li>Buyers with a longer investment horizon (5–10 years) who are betting on continued tourism infrastructure development</li>
<li>Buyers who have visited the island and are specifically drawn to its natural landscape and quieter atmosphere relative to Sal</li>
<li>Green Card applicants: Boa Vista's classification should be verified with a lawyer — the required investment threshold (€80,000 vs €120,000) may differ by location</li>
</ul>
<p>Boa Vista is not the right choice for buyers who need high liquidity, who want Sal's current level of infrastructure today, or who have short exit timelines.</p>
<hr>
<h2>Due Diligence Points Specific to Boa Vista</h2>
<ul>
<li><strong>Development history check.</strong> Boa Vista has some stalled or incomplete developments from the pre-2008 boom. Verify that any development you're considering was completed and is currently operating, not merely presented as such.</li>
<li><strong>Management company track record.</strong> Given the wider quality variance, checking the specific management company's occupancy and operational record is more important here than on Sal.</li>
<li><strong>Surrounding development plans.</strong> Understand what is planned or under construction adjacent to any property you're considering. Views and access can change.</li>
<li><strong>Rental scheme exit terms.</strong> If the rental scheme is the primary investment case, understand the exit terms carefully — both your ability to exit the scheme and the resale market if you need to sell the property.</li>
</ul>
<hr>
<h2>Browsing Current Listings</h2>
<p><a href="/listings/boa-vista">Browse current Boa Vista properties for sale</a> in the Cape Verde Real Estate Index. All listings are source-linked with normalized euro pricing.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Full six-island comparison including Boa Vista</li>
<li><a href="/blog/sal-vs-santiago-property">Sal vs Santiago</a> — The two alternative major markets compared</li>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process for foreign buyers</li>
</ul>
<hr>
<!--SOURCES-->
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Market conditions change. Always conduct your own research and consult qualified local professionals before investing.</em></p>
`,
  },
];

// Offline articles — content preserved, hidden from public product.
// To re-enable: remove slug from this set.
const OFFLINE_SLUGS = new Set(["cape-verde-rental-yields-realistic"]);

export const BLOG_ARTICLES: BlogArticle[] = _ALL_BLOG_ARTICLES.filter(
  (a) => !OFFLINE_SLUGS.has(a.slug)
);

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
