import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AREIClient } from "../../packages/arei-sdk/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const baseHtmlPath = path.join(distDir, "index.html");
const spaFallbackPath = path.join(distDir, "spa-fallback", "index.html");
const blogDataPath = path.resolve(__dirname, "../src/lib/blog-data.ts");
const prerenderListingsPath = path.resolve(__dirname, "../src/lib/prerender-listings.ts");
const siteUrl = "https://www.kazaverde.com";
const ogImage = `${siteUrl}/favicon.svg`;
const publicSupabaseUrl = "https://bhqjdzjtiwckfuteycfl.supabase.co";
const publicSupabaseAnonKey = "sb_publishable_fFm5NsC3cWLYr_Wnx9OLWQ_Ytmnn-Wd";

function page(title, description, body, options = {}) {
  return { title, description, body, ...options };
}

function getStaticRoutes(blogArticles, listingRoutes = []) {
  return [
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
              ${blogArticles.map(
                (article) => `
                  <li>
                    <a href="/blog/${article.slug}">${escapeHtml(article.title)}</a>
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
      route: "/listings",
      ...page(
      "Cape Verde Properties for Sale — KazaVerde",
      "Browse tracked property listings across Cape Verde. Source-linked homes, apartments, villas, and land for sale on Sal, Boa Vista, Santiago, and more.",
      `
        <main>
          <section>
            <p>Property Listings</p>
            <h1>Cape Verde Properties for Sale</h1>
            <p>
              A read-only index of tracked property listings across Cape Verde. Every listing links back
              to its original source page so buyers can verify details directly before contacting an agent.
            </p>
            <p>
              <a href="/listings/sal">Properties in Sal</a> ·
              <a href="/listings?island=Boa%20Vista">Properties in Boa Vista</a> ·
              <a href="/listings?island=Santiago">Properties in Santiago</a> ·
              <a href="/listings?island=S%C3%A3o%20Vicente">Properties in São Vicente</a>
            </p>
          </section>

          ${listingRoutes.length > 0 ? `
          <section>
            <h2>Recently tracked properties</h2>
            <ul>
              ${listingRoutes.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}
        </main>
      `,
    ),
    },
    {
      route: "/listings/sal",
      ...page(
      "Property for Sale in Sal, Cape Verde | KazaVerde",
      "Browse property listings for sale in Sal, Cape Verde. Apartments, villas, and resort properties in Santa Maria and across the island.",
      (() => {
        const salListings = listingRoutes.filter(
          (lr) => lr.description.includes(", Sal,") || lr.description.includes("in Sal,")
        );
        return `
        <main>
          <section>
            <p>Sal · Cape Verde</p>
            <h1>Property for Sale in Sal, Cape Verde</h1>
            <p>
              Sal is Cape Verde&#39;s most liquid property market, with international flights direct from London,
              Lisbon, Amsterdam, and Paris. Santa Maria concentrates the strongest rental demand and the widest
              range of apartments, villas, and resort properties for sale. Browse source-linked listings below.
            </p>
            <p><a href="/listings">View all Cape Verde properties</a></p>
          </section>

          ${salListings.length > 0 ? `
          <section>
            <h2>Sal listings in the index</h2>
            <ul>
              ${salListings.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}

          <section>
            <h2>Buying property in Sal</h2>
            <p>
              Sal offers the strongest short-term rental market in Cape Verde, with gross yields of 5–8% reported
              in well-managed resort complexes. It is the most mature and most expensive island to buy on.
              One-bedroom apartments in Santa Maria typically start around €95,000; two-bedroom units in resort
              complexes range from €120,000 to €200,000.
            </p>
            <p>
              <a href="/blog/which-cape-verde-island-property">Compare Sal with other Cape Verde islands</a> ·
              <a href="/blog/cape-verde-rental-yields-realistic">Rental yield analysis</a>
            </p>
          </section>
        </main>
      `})(),
    ),
    },
    {
      route: "/listings/boa-vista",
      ...page(
      "Property for Sale in Boa Vista, Cape Verde | KazaVerde",
      "Browse property listings for sale in Boa Vista, Cape Verde. Beach villas, resort apartments, and coastal properties in Sal Rei and across the island.",
      (() => {
        const boaVistaListings = listingRoutes.filter(
          (lr) => lr.description.includes(", Boa Vista,") || lr.description.includes("in Boa Vista,")
        );
        return `
        <main>
          <section>
            <p>Boa Vista · Cape Verde</p>
            <h1>Property for Sale in Boa Vista, Cape Verde</h1>
            <p>
              Boa Vista is Cape Verde&#39;s main growth market — property prices run 15–25% below equivalent
              properties on Sal, with its own international airport and expanding tourism infrastructure.
              Sal Rei is the commercial center; most development clusters along the coast. Browse
              source-linked listings below.
            </p>
            <p><a href="/listings">View all Cape Verde properties</a></p>
          </section>

          ${boaVistaListings.length > 0 ? `
          <section>
            <h2>Boa Vista listings in the index</h2>
            <ul>
              ${boaVistaListings.map((lr) => `<li><a href="${escapeHtml(lr.route)}">${escapeHtml(lr.title)}</a></li>`).join("\n              ")}
            </ul>
          </section>` : ""}

          <section>
            <h2>Buying property in Boa Vista</h2>
            <p>
              Boa Vista is often described as where Sal was 5–10 years ago: a growing short-term rental
              market, lower entry prices, and an active development pipeline. For buyers who want beach-island
              investment at a more accessible price point, Boa Vista is the primary alternative to Sal.
            </p>
            <p>
              <a href="/blog/which-cape-verde-island-property">Compare Boa Vista with other Cape Verde islands</a> ·
              <a href="/blog/cape-verde-rental-yields-realistic">Rental yield analysis</a>
            </p>
          </section>
        </main>
      `})(),
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
}

async function main() {
  const blogArticles = await loadBlogArticles();
  const listingRoutes = await getListingDetailRoutes();
  const routes = [...getStaticRoutes(blogArticles, listingRoutes), ...getBlogArticleRoutes(blogArticles), ...listingRoutes];
  const baseHtml = await readFile(baseHtmlPath, "utf8");

  await mkdir(path.dirname(spaFallbackPath), { recursive: true });
  await writeFile(spaFallbackPath, baseHtml, "utf8");

  for (const route of routes) {
    const routeHtml = renderRouteHtml(baseHtml, route);
    const outputPath =
      route.route === "/"
        ? baseHtmlPath
        : path.join(distDir, route.route.replace(/^\//, ""), "index.html");

    await mkdir(path.dirname(outputPath), { recursive: true });

    await writeFile(outputPath, routeHtml, "utf8");
  }
}

function renderRouteHtml(baseHtml, route) {
  const canonicalUrl = new URL(route.route, `${siteUrl}/`).toString();
  const ogType = route.ogType ?? "website";
  const documentTitle = route.title.includes("KazaVerde") ? route.title : `${route.title} — KazaVerde`;
  const headExtras = [
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(documentTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:site_name" content="KazaVerde" />`,
    `<meta property="og:image" content="${escapeHtml(route.image ?? ogImage)}" />`,
  ].join("\n    ");

  return baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(documentTitle)}</title>`)
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

async function loadBlogArticles() {
  const source = await readFile(blogDataPath, "utf8");
  const sanitizedSource = source
    .replace(/export interface BlogArticle[\s\S]*?\n}\n\n/, "")
    .replace(/export const BLOG_ARTICLES: BlogArticle\[] =/, "const BLOG_ARTICLES =")
    .replace(/\nexport function getArticleBySlug[\s\S]*$/, "\n");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(`${sanitizedSource}\nexport { BLOG_ARTICLES };`)}`;
  const module = await import(moduleUrl);
  return module.BLOG_ARTICLES;
}

async function loadListingPrerenderIds() {
  const source = await readFile(prerenderListingsPath, "utf8");
  const sanitizedSource = source.replace(/ as const;/g, ";");
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(sanitizedSource)}`;
  const module = await import(moduleUrl);
  return module.PRERENDER_LISTING_IDS;
}

function getBlogArticleRoutes(blogArticles) {
  return blogArticles.map((article) => ({
    route: `/blog/${article.slug}`,
    ...page(
      article.title,
      article.description,
      renderBlogArticleBody(article),
      { ogType: "article", image: article.heroImage || ogImage },
    ),
  }));
}

function renderBlogArticleBody(article) {
  const formattedDate = new Date(`${article.date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return `
    <main>
      <a href="/blog">Back to blog</a>

      <article>
        <p>${escapeHtml(formattedDate)} · ${escapeHtml(article.readTime)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p>${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join(" ")}</p>
        <div>
${indent(article.content.trim(), 5)}
        </div>
      </article>
    </main>
  `;
}

async function getListingDetailRoutes() {
  try {
    const client = new AREIClient({
      supabaseUrl: process.env.VITE_SUPABASE_URL || publicSupabaseUrl,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || publicSupabaseAnonKey,
    });
    const listingIds = await loadListingPrerenderIds();
    const details = await Promise.all(
      listingIds.map(async (id) => {
        try {
          return await client.getListing(id);
        } catch (error) {
          console.warn(`[prerender-phase1] Skipping listing ${id}:`, error instanceof Error ? error.message : error);
          return null;
        }
      }),
    );

    return details
      .filter((detail) => detail !== null)
      .map((detail) => ({
        route: `/listing/${detail.id}`,
        ...page(
          buildListingSeoTitle(detail),
          buildListingSeoDescription(detail),
          renderListingDetailBody(detail),
          {
            ogType: "website",
            image: detail.image_urls[0] || ogImage,
          },
        ),
      }));
  } catch (error) {
    console.warn("[prerender-phase1] Listing prerender skipped:", error instanceof Error ? error.message : error);
    return [];
  }
}

function buildListingSeoTitle(detail) {
  return toTitleCase(detail.title || "Property");
}

function buildListingSeoDescription(detail) {
  const parts = [
    buildListingSeoTitle(detail),
    `in ${detail.city ? `${detail.city}, ` : ""}${detail.island}, Cape Verde`,
  ];

  if (detail.price) {
    parts.push(formatPrice(detail.price, detail.currency));
  }

  if (detail.property_type) {
    parts.push(isLandListing(detail) ? `${detail.property_type} listing` : detail.property_type);
  }

  if (!isLandListing(detail) && detail.bedrooms != null) {
    parts.push(detail.bedrooms === 0 ? "studio" : `${detail.bedrooms}-bedroom`);
  }

  return parts.join(" · ");
}

function renderListingDetailBody(detail) {
  const specs = [];

  if (detail.property_type) {
    specs.push({ label: "Type", value: detail.property_type });
  }

  if (!isLandListing(detail) && detail.bedrooms != null) {
    specs.push({ label: detail.bedrooms === 0 ? "Layout" : "Bedrooms", value: detail.bedrooms === 0 ? "Studio" : String(detail.bedrooms) });
  }

  if (!isLandListing(detail) && detail.bathrooms != null && detail.bathrooms > 0) {
    specs.push({ label: "Bathrooms", value: String(detail.bathrooms) });
  }

  if (detail.property_size_sqm != null) {
    specs.push({ label: "Interior", value: `${detail.property_size_sqm.toLocaleString("en-US")} m²` });
  }

  if (detail.land_area_sqm != null) {
    specs.push({ label: "Land", value: `${detail.land_area_sqm.toLocaleString("en-US")} m²` });
  }

  const descriptionHtml = detail.description_html || (detail.description ? `<p>${escapeHtml(detail.description)}</p>` : "");
  const lastChecked = detail.last_seen_at
    ? new Date(detail.last_seen_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  const firstImage = detail.image_urls[0];

  return `
    <main>
      <a href="/listings">Back to listings</a>

      <article>
        <p>${escapeHtml(formatLocation(detail.city, detail.island))}, Cape Verde</p>
        <h1>${escapeHtml(buildListingSeoTitle(detail))}</h1>
        <p>${escapeHtml(formatPrice(detail.price, detail.currency))}</p>
        ${firstImage ? `<p><img src="${escapeHtml(firstImage)}" alt="${escapeHtml(buildListingSeoTitle(detail))}" loading="eager" /></p>` : ""}
        ${specs.length > 0 ? `<ul>\n${specs.map((spec) => `          <li><strong>${escapeHtml(spec.label)}:</strong> ${escapeHtml(spec.value)}</li>`).join("\n")}\n        </ul>` : ""}
        <div>
${indent(descriptionHtml.trim() || "<p>Property details available on the source listing page.</p>", 5)}
        </div>
        <p>Source: <a href="${escapeHtml(detail.source_url)}">${escapeHtml(formatSourceLabel(detail.source_id))}</a></p>
        ${lastChecked ? `<p>Last checked: ${escapeHtml(lastChecked)}</p>` : ""}
      </article>
    </main>
  `;
}

function formatPrice(price, currency = "EUR") {
  if (!price || price <= 0) return "Price on request";
  const symbol = currency === "CVE" ? "CVE " : "€";
  return `${symbol}${price.toLocaleString("en-US")}`;
}

function formatLocation(city, island) {
  return city ? `${city}, ${island}` : island;
}

function formatSourceLabel(sourceId) {
  const knownLabels = {
    cv_gabetticasecapoverde: "Gabetti Case Cape Verde",
    cv_terracaboverde: "Terra Cabo Verde",
    tcv: "Terra Cabo Verde",
    ecv: "EstateCV",
  };
  const prefix = String(sourceId || "").split(/[:_]/)[0];
  return knownLabels[sourceId] || knownLabels[prefix] || String(sourceId || "Partner listing");
}

function isLandListing(detail) {
  const landTypes = /^(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)$/i;
  const landTitle = /\b(land|plot|lot|lote|terreno|terrenos|parcela|parcel|terrain)\b/i;
  return landTypes.test(detail.property_type ?? "") || landTitle.test(detail.title ?? "");
}

function toTitleCase(value) {
  if (!value || value !== value.toUpperCase()) return value;
  return value
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\S/g, (char) => char.toUpperCase());
}

main().catch((error) => {
  console.error("[prerender-phase1] Failed:", error);
  process.exitCode = 1;
});
