import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const baseHtmlPath = path.join(distDir, "index.html");
const siteUrl = "https://www.kazaverde.com";
const ogImage = `${siteUrl}/favicon.svg`;

const BLOG_ARTICLES = [
  {
    href: "/blog/buying-property-cape-verde-guide",
    title: "How to Buy Property in Cape Verde: A Step-by-Step Guide for Foreign Buyers",
    description:
      "Foreign nationals can buy freehold property in Cape Verde. This guide covers the buying process, legal checks, taxes, fees, and common mistakes.",
  },
  {
    href: "/blog/which-cape-verde-island-property",
    title: "Which Cape Verde Island Should You Buy Property On? A Data-Driven Comparison",
    description:
      "A practical comparison of Sal, Boa Vista, Santiago, Sao Vicente, Fogo, and Maio for price level, rental demand, and buyer fit.",
  },
  {
    href: "/blog/cape-verde-property-tax-reform-2026",
    title: "Cape Verde Property Tax Reform 2026: What Buyers Need to Know",
    description:
      "A plain-English breakdown of the 2026 property tax changes, including transfer tax, annual property tax, and implications for buyers.",
  },
  {
    href: "/blog/cape-verde-rental-yields-realistic",
    title: "Cape Verde Rental Yields: What to Realistically Expect",
    description:
      "An evidence-led look at short-term rental income, costs, and what realistic net yields look like across Cape Verde property markets.",
  },
  {
    href: "/blog/cape-verde-green-card-residency",
    title: "Cape Verde Green Card Residency Through Property Investment",
    description:
      "How the Green Card program works, who qualifies, and what property investors should understand before relying on residency benefits.",
  },
  {
    href: "/blog/mistakes-buying-property-cape-verde",
    title: "Mistakes to Avoid When Buying Property in Cape Verde",
    description:
      "A practical checklist of the legal, operational, and due-diligence mistakes that can make a Cape Verde property purchase go wrong.",
  },
];

function page(title, description, body) {
  return { title, description, body };
}

const routes = [
  {
    route: "/",
    ...page(
      "KazaVerde — Cape Verde Real Estate",
      "A read-only index of Cape Verde property listings with source-linked market coverage.",
      `
        <main>
          <section>
            <p>KazaVerde</p>
            <h1>Discover Island Living</h1>
            <p>
              A read-only Cape Verde property index with source-linked listings, island-level market context,
              and practical guides for buyers and investors.
            </p>
            <p>
              <a href="/listings">Browse Properties</a>
              <a href="/market">Market Data</a>
            </p>
          </section>

          <section>
            <h2>What you can explore</h2>
            <ul>
              <li>Source-linked property listings across multiple Cape Verde islands</li>
              <li>Market-level context including median price and inventory coverage</li>
              <li>Editorial guides on buying, tax changes, residency, and island selection</li>
            </ul>
          </section>

          <section>
            <h2>Built for discovery, not transactions</h2>
            <p>
              KazaVerde is not a broker or marketplace. Each property links back to its original source page,
              so buyers can compare public inventory before speaking to an agent or lawyer.
            </p>
          </section>
        </main>
      `,
    ),
  },
  {
    route: "/market",
    ...page(
      "Market Data — KazaVerde",
      "Median prices by island, inventory trends, and Cape Verde property market insights.",
      `
        <main>
          <section>
            <p>Market Intelligence</p>
            <h1>Cape Verde Property Market</h1>
            <p>
              Index-level market data derived from tracked public listings across multiple sources,
              designed to help buyers compare islands before committing capital.
            </p>
          </section>

          <section>
            <h2>What this page covers</h2>
            <ul>
              <li>Median asking prices by island where enough price data is available</li>
              <li>Total tracked inventory across the current public index</li>
              <li>Listing distribution by island and methodology notes for interpretation</li>
            </ul>
          </section>

          <section>
            <h2>Methodology highlights</h2>
            <ul>
              <li>Median asking price is based on publicly visible, extractable listing prices.</li>
              <li>Listings marked price on request remain in inventory counts but not price calculations.</li>
              <li>Tracked sources are rechecked regularly and removed listings are flagged after repeated absence.</li>
            </ul>
          </section>
        </main>
      `,
    ),
  },
  {
    route: "/blog",
    ...page(
      "Blog — KazaVerde",
      "Cape Verde real estate insights, guides, and market analysis. Property buying, islands, legal requirements, and investment tips.",
      `
        <main>
          <section>
            <p>Blog</p>
            <h1>Cape Verde Real Estate Insights</h1>
            <p>Guides, market analysis, and practical advice for property buyers and investors.</p>
          </section>

          <section>
            <h2>Featured guides</h2>
            <ul>
              ${BLOG_ARTICLES.map(
                (article) => `
                  <li>
                    <a href="${article.href}">${escapeHtml(article.title)}</a>
                    <p>${escapeHtml(article.description)}</p>
                  </li>
                `,
              ).join("")}
            </ul>
          </section>
        </main>
      `,
    ),
  },
  {
    route: "/about",
    ...page(
      "About — KazaVerde",
      "How KazaVerde works. Data sources, update cadence, deduplication, and transparency.",
      `
        <main>
          <section>
            <p>About KazaVerde</p>
            <h1>How the index works</h1>
            <p>
              KazaVerde is a read-only property index for Cape Verde. We collect publicly accessible listing
              data from tracked source pages, normalize it into a consistent format, and link every listing
              back to its original source.
            </p>
          </section>

          <section>
            <h2>What matters most</h2>
            <ul>
              <li>Source-first links back to the original listing page</li>
              <li>Deduplication and normalization instead of duplicated portal noise</li>
              <li>Neutral handling of incomplete data instead of guesswork</li>
              <li>Transparent coverage limits rather than claims of full market coverage</li>
            </ul>
          </section>
        </main>
      `,
    ),
  },
  {
    route: "/privacy",
    ...page(
      "Privacy Policy — KazaVerde",
      "How KazaVerde handles your data, what we collect, and your rights.",
      `
        <main>
          <section>
            <p>Privacy Policy</p>
            <h1>How we handle your data</h1>
            <p>Last updated: 27 March 2026</p>
          </section>

          <section>
            <h2>What we collect</h2>
            <ul>
              <li>Anonymous analytics data through Vercel Web Analytics</li>
              <li>Newsletter email addresses for users who subscribe</li>
              <li>Saved property preferences stored locally in the browser</li>
            </ul>
          </section>

          <section>
            <h2>What we do not collect</h2>
            <p>
              We do not collect payment information, advertising tracker data, or unnecessary personal data.
              Saved properties stay in local browser storage and are not transmitted to KazaVerde servers.
            </p>
          </section>
        </main>
      `,
    ),
  },
  {
    route: "/cookie-policy",
    ...page(
      "Cookie Policy — KazaVerde",
      "What cookies and local storage KazaVerde uses and why.",
      `
        <main>
          <section>
            <p>Cookie Policy</p>
            <h1>Cookies and local storage</h1>
            <p>Last updated: 27 March 2026</p>
          </section>

          <section>
            <h2>What KazaVerde uses</h2>
            <ul>
              <li>Cookieless Vercel Web Analytics for anonymous traffic measurement</li>
              <li>Local browser storage for saved properties</li>
              <li>Local browser storage for cookie-banner acknowledgement</li>
            </ul>
          </section>

          <section>
            <h2>What KazaVerde does not use</h2>
            <p>
              No advertising cookies, third-party tracking pixels, social media tracking cookies,
              or cross-site behavioral tracking are used on the public site.
            </p>
          </section>
        </main>
      `,
    ),
  },
];

async function main() {
  const baseHtml = await readFile(baseHtmlPath, "utf8");

  for (const route of routes) {
    const routeHtml = renderRouteHtml(baseHtml, route);
    const outputPath =
      route.route === "/"
        ? baseHtmlPath
        : path.join(distDir, route.route.replace(/^\//, ""), "index.html");

    if (route.route !== "/") {
      await mkdir(path.dirname(outputPath), { recursive: true });
    }

    await writeFile(outputPath, routeHtml, "utf8");
  }
}

function renderRouteHtml(baseHtml, route) {
  const canonicalUrl = new URL(route.route, `${siteUrl}/`).toString();
  const headExtras = [
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="KazaVerde" />`,
    `<meta property="og:image" content="${ogImage}" />`,
  ].join("\n    ");

  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(
      /<meta name="description" content="[\s\S]*?" \/>/,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
    )
    .replace("</head>", `    ${headExtras}\n  </head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="phase1">\n${wrapPrerenderMarkup(route.body, route.description)}\n    </div>`,
    );
}

function wrapPrerenderMarkup(body, description) {
  return `      <div class="prerender-shell" aria-label="Prerendered page snapshot">
        <header>
          <a href="/">KazaVerde</a>
          <p>${escapeHtml(description)}</p>
        </header>
${indent(body.trim(), 4)}
        <footer>
          <p><a href="/listings">Listings</a> · <a href="/market">Market</a> · <a href="/blog">Blog</a> · <a href="/about">About</a></p>
          <p><a href="/privacy">Privacy</a> · <a href="/cookie-policy">Cookie Policy</a></p>
        </footer>
      </div>`;
}

function indent(text, depth) {
  const pad = " ".repeat(depth * 2);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((error) => {
  console.error("[prerender-phase1] Failed:", error);
  process.exitCode = 1;
});
