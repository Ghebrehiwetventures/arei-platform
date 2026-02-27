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
    title: "Buying Property in Cape Verde: A Complete Guide for Foreign Investors",
    description: "Everything you need to know about purchasing real estate in Cape Verde as a foreign investor. Legal requirements, process, costs, and practical tips.",
    date: "2026-02-15",
    readTime: "8 min read",
    tags: ["Buying", "Legal", "Investors"],
    content: `
<p>Cape Verde has become an attractive destination for foreign property investors, offering year-round sunshine, a stable political environment, and relatively affordable real estate compared to many European markets. This guide covers the essentials for buying property in Cape Verde as a non-resident.</p>

<h2>Can Foreigners Buy Property in Cape Verde?</h2>
<p>Yes. Foreign nationals can purchase property in Cape Verde. The process is straightforward, and there are no restrictions on foreign ownership for most property types. However, certain coastal and maritime zones may have specific regulations — your lawyer will advise on this.</p>

<h2>Legal Requirements</h2>
<p>You will need a fiscal number (NIF) from the Cape Verde tax authority. This is typically arranged through a local lawyer or agent. A power of attorney is often used if you cannot be present for all steps. All property transactions must be registered at the Conservatória do Registo Predial (Land Registry).</p>

<h2>Typical Costs</h2>
<p>Beyond the purchase price, budget for: notary fees (around 1–2%), stamp duty, registration fees, and legal fees. Legal representation is strongly recommended and usually costs 1–2% of the property value.</p>

<h2>Key Takeaways</h2>
<ul>
  <li>Foreign ownership is permitted for most property types</li>
  <li>Obtain a NIF and use a local lawyer</li>
  <li>Register the transaction at the Land Registry</li>
  <li>Factor in 3–5% for fees and taxes</li>
</ul>
`,
  },
  {
    slug: "nine-islands-cape-verde-which-one",
    title: "The 9 Islands of Cape Verde: Which One Is Right for You?",
    description: "A guide to Cape Verde's islands — from Sal and Boa Vista's beaches to Santiago's culture and Santo Antão's mountains. Find your ideal property location.",
    date: "2026-02-10",
    readTime: "6 min read",
    tags: ["Islands", "Location", "Overview"],
    content: `
<p>Cape Verde consists of 10 islands (9 inhabited), each with a distinct character. Choosing the right island depends on your priorities: beaches, culture, investment potential, or tranquillity.</p>

<h2>Sal & Boa Vista — Beach & Tourism</h2>
<p>Sal and Boa Vista are the most developed for tourism, with white-sand beaches, resorts, and international flights. Property prices are higher here, but rental demand is strong. Ideal for investors seeking yield or buyers wanting a beach lifestyle.</p>

<h2>Santiago — Capital & Culture</h2>
<p>Santiago is home to the capital, Praia. It offers a mix of urban and rural, with more affordable prices and a vibrant local culture. Good for those seeking a more authentic Cape Verdean experience.</p>

<h2>São Vicente & Santo Antão</h2>
<p>São Vicente (Mindelo) is known for its music and harbour. Santo Antão offers dramatic mountain landscapes and hiking. Both appeal to buyers looking for character and lower prices.</p>

<h2>Other Islands</h2>
<p>Fogo (volcanic), Maio (quiet beaches), and the smaller islands offer niche opportunities for those seeking solitude or unique landscapes.</p>
`,
  },
  {
    slug: "cape-verde-property-prices-2026",
    title: "Cape Verde Property Prices 2026: Market Overview by Island",
    description: "Current median prices, trends, and market dynamics across Cape Verde's islands. Data-driven insights for buyers and investors.",
    date: "2026-02-05",
    readTime: "5 min read",
    tags: ["Market", "Prices", "Data"],
    content: `
<p>Understanding Cape Verde's property market by island helps you set realistic budgets and identify value. This overview is based on aggregated listing data from the KazaVerde index.</p>

<h2>Price Ranges by Island</h2>
<p>Sal and Boa Vista typically command the highest prices, with median asking prices for apartments and villas well above the national average. Santiago and São Vicente offer more affordable options, especially outside the main cities.</p>

<h2>What Drives Prices</h2>
<p>Proximity to the beach, tourism infrastructure, and international accessibility (flights) are key factors. New developments and resort areas tend to be priced at a premium.</p>

<h2>Using the Data</h2>
<p>KazaVerde aggregates listings from multiple sources to give you a clearer picture of the market. Median prices exclude outliers and reflect asking prices, not transaction prices.</p>
`,
  },
  {
    slug: "rental-yields-cape-verde-investors",
    title: "Rental Yields in Cape Verde: What Investors Need to Know",
    description: "Potential rental returns, short-term vs long-term lets, and practical considerations for property investors in Cape Verde.",
    date: "2026-01-28",
    readTime: "6 min read",
    tags: ["Investment", "Rental", "Yields"],
    content: `
<p>Tourism-driven islands like Sal and Boa Vista can offer attractive rental yields for investors willing to manage short-term lets. Here's what to consider.</p>

<h2>Short-Term vs Long-Term</h2>
<p>Short-term holiday lets typically generate higher gross income but require more management and may have seasonal variation. Long-term lets to locals or expats offer steadier, lower yields.</p>

<h2>Typical Yields</h2>
<p>Gross yields of 5–8% are often cited for well-located properties in tourist areas, though actual returns depend on occupancy, management costs, and maintenance. Always do your own due diligence.</p>

<h2>Management</h2>
<p>Many investors use local property management companies or resort operators. Factor management fees (often 15–25% of rental income) into your projections.</p>
`,
  },
  {
    slug: "legal-requirements-foreign-buyers-cape-verde",
    title: "Legal Requirements for Buying Property in Cape Verde as a Foreigner",
    description: "NIF, power of attorney, land registry, and other legal steps for foreign property buyers in Cape Verde.",
    date: "2026-01-20",
    readTime: "5 min read",
    tags: ["Legal", "Process", "Foreigners"],
    content: `
<p>Buying property in Cape Verde as a foreigner involves a few key legal steps. Working with a qualified local lawyer is essential.</p>

<h2>NIF (Fiscal Number)</h2>
<p>You need a Cape Verde tax identification number. Your lawyer can arrange this. It is required for the purchase and for any future tax obligations.</p>

<h2>Power of Attorney</h2>
<p>If you cannot be present, a power of attorney allows your lawyer or agent to sign on your behalf. Ensure it is properly notarised and translated if necessary.</p>

<h2>Land Registry</h2>
<p>All transfers must be registered at the Conservatória do Registo Predial. Your lawyer will handle this. Clear title and no encumbrances are verified during the process.</p>

<h2>Due Diligence</h2>
<p>Your lawyer will check ownership, liens, and planning permissions. Never skip this step.</p>
`,
  },
  {
    slug: "sal-vs-boa-vista-property-comparison",
    title: "Sal vs Boa Vista: Comparing Cape Verde's Most Popular Islands for Property",
    description: "Which island offers better value, rental potential, or lifestyle? A side-by-side comparison for property buyers.",
    date: "2026-01-15",
    readTime: "5 min read",
    tags: ["Sal", "Boa Vista", "Comparison"],
    content: `
<p>Sal and Boa Vista are Cape Verde's two main tourist islands. Both offer beaches, resorts, and property investment opportunities. Here's how they compare.</p>

<h2>Sal</h2>
<p>More developed, with Santa Maria and Espargos as main hubs. More flights, more amenities, and generally higher prices. Strong short-term rental market.</p>

<h2>Boa Vista</h2>
<p>More spread out, with Sal Rei as the main town. Slightly quieter, with expansive beaches. Growing tourism and development. Often slightly lower prices than Sal for comparable properties.</p>

<h2>Choosing</h2>
<p>Sal suits those who want more infrastructure and nightlife. Boa Vista suits those seeking more space and a calmer vibe. Both have solid rental demand.</p>
`,
  },
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return BLOG_ARTICLES.find((a) => a.slug === slug);
}
