export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  heroImage?: string;
  content: string;
  tags: string[];
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: "cape-verde-property-prices-by-island",
    title: "Cape Verde property prices by island: what the KazaVerde index currently shows",
    description:
      "Asking-price medians and listing counts by island, drawn from the KazaVerde index. A snapshot of publicly listed Cape Verde inventory, not the full market.",
    date: "2026-04-29",
    readTime: "6 min read",
    tags: ["Market", "Islands", "Data"],
    content: `<p><em>Last updated: April 2026</em></p>
<p>Cape Verde is not one property market. It is an archipelago of distinct island markets, each shaped by different levels of foreign demand, tourism infrastructure, and listing activity. A single archipelago-wide average tells you almost nothing.</p>
<p>This piece looks at what the <a href="/listings">KazaVerde index</a> currently shows island by island — where the tracked sample is large enough to be meaningful, and where it isn't.</p>
<blockquote><p>The figures below are <strong>asking prices from publicly listed properties KazaVerde currently tracks</strong> — not closing prices, not the full market, and not legally verified. Source coverage is still expanding. The live numbers on <a href="/listings">/listings</a> and <a href="/market">/market</a> are always the authoritative version.</p></blockquote>
<hr>
<h2>What the current index shows by island</h2>
<p>As of late April 2026, the KazaVerde index tracks roughly four hundred publicly listed properties across the archipelago. The distribution is heavily concentrated in the three islands with the most direct foreign-buyer activity. Three islands carry enough tracked listings to support a useful median:</p>
<div class="kv-island-grid">
  <div class="kv-island-stat">
    <div class="kv-island-stat-name">Sal</div>
    <div class="kv-island-stat-figs">
      <div><span>Tracked listings</span><strong>~145</strong></div>
      <div><span>Median asking</span><strong>~€99,000</strong></div>
    </div>
    <p>The deepest tracked sample by a wide margin. Direct international flights and the Santa Maria resort cluster anchor most of the foreign-buyer activity visible on the index.</p>
  </div>
  <div class="kv-island-stat">
    <div class="kv-island-stat-name">Santiago</div>
    <div class="kv-island-stat-figs">
      <div><span>Tracked listings</span><strong>~130</strong></div>
      <div><span>Median asking</span><strong>~€238,000</strong></div>
    </div>
    <p>Second-largest sample, and the highest median of the three. The mix appears weighted toward Praia city stock rather than resort apartments — different inventory, different median, not a "more expensive island."</p>
  </div>
  <div class="kv-island-stat">
    <div class="kv-island-stat-name">Boa Vista</div>
    <div class="kv-island-stat-figs">
      <div><span>Tracked listings</span><strong>~85</strong></div>
      <div><span>Median asking</span><strong>~€110,000</strong></div>
    </div>
    <p>Third-largest sample. Mix appears weighted toward resort apartments and off-plan stock around Sal Rei, where new-build asking prices can sit above realistic resale benchmarks.</p>
  </div>
</div>
<p>For the live version of these figures, with the underlying listings, see <a href="/market">/market</a> and the per-island grids: <a href="/listings?island=Sal">Sal</a>, <a href="/listings?island=Santiago">Santiago</a>, <a href="/listings?island=Boa+Vista">Boa Vista</a>.</p>
<hr>
<h2>The islands with too little tracked data to price</h2>
<p>The remaining islands appear in the index but have samples too thin to support a reliable median. That may reflect genuinely thin local activity, or simply that KazaVerde has not yet onboarded the sources where listings on those islands tend to surface.</p>
<ul>
<li><strong>Maio</strong> — around twenty tracked listings, but the priced rows cluster at a single low value, which may reflect source or normalization effects rather than a clean market distribution.</li>
<li><strong>São Nicolau</strong> and <strong>Fogo</strong> — under ten tracked listings each. Counts are real; medians are not yet meaningful.</li>
<li><strong>São Vicente</strong> and <strong>Santo Antão</strong> — only a handful of tracked listings each. Too thin for KazaVerde to publish a meaningful median.</li>
<li><strong>Brava</strong> — no tracked listings in the index at this snapshot.</li>
</ul>
<p>If you are specifically researching one of these islands, the most useful step is to look at the individual tracked listings on <a href="/listings">/listings</a> and follow the source links rather than rely on an aggregate. Coverage on these islands may deepen as new sources are added.</p>
<hr>
<h2>What appears to drive the gap</h2>
<p>The variation between islands reflects a few structural factors that pre-date any individual listing:</p>
<ul>
<li><strong>Direct flight access.</strong> Sal and Boa Vista have international airports with direct European routes. That underwrites most of the foreign-buyer demand visible in the index.</li>
<li><strong>Sample depth.</strong> Sal's ~145 tracked listings allow rough like-for-like comparison inside the sample. Single-digit counts on São Vicente or Santo Antão do not.</li>
<li><strong>Inventory mix.</strong> Santiago's higher median appears driven by Praia city stock; Boa Vista's by resort and off-plan inventory. Mix shapes the headline number more than location alone.</li>
<li><strong>Connectivity gaps.</strong> Santo Antão (ferry only, from São Vicente) and Brava (no airport) sit upstream of any pricing question. Foreign-buyer activity is thinner there, and so is source coverage.</li>
</ul>
<hr>
<h2>How to use this</h2>
<p>These numbers are a snapshot, not a forecast and not a valuation. They are useful for narrowing a shortlist — not for replacing the work of going through individual listings, talking to an independent local lawyer, and checking the source page for any property you take seriously.</p>
<p>For the legal and tax mechanics of buying once you have shortlisted, see the <a href="/blog/buying-property-cape-verde-guide">step-by-step buying guide</a>. For an island-by-island comparison framed around lifestyle and use case, see <a href="/blog/which-cape-verde-island-property">Which Cape Verde island</a>. For yield context on Sal and Boa Vista, see <a href="/blog/cape-verde-rental-yields-realistic">Cape Verde rental yields</a>. For methodology and source coverage, see <a href="/about">/about</a>.</p>
<hr>
<p><em>KazaVerde is an independent property search and data platform — not a broker, agency, or marketplace. Listings are aggregated from publicly accessible sources we currently track and are not legally verified. Always confirm a property's details with the original agent or seller and your own lawyer before acting on any number quoted here.</em></p>`,
  },
  {
    slug: "buying-property-cape-verde-guide",
    title: "How to Buy Property in Cape Verde: A Step-by-Step Guide for Foreign Buyers",
    description: "Cape Verde allows foreign nationals to purchase property with full freehold ownership and no restrictions on nationality. The legal framework is rooted in Portuguese law, which ...",
    date: "2026-02-27",
    readTime: "9 min read",
    tags: ["Buying","Legal","Guide"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Cape Verde allows foreign nationals to purchase property with full freehold ownership and no restrictions on nationality. The legal framework is rooted in Portuguese law, which means a structured, notary-based process that offers strong buyer protections — provided you do the paperwork right.</p>
<blockquote><p>Cape Verde is one of the few African countries where foreigners can own freehold property outright, with the same rights as citizens, and without restrictions on repatriation of sale proceeds.</p></blockquote>
<p>This guide walks through every stage of the buying process, from getting your tax number to signing the deed.</p>
<hr>
<h2>Before You Start: What You&#39;ll Need</h2>
<p>Two things must be in place before you can make an offer on any property in Cape Verde.</p>
<p><strong>1. A Cape Verdean NIF (Número de Identificação Fiscal)</strong></p>
<p>The NIF is your nine-digit tax identification number. You need it for everything — buying property, opening a bank account, setting up utilities, even getting WiFi. Anyone whose name will appear on the property deed needs their own NIF, and it&#39;s worth getting one for potential heirs as well.</p>
<p>You can obtain a NIF at a Casa do Cidadão office or the Cartório (Civil Registry) on any major island. Bring your passport and your parents&#39; full names. The process typically takes one day, though some sources report up to five days for manual submissions. There are also online services that facilitate NIF registration remotely through a fiscal representative.</p>
<p>Cost: Free for individuals. Budget €45–135 for notarization and document translation if applying from abroad.</p>
<p><strong>2. A Local Bank Account</strong></p>
<p>Open an account at a Cape Verdean bank (Banco Comercial do Atlântico and Caixa Económica are the most commonly used). You&#39;ll need your NIF and passport. The Cape Verdean Escudo (CVE) is pegged to the euro at a fixed rate of 110.265 CVE to €1, which simplifies currency considerations for European buyers.</p>
<hr>
<h2>The Buying Process: Seven Steps</h2>
<h3>Step 1: Find a Property</h3>
<p>You can search independently, work with a licensed estate agent, or use a source-linked property index like <a href="https://kazaverde.com">KazaVerde</a> to compare publicly listed properties across multiple sources and islands. Agents on the ground are particularly useful for understanding local nuances — different areas of the same island can vary significantly in infrastructure, rental potential, and community fees.</p>
<h3>Step 2: Hire an Independent Lawyer</h3>
<p>This is not optional. Hire a Cape Verdean <em>advogado</em> who is independent from the seller and the estate agent. Your lawyer will verify ownership, check for outstanding debts, review all contracts, and represent you at the notary. If you can&#39;t be physically present in Cape Verde for the transaction, your lawyer can act on your behalf through a Power of Attorney (<em>procuração</em>), which can be arranged at a notary or a Cape Verde embassy abroad.</p>
<p>Typical lawyer fees: €500–1,500 depending on complexity.</p>
<h3>Step 3: Make an Offer and Pay the Reservation Deposit</h3>
<p>Once you&#39;ve agreed on a price, you sign a reservation contract and pay a deposit — typically €3,000 or 5% of the property value. This takes the property off the market and locks in the agreed price. The deposit is usually non-refundable unless the ownership documentation proves to be incorrect.</p>
<h3>Step 4: Due Diligence</h3>
<p>Your lawyer requests the <strong>CIP (Certidão de Identificação Predial)</strong> from the local Land Registry. This critical document shows:</p>
<ul>
<li>The registered owner</li>
<li>The property&#39;s official address and floor plan</li>
<li>Its assessed value (<em>Valor Patrimonial</em>)</li>
<li>Any outstanding debts or mortgages</li>
</ul>
<p>Your lawyer will also verify that all municipal taxes and community charges are paid up to date.</p>
<h3>Step 5: Sign the Promissory Contract (CPCV)</h3>
<p>The <em>Contrato de Promessa de Compra e Venda</em> is a binding agreement between buyer and seller. It&#39;s prepared in both Portuguese and English, and outlines the terms, conditions, timelines, and any specific clauses (for example, requiring all appliances to be in working order, or penalties for seller withdrawal). Both parties can negotiate and amend this document before signing.</p>
<h3>Step 6: Final Payment and Deed Signing</h3>
<p>The balance is transferred via bank wire (usually in euros). You then sign the final public deed (<em>Escritura Pública</em>) at a notary, which formally transfers ownership. Your lawyer handles registration at the Land Registry afterward, which issues your ownership certificate.</p>
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
<td>3% of property value (new from Jan 2026, previously ~1.5% under IUP)</td>
</tr>
<tr>
<td><strong>Notary fees</strong></td>
<td>~€420</td>
</tr>
<tr>
<td><strong>Land Registry registration</strong></td>
<td>€200–300</td>
</tr>
<tr>
<td><strong>Stamp duty</strong></td>
<td>0.8%</td>
</tr>
<tr>
<td><strong>Lawyer fees</strong></td>
<td>€500–1,500</td>
</tr>
</tbody></table>
<p><strong>Important:</strong> The ITI is calculated on the commercial value or officially assessed value, whichever is higher. This is a significant change from the previous regime and roughly doubles the transfer tax for most transactions.</p>
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
<td>Base rate of 0.1% of assessed value (new from Jan 2026)</td>
</tr>
<tr>
<td><strong>Condominium/community fees</strong></td>
<td>€600–2,000+ per year depending on property type</td>
</tr>
<tr>
<td><strong>Utilities</strong></td>
<td>Varies by usage</td>
</tr>
</tbody></table>
<p>The new IPI system introduces objective valuation criteria and will generally result in lower annual property tax bills than the old IUP system for most owners. However, penalties apply for neglected or abandoned properties.</p>
<h3>If You Sell</h3>
<p>Capital gains tax of 10–15% applies on resale. Plan this with your lawyer, especially regarding any double taxation implications with your home country.</p>
<hr>
<h2>Financing Options</h2>
<p>Cash transactions are the norm for foreign buyers in Cape Verde. Local mortgages exist but are expensive — interest rates run 6–8%, lenders typically require 30–40% down payment and proof of income, and the process can be slow. Some European buyers release equity from assets at home to fund the purchase, which is often more cost-effective.</p>
<hr>
<h2>The Green Card: Residency Through Property Investment</h2>
<p>Cape Verde&#39;s Green Card program grants permanent residency to foreign property investors. The investment thresholds are:</p>
<ul>
<li><strong>€80,000</strong> in areas with below-average GDP per capita</li>
<li><strong>€120,000</strong> in areas with above-average GDP per capita (including tourist hubs like Sal)</li>
</ul>
<p>The Green Card provides permanent residency for an indefinite period, potential IPI exemptions on the property transfer, and a 50% reduction in annual property tax for up to ten years. After five years of habitual residency, Green Card holders can apply for Cape Verdean citizenship.</p>
<hr>
<h2>Common Pitfalls to Avoid</h2>
<ul>
<li><strong>Don&#39;t skip the lawyer.</strong> The most expensive mistakes in Cape Verde real estate come from skipping independent legal verification. Title disputes and hidden debts exist.</li>
<li><strong>Check the Valor Patrimonial.</strong> The property&#39;s officially assessed value may be significantly higher than its current market value — especially for properties in developments built during the pre-2008 boom. Since taxes are calculated on the higher of the assessed or commercial value, this can create unexpected costs.</li>
<li><strong>Verify community charges.</strong> If buying in a resort or condominium, confirm that all community charges and maintenance fees are paid up to date. Outstanding fees become the new owner&#39;s problem.</li>
<li><strong>Don&#39;t pay deposits on unfinished developments without legal advice.</strong> Off-plan purchases carry additional risks. Ensure your lawyer reviews the developer&#39;s track record and the contractual protections in place.</li>
<li><strong>Understand what &quot;tourism utility&quot; means.</strong> Properties within resort developments that have been granted &quot;tourism utility&quot; status may qualify for tax benefits, but also come with specific obligations around rental schemes and usage restrictions.</li>
</ul>
<hr>
<h2>Finding Properties</h2>
<p>The Cape Verdean property market is relatively small and fragmented. Listings appear across local agency websites, international portals, developer pages, and classified sites — often with inconsistent formatting, pricing in different currencies, and varying levels of detail.</p>
<p><a href="https://kazaverde.com">KazaVerde</a> aggregates listings from multiple sources into a single, searchable index with normalized pricing (all in euros), standardized specifications, and verified data badges. Every listing links directly to its original source.</p>
<p><em>Browse current listings at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Can foreigners buy property in Cape Verde?</h3>
<p>Yes. Cape Verde allows foreign nationals to purchase property with full freehold ownership and no restrictions on nationality. You&#39;ll need a Cape Verdean NIF (tax number) and a local bank account before completing a purchase.</p>
<h3>How much does it cost to buy property in Cape Verde?</h3>
<p>Total transaction costs typically amount to 5–7% of the property value. This includes the 3% ITI transfer tax (new from January 2026), notary fees (~€420), land registry registration (€200–300), stamp duty (0.8%), and lawyer fees (€500–1,500).</p>
<h3>Do I need a lawyer to buy property in Cape Verde?</h3>
<p>While not legally mandatory, hiring an independent Cape Verdean lawyer is strongly advised and considered essential for foreign buyers. Your lawyer verifies ownership, checks for debts, reviews contracts, and handles registration. Read more about <a href="/blog/mistakes-buying-property-cape-verde">common mistakes to avoid</a>.</p>
<h3>How long does the buying process take?</h3>
<p>From offer to deed signing, the process typically takes 4–8 weeks. This includes time for due diligence, contract preparation, and notary scheduling. Using a Power of Attorney can expedite the process if you can&#39;t be physically present for every stage.</p>
<h3>Can buying property give me residency in Cape Verde?</h3>
<p>Yes. Cape Verde&#39;s <a href="/blog/cape-verde-green-card-residency">Green Card program</a> grants permanent residency to foreign property investors who meet the minimum investment threshold (€80,000–€120,000 depending on location). After five years of habitual residency, you can apply for citizenship.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Data-driven comparison of all islands</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — What changed and what it means for buyers</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Net yield analysis and cost breakdown</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — How to get permanent residency through property investment</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. Property laws and tax rates may change. Always consult a qualified Cape Verdean lawyer before making any property purchase.</em></p>
`,
  },
  {
    slug: "which-cape-verde-island-property",
    title: "Which Cape Verde Island Should You Buy Property On? A Data-Driven Comparison",
    description: "Cape Verde's ten islands each have distinct characters, infrastructure levels, and property markets. Choosing the right island is arguably the most consequential decision you'll...",
    date: "2026-02-25",
    readTime: "10 min read",
    tags: ["Islands","Comparison","Data"],
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
<td>Highest</td>
<td>Strong year-round</td>
<td>International airport, direct European flights</td>
<td>Rental investment, holiday homes</td>
</tr>
<tr>
<td><strong>Boa Vista</strong></td>
<td>Beaches, developing</td>
<td>Medium-high</td>
<td>Growing, seasonal peaks</td>
<td>International airport, growing connections</td>
<td>Capital appreciation, resort living</td>
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
<td>Cultural tourism, steady</td>
<td>Domestic airport, ferry from Santo Antão</td>
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
<p>Sal is Cape Verde&#39;s most developed island for tourism and the most liquid property market. The Amílcar Cabral International Airport receives direct flights from London, Lisbon, Amsterdam, Paris, and other European cities, making it the primary entry point for the roughly 1.2 million tourists who visit Cape Verde annually.</p>
<p><strong>Santa Maria</strong>, on Sal&#39;s southern tip, is the center of gravity. It&#39;s where most of the tourism infrastructure, restaurants, and nightlife are concentrated, and where property demand is highest.</p>
<p><strong>What the market looks like:</strong> Apartments in Santa Maria typically start around €95,000 for a one-bedroom, with two-bedroom units in resort complexes ranging from €120,000 to €200,000. Luxury penthouses and ocean-view properties can reach €300,000+. Prices have been rising 10–15% annually in recent years, driven by steady tourism growth and limited new supply in prime locations.</p>
<p><strong>Rental potential:</strong> Sal offers the strongest short-term rental market in Cape Verde. Properties in well-managed resort complexes with established rental schemes report gross yields in the range of 5–8%, though individual results vary significantly based on location, property quality, and management company effectiveness.</p>
<p><strong>Things to consider:</strong> Sal is the most expensive island to buy on, and the market is the most mature — meaning there&#39;s less room for dramatic capital appreciation compared to less-developed islands. The island is also relatively flat and arid, which isn&#39;t everyone&#39;s aesthetic preference.</p>
<p><a href="/listings/sal">Browse current Sal properties for sale</a> in KazaVerde&#39;s index.</p>
<hr>
<h2>Boa Vista: The Growth Story</h2>
<p>Boa Vista is Cape Verde&#39;s second major tourism island, known for stunning, less-crowded beaches and a more laid-back atmosphere than Sal. It has its own international airport with growing flight connections, and the tourism infrastructure has expanded significantly in recent years.</p>
<p><strong>Sal Rei</strong>, the main town, is the commercial center. Most property development clusters around the coast, with a mix of resort complexes and standalone villas.</p>
<p><strong>What the market looks like:</strong> Property prices are generally 15–25% lower than equivalent properties on Sal, offering a potential entry point for buyers who want beach-island investment at a more accessible price. The development pipeline is active, with several new projects targeting both investors and lifestyle buyers.</p>
<p><strong>Rental potential:</strong> Growing but more seasonal than Sal. As flight connections increase and tourism infrastructure matures, rental demand is trending upward. Boa Vista is often positioned as where Sal was 5–10 years ago in terms of market development.</p>
<p><strong>Things to consider:</strong> Less developed infrastructure means fewer restaurants, shops, and services outside the resort zones. This is evolving, but buyers should visit and assess whether the current level of development meets their needs.</p>
<p><a href="/listings/boa-vista">Browse current Boa Vista properties for sale</a> in KazaVerde&#39;s index.</p>
<hr>
<h2>Santiago: Beyond Tourism</h2>
<p>Santiago is Cape Verde&#39;s largest and most populated island, home to the capital Praia. It&#39;s the economic, political, and cultural heart of the archipelago — and its property market reflects a broader economy, not just tourism.</p>
<p><strong>What the market looks like:</strong> Santiago offers the widest range of property types, from urban apartments in Praia to rural land and coastal developments. Prices vary enormously depending on location and type. Urban apartments in Praia can be found at lower price points than equivalent beach properties on Sal or Boa Vista, though premium developments exist.</p>
<p><strong>Rental potential:</strong> Mixed. Praia has a business travel market and a growing middle class creating domestic rental demand. Coastal areas like Tarrafal are developing a tourism niche. The rental market is less tourist-dependent than Sal or Boa Vista, which can be either a pro (diversification) or a con (lower peak yields), depending on your strategy.</p>
<p><strong>Things to consider:</strong> Santiago offers the most &quot;real&quot; Cape Verdean experience — it&#39;s where most Cape Verdeans live and work. The infrastructure is more developed in Praia than on most other islands, but the tourism product is less polished. Buyers looking for a residential investment with local market exposure, or who plan to live in Cape Verde, often find Santiago compelling.</p>
<hr>
<h2>São Vicente: The Cultural Capital</h2>
<p>São Vicente is home to Mindelo, widely considered Cape Verde&#39;s most charming and culturally vibrant city. Known for its music scene (it&#39;s the birthplace of <em>morna</em>, the genre Cesária Évora made world-famous), colonial architecture, and lively carnival, São Vicente attracts a different kind of visitor — and buyer.</p>
<p><strong>What the market looks like:</strong> The São Vicente market is primarily urban, centered on Mindelo. Property types range from colonial-era houses with renovation potential to modern apartments. Prices are generally moderate compared to Sal.</p>
<p><strong>Rental potential:</strong> Cultural tourism provides a steady stream of visitors, though volumes are lower than Sal or Boa Vista. São Vicente&#39;s appeal is more about lifestyle and authenticity than mass tourism yields. The ferry connection to Santo Antão (Cape Verde&#39;s hiking island) adds to its tourism proposition.</p>
<p><strong>Things to consider:</strong> São Vicente doesn&#39;t have the beach tourism product that drives Sal and Boa Vista&#39;s rental markets. Its airport handles domestic flights only — international visitors typically arrive via Sal or Santiago and connect. This limits the pure-investment case but strengthens the lifestyle case for buyers who value culture over beach resort living.</p>
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
<p><a href="https://kazaverde.com">KazaVerde</a> was built to solve this problem. We aggregate listings from multiple sources, normalize all prices to euros, standardize specifications, deduplicate properties that appear on multiple sites, and present everything in a single searchable interface. Every listing links to its original source — we&#39;re a read-only index, not a broker.</p>
<p>Current coverage: listings across 9 sources on 6 islands.</p>
<p><em>Start your search at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>Which Cape Verde island is best for property investment?</h3>
<p>Sal offers the strongest rental market and highest liquidity due to its international airport and established tourism infrastructure. Boa Vista is the main growth story with lower entry prices. Santiago suits buyers looking for residential or commercial investment beyond tourism. The best island depends on your goals — rental income, lifestyle, or capital appreciation.</p>
<h3>Which island has the cheapest property?</h3>
<p>Maio and Fogo have the lowest property prices, but they also have the thinnest markets and most limited infrastructure. For more accessible investment with some price advantage over Sal, Boa Vista and Santiago offer better value with reasonable infrastructure and rental potential.</p>
<h3>Can I get rental income from property on any island?</h3>
<p>Realistically, strong rental demand exists primarily on Sal and (increasingly) Boa Vista, where international tourism drives short-term holiday lets. Santiago has a local rental market. Other islands have very limited rental demand. Read our <a href="/blog/cape-verde-rental-yields-realistic">rental yield analysis</a> for detailed numbers.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Step-by-step buying process for foreign buyers</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Net yield analysis by island and rental model</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — Investment thresholds vary by island GDP classification</li>
</ul>
<hr>
<p><em>Property markets are dynamic. This article reflects general market observations and should not be relied upon as financial advice. Always conduct your own research and consult local professionals before investing.</em></p>
`,
  },
  {
    slug: "cape-verde-property-tax-reform-2026",
    title: "Cape Verde's 2026 Property Tax Reform: What Changed and What It Means for Buyers",
    description: "On January 1, 2026, Cape Verde implemented its most significant property tax reform in over 25 years. The old Imposto Único sobre o Património (IUP) — a single tax covering both...",
    date: "2026-02-22",
    readTime: "8 min read",
    tags: ["Tax","Legal","2026"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>On January 1, 2026, Cape Verde implemented its most significant property tax reform in over 25 years. The old Imposto Único sobre o Património (IUP) — a single tax covering both property transfers and annual ownership — has been replaced by two separate, modern tax codes.</p>
<p>If you&#39;re buying, selling, or holding property in Cape Verde, here&#39;s what you need to know.</p>
<hr>
<h2>What Changed</h2>
<p>The reform, enacted through Laws No. 54/X/2025 and No. 55/X/2025 (both published June 6, 2025), splits the old IUP into two distinct taxes:</p>
<p><strong>ITI (Imposto sobre a Transmissão de Imóveis)</strong> — a transfer tax paid when property changes hands.</p>
<p><strong>IPI (Imposto sobre a Propriedade de Imóveis)</strong> — an annual property tax paid by owners.</p>
<p>This separation brings Cape Verde in line with how most European countries structure property taxation and represents a deliberate modernization of the system to match the country&#39;s evolving real estate and tourism sectors.</p>
<hr>
<h2>ITI: The New Transfer Tax</h2>
<p>The ITI is a municipal tax levied on the transfer of real estate, whether the transfer is for payment or free of charge. Revenue goes directly to the municipality where the property is located.</p>
<h3>Key Details</h3>
<ul>
<li><strong>Rate:</strong> The standard ITI rate is approximately 3% of the property value. This is a notable increase from the previous IUP transfer component, which was approximately 1.5%.</li>
<li><strong>Basis:</strong> The tax is calculated on the commercial value or the officially assessed value of the property, whichever is higher.</li>
<li><strong>Scope:</strong> The ITI applies to rural, urban, and mixed-use properties. It covers not just full ownership transfers (purchase and sale) but also partial forms of property rights.</li>
<li><strong>Expanded coverage:</strong> Unlike the old IUP, the ITI now captures a broader range of transactions that have the economic effect of a property transfer. This includes successive assignments of contractual positions in promissory purchase agreements and the use of irrevocable powers of attorney — practices that were previously used to transfer effective control of property without triggering transfer tax. This is a significant anti-avoidance measure.</li>
</ul>
<h3>What This Means for Buyers</h3>
<p>For a €150,000 apartment, the ITI comes to approximately €4,500 — compared to roughly €2,250 under the old regime. When budgeting total transaction costs (including notary fees, registration, stamp duty, and legal fees), expect total acquisition costs in the range of 5–7% of the property value.</p>
<p><strong>Timing matters:</strong> The ITI must be paid before the transfer is legally completed. Payment must occur within three business days of assessment, and proof of payment is required for property registration. Ensure your lawyer has this timeline factored into the transaction schedule.</p>
<hr>
<h2>IPI: The New Annual Property Tax</h2>
<p>The IPI replaces the annual ownership component of the old IUP with a more transparent and objectively grounded system.</p>
<h3>Key Details</h3>
<ul>
<li><strong>Base rate:</strong> 0.1% of the property&#39;s assessed patrimonial value annually.</li>
<li><strong>Valuation method:</strong> Properties will be assessed based on objective criteria by Municipal Assessment Committees (<em>Comissões Municipais de Avaliação</em>), using a uniform methodology. This is a departure from the old system, where many property valuations hadn&#39;t been updated in years (or decades) and often bore little relationship to actual market values.</li>
<li><strong>Anti-speculation surcharges:</strong> The IPI introduces penalties for neglected properties. Derelict or abandoned buildings face a 25% surcharge, increasing by 20% annually. Buildings with unfinished main facades face a 10% surcharge. These measures aim to discourage urban blight and land-banking.</li>
</ul>
<h3>What This Means for Owners</h3>
<p>For most property owners, the new IPI will result in lower annual tax bills than the old IUP. To illustrate: under the old system, an apartment with an assessed value of roughly 5 million CVE (about €46,000) might have paid around 26,000 CVE annually. Under the new IPI at 0.1%, the same property would owe approximately 4,300 CVE — a substantial reduction.</p>
<p>However, as Municipal Assessment Committees complete new property valuations, assessed values may change. Properties that were significantly undervalued may see their assessments — and therefore their tax obligations — increase.</p>
<hr>
<h2>Why the Reform Happened</h2>
<p>The old IUP system, in place since 1998, had accumulated significant problems. Property valuations were outdated, often based on pre-2008 assessments that no longer reflected market reality. The tax structure didn&#39;t account for modern real estate practices like contractual position assignments. And the lack of penalties for neglected properties contributed to abandoned buildings in some urban areas.</p>
<p>Cape Verde&#39;s real estate and tourism sectors have transformed dramatically since 1998. Tourist arrivals have grown from around 200,000 per year in the early 2000s to over 1.2 million. International property investment has increased substantially. New resort developments, urban expansion, and a growing middle class have all changed the landscape.</p>
<p>The government&#39;s stated goals for the reform are greater tax justice, improved transparency, more efficient collection, and stronger municipal finances — the revenue from both taxes goes directly to local municipalities.</p>
<hr>
<h2>Impact on the Green Card Program</h2>
<p>Cape Verde&#39;s Green Card residency-by-investment program grants permanent residency to foreign property investors meeting certain thresholds (€80,000 in lower-GDP areas, €120,000 in higher-GDP areas like Sal). The program historically offered IUP exemptions and reductions.</p>
<p>With the transition to the new ITI/IPI framework, investors should verify with a qualified lawyer how the Green Card tax benefits translate under the new codes. The underlying incentive structure is expected to continue, but the specific mechanisms are changing.</p>
<hr>
<h2>What You Should Do</h2>
<ul>
<li><strong>If you&#39;re buying in 2026:</strong> Budget for the 3% ITI rate in your acquisition cost calculations. This is roughly double what buyers paid under the old regime and should be factored into your total investment analysis.</li>
<li><strong>If you already own property:</strong> Monitor whether your municipality conducts a new property valuation under the IPI framework. Your annual tax bill may change — in most cases downward, but this depends on whether your property&#39;s assessed value is adjusted.</li>
<li><strong>If you&#39;re selling:</strong> Be aware that the expanded ITI scope covers more types of transactions. Discuss with your lawyer how the new rules apply to your specific situation, particularly if the transaction involves promissory contracts or contractual position assignments.</li>
<li><strong>In all cases:</strong> Work with a Cape Verdean lawyer who is up to date on the new legislation. The reform is substantial, and the interaction between the two new codes and other elements of the tax system (capital gains, inheritance, Green Card benefits) requires professional guidance.</li>
</ul>
<hr>
<h2>Monitoring the Market</h2>
<p>Property tax changes affect pricing, yields, and transaction volumes. KazaVerde tracks public listings across the Cape Verde market and publishes source-linked market context including median prices by island and tracked inventory levels.</p>
<p><em>Stay informed at <a href="/market">kazaverde.com/market-data</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>What is the property transfer tax in Cape Verde?</h3>
<p>Since January 2026, the transfer tax is called ITI (Imposto sobre a Transmissão de Imóveis) and is set at approximately 3% of the property value. This replaced the old IUP system which charged roughly 1.5%. The tax is calculated on the commercial value or officially assessed value, whichever is higher.</p>
<h3>What is the annual property tax in Cape Verde?</h3>
<p>The new annual property tax is called IPI (Imposto sobre a Propriedade de Imóveis), with a base rate of 0.1% of the assessed value. For most owners, this results in lower annual bills than the previous IUP system. Neglected or abandoned properties face surcharges.</p>
<h3>Do Green Card holders get tax benefits?</h3>
<p>Yes. <a href="/blog/cape-verde-green-card-residency">Green Card holders</a> may receive exemption from the ITI transfer tax and a 50% reduction in annual IPI for up to ten years. Verify the specific application with your lawyer, as the transition to the new tax codes may affect implementation.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full cost breakdown and buying process</li>
<li><a href="/blog/cape-verde-green-card-residency">Green Card Residency Program</a> — Tax benefits for property investors</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields</a> — How the new IPI affects your net yield calculations</li>
</ul>
<hr>
<p><em>This article is for informational purposes only. Tax legislation is subject to change and interpretation. Always consult a qualified Cape Verdean tax advisor or lawyer for advice specific to your situation.</em></p>
`,
  },
  {
    slug: "cape-verde-rental-yields-realistic",
    title: "Cape Verde Rental Yields: What to Realistically Expect in 2026",
    description: "Rental yield claims in Cape Verde property marketing range from conservative to wildly optimistic. If you're buying property as an investment, you need to understand what drives...",
    date: "2026-02-19",
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
<td>0.1% of assessed value</td>
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
<p><a href="https://kazaverde.com">KazaVerde</a> provides a searchable index of Cape Verde property listings with normalized pricing, source-linked detail pages, and market context. Use it to understand the market before you engage with agents or developers.</p>
<p><em>Explore the current market at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>What rental yield can I expect in Cape Verde?</h3>
<p>Gross rental yields of 5–8% are commonly cited, but realistic net yields after all costs (management fees, maintenance, taxes, voids) are typically 3–5% for managed schemes. Self-managed properties can achieve higher net yields with active effort.</p>
<h3>Is Cape Verde good for Airbnb?</h3>
<p>Sal and Boa Vista have strong short-term rental markets driven by European tourism. Properties in Santa Maria (Sal) with beach access and modern amenities perform best. Self-managed Airbnb lets can outperform hotel rental schemes in terms of net yield, but require local support for cleaning, maintenance, and guest management.</p>
<h3>What are the ongoing costs of owning property in Cape Verde?</h3>
<p>Expect annual costs of €2,000–5,000+ depending on the property, including community charges (€600–2,000+), maintenance reserve (€500–1,000+), the new IPI property tax (0.1% of assessed value), utilities, and insurance. See our <a href="/blog/cape-verde-property-tax-reform-2026">2026 tax reform guide</a> for updated tax details.</p>
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
    title: "Cape Verde Green Card: How to Get Residency Through Property Investment",
    description: "Cape Verde's Green Card program offers permanent residency to foreign nationals who invest in real estate on the islands. It's one of the more accessible residency-by-investment...",
    date: "2026-02-16",
    readTime: "8 min read",
    tags: ["Residency","Investment","Green Card"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Cape Verde&#39;s Green Card program offers permanent residency to foreign nationals who invest in real estate on the islands. It&#39;s one of the more accessible residency-by-investment programs globally — with lower thresholds than most European alternatives, a path to citizenship, and the practical benefits of living in a politically stable, warm-climate country with a euro-pegged currency.</p>
<p>Here&#39;s how it works.</p>
<hr>
<h2>What the Green Card Is</h2>
<p>The Green Card (<em>Cartão Verde</em>) is a permanent residence authorization created under Law No. 30/IX/2018. It grants its holder the right to reside in Cape Verde for an indefinite period. Unlike a visa or temporary permit, it doesn&#39;t need to be renewed periodically — though it comes with conditions around the property investment that underpins it.</p>
<p>The program was designed to attract foreign investment in real estate and tourism, strengthen the construction industry, and create employment. It positions Cape Verde as a second-home destination with genuine residency benefits.</p>
<hr>
<h2>Investment Thresholds</h2>
<p>The minimum property investment required depends on the economic status of the area where you buy:</p>
<table>
<thead>
<tr>
<th>Area Type</th>
<th>Minimum Investment</th>
<th>Examples</th>
</tr>
</thead>
<tbody><tr>
<td>Below-average GDP per capita</td>
<td>€80,000</td>
<td>Many areas outside major tourist hubs</td>
</tr>
<tr>
<td>Above-average GDP per capita</td>
<td>€120,000</td>
<td>Sal, parts of Boa Vista, central Praia</td>
</tr>
</tbody></table>
<p>These are the minimum property purchase values — the investment must be in real estate located in Cape Verde. The property can be residential, touristic, or commercial.</p>
<hr>
<h2>Tax Benefits</h2>
<p>The Green Card comes with meaningful tax advantages for property owners:</p>
<ul>
<li><strong>Transfer tax benefits:</strong> Potential exemption from the property transfer tax at the time of purchase. Under the new 2026 tax framework (ITI replacing the old IUP), this could represent a saving of up to 3% of the property value. Verify the specific application with your lawyer, as the transition to the new tax codes may affect how this benefit is implemented.</li>
<li><strong>Reduced annual property tax:</strong> A 50% reduction in annual property tax for up to ten years, subject to approval by the Municipal Assembly where the property is located. Under the new IPI system (effective January 2026), this applies to the 0.1% base rate.</li>
<li><strong>Inheritance:</strong> Potential exemptions from property transfer tax on inheritance (<em>mortis causa</em>) succession.</li>
</ul>
<hr>
<h2>Requirements and Application</h2>
<p>To apply for the Green Card, you&#39;ll need:</p>
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
<p>Applications are submitted to the Ministry of Tourism and Transport (MTT). Processing times vary but are generally shorter than comparable European programs.</p>
<hr>
<h2>Path to Citizenship</h2>
<p>After five years of habitual residency in Cape Verde as a Green Card holder, you can apply for Cape Verdean citizenship. This is a genuine path to a second passport, which provides visa-free or visa-on-arrival access to a range of countries and territories.</p>
<p>&quot;Habitual residency&quot; means actually spending time in Cape Verde — it doesn&#39;t mean you need to be there 365 days a year, but you need to demonstrate genuine residence, not just property ownership.</p>
<hr>
<h2>Practical Considerations</h2>
<ul>
<li><strong>This isn&#39;t just a paperwork exercise.</strong> The Green Card is designed for people who will actually spend time in Cape Verde. If your sole interest is a paper residency with no intention of visiting, this may not be the right program — and authorities can assess whether the residency is genuine.</li>
<li><strong>The property must be a real investment.</strong> It must meet the minimum threshold, be properly registered, and the funds must demonstrably come from abroad. This isn&#39;t a program you can game with a token purchase.</li>
<li><strong>Tax implications in your home country.</strong> Becoming a tax resident of Cape Verde may have implications for your tax obligations at home. Some countries tax their citizens or residents on worldwide income regardless of where they live. There is no double taxation agreement between Cape Verde and many countries (including the UK). Consult a tax advisor in your home country before committing.</li>
<li><strong>Healthcare and services.</strong> Cape Verde&#39;s healthcare system is improving but remains limited compared to European standards, particularly on smaller islands. Many foreign residents maintain international health insurance or plan to travel to Europe or the mainland for significant medical needs.</li>
<li><strong>Cost of living.</strong> Cape Verde offers a lower cost of living than most of Western Europe, particularly for housing, dining, and services. However, imported goods can be expensive, and availability varies by island.</li>
</ul>
<hr>
<h2>Green Card vs. Other Options</h2>
<p>For context, here&#39;s how Cape Verde&#39;s program compares to better-known alternatives:</p>
<table>
<thead>
<tr>
<th>Program</th>
<th>Min. Investment</th>
<th>Residency Type</th>
<th>Path to Citizenship</th>
<th>Climate</th>
</tr>
</thead>
<tbody><tr>
<td><strong>Cape Verde Green Card</strong></td>
<td>€80,000–120,000</td>
<td>Permanent</td>
<td>5 years</td>
<td>Year-round warm</td>
</tr>
<tr>
<td>Portugal Golden Visa (fund route)</td>
<td>€500,000</td>
<td>Temporary (renewable)</td>
<td>5 years</td>
<td>Mediterranean</td>
</tr>
<tr>
<td>Spain Non-Lucrative Visa</td>
<td>No minimum (income req.)</td>
<td>Temporary (renewable)</td>
<td>10 years</td>
<td>Mediterranean</td>
</tr>
<tr>
<td>Greece Golden Visa</td>
<td>€250,000–800,000</td>
<td>5-year renewable</td>
<td>7 years</td>
<td>Mediterranean</td>
</tr>
</tbody></table>
<p>Cape Verde&#39;s lower entry point makes it accessible to a wider range of investors. The permanent residency (rather than renewable temporary permits) is also a distinguishing feature.</p>
<hr>
<h2>Finding Properties That Qualify</h2>
<p>Not every listing on the market will meet the Green Card investment threshold — particularly at the €80,000 level, where options are more limited. Use <a href="https://kazaverde.com">KazaVerde</a> to filter properties by price range and island to identify which listings fall within the qualifying investment bands.</p>
<p>Keep in mind that the threshold applies to the property purchase value, and that the area classification (above or below average GDP per capita) determines which threshold applies. Your lawyer can confirm the classification for any specific property or area.</p>
<p><em>Search properties at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Frequently Asked Questions</h2>
<h3>How much do I need to invest for Cape Verde residency?</h3>
<p>The minimum investment is €80,000 for properties in areas with below-average GDP per capita, or €120,000 in higher-GDP areas like Sal. The investment must be in real estate located in Cape Verde, and funds must demonstrably come from abroad.</p>
<h3>Can I get Cape Verde citizenship through property investment?</h3>
<p>Yes. After five years of habitual residency as a Green Card holder, you can apply for Cape Verdean citizenship. &quot;Habitual residency&quot; means actually spending time in Cape Verde, not just owning property.</p>
<h3>What tax benefits does the Green Card provide?</h3>
<p>Green Card holders may receive exemption from the ITI transfer tax (3% of property value) and a 50% reduction in annual IPI property tax for up to ten years. See our <a href="/blog/cape-verde-property-tax-reform-2026">2026 tax reform guide</a> for how the new tax codes interact with these benefits.</p>
<h3>How does Cape Verde compare to Portugal&#39;s Golden Visa?</h3>
<p>Cape Verde&#39;s entry point is significantly lower (€80,000–€120,000 vs €500,000 for Portugal&#39;s fund route). Cape Verde grants permanent residency directly (vs temporary for Portugal), and both offer citizenship after 5 years of residency.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Step-by-step process for qualifying purchases</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — Updated tax framework affecting Green Card benefits</li>
<li><a href="/blog/which-cape-verde-island-property">Which Island Should You Buy On?</a> — Investment thresholds vary by island GDP classification</li>
</ul>
<hr>
<p><em>This article is for informational purposes only. Immigration laws, tax benefits, and program requirements may change. Always consult a qualified Cape Verdean lawyer and a tax advisor in your home country before making decisions about residency or property investment.</em></p>
`,
  },
  {
    slug: "mistakes-buying-property-cape-verde",
    title: "7 Expensive Mistakes to Avoid When Buying Property in Cape Verde",
    description: "Cape Verde's property market is accessible, the buying process is relatively straightforward, and the legal framework provides solid protections for foreign buyers. But \"relativ...",
    date: "2026-02-13",
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
<li>Verify ownership through the CIP (property identification certificate)</li>
<li>Check for outstanding debts and mortgages</li>
<li>Review the IUP/IPI tax history</li>
<li>Verify that community charges are paid</li>
<li>Review all contracts before you sign</li>
<li>Ensure the title transfer is properly registered</li>
</ul>
<p>Cost: €500–1,500. The cost of the problems they prevent: potentially the entire value of your investment.</p>
<hr>
<h2>2. Ignoring the Valor Patrimonial</h2>
<p>The <em>Valor Patrimonial</em> is the officially assessed value of a property, set by the local municipality. It&#39;s used to calculate property taxes and transfer taxes. Here&#39;s the problem: many properties in Cape Verde — particularly those in developments built during the pre-2008 construction boom — were assessed at values that are significantly higher than their current market price.</p>
<p>Why this matters: taxes (both the transfer tax ITI and annual property tax IPI) are calculated on the higher of the commercial value or the Valor Patrimonial. If a property sells for €80,000 but has a Valor Patrimonial of €130,000, you&#39;re paying taxes on €130,000.</p>
<p>Before agreeing to a purchase price, ask your lawyer to check the Valor Patrimonial. Factor this into your total cost calculation, and understand that under the new 2026 IPI system, municipal reassessments may change these values over time.</p>
<hr>
<h2>3. Paying Deposits on Unfinished Developments Without Protection</h2>
<p>Off-plan purchases — buying a property that hasn&#39;t been built yet — can offer lower prices and the ability to choose finishes. They also carry significantly more risk than buying an existing property.</p>
<p>Developers in Cape Verde range from well-capitalized, experienced operators to smaller outfits with limited track records. Construction delays are common. In worst-case scenarios, developments have stalled entirely, leaving buyers with deposits paid and no property.</p>
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
<p>Condominium and service charges typically run €600–2,000+ per year and tend to increase over time. Maintenance in a salt-air environment requires more frequent attention than similar properties in temperate climates. Air conditioning units, water heaters, and appliances have shorter lifespans. Even if you&#39;re in a rental scheme, you&#39;re typically responsible for your unit&#39;s contents, appliances, and periodic refurbishment. The new IPI annual property tax (from January 2026) adds a predictable but ongoing obligation. And if you&#39;re not using the property regularly, someone needs to check on it — whether that&#39;s a management company, a local property manager, or a trusted contact.</p>
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
<li><strong>The notary system.</strong> All property transfers must be formalized through a notary (<em>Cartório Notarial</em>), who serves as a neutral public official verifying the legality of the transaction. This provides strong protection but also means the process follows specific procedural requirements that your lawyer will navigate.</li>
<li><strong>Power of Attorney.</strong> If you can&#39;t be present for all stages of the transaction, a <em>procuração</em> (power of attorney) is essential. It must be properly notarized and, if executed abroad, may need to be apostilled. Plan for this early — don&#39;t leave it to the last minute.</li>
</ul>
<hr>
<h2>The Common Thread</h2>
<p>Most of these mistakes share a root cause: insufficient preparation and professional advice. Cape Verde property can be a rewarding investment, but the market is small, information is fragmented, and the legal and tax environment requires local expertise.</p>
<p>Do your research. Use tools like <a href="https://kazaverde.com">KazaVerde</a> to understand the market landscape — what&#39;s available, at what prices, on which islands. Then engage qualified local professionals before committing capital.</p>
<p><em>Browse current listings at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
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
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Avoid overpaying based on inflated yield projections</li>
<li><a href="/blog/which-cape-verde-island-property">Which Island Should You Buy On?</a> — Compare islands before committing</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. Always consult qualified local professionals before purchasing property in Cape Verde.</em></p>
`,
  },
  {
    slug: "sal-vs-santiago-property",
    title: "Sal vs Santiago: Which Cape Verde Island Makes Sense for Property Buyers?",
    description: "Sal and Santiago are Cape Verde's two most active property markets, but they serve fundamentally different buyer profiles. One is built around tourism; the other is the country's...",
    date: "2026-03-10",
    readTime: "8 min read",
    tags: ["Sal", "Santiago", "Comparison"],
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
<p>Property types are predominantly apartments and units within resort complexes. Standalone villas exist but are less common than on some other islands. Entry prices for a one-bedroom apartment in a resort complex start around €95,000–€110,000; two-bedroom units typically range from €130,000 to €200,000; premium ocean-facing properties go higher.</p>
<p>Prices have tracked upward in recent years — 10–15% annual appreciation has been reported for well-located properties — driven by steady tourism growth and limited new supply in established zones.</p>
<h3>Rental market</h3>
<p>Sal has the strongest short-term rental market in Cape Verde. International tourist volume provides a large pool of potential guests, and the infrastructure to serve them (tour operators, online booking platforms, airport transfers) is mature.</p>
<p>Gross rental yields quoted by developers and agents typically fall in the 5–8% range. Net yields — after management fees (25–35% of gross), annual service charges, maintenance, and the new IPI annual property tax — are meaningfully lower. A realistic net yield for a well-managed property in a good resort complex is 3–5%. Read the <a href="/blog/cape-verde-rental-yields-realistic">rental yield analysis</a> for a full cost breakdown.</p>
<p>Seasonality is moderate on Sal relative to other islands — European winter sun demand helps smooth the calendar — but July and August can be slower as European tourists gravitate toward Mediterranean destinations.</p>
<h3>Liquidity</h3>
<p>Sal is the most liquid property market in Cape Verde. There is an established resale market, international buyer interest is ongoing, and real estate agents with marketing reach to European buyers are well-represented. If you need to exit, Sal gives you the best chance of finding a buyer in a reasonable timeframe.</p>
<h3>Who Sal suits</h3>
<ul>
<li>Buyers whose primary objective is rental income from tourist lets</li>
<li>Holiday home buyers who want guaranteed access to beach infrastructure and restaurants</li>
<li>Investors who want the most established and liquid market in Cape Verde</li>
<li>Buyers applying for the Green Card (Sal qualifies as a higher-GDP area, requiring €120,000 minimum)</li>
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
<p><a href="/listings/sal">Browse current Sal properties</a> and <a href="/listings/boa-vista">Boa Vista properties</a> on KazaVerde. Santiago listings are included in the main search index at <a href="https://kazaverde.com">kazaverde.com</a>.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Full six-island comparison</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Net yield analysis by rental model</li>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process for foreign buyers</li>
<li><a href="/blog/boa-vista-property-guide">Boa Vista Property Guide</a> — The third option between Sal's prices and Santiago's profile</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Market conditions change. Always consult qualified local professionals before making any property investment.</em></p>
`,
  },
  {
    slug: "off-plan-property-cape-verde-risks",
    title: "Buying Off-Plan Property in Cape Verde: Risks, Protections, and What to Check",
    description: "Off-plan purchases — buying a property before or during construction — are common in Cape Verde, particularly in resort developments on Sal and Boa Vista. The potential advantages...",
    date: "2026-03-17",
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
<p>Delays in Cape Verde often stem from supply chain issues (most construction materials are imported), contractor capacity, regulatory approvals, and occasionally developer cashflow problems. Build a delay assumption into your financial model — 6–12 months beyond the stated completion date is a conservative but realistic buffer.</p>
<h3>2. Developer Financial Risk</h3>
<p>Off-plan buyers are unsecured creditors if a developer becomes insolvent. Several Cape Verde developments, particularly those started during the pre-2008 tourism boom, stalled or failed entirely when developer financing collapsed. Buyers who had paid deposits or stage payments had limited legal recourse and, in some cases, lost their funds entirely.</p>
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
<p>The strongest protection available is a bank guarantee covering your stage payments. Under this structure, a Cape Verdean bank guarantees to return your payments if the developer fails to complete the property as contracted. Not all developers offer this — it costs them money and requires their own banking relationships to support it — but it is the standard in reputable developments.</p>
<p>If a developer cannot or will not provide a bank guarantee, your financial exposure is the full amount of any payments made, recoverable only through litigation against a potentially insolvent entity.</p>
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
<h2>Payment Structure: What Is Normal</h2>
<p>Typical off-plan payment structures in Cape Verde look approximately like this:</p>
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
<p>Never buy off-plan without an independent Cape Verdean lawyer reviewing the full contract before you sign anything or pay any deposit. The cost of legal advice is trivial relative to the capital at risk.</p>
<p><em>Browse completed resale properties at <a href="https://kazaverde.com">kazaverde.com</a></em></p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full process for resale and new-build purchases</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Mistakes Buyers Make in Cape Verde</a> — Common errors and how to avoid them</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Stress-testing developer yield projections</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute legal or financial advice. Always consult a qualified Cape Verdean lawyer before entering any property contract.</em></p>
`,
  },
  {
    slug: "cape-verde-property-management-remotely",
    title: "Managing Property in Cape Verde Remotely: A Guide for Foreign Owners",
    description: "Most foreign buyers in Cape Verde do not live on the island where their property is located. Managing a property from another country adds a layer of operational complexity...",
    date: "2026-03-24",
    readTime: "8 min read",
    tags: ["Management", "Investment", "Remote"],
    content: `<p><em>Last updated: March 2026</em></p>
<p>Most foreign buyers in Cape Verde do not live on the island where their property is located. Managing a property from another country adds a layer of operational complexity that is easy to underestimate during the buying process and painful to discover afterward.</p>
<p>This guide covers the management options available, what each costs, the risks of remote ownership in Cape Verde's specific climate and market context, and what to look for when selecting a management arrangement.</p>
<hr>
<h2>Why Cape Verde Is Harder to Self-Manage Than Most Markets</h2>
<p>Remote property ownership creates challenges in any market. Cape Verde has several factors that amplify them:</p>
<p><strong>Climate.</strong> The tropical maritime environment — consistent heat, salt air, periodic heavy rain, and high humidity — accelerates deterioration faster than most European climates. Paint, plaster, metalwork, electrical systems, appliances, and outdoor surfaces all degrade faster. A property left unvisited for six months in Cape Verde will show more wear than a comparable property in northern Europe left for the same period.</p>
<p><strong>Distance and logistics.</strong> Physical distance from the islands means that minor issues (a leaking pipe, a broken appliance, an air conditioning unit failure) that could be resolved in a day in your home country can take weeks if there is no competent local party managing the response. Contractors and tradespeople need to be found, scheduled, and supervised — all remotely.</p>
<p><strong>Language.</strong> While many people in the tourism sector speak English, operational property management — communicating with service contractors, local utility providers, municipal offices — is conducted in Cape Verdean Creole and Portuguese. Non-speakers are dependent on intermediaries for almost all operational communication.</p>
<p><strong>Market fragmentation.</strong> There is no MLS-style market infrastructure, no standardized property management licensing, and relatively few established property management firms with a track record. Vetting a management provider requires more effort than in mature property markets.</p>
<hr>
<h2>Management Options</h2>
<h3>Option 1: Resort/Hotel Rental Scheme</h3>
<p>The most common arrangement for foreign buyers in resort developments on Sal and Boa Vista. The development's management company handles everything — guest marketing and bookings, check-in, cleaning, maintenance, and minor repairs — in exchange for a percentage of gross rental income.</p>
<p><strong>Management fee:</strong> Typically 25–35% of gross rental income. Some schemes structure this differently (fixed fee plus percentage, or tiered based on occupancy), so read the contract carefully.</p>
<p><strong>What's covered:</strong> Day-to-day operational management, guest services, routine cleaning and maintenance. Usually covers minor repairs below a threshold (often €50–100 per incident). Major repairs, appliance replacements, and capital expenditure are typically the owner's responsibility.</p>
<p><strong>What's not covered:</strong> Owners typically remain responsible for annual community/service charges, insurance, their share of any major building repairs approved by the owners' association, and periodic refurbishment cycles. In some schemes, owners must pay for an approved furniture package and meet refurbishment standards at defined intervals.</p>
<p><strong>Practical reality:</strong> The quality of hotel rental schemes varies enormously between developments and management companies. The same headline fee structure can produce vastly different outcomes depending on the operator's occupancy rates, booking platform relationships, and operational standards. Before buying into a scheme, investigate the specific operator's performance, not just the scheme's structure.</p>
<h3>Option 2: Independent Property Manager</h3>
<p>Outside of resort schemes, individual property managers operate on Sal, Boa Vista, and Santiago. They handle a mix of short-term rental management, property caretaking, and maintenance coordination.</p>
<p><strong>Typical fee:</strong> 15–25% of rental income for short-term rental management, or a flat monthly fee (€50–150/month range) for caretaking without active rental management. Many offer combined packages.</p>
<p><strong>Advantages over resort schemes:</strong> More flexibility in pricing, listing platforms, and guest selection. You're not locked into a single operator's distribution network. You can list on Airbnb, Booking.com, and other platforms with the manager handling operations.</p>
<p><strong>Disadvantages:</strong> Vetting is harder. The sector is informal — there is no licensing requirement, no industry body, and no standard contract format. A good independent manager is valuable; a poor one can be costly and difficult to exit.</p>
<h3>Option 3: Trusted Local Contact</h3>
<p>Some owners, particularly those who visit regularly and have established local networks, manage their properties through a trusted local contact — a neighbor, a Cape Verdean friend, or a local professional who checks on the property and handles minor issues.</p>
<p>This works when the relationship and trust are solid. It is not a substitute for a professional management arrangement if you are trying to generate rental income. It is also fragile — personal circumstances change, and a dependency on a single individual with no formal arrangement creates operational risk.</p>
<hr>
<h2>Costs of Remote Ownership</h2>
<p>Remote ownership costs beyond the management fee itself:</p>
<table>
<thead>
<tr>
<th>Cost</th>
<th>Typical Range</th>
</tr>
</thead>
<tbody>
<tr>
<td>Property management / rental scheme fee</td>
<td>15–35% of gross rental income</td>
</tr>
<tr>
<td>Annual community / service charge</td>
<td>€600–2,000+</td>
</tr>
<tr>
<td>Annual IPI property tax (from Jan 2026)</td>
<td>0.1% of assessed value</td>
</tr>
<tr>
<td>Building insurance (owner's portion)</td>
<td>€150–400/year</td>
</tr>
<tr>
<td>Contents insurance</td>
<td>€100–300/year</td>
</tr>
<tr>
<td>Maintenance reserve</td>
<td>€500–1,500/year (climate-driven)</td>
</tr>
<tr>
<td>Periodic refurbishment</td>
<td>€2,000–5,000+ every 3–5 years</td>
</tr>
</tbody>
</table>
<p>Many rental yield calculations provided by developers or agents omit several of these cost lines, which inflates the apparent net yield. Build all of them into your model before assessing whether the investment makes sense. The <a href="/blog/cape-verde-rental-yields-realistic">rental yield guide</a> covers this in detail.</p>
<hr>
<h2>Selecting a Management Company</h2>
<p>Whether you're evaluating a resort scheme operator or an independent property manager, the due diligence questions are similar:</p>
<ul>
<li><strong>How many properties do they currently manage on this island?</strong> A manager handling 3 properties has a different capacity and reliability profile than one managing 80.</li>
<li><strong>What is their current occupancy rate for comparable properties?</strong> Ask for verified data, not projections. If they can't or won't provide occupancy data for existing properties they manage, that's a warning.</li>
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
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Full cost model for investment properties</li>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — End-to-end buying process</li>
<li><a href="/blog/mistakes-buying-property-cape-verde">7 Mistakes Buyers Make in Cape Verde</a> — Including management-related errors</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Always conduct your own due diligence and consult qualified local professionals.</em></p>
`,
  },
  {
    slug: "financing-property-cape-verde",
    title: "How to Finance a Property Purchase in Cape Verde as a Foreign Buyer",
    description: "Cash transactions dominate the foreign buyer market in Cape Verde. Local mortgage options exist but are expensive and difficult to access as a non-resident. Understanding your...",
    date: "2026-03-31",
    readTime: "7 min read",
    tags: ["Financing", "Mortgage", "Buying"],
    content: `<p><em>Last updated: March 2026</em></p>
<p>Cash transactions dominate the foreign buyer market in Cape Verde. Local mortgage options exist but are expensive and difficult to access as a non-resident. Understanding your financing options before you start searching saves time and prevents you from committing to a purchase your funding structure can't support.</p>
<hr>
<h2>Why Most Foreign Buyers Pay Cash</h2>
<p>The combination of high local interest rates, restrictive lending criteria for non-residents, and slow loan processing means that the majority of foreign buyers in Cape Verde bring their own capital rather than seeking local financing. This isn't a preference — it's a practical outcome of the market conditions.</p>
<p>If you're not in a position to purchase with cash or near-cash, understanding the alternatives is important before you start the buying process.</p>
<hr>
<h2>Cape Verdean Bank Mortgages</h2>
<p>Local mortgages from Cape Verdean banks are technically available to foreign nationals, but the conditions make them unattractive for most buyers.</p>
<h3>Current conditions (2026)</h3>
<table>
<thead>
<tr>
<th>Parameter</th>
<th>Typical Range</th>
</tr>
</thead>
<tbody>
<tr>
<td>Interest rate</td>
<td>6–9% per annum</td>
</tr>
<tr>
<td>Loan-to-value (LTV)</td>
<td>60–70% maximum (30–40% deposit required)</td>
</tr>
<tr>
<td>Maximum loan term</td>
<td>20–25 years</td>
</tr>
<tr>
<td>Currency</td>
<td>Cape Verdean Escudo (CVE), pegged to EUR at 110.265</td>
</tr>
<tr>
<td>Income documentation</td>
<td>Proof of income, typically requiring bank statements and tax returns from country of residence</td>
</tr>
<tr>
<td>Processing time</td>
<td>4–12 weeks from application to approval</td>
</tr>
</tbody>
</table>
<h3>Key considerations</h3>
<p><strong>Interest rate premium.</strong> At 6–9%, local borrowing costs are significantly higher than mortgage rates available in most European countries for comparable properties. For a €150,000 mortgage at 7% over 20 years, the total interest cost approaches €125,000 — more than 80% of the original loan principal. The cost of local debt materially changes the investment math.</p>
<p><strong>Loan-to-value limits.</strong> A maximum LTV of 60–70% means you need 30–40% as a deposit, on top of the 5–7% transaction costs (ITI transfer tax, notary, registration, legal fees). For a €150,000 property, total capital required before financing could be €65,000–€75,000 in cash (deposit + transaction costs), with the remaining €90,000–€105,000 financed.</p>
<p><strong>Non-resident complexity.</strong> Cape Verdean banks vary in their willingness to lend to non-residents. Some require proof of an established financial relationship with a Cape Verdean bank before processing a mortgage application. Documentation requirements are more extensive for non-residents and the process can be slow.</p>
<p><strong>Currency peg stability.</strong> The CVE has been pegged to the euro since 1998, maintained through a support agreement with Portugal, which gives it more stability than most small-island currencies. This reduces currency risk for European buyers, but the peg is a policy commitment, not a fixed mechanism, and should be factored into any long-term planning.</p>
<h3>Which banks offer mortgages to foreigners</h3>
<p>Banco Comercial do Atlântico (BCA) and Caixa Económica de Cabo Verde (CECV) are the two banks most commonly used by foreign property buyers. Both require you to open a Cape Verdean bank account — which you need anyway as part of the buying process — before processing a mortgage application. Consult your lawyer for current lending criteria, as conditions change.</p>
<hr>
<h2>Financing Through Your Home Country</h2>
<p>For most European buyers, releasing capital from assets at home is more cost-effective than borrowing locally in Cape Verde.</p>
<h3>Home equity release</h3>
<p>If you own property in your home country with significant equity, a remortgage, equity release, or home equity loan may provide funds at rates materially lower than a Cape Verdean bank mortgage — particularly for buyers in countries with current mortgage rates in the 3–5% range. The Cape Verdean property serves as the use case for the capital; the loan is secured against your home-country asset.</p>
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
<li><strong>Transaction cost budget confirmed.</strong> Budget 5–7% of the property value for transaction costs: ITI transfer tax (3%), notary fees (~€420), land registry registration (€200–300), stamp duty (0.8%), lawyer fees (€500–1,500). These are cash costs at completion that cannot be financed.</li>
<li><strong>Foreign exchange plan.</strong> If you are converting from a non-euro currency, account for exchange rate exposure. The CVE is pegged to the euro, so the relevant rate is your home currency against the euro. Consider whether to transfer funds progressively or all at once.</li>
</ul>
<hr>
<h2>The Investment Case With and Without Leverage</h2>
<p>Whether leverage improves the investment case depends on the cost of borrowing relative to your expected net yield. At local Cape Verdean mortgage rates of 6–9%, leverage is only accretive if your net rental yield exceeds your borrowing cost — which, given realistic net yield expectations of 3–5% for most properties, is not the case.</p>
<p>The typical Cape Verde investment case is therefore not built on leverage. It rests on the combination of net rental income, capital appreciation, personal use value, and (for some buyers) the residency pathway through the <a href="/blog/cape-verde-green-card-residency">Green Card program</a>. Model your returns without leverage as the base case, and treat any financing only as a cashflow management tool, not a return amplifier.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process including cost breakdown</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Net yield analysis for investment properties</li>
<li><a href="/blog/cape-verde-property-tax-reform-2026">2026 Property Tax Reform</a> — Transaction and annual tax costs under the new system</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Lending conditions and tax rules change. Always consult qualified professionals before making financing decisions.</em></p>
`,
  },
  {
    slug: "boa-vista-property-guide",
    title: "Boa Vista Property Guide: What Buyers Need to Know in 2026",
    description: "Boa Vista is Cape Verde's second major tourism island and its second most active property market. It's often positioned as the growth alternative to Sal — lower entry prices...",
    date: "2026-04-07",
    readTime: "9 min read",
    tags: ["Boa Vista", "Islands", "Guide"],
    content: `<p><em>Last updated: April 2026</em></p>
<p>Boa Vista is Cape Verde's second major tourism island and its second most active property market. It's often positioned as the growth alternative to Sal — lower entry prices, developing infrastructure, and the suggestion that it is today where Sal was a decade ago. That framing is partially accurate and partially marketing. This guide separates the two.</p>
<hr>
<h2>Island Overview</h2>
<p>Boa Vista is the third largest island in Cape Verde by area and has its own international airport — Aristides Pereira International Airport, located near Rabil — with direct flights from several European countries, primarily the UK, Germany, Portugal, and the Netherlands. It covers roughly 620 square kilometers and has a population of around 15,000, heavily concentrated in the main town of Sal Rei.</p>
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
<p>Boa Vista properties are generally 15–30% cheaper than comparable properties on Sal, though this gap narrows for premium beachfront or ocean-view units in high-quality developments. Indicative ranges:</p>
<table>
<thead>
<tr>
<th>Property Type</th>
<th>Typical Price Range</th>
</tr>
</thead>
<tbody>
<tr>
<td>Studio / 1-bed apartment (resort complex)</td>
<td>€70,000–€110,000</td>
</tr>
<tr>
<td>2-bed apartment (resort complex)</td>
<td>€110,000–€170,000</td>
</tr>
<tr>
<td>Villa / standalone house</td>
<td>€180,000–€400,000+</td>
</tr>
<tr>
<td>Townhouse (Sal Rei)</td>
<td>€60,000–€150,000</td>
</tr>
</tbody>
</table>
<p>These are indicative figures from current listings. Individual properties vary based on location, condition, view, and the quality of the development's management and rental scheme. <a href="/listings/boa-vista">Browse current Boa Vista listings</a> for actual market data.</p>
<h3>Market activity</h3>
<p>The Boa Vista market is active but smaller than Sal's. There is a resale market, but it is thinner — fewer comparable sales, longer time-on-market for some properties, and fewer agents with strong international marketing reach than on Sal. Liquidity is a real consideration if your investment horizon is short or uncertain.</p>
<p>New development activity has continued in recent years, adding supply in the northern resort zone. This expansion is a double-edged signal: it reflects developer confidence in the market, but it also adds competitive supply for both rental and resale.</p>
<hr>
<h2>Rental Market</h2>
<p>Boa Vista's rental market is growing but demonstrably less mature than Sal's. The key variables:</p>
<p><strong>Flight access:</strong> The number of direct European routes to Boa Vista is growing but remains smaller than Sal's. More routes mean more potential guests; fewer routes mean more dependence on the routes that exist. Any significant reduction in a major airline's Boa Vista operations would meaningfully affect occupancy rates.</p>
<p><strong>Seasonality:</strong> European winter sun demand runs October to April, which is strong. Summer occupancy (June–September) is lower than on Sal, as Boa Vista has less established tourism infrastructure to attract non-package visitors. The seasonal gap is more pronounced than on Sal.</p>
<p><strong>Management quality variance:</strong> Because the market is smaller and newer, the range in management company quality is wide. A well-run resort with active European tour operator relationships can achieve solid occupancy; a poorly managed one in the same development cluster will significantly underperform.</p>
<p>Gross yields quoted by developers and agents on Boa Vista follow a similar pattern to Sal: headline figures of 5–8% gross, with realistic net yields after management fees, service charges, maintenance, and taxes in the 3–5% range for well-managed properties. The <a href="/blog/cape-verde-rental-yields-realistic">rental yield guide</a> covers the full cost model.</p>
<hr>
<h2>Infrastructure Reality Check</h2>
<p>The infrastructure gap between Boa Vista and Sal is relevant to both lifestyle buyers and investors:</p>
<p><strong>Restaurants and services:</strong> Sal Rei has a reasonable range of restaurants and daily services. Outside the town and established resort zones, options are limited. Buyers who expect the variety and density of Santa Maria (Sal) will be disappointed with what's currently available on Boa Vista.</p>
<p><strong>Healthcare:</strong> Basic medical facilities exist, but for anything beyond routine care, the nearest comprehensive hospital is on Santiago. This is a practical reality for buyers considering the island for extended stays.</p>
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
<p><a href="/listings/boa-vista">Browse current Boa Vista properties for sale</a> in KazaVerde's index. All listings are source-linked with normalized euro pricing.</p>
<hr>
<h2>Related Guides</h2>
<ul>
<li><a href="/blog/which-cape-verde-island-property">Which Cape Verde Island Should You Buy On?</a> — Full six-island comparison including Boa Vista</li>
<li><a href="/blog/sal-vs-santiago-property">Sal vs Santiago</a> — The two alternative major markets compared</li>
<li><a href="/blog/cape-verde-rental-yields-realistic">Rental Yields: What to Realistically Expect</a> — Net yield model for resort investments</li>
<li><a href="/blog/buying-property-cape-verde-guide">How to Buy Property in Cape Verde</a> — Full buying process for foreign buyers</li>
</ul>
<hr>
<p><em>This article is for informational purposes only and does not constitute financial or legal advice. Market conditions change. Always conduct your own research and consult qualified local professionals before investing.</em></p>
`,
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
