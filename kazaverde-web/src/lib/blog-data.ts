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
    slug: "buying-property-cape-verde-guide",
    title: "How to Buy Property in Cape Verde: A Step-by-Step Guide for Foreign Buyers",
    description: "Cape Verde allows foreign nationals to purchase property with full freehold ownership and no restrictions on nationality. The legal framework is rooted in Portuguese law, which ...",
    date: "2026-02-27",
    readTime: "9 min read",
    tags: ["Buying","Legal","Guide"],
    content: `<p><em>Last updated: February 2026</em></p>
<p>Cape Verde allows foreign nationals to purchase property with full freehold ownership and no restrictions on nationality. The legal framework is rooted in Portuguese law, which means a structured, notary-based process that offers strong buyer protections — provided you do the paperwork right.</p>
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
<li><strong>Island and location:</strong> Sal (especially Santa Maria) has the strongest rental demand due to its international airport, tourism infrastructure, and name recognition. Boa Vista is growing. Other islands have thinner rental markets.</li>
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
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
